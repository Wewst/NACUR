const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || "8783132263:AAE5-IFCh01RodVuyYUn8g2gaMJ_N_MkfnE";
const CHAT_ID = process.env.CHAT_ID || "-5293585696";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const DATA_FILE = path.join(__dirname, "data.json");
const SPAM_WINDOW_MS = Number(process.env.SPAM_WINDOW_MS || 60_000);
const SPAM_LIMIT = Number(process.env.SPAM_LIMIT || 10);

const memory = loadData();
scheduleAutoSyncFromTelegram();

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsed.pathname;

  try {
    if (pathname === "/health" && req.method === "GET") {
      return sendJson(res, 200, { ok: true, uptimeSec: Math.floor(process.uptime()) });
    }

    if (pathname === "/api/users" && req.method === "GET") {
      return sendJson(res, 200, { users: getSortedUsers() });
    }

    if (pathname === "/api/leaderboard" && req.method === "GET") {
      const users = getSortedUsers();
      return sendJson(res, 200, {
        top: users.slice(0, 3),
        bottom: [...users].reverse().slice(0, 3)
      });
    }

    if (pathname === "/api/config" && req.method === "GET") {
      return sendJson(res, 200, {
        spamLimit: SPAM_LIMIT,
        spamWindowMs: SPAM_WINDOW_MS,
        hasBot: Boolean(BOT_TOKEN && CHAT_ID)
      });
    }

    if (pathname === "/api/users/sync" && req.method === "POST") {
      const body = await readJsonBody(req);
      const count = syncUsersFromPayload(body);
      persistData();
      return sendJson(res, 200, { ok: true, upserted: count, users: getSortedUsers() });
    }

    if (pathname === "/api/telegram/sync" && req.method === "POST") {
      const result = await syncFromTelegramBotApi();
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/vote" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = await applyVote(body);
      return sendJson(res, 200, result);
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || "Request failed" });
  }
});

server.listen(PORT, () => {
  console.log(`NAKUR backend listening on port ${PORT}`);
});

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {
        usersByTelegramId: {},
        votesByPair: {},
        voterActivity: {}
      };
    }
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      usersByTelegramId: parsed.usersByTelegramId || {},
      votesByPair: parsed.votesByPair || {},
      voterActivity: parsed.voterActivity || {}
    };
  } catch (error) {
    console.error("Failed to read data file, starting with empty state", error);
    return { usersByTelegramId: {}, votesByPair: {}, voterActivity: {} };
  }
}

let writeTimer = null;
function persistData() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(memory, null, 2), "utf8", (error) => {
      if (error) console.error("Failed to persist data:", error);
    });
  }, 100);
}

function upsertUser(input) {
  const telegramId = String(input.telegram_id ?? input.telegramId ?? "").trim();
  if (!telegramId) return null;

  const current = memory.usersByTelegramId[telegramId] || {
    id: `usr_${telegramId}`,
    telegram_id: telegramId,
    username: `user_${telegramId}`,
    avatar: "",
    likes: 0,
    dislikes: 0,
    score: 0
  };

  const username = String(input.username || current.username || `user_${telegramId}`).replace(/^@/, "");
  const avatar = typeof input.avatar === "string" ? input.avatar : current.avatar;

  memory.usersByTelegramId[telegramId] = {
    ...current,
    username,
    avatar
  };
  return memory.usersByTelegramId[telegramId];
}

function syncUsersFromPayload(body) {
  const items = Array.isArray(body?.users) ? body.users : [];
  let upserted = 0;
  for (const item of items) {
    if (upsertUser(item)) upserted += 1;
  }
  return upserted;
}

function getSortedUsers() {
  const users = Object.values(memory.usersByTelegramId);
  return users.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.likes !== a.likes) return b.likes - a.likes;
    return a.dislikes - b.dislikes;
  });
}

function ensureVoterActivity(voterTelegramId) {
  if (!memory.voterActivity[voterTelegramId]) {
    memory.voterActivity[voterTelegramId] = { timestamps: [], warned: false, blocked: false };
  }
  return memory.voterActivity[voterTelegramId];
}

async function applyVote(body) {
  const voterTelegramId = String(body?.voterTelegramId || body?.voter_telegram_id || "").trim();
  const targetTelegramId = String(body?.targetTelegramId || body?.target_telegram_id || "").trim();
  const voteType = String(body?.type || "").trim();
  const voterUsername = String(body?.voterUsername || body?.voter_username || "").trim();
  const targetUsername = String(body?.targetUsername || body?.target_username || "").trim();
  const targetAvatar = String(body?.targetAvatar || body?.target_avatar || "").trim();

  if (!voterTelegramId || !targetTelegramId) throw new Error("voterTelegramId and targetTelegramId are required");
  if (!["like", "dislike"].includes(voteType)) throw new Error("type must be 'like' or 'dislike'");
  if (voterTelegramId === targetTelegramId) throw new Error("Self voting is not allowed");

  const voterUser = upsertUser({ telegram_id: voterTelegramId, username: voterUsername || `user_${voterTelegramId}` });
  const targetUser = upsertUser({
    telegram_id: targetTelegramId,
    username: targetUsername || `user_${targetTelegramId}`,
    avatar: targetAvatar
  });

  const antiSpam = await checkAndHandleSpam(voterUser);
  if (antiSpam.blocked) {
    persistData();
    return {
      ok: false,
      blocked: true,
      message: "Voting blocked due to suspicious mass activity."
    };
  }

  const key = `${voterTelegramId}:${targetTelegramId}`;
  const existing = memory.votesByPair[key];

  if (!existing) {
    memory.votesByPair[key] = {
      voterTelegramId,
      targetTelegramId,
      value: voteType,
      changedOnce: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    applyUserCounters(targetUser, voteType, +1);
    persistData();
    return { ok: true, changed: false, warning: antiSpam.warning, user: targetUser };
  }

  if (existing.value === voteType) {
    return { ok: false, unchanged: true, warning: antiSpam.warning, message: "Vote already set" };
  }

  if (existing.changedOnce) {
    return { ok: false, locked: true, warning: antiSpam.warning, message: "Vote already changed once" };
  }

  applyUserCounters(targetUser, existing.value, -1);
  applyUserCounters(targetUser, voteType, +1);
  existing.value = voteType;
  existing.changedOnce = true;
  existing.updatedAt = Date.now();
  persistData();
  return { ok: true, changed: true, warning: antiSpam.warning, user: targetUser };
}

function applyUserCounters(user, voteType, delta) {
  if (voteType === "like") user.likes = Math.max(0, Number(user.likes || 0) + delta);
  if (voteType === "dislike") user.dislikes = Math.max(0, Number(user.dislikes || 0) + delta);
  user.score = Number(user.likes || 0) - Number(user.dislikes || 0);
}

async function checkAndHandleSpam(voterUser) {
  const voterId = String(voterUser.telegram_id);
  const activity = ensureVoterActivity(voterId);
  const now = Date.now();
  activity.timestamps = activity.timestamps.filter((ts) => now - ts <= SPAM_WINDOW_MS);
  activity.timestamps.push(now);

  let warning = false;
  if (activity.timestamps.length > SPAM_LIMIT) {
    if (!activity.warned) {
      activity.warned = true;
      warning = true;
    } else {
      activity.blocked = true;
      await banUserFromGroup(voterId);
    }
  }
  return { warning, blocked: activity.blocked };
}

function toInitials(username) {
  const source = String(username || "U").replace("@", "").trim();
  if (!source) return "U";
  return source.slice(0, 2).toUpperCase();
}

async function syncFromTelegramBotApi() {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("Set BOT_TOKEN and CHAT_ID for Telegram sync");
  }

  const adminsData = await telegramApi("getChatAdministrators", { chat_id: CHAT_ID });
  const admins = Array.isArray(adminsData?.result) ? adminsData.result : [];
  let upserted = 0;

  for (const member of admins) {
    const user = member?.user;
    if (!user?.id) continue;
    if (
      upsertUser({
        telegram_id: String(user.id),
        username: user.username || `${user.first_name || "user"}_${user.id}`,
        avatar: ""
      })
    ) {
      upserted += 1;
    }
  }

  persistData();
  return {
    ok: true,
    upserted,
    note: "Telegram Bot API does not provide a full chat member list directly. Admin list synced; other users are added automatically on voting."
  };
}

function scheduleAutoSyncFromTelegram() {
  if (!BOT_TOKEN || !CHAT_ID) return;
  setTimeout(() => {
    syncFromTelegramBotApi().catch((error) => console.error("Initial Telegram sync failed:", error.message));
  }, 1200);

  setInterval(() => {
    syncFromTelegramBotApi().catch((error) => console.error("Periodic Telegram sync failed:", error.message));
  }, 5 * 60_000);
}

async function banUserFromGroup(userId) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    await telegramApi("banChatMember", { chat_id: CHAT_ID, user_id: Number(userId), revoke_messages: false });
  } catch (error) {
    console.error("Failed to ban user:", userId, error.message);
  }
}

function telegramApi(method, payload) {
  const body = JSON.stringify(payload);
  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: `/bot${BOT_TOKEN}/${method}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    }
  };

  return new Promise((resolve, reject) => {
    const request = require("https").request(options, (response) => {
      let raw = "";
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed.ok) {
            return reject(new Error(parsed.description || `Telegram API error: ${method}`));
          }
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Invalid Telegram API response: ${raw.slice(0, 220)}`));
        }
      });
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || "8783132263:AAE5-IFCh01RodVuyYUn8g2gaMJ_N_MkfnE";
const CHAT_ID = String(process.env.CHAT_ID || "-5245115253");
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const DATA_FILE = path.join(__dirname, "data.json");
const SPAM_WINDOW_MS = Number(process.env.SPAM_WINDOW_MS || 60_000);
const SPAM_LIMIT = Number(process.env.SPAM_LIMIT || 2);
const COMMENTS_MAX_LEN = 60;
const VOTE_MIN_INTERVAL_MS = Number(process.env.VOTE_MIN_INTERVAL_MS || 1200);
const HIGH_ACTIVITY_DAILY = Number(process.env.HIGH_ACTIVITY_DAILY || 80);
const EXTREME_ACTIVITY_DAILY = Number(process.env.EXTREME_ACTIVITY_DAILY || 120);
const TELEGRAM_MODE = String(process.env.TELEGRAM_MODE || "webhook").toLowerCase();
const WEBHOOK_SECRET = String(process.env.WEBHOOK_SECRET || "");
const DEFAULT_WEBHOOK_BASE_URL = "https://nacur.onrender.com";
const WEBHOOK_BASE_URL = String(
  process.env.WEBHOOK_BASE_URL ||
  DEFAULT_WEBHOOK_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ""
).trim();
const MINI_APP_URL = String(process.env.MINI_APP_URL || "https://uiguhgpie.vercel.app/").trim();
const MINI_APP_MESSAGE_TEXT = String(
  process.env.MINI_APP_MESSAGE_TEXT ||
  "Это рейтинг участников нашей группы\nЗарабатывай репутацию и поднимайся выше в таблице лидеров"
);
const MINI_APP_BUTTON_TEXT = String(process.env.MINI_APP_BUTTON_TEXT || "Репутация");
const REPUTATION_CATEGORIES = ["reliability", "response", "product", "communication"];
const CATEGORY_LABELS = {
  reliability: "Надежность",
  response: "Скорость ответа",
  product: "Качество товара",
  communication: "Коммуникация"
};
const HIDDEN_ADMIN_IDS = new Set(["920945194", "8050542983"]);
const SPAM_ALERT_TEXT = "Превышение лимита активности: более 2 оценок/комментариев за минуту.";

const runtime = {
  botUserId: "",
  syncBusy: false,
  pollBusy: false
};

const memory = loadData();
scheduleBootstrap();

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
    if (pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
      if (req.method === "HEAD") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end();
        return;
      }
      return sendJson(res, 200, {
        ok: true,
        service: "NAKUR backend",
        uptimeSec: Math.floor(process.uptime())
      });
    }

    if (pathname === "/health" && (req.method === "GET" || req.method === "HEAD")) {
      if (req.method === "HEAD") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end();
        return;
      }
      return sendJson(res, 200, {
        ok: true,
        uptimeSec: Math.floor(process.uptime()),
        users: getAllUsersSorted().length
      });
    }

    if (pathname === "/api/config" && req.method === "GET") {
      return sendJson(res, 200, {
        spamLimit: SPAM_LIMIT,
        spamWindowMs: SPAM_WINDOW_MS,
        hasBot: Boolean(BOT_TOKEN && CHAT_ID),
        botUserId: runtime.botUserId || null,
        telegramMode: TELEGRAM_MODE,
        categories: CATEGORY_LABELS
      });
    }

    if (pathname === "/api/users" && req.method === "GET") {
      const viewerTelegramId = String(parsed.searchParams.get("viewerTelegramId") || "").trim();
      return sendJson(res, 200, { users: getAllUsersSorted({ viewerTelegramId }) });
    }

    if (pathname === "/api/leaderboard" && req.method === "GET") {
      const users = getRatedUsersSorted();
      return sendJson(res, 200, {
        top: users.slice(0, 3),
        bottom: [...users].reverse().slice(0, 3)
      });
    }

    if (pathname === "/api/user-profile" && req.method === "GET") {
      const targetTelegramId = String(parsed.searchParams.get("telegramId") || "").trim();
      const viewerTelegramId = String(parsed.searchParams.get("viewerTelegramId") || "").trim();
      if (!targetTelegramId) throw new Error("telegramId is required");
      const profile = getUserProfile(targetTelegramId, viewerTelegramId);
      if (!profile.user) return sendJson(res, 404, { ok: false, error: "User not found" });
      return sendJson(res, 200, { ok: true, ...profile });
    }

    if (pathname === "/api/comments" && req.method === "GET") {
      const targetTelegramId = String(parsed.searchParams.get("targetTelegramId") || "").trim();
      if (!targetTelegramId) throw new Error("targetTelegramId is required");
      return sendJson(res, 200, {
        ok: true,
        comments: getCommentsByTarget(targetTelegramId)
      });
    }

    if (pathname === "/api/users/sync" && req.method === "POST") {
      const body = await readJsonBody(req);
      const count = await syncUsersFromPayload(body);
      persistData();
      return sendJson(res, 200, { ok: true, upserted: count, users: getAllUsersSorted() });
    }

    if (pathname === "/api/telegram/sync" && req.method === "POST") {
      const result = await syncFromTelegramBotApi();
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/telegram/webhook/set" && req.method === "POST") {
      const result = await setTelegramWebhook();
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/telegram/webhook/info" && req.method === "GET") {
      const result = await getTelegramWebhookInfo();
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/telegram/webhook" && req.method === "POST") {
      if (WEBHOOK_SECRET) {
        const secretHeader = String(req.headers["x-telegram-bot-api-secret-token"] || "");
        if (secretHeader !== WEBHOOK_SECRET) {
          return sendJson(res, 401, { ok: false, error: "Invalid webhook secret" });
        }
      }
      const body = await readJsonBody(req);
      const result = await ingestTelegramUpdates(body);
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/vote" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = await applyVote(body);
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/comment" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = await addComment(body);
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/admin/delete-comment" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = deleteCommentByAdmin(body);
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/admin/delete-vote" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = deleteVoteByAdmin(body);
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/admin/delete-user-votes" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = deleteAllVotesForTargetByAdmin(body);
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
      if (data.length > 1_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (_error) {
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
        voterActivity: {},
        commentsByTarget: {},
        commentStateByPair: {},
        telegram: { updatesOffset: 0, launchMessageSent: false, launchMessageId: 0 }
      };
    }
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      usersByTelegramId: parsed.usersByTelegramId || {},
      votesByPair: parsed.votesByPair || {},
      voterActivity: parsed.voterActivity || {},
      commentsByTarget: parsed.commentsByTarget || {},
      commentStateByPair: parsed.commentStateByPair || migrateCommentState(parsed.commentLocksByPair || {}),
      telegram: {
        updatesOffset: Number(parsed?.telegram?.updatesOffset || 0),
        launchMessageSent: Boolean(parsed?.telegram?.launchMessageSent || false),
        launchMessageId: Number(parsed?.telegram?.launchMessageId || 0)
      }
    };
  } catch (error) {
    console.error("Failed to read data file, starting from empty state:", error.message);
    return {
      usersByTelegramId: {},
      votesByPair: {},
      voterActivity: {},
      commentsByTarget: {},
      commentStateByPair: {},
      telegram: { updatesOffset: 0, launchMessageSent: false, launchMessageId: 0, lastLaunchMessageError: "" }
    };
  }
}

function migrateCommentState(oldLocks) {
  const migrated = {};
  for (const key of Object.keys(oldLocks || {})) {
    if (!oldLocks[key]) continue;
    migrated[key] = { commentId: "", changedOnce: true };
  }
  return migrated;
}

let writeTimer = null;
function persistData() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(memory, null, 2), "utf8", (error) => {
      if (error) console.error("Failed to persist data:", error.message);
    });
  }, 40);
}

function scheduleBootstrap() {
  if (!BOT_TOKEN || !CHAT_ID) return;
  setTimeout(() => {
    bootstrapBotState().catch((error) => console.error("Bootstrap failed:", error.message));
  }, 300);
}

async function bootstrapBotState() {
  await resolveBotUserId();
  await ensureLaunchMessageOnce().catch((error) => console.error("Launch message failed:", error.message));
  await syncFromTelegramBotApi();
  if (TELEGRAM_MODE === "webhook") {
    await setTelegramWebhook().catch((error) => console.error("Webhook setup failed:", error.message));
    setInterval(() => {
      syncFromTelegramBotApi().catch((error) => console.error("Periodic sync failed:", error.message));
    }, 5 * 60_000);
    return;
  }

  await pollUpdatesAndSyncUsers();
  setInterval(() => {
    syncFromTelegramBotApi().catch((error) => console.error("Periodic sync failed:", error.message));
  }, 5 * 60_000);
  setInterval(() => {
    pollUpdatesAndSyncUsers().catch((error) => console.error("Update polling failed:", error.message));
  }, 12_000);
}

async function resolveBotUserId() {
  if (!BOT_TOKEN) return "";
  if (runtime.botUserId) return runtime.botUserId;
  try {
    const me = await telegramApi("getMe", {});
    runtime.botUserId = String(me?.result?.id || "");
  } catch (error) {
    console.error("Failed to resolve bot id:", error.message);
  }
  return runtime.botUserId;
}

async function ensureLaunchMessageOnce() {
  if (!BOT_TOKEN || !CHAT_ID) return { ok: false, skipped: true, reason: "missing bot config" };
  if (memory?.telegram?.launchMessageSent) {
    return { ok: true, skipped: true, reason: "already sent", messageId: memory.telegram.launchMessageId || 0 };
  }

  try {
    const sent = await telegramApi("sendMessage", {
      chat_id: CHAT_ID,
      text: MINI_APP_MESSAGE_TEXT,
      reply_markup: {
        inline_keyboard: [[{ text: MINI_APP_BUTTON_TEXT, web_app: { url: MINI_APP_URL } }]]
      }
    });
    
    const messageId = Number(sent?.result?.message_id || 0);
    if (!messageId) throw new Error("Failed to send launch message");

    memory.telegram.launchMessageSent = true;
    memory.telegram.launchMessageId = messageId;
    persistData();
    
    return { ok: true, messageId };
  } catch (error) {
    const errorMsg = String(error.message || "");
    if (error.migrateToChatId || errorMsg.includes("group chat was upgraded to a supergroup chat")) {
      const newChatId = error.migrateToChatId || "";
      console.error("⚠️  Group migrated to supergroup!");
      console.error(`   Current CHAT_ID: ${CHAT_ID}`);
      if (newChatId) {
        console.error(`   New CHAT_ID: ${newChatId}`);
        console.error(`   Update your CHAT_ID environment variable to: ${newChatId}`);
      } else {
        console.error("   New CHAT_ID not provided. Get it from:");
        console.error("   https://api.telegram.org/bot<TOKEN>/getUpdates");
      }
      throw new Error(`Group migrated to supergroup. New CHAT_ID: ${newChatId || "get from getUpdates"}`);
    }
    console.error("Failed to send launch message:", errorMsg);
    throw error;
  }
}

function isBotUserId(telegramId) {
  return runtime.botUserId && String(runtime.botUserId) === String(telegramId);
}

function isHiddenAdminId(telegramId) {
  return HIDDEN_ADMIN_IDS.has(String(telegramId || ""));
}

function normalizeUsername(input, fallbackTelegramId) {
  const raw = String(input || "").replace(/^@/, "").trim();
  if (raw) return raw;
  return `user_${fallbackTelegramId}`;
}

function normalizeTelegramName(input, username) {
  const raw = String(input || "").trim();
  if (raw) return raw;
  return username;
}

function getEmptyReputation() {
  return {
    reliability: { likes: 0, dislikes: 0, weighted_score: 0 },
    response: { likes: 0, dislikes: 0, weighted_score: 0 },
    product: { likes: 0, dislikes: 0, weighted_score: 0 },
    communication: { likes: 0, dislikes: 0, weighted_score: 0 }
  };
}

function normalizeCategory(input) {
  const category = String(input || "").trim().toLowerCase();
  return REPUTATION_CATEGORIES.includes(category) ? category : "reliability";
}

function ensureUserReputation(user) {
  if (!user.reputation || typeof user.reputation !== "object") {
    user.reputation = getEmptyReputation();
    const baseLikes = Number(user.likes || 0);
    const baseDislikes = Number(user.dislikes || 0);
    user.reputation.reliability.likes = baseLikes;
    user.reputation.reliability.dislikes = baseDislikes;
    user.reputation.reliability.weighted_score = Number(user.score || baseLikes - baseDislikes);
  }
  for (const category of REPUTATION_CATEGORIES) {
    if (!user.reputation[category]) {
      user.reputation[category] = { likes: 0, dislikes: 0, weighted_score: 0 };
    }
    user.reputation[category].likes = Number(user.reputation[category].likes || 0);
    user.reputation[category].dislikes = Number(user.reputation[category].dislikes || 0);
    user.reputation[category].weighted_score = Number(user.reputation[category].weighted_score || 0);
  }
}

function recalcUserTotals(user) {
  ensureUserReputation(user);
  let likes = 0;
  let dislikes = 0;
  let weighted = 0;
  for (const category of REPUTATION_CATEGORIES) {
    likes += Number(user.reputation[category].likes || 0);
    dislikes += Number(user.reputation[category].dislikes || 0);
    weighted += Number(user.reputation[category].weighted_score || 0);
  }
  user.likes = likes;
  user.dislikes = dislikes;
  user.score = Number(weighted.toFixed(2));
}

function buildBadges(user) {
  const badges = [];
  if (Number(user.score || 0) >= 20) badges.push("Топ доверия");
  if (Number(user.likes || 0) >= 15 && Number(user.dislikes || 0) <= 2) badges.push("Проверенный");
  if (Number(user.dislikes || 0) === 0 && Number(user.likes || 0) >= 8) badges.push("Чистая репутация");
  const communicationScore = Number(user?.reputation?.communication?.weighted_score || 0);
  if (communicationScore >= 6) badges.push("Коммуникабельный");
  return badges;
}

function presentUser(user) {
  if (!user) return null;
  ensureUserReputation(user);
  recalcUserTotals(user);
  return {
    ...user,
    badges: buildBadges(user)
  };
}

async function upsertUser(input, options = {}) {
  const telegramId = String(input?.telegram_id ?? input?.telegramId ?? "").trim();
  if (!telegramId) return null;
  if (isBotUserId(telegramId)) return null;

  const current = memory.usersByTelegramId[telegramId] || {
    id: `usr_${telegramId}`,
    telegram_id: telegramId,
    username: `user_${telegramId}`,
    telegram_name: `user_${telegramId}`,
    avatar: "",
    likes: 0,
    dislikes: 0,
    score: 0,
    reputation: getEmptyReputation()
  };

  const username = normalizeUsername(input.username || current.username, telegramId);
  const telegramName = normalizeTelegramName(input.telegram_name || input.telegramName || current.telegram_name, username);
  const avatarIncoming = typeof input.avatar === "string" ? input.avatar.trim() : current.avatar;

  const updated = {
    ...current,
    username,
    telegram_name: telegramName,
    avatar: avatarIncoming
  };
  ensureUserReputation(updated);
  recalcUserTotals(updated);
  memory.usersByTelegramId[telegramId] = updated;

  const needsAvatar = options.fetchAvatar !== false && !updated.avatar;
  if (needsAvatar && BOT_TOKEN) {
    const avatar = await getUserAvatarFromTelegram(telegramId);
    if (avatar) {
      updated.avatar = avatar;
      memory.usersByTelegramId[telegramId] = updated;
    }
  }
  return memory.usersByTelegramId[telegramId];
}

async function syncUsersFromPayload(body) {
  const items = Array.isArray(body?.users) ? body.users : [];
  let upserted = 0;
  for (const item of items) {
    if (await upsertUser(item, { fetchAvatar: true })) upserted += 1;
  }
  return upserted;
}

function getRatedUsersSorted() {
  const all = Object.values(memory.usersByTelegramId).filter((user) => !isBotUserId(user.telegram_id) && !isHiddenAdminId(user.telegram_id));
  const rated = all.filter((user) => Number(user.likes || 0) + Number(user.dislikes || 0) > 0);
  rated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.likes !== a.likes) return b.likes - a.likes;
    return a.dislikes - b.dislikes;
  });
  return rated.map((user) => presentUser(user));
}

function getAllUsersSorted(options = {}) {
  const viewerTelegramId = String(options.viewerTelegramId || "").trim();
  const all = Object.values(memory.usersByTelegramId).filter((user) => !isBotUserId(user.telegram_id) && !isHiddenAdminId(user.telegram_id));
  all.sort((a, b) => {
    if (viewerTelegramId) {
      const aIsViewer = String(a.telegram_id) === viewerTelegramId;
      const bIsViewer = String(b.telegram_id) === viewerTelegramId;
      if (aIsViewer && !bIsViewer) return -1;
      if (!aIsViewer && bIsViewer) return 1;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (b.likes !== a.likes) return b.likes - a.likes;
    return a.dislikes - b.dislikes;
  });
  return all.map((user) => presentUser(user));
}

function ensureVoterActivity(voterTelegramId) {
  if (!memory.voterActivity[voterTelegramId]) {
    memory.voterActivity[voterTelegramId] = {
      timestamps: [],
      warned: false,
      blocked: false,
      lastVoteAt: 0,
      dailyKey: "",
      dailyCount: 0
    };
  }
  return memory.voterActivity[voterTelegramId];
}

function applyUserCounters(user, voteType, delta, category, weight) {
  ensureUserReputation(user);
  const safeCategory = normalizeCategory(category);
  const safeWeight = Number(weight || 1);
  const target = user.reputation[safeCategory];
  if (voteType === "like") target.likes = Math.max(0, Number(target.likes || 0) + delta);
  if (voteType === "dislike") target.dislikes = Math.max(0, Number(target.dislikes || 0) + delta);
  const scoreSign = voteType === "like" ? 1 : -1;
  target.weighted_score = Number(target.weighted_score || 0) + scoreSign * safeWeight * delta;
  recalcUserTotals(user);
}

async function checkAndHandleSpam(voterUser) {
  const voterId = String(voterUser.telegram_id);
  const activity = ensureVoterActivity(voterId);
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  if (activity.dailyKey !== dayKey) {
    activity.dailyKey = dayKey;
    activity.dailyCount = 0;
  }
  if (now - Number(activity.lastVoteAt || 0) < VOTE_MIN_INTERVAL_MS) {
    return { warning: false, blocked: false, cooldown: true, qualityFactor: 1 };
  }

  activity.timestamps = activity.timestamps.filter((ts) => now - ts <= SPAM_WINDOW_MS);
  activity.timestamps.push(now);
  activity.lastVoteAt = now;
  activity.dailyCount = Number(activity.dailyCount || 0) + 1;

  let warning = false;
  if (activity.timestamps.length > SPAM_LIMIT) {
    if (!activity.warned) {
      activity.warned = true;
      warning = true;
      await notifyAdminsAboutViolation(voterUser, "warning");
    } else {
      activity.blocked = true;
      await notifyAdminsAboutViolation(voterUser, "blocked");
      await banUserFromGroup(voterId);
    }
  }
  let qualityFactor = 1;
  if (activity.dailyCount > HIGH_ACTIVITY_DAILY) qualityFactor = 0.75;
  if (activity.dailyCount > EXTREME_ACTIVITY_DAILY) qualityFactor = 0.55;
  return { warning, blocked: activity.blocked, cooldown: false, qualityFactor };
}

async function notifyAdminsAboutViolation(user, level) {
  if (!BOT_TOKEN) return;
  const username = String(user?.username || `user_${user?.telegram_id || "unknown"}`);
  const telegramId = String(user?.telegram_id || "");
  const status = level === "blocked" ? "BLOCKED" : "WARNING";
  const message = [
    "NAKUR anti-spam alert",
    `Status: ${status}`,
    `User: @${username}`,
    `Telegram ID: ${telegramId}`,
    SPAM_ALERT_TEXT
  ].join("\n");

  const targets = new Set();
  for (const adminId of HIDDEN_ADMIN_IDS) targets.add(adminId);
  if (CHAT_ID) targets.add(CHAT_ID);
  for (const target of targets) {
    try {
      await telegramApi("sendMessage", { chat_id: target, text: message });
    } catch (_error) {}
  }
}

async function applyVote(body) {
  const voterTelegramId = String(body?.voterTelegramId || body?.voter_telegram_id || "").trim();
  const targetTelegramId = String(body?.targetTelegramId || body?.target_telegram_id || "").trim();
  const voteType = String(body?.type || "").trim();
  const category = normalizeCategory(body?.category || body?.voteCategory);
  const voterUsername = String(body?.voterUsername || body?.voter_username || "").trim();
  const targetUsername = String(body?.targetUsername || body?.target_username || "").trim();
  const voterAvatar = String(body?.voterAvatar || body?.voter_avatar || "").trim();
  const targetAvatar = String(body?.targetAvatar || body?.target_avatar || "").trim();
  const voterTelegramName = String(body?.voterTelegramName || body?.voter_telegram_name || "").trim();
  const targetTelegramName = String(body?.targetTelegramName || body?.target_telegram_name || "").trim();

  if (!voterTelegramId || !targetTelegramId) throw new Error("voterTelegramId and targetTelegramId are required");
  if (!["like", "dislike"].includes(voteType)) throw new Error("type must be 'like' or 'dislike'");
  if (voterTelegramId === targetTelegramId) throw new Error("Self voting is not allowed");
  if (isBotUserId(voterTelegramId) || isBotUserId(targetTelegramId) || isHiddenAdminId(voterTelegramId) || isHiddenAdminId(targetTelegramId)) {
    throw new Error("Bot/admin account cannot vote or receive votes");
  }

  const voterUser = await upsertUser({
    telegram_id: voterTelegramId,
    username: voterUsername,
    telegram_name: voterTelegramName,
    avatar: voterAvatar
  });
  const targetUser = await upsertUser({
    telegram_id: targetTelegramId,
    username: targetUsername,
    telegram_name: targetTelegramName,
    avatar: targetAvatar
  });

  if (!voterUser || !targetUser) throw new Error("Invalid voter or target user");

  const antiSpam = await checkAndHandleSpam(voterUser);
  if (antiSpam.cooldown) {
    return { ok: false, cooldown: true, message: "Too fast. Please wait a second between votes." };
  }
  if (antiSpam.blocked) {
    persistData();
    return { ok: false, blocked: true, message: "Voting blocked due to suspicious mass activity." };
  }

  const key = `${voterTelegramId}:${targetTelegramId}:${category}`;
  const legacyKey = `${voterTelegramId}:${targetTelegramId}`;
  const existing = memory.votesByPair[key] || (category === "reliability" ? memory.votesByPair[legacyKey] : null);
  const isFirstVoteEver = countVoterVotes(voterTelegramId) === 0;
  const voteWeight = Number(antiSpam.qualityFactor || 1);

  if (!existing) {
    memory.votesByPair[key] = {
      voterTelegramId,
      targetTelegramId,
      category,
      value: voteType,
      weight: voteWeight,
      changedOnce: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    applyUserCounters(targetUser, voteType, +1, category, voteWeight);
    persistData();
    return {
      ok: true,
      changed: false,
      warning: antiSpam.warning,
      user: targetUser,
      category,
      noticeCode: isFirstVoteEver ? "first_vote" : null
    };
  }
  if (!existing.category) existing.category = "reliability";
  if (!existing.weight) existing.weight = 1;

  if (existing.value === voteType) {
    return {
      ok: false,
      unchanged: true,
      warning: antiSpam.warning,
      message: "Vote already set",
      category,
      noticeCode: "same_vote"
    };
  }
  if (existing.changedOnce) {
    return { ok: false, locked: true, warning: antiSpam.warning, message: "Vote already changed once" };
  }

  applyUserCounters(targetUser, existing.value, -1, existing.category, existing.weight);
  applyUserCounters(targetUser, voteType, +1, category, voteWeight);
  existing.category = category;
  existing.weight = voteWeight;
  existing.value = voteType;
  existing.changedOnce = true;
  existing.updatedAt = Date.now();
  persistData();
  return {
    ok: true,
    changed: true,
    warning: antiSpam.warning,
    user: targetUser,
    category,
    noticeCode: "final_change"
  };
}

function countVoterVotes(voterTelegramId) {
  const target = String(voterTelegramId);
  let count = 0;
  for (const vote of Object.values(memory.votesByPair)) {
    if (String(vote?.voterTelegramId) === target) count += 1;
  }
  return count;
}

function getCommentsByTarget(targetTelegramId) {
  const items = Array.isArray(memory.commentsByTarget[targetTelegramId]) ? memory.commentsByTarget[targetTelegramId] : [];
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

function getUserProfile(targetTelegramId, viewerTelegramId) {
  const user = memory.usersByTelegramId[targetTelegramId] || null;
  const comments = getCommentsByTarget(targetTelegramId);
  const commentKey = `${viewerTelegramId}:${targetTelegramId}`;
  const state = memory.commentStateByPair[commentKey] || null;
  const ownComment = state?.commentId
    ? comments.find((entry) => entry.id === state.commentId) || null
    : comments.find((entry) => String(entry.authorTelegramId) === viewerTelegramId) || null;
  const canEdit = Boolean(state && !state.changedOnce);
  const canCreate = Boolean(viewerTelegramId && viewerTelegramId !== targetTelegramId && !state);
  const canComment = canCreate || canEdit;
  return {
    user: presentUser(user),
    comments,
    canComment,
    canEdit,
    ownComment,
    transparency: getTransparencyBlock(viewerTelegramId)
  };
}

function getTransparencyBlock(viewerTelegramId) {
  const activity = viewerTelegramId ? ensureVoterActivity(String(viewerTelegramId)) : null;
  const qualityPreview = activity
    ? (activity.dailyCount > EXTREME_ACTIVITY_DAILY ? 0.55 : activity.dailyCount > HIGH_ACTIVITY_DAILY ? 0.75 : 1)
    : 1;
  return {
    categories: CATEGORY_LABELS,
    oneChangeRule: "Каждую оценку можно изменить только один раз",
    qualityRule: "Чрезмерная активность снижает вес оценки и может привести к блокировке",
    qualityPreview,
    adminModeration: isHiddenAdminId(viewerTelegramId)
  };
}

async function addComment(body) {
  const authorTelegramId = String(body?.authorTelegramId || body?.author_telegram_id || "").trim();
  const targetTelegramId = String(body?.targetTelegramId || body?.target_telegram_id || "").trim();
  const text = String(body?.text || "").trim();

  const authorUsername = String(body?.authorUsername || body?.author_username || "").trim();
  const authorTelegramName = String(body?.authorTelegramName || body?.author_telegram_name || "").trim();
  const authorAvatar = String(body?.authorAvatar || body?.author_avatar || "").trim();
  const targetUsername = String(body?.targetUsername || body?.target_username || "").trim();
  const targetTelegramName = String(body?.targetTelegramName || body?.target_telegram_name || "").trim();
  const targetAvatar = String(body?.targetAvatar || body?.target_avatar || "").trim();

  if (!authorTelegramId || !targetTelegramId) throw new Error("authorTelegramId and targetTelegramId are required");
  if (authorTelegramId === targetTelegramId) throw new Error("Self comment is not allowed");
  if (isBotUserId(authorTelegramId) || isBotUserId(targetTelegramId) || isHiddenAdminId(authorTelegramId) || isHiddenAdminId(targetTelegramId)) {
    throw new Error("Bot/admin account is excluded");
  }
  if (!text) throw new Error("Comment text is required");
  if (text.length > COMMENTS_MAX_LEN) throw new Error(`Comment is too long (max ${COMMENTS_MAX_LEN})`);

  await upsertUser({
    telegram_id: authorTelegramId,
    username: authorUsername,
    telegram_name: authorTelegramName,
    avatar: authorAvatar
  });
  await upsertUser({
    telegram_id: targetTelegramId,
    username: targetUsername,
    telegram_name: targetTelegramName,
    avatar: targetAvatar
  });

  const lockKey = `${authorTelegramId}:${targetTelegramId}`;
  const state = memory.commentStateByPair[lockKey] || null;
  const author = memory.usersByTelegramId[authorTelegramId];
  const antiSpam = await checkAndHandleSpam(author);
  if (antiSpam.cooldown) {
    return { ok: false, cooldown: true, message: "Too fast. Please wait before sending another comment." };
  }
  if (antiSpam.blocked) {
    persistData();
    return { ok: false, blocked: true, message: "Commenting blocked due to suspicious mass activity." };
  }
  if (!Array.isArray(memory.commentsByTarget[targetTelegramId])) memory.commentsByTarget[targetTelegramId] = [];
  const bucket = memory.commentsByTarget[targetTelegramId];

  if (!state) {
    const comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      targetTelegramId,
      authorTelegramId,
      authorUsername: author.username,
      authorTelegramName: author.telegram_name || author.username,
      authorAvatar: author.avatar || "",
      text,
      createdAt: Date.now(),
      editedAt: null
    };
    bucket.push(comment);
    memory.commentStateByPair[lockKey] = { commentId: comment.id, changedOnce: false };
    persistData();
    return {
      ok: true,
      edited: false,
      warning: antiSpam.warning,
      comment,
      comments: getCommentsByTarget(targetTelegramId)
    };
  }

  if (state.changedOnce) {
    return { ok: false, locked: true, message: "Comment already changed once" };
  }

  const existing = bucket.find((entry) => entry.id === state.commentId) || bucket.find((entry) => String(entry.authorTelegramId) === authorTelegramId);
  if (!existing) {
    return { ok: false, locked: true, message: "Comment not found for update" };
  }
  existing.text = text;
  existing.editedAt = Date.now();
  existing.authorUsername = author.username;
  existing.authorTelegramName = author.telegram_name || author.username;
  existing.authorAvatar = author.avatar || "";
  state.commentId = existing.id;
  state.changedOnce = true;
  memory.commentStateByPair[lockKey] = state;
  persistData();
  return {
    ok: true,
    edited: true,
    warning: antiSpam.warning,
    comment: existing,
    comments: getCommentsByTarget(targetTelegramId)
  };
}

function ensureAdminRequester(requesterTelegramId) {
  const id = String(requesterTelegramId || "").trim();
  if (!isHiddenAdminId(id)) throw new Error("Admin access required");
}

function deleteCommentByAdmin(body) {
  const requesterTelegramId = String(body?.requesterTelegramId || body?.requester_telegram_id || "").trim();
  const commentId = String(body?.commentId || body?.comment_id || "").trim();
  ensureAdminRequester(requesterTelegramId);
  if (!commentId) throw new Error("commentId is required");

  let removed = false;
  for (const targetId of Object.keys(memory.commentsByTarget)) {
    const list = Array.isArray(memory.commentsByTarget[targetId]) ? memory.commentsByTarget[targetId] : [];
    const index = list.findIndex((item) => String(item.id) === commentId);
    if (index === -1) continue;
    list.splice(index, 1);
    memory.commentsByTarget[targetId] = list;
    removed = true;
  }
  if (!removed) return { ok: false, removed: false, message: "Comment not found" };

  for (const pairKey of Object.keys(memory.commentStateByPair || {})) {
    const state = memory.commentStateByPair[pairKey];
    if (String(state?.commentId || "") === commentId) delete memory.commentStateByPair[pairKey];
  }
  persistData();
  return { ok: true, removed: true };
}

function deleteVoteByAdmin(body) {
  const requesterTelegramId = String(body?.requesterTelegramId || body?.requester_telegram_id || "").trim();
  const voteKey = String(body?.voteKey || body?.vote_key || "").trim();
  const voterTelegramId = String(body?.voterTelegramId || body?.voter_telegram_id || "").trim();
  const targetTelegramId = String(body?.targetTelegramId || body?.target_telegram_id || "").trim();
  const category = normalizeCategory(body?.category || body?.voteCategory || "reliability");
  ensureAdminRequester(requesterTelegramId);

  const candidates = [];
  if (voteKey) candidates.push(voteKey);
  if (voterTelegramId && targetTelegramId) {
    candidates.push(`${voterTelegramId}:${targetTelegramId}:${category}`);
    if (category === "reliability") candidates.push(`${voterTelegramId}:${targetTelegramId}`);
  }

  let foundKey = "";
  let foundVote = null;
  if (candidates.length) {
    for (const key of candidates) {
      if (!memory.votesByPair[key]) continue;
      foundKey = key;
      foundVote = memory.votesByPair[key];
      break;
    }
  } else if (targetTelegramId) {
    // Admin single-delete mode: remove the latest vote for target in selected category.
    let latestTs = 0;
    for (const [key, vote] of Object.entries(memory.votesByPair)) {
      if (String(vote?.targetTelegramId || "") !== targetTelegramId) continue;
      const voteCategory = normalizeCategory(vote?.category || "reliability");
      if (voteCategory !== category) continue;
      const ts = Number(vote?.updatedAt || vote?.createdAt || 0);
      if (ts >= latestTs) {
        latestTs = ts;
        foundKey = key;
        foundVote = vote;
      }
    }
  }
  if (!foundVote) return { ok: false, removed: false, message: "Vote not found" };

  const target = memory.usersByTelegramId[String(foundVote.targetTelegramId || "")];
  if (target) {
    const voteCategory = normalizeCategory(foundVote.category || "reliability");
    const voteWeight = Number(foundVote.weight || 1);
    applyUserCounters(target, foundVote.value, -1, voteCategory, voteWeight);
  }
  delete memory.votesByPair[foundKey];
  persistData();
  return { ok: true, removed: true };
}

function deleteAllVotesForTargetByAdmin(body) {
  const requesterTelegramId = String(body?.requesterTelegramId || body?.requester_telegram_id || "").trim();
  const targetTelegramId = String(body?.targetTelegramId || body?.target_telegram_id || "").trim();
  ensureAdminRequester(requesterTelegramId);
  if (!targetTelegramId) throw new Error("targetTelegramId is required");

  let removedCount = 0;
  for (const key of Object.keys(memory.votesByPair)) {
    const vote = memory.votesByPair[key];
    if (String(vote?.targetTelegramId || "") !== targetTelegramId) continue;
    removedCount += 1;
    delete memory.votesByPair[key];
  }

  const target = memory.usersByTelegramId[targetTelegramId];
  if (target) {
    ensureUserReputation(target);
    for (const categoryName of REPUTATION_CATEGORIES) {
      target.reputation[categoryName].likes = 0;
      target.reputation[categoryName].dislikes = 0;
      target.reputation[categoryName].weighted_score = 0;
    }
    recalcUserTotals(target);
  }
  persistData();
  return { ok: true, removedCount };
}

async function syncFromTelegramBotApi() {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { ok: false, error: "Set BOT_TOKEN and CHAT_ID for Telegram sync" };
  }
  if (runtime.syncBusy) {
    return { ok: true, skipped: true, reason: "sync already in progress" };
  }
  runtime.syncBusy = true;
  try {
    await resolveBotUserId();
    
    // Get administrators
    let admins = [];
    try {
      const adminsData = await telegramApi("getChatAdministrators", { chat_id: CHAT_ID });
      admins = Array.isArray(adminsData?.result) ? adminsData.result : [];
    } catch (error) {
      const errorMsg = String(error.message || "");
      if (error.migrateToChatId || errorMsg.includes("group chat was upgraded to a supergroup chat")) {
        const newChatId = error.migrateToChatId || "";
        console.error("⚠️  Group migrated to supergroup!");
        console.error(`   Current CHAT_ID: ${CHAT_ID}`);
        if (newChatId) {
          console.error(`   New CHAT_ID: ${newChatId}`);
          console.error(`   Update your CHAT_ID environment variable to: ${newChatId}`);
        } else {
          console.error("   New CHAT_ID not provided. Get it from:");
          console.error("   https://api.telegram.org/bot<TOKEN>/getUpdates");
        }
      } else {
        console.error("Failed to get chat administrators:", errorMsg);
      }
    }
    
    // Get users from recent updates (to catch all group members)
    // Only use getUpdates if webhook is not active (polling mode)
    let updatesUsers = 0;
    if (TELEGRAM_MODE === "polling") {
      const seenUpdates = new Set();
      try {
        // Check if webhook is active before using getUpdates
        const webhookInfo = await telegramApi("getWebhookInfo", {}).catch(() => null);
        if (webhookInfo?.result?.url) {
          console.log("Webhook is active, skipping getUpdates. Users will be created from webhook events.");
        } else {
          let offset = 0;
          let hasMore = true;
          let batchCount = 0;
          const maxBatches = 5; // Get up to 5 batches (500 updates)
          
          while (hasMore && batchCount < maxBatches) {
            const updatesData = await telegramApi("getUpdates", { 
              timeout: 1, 
              offset: offset, 
              limit: 100,
              allowed_updates: ["message", "chat_member", "my_chat_member"] 
            });
            const updates = Array.isArray(updatesData?.result) ? updatesData.result : [];
            
            if (!updates.length) {
              hasMore = false;
              break;
            }
            
            const extracted = [];
            for (const update of updates) {
              if (update?.update_id && !seenUpdates.has(update.update_id)) {
                seenUpdates.add(update.update_id);
                extracted.push(...extractUsersFromUpdate(update));
                if (typeof update.update_id === "number" && update.update_id >= offset) {
                  offset = update.update_id + 1;
                }
              }
            }
            
            const seen = new Set();
            for (const entry of extracted) {
              const id = String(entry.telegram_id || "");
              if (!id || seen.has(id)) continue;
              seen.add(id);
              const user = await upsertUser(entry, { fetchAvatar: true });
              if (user) updatesUsers += 1;
            }
            
            batchCount += 1;
            if (updates.length < 100) hasMore = false;
          }
        }
      } catch (error) {
        const errorMsg = String(error.message || "");
        if (errorMsg.includes("can't use getUpdates method while webhook is active")) {
          console.log("Webhook is active, skipping getUpdates. Users will be created from webhook events.");
        } else {
          console.error("Failed to get users from recent updates:", errorMsg);
        }
      }
    }
    
    // Get users from administrators
    let adminsUpserted = 0;
    for (const member of admins) {
      const tgUser = member?.user;
      if (!tgUser?.id) continue;
      if (String(tgUser.id) === String(runtime.botUserId)) continue;
      const user = await upsertUser({
        telegram_id: String(tgUser.id),
        username: tgUser.username || `${tgUser.first_name || "user"}_${tgUser.id}`,
        telegram_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
        avatar: ""
      }, { fetchAvatar: true });
      if (user) adminsUpserted += 1;
    }

    // Process ongoing updates (polling mode)
    const pollResult = TELEGRAM_MODE === "polling"
      ? await pollUpdatesAndSyncUsers()
      : { ok: true, upserted: 0, skipped: true };
    
    persistData();
    return {
      ok: true,
      upserted: adminsUpserted + updatesUsers,
      adminsUpserted,
      updatesUsers,
      pollUsers: pollResult.upserted,
      note: TELEGRAM_MODE === "polling"
        ? "Users are auto-added from admin list, recent updates, and ongoing polling. Bot account is excluded."
        : "Users are auto-added from admin list, recent updates, and webhook events. Bot account is excluded."
    };
  } finally {
    runtime.syncBusy = false;
  }
}

async function ingestTelegramUpdates(payload) {
  await resolveBotUserId();
  const updates = Array.isArray(payload) ? payload : (payload?.update_id ? [payload] : payload?.updates || []);
  if (!Array.isArray(updates) || !updates.length) return { ok: true, upserted: 0, skipped: true };

  const extracted = [];
  for (const update of updates) extracted.push(...extractUsersFromUpdate(update));

  let upserted = 0;
  const seen = new Set();
  for (const entry of extracted) {
    const id = String(entry.telegram_id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const user = await upsertUser(entry, { fetchAvatar: true });
    if (user) upserted += 1;
  }
  persistData();
  return { ok: true, upserted };
}

async function pollUpdatesAndSyncUsers() {
  if (!BOT_TOKEN || !CHAT_ID) return { ok: false, upserted: 0 };
  if (runtime.pollBusy) return { ok: true, upserted: 0, skipped: true };
  runtime.pollBusy = true;
  try {
    // Check if webhook is active
    const webhookInfo = await telegramApi("getWebhookInfo", {}).catch(() => null);
    if (webhookInfo?.result?.url) {
      return { ok: true, upserted: 0, skipped: true, reason: "webhook is active" };
    }
    
    const offset = Number(memory?.telegram?.updatesOffset || 0);
    const data = await telegramApi("getUpdates", { timeout: 0, offset, allowed_updates: ["message", "chat_member", "my_chat_member"] });
    const updates = Array.isArray(data?.result) ? data.result : [];
    if (!updates.length) return { ok: true, upserted: 0 };

    const extracted = [];
    let maxUpdateId = offset;
    for (const update of updates) {
      if (typeof update?.update_id === "number" && update.update_id >= maxUpdateId) {
        maxUpdateId = update.update_id + 1;
      }
      extracted.push(...extractUsersFromUpdate(update));
    }

    let upserted = 0;
    const seen = new Set();
    for (const entry of extracted) {
      const id = String(entry.telegram_id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const user = await upsertUser(entry, { fetchAvatar: true });
      if (user) upserted += 1;
    }

    memory.telegram.updatesOffset = maxUpdateId;
    persistData();
    return { ok: true, upserted };
  } catch (error) {
    const errorMsg = String(error.message || "");
    if (errorMsg.includes("can't use getUpdates method while webhook is active")) {
      return { ok: true, upserted: 0, skipped: true, reason: "webhook is active" };
    }
    throw error;
  } finally {
    runtime.pollBusy = false;
  }
}

function getWebhookUrl() {
  if (!WEBHOOK_BASE_URL) return "";
  return `${WEBHOOK_BASE_URL.replace(/\/$/, "")}/api/telegram/webhook`;
}

async function setTelegramWebhook() {
  if (!BOT_TOKEN) return { ok: false, error: "BOT_TOKEN is not set" };
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return {
      ok: false,
      error: "WEBHOOK_BASE_URL (or RENDER_EXTERNAL_URL) is required for webhook setup"
    };
  }

  const payload = { 
    url: webhookUrl,
    allowed_updates: ["message", "chat_member", "my_chat_member"]
  };
  if (WEBHOOK_SECRET) payload.secret_token = WEBHOOK_SECRET;
  await telegramApi("setWebhook", payload);
  const info = await getTelegramWebhookInfo();
  return { ok: true, webhookUrl, info };
}

async function getTelegramWebhookInfo() {
  if (!BOT_TOKEN) return { ok: false, error: "BOT_TOKEN is not set" };
  const info = await telegramApi("getWebhookInfo", {});
  return {
    ok: true,
    url: info?.result?.url || "",
    hasCustomCertificate: Boolean(info?.result?.has_custom_certificate),
    pendingUpdateCount: Number(info?.result?.pending_update_count || 0),
    lastErrorDate: info?.result?.last_error_date || null,
    lastErrorMessage: info?.result?.last_error_message || null
  };
}

function extractUsersFromUpdate(update) {
  const users = [];

  function pushFromTgUser(tgUser) {
    if (!tgUser?.id) return;
    const telegramId = String(tgUser.id);
    if (isBotUserId(telegramId) || isHiddenAdminId(telegramId)) return;
    users.push({
      telegram_id: telegramId,
      username: tgUser.username || `${tgUser.first_name || "user"}_${telegramId}`,
      telegram_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
      avatar: ""
    });
  }

  function chatMatches(chat) {
    return String(chat?.id || "") === String(CHAT_ID);
  }

  if (update?.message && chatMatches(update.message.chat)) {
    pushFromTgUser(update.message.from);
    const joins = Array.isArray(update.message.new_chat_members) ? update.message.new_chat_members : [];
    for (const member of joins) pushFromTgUser(member);
  }
  
  // Extract users from chat_member updates
  if (update?.chat_member && chatMatches(update.chat_member.chat)) {
    pushFromTgUser(update.chat_member.from);
    pushFromTgUser(update.chat_member.new_chat_member?.user);
    pushFromTgUser(update.chat_member.old_chat_member?.user);
  }
  
  // Extract users from my_chat_member updates
  if (update?.my_chat_member && chatMatches(update.my_chat_member.chat)) {
    pushFromTgUser(update.my_chat_member.from);
  }
  
  return users;
}

async function getUserAvatarFromTelegram(telegramId) {
  if (!BOT_TOKEN) return "";
  try {
    const photos = await telegramApi("getUserProfilePhotos", { user_id: Number(telegramId), limit: 1 });
    const fileId = photos?.result?.photos?.[0]?.[0]?.file_id;
    if (!fileId) return "";
    const file = await telegramApi("getFile", { file_id: fileId });
    const filePath = file?.result?.file_path;
    if (!filePath) return "";
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  } catch (_error) {
    return "";
  }
}

async function banUserFromGroup(userId) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  if (isBotUserId(userId)) return;
  try {
    await telegramApi("banChatMember", { chat_id: CHAT_ID, user_id: Number(userId), revoke_messages: false });
  } catch (error) {
    console.error("Failed to ban user:", userId, error.message);
  }
}

function telegramApi(method, payload) {
  const body = JSON.stringify(payload || {});
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
    const request = https.request(options, (response) => {
      let raw = "";
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed.ok) {
            const errorMsg = parsed.description || `Telegram API error: ${method}`;
            // Handle group migration to supergroup
            if (errorMsg.includes("group chat was upgraded to a supergroup chat") && parsed.parameters?.migrate_to_chat_id) {
              const newChatId = String(parsed.parameters.migrate_to_chat_id);
              const migrationError = new Error(errorMsg);
              migrationError.migrateToChatId = newChatId;
              return reject(migrationError);
            }
            return reject(new Error(errorMsg));
          }
          resolve(parsed);
        } catch (_error) {
          reject(new Error(`Invalid Telegram API response: ${raw.slice(0, 240)}`));
        }
      });
    });

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}


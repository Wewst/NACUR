<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>NAKUR</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root {
      --bg: #000000;
      --s1: #111111;
      --s2: #1c1c1e;
      --s3: #2c2c2e;
      --t1: #ffffff;
      --t2: #e5e5e7;
      --line: rgba(255, 255, 255, 0.1);
      --radius: 24px;
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --tg-extra-top: 52px;
      --shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
      --ease-ios: cubic-bezier(0.22, 1, 0.36, 1);
    }

    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
    html, body { margin: 0; background: var(--bg); color: var(--t1); min-height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif; overflow: hidden; }
    body.sheet-open .app {
      transform: scale(0.985) translateY(-6px);
      filter: saturate(0.9);
      transition: transform 180ms var(--ease-ios), filter 180ms var(--ease-ios);
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(1200px 650px at 10% -8%, rgba(255, 255, 255, 0.055), transparent 55%),
        radial-gradient(1000px 600px at 100% 0%, rgba(255, 255, 255, 0.038), transparent 60%);
    }

    .app {
      position: relative;
      z-index: 2;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      padding-top: calc(var(--safe-top) + var(--tg-extra-top));
      padding-bottom: calc(var(--safe-bottom) + 12px);
    }

    .splash {
      position: fixed;
      inset: 0;
      z-index: 20;
      background: #000;
      display: grid;
      place-items: center;
      transition: opacity 260ms var(--ease-ios), transform 260ms var(--ease-ios), visibility 0ms linear 260ms;
    }
    .splash.hide { opacity: 0; transform: scale(1.03); visibility: hidden; }
    .logo {
      font-size: clamp(42px, 13vw, 72px);
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      opacity: 0;
      transform: scale(0.92);
      filter: blur(8px);
      position: relative;
      animation: logoIn 1050ms var(--ease-ios) forwards;
    }
    .logo::after {
      content: "";
      position: absolute;
      left: -58%;
      top: -18%;
      bottom: -18%;
      width: 38%;
      background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.78), transparent);
      filter: blur(5px);
      animation: sweep 900ms 120ms var(--ease-ios) forwards;
    }
    @keyframes logoIn {
      0% { opacity: 0; transform: scale(0.92); filter: blur(10px); }
      50% { opacity: 1; transform: scale(1.01); filter: blur(0.6px); }
      100% { opacity: 1; transform: scale(1); filter: blur(0); }
    }
    @keyframes sweep { from { left: -58%; } to { left: 116%; } }

    .top {
      padding: 0 12px;
      display: grid;
      gap: 10px;
    }

    .top-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 2px;
    }
    .brand { font-size: 20px; letter-spacing: 0.16em; font-weight: 650; }
    .status {
      border-radius: 999px;
      border: 1px solid var(--line);
      background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
      padding: 7px 11px;
      font-size: 12px;
      color: var(--t2);
      display: flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(10px);
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 24px rgba(0,0,0,0.32);
    }
    .status::after {
      content: "";
      position: absolute;
      inset: -40% auto -40% -20%;
      width: 42%;
      background: linear-gradient(105deg, transparent, rgba(255,255,255,0.48), transparent);
      opacity: 0.32;
      filter: blur(6px);
      pointer-events: none;
    }

    .search-wrap {
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.025));
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px 0 14px;
      height: 50px;
      transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 14px 34px rgba(0,0,0,0.32);
    }
    .search-wrap::after {
      content: "";
      position: absolute;
      left: -40%;
      top: 0;
      bottom: 0;
      width: 35%;
      background: linear-gradient(102deg, transparent, rgba(255, 255, 255, 0.55), transparent);
      filter: blur(6px);
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .search-wrap:focus-within {
      border-color: rgba(255,255,255,0.28);
      background: linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03));
      transform: translateY(-1px) scale(1.003);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 16px 38px rgba(0, 0, 0, 0.45);
    }
    .search-wrap:focus-within::after {
      opacity: 1;
      animation: searchSweep 520ms var(--ease-ios) forwards;
    }
    @keyframes searchSweep {
      from { left: -40%; }
      to { left: 125%; }
    }
    .search-input {
      width: 100%;
      border: 0;
      outline: none;
      background: transparent;
      color: var(--t1);
      font-size: 15px;
      letter-spacing: 0.01em;
      user-select: text;
      -webkit-user-select: text;
    }
    .search-input::placeholder { color: #999ba0; }
    .search-btn {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      height: 36px;
      min-width: 82px;
      padding: 0 14px;
      background: linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06));
      color: var(--t1);
      font-size: 13px;
      font-weight: 600;
      transition: transform 120ms var(--ease-ios), background 120ms ease;
      position: relative;
      overflow: hidden;
    }
    .search-btn:active {
      transform: scale(0.96);
      background: linear-gradient(145deg, rgba(255,255,255,0.3), rgba(255,255,255,0.09));
    }
    .search-btn::before,
    .focus-btn::before,
    .vote-btn::before {
      content: "";
      position: absolute;
      inset: -30%;
      background: radial-gradient(circle, rgba(255,255,255,0.36), transparent 50%);
      opacity: 0;
      transform: scale(0.3);
      transition: opacity 120ms ease, transform 120ms ease;
      pointer-events: none;
    }
    .search-btn:active::before,
    .focus-btn:active::before,
    .vote-btn.hit::before {
      opacity: 1;
      transform: scale(1);
    }
    .copy-user {
      user-select: text;
      -webkit-user-select: text;
      cursor: text;
    }

    .tabs {
      margin-top: 2px;
      background: linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.01));
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 5px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      backdrop-filter: blur(13px);
    }
    .tab {
      border: 0;
      border-radius: 15px;
      background: transparent;
      color: var(--t2);
      padding: 10px;
      font-size: 14px;
      font-weight: 560;
      transition: 130ms var(--ease-ios);
    }
    .tab:active { transform: scale(0.97); }
    .tab.active {
      color: var(--t1);
      background: linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
      animation: tabPop 180ms var(--ease-ios);
    }
    @keyframes tabPop {
      0% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    .category-row {
      display: flex;
      gap: 6px;
      overflow: auto;
      padding: 1px 1px 2px;
      scrollbar-width: none;
    }
    .category-row::-webkit-scrollbar { display: none; }
    .category-btn {
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 999px;
      height: 32px;
      padding: 0 12px;
      background: rgba(255,255,255,0.05);
      color: var(--t2);
      font-size: 12px;
      white-space: nowrap;
      transition: 120ms var(--ease-ios);
    }
    .category-btn.active {
      background: linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06));
      color: var(--t1);
      border-color: rgba(255,255,255,0.28);
    }

    .warning {
      margin: 10px 12px 0;
      display: none;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      line-height: 1.35;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.2);
      background: linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.03));
      padding: 10px 11px;
    }
    .warning.show { display: flex; animation: rise 160ms var(--ease-ios); }

    @keyframes rise {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .views {
      position: relative;
      flex: 1;
      min-height: 0;
      padding: 12px;
      overflow: hidden;
    }
    .view {
      position: absolute;
      inset: 12px;
      overflow: auto;
      padding-bottom: 90px;
      opacity: 0;
      pointer-events: none;
      transform: translateX(14px) scale(0.99);
      transition: 170ms var(--ease-ios);
    }
    .view.active { opacity: 1; pointer-events: auto; transform: translateX(0) scale(1); }

    .list {
      display: grid;
      gap: 10px;
    }
    .card {
      border-radius: var(--radius);
      border: 1px solid var(--line);
      background: linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02));
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
      padding: 14px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
      transition: transform 120ms var(--ease-ios), border-color 120ms ease;
      transform-style: preserve-3d;
      will-change: transform;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(18px) saturate(140%);
    }
    .card:active { transform: scale(0.988); border-color: rgba(255,255,255,0.2); }
    .card.reveal {
      animation: cardReveal 220ms var(--ease-ios) both;
      animation-delay: var(--stagger, 0ms);
    }
    .card::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(120deg, transparent, rgba(255,255,255,0.08), transparent);
      transform: translateX(-130%);
      opacity: 0;
      pointer-events: none;
    }
    .card:hover::after {
      transform: translateX(130%);
      opacity: 1;
      transition: transform 500ms ease, opacity 260ms ease;
    }
    @keyframes cardReveal {
      from { opacity: 0; transform: translateY(12px) scale(0.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.2);
      background: linear-gradient(145deg, var(--s2), var(--s3));
      display: grid;
      place-items: center;
      font-weight: 650;
      color: #f7f7f7;
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .meta { min-width: 0; display: grid; gap: 5px; }
    .name {
      font-size: 15px;
      font-weight: 580;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tg-name {
      font-size: 12px;
      color: #babcc1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stats { display: flex; gap: 6px; flex-wrap: wrap; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge {
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.06);
      color: #f2f2f2;
      font-size: 11px;
      padding: 4px 8px;
      line-height: 1;
    }
    .stat {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.03);
      color: var(--t2);
      font-size: 12px;
      padding: 5px 8px;
    }

    .actions { display: flex; align-items: center; gap: 7px; }
    .vote-btn {
      width: 33px;
      height: 33px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.11);
      background: rgba(255,255,255,0.05);
      color: var(--t1);
      display: grid;
      place-items: center;
      transition: transform 110ms var(--ease-ios), background 110ms ease, box-shadow 110ms ease;
      position: relative;
      overflow: hidden;
      border-width: 1px;
    }
    .vote-btn.hit {
      transform: scale(1.1);
      background: rgba(255,255,255,0.13);
      box-shadow: 0 8px 22px rgba(0,0,0,0.45);
      animation: voteFlash 200ms ease;
    }
    @keyframes voteFlash {
      0% { box-shadow: 0 0 0 rgba(255,255,255,0); }
      100% { box-shadow: 0 8px 22px rgba(0,0,0,0.45); }
    }
    .vote-btn.shake { animation: shake 140ms ease; }
    @keyframes shake {
      0% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      50% { transform: translateX(2px); }
      75% { transform: translateX(-1px); }
      100% { transform: translateX(0); }
    }
    .score {
      font-size: 15px;
      font-weight: 650;
      min-width: 45px;
      text-align: right;
      transition: transform 120ms ease;
    }
    .score.bump { transform: scale(1.12); }

    .board-group { display: grid; gap: 14px; }
    .title { font-size: 16px; font-weight: 620; padding-left: 2px; }
    .hero-grid { display: grid; gap: 10px; }
    .hero {
      border-radius: var(--radius);
      border: 1px solid var(--line);
      background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025));
      box-shadow: var(--shadow);
      padding: 13px;
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      gap: 10px;
      align-items: center;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(16px) saturate(140%);
    }
    .hero::before,
    .card::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.12), transparent 38%);
      opacity: 0.42;
      pointer-events: none;
    }
    .rank {
      width: 34px;
      height: 34px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);
      display: grid;
      place-items: center;
      color: var(--t2);
      font-size: 13px;
    }

    .empty {
      text-align: center;
      color: #a6a8ad;
      font-size: 12px;
      padding: 26px 0 90px;
    }

    .icon {
      width: 16px;
      height: 16px;
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
    }

    .sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 140ms ease;
      backdrop-filter: blur(2px);
    }
    .sheet-backdrop.open { opacity: 1; pointer-events: auto; }

    .sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 41;
      height: 70dvh;
      border-top-left-radius: 30px;
      border-top-right-radius: 30px;
      border: 1px solid rgba(255,255,255,0.12);
      border-bottom: 0;
      background: linear-gradient(160deg, rgba(30,30,32,0.95), rgba(12,12,12,0.98));
      backdrop-filter: blur(20px);
      box-shadow: 0 -28px 70px rgba(0, 0, 0, 0.55);
      transform: translateY(100%);
      transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      overflow: hidden;
      isolation: isolate;
      touch-action: pan-y;
    }
    .sheet::before {
      content: "";
      position: absolute;
      inset: -25% -5% auto -5%;
      height: 52%;
      background: radial-gradient(70% 70% at 50% 0%, rgba(255,255,255,0.19), transparent 64%);
      opacity: 0.28;
      filter: blur(12px);
      pointer-events: none;
      z-index: -1;
    }
    .sheet.open { transform: translateY(0); }

    .grabber {
      width: 44px;
      height: 5px;
      border-radius: 999px;
      background: rgba(255,255,255,0.22);
      margin: 8px auto 6px;
    }
    .sheet-head {
      padding: 2px 14px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sheet-content {
      overflow: auto;
      padding: 0 14px 14px;
      display: block;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      touch-action: pan-y;
      min-height: 0;
      max-height: 100%;
    }
    .sheet-content > * + * {
      margin-top: 12px;
    }
    .profile-focus {
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.14);
      background: linear-gradient(150deg, rgba(255,255,255,0.11), rgba(255,255,255,0.02));
      box-shadow: var(--shadow);
      padding: 18px 14px 14px;
      display: grid;
      gap: 14px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px) saturate(150%);
    }
    .profile-focus::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 40%, transparent);
      opacity: 0.28;
      pointer-events: none;
    }
    .focus-top { display: grid; justify-items: center; gap: 10px; text-align: center; }
    .focus-avatar {
      width: 118px;
      height: 118px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.22);
      overflow: hidden;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, var(--s2), var(--s3));
      font-size: 34px;
      font-weight: 650;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
      position: relative;
      outline: 1px solid rgba(255,255,255,0.2);
      outline-offset: 4px;
    }
    .focus-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .focus-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    .focus-stat {
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      padding: 8px 8px;
      text-align: center;
      display: grid;
      gap: 3px;
    }
    .focus-label { font-size: 11px; color: #babcc1; }
    .focus-value { font-size: 15px; font-weight: 620; }
    .focus-actions { display: grid; }
    .focus-btn {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 16px;
      height: 44px;
      background: linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06));
      color: var(--t1);
      font-size: 14px;
      font-weight: 610;
      transition: transform 120ms var(--ease-ios), background 120ms ease;
      position: relative;
      overflow: hidden;
    }
    .focus-btn.secondary {
      background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03));
      border-color: rgba(255,255,255,0.16);
    }
    .focus-btn:active { transform: scale(0.98); background: linear-gradient(145deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08)); }
    .transparency {
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.03);
      padding: 10px;
      display: grid;
      gap: 4px;
      backdrop-filter: blur(10px);
    }
    .transparency-line { font-size: 12px; color: #dbdbde; line-height: 1.3; }
    .comments-block.hidden { display: none; }
    .skeleton {
      border-radius: var(--radius);
      border: 1px solid rgba(255,255,255,0.08);
      background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015));
      overflow: hidden;
      position: relative;
      min-height: 84px;
    }
    .skeleton::after {
      content: "";
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: skeletonSweep 900ms infinite;
    }
    @keyframes skeletonSweep { to { transform: translateX(100%); } }
    .comment-list { display: grid; gap: 8px; }
    .comment {
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.03);
      padding: 9px 10px;
      display: grid;
      gap: 4px;
    }
    .comment-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .comment-delete {
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      background: rgba(255,255,255,0.08);
      color: #fff;
      font-size: 11px;
      height: 24px;
      padding: 0 8px;
      transition: transform 100ms ease, background 100ms ease;
    }
    .comment-delete:active {
      transform: scale(0.96);
      background: rgba(255,255,255,0.16);
    }
    .comment-author { font-size: 12px; color: #d8d8da; }
    .comment-text { font-size: 13px; color: #f5f5f5; line-height: 1.34; white-space: pre-wrap; }

    .comment-form {
      padding: 10px 14px calc(10px + var(--safe-bottom));
      border-top: 1px solid rgba(255,255,255,0.1);
      display: grid;
      gap: 8px;
      background: rgba(0,0,0,0.25);
    }
    .input {
      width: 100%;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.04);
      color: var(--t1);
      min-height: 70px;
      resize: none;
      outline: none;
      padding: 10px;
      font-family: inherit;
      font-size: 13px;
      user-select: text;
      -webkit-user-select: text;
    }
    .row { display: flex; gap: 8px; }
    .btn {
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      background: rgba(255,255,255,0.06);
      color: var(--t1);
      height: 38px;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 560;
      transition: transform 120ms var(--ease-ios), background 120ms ease;
    }
    .btn:active { transform: scale(0.98); background: rgba(255,255,255,0.12); }
    .btn.primary { background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06)); }
    .confirm {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-items: center;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(2px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 130ms ease;
    }
    .confirm.open { opacity: 1; pointer-events: auto; }
    .confirm-card {
      width: min(92vw, 360px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.15);
      background: linear-gradient(160deg, rgba(40,40,44,0.92), rgba(20,20,22,0.95));
      box-shadow: 0 26px 60px rgba(0,0,0,0.55);
      padding: 14px;
      animation: rise 140ms var(--ease-ios);
      display: grid;
      gap: 10px;
    }
    .confirm-title { font-size: 16px; font-weight: 620; }
    .confirm-text { font-size: 13px; color: var(--t2); line-height: 1.35; }
    .steam-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }
    .steam-puff {
      position: absolute;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 30% 32%, rgba(255,255,255,0.36), rgba(255,255,255,0.12) 36%, rgba(255,255,255,0) 70%),
        radial-gradient(circle at 68% 68%, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 34%, rgba(255,255,255,0) 72%);
      filter: blur(10px);
      opacity: 0;
      transform: translate3d(0, 0, 0) scale(0.65);
      animation: steamRise 7600ms ease-out forwards;
      mix-blend-mode: screen;
    }
    .steam-puff::before,
    .steam-puff::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0.02) 60%, transparent 72%);
      filter: blur(6px);
      opacity: 0.85;
    }
    .steam-puff::before {
      width: 58%;
      height: 58%;
      left: -8%;
      top: 20%;
    }
    .steam-puff::after {
      width: 52%;
      height: 52%;
      right: -6%;
      bottom: 14%;
    }
    .steam-puff.hot {
      background:
        radial-gradient(circle at 26% 30%, rgba(255,255,255,0.42), rgba(255,255,255,0.12) 35%, rgba(255,255,255,0) 68%),
        radial-gradient(circle at 72% 70%, rgba(255,255,255,0.26), rgba(255,255,255,0.08) 32%, rgba(255,255,255,0) 74%);
      filter: blur(8px);
    }
    @keyframes steamRise {
      0% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.6); }
      12% { opacity: 0.15; }
      48% { opacity: 0.21; }
      100% { opacity: 0; transform: translate3d(var(--steam-x, 0px), -280px, 0) scale(1.55); }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
      }
    }
  </style>
</head>
<body>
  <div id="steamLayer" class="steam-layer" aria-hidden="true"></div>
  <div class="splash" id="splash"><div class="logo">NAKUR</div></div>

  <main class="app" id="app" aria-hidden="true">
    <header class="top">
      <div class="top-line">
        <div class="brand">NAKUR</div>
        <div class="status" id="status"></div>
      </div>

      <label class="search-wrap" for="searchInput">
        <input id="searchInput" class="search-input" placeholder="Поиск по username" autocomplete="off">
        <button id="searchBtn" class="search-btn" type="button">Найти</button>
      </label>

      <nav class="tabs">
        <button class="tab active" data-tab="users">Все участники</button>
        <button class="tab" data-tab="rating">Таблицы рейтинга</button>
      </nav>
      <div class="category-row" id="categoryRow"></div>
    </header>

    <div class="warning" id="warning">
      <svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3L2.8 19h18.4L12 3z" stroke="currentColor" stroke-width="1.7"/><path d="M12 9v5.5M12 17.5h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
      <div><strong>Внимание.</strong> Чрезмерная активность оценки может привести к автоматическому бану.</div>
    </div>

    <section class="views">
      <div class="view active" id="view-users">
        <div id="usersList" class="list"></div>
        <div id="usersEmpty" class="empty" hidden>Пользователи не найдены</div>
      </div>
      <div class="view" id="view-rating">
        <div class="board-group">
          <div class="title">Красавчики</div>
          <div id="topList" class="hero-grid"></div>
          <div class="title">Хуесосы</div>
          <div id="bottomList" class="hero-grid"></div>
        </div>
      </div>
    </section>
  </main>

  <div class="sheet-backdrop" id="sheetBackdrop"></div>
  <section class="sheet" id="sheet">
    <div class="grabber"></div>
    <div class="sheet-head" id="sheetHead"></div>
    <div class="sheet-content">
      <div id="profileFocus" class="profile-focus"></div>
      <div id="commentsBlock" class="comments-block hidden">
        <div class="title">Комментарии</div>
        <div id="commentList" class="comment-list"></div>
        <div id="commentEmpty" class="empty" hidden>Комментариев пока нет</div>
      </div>
    </div>
    <form class="comment-form" id="commentForm">
      <textarea id="commentInput" class="input" maxlength="60" placeholder="Оставьте комментарий"></textarea>
      <div class="row">
        <button type="button" class="btn" id="closeSheetBtn">Закрыть</button>
        <button type="submit" class="btn primary" id="sendCommentBtn">Оставить комментарий</button>
      </div>
    </form>
  </section>

  <div class="confirm" id="confirmPopup">
    <div class="confirm-card">
      <div class="confirm-title">Подтверждение комментария</div>
      <div class="confirm-text" id="confirmText">Комментарий можно оставить только один раз для этого пользователя. Изменить его нельзя.</div>
      <div class="row">
        <button type="button" class="btn" id="confirmCancelBtn">Отмена</button>
        <button type="button" class="btn primary" id="confirmOkBtn">Продолжить</button>
      </div>
    </div>
  </div>

  <div class="confirm" id="infoPopup">
    <div class="confirm-card">
      <div class="confirm-title" id="infoTitle">Информация</div>
      <div class="confirm-text" id="infoText">Текст</div>
      <div class="row">
        <button type="button" class="btn primary" id="infoOkBtn">Понял</button>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = "https://nacur.onrender.com";
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    const HIDDEN_ADMIN_IDS = new Set(["920945194", "8050542983"]);

    const icons = {
      like: '<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M7.5 11H10v8H7.5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 7.5 11zM11 19v-7.2l2.8-4.7A1.7 1.7 0 0 1 17 8.5v2.4h2.5a1.6 1.6 0 0 1 1.57 1.92l-1.15 5.35A1.9 1.9 0 0 1 18.1 19H11z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      dislike: '<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M7.5 5H10v8H7.5A1.5 1.5 0 0 0 6 14.5v5A1.5 1.5 0 0 0 7.5 21H10M11 5v7.2l2.8 4.7A1.7 1.7 0 0 0 17 15.5v-2.4h2.5a1.6 1.6 0 0 0 1.57-1.92l-1.15-5.35A1.9 1.9 0 0 0 18.1 5H11z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      shield: '<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3.4l7 3v5.1c0 4.3-2.8 7.7-7 9.1-4.2-1.4-7-4.8-7-9.1V6.4l7-3z" stroke="currentColor" stroke-width="1.6"/></svg>'
    };

    const state = {
      me: null,
      users: [],
      usersFiltered: [],
      top: [],
      bottom: [],
      tab: "users",
      search: "",
      activeCategory: "reliability",
      categories: {
        reliability: "Надежность",
        response: "Скорость ответа",
        product: "Качество товара",
        communication: "Коммуникация"
      },
      selectedUser: null,
      profileTransparency: null,
      canComment: false,
      canEditComment: false,
      confirmPending: false,
      loading: false,
      isModerator: false
    };
    let searchFrame = 0;
    let steamTimer = 0;

    init();

    function init() {
      if (tg) {
        tg.ready();
        tg.expand();
        tg.disableVerticalSwipes();
        tg.setHeaderColor("#000000");
        tg.setBackgroundColor("#000000");
        tg.MainButton.hide();
      }
      state.me = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) ? tg.initDataUnsafe.user : { id: "local-user", username: "local_user", first_name: "Local" };
      state.isModerator = HIDDEN_ADMIN_IDS.has(String(state.me?.id || ""));
      bindUI();
      bootSplash();
      startSteamLoop();
      loadConfig();
      loadAll(true);
    }

    function bindUI() {
      document.querySelectorAll(".tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (state.tab === btn.dataset.tab) return;
          state.tab = btn.dataset.tab;
          hapticSelection();
          hapticNotify("success");
          document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === btn));
          document.getElementById("view-users").classList.toggle("active", state.tab === "users");
          document.getElementById("view-rating").classList.toggle("active", state.tab === "rating");
        });
      });

      document.getElementById("searchInput").addEventListener("input", (e) => {
        state.search = String(e.target.value || "").trim().toLowerCase();
        cancelAnimationFrame(searchFrame);
        searchFrame = requestAnimationFrame(() => {
          filterUsers();
          renderUsers();
        });
      });
      document.getElementById("searchBtn").addEventListener("click", applySearch);
      document.getElementById("searchInput").addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        applySearch();
      });

      document.getElementById("sheetBackdrop").addEventListener("click", closeSheet);
      document.getElementById("closeSheetBtn").addEventListener("click", closeSheet);
      document.getElementById("commentForm").addEventListener("submit", onCommentSubmit);
      document.getElementById("confirmCancelBtn").addEventListener("click", closeConfirm);
      document.getElementById("confirmOkBtn").addEventListener("click", proceedCommentSend);
      document.getElementById("infoOkBtn").addEventListener("click", closeInfoPopup);
      renderCategoryButtons();

      document.addEventListener("click", (event) => {
        const target = event.target.closest("[data-copy-user]");
        if (target) {
          const value = String(target.getAttribute("data-copy-user") || "").trim();
          if (!value) return;
          navigator.clipboard.writeText(value).then(() => setStatus(`Скопировано: @${value}`)).catch(() => null);
        }

        const openComments = event.target.closest("#openCommentsBtn");
        if (openComments) {
          const block = document.getElementById("commentsBlock");
          block.classList.remove("hidden");
          const scroller = document.querySelector(".sheet-content");
          scroller.scrollTo({ top: block.offsetTop - 8, behavior: "smooth" });
          hapticSelection();
        }

        const deleteCommentBtn = event.target.closest("[data-delete-comment-id]");
        if (deleteCommentBtn) {
          const commentId = String(deleteCommentBtn.getAttribute("data-delete-comment-id") || "");
          if (commentId) deleteCommentAsAdmin(commentId);
        }

        const clearVotesBtn = event.target.closest("#adminClearVotesBtn");
        if (clearVotesBtn && state.selectedUser) {
          deleteAllVotesForUserAsAdmin(String(state.selectedUser.telegram_id || ""));
        }
        const clearSingleVoteBtn = event.target.closest("#adminClearSingleVoteBtn");
        if (clearSingleVoteBtn && state.selectedUser) {
          deleteSingleVoteForUserAsAdmin(String(state.selectedUser.telegram_id || ""));
        }
      });
    }

    async function loadConfig() {
      try {
        const response = await fetch(`${API_BASE}/api/config`);
        const data = await response.json();
        if (!response.ok || !data) return;
        if (data.categories && typeof data.categories === "object") {
          state.categories = data.categories;
          if (!state.categories[state.activeCategory]) {
            state.activeCategory = Object.keys(state.categories)[0] || "reliability";
          }
          renderCategoryButtons();
        }
      } catch (_error) {}
    }

    function renderCategoryButtons() {
      const root = document.getElementById("categoryRow");
      if (!root) return;
      root.innerHTML = "";
      const fragment = document.createDocumentFragment();
      Object.entries(state.categories).forEach(([key, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `category-btn${state.activeCategory === key ? " active" : ""}`;
        button.textContent = label;
        button.addEventListener("click", () => {
          state.activeCategory = key;
          renderCategoryButtons();
          hapticSelection();
        hapticNotify("success");
        });
        fragment.appendChild(button);
      });
      root.appendChild(fragment);
    }

    function applySearch() {
      filterUsers();
      renderUsers();
      hapticSelection();
    }

    function bootSplash() {
      hapticImpact("light");
      setTimeout(() => hapticImpact("medium"), 100);
      setTimeout(() => {
        document.getElementById("splash").classList.add("hide");
        document.getElementById("app").setAttribute("aria-hidden", "false");
      }, 1100);
    }

    async function loadAll(withSync = false) {
      try {
        state.loading = true;
        renderLoadingSkeleton();
        setStatus("Синхронизация");
        if (withSync) {
          await fetch(`${API_BASE}/api/users/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              users: [{
                telegram_id: String(state.me.id),
                username: state.me.username || `user_${state.me.id}`,
                telegram_name: buildTelegramName(state.me),
                avatar: getTelegramAvatar(state.me)
              }]
            })
          }).catch(() => null);
          await fetch(`${API_BASE}/api/telegram/sync`, { method: "POST" }).catch(() => null);
        }
        const [usersRes, boardRes] = await Promise.all([
          fetch(`${API_BASE}/api/users?viewerTelegramId=${encodeURIComponent(String(state.me.id || ""))}`),
          fetch(`${API_BASE}/api/leaderboard`)
        ]);
        if (!usersRes.ok || !boardRes.ok) throw new Error("API не отвечает");

        const usersData = await usersRes.json();
        const boardData = await boardRes.json();

        state.users = Array.isArray(usersData.users) ? usersData.users : [];
        state.top = Array.isArray(boardData.top) ? boardData.top : [];
        state.bottom = Array.isArray(boardData.bottom) ? boardData.bottom : [];
        filterUsers();
        renderUsers();
        renderBoards();
        setStatus("Готово");
      } catch (error) {
        setStatus("Ошибка сети");
      } finally {
        state.loading = false;
      }
    }

    function renderLoadingSkeleton() {
      const usersRoot = document.getElementById("usersList");
      const topRoot = document.getElementById("topList");
      const bottomRoot = document.getElementById("bottomList");
      if (usersRoot) usersRoot.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
      if (topRoot) topRoot.innerHTML = `<div class="skeleton"></div>`;
      if (bottomRoot) bottomRoot.innerHTML = `<div class="skeleton"></div>`;
    }

    function filterUsers() {
      if (!state.search) {
        state.usersFiltered = [...state.users];
        return;
      }
      state.usersFiltered = state.users.filter((u) => {
        const username = String(u.username || "").toLowerCase();
        return username.includes(state.search);
      });
    }

    function renderUsers() {
      const root = document.getElementById("usersList");
      const empty = document.getElementById("usersEmpty");
      root.innerHTML = "";

      if (!state.usersFiltered.length) {
        empty.hidden = false;
        return;
      }
      empty.hidden = true;
      const fragment = document.createDocumentFragment();

      state.usersFiltered.forEach((user) => {
        const card = document.createElement("article");
        card.className = "card";
        card.classList.add("reveal");
        card.style.setProperty("--stagger", `${Math.min(260, fragment.childNodes.length * 24)}ms`);
        const badgesHtml = Array.isArray(user.badges) && user.badges.length
          ? `<div class="badges">${user.badges.slice(0, 2).map((badge) => `<span class="badge">${sanitize(badge)}</span>`).join("")}</div>`
          : "";
        card.innerHTML = `
          ${renderAvatar(user)}
          <div class="meta">
            <div class="name copy-user" data-copy-user="${sanitize(user.username || "user")}">@${sanitize(user.username || "user")}</div>
            <div class="tg-name">${sanitize(user.telegram_name || user.username || "")}</div>
            ${badgesHtml}
            <div class="stats">
              <span class="stat">${icons.like}<span>${Number(user.likes || 0)}</span></span>
              <span class="stat">${icons.dislike}<span>${Number(user.dislikes || 0)}</span></span>
            </div>
          </div>
          <div class="actions">
            <button class="vote-btn" data-vote="like" type="button">${icons.like}</button>
            <button class="vote-btn" data-vote="dislike" type="button">${icons.dislike}</button>
            <div class="score">${Number(user.score || 0)}</div>
          </div>
        `;

        const like = card.querySelector('[data-vote="like"]');
        const dislike = card.querySelector('[data-vote="dislike"]');
        const score = card.querySelector(".score");

        like.addEventListener("click", (event) => {
          event.stopPropagation();
          sendVote(user, "like", like, score);
        });
        dislike.addEventListener("click", (event) => {
          event.stopPropagation();
          sendVote(user, "dislike", dislike, score);
        });

        card.addEventListener("click", () => openProfileSheet(user, card));
        bindParallax(card);
        fragment.appendChild(card);
      });
      root.appendChild(fragment);
    }

    function renderBoards() {
      const topRoot = document.getElementById("topList");
      const bottomRoot = document.getElementById("bottomList");
      topRoot.innerHTML = "";
      bottomRoot.innerHTML = "";
      const topFragment = document.createDocumentFragment();
      const bottomFragment = document.createDocumentFragment();

      if (!state.top.length) {
        topRoot.innerHTML = '<div class="empty">Нет данных</div>';
      } else {
        state.top.forEach((user, i) => topFragment.appendChild(renderBoardItem(user, i + 1)));
        topRoot.appendChild(topFragment);
      }

      if (!state.bottom.length) {
        bottomRoot.innerHTML = '<div class="empty">Нет данных</div>';
      } else {
        state.bottom.forEach((user, i) => bottomFragment.appendChild(renderBoardItem(user, i + 1)));
        bottomRoot.appendChild(bottomFragment);
      }
    }

    function renderBoardItem(user, rank) {
      const el = document.createElement("article");
      el.className = "hero";
      el.innerHTML = `
        <div class="rank">${rank}</div>
        ${renderAvatar(user)}
        <div class="meta"><div class="name copy-user" data-copy-user="${sanitize(user.username || "user")}">@${sanitize(user.username || "user")}</div><div class="tg-name">${sanitize(user.telegram_name || "")}</div></div>
        <div class="score">${Number(user.score || 0)}</div>
      `;
      el.addEventListener("click", () => openProfileSheet(user, el));
      bindParallax(el);
      return el;
    }

    async function sendVote(user, type, btn, scoreEl) {
      if (!state.me || !state.me.id) return;
      if (String(state.me.id) === String(user.telegram_id)) {
        setStatus("Себя оценивать нельзя");
        hapticImpact("medium");
        return;
      }
      hapticImpact(type === "like" ? "light" : "medium");
      btn.classList.add("hit");
      if (type === "dislike") btn.classList.add("shake");
      scoreEl.classList.add("bump");
      setTimeout(() => {
        btn.classList.remove("hit");
        btn.classList.remove("shake");
        scoreEl.classList.remove("bump");
      }, 140);

      try {
        const categoryLabel = state.categories[state.activeCategory] || state.activeCategory;
        const payload = {
          voterTelegramId: String(state.me.id),
          voterUsername: state.me.username || `user_${state.me.id}`,
          voterTelegramName: buildTelegramName(state.me),
          voterAvatar: getTelegramAvatar(state.me),
          targetTelegramId: String(user.telegram_id),
          targetUsername: user.username,
          targetTelegramName: user.telegram_name,
          targetAvatar: user.avatar,
          type,
          category: state.activeCategory
        };
        const res = await fetch(`${API_BASE}/api/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          if (data.warning) showWarning();
          if (data.noticeCode === "same_vote") {
            showInfoPopup("Оценка уже установлена", `В категории "${categoryLabel}" у этого пользователя уже стоит такая оценка.`);
          } else {
            setStatus(data.message || "Голос не принят");
          }
          return;
        }
        if (data.noticeCode === "first_vote") {
          showInfoPopup("Важно по оценкам", "Вы впервые поставили оценку. Изменить решение можно только один раз.");
        }
        if (data.noticeCode === "final_change") {
          showInfoPopup("Решение окончательное", "Вы изменили оценку. Теперь это решение окончательное.");
        }
        if (data.warning) showWarning();
        hapticNotify("success");
        await loadAll(false);
      } catch (_error) {
        setStatus("Ошибка сети");
        hapticNotify("error");
      }
    }

    async function openProfileSheet(user, sourceCard) {
      state.selectedUser = user;
      hapticSelection();
      document.getElementById("sheetHead").innerHTML = `
        <div class="title">Профиль участника</div>
      `;
      document.getElementById("profileFocus").innerHTML = renderProfileFocus(user);
      document.getElementById("commentInput").value = "";
      document.getElementById("commentList").innerHTML = "";
      document.getElementById("commentEmpty").hidden = true;
      document.getElementById("commentsBlock").classList.add("hidden");
      const content = document.querySelector(".sheet-content");
      content.scrollTop = 0;

      document.getElementById("sheetBackdrop").classList.add("open");
      document.getElementById("sheet").classList.add("open");
      document.body.classList.add("sheet-open");
      animateAvatarMorph(sourceCard);
      hapticNotify("success");

      await loadProfileComments(user);
    }

    function closeSheet() {
      document.getElementById("sheetBackdrop").classList.remove("open");
      document.getElementById("sheet").classList.remove("open");
      document.body.classList.remove("sheet-open");
      state.selectedUser = null;
      state.profileTransparency = null;
      state.canComment = false;
      state.canEditComment = false;
    }

    async function loadProfileComments(user) {
      if (!state.me || !state.me.id) return;
      try {
        const url = `${API_BASE}/api/user-profile?telegramId=${encodeURIComponent(String(user.telegram_id))}&viewerTelegramId=${encodeURIComponent(String(state.me.id))}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error("profile fail");

        const comments = Array.isArray(data.comments) ? data.comments : [];
        state.canComment = Boolean(data.canComment);
        state.canEditComment = Boolean(data.canEdit);
        state.profileTransparency = data.transparency || null;
        document.getElementById("profileFocus").innerHTML = renderProfileFocus(user);
        if (data.ownComment) {
          document.getElementById("commentInput").value = String(data.ownComment.text || "");
        }
        renderComments(comments);
        updateCommentFormAccess();
      } catch (_error) {
        renderComments([]);
        state.canComment = false;
        state.canEditComment = false;
        state.profileTransparency = null;
        updateCommentFormAccess();
      }
    }

    function renderComments(comments) {
      const list = document.getElementById("commentList");
      const empty = document.getElementById("commentEmpty");
      list.innerHTML = "";
      if (!comments.length) {
        empty.hidden = false;
        return;
      }
      empty.hidden = true;
      comments.forEach((item) => {
        const el = document.createElement("article");
        el.className = "comment";
        const adminDelete = state.isModerator
          ? `<button class="comment-delete" type="button" data-delete-comment-id="${sanitize(item.id || "")}">Удалить</button>`
          : "";
        el.innerHTML = `
          <div class="comment-top">
            <div class="comment-author">@${sanitize(item.authorUsername || "user")} · ${formatDate(item.createdAt)}</div>
            ${adminDelete}
          </div>
          <div class="comment-text">${sanitize(item.text || "")}</div>
        `;
        list.appendChild(el);
      });
    }

    function updateCommentFormAccess() {
      const input = document.getElementById("commentInput");
      const btn = document.getElementById("sendCommentBtn");
      if (state.canComment) {
        input.disabled = false;
        btn.disabled = false;
        btn.textContent = state.canEditComment ? "Сохранить изменение" : "Оставить комментарий";
        input.placeholder = state.canEditComment ? "Измените комментарий (последний раз)" : "Оставьте комментарий";
      } else {
        input.disabled = true;
        btn.disabled = true;
        btn.textContent = "Лимит комментария исчерпан";
      }
    }

    async function onCommentSubmit(event) {
      event.preventDefault();
      if (!state.selectedUser || !state.canComment) return;
      const text = String(document.getElementById("commentInput").value || "").trim();
      if (!text) {
        setStatus("Введите текст комментария");
        return;
      }
      state.confirmPending = true;
      document.getElementById("confirmText").textContent = state.canEditComment
        ? "Это последняя возможность изменить комментарий. После сохранения изменить его нельзя."
        : "Комментарий можно оставить один раз и потом изменить только один раз.";
      document.getElementById("confirmPopup").classList.add("open");
      hapticImpact("light");
    }

    function closeConfirm() {
      state.confirmPending = false;
      document.getElementById("confirmPopup").classList.remove("open");
    }

    async function proceedCommentSend() {
      if (!state.confirmPending || !state.selectedUser || !state.canComment) {
        closeConfirm();
        return;
      }
      closeConfirm();
      const text = String(document.getElementById("commentInput").value || "").trim();
      if (!text) return;

      try {
        const payload = {
          authorTelegramId: String(state.me.id),
          authorUsername: state.me.username || `user_${state.me.id}`,
          authorTelegramName: buildTelegramName(state.me),
          authorAvatar: getTelegramAvatar(state.me),
          targetTelegramId: String(state.selectedUser.telegram_id),
          targetUsername: state.selectedUser.username,
          targetTelegramName: state.selectedUser.telegram_name,
          targetAvatar: state.selectedUser.avatar,
          text
        };
        const res = await fetch(`${API_BASE}/api/comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          if (data.warning) showWarning();
          setStatus(data.message || "Комментарий не отправлен");
          return;
        }
        hapticImpact("medium");
        hapticNotify("success");
        if (data.warning) showWarning();
        state.canComment = !Boolean(data.edited);
        state.canEditComment = false;
        renderComments(Array.isArray(data.comments) ? data.comments : []);
        updateCommentFormAccess();
        document.getElementById("commentInput").value = "";
      } catch (_error) {
        setStatus("Ошибка сети");
      }
    }

    function showWarning() {
      document.getElementById("warning").classList.add("show");
      if (tg && tg.MainButton) {
        tg.MainButton.setText("Понял");
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
          document.getElementById("warning").classList.remove("show");
          tg.MainButton.hide();
        });
      }
      hapticImpact("medium");
      hapticNotify("warning");
    }

    function hapticImpact(style) {
      if (!tg || !tg.HapticFeedback) return;
      try { tg.HapticFeedback.impactOccurred(style || "light"); } catch (_error) {}
    }

    function hapticSelection() {
      if (!tg || !tg.HapticFeedback) return;
      try { tg.HapticFeedback.selectionChanged(); } catch (_error) {}
    }

    function hapticNotify(type) {
      if (!tg || !tg.HapticFeedback || !tg.HapticFeedback.notificationOccurred) return;
      try { tg.HapticFeedback.notificationOccurred(type || "success"); } catch (_error) {}
    }

    function renderAvatar(user) {
      if (user.avatar) {
        return `<div class="avatar"><img src="${sanitize(user.avatar)}" alt=""></div>`;
      }
      const initials = String(user.username || "U").replace("@", "").slice(0, 2).toUpperCase() || "U";
      return `<div class="avatar">${sanitize(initials)}</div>`;
    }

    function renderProfileFocus(user) {
      const avatar = user.avatar
        ? `<div class="focus-avatar"><img src="${sanitize(user.avatar)}" alt=""></div>`
        : `<div class="focus-avatar">${sanitize((String(user.username || "U").replace("@", "").slice(0, 2) || "U").toUpperCase())}</div>`;
      const reputation = user.reputation || {};
      const categoryHtml = Object.entries(state.categories).slice(0, 4).map(([key, label]) => {
        const entry = reputation[key] || { weighted_score: 0 };
        return `<div class="focus-stat"><div class="focus-label">${sanitize(label)}</div><div class="focus-value">${Number(entry.weighted_score || 0).toFixed(1)}</div></div>`;
      }).join("");
      const transparency = state.profileTransparency
        ? `
          <div class="transparency">
            <div class="transparency-line">${sanitize(state.profileTransparency.oneChangeRule || "")}</div>
            <div class="transparency-line">${sanitize(state.profileTransparency.qualityRule || "")}</div>
            <div class="transparency-line">Текущий вес ваших оценок: x${Number(state.profileTransparency.qualityPreview || 1).toFixed(2)}</div>
          </div>
        `
        : "";
      const moderation = state.isModerator
        ? `
          <div class="focus-actions">
            <button class="focus-btn secondary" id="adminClearSingleVoteBtn" type="button">Удалить 1 оценку (категория)</button>
            <button class="focus-btn" id="adminClearVotesBtn" type="button">Удалить все оценки пользователя</button>
          </div>
        `
        : "";
      const badges = Array.isArray(user.badges) && user.badges.length
        ? `<div class="badges">${user.badges.slice(0, 3).map((badge) => `<span class="badge">${sanitize(badge)}</span>`).join("")}</div>`
        : "";
      return `
        <div class="focus-top">
          ${avatar}
          <div class="meta">
            <div class="name copy-user" data-copy-user="${sanitize(user.username || "user")}">@${sanitize(user.username || "user")}</div>
            <div class="tg-name">${sanitize(user.telegram_name || user.username || "")}</div>
            ${badges}
          </div>
        </div>
        <div class="focus-stats">
          <div class="focus-stat"><div class="focus-label">Лайки</div><div class="focus-value">${Number(user.likes || 0)}</div></div>
          <div class="focus-stat"><div class="focus-label">Дизлайки</div><div class="focus-value">${Number(user.dislikes || 0)}</div></div>
          ${categoryHtml}
        </div>
        ${transparency}
        ${moderation}
        <div class="focus-actions">
          <button class="focus-btn" id="openCommentsBtn" type="button">Посмотреть комментарии</button>
        </div>
      `;
    }

    function showInfoPopup(title, text) {
      document.getElementById("infoTitle").textContent = title;
      document.getElementById("infoText").textContent = text;
      document.getElementById("infoPopup").classList.add("open");
      hapticImpact("medium");
    }

    function closeInfoPopup() {
      document.getElementById("infoPopup").classList.remove("open");
    }

    async function deleteCommentAsAdmin(commentId) {
      if (!state.isModerator || !state.selectedUser) return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/delete-comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requesterTelegramId: String(state.me.id),
            commentId
          })
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          showInfoPopup("Ошибка модерации", data.message || "Не удалось удалить комментарий");
          return;
        }
        hapticNotify("success");
        await loadProfileComments(state.selectedUser);
      } catch (_error) {
        showInfoPopup("Ошибка сети", "Не удалось удалить комментарий");
      }
    }

    async function deleteAllVotesForUserAsAdmin(targetTelegramId) {
      if (!state.isModerator || !targetTelegramId) return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/delete-user-votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requesterTelegramId: String(state.me.id),
            targetTelegramId: String(targetTelegramId)
          })
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          showInfoPopup("Ошибка модерации", data.message || "Не удалось удалить оценки");
          return;
        }
        hapticNotify("success");
        showInfoPopup("Готово", `Удалено оценок: ${Number(data.removedCount || 0)}`);
        await loadAll(false);
        if (state.selectedUser) {
          const refreshed = state.users.find((item) => String(item.telegram_id) === String(targetTelegramId)) || state.selectedUser;
          state.selectedUser = refreshed;
          await loadProfileComments(refreshed);
          document.getElementById("profileFocus").innerHTML = renderProfileFocus(refreshed);
        }
      } catch (_error) {
        showInfoPopup("Ошибка сети", "Не удалось удалить оценки");
      }
    }

    async function deleteSingleVoteForUserAsAdmin(targetTelegramId) {
      if (!state.isModerator || !targetTelegramId) return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/delete-vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requesterTelegramId: String(state.me.id),
            targetTelegramId: String(targetTelegramId),
            category: state.activeCategory
          })
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          showInfoPopup("Ошибка модерации", data.message || "Не удалось удалить оценку");
          return;
        }
        hapticNotify("success");
        showInfoPopup("Готово", "Одиночная оценка удалена.");
        await loadAll(false);
        if (state.selectedUser) {
          const refreshed = state.users.find((item) => String(item.telegram_id) === String(targetTelegramId)) || state.selectedUser;
          state.selectedUser = refreshed;
          await loadProfileComments(refreshed);
          document.getElementById("profileFocus").innerHTML = renderProfileFocus(refreshed);
        }
      } catch (_error) {
        showInfoPopup("Ошибка сети", "Не удалось удалить оценку");
      }
    }

    function startSteamLoop() {
      const layer = document.getElementById("steamLayer");
      if (!layer) return;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const spawn = () => {
        const puff = document.createElement("span");
        puff.className = `steam-puff${Math.random() > 0.58 ? " hot" : ""}`;
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight - (Math.random() * 120 + 20);
        const driftX = (Math.random() - 0.5) * 140;
        const size = 62 + Math.random() * 116;
        puff.style.left = `${startX}px`;
        puff.style.top = `${startY}px`;
        puff.style.width = `${size}px`;
        puff.style.height = `${size}px`;
        puff.style.setProperty("--steam-x", `${driftX}px`);
        layer.appendChild(puff);
        puff.addEventListener("animationend", () => puff.remove());
      };

      const loop = () => {
        if (document.visibilityState !== "visible") {
          steamTimer = window.setTimeout(loop, 2000);
          return;
        }
        if (layer.childElementCount > 16) {
          steamTimer = window.setTimeout(loop, 900);
          return;
        }
        const batch = Math.random() > 0.46 ? 2 : 1;
        for (let i = 0; i < batch; i += 1) spawn();
        const next = 520 + Math.random() * 1200;
        steamTimer = window.setTimeout(loop, next);
      };
      loop();
    }

    function bindParallax(node) {
      if (!node) return;
      node.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        node.style.transform = `perspective(600px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
      });
      node.addEventListener("pointerleave", () => {
        node.style.transform = "";
      });
    }

    function animateAvatarMorph(sourceCard) {
      const from = sourceCard?.querySelector(".avatar");
      const to = document.querySelector("#profileFocus .focus-avatar");
      if (!from || !to) return;
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();
      const clone = from.cloneNode(true);
      clone.style.position = "fixed";
      clone.style.left = `${fromRect.left}px`;
      clone.style.top = `${fromRect.top}px`;
      clone.style.width = `${fromRect.width}px`;
      clone.style.height = `${fromRect.height}px`;
      clone.style.margin = "0";
      clone.style.zIndex = "90";
      clone.style.pointerEvents = "none";
      clone.style.willChange = "transform, opacity";
      document.body.appendChild(clone);

      const deltaX = toRect.left - fromRect.left;
      const deltaY = toRect.top - fromRect.top;
      const scale = toRect.width / fromRect.width;
      clone.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scale})`, opacity: 0.9 }
        ],
        { duration: 260, easing: "cubic-bezier(0.22,1,0.36,1)" }
      ).onfinish = () => clone.remove();
    }

    function setStatus(text) {
      document.getElementById("status").innerHTML = `${icons.shield}<span>${sanitize(text)}</span>`;
    }

    function sanitize(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function formatDate(ts) {
      const date = new Date(Number(ts || Date.now()));
      return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    }

    function buildTelegramName(user) {
      const first = String(user.first_name || "").trim();
      const last = String(user.last_name || "").trim();
      const full = `${first} ${last}`.trim();
      return full || String(user.username || "");
    }

    function getTelegramAvatar(user) {
      return String(user.photo_url || user.photoUrl || "").trim();
    }
  </script>
</body>
</html>


// File: main.js
// 起動・シーン遷移・ゲーム進行（async）
// 仕様の工程：競り→同盟者指定→皇帝交換→トリック×10→勝敗→特殊勝利→リザルト/トロフィー

import {
  makeDeck, shuffle, deal, sortHand,
  compareBid, bidToText, cardText, cardSuitClass,
  legalPlays, resolveLeadSuit, evaluateTrickWinner,
  extractPointCards, isPointCard, checkSpecialVictoryForPlayer,
  specialNeedRank, stealNeededCardFromWinner,
  SUIT_LABEL, SUIT_POWER
} from "./core.js";

import {
  createUI, showScene, setTopFrames, setIndicators, clearLog, logLine,
  renderTrick, renderHand, setPhase,
  promptHumanBid, promptHumanAllySpec, promptHumanDiscard4,
  promptHumanPlay, attachHumanPlayPick,
  renderScores, renderResult,
  showCutin, hideCutin, showPopup,
  helpText, creditsText, openHelp, 
  makeDialogue, renderTrophies, updateTrophy, roleText
} from "./ui.js";

import {
  cpuThinkDelay, cpuChooseBid, cpuChooseAllyCardNotInHand,
  cpuChooseDiscardAfterWidow, cpuDecideAimSpecial,
  cpuChoosePlay
} from "./ai.js";

// ====== グローバルUI/状態 ======
const ui = createUI();
const DIALOG = (() => {
  const d = makeDialogue();

  // 互換：ui.js 側が getAllyChoose という名前で実装されている場合に合わせる
  if (typeof d.getAllyPick !== "function" && typeof d.getAllyChoose === "function") {
    d.getAllyPick = d.getAllyChoose;
  }

  return d;
})();

const CHARS = ["マリア", "ジャンヌ", "ヴィクトリア", "ルイーゼ", "カチューシャ"];
const EMPEROR_CANDIDACY_ORDER = [0, 1, 2, 3, 4]; // 皇帝宣言時のみこの順

let HUMAN_PID = 0;

const players = CHARS.map((name, i) => ({
  pid: i,
  name,
  isHuman: i === HUMAN_PID,
}));

function setHumanPid(pid) {
  HUMAN_PID = pid;
  for (let i = 0; i < players.length; i++) {
    players[i].isHuman = (i === HUMAN_PID);
  }
}

function getHumanPid() { return HUMAN_PID; }

// 画面スケーリング：#stage をウィンドウに収める
function applyScale() {
  const stage = document.querySelector("#stage");
  const baseW = 1280;
  const baseH = 720;

  const pad = 20;
  const w = window.innerWidth - pad * 2;
  const h = window.innerHeight - pad * 2;

  const s = Math.min(w / baseW, h / baseH);
  const clamped = Math.max(0.4, Math.min(1.2, s));

  stage.style.transformOrigin = "center center";
  stage.style.transform = `translate(-50%, -50%) scale(${clamped})`;
}

window.addEventListener("resize", applyScale);
applyScale();

// ====== ボタン紐付け ======
function iconUrlOf(name) {
  const ICON_FILE = {
    "マリア": "austria",
    "ジャンヌ": "france",
    "ヴィクトリア": "britain",
    "ルイーゼ": "preussen",
    "カチューシャ": "russia",
    "イザベル": "spain",
  };
  const f = ICON_FILE[name];
  return f ? `./assets/${f}.png` : "";
}

function promptCharacterSelect() {
  showScene("scene-select");

  const grid = document.querySelector("#selectGrid");
  const btnBack = document.querySelector("#btnSelectBack");
  if (!grid || !btnBack) {
    console.warn("[promptCharacterSelect] elements missing");
    showScene("scene-title");
    return Promise.resolve(0);
  }

  grid.innerHTML = "";

  return new Promise((resolve) => {
    const cleanup = () => {
      btnBack.removeEventListener("click", onBack);
      for (const { el, fn } of cardHandlers) el.removeEventListener("click", fn);
    };

    const onBack = () => {
      cleanup();
      showScene("scene-title");
      resolve(null);
    };
    btnBack.addEventListener("click", onBack);

    const cardHandlers = [];

    for (let pid = 0; pid < CHARS.length; pid++) {
      const name = CHARS[pid];
      const card = document.createElement("div");
      card.className = "select-card";
      card.innerHTML = `
        <div class="icon"><img src="${iconUrlOf(name)}" alt="${name}"></div>
        <div class="name">${name}</div>
        <div class="hint">${pid === 0 ? "皇帝競りは先手" : ""}</div>
      `.trim();

      const onPick = () => {
        cleanup();
        resolve(pid);
      };

      card.addEventListener("click", onPick);
      cardHandlers.push({ el: card, fn: onPick });
      grid.appendChild(card);
    }
  });
}

function bindTitleButtons() {
  const qs = (s) => document.querySelector(s);

  const resetUiToTitle = () => {
    // 上部キャラ枠（役/得点札）を消す
    ui.charFrames.innerHTML = "";

    // 進行表示・ログ・手札・トリックを初期状態へ
    setPhase(ui, "準備中", "");
    clearLog(ui);
    renderTrick(ui, players, []);
    renderHand(ui, [], { disabled: true, onPick: null });

    // インジケータ初期化
    setIndicators(ui, { trumpSuit: null, leadSuit: null, allySpec: null, allyKnown: false });

    // リザルト表示を初期化
    if (ui.resultSummary) ui.resultSummary.textContent = "";
    if (ui.resultImperialCards) ui.resultImperialCards.innerHTML = "";
    if (ui.resultCoalitionCards) ui.resultCoalitionCards.innerHTML = "";

    // オーバーレイ類を閉じる
    hideCutin(ui);
    ui.popup?.classList?.add("hidden");
  };

  qs("#btnStart")?.addEventListener("click", async () => {
    const pid = await promptCharacterSelect();
    if (pid == null) return;
    setHumanPid(pid);
    startNewGame();
  });

  qs("#btnHelp")?.addEventListener("click", () => {
    openHelp(ui);
  });

  qs("#btnTrophy")?.addEventListener("click", () => {
    renderTrophies(ui, CHARS);
    showScene("scene-trophy");
  });

  qs("#btnCredits")?.addEventListener("click", () => {
    showPopup(ui, { title: "クレジット", body: creditsText() });
  });

  for (const b of document.querySelectorAll(".btnBackTitle")) {
    b.addEventListener("click", () => {
      resetUiToTitle();
      showScene("scene-title");
    });
  }

  qs("#btnPlayAgain")?.addEventListener("click", async () => {
    const pid = await promptCharacterSelect();
    if (pid == null) return;
    setHumanPid(pid);
    startNewGame();
  });

  // 初期表示
  resetUiToTitle();
  showScene("scene-title");
}

bindTitleButtons();

// ====== ゲーム本体 ======
function suitHtml(s) {
  const cls = s === "H" ? "red" : s === "D" ? "red" : "";
  const label = SUIT_LABEL[s];
  return `<span class="${cls}">${label}</span>`;
}

function safeCardHtml(card) {
  if (!card) return `<span class="card-missing">-</span>`;
  return `<span class="${cardSuitClass(card)}">${cardText(card)}</span>`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ラウンド状態
let G = null;

function resetState() {
  G = {
    redealCount: 0,

    deck: [],
    hands: Array.from({ length: 5 }, () => []),
    widow: [],
    captured: Array.from({ length: 5 }, () => ({ trick: [], point: [] })), // 個人獲得（トリック全体/得点札）
    faction: {
      imperial: { trick: [], point: [] },   // 皇帝側合算（表示用）
      coalition: { trick: [], point: [] },
    },
    bid: {
      current: null,
      emperorPid: null,
      trumpSuit: null,
      passesInRow: 0,
      hadAnyBid: false,
    },
    ally: {
      spec: null,       // {suit, rank}
      pid: null,        // 判明後に入る
      known: false,
    },
    emperorExchange: {
      discards: [],
    },
    trick: {
      leaderPid: null,
      leadSuit: null,
      plays: [], // {pid, card, resolvedSuit}
      trickIndex: 0,
    },
    aimSpecial: Array.from({ length: 5 }, () => false),
    logErrors: [],
  };
}

function updateTopFrames() {
  const rolesTextByPid = roleText(players, {
    emperorPid: G.bid.emperorPid,
    allyPid: G.ally.pid,
    allyKnown: G.ally.known,
  });

  const pointsByPid = G.captured.map(x => x.point);

  setTopFrames(ui, players, {
    emperorPid: G.bid.emperorPid,
    allyPid: G.ally.pid,
    allyKnown: G.ally.known,
    rolesTextByPid,
    pointsByPid,
  });
}

function updateIndicators() {
  setIndicators(ui, {
    trumpSuit: G.bid.trumpSuit,
    leadSuit: G.trick.leadSuit,
    allySpec: G.ally.spec,
    allyKnown: G.ally.known,
  });
}

function rebuildFactionPoints() {
  const emperor = G.bid.emperorPid;
  const ally = G.ally.pid;
  const imp = [];
  const coa = [];
  for (let pid = 0; pid < 5; pid++) {
    const pts = G.captured[pid].point;
    if (pid === emperor || (ally != null && pid === ally)) imp.push(...pts);
    else coa.push(...pts);
  }
  G.faction.imperial.point = imp;
  G.faction.coalition.point = coa;
}

function log(text) {
  logLine(ui, text);
}
function err(text) {
  logLine(ui, text, { isError: true });
}

function setPhaseText(title, body) {
  setPhase(ui, title, body);
}

function handHasId(pid, id) {
  return G.hands[pid].some(c => c.id === id);
}

function removeCardFromHand(pid, cardId) {
  const hand = G.hands[pid];
  const idx = hand.findIndex(c => c.id === cardId);
  if (idx < 0) return null;
  const [c] = hand.splice(idx, 1);
  return c;
}

function addCapturedTrickTo(pid, cards) {
  G.captured[pid].trick.push(...cards);
  const pts = extractPointCards(cards);
  G.captured[pid].point.push(...pts);
}

function redrawHandHuman(disabled = false) {
  const pid = getHumanPid();
  const h = sortHand(G.hands[pid], G.bid.trumpSuit);
  G.hands[pid] = h;
  renderHand(ui, h, {
    disabled,
    onPick: (card) => attachHumanPlayPick(ui, card),
  });
}

// --- ゲーム開始 ---
// --- ゲーム開始 ---
async function startNewGame() {
  // 先に状態を必ず初期化（これが一番安全）
  resetState();

  // 画面遷移と初期UI
  showScene(ui.scenes.game);
  clearLog(ui);

  // 「遊んだ」トロフィーは選んだキャラ（人間pid）で付与
  updateTrophy({ characterName: players[getHumanPid()].name, bronze: true });

  // 初期配り（全員パスなら配り直しを繰り返す）
  while (true) {
    await setupDeal();
    const ok = await phaseBidding();
    if (ok) break;
  }

  await phaseAllyDesignation();
  await phaseEmperorExchange();
  await phaseDecideSpecialAims();

  // phaseTricks が見つからない環境でも進行できるようにフォールバック
  const runTricks =
    (typeof phaseTricks === "function")
      ? phaseTricks
      : async function () {
          logLine(ui, "警告：phaseTricks が見つからないため、フォールバックで進行します。");

          setPhaseText("ゲーム開始", "皇帝からトリック開始。");
          await sleep(350);

          G.trick.leaderPid = G.bid.emperorPid;

          for (let t = 0; t < 10; t++) {
            G.trick.trickIndex = t + 1;
            await playOneTrick();
          }
        };

  await phaseTricks();
  await phaseResult();

}

// --- 配り ---
async function setupDeal() {
  setPhaseText("配り", "カードを配っています…");
  updateTopFrames();
  updateIndicators();

  const deck = shuffle(makeDeck());
  const { hands, widow } = deal(deck);

  G.deck = deck;
  G.hands = hands.map(h => sortHand(h, null));
  G.widow = widow;

  G.captured = Array.from({ length: 5 }, () => ({ trick: [], point: [] }));
  G.faction.imperial = { trick: [], point: [] };
  G.faction.coalition = { trick: [], point: [] };

  G.bid.current = null;
  G.bid.emperorPid = null;
  G.bid.trumpSuit = null;
  G.bid.passesInRow = 0;
  G.bid.hadAnyBid = false;

  G.ally.spec = null;
  G.ally.pid = null;
  G.ally.known = false;

  G.trick.leaderPid = null;
  G.trick.leadSuit = null;
  G.trick.plays = [];
  G.trick.trickIndex = 0;

  redrawHandHuman(false);
  renderTrick(ui, players, []);
  renderScores(ui, [], []);
  log("配り直し／配り完了。");
  await sleep(400);
}

// --- 競り ---
async function phaseBidding() {
  setPhaseText("皇帝競り", "最低13から入札。全員パスなら配り直し。");

  const MIN_BID = 13;
  const declText = (bid) => `${SUIT_LABEL[bid.suit]}${bid.count}`;

  let turnIndex = 0;
  let passesThisRound = 0;

  G.bid.current = null;
  G.bid.hadAnyBid = false;

  let lastBidPid = null;

  while (true) {
    updateTopFrames();
    updateIndicators();
    redrawHandHuman(false);

    const pid = EMPEROR_CANDIDACY_ORDER[turnIndex % 5];
    const p = players[pid];

    const currentText = bidToText(G.bid.current);

    const humanPid = getHumanPid();

    if (pid === humanPid) {
      setPhaseText("皇帝競り（あなた）", `現在の最高入札：${currentText}\n入札するかパスしてください。`);
      const bid = await promptHumanBid(ui, { currentBidText: currentText, minCount: MIN_BID });

      if (!bid) {
        log(`あなた：パス`);
        passesThisRound++;
        if (!G.bid.hadAnyBid && passesThisRound >= 5) {
          G.redealCount++;
          const say = DIALOG.getRedealAllPass(G.redealCount);
          showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
          log("全員パス：配り直し。");
          return false;
        }
      } else {
        const suitOk = bid && typeof bid.suit === "string" && ["C", "D", "H", "S"].includes(bid.suit);
        const countOk = bid && Number.isFinite(bid.count) && bid.count >= MIN_BID && bid.count <= 20;

        if (!suitOk || !countOk || compareBid(bid, G.bid.current) <= 0) {
          err("入札が無効です（最低13未満/スート不正/現在以下）。パス扱いにします。");
          log(`あなた：パス（無効入札）`);
          passesThisRound++;
          if (!G.bid.hadAnyBid && passesThisRound >= 5) {
            G.redealCount++;
            const say = DIALOG.getRedealAllPass(G.redealCount);
            showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
            log("全員パス：配り直し。");
            return false;
          }
        } else {
          G.bid.current = bid;
          G.bid.hadAnyBid = true;
          passesThisRound = 0;
          lastBidPid = humanPid;

          log(`あなた：入札 ${bidToText(bid)}`);

          const say = DIALOG.getEmperorDeclare(players[humanPid].name, declText(bid));
          showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
        }
      }
    } else {
      setPhaseText(`皇帝競り（${p.name}）`, `現在の最高入札：${currentText}\nCPUが考えています…`);
      await cpuThinkDelay(520);

      const bid = cpuChooseBid(G.hands[pid], G.bid.current, { minCount: MIN_BID });

      if (!bid) {
        passesThisRound++;
        log(`${p.name}：パス`);
        if (!G.bid.hadAnyBid && passesThisRound >= 5) {
          G.redealCount++;
          const say = DIALOG.getRedealAllPass(G.redealCount);
          showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
          log("全員パス：配り直し。");
          return false;
        }
      } else {
        G.bid.current = bid;
        G.bid.hadAnyBid = true;
        passesThisRound = 0;
        lastBidPid = pid;

        log(`${p.name}：入札 ${bidToText(bid)}`);

        const say = DIALOG.getEmperorDeclare(p.name, declText(bid));
        showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
      }
    }

    // 周回
    turnIndex++;
    if (turnIndex > 200) {
      err("競りが異常に長いので強制終了");
      break;
    }

    // “誰かが入札した後に4人連続パス” で終了
    if (G.bid.hadAnyBid && passesThisRound >= 4) break;
  }

  if (lastBidPid == null) {
    err("皇帝特定に失敗：配り直しします");
    return false;
  }

  G.bid.emperorPid = lastBidPid;
  G.bid.trumpSuit = G.bid.current.suit;

  log(`皇帝確定：${players[lastBidPid].name}（${bidToText(G.bid.current)}）`);

  const sayFixed = DIALOG.getEmperorFixed(players[lastBidPid].name);
  showCutin(ui, { title: sayFixed.title, text: sayFixed.text, iconName: sayFixed.by });

  return true;
}

// --- 同盟者指定 ---
async function phaseAllyDesignation() {
  setPhaseText("同盟者指定", "皇帝が同盟者指定カードを決めます。");

  const specText = (spec) => {
    if (!spec) return "-";
    if (spec.isJoker) {
      return (spec.jokerColor === "R") ? "赤JOKER" : "黒JOKER";
    }
    const r = spec.rank === 11 ? "J"
      : spec.rank === 12 ? "Q"
      : spec.rank === 13 ? "K"
      : spec.rank === 14 ? "A"
      : String(spec.rank);
    return `${SUIT_LABEL[spec.suit]}${r}`;
  };

  const emperor = G.bid.emperorPid;
  const emperorName = players[emperor].name;

  if (emperor === getHumanPid()) {
    redrawHandHuman(false);
    const spec = await promptHumanAllySpec(ui, { hand: G.hands[getHumanPid()] });
    G.ally.spec = spec;
    log(`皇帝（あなた）：同盟者指定カードを決定`);
  } else {
    setPhaseText(`同盟者指定（${emperorName}）`, "CPUが同盟者指定カードを選んでいます…");
    await cpuThinkDelay(620);
    G.ally.spec = cpuChooseAllyCardNotInHand(G.hands[emperor], G.bid.trumpSuit);
    log(`皇帝（${emperorName}）：同盟者指定カードを決定`);
  }

  updateIndicators();

  // ui.js 側の名前揺れ対策（getAllyPick / getAllyChoose）
  const fn = (typeof DIALOG.getAllyPick === "function")
    ? DIALOG.getAllyPick
    : DIALOG.getAllyChoose;

  const say = fn.call(DIALOG, emperorName, specText(G.ally.spec));
  await showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
}

// --- 皇帝交換（余り札4枚を受け取り、4枚捨て） ---
async function phaseEmperorExchange() {
  setPhaseText("皇帝交換", "皇帝が余り札4枚を取り、4枚捨てます。");

  const emperor = G.bid.emperorPid;
  const eName = players[emperor].name;

  // 余り札を皇帝へ
  for (const c of G.widow) G.hands[emperor].push(c);
  G.emperorExchange.taken = [...G.widow];
  G.widow = [];

  // ソート
  G.hands[emperor] = sortHand(G.hands[emperor], G.bid.trumpSuit);

  if (emperor === getHumanPid()) {
    redrawHandHuman(false);

    // 人間：選択UI
    const discards = await promptHumanDiscard4(ui, G.hands[getHumanPid()]);
    for (const d of discards) removeCardFromHand(getHumanPid(), d.id);
    G.emperorExchange.discards = discards;
    log(`あなた：捨て札を4枚決定。`);
    redrawHandHuman(false);
  } else {
    setPhaseText(`皇帝交換（${eName}）`, "CPUが捨て札を選んでいます…");
    await cpuThinkDelay(720);
    const discards = cpuChooseDiscardAfterWidow(G.hands[emperor], G.bid.trumpSuit);
    for (const d of discards) removeCardFromHand(emperor, d.id);
    G.emperorExchange.discards = discards;
    log(`${eName}：捨て札を4枚決定。`);
  }

  // 念のため全員10枚になっているか
  for (let pid = 0; pid < 5; pid++) {
    if (G.hands[pid].length !== 10) {
      err(`手札枚数異常：${players[pid].name}が${G.hands[pid].length}枚`);
    }
  }

  await sleep(450);
}

// --- 特殊勝利狙いの確定（CPU） ---
async function phaseDecideSpecialAims() {
  setPhaseText("方針決定", "各CPUが特殊勝利を狙うか判断します。");
  await sleep(200);

  for (let pid = 0; pid < 5; pid++) {
    if (pid === getHumanPid()) continue;

    const name = players[pid].name;
    let aim = cpuDecideAimSpecial(name, G.hands[pid], G.bid.trumpSuit);

    // ジャンヌ：追加条件「自分が皇帝」
    if (name === "ジャンヌ" && pid !== G.bid.emperorPid) aim = false;

    G.aimSpecial[pid] = aim;
    log(`${name}：${aim ? "特殊勝利を狙う" : "通常勝利を狙う"}`);
    await sleep(80);
  }

  // 人間はここでは固定しない（UI的に宣言不要）
  G.aimSpecial[getHumanPid()] = false;

  await sleep(250);
}

async function phaseTricks() {
  setPhaseText("ゲーム開始", "皇帝からトリック開始。");
  await sleep(350);

  G.trick.leaderPid = G.bid.emperorPid;

  for (let t = 0; t < 10; t++) {
    G.trick.trickIndex = t + 1;
    await playOneTrick();
  }
}

// --- トリック本戦（10トリック） ---
async function playOneTrick() {
  const tNo = G.trick.trickIndex;

  G.trick.plays = [];
  G.trick.leadSuit = null;

  const leader = G.trick.leaderPid;
  setPhaseText(`トリック ${tNo}/10`, `リード：${players[leader].name}`);
  renderTrick(ui, players, []);

  for (let i = 0; i < 5; i++) {
    const pid = (leader + i) % 5;
    await takeTurnPlay(pid);
  }

  const leadSuit = resolveLeadSuit({ plays: G.trick.plays });
  G.trick.leadSuit = leadSuit;
  updateIndicators();

  const result = evaluateTrickWinner(
    { plays: G.trick.plays, leadSuitResolved: leadSuit },
    G.bid.trumpSuit
  );

  const winnerPid = result.winnerPid;
  const winningCard = result.winningPlay.card;

  const trickCards = G.trick.plays.map(p => p.card);
  addCapturedTrickTo(winnerPid, trickCards);

  rebuildFactionPoints();

  const steals = [];
  for (let idx = 1; idx < G.trick.plays.length; idx++) {
    const p = G.trick.plays[idx];
    if (p.card.isJoker && p.pid !== winnerPid) {
      const need = specialNeedRank(players[p.pid].name);
      const stolen = stealNeededCardFromWinner(need, G.captured[winnerPid].point);
      if (stolen) {
        const wArr = G.captured[winnerPid].point;
        const pos = wArr.findIndex(c => c.id === stolen.id);
        if (pos >= 0) {
          wArr.splice(pos, 1);
          G.captured[p.pid].point.push(stolen);
          steals.push({ from: winnerPid, to: p.pid, card: stolen });
        }
      }
    }
  }
  rebuildFactionPoints();

  const row = G.trick.plays
    .map(p => `${players[p.pid].name}:${safeCardHtml(p.card)}`)
    .join(" / ");
  log(`トリック${tNo}：${row}`);
  log(`勝者：${players[winnerPid].name}（${safeCardHtml(winningCard)} / 理由：${result.reason}）`);

  for (const s of steals) {
    log(`奪取：${players[s.to].name}が${players[s.from].name}から ${safeCardHtml(s.card)} を奪った`);
  }

  renderScores(ui, G.faction.imperial.point, G.faction.coalition.point);

  // トリック勝利（クリックまで残る）
  {
    const sayWin = DIALOG.getTrickWin(players[winnerPid].name);
    await showCutin(ui, { title: sayWin.title, text: sayWin.text, iconName: sayWin.by });
  }

  // 奪取セリフ（入っていれば）
  if (typeof DIALOG.getJokerSteal === "function") {
    for (const s of steals) {
      const stealerName = players[s.to].name;
      const say = DIALOG.getJokerSteal(stealerName);
      await showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
    }
  }

  G.trick.leaderPid = winnerPid;

  updateIndicators();
  updateTopFrames();
  redrawHandHuman(false);
}

async function takeTurnPlay(pid) {
  const p = players[pid];

  // 現時点の台札スート（先出しがジョーカーなら resolvedSuit が入っている前提）
  const first = G.trick.plays[0];
  const leadSuitResolved = first ? first.resolvedSuit : null;

  // 合法手
  const legal = legalPlays(G.hands[pid], leadSuitResolved);

  // ===== 人間 =====
  if (pid === getHumanPid()) {
    setPhaseText(
      `トリック ${G.trick.trickIndex}/10（あなた）`,
      leadSuitResolved ? `マストフォロー：${SUIT_LABEL[leadSuitResolved]}` : "先手：カードを出してください。"
    );
    updateIndicators();

    // 手札表示（合法札だけ押せるようにする）
    renderHand(ui, sortHand(G.hands[pid], G.bid.trumpSuit), {
      disabled: false,
      onPick: (card) => attachHumanPlayPick(ui, card),
    });

    ui.__legalSet = new Set(legal.map(c => c.id));

    const picked = await new Promise((resolve) => { ui.__resolvePlay = resolve; });

    ui.__legalSet = null;
    ui.__resolvePlay = null;

    await commitPlay(pid, picked);
    return;
  }

  // ===== CPU =====
  setPhaseText(`トリック ${G.trick.trickIndex}/10（${p.name}）`, "CPUがカードを選んでいます…");
  await cpuThinkDelay(480);

  const emperor = G.bid.emperorPid;
  const isImperial = (pid === emperor) || (G.ally.known && pid === G.ally.pid);
  const isCoalition = !isImperial;

  // 連合軍は指定カード吐かせ狙いで指定スートを優先リード
  const pressureSuit = (isCoalition && !G.ally.known && G.ally.spec) ? G.ally.spec.suit : null;

  // 指定カードを持つCPUは温存（持ってる時だけ designatedSpec を渡す）
  const hasDesignated =
    !!G.ally.spec &&
    G.hands[pid].some(c => !c.isJoker && c.suit === G.ally.spec.suit && c.rank === G.ally.spec.rank);
  const designatedSpec = hasDesignated ? G.ally.spec : null;

  // 「勝てそうか」の推定：候補カードを1枚足して evaluateTrickWinner に渡す（※必ず trick 形）
  const canWinEstimateFn = (candidate) => {
    // 候補の resolvedSuit を推定（先出しジョーカーはここでは切り札扱いに寄せて推定）
    const resolved =
      leadSuitResolved ??
      (!candidate.isJoker ? candidate.suit : (G.bid.trumpSuit || "S"));

    const simPlays = [
      ...G.trick.plays,
      { pid, card: candidate, resolvedSuit: resolved },
    ];

    const simTrick = {
      plays: simPlays,
      leadSuitResolved: (leadSuitResolved ?? resolved),
    };

    const win = evaluateTrickWinner(simTrick, G.bid.trumpSuit);
    return !!win && (win.winnerPid === pid);
  };

  const ctx = {
    trumpSuit: G.bid.trumpSuit,
    leadSuit: leadSuitResolved,
    trickSoFar: G.trick.plays,
    canWinEstimateFn,
    designatedSpec,
    aimSpecial: G.aimSpecial[pid],
    charName: p.name,
    mustRevealPressureSuit: (G.trick.plays.length === 0) ? pressureSuit : null,
  };

  const card = cpuChoosePlay(G.hands[pid], legal, ctx);
  await commitPlay(pid, card);
}

async function commitPlay(pid, card) {
  // 手牌から削除
  const removed = removeCardFromHand(pid, card.id);
  if (!removed) {
    err(`内部エラー：${players[pid].name}が存在しないカードを出そうとした`);
    return;
  }

  let resolvedSuit = null;

  // 先出し（トリック1枚目）
  if (G.trick.plays.length === 0) {
    if (card.isJoker) {
      resolvedSuit = await chooseLeadSuitForJoker(pid); // 台札ジョーカーは選択スート
      G.trick.leadSuit = resolvedSuit;
    } else {
      resolvedSuit = card.suit;
      G.trick.leadSuit = card.suit;
    }
  } else {
    // 2枚目以降：
    // - ジョーカーは「同スート卓判定」のため台札スートで扱う
    // - 通常札は “自分のスート” を保持する
    const leadSuit = G.trick.leadSuit;
    resolvedSuit = card.isJoker ? leadSuit : card.suit;
  }

  G.trick.plays.push({ pid, card, resolvedSuit });

  // 表示更新（カードが場に出た状態を先に見せる）
  renderTrick(ui, players, G.trick.plays);
  updateIndicators();

  if (pid === getHumanPid()) redrawHandHuman(false);

  // 同盟者判明（判明カードが出た瞬間に割り込み）
  if (!G.ally.known && G.ally.spec) {
    const spec = G.ally.spec;
    const hit = spec.isJoker
      ? (card.isJoker && card.jokerColor === spec.jokerColor)
      : (!card.isJoker && card.suit === spec.suit && card.rank === spec.rank);

    if (hit) {
      G.ally.pid = pid;
      G.ally.known = true;
      updateTopFrames();
      updateIndicators();

      const emperorName = players[G.bid.emperorPid].name;
      const allyName = players[G.ally.pid].name;

      if (typeof DIALOG.getAllyReveal === "function") {
        const say = DIALOG.getAllyReveal(allyName, emperorName);
        await showCutin(ui, { title: say.title, text: say.text, iconName: say.by });
      } else {
        await showCutin(ui, { title: "同盟者判明", text: `同盟者：${allyName}`, iconName: allyName });
      }

      log(`同盟者判明：${allyName}`);
    }
  }

  await sleep(160);
}

async function chooseLeadSuitForJoker(pid) {
  // 人間が先出しジョーカーのときは選択させるのが本来だが、
  // ここでは「切り札（まだ未確定な局面があるため）→最多スート」を採用。
  // トリック中なので切り札は確定済み。人間だけ簡易UIを出す。
  if (pid === getHumanPid()) {
    return await new Promise((resolve) => {
      ui.handActions.innerHTML = "";

      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.gap = "10px";
      wrap.style.flexWrap = "wrap";
      wrap.style.alignItems = "center";

      const info = document.createElement("div");
      info.textContent = "台札ジョーカー：台札スートを選択してください。";

      wrap.appendChild(info);

      for (const s of ["C","D","H","S"]) {
        const b = document.createElement("button");
        b.innerHTML = `${SUIT_LABEL[s]}`;
        b.addEventListener("click", () => {
          ui.handActions.innerHTML = "";
          resolve(s);
        });
        wrap.appendChild(b);
      }

      ui.handActions.appendChild(wrap);
    });
  }

  // CPU：最多スート（同数は強いスート）
  const cnt = { C:0, D:0, H:0, S:0 };
  for (const c of G.hands[pid]) {
    if (c.isJoker) continue;
    cnt[c.suit]++;
  }
  let best = "C";
  for (const s of ["C","D","H","S"]) {
    if (cnt[s] > cnt[best]) best = s;
    else if (cnt[s] === cnt[best] && SUIT_POWER[s] > SUIT_POWER[best]) best = s;
  }
  return best;
}

// --- 結果判定 ---
async function phaseResult() {
  const waitCutinDismiss = () =>
    new Promise((resolve) => {
      const on = () => {
        ui.cutin.removeEventListener("click", on);
        resolve();
      };
      ui.cutin.addEventListener("click", on);
    });

  setPhaseText("勝敗判定", "得点札を集計しています…");

  const emperor = G.bid.emperorPid;
  const ally = G.ally.pid;
  const bidCount = G.bid.current.count;

  rebuildFactionPoints();
  const impCount = extractPointCards(G.faction.imperial.point).length;

  const emperorSideWin = (impCount >= bidCount);
  const normalWinnerFaction = emperorSideWin ? "皇帝側" : "連合軍";

  const specials = [];
  for (let pid = 0; pid < 5; pid++) {
    const name = players[pid].name;
    const res = checkSpecialVictoryForPlayer(name, G.captured[pid].point);
    if (res) specials.push({ pid, name, title: res });
  }

  let specialWinner = null;
  if (specials.length > 0) {
    specials.sort((a, b) => CHARS.indexOf(a.name) - CHARS.indexOf(b.name));
    specialWinner = specials[0];
  }

  // リザルト文
  let summary = "";
  summary += `宣言：${bidToText(G.bid.current)}\n`;
  summary += `皇帝：${players[emperor].name}\n`;
  summary += `同盟者：${G.ally.known ? (players[ally]?.name ?? "不明") : "最後まで不明"}\n`;
  summary += `皇帝側得点札：${impCount}枚 / 必要：${bidCount}枚\n`;
  summary += `通常勝利：${normalWinnerFaction}\n`;
  if (specialWinner) {
    summary += `\n特殊勝利：${specialWinner.name}「${specialWinner.title}」\n`;
    summary += `（特殊勝利は通常勝利より優先）\n`;
  }

  // リザルト一覧：カードに ownerName を付与して渡す（UIで「誰の特殊勝利札か」を判定できるようにする）
  const imperialCards = [];
  const coalitionCards = [];
  for (let pid = 0; pid < 5; pid++) {
    const isImp = (pid === emperor) || (ally != null && pid === ally);
    const pts = extractPointCards(G.captured[pid].point);
    for (const c of pts) {
      const item = { ...c, ownerName: players[pid].name };
      if (isImp) imperialCards.push(item);
      else coalitionCards.push(item);
    }
  }

  renderResult(ui, { summary, imperialCards, coalitionCards });

  showScene(ui, "result");
  updateTopFrames();
  updateIndicators();

  // 勝利セリフ（クリックで消える）
  const coalitionNames = [];
  for (let pid = 0; pid < 5; pid++) {
    const isImp = (pid === emperor) || (ally != null && pid === ally);
    if (!emperorSideWin && !isImp) coalitionNames.push(players[pid].name);
  }
  const sayWin = DIALOG.getGameWin({
    emperorSideWin,
    emperorName: players[emperor].name,
    coalitionNames,
  });

  // タイトルを出し分け
  const normalTitle = emperorSideWin ? "皇帝側勝利" : "連合軍勝利";
  showCutin(ui, { title: normalTitle, text: sayWin.text, iconName: sayWin.by });
  await waitCutinDismiss();

  // 特殊勝利セリフ（成立していれば、クリックで消える）
  if (specialWinner) {
    const saySp = DIALOG.getSpecialWin(specialWinner.name);
    const spTitle = `特殊勝利（${specialWinner.title}）`;
    showCutin(ui, { title: spTitle, text: saySp.text, iconName: saySp.by });
    await waitCutinDismiss();
  }
}

// ====== タイトル初期描画 ======
function initTitle() {
  // ボタン紐付けは上部の querySelector() 側で行っているので、
  // ここでは「タイトルを表示する」だけにする（古い参照を踏まない）
  showScene(ui.scenes.title);
}



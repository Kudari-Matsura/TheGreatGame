// File: ui.js
// DOM描画・ログ・カットイン・トロフィーなど

import {
  SUIT_LABEL, SUIT_POWER, cardText, cardSuitClass, bidToText,
  extractPointCards, pointLabel, emperorTitleFor,
  loadTrophies, saveTrophies
} from "./core.js";

const $ = (sel) => document.querySelector(sel);

const HELP_PAGES = [
  {
    title: "1. このゲームは何をするゲーム？",
    body:
`「The Great Game」は、トランプゲームのナポレオンをベースにした一人用カードゲームです。
プレイヤー1人＋CPU4人の計5人で、毎回1人が「皇帝（ナポレオン）」になり、「皇帝」と「同盟者（副官）」の2人と「連合軍」の3人に分かれて戦います。

勝利条件は2種類あります。

通常勝利：皇帝側が宣言した枚数ぶんの得点札を取るか、連合軍側が阻止に成功する
特殊勝利：特定キャラが特定の札構成を満たすと達成。`
  },
  {
    title: "2. 陣営について",
    body:
`陣営は以下の構造です。

皇帝（ナポレオン）：1人
同盟者（副官）：0〜1人
連合軍：それ以外

同盟者は「指定カード」を出すと途中で判明します。
同盟者は皇帝と重複する可能性があります。`
  },
  {
    title: "3. 使用トランプと得点札について",
    body:
`使用するカードは通常のトランプ52枚とジョーカー2枚です。
便宜上、ジョーカーは赤ジョーカーと黒ジョーカーとして区別されます。

得点札としてカウントされるのは以下の5種類20枚です。
10 / J / Q / K / A

ゲーム終了時点で、皇帝側（皇帝＋同盟者）が宣言枚数以上の得点札を取っていれば皇帝側勝利、
取れていなければ連合軍勝利になります。`
  },
  {
    title: "4. ゲームの流れ",
    body:
`1ゲームはだいたい次の順で進みます。

1. 皇帝宣言
2. 同盟者判明に使うカードを指定
3. 余り札4枚と手札の交換（皇帝のみ）
4. トリックを10回行う
5. 勝敗判定・リザルト`
  },
  {
    title: "5. 皇帝宣言について",
    body:
`最初に、誰が皇帝になるかを競りで決めます。

各プレイヤーは手札を確認して得点札が何枚取れそうかを考え、最低宣言枚数の13枚以上取れそうだと判断したら宣言を行います。

宣言の内容：
切り札にするスート（♣♦♥♠のどれか）
獲得宣言枚数（皇帝側が取るべき得点札枚数）

宣言は先に宣言した人より多い宣言をしなければなりません。
同じ宣言枚数の場合、スートの強さで勝敗が決まります。

♣ < ♦ < ♥ < ♠ となり、♣13枚が最低で ♠20枚が最高になります。
誰も宣言しないまま1周すると手札が配り直しになります。`
  },
  {
    title: "6. 同盟者指定カードの決定",
    body:
`皇帝宣言で皇帝が決定した後、皇帝は同盟者を決めるための「指定カード」を1枚決めます。

指定カードを持っている人が、トリック中にそのカードを出すと同盟者が判明します。
皇帝が自分自身を同盟者にすることも可能です。`
  },
  {
    title: "7. 余り札の交換",
    body:
`同盟者指定カードを決定した後、皇帝のプレイヤーは伏せられていた4枚の余り札を見て、
合計14枚の手札からゲームに不要な4枚を捨てて、ゲームを開始します。`
  },
  {
    title: "8. トリックの進め方",
    body:
`皇帝からトリックが始まり、合計10回行います。

このゲームはマストフォローです。
1番最初に出したカード（台札）と同じスートを出す必要があります。
ただし、持っていない場合は好きなカードを出せます。

台札としてジョーカーを出した時はスートを自由に選ぶことができます。`
  },
  {
    title: "9. 各トリックの勝敗判定",
    body:
`5人のカードが出そろった時、トリックの勝者は基本的に以下の強さ順に決まります。

1. オールマイティ（♠A固定）
2. 台札のジョーカー
3. 正ジャック（切り札と同スートのJ）
4. 裏ジャック（切り札と同色スートのJ）
5. 切り札スートの通常札（Aが最強、2が最弱）
6. 台札スートの通常札（Aが最強、2が最弱）
7. 台札以外のジョーカー（基本的に最弱扱い）

勝利したプレイヤーはその場に出ていたカードを全て回収します。
その中により多くの得点札を含めることで通常勝利を目指します。`
  },
  {
    title: "10. よろめきとセイム2",
    body:
`♥Qは特殊で、オールマイティ（♠A）と同じトリックに出た場合のみ最強になります。
それ以外の時は通常札として計算されます。

セイム2は場に出た全カードが同じスート扱いのときだけ発動し、その場にオールマイティ、正ジャック、裏ジャック、台札ジョーカー、よろめきがない時、勝利あつかいになります。
ジョーカーは台札スート扱いになります。`
  },
  {
    title: "10. 台札以外のジョーカーについて",
    body:
`台札以外で出されたジョーカーには当該トリック勝者から「自分の特殊勝利に必要な札」を1枚奪うという特殊な効果があります。

奪うカードに複数候補がある場合は、一定の優先ルールで選ばれます。`
  },
  {
    title: "12. 特殊勝利について",
    body:
`通常の陣営勝利とは別に、各キャラには「特殊勝利」が設定されています。
ゲーム終了時に単独で以下の条件を満たした場合に達成となります。

マリア：Kを2枚のみ
ジャンヌ：10を3枚のみ
ヴィクトリア：Jを4枚
ルイーゼ：Aを1枚のみ
カチューシャ：Qを4枚

ぜひトロフィーコンプリートを目指してみてください。`
  },
];

export function createUI() {
  const el = {
    charFrames: $("#charFrames"),
    scenes: {
      title: $("#scene-title"),
      help: $("#scene-help"),
      trophy: $("#scene-trophy"),
      game: $("#scene-game"),
      result: $("#scene-result"),
    },
    helpText: $("#helpText"),

    // help pager
    helpPrev: $("#btnHelpPrev"),
    helpNext: $("#btnHelpNext"),
    helpClose: $("#btnHelpClose"),
    helpPageIndicator: $("#helpPageIndicator"),

    trophyGrid: $("#trophyGrid"),

    phaseTitle: $("#phaseTitle"),
    phaseBody: $("#phaseBody"),
    trickTable: $("#trickTable"),
    hand: $("#hand"),
    handActions: $("#handActions"),

    kvTrump: $("#kvTrump"),
    kvLead: $("#kvLead"),
    kvAllyCard: $("#kvAllyCard"),

    scoreImperial: $("#scoreImperial"),
    scoreCoalition: $("#scoreCoalition"),
    log: $("#log"),

    cutin: $("#cutin"),
    cutinTitle: $("#cutinTitle"),
    cutinText: $("#cutinText"),
    cutinIcon: $("#cutinIcon"),
    cutinClose: $("#cutinClose"),

    popup: $("#popup"),
    popupTitle: $("#popupTitle"),
    popupBody: $("#popupBody"),
    popupClose: $("#popupClose"),

    resultSummary: $("#resultSummary"),
    resultImperialCards: $("#resultImperialCards"),
    resultCoalitionCards: $("#resultCoalitionCards"),
  };

  // cut-in close
  el.cutin.addEventListener("click", () => hideCutin(el));
  el.cutinClose.addEventListener("click", (e) => { e.stopPropagation(); hideCutin(el); });

  // popup close
  el.popupClose.addEventListener("click", () => hidePopup(el));
  el.popup.addEventListener("click", (e) => {
    if (e.target === el.popup) hidePopup(el);
  });

  // help pager init
  el._helpPage = 0;

  el.helpPrev?.addEventListener("click", () => renderHelp(el, (el._helpPage ?? 0) - 1));
  el.helpNext?.addEventListener("click", () => renderHelp(el, (el._helpPage ?? 0) + 1));
  el.helpClose?.addEventListener("click", () => showScene("scene-title"));

  return el;
}

export function showScene(a, b) {
  // 対応呼び出し：
  // showScene("scene-title") / showScene("title") / showScene(ui,"title") / showScene(HTMLElement)
  const mapShort = (key) => {
    const m = {
      title: "scene-title",
      help: "scene-help",
      trophy: "scene-trophy",
      game: "scene-game",
      result: "scene-result",
      select: "scene-select",
    };
    return m[key] ?? key;
  };

  // 引数解決
  let key = null;
  let ui = null;

  if (a && typeof a === "object" && !(a instanceof HTMLElement)) ui = a;
  if (typeof b === "string") key = b;
  else if (typeof a === "string") key = a;
  else if (a instanceof HTMLElement) key = a.id;

  if (!key) {
    console.warn("[showScene] invalid arg:", a, b);
    return;
  }

  // ui.scenes を優先的に使う（存在するならそれが一番確実）
  if (ui?.scenes && typeof key === "string" && ui.scenes[key] instanceof HTMLElement) {
    key = ui.scenes[key].id;
  }

  // 候補idを作る（scene-有無の両方を試す）
  const want = mapShort(key);
  const candidates = [];
  candidates.push(want);
  if (!want.startsWith("scene-")) candidates.push(`scene-${want}`);
  if (want.startsWith("scene-")) candidates.push(want.replace(/^scene-/, ""));

  // シーン一覧を隠す
  const scenes = Array.from(document.querySelectorAll(".scene"));
  if (scenes.length === 0) {
    console.warn("[showScene] .scene not found in DOM");
    return;
  }
  for (const el of scenes) {
    el.classList.add("hidden");
    el.classList.remove("active");
  }

  // 見つかるまで候補を探す
  let target = null;
  for (const id of candidates) {
    const t = document.getElementById(id);
    if (t) { target = t; break; }
  }

  if (!target) {
    console.warn(`[showScene] scene not found: ${candidates[0]}`);
    return;
  }

  target.classList.remove("hidden");
  target.classList.add("active");
}

export function setTopFrames(ui, players, gameState) {
  const ICON_FILE = {
    "マリア": "austria",
    "ジャンヌ": "france",
    "ヴィクトリア": "britain",
    "ルイーゼ": "preussen",
    "カチューシャ": "russia",
    "イザベル": "spain",
  };

  const iconUrlOf = (name) => {
    const f = ICON_FILE[name];
    return f ? `./assets/${f}.png` : "";
  };

  // core.js の specialNeedRank と同等（UI側でローカルに持つ）
  const needRankOf = (charName) => {
    if (charName === "マリア") return 13; // K
    if (charName === "ジャンヌ") return 10;
    if (charName === "ヴィクトリア") return 11; // J
    if (charName === "ルイーゼ") return 14; // A
    if (charName === "カチューシャ") return 12; // Q
    return null;
  };

  const pointsByPid = gameState?.pointsByPid ?? [];

  ui.charFrames.innerHTML = "";
  for (let pid = 0; pid < players.length; pid++) {
    const p = players[pid];

    const wrap = document.createElement("div");
    wrap.className = "char-frame";

    // 背景いっぱいのアイコン
    const icon = document.createElement("div");
    icon.className = "char-icon";
    const url = iconUrlOf(p.name);
    if (url) {
      icon.style.backgroundImage = `url("${url}")`;
      icon.style.backgroundSize = "cover";
      icon.style.backgroundPosition = "center";
      icon.style.backgroundRepeat = "no-repeat";
    }

    // テキスト類は上に重ねる
    const overlay = document.createElement("div");
    overlay.className = "char-overlay";

    const name = document.createElement("div");
    name.className = "char-name";
    name.textContent = p.name;

    const role = document.createElement("div");
    role.className = "char-role";
    role.textContent = p.isHuman ? "プレイヤー" : "CPU";

    const tag = document.createElement("div");
    tag.className = "char-tag";
    if (pid === gameState?.emperorPid) {
      tag.classList.add("tag-emperor");
      tag.textContent = "皇帝";
    } else if (pid === gameState?.allyPid && gameState?.allyPid != null && gameState?.allyKnown) {
      tag.classList.add("tag-ally");
      tag.textContent = "同盟者";
    } else {
      tag.classList.add("tag-coalition");
      tag.textContent = "連合軍";
    }

    // 個人の得点札一覧（10,J,Q,K,A）
    const ptsWrap = document.createElement("div");
    ptsWrap.className = "char-points";

    const need = needRankOf(p.name);
    const pts = Array.isArray(pointsByPid[pid]) ? pointsByPid[pid] : [];
    for (const c of pts) {
      const pill = document.createElement("div");
      pill.className = "char-point-pill " + cardSuitClass(c);

      // 特殊勝利関係だけ金枠
      if (!c.isJoker && need != null && c.rank === need) {
        pill.classList.add("is-special");
      }

      pill.textContent = pointLabel(c);
      ptsWrap.appendChild(pill);
    }

    overlay.appendChild(name);
    overlay.appendChild(role);
    overlay.appendChild(tag);
    overlay.appendChild(ptsWrap);

    wrap.appendChild(icon);
    wrap.appendChild(overlay);
    ui.charFrames.appendChild(wrap);
  }
}

export function setIndicators(ui, { trumpSuit, leadSuit, allySpec, allyKnown }) {
  const suitSpan = (suit) => {
    if (!suit) return "-";
    const cls =
      suit === "C" ? "suitC" :
      suit === "D" ? "suitD" :
      suit === "H" ? "suitH" :
      suit === "S" ? "suitS" : "";
    return `<span class="${cls}">${SUIT_LABEL[suit]}</span>`;
  };

  const rankText = (rank) => {
    if (rank === 11) return "J";
    if (rank === 12) return "Q";
    if (rank === 13) return "K";
    if (rank === 14) return "A";
    return String(rank);
  };

  const specHtml = (spec) => {
    if (!spec) return "-";
    if (spec.isJoker) {
      const cls = spec.jokerColor === "R" ? "suitH" : "suitS";
      const t = spec.jokerColor === "R" ? "赤JOKER" : "黒JOKER";
      return `<span class="${cls}">${t}</span>`;
    }
    return `${suitSpan(spec.suit)}${rankText(spec.rank)}`;
  };

  ui.kvTrump.innerHTML = trumpSuit ? suitSpan(trumpSuit) : "-";
  ui.kvLead.innerHTML = leadSuit ? suitSpan(leadSuit) : "-";
  ui.kvAllyCard.innerHTML = specHtml(allySpec); // 伏せ表示なし
}

export function clearLog(ui) {
  ui.log.innerHTML = "";
}

export function logLine(ui, text, { isError = false } = {}) {
  const d = document.createElement("div");
  d.className = "log-line" + (isError ? " err" : "");
  d.innerHTML = text;

  // 最新を上に
  ui.log.prepend(d);
}

export function renderTrick(ui, players, trickPlays) {
  ui.trickTable.innerHTML = "";
  for (const p of trickPlays) {
    const e = document.createElement("div");
    e.className = "trick-entry";
    const who = document.createElement("div");
    who.className = "who";
    who.textContent = players[p.pid].name;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<span class="${cardSuitClass(p.card)}">${cardText(p.card)}</span>`;
    e.appendChild(who);
    e.appendChild(card);
    ui.trickTable.appendChild(e);
  }
}

export function renderScores(ui, imperialPointCards, coalitionPointCards) {
  // ゲーム画面の獲得得点札枠は廃止したため何もしない
}

export function showCutin(ui, { title, text, iconName }) {
  const ICON_FILE = {
    "マリア": "austria",
    "ジャンヌ": "france",
    "ヴィクトリア": "britain",
    "ルイーゼ": "preussen",
    "カチューシャ": "russia",
    "イザベル": "spain",
  };

  const iconUrlOf = (name) => {
    const f = ICON_FILE[name];
    return f ? `./assets/${f}.png` : "";
  };

  ui.cutinTitle.textContent = title ?? "-";
  ui.cutinText.textContent = text ?? "-";

  const url = iconUrlOf(iconName);
  if (url) {
    ui.cutinIcon.style.backgroundImage = `url("${url}")`;
    ui.cutinIcon.style.backgroundSize = "cover";
    ui.cutinIcon.style.backgroundPosition = "center";
    ui.cutinIcon.style.backgroundRepeat = "no-repeat";
    ui.cutinIcon.title = iconName ?? "";
  } else {
    ui.cutinIcon.style.backgroundImage = "";
    ui.cutinIcon.title = iconName ?? "";
  }

  ui.cutin.classList.remove("hidden");

  // クリック/タップで閉じる（自動で消さない）
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ui.cutin.removeEventListener("click", finish);
      ui.cutin.removeEventListener("touchend", finish);
      hideCutin(ui);
      resolve();
    };
    ui.cutin.addEventListener("click", finish);
    ui.cutin.addEventListener("touchend", finish);
  });
}

export function hideCutin(ui) {
  ui.cutin.classList.add("hidden");
}

export function showPopup(ui, { title, body }) {
  ui.popupTitle.textContent = title ?? "-";
  ui.popupBody.textContent = body ?? "";
  ui.popup.classList.remove("hidden");
}

export function hidePopup(ui) {
  ui.popup.classList.add("hidden");
}

export function renderHand(ui, hand, { disabled = false, onPick }) {
  ui.hand.innerHTML = "";
  ui.handActions.innerHTML = "";
  for (const card of hand) {
    const btn = document.createElement("button");
    btn.className = "card-btn";
    btn.disabled = disabled;
    btn.innerHTML = `<div class="t ${cardSuitClass(card)}">${cardText(card)}</div>`;
    btn.addEventListener("click", () => onPick?.(card));
    ui.hand.appendChild(btn);
  }
}

export function setPhase(ui, title, bodyText) {
  ui.phaseTitle.textContent = title;
  ui.phaseBody.textContent = bodyText ?? "";
}

/** 入札UI（人間） */
export async function promptHumanBid(ui, { currentBidText, minCount = 13 }) {
  const min = Math.max(13, Number(minCount ?? 13));

  return await new Promise((resolve) => {
    ui.handActions.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "10px";
    wrap.style.alignItems = "center";

    const info = document.createElement("div");
    info.style.color = "rgba(233,237,245,.88)";
    info.textContent = `現在の最高入札：${currentBidText}`;

    const countSel = document.createElement("select");
    countSel.style.padding = "10px 12px";
    countSel.style.borderRadius = "12px";
    countSel.style.border = "1px solid rgba(255,255,255,.2)";
    countSel.style.background = "rgba(0,0,0,.22)";
    countSel.style.color = "rgba(233,237,245,.95)";
    for (let c = min; c <= 20; c++) {
      const o = document.createElement("option");
      o.value = String(c);
      o.textContent = String(c);
      countSel.appendChild(o);
    }

    const suitSel = document.createElement("select");
    suitSel.style.padding = "10px 12px";
    suitSel.style.borderRadius = "12px";
    suitSel.style.border = "1px solid rgba(255,255,255,.2)";
    suitSel.style.background = "rgba(0,0,0,.22)";
    suitSel.style.color = "rgba(233,237,245,.95)";
    const suits = ["C", "D", "H", "S"];
    for (const s of suits) {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = `${SUIT_LABEL[s]}`;
      suitSel.appendChild(o);
    }

    const btnBid = document.createElement("button");
    btnBid.textContent = "入札する";
    const btnPass = document.createElement("button");
    btnPass.textContent = "パス";

    btnBid.addEventListener("click", () => {
      resolve({ count: Number(countSel.value), suit: suitSel.value });
      ui.handActions.innerHTML = "";
    });
    btnPass.addEventListener("click", () => {
      resolve(null);
      ui.handActions.innerHTML = "";
    });

    wrap.appendChild(info);
    wrap.appendChild(countSel);
    wrap.appendChild(suitSel);
    wrap.appendChild(btnBid);
    wrap.appendChild(btnPass);
    ui.handActions.appendChild(wrap);
  });
}

/** 同盟者指定カード（人間）：自分の手札に無いカードから選ぶ */
export async function promptHumanAllySpec(ui, { hand } = {}) {
  // ui.js単体でも動くようにローカル定義
  const SUITS_LOCAL = ["C", "D", "H", "S"];
  const SUIT_LABEL_LOCAL = (typeof SUIT_LABEL !== "undefined")
    ? SUIT_LABEL
    : { C: "♣", D: "♦", H: "♥", S: "♠" };

  const rankLabel = (r) => {
    if (r === 11) return "J";
    if (r === 12) return "Q";
    if (r === 13) return "K";
    if (r === 14) return "A";
    return String(r);
  };

  return await new Promise((resolve) => {
    ui.handActions.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "10px";

    const info = document.createElement("div");
    info.textContent = "同盟者指定カードを選択（任意指定）";

    // 任意指定（通常カード）
    const freeRow = document.createElement("div");
    freeRow.style.display = "flex";
    freeRow.style.flexWrap = "wrap";
    freeRow.style.gap = "10px";
    freeRow.style.alignItems = "center";

    const freeLabel = document.createElement("div");
    freeLabel.style.fontSize = "12px";
    freeLabel.style.color = "rgba(233,237,245,0.72)";
    freeLabel.textContent = "任意指定（通常カード）：";

    const suitSel = document.createElement("select");
    suitSel.style.padding = "8px 10px";
    suitSel.style.borderRadius = "12px";
    suitSel.style.border = "1px solid rgba(255,255,255,0.2)";
    suitSel.style.background = "rgba(0,0,0,0.35)";
    suitSel.style.color = "rgba(233,237,245,0.95)";
    for (const s of SUITS_LOCAL) {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = SUIT_LABEL_LOCAL[s] ?? s;
      suitSel.appendChild(o);
    }

    const rankSel = document.createElement("select");
    rankSel.style.padding = "8px 10px";
    rankSel.style.borderRadius = "12px";
    rankSel.style.border = "1px solid rgba(255,255,255,0.2)";
    rankSel.style.background = "rgba(0,0,0,0.35)";
    rankSel.style.color = "rgba(233,237,245,0.95)";
    for (let r = 2; r <= 14; r++) {
      const o = document.createElement("option");
      o.value = String(r);
      o.textContent = rankLabel(r);
      rankSel.appendChild(o);
    }

    const ok = document.createElement("button");
    ok.className = "btn";
    ok.textContent = "決定（通常カード）";
    ok.addEventListener("click", () => {
      resolve({ suit: suitSel.value, rank: Number(rankSel.value) });
      ui.handActions.innerHTML = "";
    });

    freeRow.appendChild(freeLabel);
    freeRow.appendChild(suitSel);
    freeRow.appendChild(rankSel);
    freeRow.appendChild(ok);

    // 任意指定（ジョーカー）
    const jokerRow = document.createElement("div");
    jokerRow.style.display = "flex";
    jokerRow.style.flexWrap = "wrap";
    jokerRow.style.gap = "8px";
    jokerRow.style.alignItems = "center";

    const jokerLabel = document.createElement("div");
    jokerLabel.style.fontSize = "12px";
    jokerLabel.style.color = "rgba(233,237,245,0.72)";
    jokerLabel.textContent = "任意指定（ジョーカー）：";

    const redBtn = document.createElement("button");
    redBtn.className = "btn";
    redBtn.textContent = "赤JOKER";
    redBtn.addEventListener("click", () => {
      resolve({ isJoker: true, jokerColor: "R" });
      ui.handActions.innerHTML = "";
    });

    const blackBtn = document.createElement("button");
    blackBtn.className = "btn";
    blackBtn.textContent = "黒JOKER";
    blackBtn.addEventListener("click", () => {
      resolve({ isJoker: true, jokerColor: "B" });
      ui.handActions.innerHTML = "";
    });

    jokerRow.appendChild(jokerLabel);
    jokerRow.appendChild(redBtn);
    jokerRow.appendChild(blackBtn);

    wrap.appendChild(info);
    wrap.appendChild(freeRow);
    wrap.appendChild(jokerRow);

    ui.handActions.appendChild(wrap);
  });
}


/** 皇帝交換：14枚から4枚捨てる（人間） */
export async function promptHumanDiscard4(ui, hand14) {
  return await new Promise((resolve) => {
    ui.handActions.innerHTML = "";
    ui.hand.innerHTML = "";

    // このフェーズだけ「2行」にする
    const prevHandStyle = {
      display: ui.hand.style.display,
      flexDirection: ui.hand.style.flexDirection,
      gap: ui.hand.style.gap,
      alignItems: ui.hand.style.alignItems,
    };
    ui.hand.style.display = "flex";
    ui.hand.style.flexDirection = "column";
    ui.hand.style.gap = "8px";
    ui.hand.style.alignItems = "flex-start";

    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.gap = "8px";
    row1.style.flexWrap = "nowrap";

    const row2 = document.createElement("div");
    row2.style.display = "flex";
    row2.style.gap = "8px";
    row2.style.flexWrap = "nowrap";

    ui.hand.appendChild(row1);
    ui.hand.appendChild(row2);

    const cleanupHandLayout = () => {
      ui.hand.style.display = prevHandStyle.display;
      ui.hand.style.flexDirection = prevHandStyle.flexDirection;
      ui.hand.style.gap = prevHandStyle.gap;
      ui.hand.style.alignItems = prevHandStyle.alignItems;
    };

    const selected = new Set();

    const info = document.createElement("div");
    info.textContent = "余り札を受け取りました。捨て札を4枚選んでください。";
    info.style.marginBottom = "10px";

    const btnOk = document.createElement("button");
    btnOk.textContent = "捨てる（4枚）";
    btnOk.disabled = true;

    const wrapActions = document.createElement("div");
    wrapActions.style.display = "flex";
    wrapActions.style.gap = "10px";
    wrapActions.style.flexWrap = "wrap";
    wrapActions.appendChild(btnOk);

    ui.handActions.appendChild(info);
    ui.handActions.appendChild(wrapActions);

    for (let i = 0; i < hand14.length; i++) {
      const card = hand14[i];
      const btn = document.createElement("button");
      btn.className = "card-btn";

      // cdhsなどの補助行は表示しない（.tのみ）
      btn.innerHTML = `<div class="t ${cardSuitClass(card)}">${cardText(card)}</div>`;

      btn.addEventListener("click", () => {
        if (selected.has(card.id)) selected.delete(card.id);
        else selected.add(card.id);

        btn.classList.toggle("selected", selected.has(card.id));
        btnOk.disabled = selected.size !== 4;
      });

      // 7枚ずつ
      (i < 7 ? row1 : row2).appendChild(btn);
    }

    btnOk.addEventListener("click", () => {
      const discards = hand14.filter((c) => selected.has(c.id));
      resolve(discards);

      ui.handActions.innerHTML = "";
      cleanupHandLayout();
    });
  });
}

/** トリック中：人間がカードを出す */
export async function promptHumanPlay(ui, legalCards) {
  return await new Promise((resolve) => {
    ui.handActions.innerHTML = "";
    const set = new Set(legalCards.map(c => c.id));

    const note = document.createElement("div");
    note.style.fontSize = "12px";
    note.style.color = "rgba(233,237,245,.72)";
    note.textContent = "選択可能なカードのみ押せます（マストフォロー）";

    ui.handActions.appendChild(note);

    const btns = Array.from(ui.hand.querySelectorAll("button.card-btn"));
    for (const b of btns) {
      const txt = b.querySelector(".t")?.textContent ?? "";
      // btn自身にidが無いので、再描画でonPick方式を使うほうが本来は良い。
      // ここでは promptHumanPlay の呼び出し側で renderHand を onPick 付きで呼ぶ前提。
    }

    // renderHand側でonPickを差し込む（mainがやる）
    // ここでは resolve を返す口だけ
    ui.__resolvePlay = resolve;
    ui.__legalSet = set;
  });
}

/** renderHand用：クリックを人間プレイに接続 */
export function attachHumanPlayPick(ui, card) {
  if (!ui.__resolvePlay) return;
  if (!ui.__legalSet?.has(card.id)) return;
  const r = ui.__resolvePlay;
  ui.__resolvePlay = null;
  ui.__legalSet = null;
  ui.handActions.innerHTML = "";
  r(card);
}

export function renderResult(ui, { summary, imperialCards, coalitionCards }) {
  // core.js の specialNeedRank と同等（UI側でローカルに持つ）
  const needRankOf = (charName) => {
    if (charName === "マリア") return 13; // K
    if (charName === "ジャンヌ") return 10;
    if (charName === "ヴィクトリア") return 11; // J
    if (charName === "ルイーゼ") return 14; // A
    if (charName === "カチューシャ") return 12; // Q
    return null;
  };

  const isSpecialCardForOwner = (card) => {
    const ownerName = card?.ownerName;
    if (!ownerName) return false;
    const need = needRankOf(ownerName);
    return (!card.isJoker && need != null && card.rank === need);
  };

  ui.resultSummary.textContent = summary;

  ui.resultImperialCards.innerHTML = "";
  ui.resultCoalitionCards.innerHTML = "";

  for (const c of imperialCards) {
    const pill = document.createElement("div");
    pill.className = "card-pill " + cardSuitClass(c);
    if (isSpecialCardForOwner(c)) pill.classList.add("is-special");
    pill.textContent = pointLabel(c);
    ui.resultImperialCards.appendChild(pill);
  }
  for (const c of coalitionCards) {
    const pill = document.createElement("div");
    pill.className = "card-pill " + cardSuitClass(c);
    if (isSpecialCardForOwner(c)) pill.classList.add("is-special");
    pill.textContent = pointLabel(c);
    ui.resultCoalitionCards.appendChild(pill);
  }
}

export function creditsText() {
  return [
`・背景、5人の立ち絵、5人の顔アイコン
…Nano banana pro
・王冠アイコン
…Nano banana

製作者：Kudari.Matsura`
  ].join("\n");
}

export function makeDialogue() {
  const REDEAL_ORDER = ["ヴィクトリア", "マリア", "カチューシャ", "ルイーゼ", "ジャンヌ"];

  const REDEAL_ALL_PASS = {
    "ジャンヌ": "次は先占権を盾にして抜け駆けするんじゃないでしょうね？",
    "ヴィクトリア": "次もBalance of powerを意識して欲しいものね。",
    "マリア": "我はここに踊りに来た訳では無いのだが…",
    "ルイーゼ": "私のことを誠実な仲介人と認め、剣を収めてくれたのですね。",
    "カチューシャ": "あうぅ…そんなに見つめられたら何もできない…",
  };

  const EMPEROR_DECLARE = {
    "ジャンヌ": "ここは「{DECL}」で宣言だわ",
    "ヴィクトリア": "ふふっ、「{DECL}」で宣言よ",
    "マリア": "さて、ここは「{DECL}」で宣言といこう",
    "ルイーゼ": "ここは「{DECL}」で宣言です",
    "カチューシャ": "ん…「{DECL}」で宣言…",
  };

  const ALLY_CHOOSE = {
    "ジャンヌ": "「{CARD}」を持ってる人は私の理念を分かってくれそうね",
    "ヴィクトリア": "「{CARD}」を持っているやつは私の代わりに戦ってくれそうね",
    "マリア": "「{CARD}」を理由に介にゅ…いや救援に行かねばならないな",
    "ルイーゼ": "私の戦略には「{CARD}」は欠かせませんね",
    "カチューシャ": "「{CARD}」は譲れない…欲しい…",
  };

  const EMPEROR_FIXED = {
    "ジャンヌ": "わたくしの正しさを皆様に教えてさしあげるわ",
    "ヴィクトリア": "仕込みは完了よ、私の策略を楽しみに待ってなさい",
    "マリア": "我が血に逆らえるとでも？",
    "ルイーゼ": "最後に笑うのはこの私です！",
    "カチューシャ": "冬将軍あるから…余裕…",
  };

  const TRICK_WIN = {
    "ジャンヌ": "皆様が束になっても勝てません、アウステルリッツです",
    "ヴィクトリア": "トラファルガーにいくらでも沈めてやろうじゃない",
    "マリア": "絶望的な状況でこそ敵を釘付けにする、それがブレンハイムの美学よ",
    "ルイーゼ": "さあ皆さんも私を見習うべきです。そうでしょう？ロイテン",
    "カチューシャ": "モスクワへようこそ",
  };

  // 同盟者判明（同盟者→皇帝）
  const ALLY_REVEAL = {
    "マリア": {
      "マリア": "ふむ…古の神聖ローマの栄光を示す時が来たか",
      "ジャンヌ": "ぐぬぬ…我が逆らえないとは…っ",
      "ヴィクトリア": "そちらからも黄金の騎兵を頼む",
      "ルイーゼ": "言うことを聞け。元は我の下にいたじゃないか",
      "カチューシャ": "Holy Allianceね。しくじるんじゃあないよ？",
    },
    "ジャンヌ": {
      "マリア": "これが崇高なる外交革命ってやつよ",
      "ジャンヌ": "さあ世界精神のお通りよ、どきなさい！",
      "ヴィクトリア": "仕方ない。一回整理しておきましょうね",
      "ルイーゼ": "どっちが正しいか見せつけてやろうじゃない。ね？",
      "カチューシャ": "私は貴女を守り、貴女は私を守るのよ",
    },
    "ヴィクトリア": {
      "マリア": "Balance of powerを分からせてやらないとね？",
      "ジャンヌ": "一時休戦ってやつね。東のバカを痛めつけてやろうじゃないの。",
      "ヴィクトリア": "残念ね、ここからはグレートエンパイアの時間よ。",
      "ルイーゼ": "陸は任せたわ。海は任せときなさい",
      "カチューシャ": "…もうあなたぐらいしかいないのよ",
    },
    "ルイーゼ": {
      "マリア": "これまでのことは水に流して共に斃れるまで戦いましょう",
      "ジャンヌ": "くっ…我慢ですルイーゼ…ここは凌ぎましょう…",
      "ヴィクトリア": "こちらも孤立は困りますから",
      "ルイーゼ": "大戦の覚悟はいいですね！？",
      "カチューシャ": "背中を固めておかないと、いつ刺されるか分かりませんからね",
    },
    "カチューシャ": {
      "マリア": "ん…アナタの危機はワタシが救う…",
      "ジャンヌ": "あいつ嫌い…一緒に潰す…",
      "ヴィクトリア": "あいつ最近うるさい…一緒に潰す",
      "ルイーゼ": "あそこ…アナタと分ける…",
      "カチューシャ": "南下開始…全部寄越せ…",
    },
  };

  // 弱ジョーカー奪取時
  const JOKER_STEAL = {
    "マリア": "結婚とは相手の家をすっぱ抜くものなのさ",
    "ジャンヌ": "やはり、わたくしの思想に共鳴してる者がいるのですねっ",
    "ヴィクトリア": "あらら？私のお金に釣られちゃったようね",
    "ルイーゼ": "諜報だって立派な戦略です",
    "カチューシャ": "油断してると…とっちゃうよ",
  };

  // ゲーム勝利
  const GAME_WIN = {
    "ジャンヌ": "ここはもう征服完了ね！次はどこに行こうかしら？",
    "ヴィクトリア": "やっぱりみんな私の手の中ねっ",
    "マリア": "久しぶりに冠を貰いに行こうではないかっ！",
    "ルイーゼ": "ん〜〜っ！ようやく私が1位になる時が来たんですねっ",
    "カチューシャ": "ワタシは世界最大の爆弾…どっかーん",
  };

  // 特殊勝利
  const SPECIAL_WIN = {
    "ジャンヌ": "10が3枚で、三銃士…ふふっ洒落てるでしょう？",
    "ヴィクトリア": "やっぱり四王揃ってのユニオンジャックよね",
    "マリア": "新しい署名はK.K.なんてのはどうだ？似合うだろう？",
    "ルイーゼ": "見てください、このライヒスアドラー。格好いいでしょう？",
    "カチューシャ": "女帝…揃った…さあひれ伏せ",
  };

  const fill = (tpl, vars) =>
    String(tpl).replace(/\{([A-Z_]+)\}/g, (_, k) => (vars?.[k] ?? `{${k}}`));

  return {
    BID_START: { title: "皇帝競り開始", by: "イザベル", text: "さあ、皇帝の座を賭けた競りよ。" },
    RESULT: { title: "決着", by: "イザベル", text: "集計中よ。" },

    getRedealAllPass(redealCount) {
      const idx = Math.max(0, (redealCount ?? 1) - 1);
      const by = REDEAL_ORDER[idx % REDEAL_ORDER.length];
      return { title: "配り直し", by, text: REDEAL_ALL_PASS[by] ?? "もう一度配り直しね。" };
    },

    getEmperorDeclare(charName, declText) {
      const tpl = EMPEROR_DECLARE[charName] ?? "ここは「{DECL}」で宣言。";
      return { title: "皇帝宣言", by: charName, text: fill(tpl, { DECL: declText }) };
    },

    getAllyChoose(charName, cardText) {
      const tpl = ALLY_CHOOSE[charName] ?? "「{CARD}」を持っている者、名乗り出よ。";
      return { title: "同盟者指定", by: charName, text: fill(tpl, { CARD: cardText }) };
    },

    getEmperorFixed(charName) {
      return { title: "皇帝確定", by: charName, text: EMPEROR_FIXED[charName] ?? "皇帝は私よ。" };
    },

    getTrickWin(charName) {
      return { title: "トリック勝利", by: charName, text: TRICK_WIN[charName] ?? "勝った。" };
    },

    getAllyReveal(allyName, emperorName) {
      const text = ALLY_REVEAL?.[allyName]?.[emperorName] ?? `同盟者：${allyName}`;
      return { title: "同盟者判明", by: allyName, text };
    },

    getJokerSteal(charName) {
      return { title: "奪取", by: charName, text: JOKER_STEAL[charName] ?? "奪取した。" };
    },

    getGameWin({ emperorSideWin, emperorName, coalitionNames }) {
      let by = emperorSideWin ? emperorName : null;
      if (!by) {
        const arr = Array.isArray(coalitionNames) ? coalitionNames : [];
        by = arr.length ? arr[Math.floor(Math.random() * arr.length)] : "イザベル";
      }
      return { title: "勝利", by, text: GAME_WIN[by] ?? "勝利よ。" };
    },

    getSpecialWin(charName) {
      return { title: "特殊勝利", by: charName, text: SPECIAL_WIN[charName] ?? "条件達成よ。" };
    },
  };
}

export function renderTrophies(ui, characters) {
  const ICON_FILE = {
    "マリア": "austria",
    "ジャンヌ": "france",
    "ヴィクトリア": "britain",
    "ルイーゼ": "preussen",
    "カチューシャ": "russia",
    "イザベル": "spain",
  };

  const STAND_FILE = {
    "マリア": "austria_stand",
    "ジャンヌ": "france_stand",
    "ヴィクトリア": "britain_stand",
    "ルイーゼ": "preussen_stand",
    "カチューシャ": "russia_stand",
  };

  const iconUrlOf = (name) => {
    const f = ICON_FILE[name];
    return f ? `./assets/${f}.png` : "";
  };

  const standUrlOf = (name) => {
    const f = STAND_FILE[name];
    return f ? `./assets/${f}.png` : "";
  };

  const crownUrlOf = (kind) => `./assets/crown_${kind}.png`; // bronze/silver/gold

  const makeCrownLine = (kind, achieved, label) => {
    const line = document.createElement("div");
    line.className = `crown ${kind}` + (achieved ? "" : " off");

    const mark = document.createElement("span");
    mark.className = "crown-mark";

    if (achieved) {
      const img = document.createElement("img");
      img.className = "crown-img";
      img.alt = `${kind} crown`;
      img.src = crownUrlOf(kind);
      mark.appendChild(img);
    } else {
      // 未達成は従来どおり2文字で表示
      mark.textContent = (kind === "bronze") ? "銅冠" : (kind === "silver") ? "銀冠" : "金冠";
    }

    const txt = document.createElement("span");
    txt.className = "crown-text";
    txt.textContent = `：${label}`;

    line.appendChild(mark);
    line.appendChild(txt);
    return line;
  };

  const trophies = loadTrophies();
  ui.trophyGrid.innerHTML = "";

  let idx = 0;
  for (const ch of characters) {
    const state = trophies[ch] ?? { bronze: false, silver: false, gold: false };

    const card = document.createElement("div");
    card.className = "trophy-card trophy-in";
    card.style.animationDelay = `${idx * 120}ms`;
    idx++;

    const ill = document.createElement("div");
    ill.className = "trophy-illust";
    const standUrl = standUrlOf(ch);
    if (standUrl) ill.style.backgroundImage = `url("${standUrl}")`;

    const content = document.createElement("div");
    content.className = "trophy-content";

    const top = document.createElement("div");
    top.className = "trophy-top";

    const icon = document.createElement("div");
    icon.className = "trophy-icon";
    const url = iconUrlOf(ch);
    if (url) {
      icon.style.backgroundImage = `url("${url}")`;
      icon.style.backgroundSize = "cover";
      icon.style.backgroundPosition = "center";
      icon.style.backgroundRepeat = "no-repeat";
    }

    const name = document.createElement("div");
    name.className = "trophy-name";
    name.textContent = ch;

    top.appendChild(icon);
    top.appendChild(name);

    const crowns = document.createElement("div");
    crowns.className = "crowns";

    crowns.appendChild(makeCrownLine("bronze", !!state.bronze, "このキャラクターでプレイした"));
    crowns.appendChild(makeCrownLine("silver", !!state.silver, "通常勝利"));
    crowns.appendChild(makeCrownLine("gold", !!state.gold, "特殊勝利"));

    content.appendChild(top);
    content.appendChild(crowns);

    card.appendChild(ill);
    card.appendChild(content);

    ui.trophyGrid.appendChild(card);
  }
}

export function updateTrophy({ characterName, bronze, silver, gold }) {
  const trophies = loadTrophies();
  const cur = trophies[characterName] ?? { bronze: false, silver: false, gold: false };

  const nextBronze = cur.bronze || !!bronze;

  trophies[characterName] = {
    bronze: nextBronze,
    // 銅冠が無いキャラに銀/金だけ付くのを防ぐ
    silver: nextBronze ? (cur.silver || !!silver) : false,
    gold: nextBronze ? (cur.gold || !!gold) : false,
  };

  saveTrophies(trophies);
}

export function roleText(players, { emperorPid, allyPid, allyKnown }) {
  const roles = {};
  for (let i = 0; i < players.length; i++) {
    const base = players[i].isHuman ? "プレイヤー" : "CPU";
    roles[i] = base;
  }
  if (emperorPid != null) {
    roles[emperorPid] = `${players[emperorPid].name}（${emperorTitleFor(players[emperorPid].name)}）`;
  }
  if (allyPid != null && allyKnown) {
    roles[allyPid] = `${players[allyPid].name}（同盟者）`;
  }
  return roles;
}

export function renderHelp(ui, pageIndex) {
  const total = HELP_PAGES.length;
  const idx = Math.max(0, Math.min(total - 1, Number(pageIndex) || 0));
  ui._helpPage = idx;

  const page = HELP_PAGES[idx];

  if (ui.helpText) {
    const esc = (s) =>
      String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const bodyHtml = esc(page.body).replaceAll("\n", "<br>");

    ui.helpText.innerHTML =
      `<div class="help-title"># ${esc(page.title)}</div>` +
      `<div class="help-body">${bodyHtml}</div>`;

    ui.helpText.scrollTop = 0;
  }

  if (ui.helpPageIndicator) {
    ui.helpPageIndicator.textContent = `${idx + 1}/${total}`;
  }
  if (ui.helpPrev) ui.helpPrev.disabled = idx === 0;
  if (ui.helpNext) ui.helpNext.disabled = idx === total - 1;
}

export function openHelp(ui) {
  renderHelp(ui, 0);
  showScene("scene-help");
}

export function helpText() {
  // 互換用：main.js が helpText を import していても落ちないようにする
  const p = HELP_PAGES?.[0];
  if (!p) return "";
  return `# ${p.title}\n\n${p.body}`;
}


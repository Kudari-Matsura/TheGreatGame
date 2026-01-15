// File: ui.js
// DOM描画・ログ・カットイン・トロフィーなど

import {
  SUIT_LABEL, SUIT_POWER, cardText, cardSuitClass, bidToText,
  extractPointCards, pointLabel, emperorTitleFor,
  loadTrophies, saveTrophies
} from "./core.js";

const $ = (sel) => document.querySelector(sel);

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

  return el;
}

export function showScene(a, b) {
  // 対応形式：
  // showScene("help") / showScene("scene-help") / showScene(HTMLElement)
  // showScene(ui, "help") / showScene(ui, "title") など
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

  let id = null;

  // 2引数: showScene(ui, "help")
  if (arguments.length >= 2 && typeof b === "string") {
    id = mapShort(b);
  } else if (typeof a === "string") {
    id = mapShort(a);
  } else if (a instanceof HTMLElement) {
    id = a.id;
  } else if (a && typeof a === "object" && typeof a.id === "string") {
    id = a.id;
  }

  if (!id) {
    console.warn("[showScene] invalid arg:", a, b);
    return;
  }

  // "help" のような短縮指定にも、"scene-help" にも対応
  if (!id.startsWith("scene-")) {
    const withPrefix = `scene-${id}`;
    if (document.getElementById(withPrefix)) id = withPrefix;
  }

  const scenes = Array.from(document.querySelectorAll(".scene"));
  if (scenes.length === 0) {
    console.warn("[showScene] .scene not found in DOM");
    return;
  }

  // hidden方式で確実に切り替える（activeは互換のため付ける）
  for (const el of scenes) {
    el.classList.add("hidden");
    el.classList.remove("active");
  }

  const target = document.getElementById(id);
  if (!target) {
    console.warn(`[showScene] scene not found: ${id}`);
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
    return f ? `./assets/${f}.jpg` : "";
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
    // 「キャラ名と役職に変わる」機能は不要：常にプレイヤー/CPU表示
    role.textContent = p.isHuman ? "プレイヤー" : "CPU";

    const tag = document.createElement("div");
    tag.className = "char-tag";
    // 3行目に 皇帝/同盟者/連合軍
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
    const pts = Array.isArray(pointsByPid[pid]) ? pointsByPid[pid] : [];
    for (const c of pts) {
      const pill = document.createElement("div");
      pill.className = "char-point-pill " + cardSuitClass(c);
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
  ui.log.appendChild(d);
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
    return f ? `./assets/${f}.jpg` : "";
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
export async function promptHumanBid(ui, { currentBidText, minCount = 11 }) {
  // phaseBodyに簡易UIを出す
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
    for (let c = minCount; c <= 20; c++) {
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
    const suits = ["C","D","H","S"];
    for (const s of suits) {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = `${SUIT_LABEL[s]}（${s}）`;
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
    info.textContent = "同盟者指定カードを選択（手札から／任意指定）";

    // 手札から
    const handRow = document.createElement("div");
    handRow.style.display = "flex";
    handRow.style.flexWrap = "wrap";
    handRow.style.gap = "6px";
    handRow.style.alignItems = "center";

    const handLabel = document.createElement("div");
    handLabel.style.fontSize = "12px";
    handLabel.style.color = "rgba(233,237,245,.72)";
    handLabel.textContent = "手札から：";
    handRow.appendChild(handLabel);

    const handCards = Array.isArray(hand) ? hand.slice() : [];
    if (handCards.length === 0) {
      const none = document.createElement("div");
      none.style.fontSize = "12px";
      none.style.color = "rgba(233,237,245,.55)";
      none.textContent = "（手札がありません）";
      handRow.appendChild(none);
    } else {
      for (const c of handCards) {
        const b = document.createElement("button");
        b.className = "card-btn small";
        b.innerHTML = `<div class="t ${cardSuitClass(c)}">${cardText(c)}</div>`;
        b.addEventListener("click", () => {
          if (c.isJoker) resolve({ isJoker: true, jokerColor: c.jokerColor });
          else resolve({ suit: c.suit, rank: c.rank });
          ui.handActions.innerHTML = "";
        });
        handRow.appendChild(b);
      }
    }

    // 任意指定（通常カード）
    const freeRow = document.createElement("div");
    freeRow.style.display = "flex";
    freeRow.style.flexWrap = "wrap";
    freeRow.style.gap = "10px";
    freeRow.style.alignItems = "center";

    const freeLabel = document.createElement("div");
    freeLabel.style.fontSize = "12px";
    freeLabel.style.color = "rgba(233,237,245,.72)";
    freeLabel.textContent = "任意指定（通常カード）：";

    const suitSel = document.createElement("select");
    suitSel.style.padding = "8px 10px";
    suitSel.style.borderRadius = "12px";
    suitSel.style.border = "1px solid rgba(255,255,255,.2)";
    suitSel.style.background = "rgba(0,0,0,.35)";
    suitSel.style.color = "rgba(233,237,245,.95)";
    for (const s of SUITS_LOCAL) {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = SUIT_LABEL_LOCAL[s] ?? s;
      suitSel.appendChild(o);
    }

    const rankSel = document.createElement("select");
    rankSel.style.padding = "8px 10px";
    rankSel.style.borderRadius = "12px";
    rankSel.style.border = "1px solid rgba(255,255,255,.2)";
    rankSel.style.background = "rgba(0,0,0,.35)";
    rankSel.style.color = "rgba(233,237,245,.95)";
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
    jokerLabel.style.color = "rgba(233,237,245,.72)";
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
    wrap.appendChild(handRow);
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

    const btnById = new Map();

    for (const card of hand14) {
      const btn = document.createElement("button");
      btn.className = "card-btn";
      btn.innerHTML = `
        <div class="t ${cardSuitClass(card)}">${cardText(card)}</div>
        <div class="s">${card.isJoker ? "JOKER" : card.suit}</div>
      `;
      btn.addEventListener("click", () => {
        if (selected.has(card.id)) selected.delete(card.id);
        else selected.add(card.id);

        btn.classList.toggle("selected", selected.has(card.id));
        btnOk.disabled = selected.size !== 4;
      });
      btnById.set(card.id, btn);
      ui.hand.appendChild(btn);
    }

    btnOk.addEventListener("click", () => {
      const discards = hand14.filter(c => selected.has(c.id));
      resolve(discards);
      ui.handActions.innerHTML = "";
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
  ui.resultSummary.textContent = summary;

  ui.resultImperialCards.innerHTML = "";
  ui.resultCoalitionCards.innerHTML = "";

  for (const c of imperialCards) {
    const pill = document.createElement("div");
    pill.className = "card-pill " + cardSuitClass(c);
    pill.textContent = pointLabel(c);
    ui.resultImperialCards.appendChild(pill);
  }
  for (const c of coalitionCards) {
    const pill = document.createElement("div");
    pill.className = "card-pill " + cardSuitClass(c);
    pill.textContent = pointLabel(c);
    ui.resultCoalitionCards.appendChild(pill);
  }
}

// HELP/クレジット文（イザベル）
export function helpText() {
  return [
`イザベル：
このゲームはトランプの「ナポレオン」を元にした、1人用（CPU4人）ゲームです。

■ 大まかな流れ
1) 皇帝立候補の競り（最低11〜最大20 / 同枚数ならスート強さ：♣<♦<♥<♠）
   1周全員パスなら配り直し
2) 皇帝は切り札スートを決定（入札したスート）
3) 皇帝は同盟者指定カード（スート＋数字）を決める（伏せ）
4) 皇帝は余り札4枚を受け取り、手札14枚から4枚捨てて10枚に戻す
5) 皇帝からトリック開始（10トリック）

■ マストフォロー
台札（最初に出たスート）と同じスートを出せるなら必ず出します。
なければ好きなカードを出せます。

■ カードの強さ（概略）
よろめき（♥Qがオールマイティと同卓） > オールマイティ（赤JOKER） > 台札ジョーカー（先出しJOKER） >
正ジャック > 裏ジャック > セイム2（場が同スートの時の2） > 切り札 > 台札 > 台札以外JOKER

■ 勝敗
ゲーム終了時、皇帝＋同盟者の獲得得点札（10,J,Q,K,A）の枚数が
皇帝の宣言枚数以上なら皇帝側の勝利。満たなければ連合軍の勝利。

■ 特殊勝利
各キャラは「特定ランクを特定枚数のみ」で単独勝利が可能です。
（条件を満たすと通常勝利より優先されます）

■ ジョーカー奪取
台札以外でジョーカーを出して、そのトリックに負けた場合、
トリック勝者の獲得札から、自分の特殊勝利に必要なランクを1枚奪えます。
（同ランクが複数ある時はスートの弱い順に奪います）

準備ができたら、タイトルへ戻ってゲームを始めましょう。`
  ].join("\n");
}

export function creditsText() {
  return [
`クレジット（素材元の表示ポップアップ）

・背景画像：assets/bg.jpg（あなたが用意した素材に差し替え）
・キャラアイコン：assets/ 以下に任意の素材を追加して差し替え可能
・カード表示：画像無し（記号＋数字を色分けで表現）

※実際の素材元URL・作者名などは、公開時にここへ追記してください。`
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

  const iconUrlOf = (name) => {
    const f = ICON_FILE[name];
    return f ? `./assets/${f}.jpg` : "";
  };

  const trophies = loadTrophies();
  ui.trophyGrid.innerHTML = "";

  for (const ch of characters) {
    const state = trophies[ch] ?? { bronze: false, silver: false, gold: false };

    const card = document.createElement("div");
    card.className = "trophy-card";

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

    const c1 = document.createElement("div");
    c1.className = "crown bronze" + (state.bronze ? "" : " off");
    c1.textContent = "銅冠：そのキャラで遊ぶ";

    const c2 = document.createElement("div");
    c2.className = "crown silver" + (state.silver ? "" : " off");
    c2.textContent = "銀冠：通常勝利";

    const c3 = document.createElement("div");
    c3.className = "crown gold" + (state.gold ? "" : " off");
    c3.textContent = "金冠：特殊勝利";

    crowns.appendChild(c1);
    crowns.appendChild(c2);
    crowns.appendChild(c3);

    card.appendChild(top);
    card.appendChild(crowns);
    ui.trophyGrid.appendChild(card);
  }
}

export function updateTrophy({ characterName, bronze, silver, gold }) {
  const trophies = loadTrophies();
  const cur = trophies[characterName] ?? { bronze: false, silver: false, gold: false };
  trophies[characterName] = {
    bronze: cur.bronze || !!bronze,
    silver: cur.silver || !!silver,
    gold: cur.gold || !!gold,
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

// File: core.js
// 純ロジック（状態から結果を返す）。UIやDOMには触れない。

export const SUITS = ["C", "D", "H", "S"]; // クラブ/ダイヤ/ハート/スペード
export const SUIT_POWER = { C: 1, D: 2, H: 3, S: 4 }; // 弱→強
export const SUIT_LABEL = { C: "♣", D: "♦", H: "♥", S: "♠" };

export const RANK_LABEL = (r) => {
  if (r === 11) return "J";
  if (r === 12) return "Q";
  if (r === 13) return "K";
  if (r === 14) return "A";
  return String(r);
};

export const POINT_RANKS = new Set([10, 11, 12, 13, 14]);

// この実装での解釈：
// - 赤ジョーカー = オールマイティ（通常最強）
// - 台札ジョーカー（台札として出されたジョーカー）= 赤以外なら2番手
// - 台札以外ジョーカー（台札でないジョーカー）= 最弱
// - よろめき：♥Qが「オールマイティ（赤ジョーカー）」と同じトリックに出た場合だけ最強化（赤より上）
//
// ※ユーザー仕様の曖昧箇所はこの解釈で統一している

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ id: `${s}${r}`, suit: s, rank: r, isJoker: false });
    }
  }
  deck.push({ id: "JR", suit: null, rank: 0, isJoker: true, jokerColor: "R" }); // 赤
  deck.push({ id: "JB", suit: null, rank: 0, isJoker: true, jokerColor: "B" }); // 黒（青/黒扱い）
  return deck;
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function deal(deck) {
  // 10枚×5人 + 余り4枚
  const hands = Array.from({ length: 5 }, () => []);
  let idx = 0;
  for (let round = 0; round < 10; round++) {
    for (let p = 0; p < 5; p++) {
      hands[p].push(deck[idx++]);
    }
  }
  const widow = deck.slice(idx, idx + 4);
  return { hands, widow };
}

export function sortHand(hand, trumpSuit = null) {
  const suitSort = (c) => (c.isJoker ? 5 : SUIT_POWER[c.suit]);
  const rankSort = (c) => (c.isJoker ? 99 : c.rank);
  const trumpBoost = (c) => (trumpSuit && !c.isJoker && c.suit === trumpSuit ? 200 : 0);
  return [...hand].sort((a, b) => {
    const ta = trumpBoost(a), tb = trumpBoost(b);
    if (ta !== tb) return tb - ta;
    const sa = suitSort(a), sb = suitSort(b);
    if (sa !== sb) return sb - sa;
    return rankSort(b) - rankSort(a);
  });
}

export function cardText(card) {
  if (card.isJoker) return card.jokerColor === "R" ? "赤JOKER" : "黒JOKER";
  return `${SUIT_LABEL[card.suit]}${RANK_LABEL(card.rank)}`;
}

export function cardSuitClass(card) {
  if (card.isJoker) return "";
  return `suit${card.suit}`;
}

export function isPointCard(card) {
  return !card.isJoker && POINT_RANKS.has(card.rank);
}

export function pointLabel(card) {
  if (!isPointCard(card)) return "";
  return `${SUIT_LABEL[card.suit]}${RANK_LABEL(card.rank)}`;
}

export function emperorTitleFor(charName) {
  // 皇帝側呼称（ナポレオン本人は「皇帝」として扱うが、キャラごとに呼称）
  // 同盟者も同呼称で表す（表示上）
  const map = {
    "マリア": "カイザー",
    "ジャンヌ": "アンプルール",
    "ヴィクトリア": "エンペラー",
    "ルイーゼ": "カイザー",
    "カチューシャ": "ツァーリ",
  };
  return map[charName] ?? "皇帝";
}

// 競りの比較
export function compareBid(a, b) {
  // a/b: {count, suit} or null
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if (a.count !== b.count) return a.count > b.count ? 1 : -1;
  if (a.suit === b.suit) return 0;
  return SUIT_POWER[a.suit] > SUIT_POWER[b.suit] ? 1 : -1;
}

export function bidToText(bid) {
  if (!bid) return "パス";
  return `${bid.count}（${SUIT_LABEL[bid.suit]}）`;
}

// 右/左ジャック
export function rightJack(trumpSuit) {
  return trumpSuit ? { suit: trumpSuit, rank: 11 } : null;
}
export function leftJack(trumpSuit) {
  if (!trumpSuit) return null;
  const sameColor = {
    C: "S",
    S: "C",
    D: "H",
    H: "D",
  }[trumpSuit];
  return { suit: sameColor, rank: 11 };
}
export function isSameCard(a, b) {
  if (!a || !b) return false;
  if (a.isJoker || b.isJoker) return a.isJoker && b.isJoker && a.jokerColor === b.jokerColor;
  return a.suit === b.suit && a.rank === b.rank;
}
export function matchesSpec(card, spec) {
  if (!spec) return false;
  if (card.isJoker) return false;
  return card.suit === spec.suit && card.rank === spec.rank;
}

// マストフォロー
export function legalPlays(hand, leadSuitResolved) {
  if (!leadSuitResolved) return [...hand];
  const follow = hand.filter(c => !c.isJoker && c.suit === leadSuitResolved);
  if (follow.length > 0) return follow;
  return [...hand];
}

// ジョーカーが台札（先出し）の場合：台札スートを選べる
// - UI/AIが選んだ chosenSuit を state.trick.leadSuitChosen に保存して使う
export function resolveLeadSuit(trickOrPlays) {
  // 互換対応：
  // - resolveLeadSuit({ plays: [...] }) も
  // - resolveLeadSuit([...]) も受け付ける
  const plays = Array.isArray(trickOrPlays) ? trickOrPlays : trickOrPlays?.plays;

  if (!Array.isArray(plays) || plays.length === 0) return null;

  // plays: [{pid, card, resolvedSuit}]
  // resolvedSuitはジョーカーでも確定して入れる（同スート判定のため）
  const first = plays[0];
  if (!first) return null;
  return first.resolvedSuit ?? (first.card.isJoker ? null : first.card.suit);
}

// トリック勝者判定
export function evaluateTrickWinner(trickOrPlays, trumpSuit) {
  // 互換：evaluateTrickWinner({plays:[...]}, trump) / evaluateTrickWinner([...], trump)
  const plays = Array.isArray(trickOrPlays) ? trickOrPlays : trickOrPlays?.plays;
  if (!Array.isArray(plays) || plays.length === 0) return null;

  // 台札スート（先手がジョーカーなら resolvedSuit に入っている想定）
  const leadSuitResolved =
    Array.isArray(trickOrPlays)
      ? resolveLeadSuit(plays)
      : (trickOrPlays?.leadSuitResolved ?? resolveLeadSuit(plays));

  // ルール優先:
  // よろめき(♥Q が オールマイティ♠A と同卓) > オールマイティ(♠A) > 台札ジョーカー > 正J > 裏J > セイム2 > 切り札 > 台札 > 台札以外ジョーカー
  const hasAlmighty = plays.some(p => p?.card && !p.card.isJoker && p.card.suit === "S" && p.card.rank === 14);

  // よろめき：♥Q が ♠A と同じトリックにある時だけ最強
  const wobblePlay = plays.find(
    p => p?.card && !p.card.isJoker && p.card.suit === "H" && p.card.rank === 12 && hasAlmighty
  );
  if (wobblePlay) {
    return { winnerPid: wobblePlay.pid, reason: "よろめき（♥Qがオールマイティと同卓）", winningPlay: wobblePlay };
  }

  // オールマイティ：♠A 固定
  const almightyPlay = plays.find(
    p => p?.card && !p.card.isJoker && p.card.suit === "S" && p.card.rank === 14
  );
  if (almightyPlay) {
    return { winnerPid: almightyPlay.pid, reason: "オールマイティ（♠A）", winningPlay: almightyPlay };
  }

  // 台札ジョーカー（先出しがジョーカー）
  const leadJokerPlay = plays[0]?.card?.isJoker ? plays[0] : null;
  if (leadJokerPlay) {
    return { winnerPid: leadJokerPlay.pid, reason: "台札ジョーカー", winningPlay: leadJokerPlay };
  }

  // 正/裏ジャック
  const rj = rightJack(trumpSuit);
  const lj = leftJack(trumpSuit);

  const rjPlay = plays.find(p => p?.card && matchesSpec(p.card, rj));
  if (rjPlay) return { winnerPid: rjPlay.pid, reason: "正ジャック", winningPlay: rjPlay };

  const ljPlay = plays.find(p => p?.card && matchesSpec(p.card, lj));
  if (ljPlay) return { winnerPid: ljPlay.pid, reason: "裏ジャック", winningPlay: ljPlay };

  // セイム2：場の全てが同じスート（ジョーカー含む）なら、そのスートの2が最強
  const allSameSuit =
    !!leadSuitResolved &&
    plays.every(p => p?.resolvedSuit === leadSuitResolved);

  if (allSameSuit) {
    const same2 = plays.find(
      p => p?.card && !p.card.isJoker && p.card.suit === leadSuitResolved && p.card.rank === 2
    );
    if (same2) return { winnerPid: same2.pid, reason: "セイム2（同スート卓）", winningPlay: same2 };
  }

  // 切り札スート最大
  const trumpPlays = trumpSuit
    ? plays.filter(p => p?.card && !p.card.isJoker && p.card.suit === trumpSuit)
    : [];
  if (trumpPlays.length > 0) {
    const best = trumpPlays.reduce((acc, p) => (p.card.rank > acc.card.rank ? p : acc), trumpPlays[0]);
    return { winnerPid: best.pid, reason: "切り札スート", winningPlay: best };
  }

  // 台札スート最大
  const leadPlays = leadSuitResolved
    ? plays.filter(p => p?.card && !p.card.isJoker && p.card.suit === leadSuitResolved)
    : [];
  if (leadPlays.length > 0) {
    const best = leadPlays.reduce((acc, p) => (p.card.rank > acc.card.rank ? p : acc), leadPlays[0]);
    return { winnerPid: best.pid, reason: "台札スート", winningPlay: best };
  }

  // 台札以外ジョーカー（最弱）→他に何も無い時だけ
  const anyJoker = plays.find(p => p?.card?.isJoker);
  if (anyJoker) {
    return { winnerPid: anyJoker.pid, reason: "台札以外ジョーカー（最弱だが他がない）", winningPlay: anyJoker };
  }

  // フォールバック
  const fallback = plays[0];
  return { winnerPid: fallback.pid, reason: "不明（フォールバック）", winningPlay: fallback };
}
// 得点札抽出
export function extractPointCards(cards) {
  return cards.filter(isPointCard);
}

// 特殊勝利（個人）
export function checkSpecialVictoryForPlayer(charName, capturedPointCards) {
  // 「◯◯をN枚のみ」= そのランクだけが条件枚数で、他の得点札は0
  const need = specialNeedRank(charName);
  const counts = { 10: 0, 11: 0, 12: 0, 13: 0, 14: 0 };
  for (const c of capturedPointCards) counts[c.rank]++;

  const totalPoint = Object.values(counts).reduce((a, b) => a + b, 0);

  if (charName === "マリア") {
    return (counts[13] === 2 && totalPoint === 2) ? "Königin Kaiserin" : null;
  }
  if (charName === "ジャンヌ") {
    return (counts[10] === 3 && totalPoint === 3) ? "三銃士" : null;
  }
  if (charName === "ヴィクトリア") {
    return (counts[11] === 4 && totalPoint === 4) ? "ユニオンジャック" : null;
  }
  if (charName === "ルイーゼ") {
    return (counts[14] === 1 && totalPoint === 1) ? "単頭の鷲" : null;
  }
  if (charName === "カチューシャ") {
    return (counts[12] === 4 && totalPoint === 4) ? "ロマノフ四女帝" : null;
  }

  // 既知以外
  if (need) return null;
  return null;
}

export function specialNeedRank(charName) {
  if (charName === "マリア") return 13; // K
  if (charName === "ジャンヌ") return 10;
  if (charName === "ヴィクトリア") return 11; // J
  if (charName === "ルイーゼ") return 14; // A
  if (charName === "カチューシャ") return 12; // Q
  return null;
}

// ジョーカー奪取：台札以外ジョーカーを出して負けたら、勝者から自分の特殊に必要なカードを1枚奪う
export function attemptJokerSteal({ loserPid, winnerPid, playersCapturedPoint }) {
  // playersCapturedPoint: Array<Array<Card>>
  const needRank = specialNeedRank(playersCapturedPoint[loserPid]?.__charName ?? "");
  // charNameを埋め込めない環境向け：呼び出し側で needRank を渡す方が本来は良いが、ここでは使わない
  // main側で needRank計算して使う
  return { didSteal: false, stolenCard: null };
}

export function stealNeededCardFromWinner(needRank, winnerCapturedPointCards) {
  if (!needRank) return null;
  const candidates = winnerCapturedPointCards.filter(c => c.rank === needRank);
  if (candidates.length === 0) return null;
  // スートの弱い順（C<D<H<S）
  candidates.sort((a, b) => SUIT_POWER[a.suit] - SUIT_POWER[b.suit]);
  return candidates[0];
}

// トロフィー保存
export function trophyKey() {
  return "tgg_trophies_v1";
}

export function loadTrophies() {
  try {
    const raw = localStorage.getItem(trophyKey());
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return obj;
  } catch {
    return {};
  }
}

export function saveTrophies(trophies) {
  localStorage.setItem(trophyKey(), JSON.stringify(trophies));
}

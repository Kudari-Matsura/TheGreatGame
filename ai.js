// File: ai.js
// CPU思考。UIには触れない。

import {
  SUITS, SUIT_POWER, compareBid, rightJack, leftJack,
  isPointCard, specialNeedRank, stealNeededCardFromWinner
} from "./core.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function cpuThinkDelay(ms = 520) {
  await sleep(ms);
}

function countStrong(hand, trumpSuit) {
  // 強札カウント（控えめ）：以前より「切り札10以上」を数えすぎない
  const rj = rightJack(trumpSuit);
  const lj = leftJack(trumpSuit);

  let n = 0;
  for (const c of hand) {
    if (c.isJoker) n += 1;                       // 1
    else if (c.suit === "S" && c.rank === 14) n += 2; // ♠Aは2（特別だが過剰にしない）
    else if (rj && c.suit === rj.suit && c.rank === rj.rank) n += 1;
    else if (lj && c.suit === lj.suit && c.rank === lj.rank) n += 1;
    else if (trumpSuit && c.suit === trumpSuit && c.rank >= 12) n += 1; // Q,K,Aだけ
  }
  return n;
}

function bestSuitForBid(hand) {
  // 最多スート＋「高評価対象」を強く効かせて切り札候補を選ぶ
  const suitCounts = { C: 0, D: 0, H: 0, S: 0 };
  for (const c of hand) if (!c.isJoker) suitCounts[c.suit]++;

  const hasSpadeA = hand.some(c => !c.isJoker && c.suit === "S" && c.rank === 14);
  const jokerCount = hand.filter(c => c.isJoker).length;

  let best = { suit: "C", score: -1 };
  for (const s of SUITS) {
    const strong = countStrong(hand, s);
    const points = hand.filter(isPointCard).length;

    const rj = rightJack(s);
    const lj = leftJack(s);
    const hasRJ = rj ? hand.some(c => !c.isJoker && c.suit === rj.suit && c.rank === rj.rank) : false;
    const hasLJ = lj ? hand.some(c => !c.isJoker && c.suit === lj.suit && c.rank === lj.rank) : false;

    // ボーナス：♠A・ジョーカー・正裏ジャックを特に高く評価
    const bonus =
      (hasSpadeA ? 6 : 0) +
      (jokerCount * 4) +
      (hasRJ ? 4 : 0) +
      (hasLJ ? 3 : 0);

    const score = strong * 3 + suitCounts[s] + points * 0.6 + bonus;

    if (score > best.score) best = { suit: s, score };
    else if (score === best.score && SUIT_POWER[s] > SUIT_POWER[best.suit]) best = { suit: s, score };
  }
  return best.suit;
}

export function cpuChooseBid(hand, currentBid, { minCount = 13 } = {}) {
  const suit = bestSuitForBid(hand);
  const strong = countStrong(hand, suit);

  // 強気度を抑える：ボーナスを弱める
  const hasSpadeA = hand.some(c => !c.isJoker && c.suit === "S" && c.rank === 14);
  const jokerCount = hand.filter(c => c.isJoker).length;

  const rj = rightJack(suit);
  const lj = leftJack(suit);
  const hasRJ = rj ? hand.some(c => !c.isJoker && c.suit === rj.suit && c.rank === rj.rank) : false;
  const hasLJ = lj ? hand.some(c => !c.isJoker && c.suit === lj.suit && c.rank === lj.rank) : false;

  // 以前より控えめ
  const bonus =
    (hasSpadeA ? 2 : 0) +
    (jokerCount >= 1 ? 1 : 0) +
    (jokerCount >= 2 ? 1 : 0) +
    (hasRJ ? 1 : 0) +
    (hasLJ ? 1 : 0);

  // 初手（まだ最高入札が無い）なら必ず minCount から
  if (!currentBid) {
    // 強札が足りないならパス、足りるなら minCount で宣言
    const want = (strong + bonus >= 5) ? minCount : null;
    return want ? { count: want, suit } : null;
  }

  // 既に誰かが入札している場合：いきなり跳ねず、1ずつ上げる
  // ただし自分の強さが足りない場合はパス
  const maxComfort = Math.min(18, minCount + Math.max(0, (strong + bonus) - 4));
  const nextCount = Math.min(currentBid.count + 1, maxComfort);

  const myBid = { count: nextCount, suit };

  // そもそも上げられない
  if (nextCount <= currentBid.count) return null;

  // 上げた結果、現在より強い入札かチェック（同枚数ならスート強さで勝てる場合のみ）
  if (compareBid(myBid, currentBid) > 0) return myBid;

  return null;
}

export function cpuChooseAllyCardNotInHand(hand, trumpSuit) {
  const candidates = [];

  // 最優先：♠A（オールマイティ）
  candidates.push({ suit: "S", rank: 14 });

  // 次点：赤黒ジョーカー
  candidates.push({ isJoker: true, jokerColor: "R" });
  candidates.push({ isJoker: true, jokerColor: "B" });

  // 右J / 裏J
  const rj = rightJack(trumpSuit);
  const lj = leftJack(trumpSuit);
  if (rj) candidates.push({ suit: rj.suit, rank: rj.rank });
  if (lj) candidates.push({ suit: lj.suit, rank: lj.rank });

  // 切り札A,K,Q,J,10…
  for (const r of [14, 13, 12, 11, 10, 9, 8, 7]) {
    candidates.push({ suit: trumpSuit, rank: r });
  }

  // 残り：強めのA,K,Q,J,10
  for (const s of SUITS) {
    for (const r of [14, 13, 12, 11, 10]) {
      candidates.push({ suit: s, rank: r });
    }
  }

  const has = (spec) => {
    if (spec?.isJoker) return hand.some(c => c.isJoker && c.jokerColor === spec.jokerColor);
    return hand.some(c => !c.isJoker && c.suit === spec.suit && c.rank === spec.rank);
  };

  for (const spec of candidates) {
    if (!has(spec)) return spec;
  }

  return { suit: trumpSuit, rank: 2 };
}

export function cpuChooseDiscardAfterWidow(hand14, trumpSuit) {
  // 14枚から4枚捨てる：弱い順に捨てる
  const rj = rightJack(trumpSuit);
  const lj = leftJack(trumpSuit);

  const scoreCard = (c) => {
    if (c.isJoker) return 1000 + (c.jokerColor === "R" ? 2 : 1);
    if (rj && c.suit === rj.suit && c.rank === rj.rank) return 900;
    if (lj && c.suit === lj.suit && c.rank === lj.rank) return 850;
    if (c.suit === trumpSuit) return 500 + c.rank;
    if (isPointCard(c)) return 300 + c.rank;
    return c.rank;
  };

  const sorted = [...hand14].sort((a, b) => scoreCard(a) - scoreCard(b)); // 低いほど捨てたい
  return sorted.slice(0, 4);
}

export function cpuDecideAimSpecial(charName, hand10, trumpSuit) {
  // 皇帝交換後ゲーム開始時条件：
  // - 赤or黒ジョーカー最低1枚
  // - 追加条件（キャラごと）
  const hasJoker = hand10.some(c => c.isJoker);
  if (!hasJoker) return false;

  if (charName === "マリア") return true;
  if (charName === "ジャンヌ") return true; // 追加条件：自分が皇帝 → 呼び出し側で制御
  if (charName === "ヴィクトリア") {
    const rj = rightJack(trumpSuit);
    const lj = leftJack(trumpSuit);
    const hasRJ = rj && hand10.some(c => !c.isJoker && c.suit === rj.suit && c.rank === rj.rank);
    const hasLJ = lj && hand10.some(c => !c.isJoker && c.suit === lj.suit && c.rank === lj.rank);
    // 修正：両方必須 → どちらかでOK
    return !!(hasRJ || hasLJ);
  }
  if (charName === "ルイーゼ") {
    return hand10.some(c => !c.isJoker && c.suit === trumpSuit && c.rank === 14);
  }
  if (charName === "カチューシャ") {
    return hand10.some(c => !c.isJoker && c.suit === "H" && c.rank === 12);
  }
  return false;
}

function playValue(c, ctx) {
  // 「台札ジョーカー、セイム2は早め、オールマイティ/正裏J/よろめきは遅め」
  // ここでは「保持したい度」が高いほど大きい
  const { trumpSuit, designatedSpec, mustRevealPressureSuit, aimSpecial, charName } = ctx;

  if (c.isJoker) {
    // オールマイティ（赤）は温存（遅め）
    if (c.jokerColor === "R") return 1200;
    // 黒は「台札ジョーカー狙い」なら早めに出して良い、ただし状況次第
    return 700;
  }

  // よろめき候補（♥Q）…赤ジョーカーが残ってるなら温存気味
  if (c.suit === "H" && c.rank === 12) return 850;

  // 正/裏J
  // 右/左はトリック判定に依存するが、概ね強いので温存気味
  const rj = rightJack(trumpSuit);
  const lj = leftJack(trumpSuit);
  if (rj && c.suit === rj.suit && c.rank === rj.rank) return 980;
  if (lj && c.suit === lj.suit && c.rank === lj.rank) return 940;

  // 切り札
  if (trumpSuit && c.suit === trumpSuit) return 600 + c.rank;

  // 特殊勝利狙い：必要ランクの得点札は温存（できれば取られる前に回収したいが、このAIは単純に保持寄り）
  if (aimSpecial && isPointCard(c)) {
    const need = specialNeedRank(charName);
    if (need && c.rank === need) return 820 + SUITS.indexOf(c.suit);
  }

  // 同盟者指定カードは温存（最優先）
  if (designatedSpec && c.suit === designatedSpec.suit && c.rank === designatedSpec.rank) return 2000;

  // 吐かせ狙い（連合軍）：指定スートをリードできるなら価値上げ（攻撃）
  if (mustRevealPressureSuit && c.suit === mustRevealPressureSuit) return 650 + c.rank;

  // 低ランクほど先に消化
  return c.rank;
}

export function cpuChoosePlay(hand, legal, ctx) {
  const safeCtx = ctx ?? {};
  const trickSoFar = Array.isArray(safeCtx.trickSoFar) ? safeCtx.trickSoFar : [];
  const canWinEstimateFn = safeCtx.canWinEstimateFn;

  if (!Array.isArray(legal) || legal.length === 0) {
    return (Array.isArray(hand) && hand.length > 0) ? hand[0] : null;
  }

  const pointOnTable = trickSoFar.some(p => p?.card && !p.card.isJoker && isPointCard(p.card));

  const options = legal.map(c => {
    const keep = playValue(c, safeCtx);
    const canWin = canWinEstimateFn ? !!canWinEstimateFn(c) : false;

    let score;
    if (pointOnTable) score = (canWin ? 2000 : 0) - keep;
    else score = (canWin ? 400 : 0) - keep;

    return { c, score };
  });

  options.sort((a, b) => b.score - a.score);
  return options[0].c;
}

// 連合軍が同盟者指定カードを吐かせるため、指定スートを何度も出す：
// 呼び出し側で ctx.mustRevealPressureSuit に指定スートを入れると、playValueに反映される

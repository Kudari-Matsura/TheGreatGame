/* main.js */
const SUITS = ["C", "D", "H", "S"];
const SUIT_SYMBOL = { C: "♣", D: "♦", H: "♥", S: "♠" };
const SUIT_POWER  = { C: 1,  D: 2,  H: 3,  S: 4 };

const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RANK_POWER = Object.fromEntries(RANKS.map((r, i) => [r, i + 2])); // 2..14

// 得点札（旧：高札）
const SCORE_RANKS = new Set(["10","J","Q","K","A"]);
const PLAYER_COUNT = 5;
const CARDS_PER_PLAYER = 10;
const TRICK_COUNT = 10;

const $ = (id) => document.getElementById(id);

const SEATS = [
  { seat: 0, key: "austria",  name: "マリア",        avatar: "./austria.jpg" },
  { seat: 1, key: "france",   name: "ジャンヌ",      avatar: "./france.jpg" },
  { seat: 2, key: "britain",  name: "ヴィクトリア",  avatar: "./britain.jpg" },
  { seat: 3, key: "preussen", name: "ルイーゼ",      avatar: "./preussen.jpg" },
  { seat: 4, key: "russia",   name: "カチューシャ",  avatar: "./russia.jpg" },
];

const BID_MIN = { suit: "C", count: 11 };
const BID_MAX = { suit: "S", count: 20 };

/* ===== 特殊勝利（役） ===== */
const SPECIALS_BY_SEAT = {
  1: { rank: "10", target: 3, name: "三銃士" },                 // ジャンヌ
  2: { rank: "J",  target: 4, name: "ユニオンジャック" },       // ヴィクトリア
  0: { rank: "K",  target: 2, name: "Königin Kaiserin" },       // マリア
  3: { rank: "A",  target: 1, name: "単頭の鷲" },               // ルイーゼ
  4: { rank: "Q",  target: 4, name: "ロマノフ四女帝" },         // カチューシャ
};
function getSpecialProfile(seatIdx){
  return SPECIALS_BY_SEAT[seatIdx] || null;
}

const ALL_PASS_CUTIN_ORDER = [2, 0, 4, 3, 1]; // ヴィクトリア, マリア, カチューシャ, ルイーゼ, ジャンヌ
const ALL_PASS_LINES = {
  1: "次は先占権を盾にして抜け駆けするんじゃないでしょうね？", // ジャンヌ
  2: "次もBalance of powerを意識して欲しいものね",          // ヴィクトリア
  0: "我はここに踊りに来た訳では無いのだが…",                 // マリア
  3: "今回は私のことを誠実な仲介人と認め、剣を収めてくれたのですね",       // ルイーゼ
  4: "あうぅ…そんなに見つめられたら何もできない…",            // カチューシャ
};

const NAPOLEON_TITLES = {
  1: "アンプルール", // ジャンヌ
  2: "エンペラー",   // ヴィクトリア
  0: "カイザー",     // マリア
  3: "カイザー",     // ルイーゼ
  4: "ツァーリ",     // カチューシャ
};

const BID_CUTIN_LINES = {
  1: (b) => `ここは｢${b}｣で宣言だわ`,
  2: (b) => `ふふっ、｢${b}｣で宣言よ`,
  0: (b) => `さて、ここは｢${b}｣で宣言といこう`,
  3: (b) => `ここは｢${b}｣で宣言です`,
  4: (b) => `ん…｢${b}｣で宣言…`,
};

const NAPOLEON_DECIDE_LINES = {
  1: "わたくしの正しさを皆様に教えてさしあげるわ。",
  2: "仕込みは完了よ、私の策略を楽しみに待ってなさい",
  0: "我が血に逆らえるとでも？",
  3: "最後に笑うのはこの私です！",
  4: "冬将軍あるから…余裕…",
};

const DEPUTY_DECLARE_LINES = {
  1: (c) => `｢${c}｣を持ってる人は私の理念を分かってくれそうね`,
  2: (c) => `｢${c}｣を持っているやつは私の代わりに戦ってくれそうね`,
  0: (c) => `｢${c}｣を理由に介にゅ…いや救援に行かねばならないな。`,
  3: (c) => `私の戦術には｢${c}｣は欠かせませんね。`,
  4: (c) => `｢${c}｣は譲れない…欲しい…`,
};

// トリック勝利カットイン
const TRICK_WIN_LINES = {
  1: "皆様が束になっても勝てません、アウステルリッツです", // ジャンヌ
  2: "トラファルガーにいくらでも沈めてやろうじゃない",     // ヴィクトリア
  0: "絶望的な状況でこそ敵を釘付けにする、それがブレンハイムの美学よ", // マリア
  3: "さあ皆さんも私を見習うべきです。そうでしょう？ロイテン", // ルイーゼ
  4: "こんにちは、モスクワ",                                     // カチューシャ
};

// 同盟者判明カットイン（同盟者→ナポレオン）
const ALLY_REVEAL_LINES = {
  // ジャンヌが同盟者
  1: {
    1: "さあ世界精神のお通りよ、どきなさい！",
    2: "仕方ない。一回整理しておきましょうね",
    0: "これが崇高なる外交革命ってやつよ",
    3: "どっちが正しいか見せつけてやろうじゃない。ね？",
    4: "私は貴女を守り、貴女は私を守るのよ",
  },
  // ヴィクトリアが同盟者
  2: {
    1: "一時休戦ってやつね。東のバカを痛めつけてやろうじゃないの。",
    2: "残念ね、ここからはグレートエンパイアの時間よ",
    0: "Balance of powerを分からせてやらないとね？",
    3: "陸は任せたわ。海は任せときなさい",
    4: "…もうあなたぐらいしかいないのよ",
  },
  // マリアが同盟者
  0: {
    1: "ぐぬぬ…我が逆らえないとは…っ",
    2: "そちらからも黄金の騎兵を頼む",
    0: "ふっ、「古の神聖ローマの栄光を我が手に！」…だな",
    3: "言うことを聞け。元は我の下にいたじゃないか",
    4: "Holy Allianceね。しくじるんじゃあないぞ？",
  },
  // ルイーゼが同盟者
  3: {
    1: "くっ…我慢ですルイーゼ…ここは凌ぎましょう…",
    2: "こちらも孤立は困りますから",
    0: "これまでのことは水に流して共に斃れるまで戦いましょう",
    3: "握ってしまったからには振るわねばなりません、大戦の覚悟はいいですか！？",
    4: "背中を固めておかないと、いつ刺されるか分かりませんからね",
  },
  // カチューシャが同盟者
  4: {
    1: "あいつ嫌い…一緒に潰す…",
    2: "あいつ最近うるさい…一緒に潰す",
    0: "ん…アナタの危機はワタシが救う…",
    3: "あそこ…アナタと分ける…",
    4: "南下開始…全部寄越せ…",
  },
};

// ゲーム勝利カットイン（通常勝利）
const GAME_WIN_LINES = {
  1: "ここはもう征服完了ね！次はどこに行こうかしら？",        // ジャンヌ
  2: "やっぱりみんな私の手の中ねっ",                          // ヴィクトリア
  0: "久しぶりに冠を貰いに行こうではないかっ！",              // マリア
  3: "ん〜〜っ！ようやく私が1位になる時が来たんですねっ",      // ルイーゼ
  4: "ワタシは世界最大の爆弾…どっかーん",                     // カチューシャ
};

// ゲーム勝利カットイン（特殊勝利）
const SPECIAL_WIN_LINES = {
  1: "10が3枚で、三銃士…ふふっ洒落てるでしょう？",             // ジャンヌ
  2: "やっぱり四王揃ってのユニオンジャックよね",               // ヴィクトリア
  0: "新しい署名は…そうだな。K.K.にしよう",                    // マリア
  3: "見てください！この一頭の鷲。カッコイイでしょう！？",       // ルイーゼ
  4: "女帝…揃った…。ふふっ…ワタシの勝ちっ",                   // カチューシャ
};

function allyRevealLine(allySeat, napoleonSeat){
  return (ALLY_REVEAL_LINES[allySeat] && ALLY_REVEAL_LINES[allySeat][napoleonSeat])
    ? ALLY_REVEAL_LINES[allySeat][napoleonSeat]
    : "同盟者、参戦。";
}

function runAfterCutin(fn){
  if (!state.cutinActive){
    fn();
    return;
  }
  const prev = state.cutinOnClose;
  state.cutinOnClose = () => {
    if (prev) prev();
    fn();
  };
}

function setDeputyCard(card){
  state.deputyCard = card;

  logDep(`同盟者指定カード：<b>${cardHtml(card)}</b>`);
  renderDep();

  const nap = state.napoleonSeat;
  const ctxt = `(${SUIT_SYMBOL[card.suit]}${card.rank})`;
  const fn = DEPUTY_DECLARE_LINES[nap] || ((x)=>`｢${x}｣を指定`);
  const line = fn(ctxt);

  showCutinBySeat(nap, line, () => {
    startDiscardPhase();
  });
}

function napoleonTitle(seatIdx){
  return NAPOLEON_TITLES[seatIdx] || "ナポレオン";
}

function bidTextOf(bid){
  return `${SUIT_SYMBOL[bid.suit]}${bid.count}枚`;
}


const state = {
  scene: "title",
  seats: [],
  hidden: [],
  trickNo: 0,
  leader: 0,
  turn: 0,
  leadSuit: null,
  played: Array(PLAYER_COUNT).fill(null),
  log: [],
  busy: false,

  humanSeat: 1,

  auction: null,
  napoleonSeat: null,
  napoleonBid: null,
  trumpSuit: null,

  deputyCard: null,
  deputySeat: null,
  depLog: [],

  discardLog: [],
  discardSelected: [],

  cutinActive: false,
  cutinOnClose: null,
  allPassCutinIndex: 0,

};

function setScene(scene){
  state.scene = scene;
  $("scene-title").classList.toggle("active", scene === "title");
  $("scene-select").classList.toggle("active", scene === "select");
  $("scene-bid").classList.toggle("active", scene === "bid");
  $("scene-dep").classList.toggle("active", scene === "dep");
  $("scene-discard").classList.toggle("active", scene === "discard");
  $("scene-game").classList.toggle("active", scene === "game");
  $("scene-result").classList.toggle("active", scene === "result");
}

function updateOrientationClass(){
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.toggle("portrait", portrait);
  document.body.classList.toggle("landscape", !portrait);
}

function newDeck(){
  const deck = [];
  for (const s of SUITS){
    for (const r of RANKS){
      deck.push({ suit: s, rank: r });
    }
  }
  return deck;
}
function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isRedSuit(suit){ return suit === "D" || suit === "H"; }
function isRed(card){ return isRedSuit(card.suit); }
function cardText(card){ return `${card.rank}${SUIT_SYMBOL[card.suit]}`; }

function showCutinBySeat(seatIdx, text, onClose){
  const cutin = $("cutin");
  const av = $("cutin-avatar");
  const name = $("cutin-name");
  const msg = $("cutin-text");

  // state.seatsがある時はそこから、無い時はSEATSから拾う
  const s = (state.seats && state.seats.length)
    ? state.seats.find(x => x.seat === seatIdx)
    : SEATS.find(x => x.seat === seatIdx);

  av.src = s?.avatar || "";
  av.alt = s?.name || "";
  name.textContent = s?.name || "";
  msg.textContent = text;

  state.cutinActive = true;
  state.cutinOnClose = typeof onClose === "function" ? onClose : null;

  cutin.classList.remove("hidden");
  cutin.setAttribute("aria-hidden", "false");
}

function hideCutin(){
  const cutin = $("cutin");
  if (!cutin || cutin.classList.contains("hidden")) return;

  cutin.classList.add("hidden");
  cutin.setAttribute("aria-hidden", "true");

  state.cutinActive = false;

  const cb = state.cutinOnClose;
  state.cutinOnClose = null;
  if (cb) cb();
}


function escapeHtml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cardHtml(card){
  const cls = isRed(card) ? "card-red" : "card-black";
  return `<span class="card-inline ${cls}">${escapeHtml(cardText(card))}</span>`;
}
function suitMarkHtml(suit){
  const cls = isRedSuit(suit) ? "card-red" : "card-black";
  return `<span class="card-inline ${cls}">${escapeHtml(SUIT_SYMBOL[suit])}</span>`;
}

function sortHand(hand){
  hand.sort((a,b) => {
    const s = SUIT_POWER[a.suit] - SUIT_POWER[b.suit];
    if (s !== 0) return s;
    return RANK_POWER[a.rank] - RANK_POWER[b.rank];
  });
}

function logGame(html, important=false){
  state.log.push({ html, important });
  if (state.log.length > 260) state.log.shift();
}
function logBid(html){
  state.auction.log.push({ html });
  if (state.auction.log.length > 260) state.auction.log.shift();
}
function logDep(html){
  state.depLog.push({ html });
  if (state.depLog.length > 260) state.depLog.shift();
}
function logDiscard(html){
  state.discardLog.push({ html });
  if (state.discardLog.length > 260) state.discardLog.shift();
}

/* ===== Special cards ===== */
function isAlmighty(card){ return card.suit === "S" && card.rank === "A"; }
function sameColorSuit(trumpSuit){
  if (trumpSuit === "H") return "D";
  if (trumpSuit === "D") return "H";
  if (trumpSuit === "S") return "C";
  if (trumpSuit === "C") return "S";
  return null;
}
function isRightJack(card, trumpSuit){ return card.rank === "J" && card.suit === trumpSuit; }
function isLeftJack(card, trumpSuit){
  const left = sameColorSuit(trumpSuit);
  return card.rank === "J" && card.suit === left;
}

/* ===== UI seat init ===== */
function applySeatUI(){
  for (const s of SEATS){
    $(`seat${s.seat}-name`).textContent = s.name;
    const av = $(`seat${s.seat}-avatar`);
    av.src = s.avatar;
    av.alt = s.name;
    $(`slotname-${s.seat}`).textContent = s.name;
  }
}

/* ===== Role labels ===== */
function clearRoleLabels(){
  for (let i = 0; i < PLAYER_COUNT; i++){
    const nEl = $(`seat${i}-role`);
    const dEl = $(`seat${i}-dep`);
    nEl.className = "role";
    dEl.className = "role";
    nEl.textContent = "";
    dEl.textContent = "";
    nEl.style.display = "none";
    dEl.style.display = "none";
  }
}
function updateNapoleonLabel(){
  for (let i = 0; i < PLAYER_COUNT; i++){
    const el = $(`seat${i}-role`);
    el.className = "role";
    el.textContent = "";
    el.style.display = "none";
  }
  if (state.napoleonSeat != null){
    const el = $(`seat${state.napoleonSeat}-role`);
    el.textContent = napoleonTitle(state.napoleonSeat);
    el.className = "role napoleon";
    el.style.display = "inline-block";
  }
}
function updateDeputyLabel(){
  for (let i = 0; i < PLAYER_COUNT; i++){
    const el = $(`seat${i}-dep`);
    el.className = "role";
    el.textContent = "";
    el.style.display = "none";
  }
  if (state.deputySeat != null){
    const el = $(`seat${state.deputySeat}-dep`);
    el.textContent = "同盟者";
    el.className = "role deputy";
    el.style.display = "inline-block";
  }
}

/* ===== Players strip rendering (bid/dep/discard) ===== */
function countScoreCards(cards){
  let n = 0;
  for (const c of cards) if (SCORE_RANKS.has(c.rank)) n++;
  return n;
}
function renderPlayersStrip(containerId){
  const el = $(containerId);
  if (!el || !state.seats.length) return;

  const chips = [];
  for (let i = 0; i < PLAYER_COUNT; i++){
    const s = state.seats[i];
    const isNap = (state.napoleonSeat === i);
    const isDep = (state.deputySeat === i);
    const score = countScoreCards(s.taken);
    const roleNap = isNap? `<span class="role napoleon" style="display:inline-block;">${escapeHtml(napoleonTitle(i))}</span>`: "";
    const roleDep = isDep ? `<span class="role deputy" style="display:inline-block;">同盟者</span>` : "";

    const you = s.isHuman ? ` <span class="muted small">(YOU)</span>` : "";

    chips.push(`
      <div class="pchip">
        <div class="pchip-left">
          <img class="avatar" src="${escapeHtml(s.avatar)}" alt="${escapeHtml(s.name)}" />
          <div>
            <div class="pchip-name">${escapeHtml(s.name)}${you}</div>
            <div class="pchip-meta">手札${s.hand.length}枚 / 得点札${score}枚</div>
          </div>
        </div>
        <div class="pchip-right">
          ${roleNap}
          ${roleDep}
        </div>
      </div>
    `);
  }

  el.innerHTML = chips.join("");
}

/* ===== Character select ===== */
function buildSelectScene(){
  const grid = $("select-grid");
  grid.innerHTML = "";
  for (const s of SEATS){
    const card = document.createElement("div");
    card.className = "select-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    const img = document.createElement("img");
    img.className = "avatar-lg";
    img.src = s.avatar;
    img.alt = s.name;

    const name = document.createElement("div");
    name.className = "select-name";
    name.textContent = s.name;

    card.appendChild(img);
    card.appendChild(name);

    const go = () => {
    state.humanSeat = s.seat;
    dealForAuction({ resetAllPassCutin: true }); // ← ここが重要
    setScene("bid");
    renderBid();
    tickAuctionIfCPU();
    };

    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") go();
    });

    grid.appendChild(card);
  }
}

/* ===== Deal & Auction ===== */
function dealForAuction({ resetAllPassCutin = false } = {}){
  if (resetAllPassCutin) state.allPassCutinIndex = 0;

  state.seats = SEATS.map(s => ({
    seat: s.seat,
    name: s.name,
    avatar: s.avatar,
    isHuman: s.seat === state.humanSeat,
    hand: [],
    taken: [],
    ai: { thinSuits: new Set() },
  }));

  state.hidden = [];
  state.log = [];
  state.busy = false;

  state.auction = null;
  state.napoleonSeat = null;
  state.napoleonBid = null;
  state.trumpSuit = null;

  state.deputyCard = null;
  state.deputySeat = null;
  state.depLog = [];

  state.discardLog = [];
  state.discardSelected = [];

  const deck = shuffle(newDeck());
  for (let i = 0; i < PLAYER_COUNT; i++){
    state.seats[i].hand = deck.slice(i * CARDS_PER_PLAYER, (i + 1) * CARDS_PER_PLAYER);
    sortHand(state.seats[i].hand);
  }
  state.hidden = deck.slice(PLAYER_COUNT * CARDS_PER_PLAYER);

  state.auction = {
    highest: null,
    turn: 0,
    consecutivePasses: 0,
    hadAnyBid: false,
    firstRoundPasses: 0,
    hasBid: Array(PLAYER_COUNT).fill(false),
    dropped: Array(PLAYER_COUNT).fill(false),
    log: [],
  };

  clearRoleLabels();
  logBid(`配札完了。宣言開始。最初の手番は <b>${escapeHtml(state.seats[0].name)}</b>。`);
  syncBidUIControls();
  renderPlayersStrip("strip-bid");
}

function syncBidUIControls(){
  const sel = $("bid-count");
  sel.innerHTML = "";
  for (let c = BID_MIN.count; c <= 20; c++){
    const opt = document.createElement("option");
    opt.value = String(c);
    opt.textContent = `${c}枚`;
    sel.appendChild(opt);
  }
  $("bid-suit").value = "C";
  $("bid-count").value = String(BID_MIN.count);
}
function syncDepUIControls(){
  const rankSel = $("dep-rank");
  rankSel.innerHTML = "";
  for (const r of RANKS){
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    rankSel.appendChild(opt);
  }
  $("dep-suit").value = "C";
  $("dep-rank").value = "A";
}

function isBidHigher(a, b){
  if (!b) return true;
  if (a.count > b.count) return true;
  if (a.count === b.count && SUIT_POWER[a.suit] > SUIT_POWER[b.suit]) return true;
  return false;
}
function isBidWithinRange(b){
  if (b.count < BID_MIN.count) return false;
  if (b.count > BID_MAX.count) return false;
  if (b.count === BID_MIN.count && SUIT_POWER[b.suit] < SUIT_POWER[BID_MIN.suit]) return false;
  if (b.count === BID_MAX.count && SUIT_POWER[b.suit] > SUIT_POWER[BID_MAX.suit]) return false;
  return true;
}

function handleHumanBid(){
  const suit = $("bid-suit").value;
  const count = Number($("bid-count").value);
  submitBid(state.humanSeat, { suit, count });
}
function handleHumanPass(){
  submitPass(state.humanSeat);
}

function submitBid(seatIdx, bid){
  if (state.scene !== "bid") return;
  if (state.cutinActive) return;
  if (seatIdx !== state.auction.turn) return;

  if (!isBidWithinRange(bid)) { $("bid-hint").textContent = "範囲外です（♣11〜♠20）。"; return; }
  if (!isBidHigher(bid, state.auction.highest)) { $("bid-hint").textContent = "現在の最高宣言を上回っていません。"; return; }

  state.auction.highest = { seat: seatIdx, suit: bid.suit, count: bid.count };
  state.auction.hadAnyBid = true;
  state.auction.hasBid[seatIdx] = true;
  state.auction.consecutivePasses = 0;

  $("bid-hint").textContent = "—";
  logBid(`<b>${escapeHtml(state.seats[seatIdx].name)}</b> が宣言：<b>${suitMarkHtml(bid.suit)} ${bid.count}枚</b>`);

  renderBid(); // 先にログ更新

  // ★宣言カットイン
  const btxt = bidTextOf(bid);
  const lineFn = BID_CUTIN_LINES[seatIdx] || ((x) => `｢${x}｣で宣言`);
  const line = lineFn(btxt);

  showCutinBySeat(seatIdx, line, () => {
    // クリックで進行
    if (bid.suit === "S" && bid.count === 20){
      decideNapoleon(); // ここで確定カットインへ
      return;
    }
    nextAuctionTurn();
  });
}

function submitPass(seatIdx){
  if (state.scene !== "bid") return;
  if (state.cutinActive) return;
  if (seatIdx !== state.auction.turn) return;

  if (!state.auction.hadAnyBid){
    state.auction.firstRoundPasses += 1;
  }

  if (state.auction.hasBid[seatIdx]){
    state.auction.dropped[seatIdx] = true;
    logBid(`<b>${escapeHtml(state.seats[seatIdx].name)}</b> はパス（降り）`);
  } else {
    logBid(`<b>${escapeHtml(state.seats[seatIdx].name)}</b> はパス`);
  }

  if (state.auction.hadAnyBid){
    state.auction.consecutivePasses += 1;
  }

    if (!state.auction.hadAnyBid && state.auction.firstRoundPasses >= PLAYER_COUNT){
    logBid(`<b>全員パス</b>：配り直し`);

    // 配り直し
    dealForAuction({ resetAllPassCutin: false });
    renderBid();

    // カットイン（ローテ）
    const seat = ALL_PASS_CUTIN_ORDER[state.allPassCutinIndex % ALL_PASS_CUTIN_ORDER.length];
    const line = ALL_PASS_LINES[seat] || "…";
    state.allPassCutinIndex += 1;

    showCutinBySeat(seat, line, () => {
      renderBid();
      tickAuctionIfCPU();
    });

    return;
  }

  if (state.auction.hadAnyBid && state.auction.consecutivePasses >= 4){
    decideNapoleon();
    return;
  }

  nextAuctionTurn();
}

function nextAuctionTurn(){
  state.auction.turn = (state.auction.turn + 1) % PLAYER_COUNT;
  renderBid();
  tickAuctionIfCPU();
}

/* ===== CPU bidding (conservative) ===== */
function countScoreInHand(seatIdx){
  let n = 0;
  for (const c of state.seats[seatIdx].hand) if (SCORE_RANKS.has(c.rank)) n++;
  return n;
}
function suitCounts(seatIdx){
  const cnt = { C:0, D:0, H:0, S:0 };
  for (const c of state.seats[seatIdx].hand) cnt[c.suit]++;
  return cnt;
}
function strongestSuit(seatIdx){
  const cnt = suitCounts(seatIdx);
  let best = "C", bestN = -1;
  for (const s of SUITS){
    if (cnt[s] > bestN || (cnt[s] === bestN && SUIT_POWER[s] > SUIT_POWER[best])){
      best = s; bestN = cnt[s];
    }
  }
  return best;
}
function cpuStrengthScore(seatIdx){
  const hand = state.seats[seatIdx].hand;
  const scoreCards = countScoreInHand(seatIdx);
  const cnt = suitCounts(seatIdx);
  const maxSuit = Math.max(...Object.values(cnt));

  let specials = 0;
  for (const c of hand){
    if (isAlmighty(c)) specials += 3;
    if (c.rank === "J") specials += 1;
    if (c.rank === "A") specials += 1;
  }
  return scoreCards * 2 + maxSuit + specials;
}
function cpuChooseBid(seatIdx){
  const score = cpuStrengthScore(seatIdx);
  const prefSuit = strongestSuit(seatIdx);

  const cur = state.auction.highest;
  const baseStart = 18;
  if (!cur){
    if (score < baseStart) return null;
    return { suit: "C", count: BID_MIN.count };
  }

  const personalMax = Math.min(20, Math.max(BID_MIN.count, BID_MIN.count + Math.floor((score - baseStart) / 3)));
  if (cur.count >= personalMax && !(cur.count === personalMax && SUIT_POWER[prefSuit] > SUIT_POWER[cur.suit])) return null;
  if (score < baseStart + 2) return null;

  if (cur.count <= personalMax){
    const same = SUITS.filter(s => SUIT_POWER[s] > SUIT_POWER[cur.suit]).map(s => ({ suit: s, count: cur.count }));
    if (same.length){
      const prefer = same.find(b => b.suit === prefSuit) || same[0];
      if (isBidWithinRange(prefer) && isBidHigher(prefer, cur)) return prefer;
    }
  }

  const nextCount = cur.count + 1;
  if (nextCount <= personalMax && nextCount <= 20){
    const up = { suit: prefSuit, count: nextCount };
    if (isBidWithinRange(up) && isBidHigher(up, cur)) return up;
    const up2 = { suit: "C", count: nextCount };
    if (isBidWithinRange(up2) && isBidHigher(up2, cur)) return up2;
  }

  return null;
}

function tickAuctionIfCPU(){
  if (state.cutinActive) return;
  if (state.scene !== "bid") return;

  const turn = state.auction.turn;
  const s = state.seats[turn];

  renderPlayersStrip("strip-bid");

  if (state.auction.dropped[turn]){
    state.busy = true;
    setTimeout(() => { state.busy = false; submitPass(turn); }, 120);
    return;
  }

  if (s.isHuman){
    $("bid-controls").style.display = "";
    renderBid();
    return;
  }

  $("bid-controls").style.display = "none";
  renderBid();

  state.busy = true;
  setTimeout(() => {
    state.busy = false;
    const bid = cpuChooseBid(turn);
    if (bid) submitBid(turn, bid);
    else submitPass(turn);
  }, 420);
}

function renderBid(){
  updateOrientationClass();
  renderPlayersStrip("strip-bid");

  const cur = state.auction.highest;
  $("bid-current").innerHTML = cur
    ? `<b>${escapeHtml(state.seats[cur.seat].name)}</b>：<b>${suitMarkHtml(cur.suit)} ${cur.count}枚</b>`
    : "—（まだ宣言なし）";

  const t = state.auction.turn;
  $("bid-turn").textContent = `手番：${state.seats[t].name}`;

  $("bid-hint").textContent = state.seats[t].isHuman
    ? (cur ? "次の宣言は「枚数を増やす」か「同枚数でより高いスート」。パスも可。" : "宣言するかパス。最初は♣11枚から。")
    : "—";

  const latestFirst = state.auction.log.slice(-140).reverse();
  $("bid-log").innerHTML = latestFirst.map(x => `<div class="line">${x.html}</div>`).join("");
}

/* ===== Decide Napoleon -> Deputy -> Discard -> Game ===== */
function decideNapoleon(){
  const h = state.auction.highest;
  if (!h){
    dealForAuction();
    renderBid();
    tickAuctionIfCPU();
    return;
  }

  state.napoleonSeat = h.seat;
  state.napoleonBid = h;
  state.trumpSuit = h.suit;

  logBid(`ナポレオン決定：<b>${escapeHtml(state.seats[h.seat].name)}</b>（${suitMarkHtml(h.suit)} ${h.count}枚）`);

  updateNapoleonLabel();
  updateDeputyLabel();

  // ★確定カットイン
  const line = NAPOLEON_DECIDE_LINES[state.napoleonSeat] || "……";
  showCutinBySeat(state.napoleonSeat, line, () => {
    startDeputySelection();
  });
}

/* ===== Deputy selection ===== */
function startDeputySelection(){
  state.deputyCard = null;
  state.deputySeat = null;
  state.depLog = [];

  updateNapoleonLabel();
  updateDeputyLabel();

  setScene("dep");
  syncDepUIControls();

  const nap = state.napoleonSeat;
  const bid = state.napoleonBid;

  $("dep-napoleon").innerHTML =
    `<b>${escapeHtml(state.seats[nap].name)}</b>（${suitMarkHtml(bid.suit)} ${bid.count}枚）`;
  $("dep-trump").innerHTML = `切り札：<b>${suitMarkHtml(state.trumpSuit)}</b>`;

  logDep(`副官指定カードを決める（任意のカードを指定可）。`);
  renderDep();
  tickDeputySelectIfCPU();
}

function setDeputyCard(card){
  state.deputyCard = card;
  logDep(`副官指定カード：<b>${cardHtml(card)}</b>`);
  startDiscardPhase();
}

function handleHumanDeputyOk(){
  if (state.scene !== "dep") return;
  if (state.napoleonSeat !== state.humanSeat) return;

  const suit = $("dep-suit").value;
  const rank = $("dep-rank").value;
  const card = { suit, rank };

  $("dep-hint").textContent = "—";
  setDeputyCard(card);
}

function cpuChooseDeputyCard(){
  const nap = state.napoleonSeat;

  // 52枚全体から「手札にない」ものだけ候補にし、その中で最強を選ぶ
  let best = null;
  let bestScore = -Infinity;

  for (const s of SUITS){
    for (const r of RANKS){
      const card = { suit: s, rank: r };

      // 追加仕様：自分の手札にあるカードは選ばない
      if (handHasCard(nap, card)) continue;

      const sc = deputyCardStrength(card);
      if (sc > bestScore){
        bestScore = sc;
        best = card;
      }
    }
  }

  // 念のためフォールバック（理論上ここには来ない）
  return best || { suit: "S", rank: "A" };
}

function handHasCard(seatIdx, card){
  return state.seats[seatIdx].hand.some(c => c.suit === card.suit && c.rank === card.rank);
}

function deputyCardStrength(card){
  const t = state.trumpSuit;

  if (isAlmighty(card)) return 1_000_000;
  if (isRightJack(card, t)) return 900_000;
  if (isLeftJack(card, t)) return 850_000;

  // セイム2を狙える「2」を高く評価（スートでタイブレ）
  if (card.rank === "2"){
    return 800_000 + (card.suit === t ? 200 : 0) + SUIT_POWER[card.suit];
  }

  // 切り札
  if (card.suit === t){
    return 500_000 + RANK_POWER[card.rank];
  }

  // その他（副官指定の用途としては低め）
  return 100_000 + SUIT_POWER[card.suit] * 100 + RANK_POWER[card.rank];
}

function tickDeputySelectIfCPU(){
  if (state.scene !== "dep") return;

  renderPlayersStrip("strip-dep");

  const nap = state.napoleonSeat;
  const napIsHuman = state.seats[nap].isHuman;

  if (napIsHuman){
    $("dep-controls").style.display = "";
    $("dep-hint").textContent = "スート＋番号を選んで決定。";
    renderDep();
    return;
  }

  $("dep-controls").style.display = "none";
  $("dep-hint").textContent = "—";
  renderDep();

  state.busy = true;
  setTimeout(() => {
    state.busy = false;
    const card = cpuChooseDeputyCard();
    setDeputyCard(card);
  }, 650);
}

function renderDep(){
  updateOrientationClass();
  renderPlayersStrip("strip-dep");

  const h = state.seats[state.humanSeat];
  const depHand = $("dep-hand");
  depHand.innerHTML = "";
  for (const c of h.hand){
    const b = document.createElement("button");
    b.className = "card-btn";
    b.type = "button";
    b.textContent = cardText(c);
    b.disabled = true;
    b.classList.toggle("card-red", isRed(c));
    b.classList.toggle("card-black", !isRed(c));
    depHand.appendChild(b);
  }
    // --- 追加：ナポレオンの手札（CPU時は??表示） ---
  const napSeat = state.napoleonSeat;
  const napHandEl = $("dep-nap-hand");
  const napTitleEl = $("dep-nap-hand-title");
  napHandEl.innerHTML = "";

  if (napSeat == null){
    napTitleEl.textContent = "ナポレオンの手札";
  } else {
    const napPlayer = state.seats[napSeat];
    if (napPlayer.isHuman){
      napTitleEl.textContent = "ナポレオンの手札（あなた）";
      for (const c of napPlayer.hand){
        const b = document.createElement("button");
        b.className = "card-btn";
        b.type = "button";
        b.textContent = cardText(c);
        b.disabled = true;
        b.classList.toggle("card-red", isRed(c));
        b.classList.toggle("card-black", !isRed(c));
        napHandEl.appendChild(b);
      }
    } else {
      napTitleEl.textContent = "ナポレオンの手札（CPUのため非表示）";
      for (let i = 0; i < napPlayer.hand.length; i++){
        const b = document.createElement("button");
        b.className = "card-btn";
        b.type = "button";
        b.textContent = "??";
        b.disabled = true;
        napHandEl.appendChild(b);
      }
    }
  }


  const latestFirst = state.depLog.slice(-140).reverse();
  $("dep-log").innerHTML = latestFirst.map(x => `<div class="line">${x.html}</div>`).join("");
}

/* ===== Discard ===== */
function startDiscardPhase(){
  state.discardLog = [];
  state.discardSelected = [];

  const nap = state.napoleonSeat;
  state.seats[nap].hand.push(...state.hidden);
  state.hidden = [];
  sortHand(state.seats[nap].hand);

  setScene("discard");

  const bid = state.napoleonBid;
  $("discard-napoleon").innerHTML = `<b>${escapeHtml(state.seats[nap].name)}</b>（${suitMarkHtml(bid.suit)} ${bid.count}枚）`;

  logDiscard(`副官指定カード：<b>${cardHtml(state.deputyCard)}</b>`);
  logDiscard(`隠し札2枚を取得。手札は12枚。`);
  logDiscard(`不要な2枚を捨てる。`);

  renderDiscard();
  tickDiscardIfCPU();
}

function renderDiscard(){
  updateOrientationClass();
  renderPlayersStrip("strip-discard");

  const nap = state.napoleonSeat;
  const isHumanNap = state.seats[nap].isHuman;

  $("discard-controls").style.display = isHumanNap ? "" : "none";
  $("discard-hint").textContent = isHumanNap
    ? `捨て札候補：${state.discardSelected.length} / 2`
    : "CPUが捨て札を選択中…";

  $("discard-hand-title").textContent = isHumanNap
    ? "手札（クリックで捨て札候補を選択）"
    : "手札（CPUのため非表示）";

  const handEl = $("discard-hand");
  handEl.innerHTML = "";

  const hand = state.seats[nap].hand;

  // CPUの交換中は手札を見せない
  if (!isHumanNap){
    for (let i = 0; i < hand.length; i++){
      const btn = document.createElement("button");
      btn.className = "card-btn";
      btn.type = "button";
      btn.textContent = "??";
      btn.disabled = true;
      handEl.appendChild(btn);
    }
  } else {
    for (let i = 0; i < hand.length; i++){
      const c = hand[i];
      const btn = document.createElement("button");
      btn.className = "card-btn";
      btn.type = "button";
      btn.textContent = cardText(c);
      btn.classList.toggle("card-red", isRed(c));
      btn.classList.toggle("card-black", !isRed(c));

      const selected = state.discardSelected.includes(i);
      if (selected) btn.classList.add("selected");

      btn.disabled = false;
      btn.addEventListener("click", () => toggleDiscardPick(i));
      handEl.appendChild(btn);
    }
  }

  $("btn-discard-ok").disabled = !(isHumanNap && state.discardSelected.length === 2);

  const latestFirst = state.discardLog.slice(-140).reverse();
  $("discard-log").innerHTML = latestFirst.map(x => `<div class="line">${x.html}</div>`).join("");
}

function toggleDiscardPick(index){
  const pos = state.discardSelected.indexOf(index);
  if (pos >= 0) state.discardSelected.splice(pos, 1);
  else {
    if (state.discardSelected.length >= 2) return;
    state.discardSelected.push(index);
  }
  renderDiscard();
}

function finalizeDiscard(indices){
  indices.sort((a,b) => b-a);
  const nap = state.napoleonSeat;
  const hand = state.seats[nap].hand;

  const discarded = [];
  for (const idx of indices){
    discarded.push(hand[idx]);
    hand.splice(idx, 1);
  }
  sortHand(hand);

  logDiscard(`捨て札：${discarded.map(cardHtml).join(" ")}`);
  runAfterCutin(startGame);

}

function keepScoreForDiscard(card, trumpSuit){
  if (isAlmighty(card)) return 1000;
  if (isRightJack(card, trumpSuit)) return 900;
  if (isLeftJack(card, trumpSuit)) return 850;

  let s = (card.suit === trumpSuit) ? 200 : 50;
  s += RANK_POWER[card.rank];
  if (SCORE_RANKS.has(card.rank)) s += 80;
  if (card.rank === "A") s += 20;
  if (card.rank === "K") s += 10;
  return s;
}
function cpuPickDiscardTwo(){
  const nap = state.napoleonSeat;
  const hand = state.seats[nap].hand;
  const lows = hand.map((c, i) => ({ c, i })).filter(x => !SCORE_RANKS.has(x.c.rank));

  if (lows.length >= 2){
    lows.sort((a,b) => keepScoreForDiscard(a.c, state.trumpSuit) - keepScoreForDiscard(b.c, state.trumpSuit));
    return [lows[0].i, lows[1].i];
  }

  const all = hand.map((c,i) => ({ c, i }));
  all.sort((a,b) => keepScoreForDiscard(a.c, state.trumpSuit) - keepScoreForDiscard(b.c, state.trumpSuit));
  return [all[0].i, all[1].i];
}
function tickDiscardIfCPU(){
  if (state.scene !== "discard") return;
  const nap = state.napoleonSeat;
  if (state.seats[nap].isHuman) return;

  state.busy = true;
  setTimeout(() => {
    state.busy = false;
    const picks = cpuPickDiscardTwo();
    finalizeDiscard(picks);
  }, 700);
}

/* ===== AI thin-suit heuristic =====
   ゲーム開始時に「得点札以外（2〜9）」が特定スートで2枚以下なら、そのスートを早めに減らして“台札拘束”を回避したい
*/
function computeThinSuitsForSeat(seatIdx){
  const hand = state.seats[seatIdx].hand;
  const counts = { C:0, D:0, H:0, S:0 };
  for (const c of hand){
    if (!SCORE_RANKS.has(c.rank)) counts[c.suit] += 1; // 得点札は除外
  }
  const thin = new Set();
  for (const s of SUITS){
    if (counts[s] <= 2) thin.add(s);
  }
  state.seats[seatIdx].ai.thinSuits = thin;
}
function remainingNonScoreInSuit(seatIdx, suit){
  let n = 0;
  for (const c of state.seats[seatIdx].hand){
    if (c.suit === suit && !SCORE_RANKS.has(c.rank)) n++;
  }
  return n;
}

/* ===== Start game ===== */
function startGame(){
  // ★追加：カットインが出ている間はゲーム開始を遅延させる
  if (state.cutinActive){
    const prev = state.cutinOnClose;
    state.cutinOnClose = () => {
      if (prev) prev();
      runAfterCutin(startGame);
    };
    return;
  }

  // --- ここから下は既存の startGame 本体 ---
  for (let i = 0; i < PLAYER_COUNT; i++){
    computeThinSuitsForSeat(i);
  }

  state.trickNo = 0;
  state.leader = 0;
  state.turn = 0;
  state.leadSuit = null;
  state.played = Array(PLAYER_COUNT).fill(null);

  updateNapoleonLabel();
  updateDeputyLabel();

  setScene("game");

  logGame(`切り札：<b>${suitMarkHtml(state.trumpSuit)}</b>`, true);
  logGame(`${escapeHtml(napoleonTitle(state.napoleonSeat))}：<b>${escapeHtml(state.seats[state.napoleonSeat].name)}</b>（${suitMarkHtml(state.napoleonBid.suit)} ${state.napoleonBid.count}枚）`, true);
  logGame(`同盟者指定カード：<b>${cardHtml(state.deputyCard)}</b>（同盟者は出るまで未判明）`, true);

  renderGame();
  tickIfCPUInGame();
}

/* ===== Trick rules ===== */
function seatHasSuit(seatIdx, suit){
  return state.seats[seatIdx].hand.some(c => c.suit === suit);
}
function legalCards(seatIdx){
  const hand = state.seats[seatIdx].hand;
  const lead = state.leadSuit;
  if (!lead) return hand.slice();
  if (seatHasSuit(seatIdx, lead)) return hand.filter(c => c.suit === lead);
  return hand.slice();
}
function isLegalPlay(seatIdx, card){
  return legalCards(seatIdx).some(c => c.suit === card.suit && c.rank === card.rank);
}

/* ===== Winner calc ===== */
function computeTrickWinner(){
  const t = state.trumpSuit;
  const played = state.played;

  for (let i = 0; i < PLAYER_COUNT; i++){
    if (played[i] && isAlmighty(played[i])) return { winner: i, card: played[i], reason: "オールマイティ" };
  }
  for (let i = 0; i < PLAYER_COUNT; i++){
    if (played[i] && isRightJack(played[i], t)) return { winner: i, card: played[i], reason: "正ジャック" };
  }
  for (let i = 0; i < PLAYER_COUNT; i++){
    if (played[i] && isLeftJack(played[i], t)) return { winner: i, card: played[i], reason: "裏ジャック" };
  }

  const suits = played.map(c => c.suit);
  const allSameSuit = suits.every(s => s === suits[0]);
  if (allSameSuit){
    for (let i = 0; i < PLAYER_COUNT; i++){
      if (played[i].rank === "2") return { winner: i, card: played[i], reason: "セイム2" };
    }
  }

  const trumpIdx = [];
  for (let i = 0; i < PLAYER_COUNT; i++){
    if (played[i].suit === t) trumpIdx.push(i);
  }
  if (trumpIdx.length){
    let best = trumpIdx[0];
    for (const i of trumpIdx){
      if (RANK_POWER[played[i].rank] > RANK_POWER[played[best].rank]) best = i;
    }
    return { winner: best, card: played[best], reason: "切り札のスート" };
  }

  const lead = state.leadSuit;
  const leadIdx = [];
  for (let i = 0; i < PLAYER_COUNT; i++){
    if (played[i].suit === lead) leadIdx.push(i);
  }
  let best = leadIdx[0];
  for (const i of leadIdx){
    if (RANK_POWER[played[i].rank] > RANK_POWER[played[best].rank]) best = i;
  }
  return { winner: best, card: played[best], reason: "台札のスート" };
}

function nextTurn(){
  for (let step = 1; step <= PLAYER_COUNT; step++){
    const idx = (state.turn + step) % PLAYER_COUNT;
    if (!state.played[idx]) { state.turn = idx; return; }
  }
}
function trickComplete(){ return state.played.every(Boolean); }

function countRank(cards, rank){
  let n = 0;
  for (const c of cards) if (c.rank === rank) n++;
  return n;
}

function cardEquals(a, b){
  return a && b && a.suit === b.suit && a.rank === b.rank;
}

function checkDeputyReveal(seatIdx, card, onContinue){
  if (state.deputySeat != null) return false;
  if (!state.deputyCard) return false;

  if (cardEquals(card, state.deputyCard)){
    state.deputySeat = seatIdx;
    updateDeputyLabel();

    logGame(`同盟者判明：<b>${escapeHtml(state.seats[seatIdx].name)}</b>`, true);

    const line = allyRevealLine(seatIdx, state.napoleonSeat);

    // ★判明カットイン：閉じるまで進行停止
    showCutinBySeat(seatIdx, line, () => {
      if (typeof onContinue === "function") onContinue();
    });

    return true;
  }
  return false;
}

function finishTrick(){
  const result = computeTrickWinner();
  const winner = result.winner;

  // 勝者にカード移動
  state.seats[winner].taken.push(...state.played);

  // ログ（何が出たか）
  const playedHtml = state.played
    .map((c, i) => `${escapeHtml(state.seats[i].name)}:${cardHtml(c)}`)
    .join(` <span class="sep">/</span> `);

  logGame(`トリック${state.trickNo + 1}：${playedHtml}`, false);

  // ログ（勝者＋理由）
  logGame(
    `勝者：<b>${escapeHtml(state.seats[winner].name)}</b>（${cardHtml(result.card)} / 理由：<b>${escapeHtml(result.reason)}</b>）`,
    true
  );

  // ここで一旦UIを更新（獲得札表示など）
  renderGame();

  // ★トリック勝利カットイン（勝者が喋る）
  const line = TRICK_WIN_LINES[winner] || "……";
  showCutinBySeat(winner, line, () => {
    // 次トリックへ（カットインを閉じた後）
    state.trickNo += 1;
    state.played = Array(PLAYER_COUNT).fill(null);
    state.leadSuit = null;
    state.leader = winner;
    state.turn = winner;

    if (state.trickNo >= TRICK_COUNT){
      setTimeout(() => endGame(), 0);
      return;
    }

    logGame(`次の先手：<b>${escapeHtml(state.seats[state.leader].name)}</b>`, false);
    renderGame();
    tickIfCPUInGame();
  });
}

/* ===== 特殊勝利判定 ===== */
function getSpecialSatisfiedSeatsByCounts(countsBySeat){
  const satisfied = [];
  for (let i = 0; i < PLAYER_COUNT; i++){
    const sp = getSpecialProfile(i);
    if (!sp) continue;
    if ((countsBySeat[i] ?? 0) === sp.target) satisfied.push(i);
  }
  return satisfied;
}
function computeSpecialStatusNow(){
  const counts = Array(PLAYER_COUNT).fill(0);
  for (let i = 0; i < PLAYER_COUNT; i++){
    const sp = getSpecialProfile(i);
    if (!sp) continue;
    counts[i] = countRank(state.seats[i].taken, sp.rank);
  }
  return counts;
}

function endGame(){
  try {
  const nap = state.napoleonSeat;
  const target = state.napoleonBid.count;

  const nowCounts = computeSpecialStatusNow();
  const satisfied = getSpecialSatisfiedSeatsByCounts(nowCounts);

  let specialWinner = null;
  let specialName = null;

  if (satisfied.length === 1){
    specialWinner = satisfied[0];
    specialName = getSpecialProfile(specialWinner).name;
  }

  const grid = $("result-grid");
  grid.innerHTML = "";

  // 通常勝敗用（副官とナポレオンが重複する場合は二重加算しない）
  const napScore = countScoreCards(state.seats[nap].taken);
  const depSeat = state.deputySeat;
  const depScore = (depSeat != null && depSeat !== nap) ? countScoreCards(state.seats[depSeat].taken) : 0;
  const teamScore = napScore + depScore;
  const normalNapoleonWins = (teamScore >= target);

  if (specialWinner != null){
    $("result-head").textContent = `特殊勝利：${state.seats[specialWinner].name}（役名：${specialName}）`;
  } else {
    const depName = (depSeat != null) ? state.seats[depSeat].name : "未判明";
    const title = napoleonTitle(nap);
    $("result-head").textContent =
    (normalNapoleonWins
    ? `${title}勝利：得点札合計 ${teamScore} / 目標 ${target}（副官：${depName}）`
    : `連合軍勝利：得点札合計 ${teamScore} / 目標 ${target}（副官：${depName}）`
  );

  }

  for (const s of state.seats){
  const score = countScoreCards(s.taken);
  const isNap = (s.seat === nap);
  const isDep = (depSeat != null && s.seat === depSeat);

  let isWinner = false;
  if (specialWinner != null){
    isWinner = (s.seat === specialWinner);
  } else {
    isWinner = normalNapoleonWins ? (isNap || isDep) : (!isNap && !isDep);
  }

  const card = document.createElement("div");
  card.className = "result-card" + (isWinner ? " result-winner" : "");

  const img = document.createElement("img");
  img.className = "avatar-xl";
  img.src = s.avatar;
  img.alt = s.name;

  const info = document.createElement("div");

  const nameEl = document.createElement("div");
  nameEl.className = "result-name";
  const t = napoleonTitle(nap);
  nameEl.textContent = s.name + (
    isNap && isDep ? `（${t}/同盟者）` :
    isNap ? `（${t}）` :
    isDep ? "（同盟者）" : ""
  );

  // ★ここが重要：scoreEl をちゃんと作る
  const scoreEl = document.createElement("div");
  scoreEl.className = "result-score";
  scoreEl.innerHTML = `得点札（10/J/Q/K/A）：<b>${score}</b> 枚`;

  // ★追加：得点札をズラッと表示
  const cardsEl = document.createElement("div");
  cardsEl.className = "result-cards";
  cardsEl.innerHTML = renderTakenList(s.taken);

  info.appendChild(nameEl);
  info.appendChild(scoreEl);
  info.appendChild(cardsEl);

  card.appendChild(img);
  card.appendChild(info);
  grid.appendChild(card);
}

    setScene("result");

  // ★ここから追加：リザルト表示後の勝利カットイン（閉じてもシーン遷移なし）
  let speakerSeat = null;
  let line = null;

  if (specialWinner != null){
    speakerSeat = specialWinner;
    line = SPECIAL_WIN_LINES[speakerSeat] || GAME_WIN_LINES[speakerSeat] || "……";
  } else {
    if (normalNapoleonWins){
      // ナポレオン側勝利：ナポレオン本人
      speakerSeat = nap;
      line = GAME_WIN_LINES[speakerSeat] || "……";
    } else {
      // 連合軍勝利：連合軍の中からランダム
      const coalition = [];
      for (let i = 0; i < PLAYER_COUNT; i++){
        if (i === nap) continue;

        // 同盟者が判明しているなら除外（同盟者はナポレオン側）
        if (state.deputySeat != null && i === state.deputySeat) continue;

        coalition.push(i);
      }

      // 同盟者未判明の場合は「ナポレオン以外4人」からランダム（安全）
      if (!coalition.length){
        for (let i = 0; i < PLAYER_COUNT; i++){
          if (i !== nap) coalition.push(i);
        }
      }

      speakerSeat = coalition[Math.floor(Math.random() * coalition.length)];
      line = GAME_WIN_LINES[speakerSeat] || "……";
    }
  }

  // クリック/タップで閉じるだけ（onCloseは無し）
  // リザルトの表示が終わってから出したいので、描画後に1tick遅らせる
  setTimeout(() => {
    showCutinBySeat(speakerSeat, line, null);
  }, 0);

  } catch (e) {
    console.error("endGame crashed:", e);

    // 最低限リザルトへ行く（真っ白/固まり回避）
    try { setScene("result"); } catch (_) {}
  }
}

/* ===== Play card ===== */
function removeCardFromHand(seatIdx, card){
  const hand = state.seats[seatIdx].hand;
  const k = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
  if (k >= 0) hand.splice(k, 1);
}

function playCard(seatIdx, card){
  if (state.scene !== "game") return;
  if (state.busy) return;
  if (seatIdx !== state.turn) return;
  if (state.played[seatIdx]) return;

  if (!isLegalPlay(seatIdx, card)){
    logGame(`ルール上そのカードは出せない（マストフォロー）。`, true);
    renderGame();
    return;
  }

  if (!state.leadSuit){
    state.leadSuit = card.suit;
    logGame(`台札：<b>${suitMarkHtml(state.leadSuit)}</b>`, false);
  }

  removeCardFromHand(seatIdx, card);
  state.played[seatIdx] = card;

  logGame(`${escapeHtml(state.seats[seatIdx].name)} が ${cardHtml(card)} を出した。`, false);

  const proceedAfterThisPlay = () => {
    if (trickComplete()){
      renderGame();
      state.busy = true;
      setTimeout(() => {
        state.busy = false;
        finishTrick(); // ★finishTrick側でカットイン→次トリックへ
      }, 650);
      return;
    }

    nextTurn();
    renderGame();
    tickIfCPUInGame();
  };

  // ★同盟者判明ならカットインを出して止める（閉じたら proceed）
  if (checkDeputyReveal(seatIdx, card, proceedAfterThisPlay)){
    renderGame();
    return;
  }

  // 判明していないなら通常進行
  proceedAfterThisPlay();
  return;
}
/* ===== CPU strategy: prioritize special win + sabotage + thin-suit early shedding ===== */

function countRankInTrick(rank, withCandidateSeat=null, candidateCard=null){
  let n = 0;
  for (let i = 0; i < PLAYER_COUNT; i++){
    const c = (i === withCandidateSeat) ? candidateCard : state.played[i];
    if (c && c.rank === rank) n++;
  }
  return n;
}

function simulateLastCandidate(seatIdx, candidate){
  const saved = state.played[seatIdx];
  const savedLead = state.leadSuit;

  let leadChanged = false;
  if (!state.leadSuit){
    state.leadSuit = candidate.suit;
    leadChanged = true;
  }
  state.played[seatIdx] = candidate;

  const winner = computeTrickWinner().winner;

  state.played[seatIdx] = saved;
  if (leadChanged) state.leadSuit = savedLead;

  return winner;
}

function scoreCandidateWhenLast(seatIdx, candidate){
  const winner = simulateLastCandidate(seatIdx, candidate);

  const currentCounts = computeSpecialStatusNow();
  const projectedCounts = currentCounts.slice();

  for (let i = 0; i < PLAYER_COUNT; i++){
    const sp = getSpecialProfile(i);
    if (!sp) continue;
    const add = (winner === i) ? countRankInTrick(sp.rank, seatIdx, candidate) : 0;
    projectedCounts[i] += add;
  }

  const satisfiedProjected = getSpecialSatisfiedSeatsByCounts(projectedCounts);

  let score = 0;

  const mySp = getSpecialProfile(seatIdx);
  if (mySp){
    const cur = currentCounts[seatIdx];
    const proj = projectedCounts[seatIdx];

    if (proj > mySp.target){
      score -= 1_000_000 + 50_000 * (proj - mySp.target);
    } else if (proj === mySp.target){
      score += 250_000;
    } else {
      score += 5_000 * (proj - cur);
    }
  }

  for (let i = 0; i < PLAYER_COUNT; i++){
    if (i === seatIdx) continue;
    const sp = getSpecialProfile(i);
    if (!sp) continue;

    const cur = currentCounts[i];
    const proj = projectedCounts[i];

    if (cur === sp.target && proj > sp.target){
      score += 70_000;
    }
    if (proj === sp.target){
      score -= 55_000;
    }
    if (proj > sp.target){
      score += 8_000;
    }
  }

  if (satisfiedProjected.length >= 2 && !satisfiedProjected.includes(seatIdx)){
    score += 25_000 + 3_000 * (satisfiedProjected.length - 2);
  }

  if (isAlmighty(candidate)) score -= 1500;
  if (isRightJack(candidate, state.trumpSuit)) score -= 900;
  if (isLeftJack(candidate, state.trumpSuit)) score -= 700;

  if (mySp){
    const proj = projectedCounts[seatIdx];
    if (proj > mySp.target && winner === seatIdx) score -= 200_000;
  }

  return score;
}

function cardWeakValue(card){
  let v = 0;
  if (isAlmighty(card)) v += 100000;
  if (isRightJack(card, state.trumpSuit)) v += 90000;
  if (isLeftJack(card, state.trumpSuit)) v += 85000;
  if (card.suit === state.trumpSuit) v += 20000;
  v += RANK_POWER[card.rank];
  if (SCORE_RANKS.has(card.rank)) v += 500;
  return v;
}

function scoreNonLast(seatIdx, card){
  let v = cardWeakValue(card);

  // 自分の特殊勝利：必要なら対象ランクを温存
  const mySp = getSpecialProfile(seatIdx);
  if (mySp){
    const myCur = countRank(state.seats[seatIdx].taken, mySp.rank);
    if (myCur < mySp.target && card.rank === mySp.rank){
      v += 12000; // keep
    }
    if (myCur === mySp.target && card.rank === mySp.rank){
      v -= 300; // already exact, slight shed
    }
  }

  // 相手がちょうど成立しているなら、そのランクを場に混ぜて（勝者が取ることで）超過させたい気持ちを少しだけ
  for (let i = 0; i < PLAYER_COUNT; i++){
    if (i === seatIdx) continue;
    const sp = getSpecialProfile(i);
    if (!sp) continue;
    const cur = countRank(state.seats[i].taken, sp.rank);
    if (cur === sp.target && card.rank === sp.rank){
      v -= 200;
    }
  }

  // ★薄いスート早抜き（得点札以外が2枚以下のスートを序盤に減らす）
  // 序盤：トリック1〜5あたり（0-index < 5）
  const thin = state.seats[seatIdx].ai?.thinSuits;
  if (thin && state.trickNo < 5 && thin.has(card.suit) && !SCORE_RANKS.has(card.rank)){
    const remain = remainingNonScoreInSuit(seatIdx, card.suit);
    if (remain > 0){
      v -= 2500 + 250 * (3 - Math.min(3, remain)); // 1枚しか残ってない方がより強く出したい
    }
  }

  return v;
}

function chooseCardCPU(seatIdx){
  const legal = legalCards(seatIdx).slice();
  const playedCount = state.played.filter(Boolean).length;
  const willComplete = (playedCount === PLAYER_COUNT - 1);

  if (willComplete){
    let best = legal[0];
    let bestScore = -Infinity;
    for (const c of legal){
      const sc = scoreCandidateWhenLast(seatIdx, c);
      if (sc > bestScore){
        bestScore = sc;
        best = c;
      }
    }
    return best;
  }

  legal.sort((a,b) => scoreNonLast(seatIdx, a) - scoreNonLast(seatIdx, b));
  return legal[0];
}

function tickIfCPUInGame(){
  if (state.cutinActive) return;
  if (state.scene !== "game") return;
  const s = state.seats[state.turn];
  if (!s || s.isHuman) return;
  if (state.busy) return;

  state.busy = true;
  setTimeout(() => {
    state.busy = false;
    const card = chooseCardCPU(s.seat);
    playCard(s.seat, card);
  }, 450);
}

/* ===== Render ===== */
function renderTakenList(cards){
  const scores = cards.filter(c => SCORE_RANKS.has(c.rank));
  if (!scores.length) return "—";
  return scores.map(c => cardHtml(c)).join(" ");
}

function renderGame(){
  updateOrientationClass();

  const t = `トリック ${state.trickNo + 1} / ${TRICK_COUNT}　|　手番：${state.seats[state.turn].name}　|　先手：${state.seats[state.leader].name}`;
  $("status").textContent = t;

  const lead = state.leadSuit ? `台札：${SUIT_SYMBOL[state.leadSuit]}` : "台札：—";
  const trumpInfo = `切り札：${SUIT_SYMBOL[state.trumpSuit]}`;
  const depCardInfo = state.deputyCard ? `同盟者指定：${cardText(state.deputyCard)}` : "同盟者指定：—";
  const napInfo = `ナポレオン：${state.seats[state.napoleonSeat].name}（${SUIT_SYMBOL[state.napoleonBid.suit]} ${state.napoleonBid.count}枚）`;
  const depInfo = (state.deputySeat != null) ? `同盟者：${state.seats[state.deputySeat].name}` : "同盟者：未判明";

  $("trick-info").textContent = `${lead}　|　${trumpInfo}　|　${depCardInfo}　|　${napInfo}　|　${depInfo}`;

  for (let i = 0; i < PLAYER_COUNT; i++){
    const s = state.seats[i];
    const scoreCount = countScoreCards(s.taken);
    $(`seat${i}-meta`).textContent = `残り${s.hand.length}枚 / 得点札${scoreCount}枚`;
    $(`seat${i}-won`).innerHTML = renderTakenList(s.taken);
  }

  for (let i = 0; i < PLAYER_COUNT; i++){
    const el = $(`slot-${i}`);
    const c = state.played[i];
    if (!c){
      el.textContent = "—";
      el.classList.add("empty");
      el.classList.remove("card-red","card-black");
    } else {
      el.textContent = cardText(c);
      el.classList.remove("empty");
      el.classList.toggle("card-red", isRed(c));
      el.classList.toggle("card-black", !isRed(c));
    }
  }

  const latestFirst = state.log.slice(-140).reverse();
  $("log").innerHTML = latestFirst
    .map(x => `<div class="line ${x.important ? "important" : ""}">${x.html}</div>`)
    .join("");

  const h = state.seats[state.humanSeat];
  $("hand-avatar").src = h.avatar;
  $("hand-avatar").alt = h.name;
  $("hand-name").textContent = h.name;
  $("hand-meta").textContent = `得点札（10/J/Q/K/A）：${countScoreCards(h.taken)}枚`;

  const handEl = $("hand");
  handEl.innerHTML = "";

  const canPlayNow = (state.turn === state.humanSeat && !state.played[state.humanSeat] && !state.busy);
  const legalSet = canPlayNow ? legalCards(state.humanSeat) : [];
  const isLegalForHuman = (card) => legalSet.some(c => c.suit === card.suit && c.rank === card.rank);

  for (const card of h.hand){
    const b = document.createElement("button");
    b.className = "card-btn";
    b.type = "button";
    b.textContent = cardText(card);

    const legal = canPlayNow && isLegalForHuman(card);
    b.disabled = !legal;
    if (canPlayNow && !legal) b.classList.add("illegal");

    b.classList.toggle("card-red", isRed(card));
    b.classList.toggle("card-black", !isRed(card));

    b.addEventListener("click", () => playCard(state.humanSeat, card));
    handEl.appendChild(b);
  }
}

/* ===== UI wiring ===== */
function initUI(){
  updateOrientationClass();
  window.addEventListener("resize", () => {
    if (state.scene === "bid") renderBid();
    if (state.scene === "dep") renderDep();
    if (state.scene === "discard") renderDiscard();
    if (state.scene === "game") renderGame();
  });
  window.addEventListener("orientationchange", () => setTimeout(() => {
    if (state.scene === "bid") renderBid();
    if (state.scene === "dep") renderDep();
    if (state.scene === "discard") renderDiscard();
    if (state.scene === "game") renderGame();
  }, 50));

  $("btn-start").addEventListener("click", () => setScene("select"));
  $("btn-select-back").addEventListener("click", () => setScene("title"));

  $("btn-bid").addEventListener("click", handleHumanBid);
  $("btn-pass").addEventListener("click", handleHumanPass);
  $("btn-bid-back").addEventListener("click", () => setScene("select"));

  $("btn-dep-ok").addEventListener("click", handleHumanDeputyOk);
  $("btn-dep-back").addEventListener("click", () => setScene("select"));

  $("btn-discard-ok").addEventListener("click", () => {
    if (state.scene !== "discard") return;
    if (state.seats[state.napoleonSeat].isHuman && state.discardSelected.length === 2){
      finalizeDiscard(state.discardSelected.slice());
    }
  });
  $("btn-discard-back").addEventListener("click", () => setScene("select"));

  $("btn-restart").addEventListener("click", () => setScene("select"));
  $("btn-back-title").addEventListener("click", () => setScene("title"));

  $("btn-result-to-title").addEventListener("click", () => setScene("title"));
  $("btn-result-new").addEventListener("click", () => setScene("select"));

  setScene("title");
  applySeatUI();
  buildSelectScene();
  syncBidUIControls();
  syncDepUIControls();
  clearRoleLabels();

  $("cutin").addEventListener("click", hideCutin);

}

document.addEventListener("DOMContentLoaded", initUI);

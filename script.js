/* =========================
   Global Config & Constants
   ========================= */
// 認証は新API（REST v1）
const API_BASE = "https://0wtl8v8ch9.execute-api.ap-northeast-1.amazonaws.com/v1";
const loginApiUrl     = `${API_BASE}/login`;
const registerApiUrl  = `${API_BASE}/register`;

// 感情・履歴は既存の dev エンドポイントを継続利用（必要になったらAPI_BASEに切替）
const emotionApiUrl   = "https://m9n5uqrgil.execute-api.ap-northeast-1.amazonaws.com/dev/emotion";
const historyApiUrl   = "https://lw4077g1f9.execute-api.ap-northeast-1.amazonaws.com/dev/history";

// 7感情の色
const colorMap = {
  "喜び": "#F7D65C",
  "怒り": "#FF6B6B",
  "悲しみ": "#4DA3FF",
  "恐れ": "#7E6BFF",
  "驚き": "#F5A623",
  "疲労": "#BFC5CC",
  "リラックス": "#7EDFB3"
};

// 曜日ラベル
const weekdayLabels = ["日","月","火","水","木","金","土"];

/* ==============
   Small Helpers
   ============== */
function $(sel){ return document.querySelector(sel); }
function getUser(){ return localStorage.getItem("user") || ""; }
function setUser(u){ localStorage.setItem("user", u); }
function clearUser(){ localStorage.removeItem("user"); }
function flashSet(msg){ localStorage.setItem("flash", msg); }
function flashPop(){ const m = localStorage.getItem("flash"); if(m) localStorage.removeItem("flash"); return m||""; }

async function postJSON(url, payload){
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=> ({}));
  return { ok: res.ok, status: res.status, data };
}
async function getJSON(url){
  const res = await fetch(url, { method: "GET" });
  const data = await res.json().catch(()=> ({}));
  return { ok: res.ok, status: res.status, data };
}

/* ==================
   Auth (index.html)
   ================== */
async function login(){
  const u = $("#username")?.value.trim();
  const p = $("#password")?.value.trim();
  const message = $("#message") || $("#msg");
  if(!u || !p){ if(message) message.textContent = "ユーザー名とパスワードを入力してください。"; return; }

  try{
    const {ok, data} = await postJSON(loginApiUrl, { username: u, password: p });
    if(ok && data.message === "ログイン成功"){
      setUser(u);
      location.href = "main.html";
    }else{
      if(message) message.textContent = data.message || "ユーザー名またはパスワードが間違っています。";
    }
  }catch(e){
    if(message) message.textContent = "通信エラーが発生しました。";
  }
}
function logout(){ clearUser(); location.href = "index.html"; }

/* ======================
   Main (main.html 用)
   ====================== */
function initMainHeader(){
  const u = getUser();
  const el = $("#currentUser");
  if(el) el.textContent = u ? `ログイン中：${u}` : "未ログイン";
}

let _selectedEmotion = null;
let _selectedBtn = null;

/** 感情ボタンをクリックした時に選択だけ行う（送信はしない） */
function selectEmotion(emotion, btnEl){
  // ボタンの見た目を切り替え
  if(_selectedBtn) _selectedBtn.classList.remove("selected");
  _selectedBtn = btnEl;
  if(_selectedBtn) _selectedBtn.classList.add("selected");

  _selectedEmotion = emotion;
  const label = $("#selectedLabel");
  const sendBtn = $("#sendBtn");
  if(label) label.textContent = `選択中：${emotion}`;
  if(sendBtn) sendBtn.disabled = false;

  // 既存の sendMessage 表示をリセット
  const msg = $("#sendMessage");
  if(msg) msg.textContent = "";
}

/** 既存の send() をそのまま使って、選択済みを送信する */
async function sendSelected(){
  if(!_selectedEmotion) return;
  await send(_selectedEmotion);

  // 成功・失敗メッセージは既存 send() が #sendMessage に表示
  // 送信後は選択解除
  const label = $("#selectedLabel");
  const sendBtn = $("#sendBtn");
  if(_selectedBtn) _selectedBtn.classList.remove("selected");
  _selectedEmotion = null; _selectedBtn = null;
  if(label) label.textContent = "（まだ選択されていません）";
  if(sendBtn) sendBtn.disabled = true;
}

async function send(emotion){
  const u = getUser();
  const msg = $("#sendMessage") || $("#message");
  if(!u){ if(msg) msg.textContent = "未ログインです。ログインしてから送信してください。"; return; }
  if(!emotion){ if(msg) msg.textContent = "感情が選択されていません。"; return; }

  try{
    const payload = { user: u, emotion: emotion }; // Lambda側で日時付与
    const {ok, data} = await postJSON(emotionApiUrl, payload);
    if(ok){ if(msg) msg.textContent = `「${emotion}」を送信しました。`; }
    else { if(msg) msg.textContent = (data && data.message) ? data.message : "送信に失敗しました。"; }
  }catch(e){
    if(msg) msg.textContent = "通信エラーが発生しました。";
  }
}

/* =========================
   History (history.html 用)
   ========================= */
function aggregateHistory(items, mode /* "daily" | "weekday" */) {
  const wd = ["日","月","火","水","木","金","土"];
  const grouped = new Map();
  for (const it of items) {
    const ts = it.timestamp;
    if (!ts) continue;

    let key;
    if (mode === "weekday") {
      const d = new Date(ts);
      if (isNaN(d.getTime())) continue;
      key = wd[d.getDay()];
    } else {
      key = String(ts).slice(0, 10);
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ emotion: it.emotion, timestamp: ts });
  }

  let labels = Array.from(grouped.keys());
  if (mode === "weekday") labels = wd; else labels.sort();

  const emotions = Object.keys(colorMap);
  const seriesByEmotion = {};
  for (const emo of emotions) {
    seriesByEmotion[emo] = labels.map(label => {
      const arr = grouped.get(label) || [];
      return arr.filter(e => e.emotion === emo).length;
    });
  }
  return { labels, seriesByEmotion };
}

async function loadDailyHistory(){
  const u = getUser();
  const msg = $("#historyMessage") || $("#message");
  if(!u){ if(msg) msg.textContent = "未ログインです。"; return { labels: [], seriesByEmotion: {} }; }

  try{
    const url = `${historyApiUrl}?user=${encodeURIComponent(u)}`;
    const {ok, data} = await getJSON(url);
    if(!ok || !Array.isArray(data)){
      if(msg) msg.textContent = (data && data.message) ? data.message : "履歴取得に失敗しました。";
      return { labels: [], seriesByEmotion: {} };
    }
    return aggregateHistory(data, "daily");
  }catch(e){
    if(msg) msg.textContent = "通信エラーが発生しました。";
    return { labels: [], seriesByEmotion: {} };
  }
}

async function loadWeekdayHistory(){
  const u = getUser();
  const msg = $("#historyMessage") || $("#message");
  if(!u){ if(msg) msg.textContent = "未ログインです。"; return { labels: weekdayLabels, seriesByEmotion: {} }; }

  try{
    const url = `${historyApiUrl}?user=${encodeURIComponent(u)}`;
    const {ok, data} = await getJSON(url);
    if(!ok || !Array.isArray(data)){
      if(msg) msg.textContent = (data && data.message) ? data.message : "履歴取得に失敗しました。";
      return { labels: weekdayLabels, seriesByEmotion: {} };
    }
    return aggregateHistory(data, "weekday");
  }catch(e){
    if(msg) msg.textContent = "通信エラーが発生しました。";
    return { labels: weekdayLabels, seriesByEmotion: {} };
  }
}

/* ======================
   Optional: Page Helper
   ====================== */
function showFlashIfAny(targetSelector="#flash"){
  const el = $(targetSelector);
  if(!el) return;
  const f = flashPop();
  if(f) el.textContent = f;
}

// Expose (他ページ互換のため公開）
window.login = login;
window.logout = logout;
window.initMainHeader = initMainHeader;
window.send = send;                 // 互換のため残す
window.selectEmotion = selectEmotion;
window.sendSelected = sendSelected;
window.loadDailyHistory = loadDailyHistory;
window.loadWeekdayHistory = loadWeekdayHistory;
window.showFlashIfAny = showFlashIfAny;
window.colorMap = colorMap;
window.weekdayLabels = weekdayLabels;

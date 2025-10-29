// APIのベースURL
const API_BASE = "https://0wtl8v8ch9.execute-api.ap-northeast-1.amazonaws.com/v1";
const emotionApiUrl = "https://m9n5uqrgil.execute-api.ap-northeast-1.amazonaws.com/dev/emotion";
const historyApiUrl = "https://lw4077g1f9.execute-api.ap-northeast-1.amazonaws.com/dev/history";

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

// DOM要素の取得
const emotionButtons = document.querySelectorAll(".emotion-button");
const historyContainer = document.getElementById("emotion-history");

// ログインユーザー情報（仮にlocalStorageで保持）
let currentUser = localStorage.getItem("username") || "匿名ユーザー";

// ページ読み込み時に履歴を取得して表示
window.addEventListener("DOMContentLoaded", () => {
  loadEmotionHistory();
});

// 感情ボタンがクリックされたとき
emotionButtons.forEach(button => {
  button.addEventListener("click", () => {
    const emotion = button.dataset.emotion;  // ボタンに対応する感情を取得
    sendEmotion(emotion);
  });
});

// 感情をAPIに送信
function sendEmotion(emotion) {
  const payload = {
    user: currentUser,
    emotion: emotion,
    timestamp: new Date().toISOString(),
  };

  fetch(emotionApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
    console.log("Emotion sent:", data);
    loadEmotionHistory();  // 新しい感情を送信後、履歴を再読み込み
  })
  .catch(error => {
    console.error("Error sending emotion:", error);
  });
}

// 履歴を取得して表示
function loadEmotionHistory() {
  const params = new URLSearchParams({ user: currentUser, group: "daily" });

  fetch(`${historyApiUrl}?${params.toString()}`)
    .then(response => response.json())
    .then(data => {
      displayEmotionHistory(data);
    })
    .catch(error => {
      console.error("Error loading emotion history:", error);
    });
}

// 履歴をHTMLに表示
function displayEmotionHistory(data) {
  if (!data || data.length === 0) {
    historyContainer.innerHTML = "<p>まだ感情履歴はありません。</p>";
    return;
  }

  historyContainer.innerHTML = "<h3>感情履歴</h3>";
  const historyList = document.createElement("ul");

  data.forEach(entry => {
    const listItem = document.createElement("li");
    listItem.style.color = colorMap[entry.emotion];
    listItem.textContent = `${entry.timestamp}: ${entry.emotion}`;
    historyList.appendChild(listItem);
  });

  historyContainer.appendChild(historyList);
}

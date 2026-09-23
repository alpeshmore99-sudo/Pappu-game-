const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Pappu Playing Picture - Casino 3D</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background: #030712; color: #f8fafc;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden; width: 100vw; height: 100vh;
      display: flex; justify-content: center; align-items: center;
    }
    .screen { display: none; width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; background: #030712; }
    .screen.active { display: flex; }
    #login-screen { justify-content: center; align-items: center; flex-direction: column; background: radial-gradient(circle, #1e293b 0%, #030712 100%); }
    .login-box { background: #0f172a; border: 2px solid #d97706; padding: 30px; border-radius: 12px; text-align: center; width: 320px; box-shadow: 0 0 25px rgba(217,119,6,0.5); }
    .login-box h2 { color: #facc15; margin-bottom: 20px; font-size: 22px; }
    .login-input { width: 100%; padding: 10px; margin-bottom: 15px; background: #1e293b; border: 1px solid #475569; color: #fff; border-radius: 6px; font-size: 14px; text-align: center; }
    .login-btn { width: 100%; padding: 10px; background: #2563eb; color: #fff; border: none; font-weight: bold; border-radius: 6px; cursor: pointer; text-transform: uppercase; }
    #dashboard-screen { flex-direction: column; padding: 20px; background: #0b0f19; }
    .dash-header { display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 15px 25px; border-radius: 10px; border: 1px solid #334155; }
    .dash-title { color: #facc15; font-size: 20px; font-weight: bold; }
    .dash-points { color: #22c55e; font-size: 18px; font-weight: bold; }
    .dash-body { display: flex; gap: 20px; margin-top: 20px; height: calc(100% - 80px); }
    .dash-card { background: #111827; border: 1px solid #374151; border-radius: 10px; flex: 1; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
    .dash-card:hover { border-color: #facc15; background: #1f2937; transform: translateY(-3px); }
    .dash-card-icon { font-size: 40px; margin-bottom: 10px; }
    .dash-card-title { font-size: 16px; font-weight: bold; color: #f8fafc; }
    #game-screen { justify-content: center; align-items: center; background: #030712; }
    .game-wrapper {
      width: 950px; height: 480px;
      background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
      border: 3px solid #d97706; border-radius: 12px;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 8px 12px; box-shadow: 0 0 30px rgba(217, 119, 6, 0.5); position: relative;
    }
    .header-top {
      background: #1e293b; border: 2px solid #334155; border-radius: 8px; padding: 6px 15px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .game-title { color: #facc15; font-size: 18px; font-weight: 900; text-transform: uppercase; cursor: pointer; }
    .stat-group { display: flex; gap: 20px; align-items: center; }
    .stat-item { text-align: center; }
    .stat-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .stat-val { font-size: 16px; font-weight: bold; color: #facc15; }
    .stat-val.time { color: #f87171; }
    .wheel-container {
      position: absolute; top: 50px; left: 50%; transform: translateX(-50%);
      width: 65px; height: 65px; background: radial-gradient(circle, #fbbf24 0%, #b45309 100%);
      border: 3px solid #facc15; border-radius: 50%; display: flex; justify-content: center; align-items: center;
      box-shadow: 0 0 20px rgba(250, 204, 21, 0.9); z-index: 10; transition: 0.3s;
    }
    .wheel-container.spinning { animation: spinWheel 0.8s linear infinite; }
    @keyframes spinWheel { 0% { transform: translateX(-50%) rotate(0deg); } 100% { transform: translateX(-50%) rotate(360deg); } }
    .wheel-inner { font-size: 28px; }
    .symbols-grid {
      display: grid; grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(2, 1fr);
      gap: 6px; margin-top: 25px; position: relative;
    }
    .symbol-box {
      background: linear-gradient(to bottom, #1e293b, #0f172a); border: 2px solid #3b82f6;
      border-radius: 8px; padding: 6px 4px; text-align: center; cursor: pointer; position: relative; transition: 0.2s;
    }
    .symbol-box.winner-flash {
      border-color: #22c55e !important; background: #064e3b !important;
      animation: flashEffect 0.5s ease infinite alternate;
    }
    @keyframes flashEffect { 0% { box-shadow: 0 0 5px #22c55e; } 100% { box-shadow: 0 0 25px #22c55e; } }
    .symbol-icon { font-size: 22px; margin-bottom: 2px; }
    .symbol-title { font-size: 11px; font-weight: bold; color: #e2e8f0; }
    .symbol-bet-amt {
      background: #ef4444; color: #fff; font-size: 10px; font-weight: bold;
      border-radius: 8px; padding: 1px 5px; display: inline-block; margin-top: 2px;
    }
    .footer-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: #0f172a; padding: 6px 10px; border-radius: 8px; border: 1px solid #334155;
    }
    .chips-row { display: flex; gap: 6px; }
    .chip-btn {
      width: 36px; height: 36px; border-radius: 50%; border: 2px solid #475569;
      font-weight: bold; font-size: 11px; cursor: pointer; display: flex; justify-content: center; align-items: center;
    }
    .chip-btn:nth-child(1) { background: #10b981; color: #fff; }
    .chip-btn:nth-child(2) { background: #3b82f6; color: #fff; }
    .chip-btn:nth-child(3) { background: #8b5cf6; color: #fff; }
    .chip-btn:nth-child(4) { background: #f59e0b; color: #fff; }
    .chip-btn:nth-child(5) { background: #ef4444; color: #fff; }
    .chip-btn.selected { border: 3px solid #facc15; transform: scale(1.15); box-shadow: 0 0 12px #facc15; }
    .action-buttons { display: flex; gap: 8px; }
    .action-btn { padding: 6px 16px; border-radius: 6px; font-weight: bold; font-size: 12px; border: none; cursor: pointer; color: white; text-transform: uppercase; }
    .btn-ok { background: #2563eb; }
    .btn-take { background: #059669; }
    .btn-take.flashing { animation: takeFlash 0.5s infinite alternate; }
    @keyframes takeFlash { 0% { background: #059669; box-shadow: 0 0 5px #22c55e; } 100% { background: #16a34a; box-shadow: 0 0 20px #22c55e; transform: scale(1.05); } }
    .btn-cancel { background: #dc2626; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <div id="login-screen" class="screen active">
    <div class="login-box">
      <h2>पप्पु लॉगिन</h2>
      <input type="text" id="username-input" class="login-input" placeholder="नाव टाका">
      <input type="password" id="password-input" class="login-input" placeholder="पासवर्ड टाका">
      <button class="login-btn" onclick="loginUser()">प्रवेश करा</button>
    </div>
  </div>
  <div id="dashboard-screen" class="screen">
    <div class="dash-header">
      <div class="dash-title" id="welcome-user">स्वागत आहे!</div>
      <div class="dash-points">पॉइंट्स: <span id="dash-points-val">5000</span></div>
    </div>
    <div class="dash-body">
      <div class="dash-card" onclick="alert('कमिंग सून')">
        <div class="dash-card-icon">📥</div>
        <div class="dash-card-title">पॉइंट्स रिसीव्ह</div>
      </div>
      <div class="dash-card" onclick="alert('कमिंग सून')">
        <div class="dash-card-icon">📤</div>
        <div class="dash-card-title">पॉइंट्स ट्रान्सफर</div>
      </div>
      <div class="dash-card" onclick="goToGame()">
        <div class="dash-card-icon">🎰</div>
        <div class="dash-card-title">कॅसिनो गेम खेळा</div>
      </div>
    </div>
  </div>
  <div id="game-screen" class="screen">
    <div class="game-wrapper">
      <div class="header-top">
        <div class="stat-group">
          <div class="stat-item"><div class="stat-label">पॉइंट्स</div><div class="stat-val" id="user-points">5000</div></div>
          <div class="stat-item"><div class="stat-label">वेळ</div><div class="stat-val time" id="user-timer">60</div></div>
        </div>
        <div class="game-title" onclick="goToDashboard()">⬅ डॅशबोर्डवर जा</div>
        <div class="stat-group">
          <div class="stat-item"><div class="stat-label">एकूण बेट</div><div class="stat-val" id="total-bet">0</div></div>
          <div class="stat-item"><div class="stat-label">विजेता</div><div class="stat-val" id="last-winner">0</div></div>
        </div>
      </div>
      <div class="wheel-container" id="main-wheel"><div class="wheel-inner">🎯</div></div>
      <div class="symbols-grid" id="symbols-grid"></div>
      <div class="footer-bar">
        <div class="chips-row">
          <button class="chip-btn selected" onclick="selectChip(5, this)">5</button>
          <button class="chip-btn" onclick="selectChip(10, this)">10</button>
          <button class="chip-btn" onclick="selectChip(50, this)">50</button>
          <button class="chip-btn" onclick="selectChip(100, this)">100</button>
          <button class="chip-btn" onclick="selectChip(500, this)">500</button>
        </div>
        <div class="action-buttons">
          <button class="action-btn btn-ok" onclick="submitBets()">बेट ओके</button>
          <button class="action-btn btn-take" id="btn-take" onclick="takeWinnings()" disabled>टेक</button>
          <button class="action-btn btn-cancel" onclick="clearBets()">रद्द करा</button>
        </div>
      </div>
    </div>
  </div>
  <script>
    var socket = io();
    var selectedChip = 5;
    var userBets = {};
    var committedBets = {};
    var userPoints = 5000;
    var wonAmount = 0;
    var isBettingClosed = false;

    const SYMBOLS = [
      { key: 'chhatri', name: 'छत्री', icon: '🌂' },
      { key: 'ball', name: 'बॉल', icon: '⚽' },
      { key: 'sun', name: 'सूर्य', icon: '☀️' },
      { key: 'lamp', name: 'दिवा', icon: '🪔' },
      { key: 'cow', name: 'गाय', icon: '🐄' },
      { key: 'bucket', name: 'बादली', icon: '🪣' },
      { key: 'kite', name: 'पतंग', icon: '🪁' },
      { key: 'top', name: 'भोरा', icon: '🪀' },
      { key: 'flower', name: 'फूल', icon: '🌸' },
      { key: 'butterfly', name: 'फुलपाखरू', icon: '🦋' },
      { key: 'pigeon', name: 'कबुतर', icon: '🕊️' },
      { key: 'rabbit', name: 'ससा', icon: '🐇' }
    ];

    function loginUser() {
      let name = document.getElementById('username-input').value;
      if (!name) { alert('नाव टाका'); return; }
      document.getElementById('welcome-user').innerText = 'स्वागत आहे, ' + name;
      document.getElementById('login-screen').classList.remove('active');
      document.getElementById('dashboard-screen').classList.add('active');
    }
    function goToGame() {
      document.getElementById('dashboard-screen').classList.remove('active');
      document.getElementById('game-screen').classList.add('active');
      renderGrid();
    }
    function goToDashboard() {
      document.getElementById('game-screen').classList.remove('active');
      document.getElementById('dashboard-screen').classList.add('active');
    }
    function renderGrid() {
      var grid = document.getElementById('symbols-grid');
      grid.innerHTML = '';
      SYMBOLS.forEach(s => {
        var currentBet = userBets[s.key] || 0;
        grid.innerHTML += \`<div class="symbol-box" id="box-\${s.key}" onclick="placeBet('\${s.key}')"><div class="symbol-icon">\${s.icon}</div><div class="symbol-title">\${s.name}</div><div class="symbol-bet-amt" id="bet-\${s.key}" style="display: \${currentBet ? 'inline-block' : 'none'};">\${currentBet}</div></div>\`;
      });
    }
    function selectChip(amount, btn) {
      selectedChip = amount;
      document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }
    function placeBet(key) {
      if (isBettingClosed) return;
      if (userPoints < selectedChip) return;
      if (!userBets[key]) userBets[key] = 0;
      userBets[key] += selectedChip;
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      document.getElementById('total-bet').innerText = total;
      renderGrid();
    }
    function clearBets() {
      if (isBettingClosed) return;
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      userPoints += total;
      userBets = {};
      document.getElementById('user-points').innerText = userPoints;
      document.getElementById('total-bet').innerText = '0';
      renderGrid();
    }
    function submitBets() {
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      if (total === 0) return;
      if (userPoints < total) return;
      userPoints -= total;
      document.getElementById('user-points').innerText = userPoints;
      committedBets = {...userBets};
      userBets = {};
      document.getElementById('total-bet').innerText = '0';
      renderGrid();
    }
    function takeWinnings() {
      if (wonAmount > 0) {
        userPoints += wonAmount;
        document.getElementById('user-points').innerText = userPoints;
        document.getElementById('last-winner').innerText = '0';
        wonAmount = 0;
        let takeBtn = document.getElementById('btn-take');
        takeBtn.disabled = true;
        takeBtn.classList.remove('flashing');
        document.querySelectorAll('.symbol-box').forEach(b => b.classList.remove('winner-flash'));
      }
    }
    socket.on('timer-update', function(data) {
      let time = data.time;
      document.getElementById('user-timer').innerText = time;
      if (time <= 10) {
        isBettingClosed = true;
        document.getElementById('main-wheel').classList.add('spinning');
        let total = Object.values(userBets).reduce((a, b) => a + b, 0);
        if (total > 0 && userPoints >= total) {
          userPoints -= total;
          document.getElementById('user-points').innerText = userPoints;
          committedBets = {...userBets};
          userBets = {};
          document.getElementById('total-bet').innerText = '0';
          renderGrid();
        }
      } else {
        isBettingClosed = false;
        document.getElementById('main-wheel').classList.remove('spinning');
      }
      if (time === 5) {
        let randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        document.querySelectorAll('.symbol-box').forEach(b => b.classList.remove('winner-flash'));
        let winBox = document.getElementById('box-' + randomSymbol.key);
        if (winBox) winBox.classList.add('winner-flash');
        wonAmount = (committedBets[randomSymbol.key] || 0) * 10;
        committedBets = {};
        document.getElementById('last-winner').innerText = wonAmount;
        if (wonAmount > 0) {
          let takeBtn = document.getElementById('btn-take');
          takeBtn.disabled = false;
          takeBtn.classList.add('flashing');
        }
      }
    });
    renderGrid();
  </script>
</body>
</html>`);
});

io.on('connection', (socket) => {
    let timeLeft = 60;
    socket.emit('timer-update', { time: timeLeft });
    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) { timeLeft = 60; }
        io.io.emit('timer-update', { time: timeLeft }); // small fix: io.emit
    }, 1000);
    socket.on('disconnect', () => { clearInterval(timerInterval); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

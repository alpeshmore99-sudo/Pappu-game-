const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
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

    /* Screen Management */
    .screen { display: none; width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; background: #030712; }
    .screen.active { display: flex; }

    /* Login Screen */
    #login-screen { justify-content: center; align-items: center; flex-direction: column; background: radial-gradient(circle, #1e293b 0%, #030712 100%); }
    .login-box { background: #0f172a; border: 2px solid #d97706; padding: 30px; border-radius: 12px; text-align: center; width: 320px; box-shadow: 0 0 25px rgba(217,119,6,0.5); }
    .login-box h2 { color: #facc15; margin-bottom: 20px; font-size: 22px; }
    .login-input { width: 100%; padding: 10px; margin-bottom: 15px; background: #1e293b; border: 1px solid #475569; color: #fff; border-radius: 6px; font-size: 14px; text-align: center; }
    .login-btn { width: 100%; padding: 10px; background: #2563eb; color: #fff; border: none; font-weight: bold; border-radius: 6px; cursor: pointer; text-transform: uppercase; }

    /* Dashboard Screen */
    #dashboard-screen { flex-direction: column; padding: 20px; background: #0b0f19; }
    .dash-header { display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 15px 25px; border-radius: 10px; border: 1px solid #334155; }
    .dash-title { color: #facc15; font-size: 20px; font-weight: bold; }
    .dash-points { color: #22c55e; font-size: 18px; font-weight: bold; }
    .dash-body { display: flex; gap: 20px; margin-top: 20px; height: calc(100% - 80px); }
    .dash-card { background: #111827; border: 1px solid #374151; border-radius: 10px; flex: 1; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
    .dash-card:hover { border-color: #facc15; background: #1f2937; transform: translateY(-3px); }
    .dash-card-icon { font-size: 40px; margin-bottom: 10px; }
    .dash-card-title { font-size: 16px; font-weight: bold; color: #f8fafc; }

    /* Game Screen (Landscape Forced & Centered) */
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

    /* Improved 3D Wheel Area */
    .wheel-container {
      position: absolute; top: 50px; left: 50%; transform: translateX(-50%);
      width: 65px; height: 65px; background: radial-gradient(circle, #fbbf24 0%, #b45309 100%);
      border: 3px solid #facc15; border-radius: 50%; display: flex; justify-content: center; align-items: center;
      box-shadow: 0 0 20px rgba(250, 204, 21, 0.9); z-index: 10; transition: 0.3s;
    }
    .wheel-container.spinning { animation: spinWheel 0.8s linear infinite; }
    @keyframes spinWheel { 0% { transform: translateX(-50%) rotate(0deg); } 100% { transform: translateX(-50%) rotate(360deg); } }
    .wheel-inner { font-size: 28px; }

    /* Symbols Grid */
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

    /* Footer Bar */
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

    /* Popup Overlay for Big Symbol View */
    #symbol-popup {
      display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(3, 7, 18, 0.85); justify-content: center; align-items: center; z-index: 100; flex-direction: column;
    }
    .big-popup-box {
      background: linear-gradient(135deg, #1e293b, #0f172a); border: 4px solid #facc15;
      padding: 30px 50px; border-radius: 20px; text-align: center; box-shadow: 0 0 40px rgba(250,204,21,0.8);
      animation: popIn 0.3s cubic-bezier(0.1, 0.7, 0.1, 1);
    }
    @keyframes popIn { 0% { transform: scale(0.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    .big-popup-icon { font-size: 80px; margin-bottom: 10px; }
    .big-popup-name { font-size: 24px; color: #facc15; font-weight: bold; }

    /* Result Overlay Modal */
    #result-modal {
      display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(3, 7, 18, 0.9); justify-content: center; align-items: center; z-index: 90; flex-direction: column;
    }
    .popup-wheel-box {
      width: 110px; height: 110px; border: 4px solid #facc15; border-radius: 50%;
      background: radial-gradient(circle, #1e293b 0%, #0f172a 100%);
      display: flex; justify-content: center; align-items: center; font-size: 55px;
      animation: popupSpin 1.2s cubic-bezier(0.1, 0.7, 0.1, 1) infinite; margin-bottom: 15px;
    }
    @keyframes popupSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .popup-winner-title { color: #facc15; font-size: 20px; font-weight: bold; }
  </style>
</head>
<body>

  <!-- 1. LOGIN SCREEN -->
  <div id="login-screen" class="screen active">
    <div class="login-box">
      <h2>Pappu Login</h2>
      <input type="text" id="username-input" class="login-input" placeholder="तुमचे नाव टाका">
      <input type="password" id="password-input" class="login-input" placeholder="पासवर्ड टाका">
      <button class="login-btn" onclick="loginUser()">प्रवेश करा (Login)</button>
    </div>
  </div>

  <!-- 2. DASHBOARD SCREEN -->
  <div id="dashboard-screen" class="screen">
    <div class="dash-header">
      <div class="dash-title" id="welcome-user">स्वागत आहे!</div>
      <div class="dash-points">Points: <span id="dash-points-val">5000</span></div>
    </div>
    <div class="dash-body">
      <div class="dash-card" onclick="openReceiveModal()">
        <div class="dash-card-icon">📥</div>
        <div class="dash-card-title">Points Receive</div>
      </div>
      <div class="dash-card" onclick="openTransferModal()">
        <div class="dash-card-icon">📤</div>
        <div class="dash-card-title">Points Transfer</div>
      </div>
      <div class="dash-card" onclick="goToGame()">
        <div class="dash-card-icon">🎰</div>
        <div class="dash-card-title">Pappu Casino Game</div>
      </div>
    </div>
  </div>

  <!-- 3. GAME SCREEN -->
  <div id="game-screen" class="screen">
    <div class="game-wrapper">
      <div class="header-top">
        <div class="stat-group">
          <div class="stat-item"><div class="stat-label">Points</div><div class="stat-val" id="user-points">5000</div></div>
          <div class="stat-item"><div class="stat-label">Time</div><div class="stat-val time" id="user-timer">60</div></div>
        </div>
        <div class="game-title" onclick="goToDashboard()">⬅ Pappu Game Menu</div>
        <div class="stat-group">
          <div class="stat-item"><div class="stat-label">Total Bet</div><div class="stat-val" id="total-bet">0</div></div>
          <div class="stat-item"><div class="stat-label">Winner</div><div class="stat-val" id="last-winner">0</div></div>
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
          <button class="action-btn btn-ok" id="btn-ok" onclick="submitBets()">Bet OK</button>
          <button class="action-btn btn-take" id="btn-take" onclick="takeWinnings()" disabled>Take</button>
          <button class="action-btn btn-cancel" id="btn-cancel" onclick="clearBets()">Cancel</button>
        </div>
      </div>
    </div>
  </div>

  <!-- BIG POPUP ON BETTING -->
  <div id="symbol-popup">
    <div class="big-popup-box">
      <div class="big-popup-icon" id="popup-sym-icon"></div>
      <div class="big-popup-name" id="popup-sym-name"></div>
    </div>
  </div>

  <!-- RESULT MODAL -->
  <div id="result-modal">
    <div class="popup-wheel-box" id="popup-emoji">🎯</div>
    <div class="popup-winner-title" id="popup-text">निकाल जाहीर होत आहे...</div>
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
      if (!name) { alert('कृपया नाव टाка!'); return; }
      document.getElementById('welcome-user').innerText = 'स्वागत आहे, ' + name + '!';
      switchScreen('dashboard-screen');
    }

    function switchScreen(screenId) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(screenId).classList.add('active');
    }

    function goToGame() { switchScreen('game-screen'); renderGrid(); }
    function goToDashboard() { switchScreen('dashboard-screen'); }
    function openReceiveModal() { alert('Points Receive करण्याची सुविधा लवकरच चालू होईल.'); }
    function openTransferModal() { alert('Points Transfer करण्याची सुविधा लवकरच चालू होईल.'); }

    function renderGrid() {
      var grid = document.getElementById('symbols-grid');
      grid.innerHTML = '';
      SYMBOLS.forEach(s => {
        var currentBet = userBets[s.key] || 0;
        grid.innerHTML += `
          <div class="symbol-box" id="box-\${s.key}" onclick="placeBet('\${s.key}', '\${s.name}', '\${s.icon}')">
            <div class="symbol-icon">\${s.icon}</div>
            <div class="symbol-title">\${s.name}</div>
            <div class="symbol-bet-amt" id="bet-\${s.key}" style="display: \${currentBet ? 'inline-block' : 'none'};">\${currentBet}</div>
          </div>
        `;
      });
    }

    function selectChip(amount, btn) {
      selectedChip = amount;
      document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }

    function placeBet(key, name, icon) {
      if (isBettingClosed) { alert('शेवटच्या १० सेकंदात बेट लावणं बंद आहे!'); return; }
      if (userPoints < selectedChip) { alert('पुरा पॉईंट्स नाहीत!'); return; }

      // Popup big symbol view & disable wheel temporarily
      showSymbolPopup(icon, name);

      if (!userBets[key]) userBets[key] = 0;
      userBets[key] += selectedChip;
      
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      document.getElementById('total-bet').innerText = total;
      renderGrid();
    }

    function showSymbolPopup(icon, name) {
      let popup = document.getElementById('symbol-popup');
      document.getElementById('popup-sym-icon').innerText = icon;
      document.getElementById('popup-sym-name').innerText = name;
      popup.style.display = 'flex';
      
      // Disable wheel rotation/interaction temporarily
      document.getElementById('main-wheel').style.pointerEvents = 'none';

      setTimeout(() => {
        popup.style.display = 'none';
        document.getElementById('main-wheel').style.pointerEvents = 'auto';
      }, 600);
    }

    function clearBets() {
      if (isBettingClosed) return;
      // Refund points if cleared before OK
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      userPoints += total;
      userBets = {};
      document.getElementById('user-points').innerText = userPoints;
      document.getElementById('total-bet').innerText = '0';
      renderGrid();
    }

    function submitBets() {
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      if (total === 0) { alert('कृपया आधी बेट लावा!'); return; }
      
      if (userPoints < total) { alert('पुरा पॉईंट्स नाहीत!'); return; }
      
      userPoints -= total; // Deduct from main score points
      document.getElementById('user-points').innerText = userPoints;
      committedBets = {...userBets};
      userBets = {};
      document.getElementById('total-bet').innerText = '0';
      renderGrid();
      alert('बेट यशस्वीरीत्या स्वीकारली गेली!');
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
        alert('पॉइंट्स यशस्वीपणे जमा झाले!');
      }
    }

    // Socket Timer Listener (60 seconds cycle, last 10 secs waiting)
    socket.on('timer-update', function(data) {
      let time = data.time;
      document.getElementById('user-timer').innerText = time;

      if (time <= 10) {
        isBettingClosed = true;
        document.getElementById('main-wheel').classList.add('spinning');
        
        // Auto submit if uncommitted bets exist
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
        let modal = document.getElementById('result-modal');
        document.getElementById('popup-emoji').innerText = randomSymbol.icon;
        document.getElementById('popup-text').innerText = 'विजेता: ' + randomSymbol.name;
        modal.style.display = 'flex';

        setTimeout(() => {
          modal.style.display = 'none';
          document.querySelectorAll('.symbol-box').forEach(b => b.classList.remove('winner-flash'));
          let winBox = document.getElementById('box-' + randomSymbol.key);
          if (winBox) winBox.classList.add('winner-flash');

          // Calculate winnings based on committed bets
          wonAmount = (committedBets[randomSymbol.key] || 0) * 10;
          committedBets = {};
          document.getElementById('last-winner').innerText = wonAmount;

          if (wonAmount > 0) {
            let takeBtn = document.getElementById('btn-take');
            takeBtn.disabled = false;
            takeBtn.classList.add('flashing'); // Flash take button
          }
        }, 3000);
      }
    });

    renderGrid();
  </script>
</body>
</html>
    `);
});

// Server Timer Logic (60 seconds countdown)
io.on('connection', (socket) => {
    console.log('A user connected');
    let timeLeft = 60;
    
    // Send initial timer
    socket.emit('timer-update', { time: timeLeft });

    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            timeLeft = 60;
        }
        io.emit('timer-update', { time: timeLeft });
    }, 1000);

    socket

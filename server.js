const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Direct 3D Casino UI embedded in Server to avoid missing path issues
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
      background: #030712;
      color: #f8fafc;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .game-wrapper {
      width: 100%; max-width: 950px; height: 100%; max-height: 480px;
      background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
      border: 3px solid #d97706; border-radius: 12px;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 8px 12px; box-shadow: 0 0 30px rgba(217, 119, 6, 0.5); position: relative;
    }
    .header-top {
      background: #1e293b; border: 2px solid #334155; border-radius: 8px; padding: 6px 15px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .game-title { color: #facc15; font-size: 18px; font-weight: 900; text-transform: uppercase; }
    .stat-group { display: flex; gap: 20px; align-items: center; }
    .stat-item { text-align: center; }
    .stat-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .stat-val { font-size: 16px; font-weight: bold; color: #facc15; }
    .stat-val.time { color: #f87171; }

    .wheel-container {
      position: absolute; top: 50px; left: 50%; transform: translateX(-50%);
      width: 60px; height: 60px; background: radial-gradient(circle, #334155 0%, #0f172a 100%);
      border: 3px solid #facc15; border-radius: 50%; display: flex; justify-content: center; align-items: center;
      box-shadow: 0 0 15px rgba(250, 204, 21, 0.8); z-index: 10;
    }
    .wheel-inner { font-size: 26px; animation: spinWheel 3s linear infinite; }
    @keyframes spinWheel { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .symbols-grid {
      display: grid; grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(2, 1fr);
      gap: 6px; margin-top: 25px;
    }
    .symbol-box {
      background: linear-gradient(to bottom, #1e293b, #0f172a); border: 2px solid #3b82f6;
      border-radius: 8px; padding: 6px 4px; text-align: center; cursor: pointer; position: relative;
    }
    .symbol-box.winner-flash {
      border-color: #22c55e !important; background: #064e3b !important;
      animation: flashEffect 0.5s ease infinite alternate;
    }
    @keyframes flashEffect { 0% { box-shadow: 0 0 5px #22c55e; } 100% { box-shadow: 0 0 20px #22c55e; } }
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
    .btn-cancel { background: #dc2626; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    #result-modal {
      display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(3, 7, 18, 0.9); justify-content: center; align-items: center; z-index: 100; flex-direction: column;
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
  <div class="game-wrapper">
    <div class="header-top">
      <div class="stat-group">
        <div class="stat-item"><div class="stat-label">Points</div><div class="stat-val" id="user-points">4150</div></div>
        <div class="stat-item"><div class="stat-label">Time</div><div class="stat-val time" id="user-timer">30</div></div>
      </div>
      <div class="game-title">Pappu Playing Picture</div>
      <div class="stat-group">
        <div class="stat-item"><div class="stat-label">Total Bet</div><div class="stat-val" id="total-bet">0</div></div>
        <div class="stat-item"><div class="stat-label">Winner</div><div class="stat-val" id="last-winner">0</div></div>
      </div>
    </div>

    <div class="wheel-container"><div class="wheel-inner">🎯</div></div>

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
        <button class="action-btn btn-ok" onclick="submitBets()">Bet OK</button>
        <button class="action-btn btn-take" id="btn-take" onclick="takeWinnings()" disabled>Take</button>
        <button class="action-btn btn-cancel" onclick="clearBets()">Cancel</button>
      </div>
    </div>
  </div>

  <div id="result-modal">
    <div class="popup-wheel-box" id="popup-emoji">🎯</div>
    <div class="popup-winner-title" id="popup-text">निकाल जाहीर होत आहे...</div>
  </div>

  <script>
    var socket = io();
    var selectedChip = 5;
    var userBets = {};
    var userPoints = 4150;
    var wonAmount = 0;

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

    function renderGrid() {
      var grid = document.getElementById('symbols-grid');
      grid.innerHTML = '';
      SYMBOLS.forEach(s => {
        var currentBet = userBets[s.key] || '';
        grid.innerHTML += \`
          <div class="symbol-box" id="box-\${s.key}" onclick="placeBet('\${s.key}')">
            <div class="symbol-icon">\${s.icon}</div>
            <div class="symbol-title">\${s.name}</div>
            <div class="symbol-bet-amt" id="bet-\${s.key}" style="display: \${currentBet ? 'inline-block' : 'none'};">\${currentBet}</div>
          </div>
        \`;
      });
    }

    function selectChip(amount, btn) {
      selectedChip = amount;
      document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }

    function placeBet(key) {
      if (!userBets[key]) userBets[key] = 0;
      userBets[key] += selectedChip;
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      document.getElementById('total-bet').innerText = total;
      renderGrid();
    }

    function clearBets() {
      userBets = {};
      document.getElementById('total-bet').innerText = '0';
      renderGrid();
    }

    function submitBets() {
      let total = Object.values(userBets).reduce((a, b) => a + b, 0);
      if (total === 0) { alert('कृपया आधी बेट लावा!'); return; }
      if (userPoints < total) { alert('पुरा पॉईंट्स नाहीत!'); return; }
      userPoints -= total;
      document.getElementById('user-points').innerText = userPoints;
      alert('बेट स्वीकारली गेली!');
    }

    function takeWinnings() {
      if (wonAmount > 0) {
        userPoints += wonAmount;
        document.getElementById('user-points').innerText = userPoints;
        document.getElementById('last-winner').innerText = '0';
        wonAmount = 0;
        document.getElementById('btn-take').disabled = true;
        document.querySelectorAll('.symbol-box').forEach(b => b.classList.remove('winner-flash'));
        alert('पॉइंट्स जमा झाले!');
      }
    }

    socket.on('timer-update', function(time) {
      document.getElementById('user-timer').innerText = time;
      if (time === 5) {
        let randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        // Trigger Popup
        let modal = document.getElementById('result-modal');
        document.getElementById('popup-emoji').innerText = randomSymbol.icon;
        document.getElementById('popup-text').innerText = 'विजेता: ' + randomSymbol.name;
        modal.style.display = 'flex';

        setTimeout(() => {
          modal.style.display = 'none';
          document.querySelectorAll('.symbol-box').forEach(b => b.classList.remove('winner-flash'));
          let winBox = document.getElementById('box-' + randomSymbol.key);
          if (winBox) winBox.classList.add('winner-flash');

          wonAmount = (userBets[randomSymbol.key] || 0) * 10;
          document.getElementById('last-winner').innerText = wonAmount;
          if (wonAmount > 0) {
            document.getElementById('btn-take').disabled = false;
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

// Socket.io connection logic for timer
io.on('connection', (socket) => {
    console.log('A user connected');
    let timeLeft = 30;
    setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) { timeLeft = 30; }
        io.emit('timer-update', timeLeft);
    }, 1000);

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.launch || server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
             

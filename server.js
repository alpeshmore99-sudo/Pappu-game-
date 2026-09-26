const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Database / Memory storage
let users = {
    "testuser": { points: 5000, pin: "1234", password: "password123" }
};
let transactions = [];
let bets = []; // Live bets { username, itemIndex, amount }
let adminProfitLoss = 0;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin Panel HTML
const adminHtml = `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Panel - PP00505555</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #030712; color: #f8fafc; font-family: sans-serif; padding: 10px; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 480px; background: #0f172a; border: 2px solid #d97706; border-radius: 12px; padding: 15px; box-shadow: 0 0 20px rgba(217,119,6,0.4); }
    h2 { color: #facc15; margin-bottom: 15px; font-size: 18px; text-align: center; }
    .section { background: #1e293b; padding: 10px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #334155; }
    .section h3 { font-size: 14px; color: #60a5fa; margin-bottom: 8px; }
    input, select, button { width: 100%; padding: 8px; margin-bottom: 6px; background: #0f172a; border: 1px solid #475569; color: #fff; border-radius: 6px; font-size: 13px; }
    button { background: #2563eb; font-weight: bold; cursor: pointer; text-transform: uppercase; }
    button:hover { background: #1d4ed8; }
    .msg { color: #22c55e; font-size: 12px; font-weight: bold; text-align: center; margin-top: 4px; }
    .err { color: #ef4444; font-size: 12px; font-weight: bold; text-align: center; margin-top: 4px; }
    table { width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 5px; }
    th, td { border: 1px solid #475569; padding: 5px; text-align: left; }
    th { background: #334155; }
    .pl-box { font-size: 16px; font-weight: bold; text-align: center; padding: 8px; background: #020617; border-radius: 6px; border: 1px solid #22c55e; color: #22c55e; }
  </style>
</head>
<body>
  <!-- Login Box -->
  <div class="container" id="login-box">
    <h2>🔐 ॲडमिन लॉगिन</h2>
    <input type="password" id="admin-pass" placeholder="पासवर्ड टाका (PP00505555)">
    <button onclick="checkPassword()">प्रवेश करा</button>
    <div class="err" id="error-msg"></div>
  </div>

  <!-- Admin Dashboard Panel -->
  <div class="container" id="panel-box" style="display:none;">
    <h2>🛠️ ॲडमिन कंट्रोल पनेल</h2>

    <!-- Admin Profit / Loss Display -->
    <div class="section">
      <h3>📊 ॲडमिन एकूण नफा / नुकसान (Profit/Loss)</h3>
      <div class="pl-box" id="admin-pl-val">₹0</div>
    </div>

    <!-- 1. Result Section (Auto / Manual) -->
    <div class="section">
      <h3>🎲 गेम निकाल (Result Section)</h3>
      <label style="font-size:12px;">निकाल पद्धत:</label>
      <select id="res-mode" onchange="toggleMode()">
        <option value="manual">मॅन्युअल (Manual)</option>
        <option value="auto">ऑटो (Auto)</option>
      </select>

      <div id="manual-div">
        <label style="font-size:12px;">जिंकणारे चित्र (0 ते 11):</label>
        <input type="number" id="manual-item" min="0" max="11" value="0">
      </div>

      <div id="auto-div" style="display:none;">
        <label style="font-size:12px;">ऑटो लॉजिक निवडा:</label>
        <select id="auto-type">
          <option value="min_bet">सर्वात कमी बेट लावलेले चित्र जिंका</option>
          <option value="percentage">बेटच्या ठराविक टक्केवारीनुसार (%)</option>
        </select>
        <label style="font-size:12px;">विनिंग टक्केवारी (%):</label>
        <input type="number" id="win-pct" value="80">
      </div>

      <button onclick="declareResult()" style="background: #10b981; margin-top: 5px;">निकाल घोषित करा</button>
      <div id="msg-res" class="msg"></div>
    </div>

    <!-- Live Bets -->
    <div class="section">
      <h3>⚡ लाईव्ह बेट्स (Live Bets)</h3>
      <div id="live-bets-box" style="max-height: 90px; overflow-y: auto;">बेट्स लोड होत आहेत...</div>
    </div>

    <!-- 2. New User Creation Section -->
    <div class="section">
      <h3>👤 नवीन युजर तयार करा</h3>
      <input type="text" id="new-user" placeholder="युजरनेम">
      <input type="password" id="new-pass" placeholder="पासवर्ड">
      <input type="text" id="new-pin" placeholder="पिन (PIN)">
      <input type="number" id="new-pts" placeholder="प्रारंभिक पॉइंट्स">
      <button onclick="createUser()">युजर बनवा</button>
      <div id="msg-user" class="msg"></div>
    </div>

    <!-- 3. Point Transfer & Receive Section -->
    <div class="section">
      <h3>💸 पॉईंट्स ट्रान्सफर / रिसीव्ह (जमा किंवा वजा)</h3>
      <input type="text" id="tr-user" placeholder="युजरचे नाव">
      <select id="tr-type">
        <option value="add">पॉइंट्स जोडा (Add)</option>
        <option value="sub">पॉइंट्स काढा (Subtract)</option>
        <option value="set">थेट सेट करा (Set)</option>
      </select>
      <input type="number" id="tr-pts" placeholder="पॉइंट्स रक्कम">
      <button onclick="transferPoints()">ॲक्शन पूर्ण करा</button>
      <div id="msg-tr" class="msg"></div>
    </div>

    <!-- 4. User PIN / Password Change Section -->
    <div class="section">
      <h3>🔑 युजर पिन व पासवर्ड बदला</h3>
      <input type="text" id="cp-user" placeholder="युजरचे नाव">
      <input type="text" id="cp-pass" placeholder="नवीन पासवर्ड">
      <input type="text" id="cp-pin" placeholder="नवीन पिन (PIN)">
      <button onclick="changeCredentials()">बदल सेव्ह करा</button>
      <div id="msg-cp" class="msg"></div>
    </div>

    <!-- 5. Total User List -->
    <div class="section">
      <h3>📋 सर्व युजर्सची यादी (Total Users)</h3>
      <button onclick="loadUsers()">यादी पहा</button>
      <div id="user-list-box" style="max-height: 100px; overflow-y: auto;"></div>
    </div>

    <!-- 6. Point Transaction History -->
    <div class="section">
      <h3>📜 ट्रान्झॅक्शन हिस्ट्री (History)</h3>
      <button onclick="loadHistory()">इतिहास पहा</button>
      <div id="history-box" style="max-height: 100px; overflow-y: auto;"></div>
    </div>
  </div>

  <script>
    function checkPassword() {
      if (document.getElementById('admin-pass').value === 'PP00505555') {
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('panel-box').style.display = 'block';
        fetchLiveData();
      } else {
        document.getElementById('error-msg').innerText = 'चुकाचा पासवर्ड!';
      }
    }

    function toggleMode() {
      let mode = document.getElementById('res-mode').value;
      if(mode === 'manual') {
        document.getElementById('manual-div').style.display = 'block';
        document.getElementById('auto-div').style.display = 'none';
      } else {
        document.getElementById('manual-div').style.display = 'none';
        document.getElementById('auto-div').style.display = 'block';
      }
    }

    function declareResult() {
      let mode = document.getElementById('res-mode').value;
      let data = { mode };
      if(mode === 'manual') {
        data.item = Number(document.getElementById('manual-item').value);
      } else {
        data.autoType = document.getElementById('auto-type').value;
        data.percentage = Number(document.getElementById('win-pct').value);
      }

      fetch('/api/admin/declare-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()).then(resp => {
        document.getElementById('msg-res').innerText = 'निकाल जाहीर! Winner Index: ' + resp.winnerItem;
        setTimeout(() => document.getElementById('msg-res').innerText = '', 3000);
        fetchLiveData();
      });
    }

    function fetchLiveData() {
      fetch('/api/admin/live-data').then(res => res.json()).then(data => {
        document.getElementById('admin-pl-val').innerText = '₹ ' + data.profitLoss;
        let html = '<table><tr><th>युजर</th><th>चित्र</th><th>रक्कम</th></tr>';
        data.bets.forEach(b => {
          html += \`<tr><td>\${b.username}</td><td>\${b.itemIndex}</td><td>\${b.amount}</td></tr>\`;
        });
        html += '</table>';
        document.getElementById('live-bets-box').innerHTML = html;
      });
    }

    function createUser() {
      let username = document.getElementById('new-user').value.trim();
      let password = document.getElementById('new-pass').value.trim();
      let pin = document.getElementById('new-pin').value.trim();
      let points = Number(document.getElementById('new-pts').value);
      if(!username) { alert('नाव आवश्यक आहे'); return; }
      fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, pin, points })
      }).then(res => res.json()).then(data => {
        document.getElementById('msg-user').innerText = 'युजर तयार झाला!';
        setTimeout(() => document.getElementById('msg-user').innerText = '', 3000);
      });
    }

    function transferPoints() {
      let username = document.getElementById('tr-user').value.trim();
      let type = document.getElementById('tr-type').value;
      let points = Number(document.getElementById('tr-pts').value);
      fetch('/api/admin/transfer-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, type, points })
      }).then(res => res.json()).then(data => {
        if(data.success) {
          document.getElementById('msg-tr').innerText = 'यशस्वीरित्या पूर्ण झाले!';
          setTimeout(() => document.getElementById('msg-tr').innerText = '', 3000);
        } else {
          alert(data.message);
        }
      });
    }

    function changeCredentials() {
      let username = document.getElementById('cp-user').value.trim();
      let password = document.getElementById('cp-pass').value.trim();
      let pin = document.getElementById('cp-pin').value.trim();
      fetch('/api/admin/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, pin })
      }).then(res => res.json()).then(data => {
        document.getElementById('msg-cp').innerText = data.success ? 'बदल यशस्वी झाले!' : data.message;
        setTimeout(() => document.getElementById('msg-cp').innerText = '', 3000);
      });
    }

    function loadUsers() {
      fetch('/api/admin/users').then(res => res.json()).then(data => {
        let html = '<table><tr><th>नाव</th><th>पॉइंट्स</th><th>पिन</th></tr>';
        for(let u in data) {
          html += \`<tr><td>\${u}</td><td>\${data[u].points}</td><td>\${data[u].pin}</td></tr>\`;
        }
        html += '</table>';
        document.getElementById('user-list-box').innerHTML = html;
      });
    }

    function loadHistory() {
      fetch('/api/admin/history').then(res => res.json()).then(data => {
        let html = '<table><tr><th>वेळ</th><th>तपशील</th></tr>';
        data.forEach(h => {
          html += \`<tr><td>\${h.time}</td><td>\${h.text}</td></tr>\`;
        });
        html += '</table>';
        document.getElementById('history-box').innerHTML = html;
      });
    }
  </script>
</body>
</html>`;

app.get('/admin', (req, res) => res.send(adminHtml));
app.get('/admin.html', (req, res) => res.send(adminHtml));

// Admin API Endpoints
app.post('/api/admin/create-user', (req, res) => {
    const { username, password, pin, points } = req.body;
    users[username] = { points: points || 0, pin: pin || "0000", password: password || "" };
    transactions.unshift({ time: new Date().toLocaleTimeString(), text: `Created user: ${username}` });
    res.json({ success: true });
});

app.post('/api/admin/transfer-points', (req, res) => {
    const { username, type, points } = req.body;
    if(users[username]) {
        if(type === 'add') users[username].points += points;
        else if(type === 'sub') users[username].points -= points;
        else if(type === 'set') users[username].points = points;
        
        transactions.unshift({ time: new Date().toLocaleTimeString(), text: `Points ${type} for ${username}: ${points}` });
        io.emit('points-updated', { username, points: users[username].points });
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "युजर सापडला नाही!" });
    }
});

app.post('/api/admin/change-credentials', (req, res) => {
    const { username, password, pin } = req.body;
    if(users[username]) {
        if(password) users[username].password = password;
        if(pin) users[username].pin = pin;
        transactions.unshift({ time: new Date().toLocaleTimeString(), text: `Changed credentials for ${username}` });
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "युजर सापडला नाही!" });
    }
});

app.post('/api/admin/declare-result', (req, res) => {
    const { mode, item, autoType, percentage } = req.body;
    let winningItem = 0;

    let itemTotals = {};
    for(let i=0; i<12; i++) itemTotals[i] = 0;
    bets.forEach(b => { itemTotals[b.itemIndex] += b.amount; });

    if(mode === 'manual') {
        winningItem = item;
    } else {
        if(autoType === 'min_bet') {
            let minVal = Infinity;
            for(let i=0; i<12; i++) {
                if(itemTotals[i] < minVal) {
                    minVal = itemTotals[i];
                    winningItem = i;
                }
            }
        } else {
            winningItem = Math.floor(Math.random() * 12);
        }
    }

    let totalBetsAmount = 0;
    let totalPayoutAmount = 0;

    bets.forEach(b => {
        totalBetsAmount += b.amount;
        if(b.itemIndex === winningItem) {
            let payout = (mode === 'auto' && autoType === 'percentage') ? (b.amount * (percentage / 100)) : (b.amount * 2);
            users[b.username].points += payout;
            totalPayoutAmount += payout;
        }
    });

    let roundProfit = totalBetsAmount - totalPayoutAmount;
    adminProfitLoss += roundProfit;
    transactions.unshift({ time: new Date().toLocaleTimeString(), text: `Result: Item ${winningItem}, Profit/Loss: ${roundProfit}` });

    io.emit('game-result', { winnerItem: winningItem, profitLoss: adminProfitLoss });
    bets = [];
    res.json({ success: true, winnerItem: winningItem });
});

app.get('/api/admin/live-data', (req, res) => {
    res.json({ bets, profitLoss: adminProfitLoss });
});

app.get('/api/admin/users', (req, res) => res.json(users));
app.get('/api/admin/history', (req, res) => res.json(transactions));

// User Place Bet API
app.post('/api/user/place-bet', (req, res) => {
    const { username, itemIndex, amount } = req.body;
    if(users[username] && users[username].points >= amount) {
        users[username].points -= amount;
        bets.push({ username, itemIndex, amount });
        res.json({ success: true, points: users[username].points });
    } else {
        res.json({ success: false, message: "अपुरे पॉइंट्स!" });
    }
});

// User Panel (Tabs & 12 Emojis Grid)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Pappu Game - User Panel</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body { background: #030712; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
    .screen { display: none; width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; background: #030712; flex-direction: column; }
    .screen.active { display: flex; }
    .box { background: #0f172a; border: 2px solid #d97706; padding: 25px; border-radius: 12px; text-align: center; width: 90%; max-width: 340px; margin: auto; }
    h2 { color: #facc15; margin-bottom: 15px; font-size: 20px; }
    input, button { width: 100%; padding: 12px; margin-bottom: 12px; border-radius: 6px; border: none; font-size: 16px; }
    input { background: #1e293b; color: #fff; border: 1px solid #475569; text-align: center; }
    button { background: #2563eb; color: #fff; font-weight: bold; cursor: pointer; text-transform: uppercase; }

    .header { display: flex; justify-content: space-between; padding: 12px 15px; background: #1e293b; border-bottom: 1px solid #334155; font-weight: bold; }
    .tab-content { flex: 1; padding: 15px; overflow-y: auto; display: none; margin-bottom: 50px; }
    .tab-content.active { display: block; }
    .nav-tabs { display: flex; background: #111827; border-top: 1px solid #334155; position: fixed; bottom: 0; width: 100%; }
    .nav-tab { flex: 1; padding: 12px; text-align: center; color: #94a3b8; font-size: 13px; cursor: pointer; border-top: 2px solid transparent; }
    .nav-tab.active { color: #facc15; border-top-color: #facc15; background: #1e293b; }

    .grid-12 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
    .item-box { background: #1e293b; border: 2px solid #475569; border-radius: 8px; padding: 12px 5px; text-align: center; font-size: 24px; cursor: pointer; }
    .item-box.selected { border-color: #22c55e; background: #064e3b; }
  </style>
</head>
<body>
  <!-- Login Screen -->
  <div id="login-screen" class="screen active" style="justify-content: center; align-items: center;">
    <div class="box">
      <h2>पप्पु गेम लॉगिन</h2>
      <input type="text" id="username-input" placeholder="तुमचे नाव टाका">
      <button onclick="loginUser()">प्रवेश करा</button>
    </div>
  </div>

  <!-- Main Game Screen with Tabs -->
  <div id="game-screen" class="screen">
    <div class="header">
      <span id="welcome-user" style="color: #60a5fa;">स्वागत आहे</span>
      <span style="color: #22c55e;">पॉइंट्स: <span id="dash-points-val">5000</span></span>
    </div>

    <!-- Tab 1: Game -->
    <div id="tab-game" class="tab-content active">
      <h3 style="color: #facc15; margin-bottom: 10px; text-align: center;">🎮 १२ चित्रांपैकी एक निवडा</h3>
      <div class="grid-12" id="items-grid"></div>
      <input type="number" id="bet-amount" placeholder="बेट रक्कम (उदा. 100)">
      <button onclick="placeBet()" style="background: #10b981;">बेट लावा</button>
      <p id="game-status" style="margin-top: 15px; text-align: center; color: #94a3b8; font-size: 14px;"></p>
    </div>

    <!-- Tab 2: Dashboard -->
    <div id="tab-dash" class="tab-content">
      <h3 style="color: #60a5fa; margin-bottom: 10px;">डॅशबोर्ड</h3>
      <p style="color: #94a3b8; font-size: 14px;">येथे तुमच्या खात्याची माहिती दिसेल.</p>
    </div>

    <!-- Tab 3: History -->
    <div id="tab-history" class="tab-content">
      <h3 style="color: #facc15; margin-bottom: 10px;">हिस्ट्री</h3>
      <p style="color: #94a3b8; font-size: 13px;">सर्व ट्रान्झॅक्शनची नोंद येथे राहिल.</p>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <div class="nav-tab active" onclick="switchTab('game', event)">गेम</div>
      <div class="nav-tab" onclick="switchTab('dash', event)">डॅशबोर्ड</div>
      <div class="nav-tab" onclick="switchTab('history', event)">हिस्ट्री</div>
    </div>
  </div>

  <script>
    var socket = io();
    var currentUser = '';
    var selectedItem = 0;
    const emojis = ['🍎', '🍌', '🍒', '🍇', '🍉', '🍓', '🍍', '🥝', '🍑', '🍋', '🍊', '🍐'];

    function loginUser() {
      let name = document.getElementById('username-input').value.trim();
      if (!name) { alert('कृपया नाव टाका'); return; }
      currentUser = name;
      document.getElementById('welcome-user').innerText = 'स्वागत आहे, ' + name;
      document.getElementById('login-screen').classList.remove('active');
      document.getElementById('game-screen').classList.add('active');
      buildGrid();
    }

    function buildGrid() {
      let grid = document.getElementById('items-grid');
      grid.innerHTML = '';
      emojis.forEach((emoji, index) => {
        let div = document.createElement('div');
        div.className = 'item-box' + (index === 0 ? ' selected' : '');
        div.innerText = emoji;
        div.onclick = () => {
          document.querySelectorAll('.item-box').forEach(b => b.classList.remove('selected'));
          div.classList.add('selected');
          selectedItem = index;
        };
        grid.appendChild(div);
      });
    }

    function switchTab(tabName, event) {
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
      document.getElementById('tab-' + tabName).classList.add('active');
      event.currentTarget.classList.add('active');
    }

    function placeBet() {
      let amount = Number(document.getElementById('bet-amount').value);
      if(!amount || amount <= 0) { alert('योग्य रक्कम टाка'); return; }

      fetch('/api/user/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, itemIndex: selectedItem, amount })
      }).then(res => res.json()).then(data => {
        if(data.success) {
          document.getElementById('dash-points-val').innerText = data.points;
          document.getElementById('game-status').innerText = 'बेट यशस्वीरित्या लागली!';
        } else {
          alert(data.message);
        }
      });
    }

    socket.on('points-updated', function(data) {
      if (currentUser && data.username === currentUser) {
        document.getElementById('dash-points-val').innerText = data.points;
      }
    });

    socket.on('game-result', function(data) {
      let winnerEmoji = emojis[data.winnerItem];
      document.getElementById('game-status').innerHTML = \`🎉 निकाल जाहीर! विजयी चित्र: \${winnerEmoji}\`;
    });
  </script>
</body>
</html>`);
});

io.on('connection', (socket) => {
    console.log('User connected');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Database structures
let users = {
    "testuser": { points: 5000, pin: "1234", password: "password123" }
};
let transactions = [];
let bets = []; // Live bets { username, itemIndex, amount }
let adminSettings = {
    mode: "manual", // manual or auto
    manualResultItem: 0,
    autoModeType: "min_bet", // min_bet or percentage
    winPercentage: 80,
    totalProfitLoss: 0
};

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
    body { background: #030712; color: #f8fafc; font-family: sans-serif; padding: 15px; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 500px; background: #0f172a; border: 2px solid #d97706; border-radius: 12px; padding: 20px; box-shadow: 0 0 20px rgba(217,119,6,0.4); }
    h2 { color: #facc15; margin-bottom: 15px; font-size: 18px; text-align: center; }
    .section { background: #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #334155; }
    .section h3 { font-size: 15px; color: #60a5fa; margin-bottom: 10px; }
    input, select, button { width: 100%; padding: 10px; margin-bottom: 8px; background: #0f172a; border: 1px solid #475569; color: #fff; border-radius: 6px; font-size: 14px; }
    button { background: #2563eb; font-weight: bold; cursor: pointer; text-transform: uppercase; }
    button:hover { background: #1d4ed8; }
    .msg { color: #22c55e; font-size: 13px; font-weight: bold; text-align: center; margin-top: 5px; }
    .err { color: #ef4444; font-size: 13px; font-weight: bold; text-align: center; margin-top: 5px; }
    table { width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 5px; }
    th, td { border: 1px solid #475569; padding: 6px; text-align: left; }
    th { background: #334155; }
    .stats { font-size: 16px; color: #22c55e; font-weight: bold; text-align: center; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container" id="login-box">
    <h2>🔐 ॲडमिन लॉगिन</h2>
    <input type="password" id="admin-pass" placeholder="पासवर्ड टाका (PP00505555)">
    <button onclick="checkPassword()">प्रवेश करा</button>
    <div class="err" id="error-msg"></div>
  </div>

  <div class="container" id="panel-box" style="display:none;">
    <h2>🛠️ ॲडमिन कंट्रोल पनेल</h2>
    
    <div class="section">
      <h3>📊 ॲडमिन नफा / नुकसान (Profit / Loss)</h3>
      <div class="stats" id="profit-loss-val">₹0</div>
    </div>

    <!-- Game Result Section -->
    <div class="section">
      <h3>🎲 गेम निकाल (Auto / Manual)</h3>
      <label>निकाल पद्धत:</label>
      <select id="res-mode" onchange="toggleMode()">
        <option value="manual">मॅन्युअल (Manual)</option>
        <option value="auto">ऑटो (Auto)</option>
      </select>

      <div id="manual-div">
        <label>जिंकणारे चित्र निवडा (0 ते 11):</label>
        <input type="number" id="manual-item" min="0" max="11" value="0">
      </div>

      <div id="auto-div" style="display:none;">
        <label>ऑटो लॉजिक:</label>
        <select id="auto-type">
          <option value="min_bet">सर्वात कमी बेट लावलेले चित्र जिंका</option>
          <option value="percentage">ठराविक टक्केवारी (%) वाटप</option>
        </select>
        <label>विनींग टक्केवारी (%):</label>
        <input type="number" id="win-pct" value="80">
      </div>

      <button onclick="declareResult()" style="background: #10b981; margin-top: 10px;">निकाल घोषित करा (Declare)</button>
      <div id="msg-res" class="msg"></div>
    </div>

    <!-- Live Bets Section -->
    <div class="section">
      <h3>⚡ लाईव्ह बेट्स (Live Bets)</h3>
      <div id="live-bets-box" style="max-height: 100px; overflow-y: auto;">बेट्स लोड होत आहेत...</div>
    </div>

    <!-- User Management -->
    <div class="section">
      <h3>👤 युजर व पॉइंट्स मॅनेजमेंट</h3>
      <input type="text" id="target-user" placeholder="युजरचे नाव">
      <input type="number" id="target-pts" placeholder="पॉइंट्स सेट करा">
      <button onclick="updatePoints()">पॉइंट्स बदला</button>
      <div id="msg-pts" class="msg"></div>
    </div>

    <!-- Total Users List -->
    <div class="section">
      <h3>📋 एकूण युजर्स यादी</h3>
      <button onclick="loadUsers()">यादी पहा</button>
      <div id="user-list-box" style="max-height: 100px; overflow-y: auto;"></div>
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
        document.getElementById('msg-res').innerText = 'निकाल जाहीर झाला! Winner Item: ' + resp.winnerItem;
        setTimeout(() => document.getElementById('msg-res').innerText = '', 3000);
        fetchLiveData();
      });
    }

    function fetchLiveData() {
      fetch('/api/admin/live-data').then(res => res.json()).then(data => {
        document.getElementById('profit-loss-val').innerText = '₹ ' + data.profitLoss;
        let html = '<table><tr><th>युजर</th><th>चित्र क्र.</th><th>रक्कम</th></tr>';
        data.bets.forEach(b => {
          html += \`<tr><td>\${b.username}</td><td>\${b.itemIndex}</td><td>\${b.amount}</td></tr>\`;
        });
        html += '</table>';
        document.getElementById('live-bets-box').innerHTML = html;
      });
    }

    function updatePoints() {
      let username = document.getElementById('target-user').value.trim();
      let points = Number(document.getElementById('target-pts').value);
      fetch('/api/admin/update-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, points })
      }).then(res => res.json()).then(data => {
        document.getElementById('msg-pts').innerText = data.success ? 'अपडेट झाले!' : data.message;
      });
    }

    function loadUsers() {
      fetch('/api/admin/users').then(res => res.json()).then(data => {
        let html = '<table><tr><th>नाव</th><th>पॉइंट्स</th></tr>';
        for(let u in data) {
          html += \`<tr><td>\${u}</td><td>\${data[u].points}</td></tr>\`;
        }
        html += '</table>';
        document.getElementById('user-list-box').innerHTML = html;
      });
    }
  </script>
</body>
</html>`;

app.get('/admin', (req, res) => res.send(adminHtml));
app.get('/admin.html', (req, res) => res.send(adminHtml));

// Admin API
app.post('/api/admin/declare-result', (req, res) => {
    const { mode, item, autoType, percentage } = req.body;
    let winningItem = 0;

    if(mode === 'manual') {
        winningItem = item;
    } else {
        // Calculate based on bets
        let itemTotals = {};
        for(let i=0; i<12; i++) itemTotals[i] = 0;
        bets.forEach(b => { itemTotals[b.itemIndex] += b.amount; });

        if(autoType === 'min_bet') {
            // Find item with minimum total bets
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

    // Distribute rewards and calculate Profit/Loss
    let totalBetsAmount = 0;
    let totalPayoutAmount = 0;

    bets.forEach(b => {
        totalBetsAmount += b.amount;
        if(b.itemIndex === winningItem) {
            let payout = mode === 'auto' && autoType === 'percentage' ? (b.amount * (percentage / 100)) : (b.amount * 2);
            users[b.username].points += payout;
            totalPayoutAmount += payout;
        }
    });

    let roundProfit = totalBetsAmount - totalPayoutAmount;
    adminSettings.totalProfitLoss += roundProfit;

    io.emit('game-result', { winnerItem: winningItem, roundProfit });
    bets = []; // reset bets
    res.json({ success: true, winnerItem: winningItem });
});

app.get('/api/admin/live-data', (req, res) => {
    res.json({ bets, profitLoss: adminSettings.totalProfitLoss });
});

app.post('/api/admin/update-points', (req, res) => {
    const { username, points } = req.body;
    if(users[username]) {
        users[username].points = points;
        io.emit('points-updated', { username, points });
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "युजर सापडला नाही!" });
    }
});

app.get('/api/admin/users', (req, res) => res.json(users));

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

// User Panel with Tabs
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

    /* Tab Layout Style */
    .header { display: flex; justify-content: space-between; padding: 12px 15px; background: #1e293b; border-bottom: 1px solid #334155; font-weight: bold; }
    .tab-content { flex: 1; padding: 15px; overflow-y: auto; display: none; }
    .tab-content.active { display: block; }
    .nav-tabs { display: flex; background: #111827; border-top: 1px solid #334155; position: fixed; bottom: 0; width: 100%; }
    .nav-tab { flex: 1; padding: 12px; text-align: center; color: #94a3b8; font-size: 13px; cursor: pointer; border-top: 2px solid transparent; }
    .nav-tab.active { color: #facc15; border-top-color: #facc15; background: #1e293b; }

    /* 12 Images Grid */
    .grid-12 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
    .item-box { background: #1e293b; border: 2px solid #475569; border-radius: 8px; padding: 15px 5px; text-align: center; font-size: 24px; cursor: pointer; }
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

  <!-- Main Game Panel with Tabs -->
  <div id="game-screen" class="screen">
    <div class="header">
      <span id="welcome-user" style="color: #60a5fa;">स्वागत आहे</span>
      <span style="color: #22c55e;">पॉइंट्स: <span id="dash-points-val">5000</span></span>
    </div>

    <!-- Tab 1: Game Play -->
    <div id="tab-game" class="tab-content active">
      <h3 style="color: #facc15; margin-bottom: 10px; text-align: center;">🎮 चित्रे निवडून बेट लावा</h3>
      <div class="grid-12" id="items-grid">
        <!-- 12 Items generated dynamically -->
      </div>
      <input type="number" id="bet-amount" placeholder="बेट रक्कम (उदा. 100)">
      <button onclick="placeBet()" style="background: #10b981;">बेट लावा (Place Bet)</button>
      <p id="game-status" style="margin-top: 15px; text-align: center; color: #94a3b8; font-size: 14px;"></p>
    </div>

    <!-- Tab 2: Dashboard/Info -->
    <div id="tab-dash" class="tab-content">
      <h3 style="color: #60a5fa; margin-bottom: 10px;">डॅशबोर्ड माहिती</h3>
      <p style="color: #94a3b8; font-size: 14px;">येथे तुमच्या खात्याची संपूर्ण माहिती आणि गेम नियम दिसतील.</p>
    </div>

    <!-- Tab 3: History -->
    <div id="tab-history" class="tab-content">
      <h3 style="color: #facc15; margin-bottom: 10px;">ट्रान्झॅक्शन हिस्ट्री</h3>
      <div id="history-list" style="color: #94a3b8; font-size: 13px;">कोणतीही हिस्ट्री नाही.</div>
    </div>

    <!-- Bottom Navigation Tabs -->
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
          document.getElementById('game-status').innerText = 'बेट यशस्वीरित्या लागली! निकालाची प्रतीक्षा करा.';
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

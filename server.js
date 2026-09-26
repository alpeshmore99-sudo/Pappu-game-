const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Database simulation (Memory stores)
let users = {
    "testuser": { points: 5000, pin: "1234", password: "password123" }
};
let transactions = [];
let gameResults = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin Panel Route (PP00505555)
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
    <h2>🛠️ ॲडमिन पनेल डॅशबोर्ड</h2>

    <!-- 1. New User Creation -->
    <div class="section">
      <h3>👤 नवीन युजर तयार करा</h3>
      <input type="text" id="new-user" placeholder="युजरनेम">
      <input type="password" id="new-pass" placeholder="पासवर्ड">
      <input type="text" id="new-pin" placeholder="पिन (PIN)">
      <input type="number" id="new-pts" placeholder="प्रारंभिक पॉइंट्स">
      <button onclick="createUser()">युजर तयार करा</button>
      <div id="msg-user" class="msg"></div>
    </div>

    <!-- 2. Points Management & Transfer/Receive -->
    <div class="section">
      <h3>💰 पॉइंट्स अपडेट / ट्रान्सफर</h3>
      <input type="text" id="target-user" placeholder="युजरचे नाव">
      <input type="number" id="target-pts" placeholder="पॉइंट्स (किंवा जोडा/वजा करा)">
      <button onclick="updatePoints()">पॉइंट्स सेट करा</button>
      <div id="msg-pts" class="msg"></div>
    </div>

    <!-- 3. Change Pin/Password -->
    <div class="section">
      <h3>🔑 पिन आणि पासवर्ड बदला</h3>
      <input type="text" id="cp-user" placeholder="युजरचे नाव">
      <input type="text" id="cp-pass" placeholder="नवीन पासवर्ड">
      <input type="text" id="cp-pin" placeholder="नवीन पिन">
      <button onclick="changeCredentials()">बदला</button>
      <div id="msg-cp" class="msg"></div>
    </div>

    <!-- 4. Result Section -->
    <div class="section">
      <h3>🎲 गेम निकाल (Result) घोषित करा</h3>
      <select id="game-res">
        <option value="Win">विजयी (Win)</option>
        <option value="Loss">पराजय (Loss)</option>
      </select>
      <button onclick="setResult()">निकाल जाहीर करा</button>
      <div id="msg-res" class="msg"></div>
    </div>

    <!-- 5. Total User List -->
    <div class="section">
      <h3>📋 सर्व युजर्सची यादी</h3>
      <button onclick="loadUsers()">यादी पहा</button>
      <div id="user-list-box" style="max-height: 120px; overflow-y: auto;"></div>
    </div>

    <!-- 6. Transaction History -->
    <div class="section">
      <h3>📜 ट्रान्झॅक्शन हिस्ट्री</h3>
      <button onclick="loadHistory()">इतिहास पहा</button>
      <div id="history-box" style="max-height: 120px; overflow-y: auto;"></div>
    </div>
  </div>

  <script>
    function checkPassword() {
      if (document.getElementById('admin-pass').value === 'PP00505555') {
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('panel-box').style.display = 'block';
      } else {
        document.getElementById('error-msg').innerText = 'चुकाचा पासवर्ड!';
      }
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
        document.getElementById('msg-user').innerText = 'युजर यशस्वीरित्या तयार झाला!';
        setTimeout(() => document.getElementById('msg-user').innerText = '', 3000);
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
        if(data.success) {
          document.getElementById('msg-pts').innerText = 'पॉइंट्स अपडेट झाले!';
          setTimeout(() => document.getElementById('msg-pts').innerText = '', 3000);
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
        document.getElementById('msg-cp').innerText = 'बदल यशस्वी झाले!';
        setTimeout(() => document.getElementById('msg-cp').innerText = '', 3000);
      });
    }

    function setResult() {
      let result = document.getElementById('game-res').value;
      fetch('/api/admin/set-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result })
      }).then(res => res.json()).then(data => {
        document.getElementById('msg-res').innerText = 'निकाल जाहीर केला!';
        setTimeout(() => document.getElementById('msg-res').innerText = '', 3000);
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

// Admin API endpoints
app.post('/api/admin/create-user', (req, res) => {
    const { username, password, pin, points } = req.body;
    users[username] = { points: points || 0, pin: pin || "0000", password: password || "" };
    transactions.unshift({ time: new Date().toLocaleTimeString(), text: `Created user: ${username} with ${points} pts` });
    res.json({ success: true });
});

app.post('/api/admin/update-points', (req, res) => {
    const { username, points } = req.body;
    if(users[username]) {
        users[username].points = points;
        transactions.unshift({ time: new Date().toLocaleTimeString(), text: `Updated points for ${username} to ${points}` });
        io.emit('points-updated', { username, points });
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
        res.json({ success: false });
    }
});

app.post('/api/admin/set-result', (req, res) => {
    const { result } = req.body;
    gameResults.unshift({ time: new Date().toLocaleTimeString(), result });
    transactions.unshift({ time: new Date().toLocaleTimeString(), text: `Game Result declared: ${result}` });
    io.emit('game-result', { result });
    res.json({ success: true });
});

app.get('/api/admin/users', (req, res) => res.json(users));
app.get('/api/admin/history', (req, res) => res.json(transactions));

// Main Game Route
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Pappu Game</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body { background: #030712; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
    .screen { display: none; width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; background: #030712; flex-direction: column; justify-content: center; align-items: center; }
    .screen.active { display: flex; }
    .box { background: #0f172a; border: 2px solid #d97706; padding: 25px; border-radius: 12px; text-align: center; width: 90%; max-width: 340px; }
    h2 { color: #facc15; margin-bottom: 15px; font-size: 20px; }
    input, button { width: 100%; padding: 12px; margin-bottom: 12px; border-radius: 6px; border: none; font-size: 16px; }
    input { background: #1e293b; color: #fff; border: 1px solid #475569; text-align: center; }
    button { background: #2563eb; color: #fff; font-weight: bold; cursor: pointer; text-transform: uppercase; }
    .game-header { position: absolute; top: 0; left: 0; width: 100%; display: flex; justify-content: space-between; padding: 15px; background: #1e293b; border-bottom: 1px solid #334155; font-weight: bold; }
    .game-box { background: #111827; border: 2px solid #22c55e; padding: 20px; border-radius: 12px; text-align: center; width: 90%; max-width: 340px; }
  </style>
</head>
<body>
  <div id="login-screen" class="screen active">
    <div class="box">
      <h2>पप्पु गेम लॉगिन</h2>
      <input type="text" id="username-input" placeholder="तुमचे नाव टाका">
      <button onclick="loginUser()">प्रवेश करा</button>
    </div>
  </div>

  <div id="game-screen" class="screen">
    <div class="game-header">
      <span id="welcome-user" style="color: #60a5fa;">स्वागत आहे</span>
      <span style="color: #22c55e;">पॉइंट्स: <span id="dash-points-val">5000</span></span>
    </div>
    <div class="game-box">
      <h2>🎮 गेम डॅशबोर्ड</h2>
      <p id="game-status" style="margin: 15px 0; color: #94a3b8; font-size: 14px;">ॲडमिनच्या निकालाची वाट पाहत आहे...</p>
    </div>
  </div>

  <script>
    var socket = io();
    var currentUser = '';

    function loginUser() {
      let name = document.getElementById('username-input').value.trim();
      if (!name) { alert('कृपया नाव टाका'); return; }
      currentUser = name;
      document.getElementById('welcome-user').innerText = 'स्वागत आहे, ' + name;
      document.getElementById('login-screen').classList.remove('active');
      document.getElementById('game-screen').classList.add('active');
    }

    socket.on('points-updated', function(data) {
      if (currentUser && data.username === currentUser) {
        document.getElementById('dash-points-val').innerText = data.points;
      }
    });

    socket.on('game-result', function(data) {
      document.getElementById('game-status').innerText = 'गेम निकाल जाहीर झाला: ' + data.result;
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

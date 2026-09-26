const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let userPointsMap = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin Panel Route (Supports both /admin and /admin.html)
const adminHtml = `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Panel - PP00505555</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #030712; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
    .admin-container { width: 90%; max-width: 400px; background: #0f172a; border: 2px solid #d97706; border-radius: 12px; padding: 25px; box-shadow: 0 0 20px rgba(217,119,6,0.4); text-align: center; }
    h2 { color: #facc15; margin-bottom: 20px; font-size: 20px; }
    .form-group { margin-bottom: 15px; text-align: left; }
    label { display: block; margin-bottom: 5px; color: #94a3b8; font-size: 14px; }
    input { width: 100%; padding: 12px; background: #1e293b; border: 1px solid #475569; color: #fff; border-radius: 6px; font-size: 16px; }
    .btn { width: 100%; padding: 12px; background: #2563eb; color: #fff; border: none; font-weight: bold; border-radius: 6px; cursor: pointer; margin-top: 10px; text-transform: uppercase; }
    .msg { margin-top: 15px; color: #22c55e; font-weight: bold; font-size: 14px; }
    .err { color: #ef4444; font-weight: bold; font-size: 14px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="admin-container" id="login-box">
    <h2>🔐 ॲडमिन लॉगिन</h2>
    <div class="form-group">
      <label>पासवर्ड टाका:</label>
      <input type="password" id="admin-pass" placeholder="पासवर्ड">
    </div>
    <button class="btn" onclick="checkPassword()">प्रवेश करा</button>
    <div class="err" id="error-msg"></div>
  </div>

  <div class="admin-container" id="panel-box" style="display:none;">
    <h2>🛠️ ॲडमिन पनेल (PP00505555)</h2>
    <div class="form-group">
      <label>वापरकर्त्याचे नाव:</label>
      <input type="text" id="admin-user" placeholder="नाव टाका">
    </div>
    <div class="form-group">
      <label>पॉइंट्स सेट करा:</label>
      <input type="number" id="admin-points" placeholder="उदा. 10000">
    </div>
    <button class="btn" onclick="updateUserPoints()">पॉइंट्स अपडेट करा</button>
    <div class="msg" id="admin-msg"></div>
  </div>

  <script>
    function checkPassword() {
      let pass = document.getElementById('admin-pass').value;
      if (pass === 'PP00505555') {
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('panel-box').style.display = 'block';
      } else {
        document.getElementById('error-msg').innerText = 'चुकाचा पासवर्ड!';
      }
    }

    function updateUserPoints() {
      let username = document.getElementById('admin-user').value.trim();
      let points = document.getElementById('admin-points').value;
      if(!username || !points) { alert('सर्व माहिती भरा!'); return; }
      fetch('/api/update-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, points: Number(points) })
      }).then(res => res.json()).then(data => {
        document.getElementById('admin-msg').innerText = 'यशस्वीरित्या अपडेट झाले!';
        setTimeout(() => document.getElementById('admin-msg').innerText = '', 3000);
      });
    }
  </script>
</body>
</html>`;

app.get('/admin', (req, res) => res.send(adminHtml));
app.get('/admin.html', (req, res) => res.send(adminHtml));

app.post('/api/update-points', (req, res) => {
    const { username, points } = req.body;
    userPointsMap[username] = points;
    io.emit('points-updated', { username, points });
    res.json({ success: true });
});

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
    
    .box { background: #0f172a; border: 2px solid #d97706; padding: 25px; border-radius: 12px; text-align: center; width: 90%; max-width: 340px; box-shadow: 0 0 25px rgba(217,119,6,0.5); }
    h2 { color: #facc15; margin-bottom: 15px; font-size: 20px; }
    input, button { width: 100%; padding: 12px; margin-bottom: 12px; border-radius: 6px; border: none; font-size: 16px; }
    input { background: #1e293b; color: #fff; border: 1px solid #475569; text-align: center; }
    button { background: #2563eb; color: #fff; font-weight: bold; cursor: pointer; text-transform: uppercase; }
    button:active { transform: scale(0.98); }

    .game-header { position: absolute; top: 0; left: 0; width: 100%; display: flex; justify-content: space-between; padding: 15px; background: #1e293b; border-bottom: 1px solid #334155; font-weight: bold; }
    .game-box { background: #111827; border: 2px solid #22c55e; padding: 20px; border-radius: 12px; text-align: center; width: 90%; max-width: 340px; }
    .spin-btn { background: #10b981; margin-top: 15px; }
  </style>
</head>
<body>
  <!-- Login Screen -->
  <div id="login-screen" class="screen active">
    <div class="box">
      <h2>पप्पु गेम लॉगिन</h2>
      <input type="text" id="username-input" placeholder="तुमचे नाव टाका">
      <button onclick="loginUser()">प्रवेश करा</button>
    </div>
  </div>

  <!-- Game Screen -->
  <div id="game-screen" class="screen">
    <div class="game-header">
      <span id="welcome-user" style="color: #60a5fa;">स्वागत आहे</span>
      <span style="color: #22c55e;">पॉइंट्स: <span id="dash-points-val">5000</span></span>
    </div>
    <div class="game-box">
      <h2>🎮 पप्पु लकी गेम</h2>
      <p id="game-status" style="margin: 15px 0; color: #94a3b8; font-size: 14px;">बटण दाबून नशीब तपासा!</p>
      <button class="spin-btn" onclick="playGame()">खेळा (Play)</button>
    </div>
  </div>

  <script>
    var socket = io();
    var currentUser = '';
    var userPoints = 5000;

    function loginUser() {
      let name = document.getElementById('username-input').value.trim();
      if (!name) { alert('कृपया नाव टाका'); return; }
      currentUser = name;
      document.getElementById('welcome-user').innerText = 'स्वागत आहे, ' + name;
      document.getElementById('login-screen').classList.remove('active');
      document.getElementById('game-screen').classList.add('active');
    }

    function playGame() {
      let status = document.getElementById('game-status');
      status.innerText = 'गेम सुरू आहे...';
      setTimeout(() => {
        let win = Math.random() > 0.5;
        if(win) {
          status.innerText = 'अभिनंदन! तुम्ही जिंकलात!';
        } else {
          status.innerText = 'पुन्हा प्रयत्न करा!';
        }
      }, 1000);
    }

    socket.on('points-updated', function(data) {
      if (currentUser && data.username === currentUser) {
        userPoints = data.points;
        document.getElementById('dash-points-val').innerText = userPoints;
      }
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

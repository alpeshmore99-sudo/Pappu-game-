const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin Panel Route
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="mr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Panel</title>
        <style>
            body { background: #030712; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .box { background: #0f172a; border: 2px solid #d97706; padding: 25px; border-radius: 10px; width: 90%; max-width: 350px; text-align: center; box-sizing: border-box; }
            input, button { padding: 12px; margin: 8px 0; width: 100%; border-radius: 5px; border: none; box-sizing: border-box; }
            button { background: #2563eb; color: #fff; font-weight: bold; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>ॲडमिन पनेल</h2>
            <input type="text" id="uname" placeholder="युजरचे नाव टाका">
            <input type="number" id="upts" placeholder="पॉइंट्स टाका">
            <button onclick="update()">पॉइंट्स अपडेट करा</button>
            <p id="msg" style="color: #22c55e; font-weight: bold;"></p>
        </div>
        <script>
            function update() {
                let username = document.getElementById('uname').value;
                let points = Number(document.getElementById('upts').value);
                if(!username) { alert('नाव टाका'); return; }
                fetch('/api/update-points', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, points })
                }).then(res => res.json()).then(data => {
                    document.getElementById('msg').innerText = 'यशस्वीरित्या अपडेट झाले!';
                    setTimeout(() => document.getElementById('msg').innerText = '', 2500);
                });
            }
        </script>
    </body>
    </html>
    `);
});

let userPointsMap = {};
app.post('/api/update-points', (req, res) => {
    const { username, points } = req.body;
    userPointsMap[username] = points;
    io.emit('points-updated', { username, points });
    res.json({ success: true });
});

// Main Game Route
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="mr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pappu Game</title>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body { background: #030712; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: #0f172a; border: 2px solid #2563eb; padding: 25px; border-radius: 10px; width: 90%; max-width: 350px; text-align: center; box-sizing: border-box; }
            input, button { padding: 12px; margin: 8px 0; width: 100%; border-radius: 5px; border: none; box-sizing: border-box; }
            button { background: #10b981; color: #fff; font-weight: bold; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="card" id="login-div">
            <h2>पप्पु गेम लॉगिन</h2>
            <input type="text" id="username" placeholder="तुमचे नाव टाका">
            <button onclick="login()">प्रवेश करा</button>
        </div>
        <div class="card" id="game-div" style="display:none;">
            <h2>स्वागत आहे, <span id="disp-name" style="color: #60a5fa;"></span></h2>
            <h3>पॉइंट्स: <span id="disp-pts" style="color: #22c55e;">5000</span></h3>
            <p style="font-size: 14px; color: #94a3b8;">गेम सर्व्हर सक्रिय आहे!</p>
        </div>
        <script>
            var socket = io();
            var myName = '';
            function login() {
                myName = document.getElementById('username').value.trim();
                if(!myName) { alert('कृपया नाव टाका'); return; }
                document.getElementById('login-div').style.display = 'none';
                document.getElementById('game-div').style.display = 'block';
                document.getElementById('disp-name').innerText = myName;
            }
            socket.on('points-updated', function(data) {
                if(data.username === myName) {
                    document.getElementById('disp-pts').innerText = data.points;
                }
            });
        </script>
    </body>
    </html>
    `);
});

io.on('connection', (socket) => {
    console.log('User connected');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

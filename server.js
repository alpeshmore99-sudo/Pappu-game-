const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple Admin Route
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="mr">
    <head>
        <meta charset="UTF-8">
        <title>Admin Panel</title>
        <style>
            body { background: #030712; color: #fff; font-family: sans-serif; text-align: center; padding: 50px; }
            .box { background: #0f172a; border: 2px solid #d97706; padding: 20px; display: inline-block; border-radius: 10px; }
            input, button { padding: 10px; margin: 10px; width: 200px; border-radius: 5px; border: none; }
            button { background: #2563eb; color: #fff; font-weight: bold; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>ॲडमिन पनेल</h2>
            <input type="text" id="uname" placeholder="नाव टाका"><br>
            <input type="number" id="upts" placeholder="पॉइंट्स टाका"><br>
            <button onclick="update()">अपडेट करा</button>
            <p id="msg" style="color: #22c55e;"></p>
        </div>
        <script>
            function update() {
                let username = document.getElementById('uname').value;
                let points = Number(document.getElementById('upts').value);
                fetch('/api/update-points', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, points })
                }).then(res => res.json()).then(data => {
                    document.getElementById('msg').innerText = 'अपडेट झाले!';
                    setTimeout(() => document.getElementById('msg').innerText = '', 2000);
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
            body { background: #030712; color: #fff; font-family: sans-serif; text-align: center; padding: 50px; }
            .card { background: #0f172a; border: 2px solid #2563eb; padding: 30px; display: inline-block; border-radius: 10px; }
            input, button { padding: 10px; margin: 10px; border-radius: 5px; border: none; }
            button { background: #10b981; color: #fff; font-weight: bold; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="card" id="login-div">
            <h2>पप्पु गेम लॉगिन</h2>
            <input type="text" id="username" placeholder="नाव टाका"><br>
            <button onclick="login()">प्रवेश करा</button>
        </div>
        <div class="card" id="game-div" style="display:none;">
            <h2>स्वागत आहे, <span id="disp-name"></span></h2>
            <h3>पॉइंट्स: <span id="disp-pts" style="color: #22c55e;">5000</span></h3>
            <p>गेम सर्व्हर यशस्वीरित्या चालू आहे!</p>
        </div>
        <script>
            var socket = io();
            var myName = '';
            function login() {
                myName = document.getElementById('username').value;
                if(!myName) { alert('नाव टाका'); return; }
                document.getElementById('login-div').style.display = 'none';
                document.getElementById('game-div').style.display = 'inline-block';
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

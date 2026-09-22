const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Static files (frontend)
app.use(express.static(__dirname));

// In-Memory Database / Data Storage
let users = [
    { id: 'PP00257374', name: 'Rahul', pass: '1234', pin: '1234', points: 500, isBlocked: false }
];

let gameState = {
    timer: 60,
    bets: {
        chhatri: 0, ball: 0, sun: 0, lamp: 0,
        cow: 0, bucket: 0, kite: 0, top: 0,
        flower: 0, butterfly: 0, pigeon: 0, rabbit: 0
    },
    expectedPayout: 0,
    forcedWinner: null
};

// Timer logic
setInterval(() => {
    gameState.timer--;
    if (gameState.timer <= 0) {
        gameState.timer = 60;
        // Reset bets for next round
        for (let key in gameState.bets) {
            gameState.bets[key] = 0;
        }
        gameState.expectedPayout = 0;
        gameState.forcedWinner = null;
    }
    io.emit('timer-update', gameState.timer);
    io.emit('live-bets-update', { bets: gameState.bets, expectedPayout: gameState.expectedPayout });
}, 1000);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send initial users list
    socket.emit('users-list-update', users);

    // --- Admin Login Handler ---
    socket.on('admin-login', (data) => {
        if (data.id === 'PP00505555' && data.pass === 'admin123' && data.pin === '1234') {
            socket.emit('admin-login-response', { success: true });
        } else {
            socket.emit('admin-login-response', { success: false, message: 'चुकीचा ID, Password किंवा PIN!' });
        }
    });

    // Get Admin Dashboard Data
    socket.on('get-admin-data', () => {
        socket.emit('users-list-update', users);
        socket.emit('live-bets-update', { bets: gameState.bets, expectedPayout: gameState.expectedPayout });
    });

    // Set Force Winner
    socket.on('admin-set-winner', (symbol) => {
        gameState.forcedWinner = symbol;
        console.log('Forced winner set to:', symbol);
    });

    // Create New User
    socket.on('admin-create-user', (data) => {
        const randomId = 'PP' + Math.floor(10000000 + Math.random() * 90000000);
        users.push({
            id: randomId,
            name: data.name,
            pass: data.pass,
            pin: data.pin,
            points: 100, // Starting default points
            isBlocked: false
        });
        io.emit('users-list-update', users);
        socket.emit('admin-action-msg', 'नवीन युझर यशस्वीरित्या तयार झाला! ID: ' + randomId);
    });

    // Point Action (Add/Deduct)
    socket.on('admin-point-action', (data) => {
        const user = users.find(u => u.id === data.userId);
        if (user) {
            if (data.action === 'add') {
                user.points += data.amount;
                socket.emit('admin-action-msg', `${data.amount} पॉइंट्स यशस्वीरित्या जोडले गेले.`);
            } else if (data.action === 'deduct') {
                user.points = Math.max(0, user.points - data.amount);
                socket.emit('admin-action-msg', `${data.amount} पॉइंट्स वजा केले गेले.`);
            }
            io.emit('users-list-update', users);
        } else {
            socket.emit('admin-action-msg', 'युझर सापडला नाही!');
        }
    });

    // Toggle Block User
    socket.on('admin-toggle-block', (data) => {
        const user = users.find(u => u.id === data.userId);
        if (user) {
            user.isBlocked = data.block;
            io.emit('users-list-update', users);
            socket.emit('admin-action-msg', user.isBlocked ? 'युझर ब्लॉक केला.' : 'युझर अनब्लॉक केला.');
        }
    });

    // Delete User
    socket.on('admin-delete-user', (userId) => {
        users = users.filter(u => u.id !== userId);
        io.emit('users-list-update', users);
        socket.emit('admin-action-msg', 'युझर डिलीट केला.');
    });

    // Change User Credentials
    socket.on('admin-change-user-creds', (data) => {
        const user = users.find(u => u.id === data.userId);
        if (user) {
            user.pass = data.pass;
            user.pin = data.pin;
            socket.emit('admin-action-msg', 'युझरचा पासवर्ड आणि पिन बदलला.');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
  

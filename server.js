const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Default Admin Credentials
const ADMIN_DETAILS = {
  id: 'PP00505555',
  pass: 'admin123',
  pin: '1234'
};

let timerVal = 60;
let manualWinner = null;
let currentBets = {};
let users = [
  { id: 'PP00257374', name: 'Demo User', pass: '1234', pin: '1234', points: 5000, isBlocked: false }
];

// Initialize Bets
const symbols = ['chhatri', 'ball', 'sun', 'lamp', 'cow', 'bucket', 'kite', 'top', 'flower', 'butterfly', 'pigeon', 'rabbit'];
symbols.forEach(s => currentBets[s] = 0);

// Timer Loop
setInterval(() => {
  timerVal--;
  if (timerVal <= 0) {
    timerVal = 60;
    manualWinner = null; // Reset winner
    symbols.forEach(s => currentBets[s] = 0); // Reset bets
  }
  io.emit('timer-update', timerVal);
}, 1000);

io.on('connection', (socket) => {

  // Admin Login Handler
  socket.on('admin-login', (data) => {
    if (data.id === ADMIN_DETAILS.id && data.pass === ADMIN_DETAILS.pass && data.pin === ADMIN_DETAILS.pin) {
      socket.emit('admin-login-response', { success: true });
    } else {
      socket.emit('admin-login-response', { success: false, message: 'चुकीचा ID, Password किंवा PIN!' });
    }
  });

  // Fetch Data on Admin Login
  socket.on('get-admin-data', () => {
    socket.emit('users-list-update', users);
    socket.emit('live-bets-update', { bets: currentBets, expectedPayout: 0 });
  });

  // Force Winner
  socket.on('admin-set-winner', (symbol) => {
    manualWinner = symbol;
    socket.emit('admin-action-msg', `पुढील विजेता सेट केला: ${symbol}`);
  });

  // Create User
  socket.on('admin-create-user', (data) => {
    const newId = 'PP00' + Math.floor(100000 + Math.random() * 900000);
    const newUser = { 
      id: newId, 
      name: data.name, 
      pass: data.pass, 
      pin: data.pin, 
      points: 0, 
      isBlocked: false 
    };
    users.push(newUser);
    io.emit('users-list-update', users);
    socket.emit('admin-action-msg', `नवीन युझर तयार झाला! ID: ${newId}`);
  });

  // Change User Password/PIN
  socket.on('admin-change-user-creds', (data) => {
    let u = users.find(user => user.id === data.userId);
    if (u) {
      u.pass = data.pass;
      u.pin = data.pin;
      socket.emit('admin-action-msg', 'युझरचा पासवर्ड आणि पिन बदलला!');
    } else {
      socket.emit('admin-action-msg', 'युझर सापडला नाही!');
    }
  });

  // Point Transfer/Receive
  socket.on('admin-point-action', (data) => {
    let u = users.find(user => user.id === data.userId);
    if (u) {
      if (data.action === 'add') u.points += data.amount;
      else if (data.action === 'deduct') u.points = Math.max(0, u.points - data.amount);
      io.emit('users-list-update', users);
      socket.emit('admin-action-msg', 'पॉइंट्स अपडेट झाले!');
    } else {
      socket.emit('admin-action-msg', 'युझर सापडला नाही!');
    }
  });

  // Block/Unblock User
  socket.on('admin-toggle-block', (data) => {
    let u = users.find(user => user.id === data.userId);
    if (u) {
      u.isBlocked = data.block;
      io.emit('users-list-update', users);
    }
  });

  // Delete User
  socket.on('admin-delete-user', (userId) => {
    users = users.filter(u => u.id !== userId);
    io.emit('users-list-update', users);
    socket.emit('admin-action-msg', 'युझर डिलीट केला!');
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

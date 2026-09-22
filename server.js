const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Static files serve करणे
app.use(express.static('public')); // किंवा तुमची मुख्य रूट फाईल जिथे असेल

// गेमचा डेटा आणि युझर्सची यादी
let users = [
  { id: 'U001', name: 'राहुल', points: 1000, isBlocked: false },
  { id: 'U002', name: 'अमित', points: 1500, isBlocked: false }
];

let gameState = {
  bets: {
    'chhatri': 0, 'ball': 0, 'sun': 0, 'lamp': 0,
    'cow': 0, 'bucket': 0, 'kite': 0, 'top': 0,
    'flower': 0, 'butterfly': 0, 'pigeon': 0, 'rabbit': 0
  },
  expectedPayout: 0
};

let timer = 60;

// टायमर चालू ठेवणे
setInterval(() => {
  timer--;
  if (timer < 0) {
    timer = 60; // टायमर संपल्यावर पुन्हा ६० सेकंद
  }
  io.emit('timer-update', timer);
}, 1000);

// Socket.io कनेक्शन
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // 1. Admin Login Handler
  socket.on('admin-login', (data) => {
    console.log('Admin login attempt received:', data);
    if (data && data.id === 'PP00505555' && data.pass === 'admin123' && data.pin === '1234') {
      socket.emit('admin-login-response', { success: true });
      console.log('Admin login successful!');
    } else {
      socket.emit('admin-login-response', { success: false, message: 'चुकीचा ID, Password किंवा PIN!' });
      console.log('Admin login failed.');
    }
  });

  // 2. Get Admin Dashboard Data
  socket.on('get-admin-data', () => {
    socket.emit('users-list-update', users);
    socket.emit('live-bets-update', { 
      bets: gameState.bets, 
      expectedPayout: gameState.expectedPayout 
    });
  });

  // 3. User Management - Create User
  socket.on('admin-create-user', (userData) => {
    const newId = 'U' + Math.floor(100 + Math.random() * 900);
    users.push({
      id: newId,
      name: userData.name,
      points: 500, // नवीन युझरला सुरुवातीचे पॉईंट्स
      isBlocked: false
    });
    io.emit('users-list-update', users);
    socket.emit('admin-action-msg', 'युझर यशस्वीरित्या तयार केला!');
  });

  // 4. Point Action (Add/Deduct)
  socket.on('admin-point-action', (actionData) => {
    const user = users.find(u => u.id === actionData.userId);
    if (user) {
      if (actionData.action === 'add') {
        user.points += actionData.amount;
      } else if (actionData.action === 'deduct') {
        user.points = Math.max(0, user.points - actionData.amount);
      }
      io.emit('users-list-update', users);
      socket.emit('admin-action-msg', 'पॉइंट्स यशस्वीरित्या अपडेट केले!');
    } else {
      socket.emit('admin-action-msg', 'युझर सापडला नाही!');
    }
  });

  // 5. Block / Unblock User
  socket.on('admin-toggle-block', (data) => {
    const user = users.find(u => u.id === data.userId);
    if (user) {
      user.isBlocked = data.block;
      io.emit('users-list-update', users);
    }
  });

  // 6. Delete User
  socket.on('admin-delete-user', (userId) => {
    users = users.filter(u => u.id !== userId);
    io.emit('users-list-update', users);
    socket.emit('admin-action-msg', 'युझर डिलीट केला आहे.');
  });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

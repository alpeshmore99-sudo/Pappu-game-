const express = require('http');
const expressApp = require('express');
const { Server } = require('socket.io');
const path = require('path');

const app = expressApp();
const server = express.createServer(app);
const io = new Server(server);

app.use(expressApp.json());
app.use(expressApp.urlencoded({ extended: true }));
app.use(expressApp.static(path.join(__dirname)));

// Admin Credentials
const ADMIN_ID = "PP00505555";
const ADMIN_PASS = "admin123";
const ADMIN_PIN = "1234";

// In-Memory Database (For production, use a database like MongoDB/SQLite)
let users = []; // { id, name, pass, pin, points, isBlocked, totalWon, totalLost }
let pendingTransfers = []; // { id, fromId, toId, amount, type, status, timestamp }
let transactionHistory = []; // { id, from, to, amount, date, time }

// Game Settings
let gameTimer = 60;
let currentBets = {}; // symbol: totalAmount
let userBets = {}; // socketId: { symbol: amount }
let profitMargin = 35; // Default 35% profit margin customizable by admin
let forcedWinner = null;

// Helper: Random ID & Password Generator
function generateUserId() {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return "PP" + randomNum;
}

function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Timer & Auto-Result Loop
setInterval(() => {
  gameTimer--;
  if (gameTimer <= 0) {
    declareGameResult();
    gameTimer = 60; // Reset timer
  }
  io.emit('timer-update', gameTimer);
}, 1000);

function declareGameResult() {
  const symbols = ['chhatri', 'ball', 'sun', 'lamp', 'cow', 'bucket', 'kite', 'top', 'flower', 'butterfly', 'pigeon', 'rabbit'];
  
  let winningSymbol = forcedWinner;
  if (!winningSymbol) {
    // Auto Result Logic with Profit Margin Retainment
    let totalCollected = Object.values(currentBets).reduce((a, b) => a + b, 0);
    
    // Find symbol with lowest bets to secure profit margin (30-35% target)
    let sortedSymbols = symbols.map(sym => ({ symbol: sym, amount: currentBets[sym] || 0 }))
                               .sort((a, b) => a.amount - b.amount);
    
    // Pick from lower-voted symbols to retain profit margin
    winningSymbol = sortedSymbols[0].symbol;
  }

  // Calculate Payouts and P&L
  let totalPayout = 0;
  // Distribute winnings to users who bet on winningSymbol (Multiplier e.g., 10x or custom)
  // Clear bets for next round
  currentBets = {};
  forcedWinner = null;
  
  io.emit('game-result-declared', { winner: winningSymbol });
  io.emit('live-bets-update', { bets: currentBets, expectedPayout: 0, margin: profitMargin });
  io.emit('users-list-update', users);
}

// Socket Connections
io.on('connection', (socket) => {
  
  // Admin Login
  socket.on('admin-login', (data) => {
    if (data.id === ADMIN_ID && data.pass === ADMIN_PASS && data.pin === ADMIN_PIN) {
      socket.adminAuthenticated = true;
      socket.emit('admin-login-response', { success: true });
      socket.emit('users-list-update', users);
      socket.emit('pending-transfers-update', pendingTransfers);
      socket.emit('transaction-history-update', transactionHistory);
    } else {
      socket.emit('admin-login-response', { success: false, message: 'चुकीचा आयडी, पासवर्ड किंवा पिन!' });
    }
  });

  // Update Profit Margin
  socket.on('admin-set-margin', (margin) => {
    if (!socket.adminAuthenticated) return;
    profitMargin = parseInt(margin) || 35;
    io.emit('admin-action-msg', `प्रॉफिट मार्जिन यशस्वीरित्या ${profitMargin}% सेट केले.`);
  });

  // Force Winner
  socket.on('admin-set-winner', (symbol) => {
    if (!socket.adminAuthenticated) return;
    forcedWinner = symbol;
    io.emit('admin-action-msg', `पुढील विजेता ${symbol} सेट करण्यात आला आहे.`);
  });

  // Create User Automatically
  socket.on('admin-create-user', (data) => {
    if (!socket.adminAuthenticated) return;
    const newId = generateUserId();
    const newPass = generatePassword();
    const newPin = generatePin();
    const userName = data.name || "User";

    const newUser = {
      id: newId,
      name: userName,
      pass: newPass,
      pin: newPin,
      points: 0,
      isBlocked: false,
      totalWon: 0,
      totalLost: 0
    };

    users.push(newUser);
    socket.emit('user-created-success', { id: newId, pass: newPass, pin: newPin, name: userName });
    io.emit('users-list-update', users);
  });

  // Admin to User / User to Admin Transfer Request Initiation
  socket.on('admin-transfer-points', (data) => {
    if (!socket.adminAuthenticated) return;
    const { userId, amount, pin, action } = data; // action: 'add' or 'deduct'
    
    if (pin !== ADMIN_PIN) {
      socket.emit('admin-action-msg', 'चुकाचा ॲडमिन पिन!');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      socket.emit('admin-action-msg', 'युझर सापडला नाही!');
      return;
    }

    const transferId = 'TRX' + Date.now();
    const transObj = {
      id: transferId,
      fromId: ADMIN_ID,
      toId: userId,
      amount: parseInt(amount),
      type: action, // add / deduct
      status: 'PENDING',
      timestamp: new Date().toLocaleString()
    };

    pendingTransfers.push(transObj);
    io.emit('pending-transfers-update', pendingTransfers);
    socket.emit('admin-action-msg', `पॉइंट ट्रान्सफर रिक्वेस्ट पाठवली: ${ADMIN_ID} <SPACE> ${amount} P`);
  });

  // Admin Cancel/Reject Pending Transfer
  socket.on('admin-cancel-transfer', (data) => {
    if (!socket.adminAuthenticated) return;
    const { transferId, pin } = data;
    if (pin !== ADMIN_PIN) {
      socket.emit('admin-action-msg', 'चुकीचा ॲडमिन पिन!');
      return;
    }

    pendingTransfers = pendingTransfers.filter(t => t.id !== transferId);
    io.emit('pending-transfers-update', pendingTransfers);
    socket.emit('admin-action-msg', 'ट्रान्सफर रिक्वेस्ट कॅन्सल केली.');
  });

  // User Receive Transfer (Simulated or via User Socket)
  socket.on('user-receive-transfer', (data) => {
    const { transferId, userId, pin } = data;
    const user = users.find(u => u.id === userId && u.pin === pin);
    if (!user) {
      socket.emit('user-action-msg', 'चुकीचा युझर आयडी किंवा पिन!');
      return;
    }

    const transfer = pendingTransfers.find(t => t.id === transferId && t.toId === userId && t.status === 'PENDING');
    if (!transfer) {
      socket.emit('user-action-msg', 'ट्रान्सफर सापडली नाही किंवा आधीच पूर्ण झाली आहे.');
      return;
    }

    if (transfer.type === 'add') {
      user.points += transfer.amount;
    } else if (transfer.type === 'deduct') {
      user.points = Math.max(0, user.points - transfer.amount);
    }

    transfer.status = 'COMPLETED';
    pendingTransfers = pendingTransfers.filter(t => t.id !== transferId);

    // Add to History
    transactionHistory.push({
      id: transfer.id,
      from: transfer.fromId,
      to: transfer.toId,
      amount: transfer.amount,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    });

    io.emit('pending-transfers-update', pendingTransfers);
    io.emit('transaction-history-update', transactionHistory);
    io.emit('users-list-update', users);
  });

  // Delete Transaction History (Requires Admin PIN)
  socket.on('admin-delete-history', (data) => {
    if (!socket.adminAuthenticated) return;
    const { historyId, pin } = data;
    if (pin !== ADMIN_PIN) {
      socket.emit('admin-action-msg', 'चुकीचा ॲडमिन पिन!');
      return;
    }

    transactionHistory = transactionHistory.filter(h => h.id !== historyId);
    io.emit('transaction-history-update', transactionHistory);
    socket.emit('admin-action-msg', 'हिस्ट्री सक्सेसफुली डिलीट केली.');
  });

  // Toggle User Block
  socket.on('admin-toggle-block', (data) => {
    if (!socket.adminAuthenticated) return;
    const user = users.find(u => u.id === data.userId);
    if (user) {
      user.isBlocked = data.block;
      io.emit('users-list-update', users);
    }
  });

  // Delete User
  socket.on('admin-delete-user', (userId) => {
    if (!socket.adminAuthenticated) return;
    users = users.filter(u => u.id !== userId);
    io.emit('users-list-update', users);
  });

  // Auto-Update User Credentials (Pass & PIN)
  socket.on('admin-reset-user-creds', (userId) => {
    if (!socket.adminAuthenticated) return;
    const user = users.find(u => u.id === userId);
    if (user) {
      user.pass = generatePassword();
      user.pin = generatePin();
      io.emit('users-list-update', users);
      socket.emit('admin-action-msg', `${user.id} चे नवीन Creds: Pass: ${user.pass} | PIN: ${user.pin}`);
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Pappu Game Server running on port ${PORT}`);
});
      

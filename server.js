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
// Route for User Panel (Main Page)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for Admin Panel
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin Credentials (Changable)
let adminConfig = {
  id: "PP00505555",
  pass: "admin123",
  pin: "1234"
};

// Database
let users = []; // { id, name, pass, pin, points, isBlocked, totalWon, totalLost }
let pendingTransfers = []; // { id, fromId, toId, amount, type, status, timestamp }
let transactionHistory = []; // { id, from, to, amount, date, time }

// Game Settings & State
let gameTimer = 60;
let currentBets = {}; // symbol: totalAmount
let profitMargin = 35; // Default 35%
let resultMode = 'auto'; // 'auto' or 'manual'
let forcedWinner = null;

// Symbols list with display names/emojis
const SYMBOLS = [
  { key: 'chhatri', name: 'छत्री (Umbrella)' },
  { key: 'ball', name: 'बॉल (Ball)' },
  { key: 'sun', name: 'सूर्य (Sun)' },
  { key: 'lamp', name: 'लंप (Lamp)' },
  { key: 'cow', name: 'गाय (Cow)' },
  { key: 'bucket', name: 'बकेट (Bucket)' },
  { key: 'kite', name: 'पतंग (Kite)' },
  { key: 'top', name: 'भोरा (Top)' },
  { key: 'flower', name: 'फुल (Flower)' },
  { key: 'butterfly', name: 'फुलपाखरू (Butterfly)' },
  { key: 'pigeon', name: 'कबुतर (Pigeon)' },
  { key: 'rabbit', name: 'ससा (Rabbit)' }
];

function generateUserId() {
  return "PP" + Math.floor(10000000 + Math.random() * 90000000);
}

function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
}

function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Timer Loop
setInterval(() => {
  gameTimer--;
  if (gameTimer <= 0) {
    declareGameResult();
    gameTimer = 60;
  }
  io.emit('timer-update', gameTimer);
}, 1000);

function declareGameResult() {
  let winningSymbol = '';
  let totalCollected = Object.values(currentBets).reduce((a, b) => a + b, 0);

  if (resultMode === 'manual' && forcedWinner) {
    winningSymbol = forcedWinner;
  } else {
    // Auto Mode: Pick symbol that secures profit margin (30-35% target)
    let sorted = SYMBOLS.map(s => ({ key: s.key, amount: currentBets[s.key] || 0 }))
                        .sort((a, b) => a.amount - b.amount);
    winningSymbol = sorted.length > 0 ? sorted[0].key : SYMBOLS[0].key;
  }

  // Reset bets for next round
  currentBets = {};
  forcedWinner = null;

  io.emit('game-result-declared', { winner: winningSymbol });
  broadcastDashboardData();
}

function broadcastDashboardData() {
  let totalCollected = Object.values(currentBets).reduce((a, b) => a + b, 0);
  
  // Calculate P&L preview for each symbol if it wins (assuming 9x multiplier or standard game rules)
  let symbolReports = SYMBOLS.map(s => {
    let symBet = currentBets[s.key] || 0;
    // Estimated payout if this symbol wins (Multiplier 9x as standard example)
    let payout = symBet * 9; 
    let houseProfit = totalCollected - payout;
    let profitPercentage = totalCollected > 0 ? ((houseProfit / totalCollected) * 100).toFixed(1) : 0;
    
    return {
      key: s.key,
      name: s.name,
      totalBet: symBet,
      estPayout: payout,
      houseProfit: houseProfit,
      profitPercentage: profitPercentage
    };
  });

  // Sort by highest bet volume descending
  symbolReports.sort((a, b) => b.totalBet - a.totalBet);

  io.emit('admin-live-report', {
    timer: gameTimer,
    totalBets: totalCollected,
    margin: profitMargin,
    resultMode: resultMode,
    symbolReports: symbolReports
  });
}

io.on('connection', (socket) => {
  
  socket.on('admin-login', (data) => {
    if (data.id === adminConfig.id && data.pass === adminConfig.pass && data.pin === adminConfig.pin) {
      socket.adminAuthenticated = true;
      socket.emit('admin-login-response', { success: true });
      broadcastDashboardData();
      socket.emit('users-list-update', users);
      socket.emit('pending-transfers-update', pendingTransfers);
      socket.emit('transaction-history-update', transactionHistory);
    } else {
      socket.emit('admin-login-response', { success: false, message: 'चुकीचा आयडी, पासवर्ड किंवा पिन!' });
    }
  });

  // Update Settings
  socket.on('admin-update-settings', (data) => {
    if (!socket.adminAuthenticated) return;
    profitMargin = parseInt(data.margin) || 35;
    resultMode = data.mode; // 'auto' or 'manual'
    broadcastDashboardData();
    socket.emit('admin-action-msg', 'सेटिंग्ज यशस्वीरित्या अपडेट केल्या.');
  });

  // Force Winner in Manual Mode
  socket.on('admin-set-winner', (symbol) => {
    if (!socket.adminAuthenticated) return;
    forcedWinner = symbol;
    socket.emit('admin-action-msg', `विजेता म्हणून ${symbol} फिक्स केला आहे.`);
  });

  // Change Admin Credentials & PIN
  socket.on('admin-update-credentials', (data) => {
    if (!socket.adminAuthenticated) return;
    const { oldPin, newId, newPass, newPin } = data;
    if (oldPin !== adminConfig.pin) {
      socket.emit('admin-action-msg', 'चुकीचा जुना ॲडमिन पिन!');
      return;
    }
    if (newId) adminConfig.id = newId;
    if (newPass) adminConfig.pass = newPass;
    if (newPin) adminConfig.pin = newPin;
    socket.emit('admin-action-msg', 'ॲडमिन क्रेडेन्शियल्स यशस्वीरित्या बदलले!');
  });

  // User Management
  socket.on('admin-create-user', (data) => {
    if (!socket.adminAuthenticated) return;
    const newUser = {
      id: generateUserId(),
      name: data.name || "User",
      pass: generatePassword(),
      pin: generatePin(),
      points: 0,
      isBlocked: false,
      totalWon: 0,
      totalLost: 0
    };
    users.push(newUser);
    socket.emit('user-created-success', newUser);
    io.emit('users-list-update', users);
  });

  // Update User Credentials/PIN by Admin
  socket.on('admin-update-user-creds', (data) => {
    if (!socket.adminAuthenticated) return;
    const { userId, newPass, newPin } = data;
    const user = users.find(u => u.id === userId);
    if (user) {
      if (newPass) user.pass = newPass;
      if (newPin) user.pin = newPin;
      io.emit('users-list-update', users);
      socket.emit('admin-action-msg', `युझर ${userId} चे क्रेडेन्शियल्स बदलले.`);
    }
  });

  // Point Transfers & History
  socket.on('admin-transfer-points', (data) => {
    if (!socket.adminAuthenticated) return;
    const { userId, amount, pin, action } = data;
    if (pin !== adminConfig.pin) {
      socket.emit('admin-action-msg', 'चुकीचा ॲडमिन पिन!');
      return;
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      socket.emit('admin-action-msg', 'युझर सापडला नाही!');
      return;
    }

    const transferObj = {
      id: 'TRX' + Date.now(),
      fromId: adminConfig.id,
      toId: userId,
      amount: parseInt(amount),
      type: action,
      status: 'PENDING',
      timestamp: new Date().toLocaleString()
    };

    pendingTransfers.push(transferObj);
    io.emit('pending-transfers-update', pendingTransfers);
    socket.emit('admin-action-msg', `पॉइंट ट्रान्सफर रिक्वेस्ट पाठवली.`);
  });

  socket.on('admin-cancel-transfer', (data) => {
    if (!socket.adminAuthenticated) return;
    if (data.pin !== adminConfig.pin) {
      socket.emit('admin-action-msg', 'चुकीचा ॲडमिन पिन!');
      return;
    }
    pendingTransfers = pendingTransfers.filter(t => t.id !== data.transferId);
    io.emit('pending-transfers-update', pendingTransfers);
  });

  socket.on('admin-delete-history', (data) => {
    if (!socket.adminAuthenticated) return;
    if (data.pin !== adminConfig.pin) {
      socket.emit('admin-action-msg', 'चुकीचा ॲडमिन पिन!');
      return;
    }
    transactionHistory = transactionHistory.filter(h => h.id !== data.historyId);
    io.emit('transaction-history-update', transactionHistory);
  });

  socket.on('admin-toggle-block', (data) => {
    if (!socket.adminAuthenticated) return;
    const user = users.find(u => u.id === data.userId);
    if (user) {
      user.isBlocked = data.block;
      io.emit('users-list-update', users);
    }
  });

  socket.on('admin-delete-user', (userId) => {
    if (!socket.adminAuthenticated) return;
    users = users.filter(u => u.id !== userId);
    io.emit('users-list-update', users);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
      

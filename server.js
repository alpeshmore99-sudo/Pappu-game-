const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from root directory
app.use(express.static(__dirname));

// Root route to serve index.html directly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('A user connected');

    // Timer simulation
    let timeLeft = 30;
    setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            timeLeft = 30;
            // Send random winner event for testing
            const symbols = ['chhatri', 'ball', 'sun', 'lamp', 'cow', 'bucket', 'kite', 'top', 'flower', 'butterfly', 'pigeon', 'rabbit'];
            let randomWinner = symbols[Math.floor(Math.random() * symbols.length)];
            io.emit('game-result', { winner: randomWinner });
        }
        io.emit('timer-update', timeLeft);
    }, 1000);

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

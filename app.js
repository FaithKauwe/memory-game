const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

// game state management object, data will persist in gameState until server is killed
let gameState = {
    players: {},
    currentPlayer: null,
    cards: [],
    flippedCards: [],
    playersCurrentFlippedCards: [], 
    matches: {player1: 0, player2: 0},
    gameStarted: false
};

app.use(express.static('static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html');
});

// Socket.io connection handling (following make-chat pattern)
io.on("connection", (socket) => {
    require('./sockets/game.js')(io, socket, gameState);
});

server.listen(PORT, () => {
    console.log(`Memory Game server running on port ${PORT}`);
});

const socket = io.connect();

let gameState = {
    cards: [],
    currentPlayer: null,
    playerId: null,
    players: {},
    flippedCards: [],
    matches: { player1: 0, player2: 0 },
    gameStarted: false
};

socket.on('connect', () => {
    console.log('Connected to server');
    updateGameStatus('Connected to server');
    
    // browser client joins as a player, emits message to server
    socket.emit('player_joined', {
        name: `Player ${Math.floor(Math.random() * 1000)}` // assign player a random number name 
    });
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateGameStatus('Disconnected from server');
});

socket.on('player_joined', (data) => {
    console.log('Player joined:', data);
    updateGameStatus(`Player ${data.playerNumber} joined`);
});

socket.on('player_left', (data) => {
    console.log('Player left:', data);
    updateGameStatus(`Player ${data.playerNumber} left`);
});

socket.on('game_start', (data) => {
    console.log('Game started:', data);
    gameState.gameStarted = true;
    gameState.cards = data.cards;
    gameState.currentPlayer = data.currentPlayer;
    gameState.playerId = data.playerId;
    
    renderGameBoard();
    updateTurnIndicator();
    updateGameStatus('Game started!');
});

socket.on('card_flipped', (data) => {
    console.log('Card flipped:', data);
    handleCardFlip(data);
});

socket.on('turn_change', (data) => {
    console.log('Turn changed:', data);
    gameState.currentPlayer = data.currentPlayer;
    updateTurnIndicator();
});

socket.on('match_found', (data) => {
    console.log('Match found:', data);
    handleMatchFound(data);
});

socket.on('game_over', (data) => {
    console.log('Game over:', data);
    handleGameOver(data);
});

function updateGameStatus(message) {
    const statusElement = document.querySelector('.turn-indicator');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function updateTurnIndicator() {
    const player1Element = document.getElementById('player1');
    const player2Element = document.getElementById('player2');
    
    if (player1Element && player2Element) {
        player1Element.classList.remove('active');
        player2Element.classList.remove('active');
        
        if (gameState.currentPlayer === 1) {
            player1Element.classList.add('active');
        } else if (gameState.currentPlayer === 2) {
            player2Element.classList.add('active');
        }
    }
}

function renderGameBoard() {
    const gameBoard = document.getElementById('gameBoard');
    if (!gameBoard) return;
    
    gameBoard.innerHTML = '';
    
    gameState.cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = index;
        cardElement.dataset.cardValue = card.value;
        cardElement.textContent = card.flipped ? card.value : '?';
        
        if (card.flipped) {
            cardElement.classList.add('flipped');
        }
        if (card.matched) {
            cardElement.classList.add('matched');
        }
        
        cardElement.addEventListener('click', handleCardClick);
        gameBoard.appendChild(cardElement);
    });
}

function handleCardClick(event) {
    if (!gameState.gameStarted || gameState.currentPlayer !== gameState.playerId) {
        return;
    }
    
    const cardId = parseInt(event.target.dataset.cardId);
    const card = gameState.cards[cardId];
    
    if (card.flipped || card.matched) {
        return;
    }
    
    socket.emit('flip_card', {
        cardId: cardId,
        playerId: gameState.playerId
    });
}

function handleCardFlip(data) {
    const card = gameState.cards[data.cardId];
    card.flipped = true;
    
    const cardElement = document.querySelector(`[data-card-id="${data.cardId}"]`);
    if (cardElement) {
        cardElement.textContent = card.value;
        cardElement.classList.add('flipped');
    }
}

function handleMatchFound(data) {
    data.matchedCards.forEach(cardId => {
        const card = gameState.cards[cardId];
        card.matched = true;
        
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.classList.add('matched');
        }
    });
    
    updateScores(data.scores);
}

function handleGameOver(data) {
    gameState.gameStarted = false;
    updateGameStatus(`Game Over! ${data.winner} wins!`);
    
    const resetButton = document.getElementById('resetGame');
    if (resetButton) {
        resetButton.disabled = false;
    }
}

function updateScores(scores) {
    const player1Score = document.querySelector('#player1 .score');
    const player2Score = document.querySelector('#player2 .score');
    
    if (player1Score) player1Score.textContent = scores.player1;
    if (player2Score) player2Score.textContent = scores.player2;
}

document.getElementById('startGame')?.addEventListener('click', () => {
    socket.emit('start_game');
});

document.getElementById('resetGame')?.addEventListener('click', () => {
    socket.emit('reset_game');
    location.reload();
});

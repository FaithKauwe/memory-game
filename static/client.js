const socket = io.connect();

// this gameState is a separate object from the gameState in app.js
// the data object from the emit calls carries the info that each client/ server's gameState
// needs to update itsel
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
    // every emit function can include a data object with specified shape 
    // (like here, name is the key in the key value pair I am specifying I want the data object to have)
    // but it's not required
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

socket.on('match_found', (data) => {
    console.log('Match found!', data);
    
    // use data object info to mark cards as matched in gamestate object
    data.matchedCards.forEach(cardId => {
        const card = gameState.cards[cardId];
        if (card) {
            card.matched = true;
        }
    });
    
    // Update UI to show matched cards
    data.matchedCards.forEach(cardId => {
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.classList.add('matched');
        }
    });
    

    updateScores(data.scores);
    
    
    updateGameStatus(`🎉 ${data.playerName} found a match! ${data.cardValue} ${data.cardValue}`);
});

socket.on('no_match', (data) => {
    console.log('No match:', data);
    
    // Show no match message
    updateGameStatus(data.message);
    
    // Cards stay flipped - player can manually flip them back
});

// client- side event listeners and handlers
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

socket.on('card_flipped_face-down', (data) => {
    console.log('Card flipped face-down:', data);
    handleCardFlipFaceDown(data);
});

socket.on('turn_change', (data) => {
    console.log('Turn changed:', data);
    gameState.currentPlayer = data.currentPlayer;
    updateTurnIndicator();
});

socket.on('invalid_turn', (data) => {
    console.log('Invalid turn attempt:', data);
    updateGameStatus(data.message);
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
    const cardId = parseInt(event.target.dataset.cardId);
    
    // For now, allow any player to flip any card (we'll add turn validation later)
    socket.emit('flip_card', {
        cardId: cardId,
        playerId: gameState.playerId || 'unknown'
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

function handleCardFlipFaceDown(data) {
    const card = gameState.cards[data.cardId];
    card.flipped = false;
// change the css to show the card flips    
    const cardElement = document.querySelector(`[data-card-id="${data.cardId}"]`);
    if (cardElement) {
        cardElement.textContent = '?';
        cardElement.classList.remove('flipped');
    }
}

function handleMatchFound(data) {
    // This function is now handled by the match_found socket event
    // Keeping it for compatibility but the socket.on('match_found') does the work
    console.log('Match found via handleMatchFound:', data);
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
    console.log('Start game button clicked');
    socket.emit('start_game');
});

document.getElementById('resetGame')?.addEventListener('click', () => {
    socket.emit('reset_game');
    location.reload();
});

module.exports = (io, socket, gameState) => {
    console.log('Player connected:', socket.id);
    
    
    function generateCardDeck(difficulty = 'easy') {
        
        const easyAnimals = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐘'];
        
        
        const hardAnimals = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐘',
                            '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🦄', '🦉', '🦈', '🐙'];
        
        const animals = difficulty === 'hard' ? hardAnimals : easyAnimals;
        const cards = [];
        
        // Create 2 cards for each animal
        // flipped and matched are initialized as false for all cards
        animals.forEach(animal => {
            cards.push({ value: animal, flipped: false, matched: false });
            cards.push({ value: animal, flipped: false, matched: false });
        });
        
        // fisher-yates algo "shuffles" the cards, moves backwards through array
        // swaps the current element with a random element in the array
        // i is the iterating variable and j is the random index
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        
        console.log(`🎲 ${difficulty.toUpperCase()} mode: ${cards.length} cards shuffled! Good luck!`);
        
        return cards;
    }
    
    // socket listeneres and handlers code- the server side logic 
    
    // listener for the 'player_joined' event, handles player joining 
    socket.on('player_joined', (playerData) => {
        console.log('Player joined:', playerData);
        
        // assign player number based on how many players are already connected
        const playerCount = Object.keys(gameState.players).length;
        const playerNumber = playerCount + 1;
        
        // store and update player info in gameState, which acts like a db
        gameState.players[socket.id] = {
            id: socket.id,
            name: playerData.name || `Player ${playerNumber}`,
            playerNumber: playerNumber,
            score: 0
        };
        
        // send a real-time message to all browser clients currently connected to the game
        // console log in server side (terminal) and client side (browser dev toolsconsole)
        io.emit('player_joined', {
            playerId: socket.id,
            playerNumber: playerNumber,
            playerName: gameState.players[socket.id].name,
            totalPlayers: Object.keys(gameState.players).length
        });
        
        console.log(`Player ${playerNumber} joined. Total players: ${Object.keys(gameState.players).length}`);
    });
    
    // listener for the 'flip_card' event coming from the client browsers, 
    // handles card flip and match detection logic
    socket.on('flip_card', (cardData) => {
        console.log('Card flip attempt:', cardData);
        
        const cardId = cardData.cardId;
        const card = gameState.cards[cardId];
        
        // Prevent flipping if game hasn't started or card doesn't exist
        if (!gameState.gameStarted || !card) {
            console.log('Game not started or card does not exist, ignoring');
            return;
        }
        
        // if card is .matched, do nothing
        if (card.matched) {
            console.log('Card is matched, ignoring clicks');
            return;
        }
        
        // Turn validation - only current player can flip cards
        // get current player from gameState.players object
        const player = gameState.players[socket.id];
        if (!player || player.playerNumber !== gameState.currentPlayer) {
            console.log(`Player ${player?.playerNumber} tried to flip card, but it's Player ${gameState.currentPlayer}'s turn`);
            
            // Send message to the player who tried to flip out of turn
            // target specific player using socket.emit instead of io.emit
            socket.emit('invalid_turn', {
                message: `It's Player ${gameState.currentPlayer}'s turn!`,
                currentPlayer: gameState.currentPlayer
            });
            return;
        }
        
        // Check if turn is locked (after no match, waiting for end turn button click)
        // Still allow flipping cards face-down even when locked
        if (gameState.turnLocked && !card.flipped) {
            console.log(`Turn is locked - Player ${player.playerNumber} must flip cards face-down or click End Turn`);
            socket.emit('turn_locked', {
                message: 'Flip your cards face-down and click "End Turn"'
            });
            return;
        }
        
        // listen for a click here, where card is face-up but not matched,
        //  and emit the flipped back event to all players
        if (card.flipped) {
            console.log(`Card ${cardId} (${card.value}) flipped face-down`);
            card.flipped = false;
            
            
            io.emit('card_flipped_face-down', {
                cardId: cardId,
                playerId: socket.id,
                playerName: gameState.players[socket.id]?.name
            });
            return;
        }
        
        // handle flip event when card is face-down, changing to face-up
        console.log(`Card ${cardId} flipping face-up`);
        card.flipped = true;
        
        
        gameState.playersCurrentFlippedCards.push(cardId);
        
        
        io.emit('card_flipped', {
            cardId: cardId,
            cardValue: card.value,
            playerId: socket.id,
            playerName: gameState.players[socket.id]?.name
        });
        
        console.log(`Card ${cardId} (${card.value}) flipped. Current flipped: [${gameState.playersCurrentFlippedCards}]`);
        
        // Check if this is the second card flipped
        if (gameState.playersCurrentFlippedCards.length === 2) {
            console.log('Two cards flipped, checking for match...');
            // array destructuring to automatically assign the first and second card indices to the variables
            const [firstCardIndex, secondCardIndex] = gameState.playersCurrentFlippedCards;
            // get the card value objects from the big cards array, using indices that just came from player
            const firstCard = gameState.cards[firstCardIndex];
            const secondCard = gameState.cards[secondCardIndex];
            
            
            if (firstCard.value === secondCard.value) {
                console.log('MATCH FOUND!', firstCard.value);
                
                
                firstCard.matched = true;
                secondCard.matched = true;
                
                // Update player score
                const player = gameState.players[socket.id];
                if (player) {
                    player.score += 1;
                    gameState.matches[`player${player.playerNumber}`] += 1;
                }
                
                
                io.emit('match_found', {
                    matchedCards: [firstCardIndex, secondCardIndex],
                    cardValue: firstCard.value,
                    playerId: socket.id,
                    playerName: player?.name,
                    scores: gameState.matches
                });
                
                // after each match is found, check if *all matches are found (game over) by checking the state of each card
                const allMatched = gameState.cards.every(card => card.matched);
                if (allMatched) {
                    
                    const winner = gameState.matches.player1 > gameState.matches.player2 ? 'Player 1' : 
                                  gameState.matches.player2 > gameState.matches.player1 ? 'Player 2' : 'Tie!';
                    
                    console.log(`Game Over! ${winner} wins!`);
                    gameState.gameStarted = false;
                    
                    
                    io.emit('game_over', {
                        winner: winner,
                        scores: gameState.matches,
                        message: `🎉 Game Over! ${winner} wins! 🎉`
                    });
                }
                
            } else {
                console.log('NO MATCH:', firstCard.value, 'vs', secondCard.value);
                
                // Lock the turn - player must flip cards back and click End Turn
                gameState.turnLocked = true;
                
                // Broadcast no match (cards stay flipped for manual flip-back)
                io.emit('no_match', {
                    flippedCards: [firstCardIndex, secondCardIndex],
                    message: 'No match! Flip the cards back and click "End Turn".'
                });
            }
            
            // Clear the current turn's flipped cards array, only need to exist for the duration of a player's turn
            gameState.playersCurrentFlippedCards = [];
            console.log('Cleared playersCurrentFlippedCards, ready for next turn');
        }
    });
    
    // listener for the 'start_game' event coming from the client browsers, handles game start
    socket.on('start_game', (data) => {
        const difficulty = data?.difficulty || 'easy';
        console.log(`Game start requested - ${difficulty} mode`);
        
        // update the gameState storage object, data will persist in gameState until server is killed
        gameState.cards = generateCardDeck(difficulty);
        gameState.gameStarted = true;
        gameState.currentPlayer = 1; // Start with player 1
        
        // send game start info back to client browsers
        io.emit('game_start', {
            cards: gameState.cards,
            currentPlayer: gameState.currentPlayer,
            playerId: socket.id,
            difficulty: difficulty
        });
        
        console.log(`Game started with ${gameState.cards.length} cards in ${difficulty} mode`);
    });
    
    // listener for the 'end_turn' event - switches turns and unlocks board
    socket.on('end_turn', () => {
        console.log('End turn requested');
        
        const player = gameState.players[socket.id];
        
        // Validate it's the current player ending their turn
        if (!player || player.playerNumber !== gameState.currentPlayer) {
            console.log('Player tried to end turn when it was not their turn');
            return;
        }
        
        // Switch to the other player
        const previousPlayer = gameState.currentPlayer;
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        
        // Unlock the turn for the next player
        gameState.turnLocked = false;
        
        // Broadcast turn change to all players
        io.emit('turn_change', {
            currentPlayer: gameState.currentPlayer,
            previousPlayer: previousPlayer
        });
        
        console.log(`Turn switched from Player ${previousPlayer} to Player ${gameState.currentPlayer}`);
    });
    
    // listener for the 'reset_game' event coming from the client browsers, handles game reset
    socket.on('reset_game', () => {
        console.log('Game reset requested');
        
        gameState.cards = [];
        gameState.gameStarted = false;
        gameState.currentPlayer = 1;
        gameState.playersCurrentFlippedCards = [];
        gameState.matches = { player1: 0, player2: 0 };
        
        // Reset player scores
        Object.values(gameState.players).forEach(player => {
            player.score = 0;
        });
        
        // Notify all clients that game has been reset
        io.emit('game_reset', {
            message: 'Game has been reset. Click "Start Game" to begin a new game.'
        });
        
        console.log('Game reset complete');
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        // remove player from gameState temp storage
        if (gameState.players[socket.id]) {
            const playerNumber = gameState.players[socket.id].playerNumber;
            delete gameState.players[socket.id];
            
            // Notify remaining players
            io.emit('player_left', {
                playerId: socket.id,
                playerNumber: playerNumber,
                totalPlayers: Object.keys(gameState.players).length
            });
            
            console.log(`Player ${playerNumber} left. Remaining players: ${Object.keys(gameState.players).length}`);
        }
    });
};

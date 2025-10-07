module.exports = (io, socket, gameState) => {
    console.log('Player connected:', socket.id);
    
    
    function generateCardDeck() {
        const animals = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐘'];
        const cards = [];
        
        // create 2 cards for each animal (10 pairs = 20 cards)
        // flipped and matched are intialized as false for all cards
        // ^^ these comments go with the final implementation, not the development ahrd coded version
        // HARDCODED FOR TESTING - Easy to find matching pairs!
        // Position 0 & 10 = 🐶🐶, Position 1 & 11 = 🐱🐱, etc.
        animals.forEach((animal, index) => {
            // First card of each pair at position 0-9
            cards[index] = { value: animal, flipped: false, matched: false };
            // Second card of each pair at position 10-19  
            cards[index + 10] = { value: animal, flipped: false, matched: false };
        });
     // fisher-yates algo "shuffles" the cards, moves backwards through array
        // swaps the current element with a random element in the array
        // i is the iterating variable and j is the random index
        // ^^ these comments go with the final implementation, not the development ahrd coded version
   
        console.log('HARDCODED CARDS FOR TESTING:');
        console.log('Cards 0 & 10 = 🐶🐶 (flip these for match!)');
        console.log('Cards 1 & 11 = 🐱🐱 (flip these for match!)');
        console.log('Cards 2 & 12 = 🐭🐭 (flip these for match!)');
        console.log('Cards 3 & 13 = 🐹🐹 (flip these for match!)');
        console.log('Cards 4 & 14 = 🐰🐰 (flip these for match!)');
        
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
                
            } else {
                console.log('NO MATCH:', firstCard.value, 'vs', secondCard.value);
                
                // Broadcast no match (cards stay flipped for manual flip-back)
                io.emit('no_match', {
                    flippedCards: [firstCardIndex, secondCardIndex],
                    message: 'No match! Flip the cards back manually and pass your turn to the next player.'
                });
            }
            
            // Clear the current turn's flipped cards array, only need to exist for the duration of a player's turn
            gameState.playersCurrentFlippedCards = [];
            console.log('Cleared playersCurrentFlippedCards, ready for next turn');
        }
    });
    
    // listener for the 'start_game' event coming from the client browsers, handles game start
    socket.on('start_game', () => {
        console.log('Game start requested');
        
        // update the gameState storage object, data will persist in gameState until server is killed
        gameState.cards = generateCardDeck();
        gameState.gameStarted = true;
        gameState.currentPlayer = 1; // Start with player 1
        
        // send game start info back to client browsers
        io.emit('game_start', {
            cards: gameState.cards,
            currentPlayer: gameState.currentPlayer,
            playerId: socket.id
        });
        
        console.log('Game started with', gameState.cards.length, 'cards');
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

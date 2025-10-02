module.exports = (io, socket, gameState) => {
    console.log('Player connected:', socket.id);
    
    
    function generateCardDeck() {
        const animals = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐘'];
        const cards = [];
        
        // create 2 cards for each animal (10 pairs = 20 cards)
        // flipped and matched are intialized as false for all cards
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
        
        return cards;
    }
    
    // socket listeneres and handlers code 
    
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

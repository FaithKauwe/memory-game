# Memory Game

## Team Members
- [Your Name Here]

## App Description
A real-time multiplayer Memory card game built with Socket.io and Express.js. Two players can join a game room and take turns flipping cards to find matching pairs. The game features real-time synchronization, turn-based gameplay, and automatic match detection.

## Justification for Using WebSockets
WebSockets are essential for this Memory Game because:

1. **Real-time Synchronization**: Both players need to see card flips instantly without page refreshes
2. **Turn-based Gameplay**: The server must validate and enforce turn order between players
3. **State Management**: Game state (cards, scores, current player) must be synchronized across all clients
4. **Immediate Feedback**: Players need instant notification when matches are found or turns change
5. **Connection Management**: Handle player disconnections gracefully and notify remaining players

Traditional HTTP requests would require constant polling, creating latency and unnecessary server load. WebSockets provide bidirectional, low-latency communication perfect for real-time games.

## Socket.io Events

### Client → Server Events
1. **`player_joined`** - Player connects and joins the game
2. **`flip_card`** - Player attempts to flip a card (validated for turn)
3. **`start_game`** - Initiate game start when both players ready
4. **`reset_game`** - Start a new game after completion

### Server → Client Events
1. **`player_joined`** - Notify all clients when a player joins
2. **`game_start`** - Send initial game state to all players
3. **`card_flipped`** - Broadcast card flip to all players
4. **`turn_change`** - Notify clients whose turn it is
5. **`match_found`** - Broadcast when a match is found
6. **`game_over`** - Announce winner and end game

## Additional Pattern Implemented
**Room-based Game Management**: The game implements a room system where players join specific game rooms, allowing for multiple concurrent games and better organization of game state.

## Labeled Mockup
[INSERT MOCKUP HERE - Use draw.io, Figma, or hand-drawn diagram showing:]
- Game board with 20 cards (4x5 grid)
- Player scores and turn indicators
- Event flow arrows showing Socket.io communication
- Key UI elements and their interactions

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation Steps
1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd memory-game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### How to Run
1. Start the server using `npm start` or `node app.js`
2. Open two browser windows/tabs to `http://localhost:3000`
3. Player 1 will join automatically
4. Player 2 will join when they connect
5. Click "Start Game" to begin
6. Players take turns clicking cards to find matches
7. Game ends when all pairs are found

## Project Structure
```
📂 memory-game
    ├── 📂 static
        ├── 📄 client.js      # Socket.io client & game logic
        ├── 📄 index.html     # Game UI and card grid
        └── 📄 style.css      # Styling and animations
    ├── 📄 app.js            # Express server & Socket.io setup
    ├── 📄 package.json      # Dependencies and scripts
    └── 📄 README.md         # This file
```

## Development Notes
- Built following Socket.io patterns from make-chat tutorial
- Uses Express.js for serving static files
- Implements real-time game state synchronization
- Features responsive design for mobile devices
- Includes comprehensive error handling and disconnection management

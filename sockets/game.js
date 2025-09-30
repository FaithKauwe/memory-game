module.exports = (io, socket, gameState) => {
    console.log('Player connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
    });
};

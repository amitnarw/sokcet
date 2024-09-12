import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const rooms = {}; // { roomName: { players: { playerName: score } } }

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    // Request the list of available rooms
    socket.on('requestRoomList', () => {
        console.log('Request for room list received');
        const roomNames = Object.keys(rooms);
        console.log('Sending room list:', roomNames);
        socket.emit('updateRooms', roomNames);
    });

    // Handle room creation
    socket.on('createRoom', (roomName) => {
        if (!rooms[roomName]) {
            rooms[roomName] = { players: {} };
            io.emit('updateRooms', Object.keys(rooms)); // Notify all clients of the new room
            socket.emit('roomCreated', roomName); // Notify the creator of the new room
        } else {
            socket.emit('roomExists', roomName); // Notify if the room already exists
        }
    });

    // Handle room joining
    socket.on('joinRoom', (roomName) => {
        if (rooms[roomName]) {
            socket.join(roomName);
            socket.emit('roomJoined', roomName); // Notify the user they joined
            io.to(roomName).emit('updatePlayers', rooms[roomName].players); // Update players list in the room
        } else {
            socket.emit('roomNotFound', roomName); // Notify if the room doesn't exist
        }
    });

    // Handle updating player scores
    socket.on('updateScore', (room, name, score) => {
        if (rooms[room]) {
            rooms[room].players[name] = score;
            io.to(room).emit('updatePlayers', rooms[room].players); // Notify everyone in the room
        } else {
            socket.emit('roomNotFound', room); // Notify if the room doesn't exist
        }
    });

    // Handle room deletion
    socket.on('deleteRoom', (roomName) => {
        if (rooms[roomName]) {
            delete rooms[roomName];
            io.emit('updateRooms', Object.keys(rooms)); // Notify all clients of the room deletion
            io.to(roomName).emit('roomDeleted', roomName); // Notify clients in the room
            io.in(roomName).socketsLeave(roomName); // Disconnect clients from the room
        } else {
            socket.emit('roomNotFound', roomName); // Notify if the room doesn't exist
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

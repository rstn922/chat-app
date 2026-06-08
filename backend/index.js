const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory database
let users = {};
let messages = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Send current state to the newly connected user
  socket.emit('initial_data', { users, messages });

  // Handle a user joining or updating their name
  socket.on('join_chat', ({ userId, username }) => {
    const isNewJoin = !users[userId];
    const oldName = users[userId];

    users[userId] = username;
    
    // Broadcast the updated user list to everyone
    io.emit('user_update', { userId, username });

    // Generate and broadcast system message
    const sysMsgText = isNewJoin 
      ? `${username} memasuki chat`
      : `${oldName} mengganti nama menjadi ${username}`;

    const sysMsg = {
      id: Date.now() + Math.random(),
      isSystem: true,
      text: sysMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    messages.push(sysMsg);
    io.emit('new_message', sysMsg);
  });

  // Handle new message
  socket.on('send_message', (msg) => {
    messages.push(msg);
    io.emit('new_message', msg);
  });

  // Handle edit message
  socket.on('edit_message', ({ id, text }) => {
    const messageIndex = messages.findIndex(m => m.id === id);
    if (messageIndex !== -1) {
      messages[messageIndex].text = text;
      messages[messageIndex].edited = true;
      io.emit('message_edited', { id, text });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

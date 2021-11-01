const express = require('express');

const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
// const cors = require('cors');

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
  },
});

// app.use(cors());
// app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('hi');
  // res.sendFile(__dirname + '/index.html');
});

io.on('connection', socket => {
  console.log('a user connected');
});

server.listen(3000, () => {
  console.log('listening on *: 3000');
});

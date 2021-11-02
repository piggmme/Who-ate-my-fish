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

// http 통신을 위한 cors
// app.use(cors());
// app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('hi');
  // res.sendFile(__dirname + '/index.html');
});
const mapNameId = {};
const CHARACTER = [
  ['네로', './images/cats/cat6.png'],
  ['오드아이', './images/cats/cat2.png'],
  ['삼색이', './images/cats/cat3.png'],
  ['치즈', './images/cats/cat4.png'],
  ['샴', './images/cats/cat5.png'],
];

const civilUsers = [];

const userUpdate = socketId => {
  const userInfo = CHARACTER.shift();
  civilUsers.push(userInfo);
  mapNameId[userInfo[0]] = socketId;
  io.to(socketId).emit('user update', userInfo);
  io.emit('currentUsers', civilUsers);
};

// 들어올 때마다 모든 사람들한테 이벤트 방출해서 civilusers 제공!
io.on('connection', socket => {
  if (civilUsers.length < 5) {
    userUpdate(socket.id);
  }
});

server.listen(3000, () => {
  console.log('listening on *: 3000');
});

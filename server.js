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
// TODO: 특정 url만 접근할 수 있게 cors 설정!
// app.use(cors());
// app.use(express.static('public'));

// app.get('/', (req, res) => {
//   res.send('hi');
//   // res.sendFile(__dirname + '/index.html');
// });

// const CHARACTER = [
//   ['네로', './images/cats/cat6.png'],
//   ['오드아이', './images/cats/cat2.png'],
//   ['삼색이', './images/cats/cat3.png'],
//   ['치즈', './images/cats/cat4.png'],
//   ['샴', './images/cats/cat5.png'],
// ];

// const civilUsers = [];

// const mapNameId = {};

// const userUpdate = socketId => {
//   const userInfo = CHARACTER.shift();
//   civilUsers.push(userInfo);
//   mapNameId[userInfo[0]] = socketId;

//   return userInfo;
// };

// // 들어올 때마다 모든 사람들한테 이벤트 방출해서 civiluSers 제공!2
// io.on('connection', socket => {
//   if (civilUsers.length < 5) {
//     userUpdate(socket.id);
//     io.to(socket.id).emit('user update', userUpdate());
//     io.emit('currentUsers', civilUsers);
//   }
// });

// 사용자는 5명으로 제한됨.
const user = (() => {
  const users = [];
  const waitingUsers = [];
  const ch = Array(5).fill(0);
  const catsInfo = [
    ['오드아이', './images/cats/cat1.png'],
    ['삼색이', './images/cats/cat2.png'],
    ['샴', './images/cats/cat3.png'],
    ['고등어', './images/cats/cat4.png'],
    ['치즈', './images/cats/cat5.png'],
  ];

  const randomCat = () => {
    let idx = Math.floor(Math.random() * 5 - 0.1); // 0 ~ 4
    while (ch[idx] !== 0) {
      idx = Math.floor(Math.random() * 5);
    }
    ch[idx] = 1;
    return catsInfo[idx];
  };

  return {
    add(id) {
      if (users.length === 5) {
        waitingUsers.push(id);
        return false;
      }
      const catInfo = randomCat();
      users.push(catInfo);
      return catInfo;
    },
    currentUser() {
      return users;
    },
    // delete(id, catName) {
    //   const idx = catsInfo.map(el => el[0]).indexOf(catName);
    //   ch[idx] = 0;
    //   users = users.filter(([, usersId]) => usersId !== id);
    // },
  };
})();

// socket.io ---------------------------------------------

io.on('connection', socket => {
  const catInfo = user.add(socket.id);

  if (catInfo) {
    io.to(socket.id).emit('user update', catInfo);

    io.emit('userInfo', user.currentUser());

    // 연결이 끊어진 경우
    // socket.on('disconnect', () => {
    //   user.delete(socket.id, curCatName);
    // });
  } else {
    console.log('waiting');
  }
});

server.listen(3000, () => {
  console.log('listening on *: 3000');
});

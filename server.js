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

// 사용자는 5명으로 제한됨.
const user = (() => {
  let users = [];
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
      console.log(users);
      const catInfo = randomCat();
      console.log(catInfo);
      users.push([...catInfo, id]);
      console.log('users: ' + users);
      return catInfo;
    },
    currentUser() {
      return users;
    },
    delete(id, catName) {
      const idx = catsInfo.map(el => el[0]).indexOf(catName);
      ch[idx] = 0;
      users = users.filter(user => user[2] !== id);
    },
  };
})();

// 들어올 때마다 모든 사람들한테 이벤트 방출해서 civilusers 제공!
io.on('connection', socket => {
  const catInfo = user.add(socket.id);
  // console.log(catInfo);

  if (catInfo) {
    io.to(socket.id).emit('user update', catInfo);
    io.emit('currentUsers', user.currentUser());

    // chat message이벤트가 발생한 경우
    socket.on('chat message', msg => {
      io.emit('chat message', [...catInfo, msg, socket.id]);
    });

    socket.on('disconnect', () => {
      user.delete(socket.id, catInfo[0]);
      console.log(user.currentUser());
      io.emit('user disconnect', user.currentUser());
    });
    // 연결이 끊어진 경우
  } else {
    console.log('waiting');
  }
});

// 특정 소켓(socket)을 제외한 모든 사람들에게 전달하고 싶을 경우
// io.on('connection', socket => {
//   socket.broadcast.emit('hi');
// });

server.listen(3000, () => {
  console.log('listening on *:3000');
});

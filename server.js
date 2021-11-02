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

const getRandom = () => Math.floor(Math.random() * 5); // 0 ~ 4

// 사용자는 5명으로 제한됨.
const user = (() => {
  let users = [];
  const waitingUsers = [];
  const ch = Array(5).fill(0);
  const catsInfo = [
    ['오드아이', './images/cats/cat2.png'],
    ['삼색이', './images/cats/cat3.png'],
    ['샴', './images/cats/cat5.png'],
    ['고등어', './images/cats/cat1.png'],
    ['치즈', './images/cats/cat4.png'],
  ];

  const randomCat = () => {
    let idx = Math.floor(Math.random() * 5); // 0 ~ 4
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
      users.push([...catInfo, id]);
      return catInfo;
    },
    currentUser() {
      return users;
    },
    setWaitingUsers(id) {
      waitingUsers.push(id);
    },
    delete(id, catName) {
      const idx = catsInfo.map(el => el[0]).indexOf(catName);
      ch[idx] = 0;
      users = users.filter(user => user[2] !== id);
    },
  };
})();

const gameInfo = (() => {
  let citizens = [];
  let mafia = [];

  return {
    getCitizens() {
      return citizens;
    },
    getMafia() {
      return mafia;
    },
    setCitizens(citizensArray) {
      citizens = [...citizensArray];
    },
    setMafia(idx) {
      mafia = citizens[idx];
      citizens.splice(idx, 1);
    },
  };
})();

// 들어올 때마다 모든 사람들한테 이벤트 방출해서 civilusers 제공!
io.on('connection', socket => {
  let catInfo = '';
<<<<<<< HEAD

  if (user.currentUser().length < 5) {
    catInfo = user.add(socket.id);
  } else {
    io.emit('timer setting', 'beginning');
    user.setWaitingUsers(socket.id);
  }
=======
  if (user.currentUser().length < 5) {
    catInfo = user.add(socket.id);
  } else {
    user.setWaitingUsers(socket.id);
  }

  // console.log(catInfo);
>>>>>>> 5df4217b7331b35e4429479deb8e841d5bbf106e

  if (catInfo) {
    if (user.currentUser().length === 5) {
      gameInfo.setCitizens(user.currentUser());
      gameInfo.setMafia(getRandom());
    }

    io.to(socket.id).emit('user update', catInfo);

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

  io.emit('currentUsers', user.currentUser());
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

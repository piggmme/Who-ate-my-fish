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
  // const waitingUsers = [];
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
      const catInfo = randomCat();
      users.push([...catInfo, id]);
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

const gameInfo = (() => {
  let citizens = [];
  let mafia = [];
  const jailCat = [];
  const secretCode = '햄버거버거';

  return {
    getCitizens() {
      return citizens;
    },
    getMafia() {
      return mafia;
    },
    getJailCat() {
      return jailCat;
    },
    getSecretCode() {
      return secretCode;
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

const GAMESTAGE = {
  PENDING: 'pending',
  BEGINNING: 'beginning',
  DAY: 'day',
  NIGHT: 'night',
};

// 들어올 때마다 모든 사람들한테 이벤트 방출해서 civilusers 제공!
io.on('connection', socket => {
  let catInfo = '';
  if (user.currentUser().length < 5) {
    catInfo = user.add(socket.id);
  } else {
    io.to(socket.id).emit('fullRoom');
  }

  // console.log(catInfo);
  // 5명 인원수 이하
  if (catInfo) {
    if (user.currentUser().length === 5) {
      gameInfo.setCitizens(user.currentUser());
      gameInfo.setMafia(getRandom());
      io.emit('change gameState', GAMESTAGE.BEGINNING);

      setTimeout(() => {
        gameInfo.getCitizens().forEach(civil => {
          io.to(civil[2]).emit('get secret-code', gameInfo.getSecretCode(), true);
        });

        io.to(gameInfo.getMafia()[2]).emit('get mafia-code', '', false);
      }, 6000);
    }

    io.to(socket.id).emit('user update', catInfo);

    // chat message이벤트가 발생한 경우
    socket.on('chat message', msg => {
      io.emit('chat message', [...catInfo, msg, socket.id]);
    });

    socket.on('disconnect', () => {
      user.delete(socket.id, catInfo[0]);
      io.emit('user disconnect', user.currentUser());
    });
  } else {
    console.log('user disconnected');
  }

  socket.on('force disconnected', () => {
    socket.disconnect(true);
  });

  io.emit('currentUsers', user.currentUser());

  // let voteResult = [];
  // let voteCat = '';
  // let maxVal = 0;
  // let flag = true;

  // 각 클라이언트가 선택한 고양이 이름 받기.
  // socket.on('dayVote', name => {
  //   voteResult.push(name);
  //   if (voteResult.length === user.currentUser().length - gameInfo.getJailCat().length) {
  //     const newMap = new Map();

  //     voteResult.forEach(el => newMap.set(el, newMap.get(el) + 1 || 1));

  //     for (const x of newMap.keys()) {
  //       if (newMap.get(x) > maxVal) {
  //         voteCat = x;
  //         maxVal = newMap.get(x);
  //       } else if (newMap.get(x) === maxVal) {
  //         flag = false;
  //         break;
  //       }
  //     }

  //     // 무효표가 아니면 특정 이름을 보내고 아니면 무효 보냄
  //     if (flag) {
  //       socket.emit('dayVote result', voteCat);
  //     } else {
  //       socket.emit('dayVote result', '');
  //     }

  //     voteResult = [];
  //     voteCat = '';
  //     maxVal = 0;
  //     flag = true;
  //   }
  // });

  // socket.on('nightVote', name => {
  //   console.log(name);
  // });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

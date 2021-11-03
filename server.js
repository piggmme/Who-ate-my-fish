const express = require('express');

const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
const secretCodeObject = require('./db/secretCode.json');

/**
 * Create socket io and setting cors for accessing from different url
 */
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
  },
});

/**
 * Constant object for indicating game stage
 * @constant
 * @type {string}
 */
const GAMESTAGE = {
  PENDING: 'pending',
  BEGINNING: 'beginning',
  DAY: 'day',
  NIGHT: 'night',
};

/**
 * Constant number in catsInfo data
 * @type {number}
 */
const CATSNUMBER = 5;

/**
 * Get random number in the range of 0 ~ number-1
 * @param {number}
 * @returns {number}
 */
const getRandomNumber = number => Math.floor(Math.random() * number);

/**
 * Closure for cats data
 * @returns {functions}
 */
const catsData = (() => {
  const ch = Array(5).fill(0);
  const catsInfo = [
    ['오드아이', './images/cats/cat2.png'],
    ['삼색이', './images/cats/cat3.png'],
    ['샴', './images/cats/cat5.png'],
    ['고등어', './images/cats/cat1.png'],
    ['치즈', './images/cats/cat4.png'],
  ];

  return {
    getRandomCatInfo() {
      let idx = getRandomNumber(CATSNUMBER);
      while (ch[idx] !== 0) {
        idx = getRandomNumber(CATSNUMBER);
      }
      ch[idx] = 1;
      return catsInfo[idx];
    },
    getCatsInfo() {
      return catsInfo;
    },
    getCheckArray() {
      return ch;
    },
  };
})();

/**
 * Closure for paticipating user
 * @returns {functions};
 */
const user = (() => {
  let users = [];

  return {
    getCurrentUser() {
      return users;
    },
    add(id) {
      const catInfo = catsData.getRandomCatInfo();
      users.push([...catInfo, id]);
      return catInfo;
    },
    delete(id, catName) {
      const idx = catsData
        .getCatsInfo()
        .map(el => el[0])
        .indexOf(catName);
      catsData.getCheckArray()[idx] = 0;
      users = users.filter(user => user[2] !== id);
    },
  };
})();

/**
 * Closure for game information
 * @returns {functions}
 */
const gameInfo = (() => {
  let citizens = [];
  let mafia = [];
  let jailCat = [];
  const secretCode = secretCodeObject.word[getRandomNumber(secretCodeObject.word.length)];

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
    setJailCat(newJailCat) {
      jailCat = [...jailCat, newJailCat];
    },
  };
})();

let voteStatus = [];
const GAMESTATUS = {
  CIVILWIN: 0,
  MAFIAWIN: 1,
};

/**
 * Socket connect
 */
io.on('connection', socket => {
  let catInfo = '';
  if (user.getCurrentUser().length < 5) {
    catInfo = user.add(socket.id);
  } else {
    io.to(socket.id).emit('fullRoom');
  }

  if (catInfo) {
    if (user.getCurrentUser().length === 5) {
      gameInfo.setCitizens(user.getCurrentUser());
      gameInfo.setMafia(getRandomNumber(CATSNUMBER));
      io.emit('change gameState', GAMESTAGE.BEGINNING);

      setTimeout(() => {
        gameInfo.getCitizens().forEach(civil => {
          io.to(civil[2]).emit('get secret-code', gameInfo.getSecretCode(), true);
        });

        io.to(gameInfo.getMafia()[2]).emit('get mafia-code', '', false);
        io.emit('change gameState', GAMESTAGE.DAY);
      }, 4000);
    }

    io.to(socket.id).emit('user update', catInfo);

    // chat message이벤트가 발생한 경우
    socket.on('chat message', msg => {
      io.emit('chat message', [...catInfo, msg, socket.id]);
    });

    socket.on('disconnect', () => {
      user.delete(socket.id, catInfo[0]);
      io.emit('user disconnect', user.getCurrentUser());
    });
  } else {
    console.log('user disconnected');
  }

  socket.on('force disconnected', () => {
    socket.disconnect(true);
  });

  io.emit('currentUsers', user.getCurrentUser());

  const getMaxNum = nums => nums.reduce((acc, curr) => Math.max(acc, curr), nums[0]);

  socket.on('day vote', selected => {
    voteStatus = [...voteStatus, selected];

    if (
      voteStatus.length === user.getCurrentUser().length - gameInfo.getJailCat().length &&
      voteStatus.some(result => result)
    ) {
      const voteCounts = new Map();

      voteStatus.forEach(result => voteCounts.set(result, voteCounts.get(result) + 1 || 1));

      const maxVote = getMaxNum([...voteCounts.values()]);

      const isDraw = [...voteCounts.values()].filter(voteCount => voteCount === maxVote).length > 1;

      const mostVoted = isDraw ? null : [...voteCounts.keys()].filter(name => voteCounts.get(name) === maxVote)[0];

      const voteResult = [
        mostVoted,
        isDraw
          ? null
          : catsData
              .getCatsInfo()
              .filter(catInfo => catInfo[0] === mostVoted)[0][1]
              .slice(0, -4) + '_jail.png',
      ];

      if (isDraw) {
        io.emit('change gameState', 'night');
      } else if (mostVoted === gameInfo.getMafia()[0]) {
        io.emit('game result', GAMESTATUS.CIVILWIN, gameInfo.getMafia()[0]);
      } else {
        io.emit('vote result', voteResult);
        gameInfo.setJailCat(mostVoted);
        console.log('마피아 몇명? ', gameInfo.getMafia());
        console.log(
          '당선: ',
          mostVoted,
          gameInfo.getCitizens().length - gameInfo.getJailCat().length,
          gameInfo.getMafia().length + 1
        );
        gameInfo.getCitizens().length - gameInfo.getJailCat().length < 3
          ? io.emit('game result', GAMESTATUS.MAFIAWIN, gameInfo.getMafia()[0])
          : io.emit('change gameState', 'night');
      }
    }
  });

  socket.on('night vote', selected => {
    if (selected) {
      io.emit('vote result', catsData.getCatsInfo().filter(catInfo => catInfo[0] === selected)[0]);
    }
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

// const catsInfo = [
//   ['오드아이', './images/cats/cat2.png'],
//   ['삼색이', './images/cats/cat3.png'],
//   ['샴', './images/cats/cat5.png'],
//   ['고등어', './images/cats/cat1.png'],
//   ['치즈', './images/cats/cat4.png'],
// ];

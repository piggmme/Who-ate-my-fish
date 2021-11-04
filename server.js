const express = require('express');

const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
const secretCodeObject = require('./db/secretCode.json');

let voteStatus = [];

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
 * Constant object for indicating game status
 * @constant
 * @type {number}
 */
const GAMESTATUS = {
  CIVILWIN: 0,
  MAFIAWIN: 1,
};

/**
 * Constant number in catsInfo data
 * @type {number}
 */
const CATSNUMBER = 5;
const MAFIANUM = 1;

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
    ['오드아이', './images/cats/cat2.png', './images/cats/cat2_jail.png'],
    ['삼색이', './images/cats/cat3.png', './images/cats/cat3_jail.png'],
    ['샴', './images/cats/cat5.png', './images/cats/cat5_jail.png'],
    ['고등어', './images/cats/cat1.png', './images/cats/cat1_jail.png'],
    ['치즈', './images/cats/cat4.png', './images/cats/cat4_jail.png'],
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
    initializeCatsCh() {
      ch.fill(0);
    },
  };
})();

/**
 * Closure for paticipating user
 * @returns {functions};
 */
const user = (() => {
  /** @type {Array[[nickName: string, url: string, sockeId: string]]} */
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
      users = users.filter(user => user[3] !== id);
    },
    initializeUser() {
      users = [];
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
    initializegameInfo() {
      citizens = [];
      mafia = [];
      jailCat = [];
    },
  };
})();

const gameReset = () => {
  console.log('gamerest');
  catsData.initializeCatsCh();
  user.initializeUser();
  gameInfo.initializegameInfo();
};

/**
 * Socket connect
 */
io.on('connection', socket => {
  if (user.getCurrentUser().length >= 5) {
    io.to(socket.id).emit('fullRoom');
  }

  const catInfo = user.add(socket.id);

  if (user.getCurrentUser().length === 5) {
    gameInfo.setCitizens(user.getCurrentUser());
    gameInfo.setMafia(getRandomNumber(CATSNUMBER));

    io.emit('change gameState', GAMESTAGE.BEGINNING, gameInfo.getCitizens().length, MAFIANUM);

    setTimeout(() => {
      gameInfo.getCitizens().forEach(civil => {
        io.to(civil[3]).emit('get secret-code', gameInfo.getSecretCode(), true);
      });

      io.to(gameInfo.getMafia()[3]).emit('get mafia-code', '', false);
      io.emit('change gameState', GAMESTAGE.DAY);
    }, 4000);
  }

  io.to(socket.id).emit('user update', catInfo);

  // chat message이벤트가 발생한 경우
  socket.on('chat message', msg => {
    io.emit('chat message', [...catInfo, msg, socket.id]);
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
        isDraw ? null : catsData.getCatsInfo().filter(catInfo => catInfo[0] === mostVoted)[0][2],
      ];

      if (isDraw) {
        io.emit('change gameState', 'night');
      } else if (mostVoted === gameInfo.getMafia()[0]) {
        io.emit('game result', GAMESTATUS.CIVILWIN, gameInfo.getMafia()[0]);
        gameReset();
      } else {
        io.emit('vote result', voteResult);
        gameInfo.setJailCat(mostVoted);
        if (gameInfo.getCitizens().length - gameInfo.getJailCat().length < 3) {
          io.emit('game result', GAMESTATUS.MAFIAWIN, gameInfo.getMafia()[0]);
          gameReset();
        } else {
          io.emit('change gameState', 'night');
        }
        // gameInfo.getCitizens().length - gameInfo.getJailCat().length < 3
        //   ?
        //   : io.emit('change gameState', 'night');
      }

      voteStatus = [];
    }
  });

  socket.on('night vote', selected => {
    if (selected) {
      gameInfo.setJailCat(selected);
      io.emit('vote result', [selected, catsData.getCatsInfo().filter(catInfo => catInfo[0] === selected)[0][2]]);
      io.emit('change gameState', 'day');
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    user.delete(socket.id, catInfo[0]);
    io.emit('user disconnect', user.getCurrentUser());
  });

  socket.on('force disconnected', () => {
    socket.disconnect(true);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

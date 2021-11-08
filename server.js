const app = require('express')();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
const secretCodes = require('./db/secretCode.json').word;

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
const GAME_STAGE = {
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
const GAME_STATUS_VALUE = {
  CIVIL_WIN: 0,
  MAFIA_WIN: 1,
  MAFIA_NUM: 1,
  CITIZEN: true,
  MAFIA: false,
};

/**
 * Constant number in catsInfo data
 * @type {number}
 */
const CATS_NUMBER = 5;

/**
 * Get random number in the range of 0 ~ maxNumber-1 (helper function)
 * @param {number}
 * @returns {number}
 */
const getRandomNumber = maxNumber => Math.floor(Math.random() * maxNumber);

/**
 * Closure for cats data
 * @returns {functions}
 */
const catsData = (() => {
  const checkUserIndices = Array(5).fill(0);
  const catsInfos = [
    { nickName: '오드아이', catImageUrl: './images/cats/cat2.png', jailCatImageUrl: './images/cats/cat2_jail.png' },
    { nickName: '삼색이', catImageUrl: './images/cats/cat3.png', jailCatImageUrl: './images/cats/cat3_jail.png' },
    { nickName: '샴', catImageUrl: './images/cats/cat5.png', jailCatImageUrl: './images/cats/cat5_jail.png' },
    { nickName: '고등어', catImageUrl: './images/cats/cat1.png', jailCatImageUrl: './images/cats/cat1_jail.png' },
    { nickName: '치즈', catImageUrl: './images/cats/cat4.png', jailCatImageUrl: './images/cats/cat4_jail.png' },
  ];

  return {
    getRandomCatInfo() {
      // TODO
      // checkUserIndices에 값을 설정하는 것과, 랜덤 유저 인덱스를 얻는것과, 캣의 정보를 리턴해주는 3가지 역할을 하고있음
      let randomUserIndex = getRandomNumber(CATS_NUMBER);
      while (checkUserIndices[randomUserIndex] !== 0) randomUserIndex = getRandomNumber(CATS_NUMBER);
      checkUserIndices[randomUserIndex] = 1;
      return catsInfos[randomUserIndex];
    },
    getCatsInfos() {
      return catsInfos;
    },
    getCheckUserIndices() {
      return checkUserIndices;
    },
    initializeCheckUserIndices() {
      checkUserIndices.fill(0);
    },
  };
})();

/**
 * Closure for game information
 * @returns {functions}
 */
const gameInfo = (() => {
  let currentUsers = [];
  let citizens = [];
  let mafia = [];
  let jailCat = [];
  let voteStatus = [];
  let secretCode = '';

  return {
    getCurrentUsers() {
      return currentUsers;
    },
    getCitizens() {
      return citizens;
    },
    getMafia() {
      return mafia;
    },
    getJailCat() {
      return jailCat;
    },
    getVoteStatus() {
      return voteStatus;
    },
    getSecretCode() {
      return secretCode;
    },
    setJailCat(newJailCat) {
      jailCat = [...jailCat, newJailCat];
    },
    setVoteStatus(newVoteStatus) {
      voteStatus = newVoteStatus;
    },
    setGameStatus(randomIndex) {
      citizens = [...currentUsers];
      mafia = citizens[randomIndex];
      citizens.splice(randomIndex, 1);
      secretCode = secretCodes[getRandomNumber(secretCodes.length)];
    },
    add(socketId) {
      // TODO
      // add가 여러가지 역할해서 분리하는게 좋아보임
      const catInfo = catsData.getRandomCatInfo();
      currentUsers = [...currentUsers, { ...catInfo, socketId }];
      return catInfo;
    },
    delete(disconnectedSocketId, catName) {
      const emptyUserIndex = catsData.getCatsInfos().findIndex(catInfo => catInfo.nickName === catName);
      catsData.getCheckUserIndices()[emptyUserIndex] = 0;
      currentUsers = currentUsers.filter(user => user.socketId !== disconnectedSocketId);
    },
    initializegameInfo() {
      currentUsers = [];
      citizens = [];
      mafia = [];
      jailCat = [];
    },
  };
})();

/**
 * Reset all game data
 */
const gameReset = () => {
  catsData.initializeCheckUserIndices();
  gameInfo.initializegameInfo();
};

/**
 * Socket connect
 */
io.on('connection', socket => {
  if (gameInfo.getCurrentUsers().length === 5) {
    io.to(socket.id).emit('full room');
  } else {
    const catInfo = gameInfo.add(socket.id);

    const { nickName, catImageUrl, jailCatImageUrl } = catInfo;
    io.to(socket.id).emit('user update', [nickName, catImageUrl]);

    io.emit('current users', gameInfo.getCurrentUsers());

    socket.on('chat message', msg => {
      io.emit('chat message', [nickName, catImageUrl, jailCatImageUrl, msg, socket.id]);
    });

    if (gameInfo.getCurrentUsers().length === 5) {
      gameInfo.setGameStatus(getRandomNumber(CATS_NUMBER));

      io.emit('change gameState', GAME_STAGE.BEGINNING, gameInfo.getCitizens().length, GAME_STATUS_VALUE.MAFIA_NUM);

      setTimeout(() => {
        gameInfo.getCitizens().forEach(civil => {
          io.to(civil.socketId).emit('get secret-code', gameInfo.getSecretCode(), GAME_STATUS_VALUE.CITIZEN);
        });

        io.to(gameInfo.getMafia().socketId).emit('get mafia-code', '', GAME_STATUS_VALUE.MAFIA);
        io.emit('change gameState', GAME_STAGE.DAY);
      }, 6000);
    }

    const getMaxNum = nums => nums.reduce((acc, curr) => Math.max(acc, curr), nums[0]);

    socket.on('day vote', selected => {
      gameInfo.setVoteStatus([...gameInfo.getVoteStatus(), selected]);

      if (gameInfo.getVoteStatus().length === gameInfo.getCurrentUsers().length - gameInfo.getJailCat().length) {
        const voteCounts = new Map();

        gameInfo.getVoteStatus().forEach(result => voteCounts.set(result, voteCounts.get(result) + 1 || 1));

        const maxVote = getMaxNum([...voteCounts.values()]);

        const isDraw = gameInfo.getVoteStatus().every(vote => !vote)
          ? true
          : [...voteCounts.values()].filter(voteCount => voteCount === maxVote).length > 1;

        const mostVoted = isDraw ? null : [...voteCounts.keys()].find(name => voteCounts.get(name) === maxVote);

        const voteResult = [
          mostVoted,
          isDraw ? null : catsData.getCatsInfos().find(catInfo => catInfo.nickName === mostVoted).jailCatImageUrl,
        ];

        if (!isDraw && mostVoted === gameInfo.getMafia().nickName) {
          io.emit('game result', GAME_STATUS_VALUE.CIVIL_WIN, gameInfo.getMafia().nickName);
          gameReset();
        } else if (!isDraw) {
          io.emit('vote result', voteResult);
          gameInfo.setJailCat(mostVoted);
          if (gameInfo.getCitizens().length - gameInfo.getJailCat().length < 3) {
            io.emit('game result', GAME_STATUS_VALUE.MAFIA_WIN, gameInfo.getMafia().nickName);
            gameReset();
          } else {
            io.emit('change gameState', GAME_STAGE.NIGHT);
          }
        } else {
          io.emit('change gameState', GAME_STAGE.NIGHT);
        }
        gameInfo.setVoteStatus([]);
      }
    });

    socket.on('night vote', selected => {
      if (selected) {
        gameInfo.setJailCat(selected);
        io.emit('vote result', [
          selected,
          catsData.getCatsInfos().find(catInfo => catInfo.nickName === selected).jailCatImageUrl,
        ]);
      }
      io.emit('change gameState', GAME_STAGE.DAY);
    });

    socket.on('disconnect', () => {
      gameInfo.delete(socket.id, nickName);
      io.emit('user disconnect', gameInfo.getCurrentUsers());
    });
  }
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

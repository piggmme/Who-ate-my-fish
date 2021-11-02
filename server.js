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

// app.get('/', (req, res) => {
//   res.send('hi');
//   // res.sendFile(__dirname + '/index.html');
// });

// io.on('connection', socket => {
//   console.log('a user connected');
// });

// server.listen(3000, () => {
//   console.log('listening on *: 3000');
// });

// functions ---------------------------------------------

// 사용자는 5명으로 제한됨.
const user = (() => {
  let users = [];
  const waitingUsers = [];
  const ch = Array(5).fill(0);
  const cats = ['오드아이', '삼색이', '샴', '고등어', '치즈'];
  const catsImg = {
    오드아이: './images/cats/cat1.png',
    삼색이: './images/cats/cat2.png',
    샴: './images/cats/cat3.png',
    고등어: './images/cats/cat4.png',
    치즈: './images/cats/cat5.png',
  };

  const randomCat = () => {
    let idx = Math.floor(Math.random() * 5 - 0.1); // 0 ~ 4
    while (ch[idx] !== 0) {
      idx = Math.floor(Math.random() * 5);
    }
    ch[idx] = 1;
    return cats[idx];
  };

  return {
    add(id) {
      if (users.length === 5) {
        waitingUsers.push(id);
        return false;
      }
      const catName = randomCat();
      users.push([catName, id]);
      return [catName, catsImg[catName]];
    },
    delete(id, catName) {
      const idx = cats.indexOf(catName);
      ch[idx] = 0;
      users = users.filter(([, usersId]) => usersId !== id);
    },
  };
})();

// socket.io ---------------------------------------------

app.get('/', (req, res) => {
  res.send('hi');
});

io.on('connection', socket => {
  const catInfo = user.add(socket.id);

  if (catInfo) {
    // 3000 번 포트에 접속한 클라이언트
    const [curCatName, catImgUrl] = catInfo;

    io.emit('userInfo', [curCatName, catImgUrl]);

    // chat message이벤트가 발생한 경우
    socket.on('chat message', msg => {
      io.emit('chat message', [curCatName, catImgUrl, msg, socket.id]);
    });

    // 연결이 끊어진 경우
    socket.on('disconnect', () => {
      user.delete(socket.id, curCatName);
    });
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

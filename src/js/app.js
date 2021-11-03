// import axios from 'axios';
import io from 'socket.io-client';
import chatInit from './chat';

const socket = io('http://localhost:3000');

// -----------------채팅 영역----------------------- //

chatInit();

document.querySelector('.chat-form').addEventListener('submit', e => {
  e.preventDefault();
  const $input = document.querySelector('.chat-form input');
  if ($input.value) {
    socket.emit('chat message', $input.value);
    $input.value = '';
  }
});

// chat message 이벤트를 받은 경우, li에 요소 추가
socket.on('chat message', ([curUser, img, msg, id]) => {
  const $li = document.createElement('li');
  $li.className = `full-chat__item ${id === socket.id ? 'me' : 'other'}`;
  $li.innerHTML = `
      <img src="${img}" alt="" class="full-chat__item-img" />
      <span class="full-chat__user-name">${curUser}</span>
      <div class="full-chat__item-msg">
          ${msg}
      </div>`;

  const $chatList = document.querySelector('.full-chat__list');
  const $chatContainer = document.querySelector('.full-chat__container');
  $chatList.appendChild($li);
  $chatContainer.scrollTop = $chatList.scrollHeight;
});

// http통신 예제
// const fetchTodo = async () => {
//   const ho = await axios.get('http://localhost:3000');
//   console.log(ho);
// };

// fetchTodo();
// axios.get('http://localhost:3000').then(resolve => console.log(resolve));

// 단위 (ms)
const STAGETIME = {
  pending: 0,
  beginning: 5000,
  day: 180000,
  night: 60000,
};

const GAMESTATUS = {
  CIVILWIN: 0,
  MAFIAWIN: 1,
  CONTINUE: 2,
};

const player = {
  name: '',
  isAlive: true,
  isCitizen: true,
};

const gameInfo = {
  state: 'pending',
  totalUsers: [],
  jailUsers: [],
};

// ---------------------- pending ---------------------------
// vote 버튼 비활성화, 싱태만 받아서 랜더링 진행
// [{name : "네로", img_url: "/src/img-1.png" }]

const renderUsers = () => {
  const $filedset = document.querySelector('.info__users > fieldset');
  $filedset.innerHTML = `
  <legend>인원 ${gameInfo.totalUsers.length} / 5</legend>
  ${gameInfo.totalUsers
    .map(
      (user, i) =>
        `<label>
            <input type="radio" id="user${i + 1}" name="user" disabled />
            <img src="${user[1]}" alt="플레이어 캐릭터" />
            <span class="user-name">${user[0]}</span>
        </label>`
    )
    .join('')}
  `;
};

socket.on('user update', ([name, url]) => {
  player.name = name;
  document.querySelector('.info__profile-name').textContent = name;
  document.querySelector('.info__profile-img').setAttribute('src', url);
});

socket.on('currentUsers', civiluser => {
  gameInfo.totalUsers = civiluser;
  renderUsers();
});

socket.on('user disconnect', user => {
  gameInfo.totalUsers = user;
  renderUsers();
});

socket.on('get secret-code', (secretCode, bool) => {
  document.querySelector('.info__message-content').textContent = secretCode;

  // 자신이 시민인지 확인
  player.isCitizen = bool;
});

socket.on('get mafia-code', (code, bool) => {
  document.querySelector('.info__message-content').textContent = code;

  // 자신이 마피아인지 확인
  player.isCitizen = bool;
});

// 게임 스테이지 변경 이벤트

// ---------------------- current-status에 따라 UI 변경 ---------------------------
// info 섹션 배경 색상 변경(changeInfoColorMode)
// info 이미지 변경(changeInfoImage)
// game-status 변경
// pending/beginning -> '곧 게임이 시작됩니다.'
// day -> '토론을 통해 감옥에 가둘 고양이를 선택하세요!'
// night/citizen -> '시민은 밤에 활동할 수 없습니다.'
// night/mafia -> '감옥에 가둘 고양이를 선택하세요.'

const changeInfoColorMode = status => {
  const $infoContainer = document.querySelector('.info__container');
  $infoContainer.classList.replace($infoContainer.classList[1], status);
};

const changeInfoImage = status => {
  document.querySelectorAll('.info__header > img').forEach($img => {
    $img.classList.contains('info__img-' + status) ? $img.removeAttribute('hidden') : $img.setAttribute('hidden', '');
  });
};

const changeInfoGameStatus = status => {
  const $infoGameStatus = document.querySelector('.info__game-status');
  $infoGameStatus.innerHTML =
    status === 'pending' || status === 'beginning'
      ? '곧 게임이 시작됩니다.'
      : status === 'day'
      ? '토론을 통해 감옥에 가둘 고양이를 선택하세요!'
      : player.isCitizen
      ? '시민은 밤에 활동할 수 없습니다.'
      : '감옥에 가둘 고양이를 선택하세요.';
};

const toggleVoteDisable = isDisable => {
  [...document.querySelectorAll('.info__users > fieldset > label')]
    .map(child => child.children)
    .map(el => {
      el[0].disabled = isDisable;
      return el[0];
    });
  // 선택완료 버튼 비활성화
  document.querySelector('.info__users > button').disabled = isDisable;
};

const toggleVoteBtn = status => {
  toggleVoteDisable(status === 'pending' || status === 'dead' ? true : status === 'day' ? false : !player.isCitizen);
};

const sendVoteResult = () => {
  if (document.querySelector('.info__users > button').disabled === true) return;

  const checked = [...document.querySelectorAll('.info__users > fieldset > label')].filter(
    child => child.children[0].checked
  );

  if (checked.length <= 0) {
    gameInfo.state === 'day' ? socket.emit('day vote', null) : socket.emit('night vote', null);
  } else {
    const selected = checked[0].children[2].textContent;
    gameInfo.state === 'day' ? socket.emit('day vote', selected) : socket.emit('night vote', selected);
  }
};

let interval = null;
let lap = 0;

const setTime = status => {
  const miliseconds = STAGETIME[status] - lap * 1000;
  const minutes = Math.floor(miliseconds / 1000 / 60);
  const seconds = Math.ceil((miliseconds / 1000) % 60);
  lap += 1;

  document.querySelector('.timer').textContent = `${minutes < 10 ? '0' + minutes : minutes}:${
    seconds < 10 ? '0' + seconds : seconds
  }`;

  if (miliseconds <= 0) {
    sendVoteResult();
    clearInterval(interval);
  }
};

const startTimer = status => {
  clearInterval(interval);
  document.querySelector('.timer').textContent = '00:00';
  interval = setInterval(setTime, 1000, status, lap);
};

socket.on('change gameState', status => {
  if (gameInfo.state === status) return;

  gameInfo.state = status;
  lap = 0;
  // 타이머 변경 이벤트
  startTimer(gameInfo.state);

  // 투표 비활성화 활성화 이벤트
  toggleVoteBtn(gameInfo.state);

  // 인포 배경색 변경
  changeInfoColorMode(gameInfo.state);

  // 인포 이미지 변경
  changeInfoImage(gameInfo.state);

  // 인포 메시지 변경
  changeInfoGameStatus(gameInfo.state);
});

socket.on('fullRoom', () => {
  alert('방이 다 찼습니다');
  socket.emit('force disconnected');
});

// 투표 기능
document.querySelector('.info__users > button').onclick = e => {
  e.preventDefault();

  const audio = new Audio('./sound/mouse-click.mp3');
  audio.play();

  sendVoteResult();
  toggleVoteDisable(false);
};

// ------------------- 감옥 고양이 UI + 비활성화 ----------------------- //

// 죽은사람 비활성화 처리
socket.on('vote result', ([name, url]) => {
  if (player.name !== name) return;

  player.isAlive = false;

  // 입력창 비활성화
  document.querySelector('.chat-form input').disabled = true;

  // 감옥 고양이 처리
  document.querySelector('.info__profile-img').setAttribute('src', url);

  // 투표창 비활성화
  toggleVoteBtn('dead');
});

socket.on('game result', (result, mafiaName) => {
  document.querySelector('.modal-title').innerHTML =
    GAMESTATUS.CIVILWIN === result
      ? `시민이 이겼습니다! <br> 마피아는 ${mafiaName} 였습니다.`
      : `마피아가 이겼습니다! <br> 마피아는 ${mafiaName} 였습니다.`;
  document.querySelector('.modal-img').src =
    GAMESTATUS.CIVILWIN === result ? './images/cats/civilwin.png' : './images/cats/mafiawin.png';
  document.querySelector('.modal').classList.remove('hidden');
});

document.querySelector('.modal-close').onclick = () => {
  document.querySelector('.modal').classList.add('hidden');
  socket.emit('force disconnected');
  alert('소켓 연결이 종료됩니다.');
};

document.querySelector('.modal-retry').onclick = () => {
  window.location.href = '/';
};

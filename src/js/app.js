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

// ------------------------------------------------- //

// 단위 (ms)
const STAGETIME = {
  pending: 0,
  beginning: 5000,
  day: 180000,
  night: 60000,
};

const PLAYER = {
  name: '',
  isAlive: true,
  isCitizen: true,
};

const GAMEINFO = {
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
  <legend>인원 ${GAMEINFO.totalUsers.length} / 5</legend>
  ${GAMEINFO.totalUsers
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
  document.querySelector('.info__profile-name').textContent = name;
  document.querySelector('.info__profile-img').setAttribute('src', url);
});

socket.on('currentUsers', civiluser => {
  GAMEINFO.totalUsers = civiluser;
  renderUsers();
});

socket.on('user disconnect', user => {
  GAMEINFO.totalUsers = user;
  renderUsers();
});

socket.on('get secret-code', (secretCode, bool) => {
  document.querySelector('.info__message-content').textContent = secretCode;

  // 자신이 시민인지 확인
  PLAYER.isCitizen = bool;
});

socket.on('get mafia-code', (code, bool) => {
  document.querySelector('.info__message-content').textContent = code;

  // 자신이 마피아인지 확인
  PLAYER.isCitizen = bool;
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

const changeInfoColorMode = () => {
  const $infoContainer = document.querySelector('.info__container');
  $infoContainer.classList.replace($infoContainer.classList[1], GAMEINFO.state);
};

const changeInfoImage = () => {
  document.querySelectorAll('.info__header > img').forEach($img => {
    $img.classList.contains('info__img-' + GAMEINFO.state)
      ? $img.removeAttribute('hidden')
      : $img.setAttribute('hidden', '');
  });
};

const changeInfoGameStatus = () => {
  const $infoGameStatus = document.querySelector('.info__game-status');
  $infoGameStatus.innerHTML =
    GAMEINFO.state === 'pending' || GAMEINFO.state === 'beginning'
      ? '곧 게임이 시작됩니다.'
      : GAMEINFO.state === 'day'
      ? '토론을 통해 감옥에 가둘 고양이를 선택하세요!'
      : PLAYER.isCitizen
      ? '시민은 밤에 활동할 수 없습니다.'
      : '감옥에 가둘 고양이를 선택하세요.';
};
const toggleVoteBtn = status => {
  // pending 이면 모두 비활성화
  if (status === 'pending') {
    // radio 버튼 비활성화
    [...document.querySelectorAll('.info__users > fieldset > label')]
      .map(child => child.children)
      .map(el => {
        el[0].disabled = true;
        return el[0];
      });
    // 선택완료 버튼 비활성화
    document.querySelector('.info__users > button').disabled = true;
  } else if (status === 'day') {
    // radio 버튼 비활성화
    [...document.querySelectorAll('.info__users > fieldset > label')]
      .map(child => child.children)
      .map(el => {
        el[0].disabled = false;
        return el[0];
      });
    // 선택완료 버튼 비활성화
    document.querySelector('.info__users > button').disabled = false;
  } else if (status === 'night') {
    if (PLAYER.isCitizen) {
      [...document.querySelectorAll('.info__users > fieldset > label')]
        .map(child => child.children)
        .map(el => {
          el[0].disabled = false;
          return el[0];
        });
      // 선택완료 버튼 비활성화
      document.querySelector('.info__users > button').disabled = false;
    } else {
      [...document.querySelectorAll('.info__users > fieldset > label')]
        .map(child => child.children)
        .map(el => {
          el[0].disabled = true;
          return el[0];
        });
      // 선택완료 버튼 비활성화
      document.querySelector('.info__users > button').disabled = true;
    }
  }
  // day면 모두 활성화
  // night면 마피아 시민은 비활성화, 마피아는 활성화
};

let interval = null;
// let isPause = false;
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
    clearInterval(interval);
  }
};

const startTimer = status => {
  clearInterval(interval);
  document.querySelector('.timer').textContent = '00:00';
  interval = setInterval(setTime, 1000, status, lap);
};

socket.on('change gameState', status => {
  if (GAMEINFO.state === status) return;

  GAMEINFO.state = status;
  console.log(GAMEINFO.state);
  lap = 0;
  // 타이머 변경 이벤트
  startTimer(GAMEINFO.state);

  // 투표 비활성화 활성화 이벤트
  toggleVoteBtn(GAMEINFO.state);

  // 인포 배경색 변경
  changeInfoColorMode();

  // 인포 이미지 변경
  changeInfoImage();

  // 인포 메시지 변경
  changeInfoGameStatus();
});

socket.on('fullRoom', () => {
  alert('방이 다 찼습니다');
  socket.emit('force disconnected');
});

// 투표 기능
document.querySelector('.info__users > button').onclick = e => {
  e.preventDefault();
  const checked = [...document.querySelectorAll('.info__users > fieldset > label')].filter(
    child => child.children[0].checked
  );

  if (checked.length <= 0) return;

  const selected = checked[0].children[2].textContent;
  socket.emit('dayVote', selected);
};

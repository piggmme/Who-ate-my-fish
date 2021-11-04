// import axios from 'axios';
import io from 'socket.io-client';
import chatInit from './chat';

const socket = io('http://localhost:3000');

// ----------------- sound ----------------------- //

const sound = (() => {
  const SOUND = {
    pending: new Audio('./sound/pending.mp3'),
    beginning: new Audio('./sound/pending.mp3'),
    day: new Audio('./sound/day.mp3'),
    night: new Audio('./sound/night.mp3'),
    voteFin: new Audio('./sound/voteFin.mp3'),
    voteUser: new Audio('./sound/voteUser.m4a'),
  };
  return {
    play(state) {
      SOUND[state].play();
    },
    pause() {
      Object.keys(SOUND).forEach(state => SOUND[state].pause());
    },
  };
})();

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
socket.on('chat message', ([curUser, img, , msg, id]) => {
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
  beginning: 3000,
  day: 100000,
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
  civilUserNum: 0,
  mafiaNum: 0,
  interval: null,
  lap: 0,
  isSelectBtn: false,
};

// let interval = null;
// let lap = 0;
// let isSelectBtn = false;

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
        </label>
        `
    )
    .join('')}
    <div class="deactive__users hidden" aria-hidden="true"></div>`;
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

socket.on('get mafia-code', (_, bool) => {
  document.querySelector('.info__message-content').textContent = '당신은 마피아 입니다';

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

// 선택 완료 버튼 상황에 따라서
const controlButtonVisibility = toVisible => {
  if (gameInfo.state === 'beginning' || gameInfo.state === 'pending') return;
  if (gameInfo.state === 'night' && player.isCitizen) return;
  document.querySelector('.info__users > button').classList.toggle('hidden', toVisible);
};

document.querySelector('.info__users').onclick = e => {
  if (!e.target.matches('img')) return;

  if (!gameInfo.isSelectBtn) {
    controlButtonVisibility(false);
  } else {
    controlButtonVisibility(true);
  }
};

const toggleVoteDisable = isDisable => {
  [...document.querySelectorAll('.info__users > fieldset > label')]
    .map(child => child.children)
    .map(el => {
      // 감옥 고양이는 투표 못함.
      el[0].disabled = gameInfo.jailUsers.includes(el[2].textContent) || isDisable;
      return el[0];
    });
  // 선택완료 버튼 비활성화
  document.querySelector('.info__users > button').disabled = isDisable;
};

const toggleChatActive = isActive => {
  if (gameInfo.state === 'pending' || gameInfo.state === 'beginning') return;

  document.querySelector('.deactive__chat-list').classList.toggle('hidden', isActive);
  document.querySelector('.deactive__char-form').classList.toggle('hidden', isActive);
};

const toggledVoteActive = isActive => {
  if (gameInfo.state === 'pending' || gameInfo.state === 'beginning') return;

  document.querySelector('.deactive__users').classList.toggle('hidden', isActive);
};

const toggleVoteBtn = status => {
  toggleVoteDisable(status === 'pending' || status === 'dead' ? true : status === 'day' ? false : player.isCitizen);
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

window.addEventListener('DOMContentLoaded', () => {
  toggleVoteDisable(true);
});

const setTime = status => {
  const miliseconds = STAGETIME[status] - gameInfo.lap * 1000;
  const minutes = Math.floor(miliseconds / 1000 / 60);
  const seconds = Math.ceil((miliseconds / 1000) % 60);
  gameInfo.lap += 1;

  document.querySelector('.timer').textContent = `${minutes < 10 ? '0' + minutes : minutes}:${
    seconds < 10 ? '0' + seconds : seconds
  }`;

  if (miliseconds <= 0) clearInterval(gameInfo.interval);
  if (miliseconds <= 0 && (gameInfo.state === 'day' || gameInfo.state === 'night')) sendVoteResult();
};

const startTimer = status => {
  clearInterval(gameInfo.interval);
  document.querySelector('.timer').textContent = '00:00';
  gameInfo.interval = setInterval(setTime, 1000, status, gameInfo.lap);
};

const removeInputChecked = () => {
  const $labels = document.querySelectorAll('.info__users > fieldset label');
  $labels.forEach($label => {
    $label.querySelector('input').checked = false;
  });
};

socket.on('change gameState', (status, civilUser, mafiaUser) => {
  if (gameInfo.state === status) return;

  gameInfo.isSelectBtn = false;

  if (document.querySelector('.music-button').alt === '음악 듣기') {
    sound.pause();
    sound.play(status);
  }

  gameInfo.state = status;
  gameInfo.lap = 0;

  // 현재 시민 수 구하기
  if (civilUser !== undefined && mafiaUser !== undefined) {
    gameInfo.civilUserNum = civilUser;
    gameInfo.mafiaNum = mafiaUser;
  }

  document.querySelector('.info__users > fieldset > legend').textContent = `시민 ${
    gameInfo.civilUserNum - gameInfo.jailUsers.length
  } / 마피아 ${gameInfo.mafiaNum}`;

  startTimer(gameInfo.state);
  toggleVoteBtn(gameInfo.state);

  if (gameInfo.state === 'day') {
    player.isAlive ? toggleChatActive(true) : toggleChatActive(false);
    player.isAlive ? toggledVoteActive(true) : toggleChatActive(false);
    document.querySelector('.chat-form input').placeholder = '채팅을 입력하세요.';
  } else if (gameInfo.state === 'night') {
    player.isAlive ? (player.isCitizen ? toggleChatActive(false) : toggleChatActive(true)) : toggleChatActive(false);
    player.isCitizen ? toggledVoteActive(false) : toggledVoteActive(true);
    document.querySelector('.chat-form input').placeholder = '채팅을 입력할 수 없습니다.';
  }

  // 인포 배경색 변경
  changeInfoColorMode(gameInfo.state);

  // 인포 이미지 변경
  changeInfoImage(gameInfo.state);

  // 인포 메시지 변경
  changeInfoGameStatus(gameInfo.state);

  // 투표시 체크된 라벨을 해제해주기
  removeInputChecked();

  if (!player.isAlive) {
    // 입력창 비활성화
    document.querySelector('.chat-form input').disabled = true;
    document.querySelector('.chat-form input').placeholder = '채팅을 입력할 수 없습니다.';

    // 투표창 비활성화
    document.querySelector('.deactive__users').classList.remove('hidden');
  }
});

socket.on('fullRoom', () => {
  alert('방이 다 찼습니다.');
  socket.emit('force disconnected');
  // 투표 비활성화 활성화 이벤트
  //   toggleVoteBtn(currentState);
});

// 투표 기능
document.querySelector('.info__users > button').onclick = e => {
  e.preventDefault();

  //   const audio = new Audio('./sound/voteFin.mp3');
  //   audio.play();
  sound.play('voteFin');

  sendVoteResult();
  toggleVoteDisable(true);

  // 투표 기능 비활성화
  toggledVoteActive(false);

  gameInfo.isSelectBtn = true;
  controlButtonVisibility(true);
};

// ------------------- 소리 영역 ----------------------- //

// 대기실 소리
// window.addEventListener('DOMContentLoaded', () => {
//   sound.play('pending');
// });

// 투표할 때 유저 프로필 클릭한 경우
document.querySelector('.info__users > fieldset').onclick = e => {
  if (!e.target.closest('label') || gameInfo.state === 'pending' || gameInfo.state === 'beginning') return;
  if (e.target.closest('label').querySelector('input').disabled === true) return;
  sound.play('voteUser');
};

// ------------------- 감옥 고양이 UI + 비활성화 ----------------------- //

const handleJailCatInInfoUsers = (name, url) => {
  const $labels = document.querySelectorAll('.info__users > fieldset label');
  $labels.forEach($label => {
    if ($label.querySelector('.user-name').textContent === name) {
      $label.querySelector('img').src = url;
      $label.querySelector('input').disabled = true;
    }
  });
};

// 감옥 고양이 비활성화 처리
socket.on('vote result', result => {
  // 감옥간 고양이 없다면 종료
  if (result[0] === null) return;

  const [name, url] = result;
  // 감옥 고양이 렌더, 투표시 선택 못하게 표시
  handleJailCatInInfoUsers(name, url);
  // 감옥 인원에 추가 => toggleVoteDisable 에서 처리할 예정임.
  gameInfo.jailUsers.push(name);

  // 나는 감옥에 가지 않았다면
  if (player.name !== name) {
    // alert(name + '은(는) 시민이였습니다!');
    return;
  }

  // alert(name + '당신은 감옥에 갖혔습니다. 더 이상 투표랑 채팅은 하실 수 없습니다.');

  player.isAlive = false;

  // 입력창 비활성화
  document.querySelector('.chat-form input').disabled = true;

  // 감옥 고양이 프로필 처리
  document.querySelector('.info__profile-img').setAttribute('src', url);

  // 투표창 비활성화
  toggleVoteBtn('dead');
});

socket.on('game result', (result, mafiaName) => {
  console.log('game over');
  document.querySelector('.modal-title').innerHTML =
    GAMESTATUS.CIVILWIN === result
      ? `시민이 이겼습니다! <br> 마피아는 ${mafiaName} 였습니다.`
      : `마피아가 이겼습니다! <br> 마피아는 ${mafiaName} 였습니다.`;
  document.querySelector('.modal-img').src =
    GAMESTATUS.CIVILWIN === result ? './images/cats/civilwin.png' : './images/cats/mafiawin.png';
  document.querySelector('.modal').classList.remove('hidden');
  socket.emit('force disconnected');
});

document.querySelector('.modal-close').onclick = () => {
  document.querySelector('.modal').classList.add('hidden');
  socket.emit('force disconnected');
  alert('소켓 연결이 종료됩니다.');
};

document.querySelector('.modal-retry').onclick = () => {
  // socket.emit('disconnect');
  // console.log('hi');
  window.location.reload();
};

document.querySelector('.music-button').onclick = e => {
  if (e.target.alt === '음악 중지') {
    sound.play(gameInfo.state);
    e.target.src = './images/play.png';
    e.target.alt = '음악 듣기';
  } else {
    sound.pause();
    e.target.src = './images/stop.png';
    e.target.alt = '음악 중지';
  }
};

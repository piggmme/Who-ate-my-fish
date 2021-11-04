// import axios from 'axios';
import io from 'socket.io-client';
import chatInit from './chat';

chatInit();

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

// ----------------- constant ----------------------- //
const GAMESTAGE = {
  PENDING: 'pending',
  BEGINNING: 'beginning',
  DAY: 'day',
  NIGHT: 'night',
};

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

const MAX_USER_NUM = 5;

// ----------------- state ----------------------- //
const player = (() => {
  let name = '';
  let isAlive = true;
  let isCitizen = true;
  return {
    get name() {
      return name;
    },
    set name(newName) {
      name = newName;
    },
    get isAlive() {
      return isAlive;
    },
    set isAlive(newIsAlive) {
      isAlive = newIsAlive;
    },
    get isCitizen() {
      return isCitizen;
    },
    set isCitizen(newIsCitizen) {
      isCitizen = newIsCitizen;
    },
  };
})();

const gameInfo = (() => {
  let state = GAMESTAGE.PENDING;
  let totalUsers = [];
  let jailUsers = [];
  let civilUserNum = 0;
  let mafiaNum = 0;
  let interval = null;
  let lap = 0;
  return {
    get state() {
      return state;
    },
    set state(newState) {
      state = newState;
    },
    get totalUsers() {
      return totalUsers;
    },
    set totalUsers(newTotalUsers) {
      totalUsers = newTotalUsers;
    },
    get jailUsers() {
      return jailUsers;
    },
    set jailUsers(newJailUsers) {
      jailUsers = newJailUsers;
    },
    get civilUserNum() {
      return civilUserNum;
    },
    set civilUserNum(newCivilUserNum) {
      civilUserNum = newCivilUserNum;
    },
    get mafiaNum() {
      return mafiaNum;
    },
    set mafiaNum(newMafiaNum) {
      mafiaNum = newMafiaNum;
    },
    get interval() {
      return interval;
    },
    set interval(newInterval) {
      interval = newInterval;
    },
    get lap() {
      return lap;
    },
    set lap(newLap) {
      lap = newLap;
    },
  };
})();

// ----------------- fucntion ----------------------- //
const closer = (() => {
  const renderUsers = () => {
    const $filedset = document.querySelector('.info__users > fieldset');
    $filedset.innerHTML = `
    <legend>인원 ${gameInfo.totalUsers.length} / ${MAX_USER_NUM}</legend>
    ${gameInfo.totalUsers
      .map(
        ([name, url], i) =>
          `<label>
              <input type="radio" id="user${i + 1}" name="user" disabled />
              <img src="${url}" alt="플레이어 캐릭터" />
              <span class="user-name">${name}</span>
          </label>
          `
      )
      .join('')}
      <div class="deactive__users hidden" aria-hidden="true"></div>`;
  };
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
      status === GAMESTAGE.PENDING || status === GAMESTAGE.BEGINNING
        ? '곧 게임이 시작됩니다.'
        : status === GAMESTAGE.DAY
        ? '토론을 통해 감옥에 가둘 고양이를 선택하세요!'
        : player.isCitizen
        ? '시민은 밤에 활동할 수 없습니다.'
        : '감옥에 가둘 고양이를 선택하세요.';
  };

  const renderSelectionBtn = visible => {
    if (gameInfo.state === GAMESTAGE.BEGINNING || gameInfo.state === GAMESTAGE.PENDING) return;
    if (gameInfo.state === GAMESTAGE.NIGHT && player.isCitizen) return;
    document.querySelector('.info__users > button').classList.toggle('hidden', !visible);
  };

  const removeInputChecked = () => {
    const $labels = document.querySelectorAll('.info__users > fieldset label');
    $labels.forEach($label => {
      $label.querySelector('input').checked = false;
    });
  };

  const renderInfoSection = state => {
    changeInfoColorMode(state);
    changeInfoImage(state);
    changeInfoGameStatus(state);
    removeInputChecked();
  };
  const toggleVoteDisable = isDisable => {
    [...document.querySelectorAll('.info__users > fieldset > label')]
      .map(child => child.children)
      .map(el => {
        el[0].disabled = gameInfo.jailUsers.includes(el[2].textContent) || isDisable;
        return el[0];
      });
    document.querySelector('.info__users > button').disabled = isDisable;
  };

  const handleAvailableCandidatesBy = status => {
    toggleVoteDisable(status === GAMESTAGE.PENDING ? true : status === GAMESTAGE.DAY ? false : player.isCitizen);
  };

  const sendVoteResult = () => {
    if (document.querySelector('.info__users > button').disabled === true) return;

    const checked = [...document.querySelectorAll('.info__users > fieldset > label')].filter(
      child => child.children[0].checked
    );

    if (checked.length <= 0) {
      gameInfo.state === GAMESTAGE.DAY ? socket.emit('day vote', null) : socket.emit('night vote', null);
    } else {
      const selected = checked[0].children[2].textContent;
      gameInfo.state === GAMESTAGE.DAY ? socket.emit('day vote', selected) : socket.emit('night vote', selected);
    }
  };

  const toggleAllVotesAcitve = isActive => {
    if (gameInfo.state === GAMESTAGE.PENDING || gameInfo.state === GAMESTAGE.BEGINNING) return;
    document.querySelector('.deactive__users').classList.toggle('hidden', isActive);
  };

  const handleVoteAndChatActive = isActive => {
    toggleAllVotesAcitve(isActive);
    document.querySelector('.chat-form input').disabled = !isActive;
    document.querySelector('.chat-form input').placeholder = isActive
      ? '채팅을 입력하세요.'
      : '채팅을 입력할 수 없습니다.';
  };
  const setTime = status => {
    const miliseconds = STAGETIME[status] - gameInfo.lap * 1000;
    const minutes = Math.floor(miliseconds / 1000 / 60);
    const seconds = Math.ceil((miliseconds / 1000) % 60);
    gameInfo.lap += 1;

    document.querySelector('.timer').textContent = `
      ${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

    if (miliseconds <= 0) clearInterval(gameInfo.interval);
    if (miliseconds <= 0 && (gameInfo.state === GAMESTAGE.DAY || gameInfo.state === GAMESTAGE.NIGHT)) sendVoteResult();
  };

  const startTimer = status => {
    clearInterval(gameInfo.interval);
    document.querySelector('.timer').textContent = '00:00';
    gameInfo.interval = setInterval(setTime, 1000, status, gameInfo.lap);
  };

  const handleJailCatInInfoUsers = (name, url) => {
    const $labels = document.querySelectorAll('.info__users > fieldset label');
    $labels.forEach($label => {
      if ($label.querySelector('.user-name').textContent === name) {
        $label.querySelector('img').src = url;
        $label.querySelector('input').disabled = true;
      }
    });
  };

  return {
    renderUsers,
    renderSelectionBtn,
    toggleVoteDisable,
    startTimer,
    handleAvailableCandidatesBy,
    handleVoteAndChatActive,
    renderInfoSection,
    sendVoteResult,
    toggleAllVotesAcitve,
    handleJailCatInInfoUsers,
  };
})();

// ----------------- socket ----------------------- //
socket.on('chat message', ([curUser, img, , msg, id]) => {
  const $li = document.createElement('li');
  $li.className = `full-chat__item ${id === socket.id ? 'myMessage' : 'otherMessage'}`;
  $li.innerHTML = `
      <img src="${img}" alt="" class="full-chat__item-img" />
      <span class="full-chat__user-name">${curUser}</span>
      <div class="full-chat__item-msg">
          ${msg}
      </div>`;

  const $chatList = document.querySelector('.full-chat__list');
  $chatList.appendChild($li);
  document.querySelector('.full-chat__container').scrollTop = $chatList.scrollHeight;
});

socket.on('user update', ([name, url]) => {
  player.name = name;
  document.querySelector('.info__profile-name').textContent = name;
  document.querySelector('.info__profile-img').setAttribute('src', url);
});

socket.on('currentUsers', civiluser => {
  gameInfo.totalUsers = civiluser;
  closer.renderUsers();
});

socket.on('user disconnect', user => {
  gameInfo.totalUsers = user;
  closer.renderUsers();
});

socket.on('get secret-code', (secretCode, bool) => {
  document.querySelector('.info__message-content').textContent = secretCode;
  player.isCitizen = bool;
});

socket.on('get mafia-code', (_, bool) => {
  document.querySelector('.info__message-content').textContent = '당신은 마피아 입니다';
  player.isCitizen = bool;
});

socket.on('change gameState', (status, civilUser, mafiaUser) => {
  if (document.querySelector('.music-button').alt === '음악 듣기') {
    sound.pause();
    sound.play(status);
  }

  gameInfo.state = status;
  gameInfo.lap = 0;

  if (status === GAMESTAGE.BEGINNING) {
    gameInfo.civilUserNum = civilUser;
    gameInfo.mafiaNum = mafiaUser;
  }

  document.querySelector('.info__users > fieldset > legend').textContent = `
  시민 ${gameInfo.civilUserNum - gameInfo.jailUsers.length} / 마피아 ${gameInfo.mafiaNum}`;

  closer.startTimer(gameInfo.state);
  closer.handleAvailableCandidatesBy(gameInfo.state);

  if (gameInfo.state === GAMESTAGE.DAY) {
    closer.handleVoteAndChatActive(player.isAlive);
  }
  if (gameInfo.state === GAMESTAGE.NIGHT) {
    player.isCitizen ? closer.handleVoteAndChatActive(false) : closer.toggleAllVotesAcitve(true);
  }

  closer.renderInfoSection(gameInfo.state);
});

socket.on('fullRoom', () => {
  alert('방이 다 찼습니다.');
  socket.emit('force disconnected');
});

socket.on('vote result', ([name, url]) => {
  if (name === null) return;

  closer.handleJailCatInInfoUsers(name, url);
  gameInfo.jailUsers = [...gameInfo.jailUsers, name];

  if (player.name !== name) return;

  player.isAlive = false;
  document.querySelector('.chat-form input').disabled = true;
  document.querySelector('.info__profile-img').setAttribute('src', url);
});

// 한글 문자열이 받침 있는 글자로 끝나면 true, 아니면 false
const isLastCharacterHasFinalConsonant = korStr => {
  const LastCharCode = korStr.charCodeAt(korStr.length - 1);
  const CHAR_CODE_OF_KOR_GA = 44032;
  return LastCharCode % 28 !== CHAR_CODE_OF_KOR_GA % 28;
};

socket.on('game result', (result, mafiaName) => {
  document.querySelector('.modal-title').innerHTML =
    GAMESTATUS.CIVILWIN === result
      ? `시민이 이겼습니다! <br> 마피아는 ${mafiaName}${
          isLastCharacterHasFinalConsonant(mafiaName) ? '이었' : '였'
        }습니다.`
      : `마피아가 이겼습니다! <br> 마피아는 ${mafiaName}${
          isLastCharacterHasFinalConsonant(mafiaName) ? '이었' : '였'
        }습니다.`;
  document.querySelector('.modal-img').src =
    GAMESTATUS.CIVILWIN === result ? './images/cats/civilwin.png' : './images/cats/mafiawin.png';
  document.querySelector('.modal').classList.remove('hidden');
  socket.emit('force disconnected');
});

// ----------------- DOM ----------------------- //
window.addEventListener('DOMContentLoaded', () => {
  closer.toggleVoteDisable(true);
});

document.querySelector('.chat-form').addEventListener('submit', e => {
  e.preventDefault();
  const $input = document.querySelector('.chat-form input');
  $input.value = $input.value.trim();
  if ($input.value) {
    socket.emit('chat message', $input.value);
    $input.value = '';
  }
});

document.querySelector('.info__users').onclick = e => {
  if (!e.target.closest('label') || e.target.closest('label').querySelector('input').disabled) return;
  closer.renderSelectionBtn(true);
};

document.querySelector('.info__users > button').onclick = e => {
  e.preventDefault();

  sound.play('voteFin');

  closer.sendVoteResult();
  closer.toggleAllVotesAcitve(false);
  closer.renderSelectionBtn(false);
};

document.querySelector('.info__users > fieldset').onclick = e => {
  if (
    !e.target.closest('label') ||
    e.target.closest('label').querySelector('input').disabled ||
    gameInfo.state === GAMESTAGE.PENDING ||
    gameInfo.state === GAMESTAGE.BEGINNING
  )
    return;
  sound.play('voteUser');
};

document.querySelector('.modal-retry').onclick = () => {
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

// import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// -----------------채팅 영역----------------------- //

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

// ---------------------- pending ---------------------------
// vote 버튼 비활성화, 싱태만 받아서 랜더링 진행
// [{name : "네로", img_url: "/src/img-1.png" }]
let currentUsers = [];
let currentState = 'pending';
const jailUsers = [];

const renderUsers = () => {
  const $filedset = document.querySelector('.info__users > fieldset');
  $filedset.innerHTML = `
  <legend>인원 ${currentUsers.length} / 5</legend>
  ${currentUsers
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
  currentUsers = civiluser;
  renderUsers();
});

socket.on('user disconnect', user => {
  currentUsers = user;
  renderUsers();
});

socket.on('get secret-code', secretCode => {
  document.querySelector('.info__message-content').textContent = secretCode;
  console.log('citizen');
});

socket.on('get mafia-code', code => {
  document.querySelector('.info__message-content').textContent = code;
  console.log('mafia');
});

// 게임 스테이지 변경 이벤트
let interval = null;
let lap = 0;

const setTime = status => {
  const miliseconds = STAGETIME[status] - lap * 1000;
  const minutes = Math.floor(miliseconds / 1000 / 60);
  const seconds = Math.ceil((miliseconds / 1000) % 60);
  lap += 1;

  if (miliseconds <= 0) clearInterval(interval);

  document.querySelector('.timer').textContent = `${minutes < 10 ? '0' + minutes : minutes}:${
    seconds < 10 ? '0' + seconds : seconds
  }`;
};

socket.on('change gameState', status => {
  if (currentState === status) return;

  currentState = status;
  lap = 0;

  // 타이머 변경 이벤트
  interval = setInterval(setTime, 1000, currentState, lap);

  // 투표 비활성화 활성화 이벤트
});

socket.on('fullRoom', () => {
  alert('방이 다 찼습니다');
  socket.emit('force disconnected');
});

// 투표 기능
document.querySelector('.info__users > button').onclick = e => {
  e.preventDefault();
  //   console.log([...document.querySelector('.info__users > fieldset').children].map(child => child));
  const checked = [...document.querySelectorAll('.info__users > fieldset > label')].filter(
    child => child.children[0].checked
  );

  if (checked.length <= 0) return;

  //   console.log('selected');
  const selected = checked[0].children[2].textContent;
  socket.emit('vote', selected);
};

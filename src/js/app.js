// import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

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
  dayVote: 180000,
  nightVote: 60000,
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
            <input type="radio" id="user${i + 1}" name="user${i + 1}" />
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

// 타이머 설정 기능
let interval = null;
let lap = 0;

const setTime = (status, lap) => {
  const miliseconds = STAGETIME[status] - lap * 1000;
  const minutes = Math.ceil(miliseconds / 1000 / 60);
  const seconds = Math.ceil((miliseconds / 1000) % 60);

  if (miliseconds === 0) clearInterval(interval);

  document.querySelector('.timer').textContent = `${minutes < 10 ? '0' + minutes : minutes}:${
    seconds < 10 ? '0' + seconds : seconds
  }`;
};

socket.on('timer setting', status => {
  if (currentState === status) return;

  currentState = status;
  lap = 0;

  interval = setInterval(setTime, 1000, currentState, lap++);
});

// 투표 결과에 따라 프로필 및 vote-container 이미지 변경

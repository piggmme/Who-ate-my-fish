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
const currentState = 'pending';
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

socket.on('user disconnect', user => {
  //   console.log('hi');
  currentUsers = user;
  renderUsers();
});

// 타이머 설정 기능
// const setTime = status => {
//   const miliseconds = STAGETIME[status];
//   const minutes = Math.ceil(miliseconds / 1000 / 60);
//   const seconds = Math.ceil((miliseconds / 1000) % 60);

//   document.querySelector('.timer').textContent = `${minutes < 10 ? '0' + minutes : minutes}:${
//     seconds < 10 ? seconds : seconds
//   }`;
// };

// socket.on('timer setting', status => {
//   if (currentState === status) return;

//   setTimeout(status);
// });

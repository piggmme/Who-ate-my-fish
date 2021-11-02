import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// http통신 예제
// const fetchTodo = async () => {
//   const ho = await axios.get('http://localhost:3000');
//   console.log(ho);
// };

// fetchTodo();

// axios.get('http://localhost:3000').then(resolve => console.log(resolve));

export default () => {
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
};

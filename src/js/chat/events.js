// import socket from '../socket';

// export default () => {
//   const $button = document.querySelector('.chat-toggle-button');

//   const chatToggleInMobile = () => {
//     $button.classList.toggle('hidden', window.innerWidth >= 768);

//     const $chatContainer = document.querySelector('.full-chat__container');
//     $chatContainer.classList.toggle('hidden', window.innerWidth >= 768 ? false : !$button.classList.contains('exit'));

//     if (window.innerWidth >= 768) {
//       document.querySelector('.info__container').classList.remove('hidden');
//       $button.classList.remove('exit');
//       $button.querySelector('img').src = './images/message.png';
//     }
//   };
//   window.addEventListener('DOMContentLoaded', chatToggleInMobile);
//   window.onresize = chatToggleInMobile;

//   $button.onclick = () => {
//     document.querySelector('.full-chat__container').classList.toggle('hidden');
//     document.querySelector('.info__container').classList.toggle('hidden');
//     $button.classList.toggle('exit');

//     $button.querySelector('img').src = $button.classList.contains('exit')
//       ? './images/message_exit.png'
//       : './images/message.png';
//   };

//   document.querySelector('.chat-form').addEventListener('submit', e => {
//     e.preventDefault();
//     const $input = document.querySelector('.chat-form input');
//     if ($input.value) {
//       socket.emit('chat message', $input.value);
//       $input.value = '';
//     }
//   });

//   // chat message 이벤트를 받은 경우, li에 요소 추가
//   socket.on('chat message', ([curUser, img, msg, id]) => {
//     const $li = document.createElement('li');
//     $li.className = `full-chat__item ${id === socket.id ? 'me' : 'other'}`;
//     $li.innerHTML = `
//         <img src="${img}" alt="" class="full-chat__item-img" />
//         <span class="full-chat__user-name">${curUser}</span>
//         <div class="full-chat__item-msg">
//             ${msg}
//         </div>`;

//     const $chatList = document.querySelector('.full-chat__list');
//     const $chatContainer = document.querySelector('.full-chat__container');
//     $chatList.appendChild($li);
//     $chatContainer.scrollTop = $chatList.scrollHeight;
//   });
// };

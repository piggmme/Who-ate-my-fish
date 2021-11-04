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
// };

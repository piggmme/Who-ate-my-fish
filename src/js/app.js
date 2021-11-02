// import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// http통신 예제
// const fetchTodo = async () => {
//   const ho = await axios.get('http://localhost:3000');
//   console.log(ho);
// };

// fetchTodo();

socket.on('user update', array => {
  console.log(array);
});

socket.on('userInfo', alluser => {
  console.log(alluser);
});

// axios.get('http://localhost:3000').then(resolve => console.log(resolve));

import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// const fetchTodo = async () => {
//   const ho = await axios.get('http://localhost:3000');
//   console.log(ho);
// };

// fetchTodo();

axios.get('http://localhost:3000').then(resolve => console.log(resolve));

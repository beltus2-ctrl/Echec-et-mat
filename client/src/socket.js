import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://echec-et-mat-server.onrender.com');

export const socket = io(SERVER_URL, {
  autoConnect: false,
  timeout: 60000,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 6000,
});

// src/socket.js
import { io } from 'socket.io-client';

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

export const socket = io(API_URL, {
  autoConnect: true,
  transports: ['websocket'],
});

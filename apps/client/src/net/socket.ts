import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io({ path: '/ws', auth: (cb) => cb({ token: getToken() }), transports: ['websocket'] });
  return socket;
}

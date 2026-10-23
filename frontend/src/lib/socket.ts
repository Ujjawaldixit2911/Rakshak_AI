/**
 * Rakshak AI Socket.IO Client Manager
 */
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const token = localStorage.getItem('rakshak_token') || '';
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to Rakshak safety gateway with ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection warning:', err.message);
    });
  }
  return socket as Socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

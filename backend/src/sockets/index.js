/**
 * Rakshak AI Socket.IO Real-Time Gateway
 * Real-time event handling for live trip monitoring, SOS alerts, and safety notifications.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

function setupSocketIO(io) {
  // Authentication Middleware for Sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          socket.user = user;
        }
      }
      next();
    } catch (err) {
      // Allow unauthenticated socket connection as guest, but socket.user will be null
      next();
    }
  });

  io.on('connection', (socket) => {
    const userRole = socket.user ? socket.user.role : 'GUEST';
    const userId = socket.user ? socket.user._id.toString() : socket.id;

    // Join user's individual room
    if (socket.user) {
      socket.join(`user:${userId}`);
      if (socket.user.role === 'ADMIN') {
        socket.join('admin:channel');
      }
    }

    // Client subscribes to live route trip updates
    socket.on('trip:join', (tripId) => {
      socket.join(`trip:${tripId}`);
    });

    socket.on('trip:leave', (tripId) => {
      socket.leave(`trip:${tripId}`);
    });

    // Client sends live coordinates
    socket.on('location:ping', (data) => {
      if (data.tripId) {
        io.to(`trip:${data.tripId}`).emit('trip:location-ping', {
          userId,
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date()
        });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

module.exports = setupSocketIO;

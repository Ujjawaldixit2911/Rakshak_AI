const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const setupSocketIO = require('./sockets');

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [config.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Attach io to app instance so controllers can emit real-time events
app.set('io', io);
setupSocketIO(io);

// Start server
const start = async () => {
  try {
    await connectDB();
    server.listen(config.PORT, () => {
      console.log(`[Rakshak AI Backend] Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
      console.log(`[Health URL] http://localhost:${config.PORT}/api/health`);
    });
  } catch (err) {
    console.error(`[Server Start Error] ${err.message}`);
    process.exit(1);
  }
};

// Start if not imported as module
if (require.main === module) {
  start();
}

module.exports = { app, server };

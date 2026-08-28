const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

let io;
function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
  });
  const pub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));
  io.on('connection', (socket) => {
    const tenantId = socket.handshake.auth?.tenantId;
    if (tenantId) socket.join(`tenant:${tenantId}`);
  });
  return io;
}
function broadcast(tenantId, event, payload) {
  if (io && tenantId) io.to(`tenant:${tenantId}`).emit(event, payload);
}
module.exports = { initRealtime, broadcast };

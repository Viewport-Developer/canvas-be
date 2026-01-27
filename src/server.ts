import http from 'http';
import { WebSocketServer } from 'ws';
import { handleWebSocketConnection } from './yjs/yjsHandler';

const PORT = process.env.PORT || 1234;

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  handleWebSocketConnection(ws, req);
});

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

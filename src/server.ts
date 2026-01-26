import http from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { handleWebSocketConnection } from './yjs/yjsHandler';
import canvasRouter from './routes/canvas';

const app = express();
const PORT = process.env.PORT || 1234;

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 설정 (개발 환경)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// REST API 라우터
app.use('/api/canvas', canvasRouter);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'y.js WebSocket 서버가 실행 중입니다.',
    status: 'success',
    endpoints: {
      websocket: `ws://localhost:${PORT}?doc={canvasId}`,
      rest: {
        list: 'GET /api/canvas',
        get: 'GET /api/canvas/:id',
        create: 'POST /api/canvas',
        update: 'PUT /api/canvas/:id',
        delete: 'DELETE /api/canvas/:id',
      },
    },
  });
});

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 생성
const wss = new WebSocketServer({ server });

// WebSocket 연결 처리
// setupWSConnection이 req에서 docName을 자동으로 파싱함
wss.on('connection', (ws, req) => {
  handleWebSocketConnection(ws, req);
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 서버가 실행 중입니다!`);
  console.log(`📡 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📊 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM 신호 수신, 서버 종료 중...');
  server.close(() => {
    console.log('[Server] 서버가 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT 신호 수신, 서버 종료 중...');
  server.close(() => {
    console.log('[Server] 서버가 종료되었습니다.');
    process.exit(0);
  });
});

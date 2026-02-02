import http from "http";
import { WebSocketServer } from "ws";
import { handleWebSocketConnection } from "./yjs/yjsHandler";

const PORT = process.env.PORT || 1234;

const server = http.createServer();
const wss = new WebSocketServer({
  server,
  // Y.js 동기화 메시지 압축 → 전송량·대역폭 감소, 여러 명 접속 시 지연 완화
  perMessageDeflate: {
    zlibDeflateOptions: { chunkSize: 1024 },
    zlibInflateOptions: { chunkSize: 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 256, // 256바이트 미만 메시지는 압축 안 함(CPU 오버헤드 방지)
  },
});

wss.on("connection", (ws, req) => {
  handleWebSocketConnection(ws, req);
});

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

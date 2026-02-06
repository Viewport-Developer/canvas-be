import "dotenv/config";
import http from "http";
import { WebSocketServer } from "ws";
import { handleWebSocketConnection } from "./yjs/yjsHandler";
import { connectMongoDB, disconnectMongoDB } from "./mongodb/client";

export function startWorker(workerId: number, port: number) {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const url = req.url || "";

    // URL 파싱: /canvas/{canvasId} 형식 검증
    const canvasMatch = url.match(/^\/canvas\/(.+)$/);
    if (!canvasMatch) {
      ws.close(1008, "Invalid URL format");
      return;
    }
    const canvasId = canvasMatch[1];

    // 마스터 프로세스에 캔버스 등록 알림
    process.send?.({
      type: "canvas-registered",
      canvasId,
      workerId,
    });
    process.send?.({
      type: "connection-opened",
      workerId,
    });

    handleWebSocketConnection(ws, req);

    // 연결 해제 시 알림
    ws.on("close", () => {
      process.send?.({
        type: "connection-closed",
        workerId,
      });
    });
  });

  async function startServer() {
    await connectMongoDB();
    server.listen(port, () => {
      process.send?.({
        type: "worker-ready",
        workerId,
      });
    });
  }

  startServer();

  process.on("SIGTERM", async () => {
    await disconnectMongoDB();
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", async () => {
    await disconnectMongoDB();
    server.close(() => process.exit(0));
  });
}

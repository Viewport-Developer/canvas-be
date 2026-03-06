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

    // URL 파싱
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

    // 열림 알림
    process.send?.({
      type: "connection-opened",
      workerId,
    });

    handleWebSocketConnection(ws, req, canvasId);

    // 연결 해제 알림
    ws.on("close", () => {
      process.send?.({
        type: "connection-closed",
        workerId,
      });
    });
  });

  // 서버 시작
  async function startServer() {
    try {
      await connectMongoDB();

      server.listen(port);

      server.on("error", () => {
        process.exit(1);
      });
    } catch (error) {
      process.exit(1);
    }
  }

  startServer();

  // 종료 처리
  process.on("SIGTERM", async () => {
    await disconnectMongoDB();
    server.close(() => process.exit(0));
  });

  // 인터럽트 처리
  process.on("SIGINT", async () => {
    await disconnectMongoDB();
    server.close(() => process.exit(0));
  });
}

console.log("Server started");

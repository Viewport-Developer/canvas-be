import "dotenv/config";
import cluster from "cluster";
import http from "http";
import { createProxyServer } from "http-proxy";
import { startWorker } from "./server";

const PORT = Number(process.env.PORT);
const WORKER_COUNT = Number(process.env.WORKER_COUNT);

// 캔버스 ID → 워커 ID 매핑
const canvasToWorker = new Map<string, number>();
// 워커 ID → 연결 수 매핑
const workerConnections = new Map<number, number>();
// 워커 ID → 워커 포트 매핑
const workerPorts = new Map<number, number>();

if (cluster.isPrimary) {
  // 워커 프로세스 생성
  for (let i = 0; i < WORKER_COUNT; i++) {
    const workerPort = PORT + 1000 + i;
    const worker = cluster.fork({
      WORKER_ID: i,
      WORKER_PORT: workerPort,
    });

    workerConnections.set(i, 0);
    workerPorts.set(i, workerPort);

    worker.on("message", (msg: any) => {
      if (msg.type === "canvas-registered") {
        canvasToWorker.set(msg.canvasId, msg.workerId);
      }
      if (msg.type === "connection-opened") {
        const count = workerConnections.get(msg.workerId) || 0;
        workerConnections.set(msg.workerId, count + 1);
      }
      if (msg.type === "connection-closed") {
        const count = workerConnections.get(msg.workerId) || 0;
        workerConnections.set(msg.workerId, Math.max(0, count - 1));
      }
    });
  }

  // HTTP 서버 생성 (라우팅용)
  const server = http.createServer();
  const proxy = createProxyServer({});

  // WebSocket 업그레이드 요청 처리
  server.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    const canvasId = url.slice(6);

    if (!canvasId) {
      socket.destroy();
      return;
    }

    // 캔버스 ID 기반으로 워커 선택
    let targetWorkerId: number;

    if (canvasToWorker.has(canvasId)) {
      targetWorkerId = canvasToWorker.get(canvasId)!;
    } else {
      const sortedWorkers = Array.from(workerConnections.entries()).sort((a, b) => a[1] - b[1]);
      targetWorkerId = sortedWorkers[0][0];
    }

    // 선택된 워커의 포트로 프록시
    const targetPort = workerPorts.get(targetWorkerId);
    if (targetPort) {
      proxy.ws(request, socket, head, {
        target: `http://localhost:${targetPort}`,
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(PORT);
} else {
  const workerId = Number(process.env.WORKER_ID);
  const workerPort = Number(process.env.WORKER_PORT);
  startWorker(workerId, workerPort);
}

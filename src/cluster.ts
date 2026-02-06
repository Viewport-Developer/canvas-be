import "dotenv/config";
import cluster, { Worker } from "cluster";
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
// 워커 ID → ready 상태 매핑 (worker-ready 메시지를 받은 워커만 true)
const workerReady = new Set<number>();

if (cluster.isPrimary) {
  // 워커 리소스 정리 함수
  function cleanupWorkerResources(workerId: number) {
    // 해당 워커의 canvas 매핑 제거
    for (const [canvasId, wId] of canvasToWorker.entries()) {
      if (wId === workerId) {
        canvasToWorker.delete(canvasId);
      }
    }
    workerConnections.delete(workerId);
    workerPorts.delete(workerId);
    workerReady.delete(workerId);
  }

  // 워커 이벤트 핸들러 설정 함수
  function setupWorkerHandlers(worker: Worker, workerId: number) {
    worker.on("message", (msg: any) => {
      if (msg.type === "worker-ready") {
        workerReady.add(msg.workerId);
      }
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

    worker.on("exit", (code: number, signal: string) => {
      console.error(`Worker ${workerId} exited with code ${code} and signal ${signal}`);

      // 리소스 정리
      cleanupWorkerResources(workerId);

      // 워커 재시작
      const newWorkerPort = PORT + 1000 + workerId;
      const newWorker = cluster.fork({
        WORKER_ID: workerId,
        WORKER_PORT: newWorkerPort,
      });

      workerConnections.set(workerId, 0);
      workerPorts.set(workerId, newWorkerPort);

      // 재시작된 워커에 핸들러 재등록
      setupWorkerHandlers(newWorker, workerId);
    });
  }

  // 워커 프로세스 생성
  for (let i = 0; i < WORKER_COUNT; i++) {
    const workerPort = PORT + 1000 + i;
    const worker = cluster.fork({
      WORKER_ID: i,
      WORKER_PORT: workerPort,
    });

    workerConnections.set(i, 0);
    workerPorts.set(i, workerPort);

    // 워커에 이벤트 핸들러 설정
    setupWorkerHandlers(worker, i);
  }

  // HTTP 서버 생성 (라우팅용)
  const server = http.createServer();
  const proxy = createProxyServer({});

  // 프록시 에러 처리 (전역 핸들러)
  proxy.on("error", (err, req, socket) => {
    console.error("Proxy error:", err.message);
    if (socket && !socket.destroyed) {
      socket.destroy();
    }
  });

  // WebSocket 업그레이드 요청 처리
  server.on("upgrade", (request, socket, head) => {
    const url = request.url || "";

    // URL 파싱: /canvas/{canvasId} 형식 검증
    const canvasMatch = url.match(/^\/canvas\/(.+)$/);
    if (!canvasMatch) {
      socket.destroy();
      return;
    }
    const canvasId = canvasMatch[1];

    // 캔버스 ID 기반으로 워커 선택
    let targetWorkerId: number;

    if (canvasToWorker.has(canvasId)) {
      const mappedWorkerId = canvasToWorker.get(canvasId)!;
      // 매핑된 워커가 ready 상태인지 확인
      if (workerReady.has(mappedWorkerId) && workerPorts.has(mappedWorkerId)) {
        targetWorkerId = mappedWorkerId;
      } else {
        // stale 매핑 제거하고 새 워커 선택
        canvasToWorker.delete(canvasId);
        const sortedWorkers = Array.from(workerConnections.entries())
          .filter(([id]) => workerReady.has(id) && workerPorts.has(id))
          .sort((a, b) => a[1] - b[1]);
        if (sortedWorkers.length === 0) {
          socket.destroy();
          return;
        }
        targetWorkerId = sortedWorkers[0][0];
      }
    } else {
      // ready 상태인 워커 중에서 연결 수가 가장 적은 워커 선택
      const sortedWorkers = Array.from(workerConnections.entries())
        .filter(([id]) => workerReady.has(id) && workerPorts.has(id))
        .sort((a, b) => a[1] - b[1]);
      if (sortedWorkers.length === 0) {
        socket.destroy();
        return;
      }
      targetWorkerId = sortedWorkers[0][0];
    }

    // 선택된 워커의 포트로 프록시
    const targetPort = workerPorts.get(targetWorkerId);
    if (!targetPort) {
      console.error(`No port found for worker ${targetWorkerId}`);
      socket.destroy();
      return;
    }

    proxy.ws(request, socket, head, {
      target: `http://localhost:${targetPort}`,
    });
  });

  server.listen(PORT);
} else {
  const workerId = Number(process.env.WORKER_ID);
  const workerPort = Number(process.env.WORKER_PORT);
  startWorker(workerId, workerPort);
}

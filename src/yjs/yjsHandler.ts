import { loadYjsDoc, saveYjsDoc } from "./persistence";
import { canvasConnections, cancelDeleteTimer, setDeleteTimer } from "../services/canvas";

// @ts-ignore
const { setupWSConnection, setPersistence } = require("y-websocket/bin/utils");

// y-websocket의 문서 생명주기 훅 설정
setPersistence({
  // 문서가 처음 생성되거나 로드될 때 호출
  bindState: async (docName: string, ydoc: any) => {
    // 데이터베이스에서 문서 로드
    await loadYjsDoc(docName, ydoc);

    // 문서 업데이트 시 debounce로 저장 (2초 후 저장)
    const DEBOUNCE_DELAY_MS = 2000;
    let saveTimeout: NodeJS.Timeout | null = null;

    ydoc.on("update", async () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      saveTimeout = setTimeout(async () => {
        await saveYjsDoc(docName, ydoc);
        saveTimeout = null;
      }, DEBOUNCE_DELAY_MS);
    });
  },

  // 마지막 클라이언트가 문서에서 나갈 때 호출
  writeState: async (docName: string, ydoc: any) => {
    // 최종 상태 저장
    await saveYjsDoc(docName, ydoc);

    // 연결된 클라이언트가 없으면 60초 후 삭제 예약
    const activeConnection = canvasConnections.get(docName);
    const hasNoConnections = !activeConnection || activeConnection.size === 0;

    if (hasNoConnections) {
      setDeleteTimer(docName);
    }
  },

  provider: null,
});

// WebSocket 연결 처리
export function handleWebSocketConnection(ws: any, req: any): void {
  // URL에서 캔버스 ID 추출
  const requestUrl = req.url;
  const canvasId = requestUrl.slice(6);

  // 연결이 들어오면 삭제 타이머 취소
  cancelDeleteTimer(canvasId);

  // 연결 추적: 해당 캔버스의 연결 목록에 추가
  if (!canvasConnections.has(canvasId)) {
    canvasConnections.set(canvasId, new Set());
  }

  const activeConnection = canvasConnections.get(canvasId)!;
  activeConnection.add(ws);

  // y-websocket으로 Y.js 문서와 WebSocket 연결
  setupWSConnection(ws, req);

  // 연결 해제 시 연결 추적에서 제거
  ws.on("close", () => {
    const activeConnection = canvasConnections.get(canvasId);
    if (activeConnection) {
      activeConnection.delete(ws);
    }
  });

  // 에러 발생 시 연결 추적에서 제거
  ws.on("error", () => {
    const activeConnection = canvasConnections.get(canvasId);
    if (activeConnection) {
      activeConnection.delete(ws);
    }
  });
}

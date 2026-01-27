import { loadYjsDoc, saveYjsDoc } from './persistence';
import { deleteCanvas } from '../routes/canvas';

// y-websocket의 setupWSConnection과 setPersistence import
// CommonJS 환경이므로 require 직접 사용
// @ts-ignore - y-websocket의 타입 정의가 불완전할 수 있음
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');

// 각 캔버스별로 연결된 클라이언트 수를 추적
const canvasConnections = new Map<string, Set<any>>();

// y-websocket의 persistence hook 설정
// 문서 생명주기를 y-websocket이 자동으로 관리하도록 함
setPersistence({
  // 문서 최초 생성/로드 시점에 호출
  bindState: async (docName: string, ydoc: any) => {
    try {
      await loadYjsDoc(docName, ydoc);
      console.log(`[YJS Handler] 문서 로드 완료: ${docName}`);
      
      // 업데이트마다 저장 (debounce 적용)
      let saveTimeout: NodeJS.Timeout | null = null;
      ydoc.on('update', async () => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        // 2초 후 저장 (debounce)
        saveTimeout = setTimeout(async () => {
          try {
            await saveYjsDoc(docName, ydoc);
          } catch (error) {
            console.error(`[YJS Handler] 캔버스 ${docName} 저장 실패:`, error);
          }
        }, 2000);
      });
    } catch (error) {
      console.error(`[YJS Handler] 문서 로드 실패 (${docName}):`, error);
    }
  },

  // 마지막 클라이언트가 나갈 때 호출 (문서 정리 시점)
  writeState: async (docName: string, ydoc: any) => {
    try {
      await saveYjsDoc(docName, ydoc);
      console.log(`[YJS Handler] 문서 정리 및 저장 완료: ${docName}`);
      
      // 연결된 클라이언트가 없으면 캔버스 삭제
      const connections = canvasConnections.get(docName);
      if (!connections || connections.size === 0) {
        console.log(`[YJS Handler] 연결된 클라이언트가 없습니다. 캔버스 삭제: ${docName}`);
        try {
          await deleteCanvas(docName);
          canvasConnections.delete(docName);
          console.log(`[YJS Handler] 캔버스 삭제 완료: ${docName}`);
        } catch (error) {
          console.error(`[YJS Handler] 캔버스 삭제 실패 (${docName}):`, error);
        }
      }
    } catch (error) {
      console.error(`[YJS Handler] 문서 정리 중 저장 실패 (${docName}):`, error);
    }
  },

  provider: null,
});

/**
 * WebSocket 연결 처리
 * y-websocket의 setupWSConnection 사용
 * req에서 docName을 자동으로 파싱함
 */
export function handleWebSocketConnection(ws: any, req: any): void {
  try {
    // URL에서 문서 ID 추출
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const canvasId = url.searchParams.get('doc') || url.pathname.slice(1) || 'default-canvas';
    
    // 연결 추적: 해당 캔버스의 연결 목록에 추가
    if (!canvasConnections.has(canvasId)) {
      canvasConnections.set(canvasId, new Set());
    }
    canvasConnections.get(canvasId)!.add(ws);
    
    console.log(`[YJS Handler] WebSocket 연결: ${canvasId} (연결 수: ${canvasConnections.get(canvasId)!.size})`);
    
    // setupWSConnection이 req에서 docName을 자동으로 파싱함
    // URL 형식: ws://localhost:1234?doc=canvasId 또는 ws://localhost:1234/canvasId
    setupWSConnection(ws, req);
    
    // 연결 해제 시 추적
    ws.on('close', async () => {
      const connections = canvasConnections.get(canvasId);
      if (connections) {
        connections.delete(ws);
        console.log(`[YJS Handler] WebSocket 연결 해제: ${canvasId} (연결 수: ${connections.size})`);
        
        // 연결된 클라이언트가 없으면 캔버스 삭제
        if (connections.size === 0) {
          console.log(`[YJS Handler] 연결된 클라이언트가 없습니다. 캔버스 삭제: ${canvasId}`);
          try {
            await deleteCanvas(canvasId);
            canvasConnections.delete(canvasId);
            console.log(`[YJS Handler] 캔버스 삭제 완료: ${canvasId}`);
          } catch (error) {
            console.error(`[YJS Handler] 캔버스 삭제 실패 (${canvasId}):`, error);
          }
        }
      }
    });
    
    // 에러 발생 시에도 연결 해제 처리
    ws.on('error', () => {
      const connections = canvasConnections.get(canvasId);
      if (connections) {
        connections.delete(ws);
      }
    });
  } catch (error) {
    console.error('[YJS Handler] WebSocket 연결 실패:', error);
    ws.close();
  }
}

import * as Y from 'yjs';
import { prisma } from '../prisma/client';

/**
 * y.js 문서를 데이터베이스에 저장
 */
export async function saveYjsDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  try {
    const yjsUpdate = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(yjsUpdate);

    await prisma.canvas.upsert({
      where: { id: canvasId },
      create: {
        id: canvasId,
        yjsData: buffer,
      },
      update: {
        yjsData: buffer,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[Persistence] 캔버스 ${canvasId} 저장 실패:`, error);
    throw error;
  }
}

/**
 * 데이터베이스에서 y.js 문서 로드
 */
export async function loadYjsDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  try {
    const canvas = await prisma.canvas.findUnique({
      where: { id: canvasId },
    });

    if (canvas?.yjsData) {
      const uint8Array = new Uint8Array(canvas.yjsData);
      Y.applyUpdate(doc, uint8Array);
      console.log(`[Persistence] 캔버스 ${canvasId} 로드 완료`);
    } else {
      console.log(`[Persistence] 캔버스 ${canvasId} 데이터 없음, 새 문서 생성`);
    }
  } catch (error) {
    console.error(`[Persistence] 캔버스 ${canvasId} 로드 실패:`, error);
    // 에러가 발생해도 새 문서로 계속 진행
  }
}

/**
 * 주기적으로 문서를 저장하는 함수
 */
export function setupPeriodicSave(
  canvasId: string,
  doc: Y.Doc,
  intervalMs: number = 30000 // 기본 30초
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await saveYjsDoc(canvasId, doc);
      console.log(`[Persistence] 캔버스 ${canvasId} 주기적 저장 완료`);
    } catch (error) {
      console.error(`[Persistence] 캔버스 ${canvasId} 주기적 저장 실패:`, error);
    }
  }, intervalMs);
}

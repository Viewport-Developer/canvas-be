import { getWriteCollection } from "../mongodb/client";

export const canvasConnections = new Map<string, Set<any>>();

const canvasDeleteTimers = new Map<string, NodeJS.Timeout>();

export async function deleteCanvas(canvasId: string): Promise<void> {
  const collection = getWriteCollection();
  await collection.deleteOne({ id: canvasId });
}

// 캔버스 삭제 타이머 취소 함수
export function cancelDeleteTimer(canvasId: string): void {
  const timer = canvasDeleteTimers.get(canvasId);

  if (timer) {
    clearTimeout(timer);
    canvasDeleteTimers.delete(canvasId);
  }
}

// 캔버스 삭제 타이머 시작 함수
export function setDeleteTimer(canvasId: string): void {
  cancelDeleteTimer(canvasId);

  const DELETE_DELAY_MS = 60000;

  const timer = setTimeout(async () => {
    await deleteCanvas(canvasId);
    canvasConnections.delete(canvasId);
    canvasDeleteTimers.delete(canvasId);
  }, DELETE_DELAY_MS);

  canvasDeleteTimers.set(canvasId, timer);
}

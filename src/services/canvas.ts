import { prisma } from "../prisma/client";

// 전체 connection 정보 저장
export const canvasConnections = new Map<string, Set<any>>();

// 캔버스 삭제 타이머 저장
const canvasDeleteTimers = new Map<string, NodeJS.Timeout>();

// 캔버스 삭제 함수
export async function deleteCanvas(canvasId: string): Promise<void> {
  await prisma.canvas.delete({
    where: { id: canvasId },
  });
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
export function scheduleCanvasDeletion(canvasId: string): void {
  cancelDeleteTimer(canvasId);

  const DELETE_DELAY_MS = 60000;

  const timer = setTimeout(async () => {
    await deleteCanvas(canvasId);
    canvasConnections.delete(canvasId);
    canvasDeleteTimers.delete(canvasId);
  }, DELETE_DELAY_MS);

  canvasDeleteTimers.set(canvasId, timer);
}

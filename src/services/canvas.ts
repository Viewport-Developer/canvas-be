import { prisma } from '../prisma/client';

// 캔버스 삭제 함수
// 이 함수는 WebSocket 핸들러에서 내부적으로 사용됩니다.
export async function deleteCanvas(canvasId: string): Promise<void> {
  await prisma.canvas.delete({
    where: { id: canvasId },
  });
}

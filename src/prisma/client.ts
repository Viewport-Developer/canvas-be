import { PrismaClient } from "@prisma/client";

// Prisma 클라이언트 싱글톤 인스턴스
export const prisma = new PrismaClient({
  log: ["error"], // 성능 우선: 에러만 로그 출력
});

// 서버 종료 시 Prisma 연결 정리
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

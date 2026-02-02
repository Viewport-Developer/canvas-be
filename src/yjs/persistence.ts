import * as Y from "yjs";
import { prisma } from "../prisma/client";

// Y.js 문서를 데이터베이스에 저장
export async function saveYjsDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  // Y.js 문서를 바이너리로 인코딩
  const yjsUpdate = Y.encodeStateAsUpdate(doc);
  const yjsBinaryData = Buffer.from(yjsUpdate);

  // 캔버스가 없으면 생성, 있으면 업데이트
  await prisma.canvas.upsert({
    where: { id: canvasId },
    create: {
      id: canvasId,
      yjsData: yjsBinaryData,
    },
    update: {
      yjsData: yjsBinaryData,
    },
  });
}

// 데이터베이스에서 Y.js 문서 로드
export async function loadYjsDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  const canvas = await prisma.canvas.findUnique({
    where: { id: canvasId },
  });

  if (!canvas || !canvas.yjsData) {
    return;
  }

  // 바이너리 데이터를 문서에 적용하여 상태 복원
  const yjsBinaryArray = new Uint8Array(canvas.yjsData);
  Y.applyUpdate(doc, yjsBinaryArray);
}

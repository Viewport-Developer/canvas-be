import * as Y from 'yjs';
import { prisma } from '../prisma/client';
import type { Path, Shape, Text } from '../types';

/**
 * y.js 문서를 데이터베이스에 저장
 * y.js 문서와 도형 데이터를 모두 저장합니다.
 */
export async function saveYjsDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  try {
    // y.js 문서를 바이너리로 인코딩
    const yjsUpdate = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(yjsUpdate);

    // y.js 문서에서 도형 데이터 추출
    const pathsArray = doc.getArray<Path>('paths');
    const shapesArray = doc.getArray<Shape>('shapes');
    const textsArray = doc.getArray<Text>('texts');

    const paths = pathsArray.toArray();
    const shapes = shapesArray.toArray();
    const texts = textsArray.toArray();

    // 트랜잭션으로 캔버스와 도형 데이터를 함께 저장
    await prisma.$transaction(async (tx) => {
      // 캔버스 메타데이터 및 y.js 문서 저장
      await tx.canvas.upsert({
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

      // 기존 도형 데이터 삭제 후 새로 저장 (전체 교체 방식)
      await tx.path.deleteMany({ where: { canvasId } });
      await tx.shape.deleteMany({ where: { canvasId } });
      await tx.text.deleteMany({ where: { canvasId } });

      // 새 도형 데이터 저장
      if (paths.length > 0) {
        await tx.path.createMany({
          data: paths.map((path) => ({
            id: path.id,
            canvasId,
            points: path.points,
            color: path.color,
            width: path.width,
            boundingBox: path.boundingBox,
          })),
        });
      }

      if (shapes.length > 0) {
        await tx.shape.createMany({
          data: shapes.map((shape) => ({
            id: shape.id,
            canvasId,
            type: shape.type,
            startPoint: shape.startPoint,
            endPoint: shape.endPoint,
            color: shape.color,
            width: shape.width,
            boundingBox: shape.boundingBox,
          })),
        });
      }

      if (texts.length > 0) {
        await tx.text.createMany({
          data: texts.map((text) => ({
            id: text.id,
            canvasId,
            position: text.position,
            content: text.content,
            color: text.color,
            fontSize: text.fontSize,
            boundingBox: text.boundingBox,
          })),
        });
      }
    });

    console.log(
      `[Persistence] 캔버스 ${canvasId} 저장 완료 - Paths: ${paths.length}, Shapes: ${shapes.length}, Texts: ${texts.length}`
    );
  } catch (error) {
    console.error(`[Persistence] 캔버스 ${canvasId} 저장 실패:`, error);
    throw error;
  }
}

/**
 * 데이터베이스에서 y.js 문서 로드
 * y.js 문서가 없으면 데이터베이스의 도형 데이터로 초기화합니다.
 */
export async function loadYjsDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  try {
    const canvas = await prisma.canvas.findUnique({
      where: { id: canvasId },
      include: {
        paths: true,
        shapes: true,
        texts: true,
      },
    });

    if (canvas?.yjsData) {
      // y.js 문서가 있으면 그것을 사용
      const uint8Array = new Uint8Array(canvas.yjsData);
      Y.applyUpdate(doc, uint8Array);
      console.log(`[Persistence] 캔버스 ${canvasId} y.js 문서 로드 완료`);
    } else if (canvas) {
      // y.js 문서는 없지만 캔버스가 존재하면 도형 데이터로 초기화
      const pathsArray = doc.getArray<Path>('paths');
      const shapesArray = doc.getArray<Shape>('shapes');
      const textsArray = doc.getArray<Text>('texts');

      // 데이터베이스의 도형 데이터를 y.js 배열에 추가
      canvas.paths.forEach((path) => {
        pathsArray.push([
          {
            id: path.id,
            points: path.points as Path['points'],
            color: path.color,
            width: path.width,
            boundingBox: path.boundingBox as Path['boundingBox'],
          },
        ]);
      });

      canvas.shapes.forEach((shape) => {
        shapesArray.push([
          {
            id: shape.id,
            type: shape.type as Shape['type'],
            startPoint: shape.startPoint as Shape['startPoint'],
            endPoint: shape.endPoint as Shape['endPoint'],
            color: shape.color,
            width: shape.width,
            boundingBox: shape.boundingBox as Shape['boundingBox'],
          },
        ]);
      });

      canvas.texts.forEach((text) => {
        textsArray.push([
          {
            id: text.id,
            position: text.position as Text['position'],
            content: text.content,
            color: text.color,
            fontSize: text.fontSize,
            boundingBox: text.boundingBox as Text['boundingBox'],
          },
        ]);
      });

      console.log(
        `[Persistence] 캔버스 ${canvasId} 도형 데이터로 초기화 완료 - Paths: ${canvas.paths.length}, Shapes: ${canvas.shapes.length}, Texts: ${canvas.texts.length}`
      );
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

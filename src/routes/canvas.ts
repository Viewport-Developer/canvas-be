import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';

const router = Router();

/**
 * GET /api/canvas/:id
 * 캔버스 메타데이터 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const canvas = await prisma.canvas.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        // yjsData는 제외 (용량이 크므로)
      },
    });
    
    if (!canvas) {
      return res.status(404).json({
        error: '캔버스를 찾을 수 없습니다.',
      });
    }
    
    res.json(canvas);
  } catch (error) {
    console.error('[Canvas Route] GET /:id 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/canvas
 * 새 캔버스 생성
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    const canvas = await prisma.canvas.create({
      data: {
        name: name || null,
        // yjsData는 WebSocket 연결 시 자동 생성됨
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.status(201).json(canvas);
  } catch (error) {
    console.error('[Canvas Route] POST / 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /api/canvas/:id
 * 캔버스 메타데이터 업데이트
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const canvas = await prisma.canvas.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.json(canvas);
  } catch (error) {
    console.error('[Canvas Route] PUT /:id 오류:', error);
    
    // Prisma 오류 처리
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        error: '캔버스를 찾을 수 없습니다.',
      });
    }
    
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * 캔버스 삭제 함수 (서버 내부에서도 사용 가능)
 */
export async function deleteCanvas(canvasId: string): Promise<void> {
  try {
    await prisma.canvas.delete({
      where: { id: canvasId },
    });
    console.log(`[Canvas Route] 캔버스 삭제 완료: ${canvasId}`);
  } catch (error) {
    // Prisma 오류 처리
    if ((error as any).code === 'P2025') {
      console.log(`[Canvas Route] 캔버스를 찾을 수 없음: ${canvasId}`);
      return; // 이미 삭제된 경우 무시
    }
    throw error;
  }
}

/**
 * DELETE /api/canvas/:id
 * 캔버스 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await deleteCanvas(id);
    
    res.status(204).send();
  } catch (error) {
    console.error('[Canvas Route] DELETE /:id 오류:', error);
    
    // Prisma 오류 처리
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        error: '캔버스를 찾을 수 없습니다.',
      });
    }
    
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/canvas
 * 캔버스 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const canvases = await prisma.canvas.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    res.json(canvases);
  } catch (error) {
    console.error('[Canvas Route] GET / 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/canvas/:id/shapes
 * 캔버스의 모든 도형 데이터 조회 (Paths, Shapes, Texts)
 */
router.get('/:id/shapes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const canvas = await prisma.canvas.findUnique({
      where: { id },
      include: {
        paths: true,
        shapes: true,
        texts: true,
      },
    });
    
    if (!canvas) {
      return res.status(404).json({
        error: '캔버스를 찾을 수 없습니다.',
      });
    }
    
    res.json({
      paths: canvas.paths,
      shapes: canvas.shapes,
      texts: canvas.texts,
    });
  } catch (error) {
    console.error('[Canvas Route] GET /:id/shapes 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
    });
  }
});

export default router;

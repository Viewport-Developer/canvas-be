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
 * DELETE /api/canvas/:id
 * 캔버스 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.canvas.delete({
      where: { id },
    });
    
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

export default router;

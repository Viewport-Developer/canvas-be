# 캔버스 서버

실시간 협업 캔버스 애플리케이션을 위한 y.js WebSocket 서버입니다.

## 기술 스택

- **런타임**: Node.js (LTS)
- **프레임워크**: Express
- **WebSocket**: ws
- **실시간 동기화**: y.js, y-websocket
- **데이터베이스**: PostgreSQL
- **ORM**: Prisma
- **언어**: TypeScript

## 기능

- 🔌 WebSocket을 통한 실시간 협업 지원
- 💾 PostgreSQL을 통한 캔버스 데이터 영속성
- 🚀 REST API를 통한 캔버스 CRUD 작업
- 🔄 y.js 기반 자동 동기화

## 설치 및 실행

### 1. 필수 요구사항

- Node.js (LTS 버전)
- PostgreSQL 데이터베이스

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
PORT=1234
DATABASE_URL=postgresql://user:password@localhost:5432/canvas_db?schema=public
NODE_ENV=development
```

### 4. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npm run prisma:generate

# 데이터베이스 마이그레이션 실행
npm run prisma:migrate
```

### 5. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## API 엔드포인트

### REST API

- `GET /api/canvas` - 캔버스 목록 조회
- `GET /api/canvas/:id` - 캔버스 메타데이터 조회
- `POST /api/canvas` - 새 캔버스 생성
- `PUT /api/canvas/:id` - 캔버스 메타데이터 업데이트
- `DELETE /api/canvas/:id` - 캔버스 삭제

### WebSocket

- **URL**: `ws://localhost:1234?doc={canvasId}`
- **프로토콜**: y-websocket 표준
- **문서 ID**: 쿼리 파라미터 `doc`으로 전달

## 프로젝트 구조

```
src/
├── server.ts          # Express + WebSocket 서버 진입점
├── yjs/
│   ├── yjsHandler.ts  # y.js 문서 핸들러
│   └── persistence.ts # 데이터베이스 저장/로드
├── routes/
│   └── canvas.ts      # REST API 라우터
├── prisma/
│   └── client.ts      # Prisma 클라이언트
└── types/
    └── index.ts       # 타입 정의
```

## 데이터 구조

서버는 클라이언트와 동일한 데이터 구조를 사용합니다:

- `paths`: `Y.Array<Path>` - 경로 배열
- `shapes`: `Y.Array<Shape>` - 도형 배열
- `texts`: `Y.Array<Text>` - 텍스트 배열

## 동작 방식

1. 클라이언트가 WebSocket 연결 (`ws://localhost:1234?doc=canvas-id`)
2. 서버가 y.js 문서 생성 또는 데이터베이스에서 로드
3. y-websocket이 자동으로 동기화 처리
4. 변경사항이 다른 클라이언트에 브로드캐스트
5. 변경사항 발생 시 자동 저장 (debounce 2초)
6. 주기적으로 데이터베이스에 저장 (30초마다)

## 클라이언트 연동

이 서버는 `TEMP` 디렉토리의 프론트엔드 프로젝트와 연동됩니다.

클라이언트의 `.env` 파일 설정:
```env
VITE_WS_URL=ws://localhost:1234
VITE_CANVAS_ID=default-canvas
```

## 개발 가이드

### Prisma Studio 실행

```bash
npm run prisma:studio
```

### 타입 체크

```bash
npm run type-check
```

## 테스트

자세한 테스트 가이드는 [`TESTING.md`](./TESTING.md)를 참조하세요.

### 빠른 테스트

```bash
# 1. 패키지 설치
npm install

# 2. Prisma 클라이언트 생성
npm run prisma:generate

# 3. 데이터베이스 마이그레이션 (PostgreSQL 필요)
npm run prisma:migrate

# 4. 서버 실행
npm run dev
```

서버가 실행되면:
- HTTP: `http://localhost:1234` 접속하여 서버 상태 확인
- WebSocket: 프론트엔드(`TEMP`)와 연동하여 실시간 동기화 테스트

## 참고 문서

- [y.js 공식 문서](https://docs.yjs.dev/)
- [y-websocket GitHub](https://github.com/yjs/y-websocket)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [테스트 가이드](./TESTING.md) - 상세한 테스트 방법

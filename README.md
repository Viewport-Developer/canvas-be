# 캔버스 서버

실시간 협업 캔버스 애플리케이션을 위한 y.js WebSocket 서버입니다. Node.js 클러스터링을 통한 멀티 워커 아키텍처로 높은 성능과 확장성을 제공합니다.

## 기술 스택

- **런타임**: Node.js (LTS)
- **아키텍처**: Node.js Cluster (멀티 워커)
- **WebSocket**: ws
- **실시간 동기화**: y.js, y-websocket
- **데이터베이스**: MongoDB
- **프로세스 관리**: PM2
- **로드 밸런싱**: http-proxy
- **언어**: TypeScript

## 주요 기능

- 🔌 WebSocket을 통한 실시간 협업 지원
- 💾 MongoDB를 통한 캔버스 데이터 영속성
- 🚀 클러스터링 기반 멀티 워커 아키텍처
- ⚖️ 캔버스 ID 기반 로드 밸런싱
- 🔄 y.js 기반 자동 동기화
- 🗑️ 자동 캔버스 삭제 (60초 후, 연결 없을 시)
- 💾 Debounce 기반 자동 저장 (2초)

## 설치 및 실행

### 1. 필수 요구사항

- Node.js (LTS 버전)
- MongoDB 데이터베이스

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
PORT=1234
WORKER_COUNT=2
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=canvas_db
DATABASE_COLLECTION=canvases
NODE_ENV=development
```

**환경변수 설명:**

- `PORT`: 마스터 프로세스가 사용하는 포트 (기본: 1234)
- `WORKER_COUNT`: 생성할 워커 프로세스 수 (기본: 2)
- `DATABASE_URL`: MongoDB 연결 URL
- `DATABASE_NAME`: 사용할 데이터베이스 이름
- `DATABASE_COLLECTION`: 사용할 컬렉션 이름

**MongoDB 인증이 필요한 경우:**

```env
DATABASE_URL=mongodb://사용자명:비밀번호@localhost:27017
```

### 4. 서버 실행

#### 개발 모드

```bash
# TypeScript 직접 실행 (ts-node-dev)
npm run dev

# 또는 PM2로 개발 모드 실행
npm run start:pm2:dev
```

#### 프로덕션 모드

```bash
# 빌드
npm run build

# PM2로 실행
npm run start:pm2

# 또는 직접 실행
node dist/cluster.js
```

### 5. PM2 관리 명령어

```bash
# 시작
npm run start:pm2          # 프로덕션
npm run start:pm2:dev      # 개발

# 중지
npm run stop:pm2
npm run stop:pm2:dev

# 재시작
npm run restart:pm2
npm run restart:pm2:dev

# 로그 확인
npm run logs:pm2
npm run logs:pm2:dev

# 삭제
npm run delete:pm2
npm run delete:pm2:dev
```

## 아키텍처

### 클러스터 구조

서버는 Node.js 클러스터 모듈을 사용하여 멀티 워커 아키텍처를 구현합니다:

1. **마스터 프로세스** (`cluster.ts`)

   - 워커 프로세스 생성 및 관리
   - HTTP 프록시 서버 운영 (포트: `PORT`)
   - 캔버스 ID → 워커 ID 매핑 관리
   - 로드 밸런싱 (연결 수 기반)

2. **워커 프로세스** (`server.ts`)
   - 실제 WebSocket 서버 운영 (포트: `PORT + 1000 + workerId`)
   - y.js 문서 처리
   - MongoDB 연결 관리

### 로드 밸런싱

- **캔버스 ID 기반 라우팅**: 같은 캔버스는 항상 같은 워커로 라우팅
- **연결 수 기반 선택**: 새 캔버스는 연결 수가 가장 적은 워커에 할당
- **WebSocket 업그레이드**: HTTP 프록시를 통해 워커로 전달

### 포트 구조

- 마스터 프로세스: `PORT` (기본 1234)
- 워커 0: `PORT + 1000` (기본 2234)
- 워커 1: `PORT + 1001` (기본 2235)
- ... (워커 수에 따라 증가)

## API 엔드포인트

### WebSocket

- **URL**: `ws://localhost:1234/canvas/{canvasId}`
- **프로토콜**: y-websocket 표준
- **예시**: `ws://localhost:1234/canvas/canvas-abc123`

> **참고**: URL 경로에서 `canvas/` 이후의 문자열이 캔버스 ID입니다.

## 프로젝트 구조

```
src/
├── cluster.ts          # 마스터 프로세스 (워커 관리, 프록시)
├── server.ts           # 워커 프로세스 (WebSocket 서버)
├── yjs/
│   ├── yjsHandler.ts   # y.js 문서 핸들러
│   └── persistence.ts  # MongoDB 저장/로드
├── services/
│   └── canvas.ts       # 캔버스 관리 (연결 추적, 삭제 타이머)
├── mongodb/
│   └── client.ts       # MongoDB 클라이언트 (읽기/쓰기 분리)
└── types/
    └── index.ts        # 타입 정의
```

## 데이터 구조

서버는 클라이언트와 동일한 데이터 구조를 사용합니다:

- `paths`: `Y.Array<Path>` - 경로 배열
- `shapes`: `Y.Array<Shape>` - 도형 배열
- `texts`: `Y.Array<Text>` - 텍스트 배열

MongoDB에는 다음과 같이 저장됩니다:

```json
{
  "id": "canvas-abc123",
  "yjsData": "<y.js 바이너리 데이터>",
  "createdAt": "2026-02-05T...",
  "updatedAt": "2026-02-05T..."
}
```

## 동작 방식

1. **클라이언트 연결**: `ws://localhost:1234/canvas/{canvasId}`
2. **마스터 프로세스**: 캔버스 ID를 기반으로 워커 선택
3. **워커 프로세스**: y.js 문서 생성 또는 MongoDB에서 로드
4. **y-websocket**: 자동으로 동기화 처리
5. **변경사항 브로드캐스트**: 다른 클라이언트에 실시간 전달
6. **자동 저장**: 변경사항 발생 시 debounce 2초 후 저장
7. **연결 해제**: 마지막 연결이 해제되면 60초 후 캔버스 삭제

## 클라이언트 연동

이 서버는 `TEMP` 디렉토리의 프론트엔드 프로젝트와 연동됩니다.

클라이언트의 `.env` 파일 설정:

```env
VITE_WS_URL=ws://localhost:1234
```

클라이언트는 URL 쿼리 파라미터로 캔버스 ID를 관리합니다:

- `http://localhost:5173?canvasId=canvas-abc123`

## 성능 최적화

### MongoDB 연결 최적화

- **읽기/쓰기 분리**: 읽기 전용 클라이언트와 쓰기 전용 클라이언트 분리
- **Connection Pool**: 읽기 20개, 쓰기 80개 풀 크기
- **인덱스**: `id` 필드에 고유 인덱스 자동 생성

### 메모리 관리

- **자동 캔버스 삭제**: 연결이 없는 캔버스는 60초 후 자동 삭제
- **연결 추적**: 각 캔버스의 활성 연결 수 추적

## 개발 가이드

### 로컬 개발

```bash
# 개발 모드 실행 (자동 재시작)
npm run dev
```

### 프로덕션 배포

```bash
# 빌드
npm run build

# PM2로 실행
npm run start:pm2

# 로그 확인
npm run logs:pm2
```

### 워커 수 조정

환경변수 `WORKER_COUNT`로 워커 수를 조정할 수 있습니다:

```env
WORKER_COUNT=4  # 4개의 워커 프로세스 생성
```

각 워커는 `PORT + 1000 + workerId` 포트에서 실행됩니다.

## 테스트

자세한 테스트 가이드는 [`TESTING.md`](./TESTING.md)를 참조하세요.

### 빠른 테스트

```bash
# 1. MongoDB 실행 확인
# MongoDB가 localhost:27017에서 실행 중이어야 합니다

# 2. 패키지 설치
npm install

# 3. 환경변수 설정 (.env 파일)
PORT=1234
WORKER_COUNT=2
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=canvas_db
DATABASE_COLLECTION=canvases

# 4. 서버 실행
npm run dev
```

서버가 실행되면:

- 마스터 프로세스: `http://localhost:1234` (프록시)
- 워커 프로세스: `http://localhost:2234`, `http://localhost:2235` 등
- WebSocket: 프론트엔드(`TEMP`)와 연동하여 실시간 동기화 테스트

## 문제 해결

### 포트 확인

여러 워커가 사용하는 포트:

- 마스터: `PORT` (기본 1234)
- 워커: `PORT + 1000` ~ `PORT + 1000 + WORKER_COUNT - 1`

### MongoDB 연결 확인

- MongoDB 실행 상태 확인
- `DATABASE_URL` 환경변수 설정 확인
- 네트워크 방화벽 설정 확인

### 로그 확인

PM2 로그 확인:

```bash
npm run logs:pm2
```

## 참고 문서

- [y.js 공식 문서](https://docs.yjs.dev/)
- [y-websocket GitHub](https://github.com/yjs/y-websocket)
- [Node.js Cluster 모듈](https://nodejs.org/api/cluster.html)
- [MongoDB Node.js 드라이버](https://www.mongodb.com/docs/drivers/node/current/)
- [PM2 공식 문서](https://pm2.keymetrics.io/)
- [테스트 가이드](./TESTING.md) - 상세한 테스트 방법

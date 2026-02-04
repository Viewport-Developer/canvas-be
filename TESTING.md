# 테스트 가이드

서버를 테스트하는 방법을 단계별로 안내합니다.

## 1. 사전 준비

### 필수 요구사항 확인

- ✅ Node.js (LTS 버전) 설치 확인
- ✅ MongoDB 데이터베이스 설치 및 실행 확인

### 패키지 설치

```bash
cd TEMP2
npm install
```

## 2. 데이터베이스 설정

### MongoDB 실행 확인

MongoDB가 실행 중인지 확인합니다:

```bash
# Windows (서비스 확인)
sc query MongoDB

# Mac/Linux
brew services list | grep mongodb
# 또는
sudo systemctl status mongod
```

MongoDB가 설치되어 있지 않다면:

- **Windows**: [MongoDB Community Server](https://www.mongodb.com/try/download/community) 다운로드
- **Mac**: `brew install mongodb-community`
- **Linux**: [MongoDB 설치 가이드](https://www.mongodb.com/docs/manual/installation/)

### 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 설정합니다:

```env
PORT=1234
WORKER_COUNT=2
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=canvas_db
DATABASE_COLLECTION=canvases
NODE_ENV=development
```

**설명:**

- `PORT`: 마스터 프로세스가 사용하는 포트 (기본: 1234)
- `WORKER_COUNT`: 생성할 워커 프로세스 수 (기본: 2)
- `DATABASE_URL`: MongoDB 연결 URL
- `DATABASE_NAME`: 사용할 데이터베이스 이름
- `DATABASE_COLLECTION`: 사용할 컬렉션 이름

**MongoDB 인증이 필요한 경우:**

```env
DATABASE_URL=mongodb://사용자명:비밀번호@localhost:27017
```

### 데이터베이스 및 컬렉션 자동 생성

MongoDB는 데이터가 처음 저장될 때 자동으로 데이터베이스와 컬렉션이 생성됩니다. 별도의 수동 생성이 필요하지 않습니다.

서버가 처음 실행되면 `canvas_db` 데이터베이스와 `canvases` 컬렉션이 자동으로 생성됩니다.

## 3. 서버 실행

### 개발 모드로 실행

```bash
npm run dev
```

서버가 정상적으로 시작되면:

- **마스터 프로세스**: 포트 `1234`에서 프록시 서버 실행
- **워커 프로세스**: 포트 `2234`, `2235` 등에서 WebSocket 서버 실행

### PM2로 실행 (선택사항)

```bash
# 개발 모드
npm run start:pm2:dev

# 프로덕션 모드
npm run build
npm run start:pm2
```

### 프로세스 확인

서버가 정상적으로 실행되면 다음 포트들이 사용됩니다:

```bash
# Windows
netstat -ano | findstr "1234 2234 2235"

# Mac/Linux
lsof -i :1234 -i :2234 -i :2235
```

**포트 구조:**

- `1234`: 마스터 프로세스 (프록시)
- `2234`: 워커 0
- `2235`: 워커 1
- ... (워커 수에 따라 증가)

## 4. 서버 테스트

### 4.1 클러스터 아키텍처 확인

서버는 클러스터 모드로 실행되므로 여러 프로세스가 동시에 실행됩니다:

```bash
# 프로세스 확인 (Windows)
tasklist | findstr node

# 프로세스 확인 (Mac/Linux)
ps aux | grep node
```

**예상 프로세스:**

- 마스터 프로세스 1개 (`cluster.ts`)
- 워커 프로세스 N개 (`server.ts`, `WORKER_COUNT`에 따라)

### 4.2 WebSocket 연결 테스트

#### 방법 1: 프론트엔드와 연동 테스트 (권장)

1. **프론트엔드 서버 실행**

   ```bash
   cd ../TEMP
   npm install
   npm run dev
   ```

2. **프론트엔드 환경변수 확인**
   `TEMP/.env` 파일 확인:

   ```env
   VITE_WS_URL=ws://localhost:1234
   ```

3. **브라우저에서 테스트**
   - 프론트엔드 앱을 브라우저에서 열기: `http://localhost:5173`
   - URL에 캔버스 ID가 자동으로 추가되는지 확인
   - 개발자 도구 콘솔에서 연결 상태 확인
   - 여러 브라우저 탭에서 동시 접속하여 실시간 동기화 테스트

#### 방법 2: WebSocket 클라이언트 도구 사용

**wscat 설치 및 사용:**

```bash
npm install -g wscat

# WebSocket 연결 테스트 (올바른 URL 형식)
wscat -c "ws://localhost:1234/canvas/test-canvas-123"
```

WebSocket URL 형식: `ws://localhost:1234/canvas/{canvasId}`

**온라인 도구 사용:**

- https://www.websocket.org/echo.html
- URL: `ws://localhost:1234/canvas/test-canvas-123`

### 4.3 로드 밸런싱 테스트

같은 캔버스 ID로 여러 연결을 시도하면 같은 워커로 라우팅되는지 확인:

1. **같은 캔버스 ID로 여러 연결**

   ```bash
   # 터미널 1
   wscat -c "ws://localhost:1234/canvas/test-canvas-1"

   # 터미널 2
   wscat -c "ws://localhost:1234/canvas/test-canvas-1"
   ```

2. **다른 캔버스 ID로 연결**

   ```bash
   # 터미널 3
   wscat -c "ws://localhost:1234/canvas/test-canvas-2"
   ```

3. **서버 로그 확인**
   - 각 연결이 어떤 워커로 라우팅되는지 확인
   - 같은 캔버스 ID는 같은 워커로 라우팅되어야 함

## 5. 통합 테스트 시나리오

### 시나리오 1: 기본 동기화 테스트

1. 서버 실행 (`npm run dev`)
2. 브라우저 탭 2개 열기
3. 두 탭 모두 `http://localhost:5173` (프론트엔드) 접속
   - 같은 `canvasId` 쿼리 파라미터 사용 (URL 공유)
4. 첫 번째 탭에서 그림 그리기
5. 두 번째 탭에서 실시간으로 동기화되는지 확인

### 시나리오 2: 데이터 영속성 테스트

1. 서버 실행
2. 프론트엔드에서 그림 그리기
3. 서버 로그에서 저장 메시지 확인 (변경사항 발생 후 2초 debounce)
4. 서버 재시작
5. 프론트엔드 재접속 (같은 `canvasId` 사용)
6. 이전 그림이 복원되는지 확인

**MongoDB에서 데이터 확인:**

```bash
# MongoDB 셸 접속
mongosh

# 데이터베이스 선택
use canvas_db

# 캔버스 데이터 조회
db.canvases.find({ id: "canvas-abc123" })
```

### 시나리오 3: 다중 캔버스 테스트

1. 서버 실행
2. 프론트엔드에서 다른 캔버스 ID로 연결
   - 브라우저 1: `http://localhost:5173?canvasId=canvas-1`
   - 브라우저 2: `http://localhost:5173?canvasId=canvas-2`
3. 각 캔버스가 독립적으로 동작하는지 확인
4. 각 캔버스의 데이터가 서로 섞이지 않는지 확인

### 시나리오 4: 자동 캔버스 삭제 테스트

1. 서버 실행
2. 프론트엔드에서 캔버스 생성 및 그림 그리기
3. 모든 브라우저 탭 닫기 (연결 해제)
4. 60초 대기
5. MongoDB에서 해당 캔버스 삭제 확인:

   ```bash
   mongosh
   use canvas_db
   db.canvases.find({ id: "테스트-캔버스-ID" })
   ```

### 시나리오 5: 워커 장애 복구 테스트

1. PM2로 서버 실행 (`npm run start:pm2:dev`)
2. 여러 캔버스에 연결
3. 특정 워커 프로세스 강제 종료:

   ```bash
   # 워커 프로세스 찾기
   ps aux | grep "server.ts"

   # 프로세스 종료 (PID 사용)
   kill -9 <PID>
   ```

4. PM2가 자동으로 재시작하는지 확인
5. 연결이 정상적으로 유지되는지 확인

## 6. 문제 해결

### 서버 시작 확인

1. **포트 확인**

   ```bash
   # Windows - 마스터 포트 확인
   netstat -ano | findstr :1234

   # Windows - 워커 포트 확인
   netstat -ano | findstr "2234 2235"

   # Mac/Linux - 모든 관련 포트 확인
   lsof -i :1234 -i :2234 -i :2235
   ```

2. **MongoDB 연결 확인**

   - MongoDB 실행 상태 확인:

     ```bash
     # Windows
     sc query MongoDB

     # Mac/Linux
     brew services list | grep mongodb
     # 또는
     sudo systemctl status mongod
     ```

   - `.env`의 `DATABASE_URL` 설정 확인
   - MongoDB 연결 테스트:

     ```bash
     mongosh "mongodb://localhost:27017"
     ```

3. **환경변수 확인**
   - `.env` 파일 존재 확인
   - 필수 환경변수 설정 확인:
     - `PORT`
     - `WORKER_COUNT`
     - `DATABASE_URL`
     - `DATABASE_NAME`
     - `DATABASE_COLLECTION`

### WebSocket 연결 확인

1. **서버 로그 확인**

   - 연결 시도 메시지 확인
   - 워커 프로세스 시작 상태 확인

2. **URL 형식**

   - 형식: `ws://localhost:1234/canvas/{canvasId}`

3. **프론트엔드 환경변수 확인**

   - `VITE_WS_URL=ws://localhost:1234` (경로 없이)
   - 프론트엔드 재시작

4. **워커 프로세스 확인**
   - 워커 시작 상태 확인
   - 각 워커 포트 열림 상태 확인

### 데이터베이스 확인

1. **MongoDB 연결 확인**

   ```bash
   mongosh "mongodb://localhost:27017"
   ```

2. **데이터베이스 및 컬렉션 확인**

   ```bash
   mongosh
   use canvas_db
   show collections
   db.canvases.find().limit(5)
   ```

3. **인덱스 확인**

   ```bash
   mongosh
   use canvas_db
   db.canvases.getIndexes()
   ```

   - `id` 필드에 고유 인덱스 확인

4. **데이터 확인**

   ```bash
   mongosh
   use canvas_db
   # 특정 캔버스 조회
   db.canvases.findOne({ id: "canvas-abc123" })

   # 모든 캔버스 조회
   db.canvases.find().pretty()
   ```

### 클러스터 확인

1. **워커 프로세스 확인**

   - `WORKER_COUNT` 환경변수 확인
   - 마스터 프로세스 로그 확인
   - 워커 포트 확인 (워커 포트: `PORT + 1000 + workerId`)

2. **로드 밸런싱 확인**

   - 마스터 프로세스 실행 상태 확인
   - 프록시 서버 포트 확인
   - 캔버스 ID 추출 확인

3. **PM2 관리**

   ```bash
   # PM2 프로세스 확인
   pm2 list

   # PM2 로그 확인
   npm run logs:pm2:dev

   # PM2 재시작
   npm run restart:pm2:dev
   ```

## 7. 성능 모니터링

### 서버 로그 확인

서버 실행 시 다음과 같은 로그가 표시됩니다:

- **마스터 프로세스**: 워커 생성 및 프록시 라우팅 로그
- **워커 프로세스**: WebSocket 연결 및 y.js 문서 처리 로그
- MongoDB 연결 성공/실패 로그
- 캔버스 저장/로드 로그

### PM2 모니터링

PM2로 실행한 경우:

```bash
# 프로세스 상태 확인
pm2 list

# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs

# 특정 앱 로그만 확인
npm run logs:pm2:dev
```

### 데이터베이스 모니터링

MongoDB 셸을 사용하여 실시간으로 데이터 확인:

```bash
# MongoDB 셸 접속
mongosh

# 데이터베이스 선택
use canvas_db

# 컬렉션 통계 확인
db.canvases.stats()

# 최근 저장된 캔버스 확인
db.canvases.find().sort({ updatedAt: -1 }).limit(10)

# 특정 캔버스의 데이터 크기 확인
db.canvases.findOne({ id: "canvas-abc123" }, { yjsData: 1 })
```

### 워커 부하 모니터링

각 워커의 연결 수를 확인하려면 서버 로그에서 다음을 확인:

- `connection-opened` 메시지: 연결 수 증가
- `connection-closed` 메시지: 연결 수 감소
- 마스터 프로세스가 각 워커의 연결 수를 추적

### MongoDB 성능 확인

```bash
mongosh

# 현재 작업 확인
db.currentOp()

# 느린 쿼리 확인
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)

# 인덱스 사용 확인
db.canvases.find({ id: "canvas-abc123" }).explain("executionStats")
```

## 8. 고급 테스트

### 부하 테스트

여러 클라이언트를 동시에 연결하여 부하 테스트:

```bash
# 여러 WebSocket 연결 생성 (예: 100개)
for i in {1..100}; do
  wscat -c "ws://localhost:1234/canvas/test-canvas-$i" &
done
```

### 워커 수 조정 테스트

다양한 워커 수로 성능 비교:

```env
# .env 파일 수정
WORKER_COUNT=1  # 단일 워커
WORKER_COUNT=2  # 기본값
WORKER_COUNT=4  # 더 많은 워커
WORKER_COUNT=8  # 최대 워커
```

각 설정으로 서버를 재시작하고 성능을 측정합니다.

### MongoDB 복제본 세트 테스트

프로덕션 환경에서는 MongoDB 복제본 세트를 사용할 수 있습니다:

```env
DATABASE_URL=mongodb://primary:27017,secondary:27017,arbiter:27017/canvas_db?replicaSet=rs0
```

### 자동 재시작 테스트

PM2의 자동 재시작 기능 테스트:

```bash
# 프로세스 강제 종료
pm2 stop canvas-server-dev

# 자동 재시작 확인
pm2 list

# 또는 프로세스 크래시 시뮬레이션
kill -9 <PID>
```

## 9. 다음 단계

- ✅ 서버가 정상 작동하면 프론트엔드와 통합 개발 진행
- ✅ 프로덕션 배포 준비 (환경변수, 보안 설정 등)
- ✅ MongoDB 복제본 세트 구성 (고가용성)
- ✅ 모니터링 도구 통합 (예: Prometheus, Grafana)
- ✅ 추가 기능 구현 (인증, 권한 관리 등)
- ✅ 로드 밸런서 앞단에 Nginx 추가 고려

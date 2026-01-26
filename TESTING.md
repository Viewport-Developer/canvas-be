# 테스트 가이드

서버를 테스트하는 방법을 단계별로 안내합니다.

## 1. 사전 준비

### 필수 요구사항 확인
- ✅ Node.js (LTS 버전) 설치 확인
- ✅ PostgreSQL 데이터베이스 설치 및 실행 확인

### 패키지 설치

```bash
cd TEMP2
npm install
```

## 2. 데이터베이스 설정

### PostgreSQL 데이터베이스 생성

PostgreSQL에 접속하여 데이터베이스를 생성합니다:

```sql
CREATE DATABASE canvas_db;
```

### 환경변수 설정

`.env` 파일을 열고 데이터베이스 연결 정보를 수정합니다:

```env
PORT=1234
DATABASE_URL=postgresql://사용자명:비밀번호@localhost:5432/canvas_db?schema=public
NODE_ENV=development
```

**예시:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/canvas_db?schema=public
```

### Prisma 클라이언트 생성 및 마이그레이션

```bash
# Prisma 클라이언트 생성
npm run prisma:generate

# 데이터베이스 마이그레이션 실행 (테이블 생성)
npm run prisma:migrate
```

마이그레이션 실행 시 마이그레이션 이름을 입력하라는 프롬프트가 나타나면:
```
Enter a name for the new migration: init
```

## 3. 서버 실행

### 개발 모드로 실행

```bash
npm run dev
```

서버가 정상적으로 시작되면 다음과 같은 메시지가 표시됩니다:

```
=================================
🚀 서버가 실행 중입니다!
📡 HTTP: http://localhost:1234
🔌 WebSocket: ws://localhost:1234
📊 환경: development
=================================
```

## 4. 서버 테스트

### 4.1 REST API 테스트

#### 브라우저에서 테스트

1. **서버 상태 확인**
   - 브라우저에서 `http://localhost:1234` 접속
   - JSON 응답이 표시되면 정상

2. **캔버스 생성**
   ```bash
   curl -X POST http://localhost:1234/api/canvas \
     -H "Content-Type: application/json" \
     -d '{"name": "테스트 캔버스"}'
   ```

3. **캔버스 목록 조회**
   ```bash
   curl http://localhost:1234/api/canvas
   ```

4. **캔버스 조회**
   ```bash
   curl http://localhost:1234/api/canvas/{캔버스ID}
   ```

#### Postman 또는 Thunder Client 사용

- `GET http://localhost:1234` - 서버 상태 확인
- `GET http://localhost:1234/api/canvas` - 캔버스 목록
- `POST http://localhost:1234/api/canvas` - 캔버스 생성
  ```json
  {
    "name": "테스트 캔버스"
  }
  ```

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
   VITE_CANVAS_ID=default-canvas
   ```

3. **브라우저에서 테스트**
   - 프론트엔드 앱을 브라우저에서 열기
   - 개발자 도구 콘솔에서 연결 상태 확인
   - 여러 브라우저 탭에서 동시 접속하여 실시간 동기화 테스트

#### 방법 2: WebSocket 클라이언트 도구 사용

**wscat 설치 및 사용:**
```bash
npm install -g wscat

# WebSocket 연결 테스트
wscat -c "ws://localhost:1234?doc=test-canvas"
```

**온라인 도구 사용:**
- https://www.websocket.org/echo.html
- URL: `ws://localhost:1234?doc=test-canvas`

## 5. 통합 테스트 시나리오

### 시나리오 1: 기본 동기화 테스트

1. 서버 실행 (`npm run dev`)
2. 브라우저 탭 2개 열기
3. 두 탭 모두 `http://localhost:5173` (프론트엔드) 접속
4. 첫 번째 탭에서 그림 그리기
5. 두 번째 탭에서 실시간으로 동기화되는지 확인

### 시나리오 2: 데이터 영속성 테스트

1. 서버 실행
2. 프론트엔드에서 그림 그리기
3. 서버 로그에서 저장 메시지 확인 (2초 후 또는 30초 후)
4. 서버 재시작
5. 프론트엔드 재접속
6. 이전 그림이 복원되는지 확인

### 시나리오 3: 다중 캔버스 테스트

1. 서버 실행
2. 프론트엔드에서 다른 캔버스 ID로 연결
   - `.env`에서 `VITE_CANVAS_ID=canvas-1` 설정
3. 각 캔버스가 독립적으로 동작하는지 확인

## 6. 문제 해결

### 서버가 시작되지 않는 경우

1. **포트 충돌 확인**
   ```bash
   # Windows
   netstat -ano | findstr :1234
   
   # Mac/Linux
   lsof -i :1234
   ```

2. **데이터베이스 연결 확인**
   - PostgreSQL이 실행 중인지 확인
   - `.env`의 `DATABASE_URL`이 올바른지 확인

3. **Prisma 클라이언트 생성 확인**
   ```bash
   npm run prisma:generate
   ```

### WebSocket 연결이 안 되는 경우

1. **서버 로그 확인**
   - 연결 시도 메시지가 나타나는지 확인
   - 오류 메시지 확인

2. **프론트엔드 환경변수 확인**
   - `VITE_WS_URL`이 올바른지 확인
   - 프론트엔드 재시작 필요할 수 있음

3. **CORS 문제**
   - 개발 환경에서는 CORS가 자동으로 설정됨
   - 프로덕션 환경에서는 추가 설정 필요

### 데이터베이스 오류

1. **마이그레이션 확인**
   ```bash
   npm run prisma:migrate
   ```

2. **Prisma Studio로 데이터 확인**
   ```bash
   npm run prisma:studio
   ```
   - 브라우저에서 `http://localhost:5555` 접속
   - 데이터베이스 내용 확인

## 7. 성능 모니터링

### 서버 로그 확인

서버 실행 시 다음과 같은 로그가 표시됩니다:

- `[Server] WebSocket 연결 시도: {canvasId}` - 연결 시작
- `[YJS Handler] 새 문서 생성: {canvasId}` - 새 문서 생성
- `[Persistence] 캔버스 {canvasId} 저장 완료` - 저장 완료
- `[Persistence] 캔버스 {canvasId} 로드 완료` - 로드 완료

### 데이터베이스 모니터링

Prisma Studio를 사용하여 실시간으로 데이터 확인:
```bash
npm run prisma:studio
```

## 8. 다음 단계

- ✅ 서버가 정상 작동하면 프론트엔드와 통합 개발 진행
- ✅ 프로덕션 배포 준비 (환경변수, 보안 설정 등)
- ✅ 추가 기능 구현 (인증, 권한 관리 등)

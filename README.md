# Focus — 브라우저 기반 실시간 집중도 감지

카메라 영상에서 얼굴 랜드마크를 추출하고, 눈·시선·머리 방향을 분석하여 **실시간 집중 상태를 판정**하는 웹 애플리케이션.
탭을 전환해도 PiP(Picture-in-Picture) 창으로 집중 상태를 모니터링할 수 있다.

```
Camera → MediaPipe FaceLandmarker → FaceSignals → Worker(Score + StateMachine) → PiP HUD
```

<br/>

## 기술 스택

| 기술 | 버전 | 역할 |
|------|------|------|
| Next.js | 16.1.6 | App Router, SSR/CSR 프레임워크 |
| React | 19.2.3 | UI 렌더링 |
| TypeScript | 5 | 타입 안전성 |
| Tailwind CSS | 4 | 유틸리티 기반 스타일링 |
| MediaPipe FaceLandmarker | 0.10.32 | 얼굴 랜드마크 + Blendshape 추출 |
| Web Worker | — | 점수 계산·상태 머신 (메인 스레드 부하 분리) |
| Picture-in-Picture API | — | 탭 전환 시 상태 모니터링 |
| Canvas captureStream | — | PiP 용 합성 비디오 스트림 |
| MediaSession API | — | Chrome Automatic PiP 트리거 |
| requestVideoFrameCallback | — | 프레임 동기화 캡처 루프 |
| Vitest | 4.0.18 | 단위 테스트 (25개) |
| Playwright | 1.58.2 | E2E 테스트 |

<br/>

## 프로젝트 구조 (Feature-Sliced Design)

```
src/
├── app/                          # Next.js App Router (라우팅, 레이아웃)
│   ├── layout.tsx
│   ├── page.tsx
│   └── session/page.tsx
│
├── views/                        # 페이지 단위 UI 조합
│   └── session/SessionPage.tsx
│
├── widgets/                      # 독립적 UI 블록
│   ├── camera-preview/
│   ├── focus-hud/
│   ├── session-summary/
│   └── session-history/
│
├── features/                     # 비즈니스 로직 단위
│   ├── detection/                # 카메라 캡처, MediaPipe 초기화, 시그널 추출
│   │   └── lib/
│   │       ├── captureLoop.ts
│   │       ├── extractSignals.ts
│   │       └── initLandmarker.ts
│   │
│   ├── focus-scoring/            # 점수 산출, 상태 머신, 커버리지 추적
│   │   └── lib/
│   │       ├── focusScorer.ts
│   │       ├── stateMachine.ts
│   │       ├── coverageTracker.ts
│   │       └── analysis.worker.ts
│   │
│   ├── pip/                      # PiP 지원 (auto/manual/none)
│   │   └── lib/
│   │       ├── setupAutoPip.ts
│   │       ├── pipCanvasRenderer.ts
│   │       ├── manualPipFallback.ts
│   │       └── initPip.ts
│   │
│   └── session/                  # 세션 생명주기 오케스트레이션
│       └── lib/sessionManager.ts
│
├── entities/                     # 도메인 모델
│   └── focus-session/
│       └── model/
│           ├── types.ts
│           └── constants.ts
│
└── shared/                       # 범용 유틸리티
    ├── lib/
    │   ├── workerBridge.ts
    │   ├── timer.ts
    │   └── featureDetect.ts
    └── types/messages.ts
```

**왜 `pages` 대신 `views`인가?**
FSD 표준에서는 `pages` 레이어를 사용하지만, Next.js App Router가 `src/pages/` 디렉토리를 자동 라우팅으로 인식하기 때문에 충돌을 피하고자 `views`로 대체했다.

<br/>

## 아키텍처 & 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│  Main Thread                                                        │
│                                                                     │
│  Camera (getUserMedia)                                              │
│    │                                                                │
│    ▼                                                                │
│  CaptureLoop (rVFC / setInterval fallback)                          │
│    │                                                                │
│    ▼                                                                │
│  MediaPipe FaceLandmarker (WASM + WebGL GPU)                        │
│    │                                                                │
│    ▼                                                                │
│  extractSignals() → FaceSignals (~17 numbers, ~200 bytes)           │
│    │                                                                │
│    │  postMessage                                                   │
│    ▼                                                                │
│ ┌──────────────────────────────────────────────┐                    │
│ │  Web Worker                                  │                    │
│ │  ┌──────────────┐                            │                    │
│ │  │ focusScorer   │ → 가중치 점수 (0–1)        │                    │
│ │  └──────┬───────┘                            │                    │
│ │         ▼                                    │                    │
│ │  ┌──────────────┐                            │                    │
│ │  │ stateMachine  │ → focused/distracted/absent│                   │
│ │  └──────┬───────┘                            │                    │
│ │         ▼                                    │                    │
│ │  ┌──────────────┐                            │                    │
│ │  │coverageTracker│ → 실효 샘플레이트           │                    │
│ │  └──────────────┘                            │                    │
│ └──────────────────────────────────────────────┘                    │
│    │  postMessage (STATE_UPDATE)                                    │
│    ▼                                                                │
│  SessionManager → React State → UI (HUD, PiP, Summary)             │
└─────────────────────────────────────────────────────────────────────┘
```

### 왜 MediaPipe는 메인 스레드인가?

MediaPipe FaceLandmarker는 **WebGL GPU delegate**를 사용하여 추론을 가속한다.
WebGL 컨텍스트는 메인 스레드에서만 생성 가능하고, WASM 로더가 `importScripts()`를 사용하기 때문에 Module Worker에서도 로드에 실패한다.
([mediapipe#5527](https://github.com/google/mediapipe/issues/5527), [mediapipe#4694](https://github.com/google/mediapipe/issues/4694))

따라서 **GPU가 필요한 추론은 메인 스레드**, **순수 계산(점수·상태)은 Worker**로 분리했다.

### 왜 ImageBitmap이 아닌 FaceSignals인가?

| 전송 방식 | 크기 | 비고 |
|-----------|------|------|
| ImageBitmap (transferable) | ~2 MB/frame | 640×480 RGBA |
| FaceSignals (structured clone) | ~200 bytes | 17개 숫자 |

MediaPipe 결과에서 필요한 값만 추출하면 **전송량이 10,000배 감소**한다. Worker는 원본 이미지가 필요 없고, 추출된 숫자만으로 점수를 계산할 수 있다.

### Worker 메시지 프로토콜

| 방향 | 타입 | 용도 |
|------|------|------|
| Main → Worker | `SESSION_START` | 세션 시작, 설정 전달 |
| Main → Worker | `SIGNALS` | FaceSignals 전달 |
| Main → Worker | `SESSION_STOP` | 세션 종료 요청 |
| Main → Worker | `START_HEARTBEAT` | 백그라운드 하트비트 시작 |
| Main → Worker | `STOP_HEARTBEAT` | 하트비트 정지 |
| Main → Worker | `HEARTBEAT_ACK` | 틱 응답 (캡처 트리거) |
| Main → Worker | `CHANGE_MODE` | StudyMode 전환 |
| Worker → Main | `WORKER_READY` | 초기화 완료 핸드셰이크 |
| Worker → Main | `STATE_UPDATE` | 상태·점수 변경 알림 |
| Worker → Main | `HEARTBEAT_TICK` | 백그라운드 캡처 트리거 |
| Worker → Main | `COVERAGE_UPDATE` | 커버리지 통계 |
| Worker → Main | `SESSION_SUMMARY` | 세션 요약 데이터 |

<br/>

## 핵심 기술 상세

### MediaPipe FaceLandmarker

WASM + GPU delegate로 초기화하여 478개 얼굴 랜드마크, Blendshape, 변환 행렬을 추출한다.

**EAR (Eye Aspect Ratio)** — 눈 감김 판정의 핵심 지표:

```
EAR = (|p2 - p6| + |p3 - p5|) / (2 × |p1 - p4|)
```

```typescript
// src/features/detection/lib/extractSignals.ts

const leftEyeIndices = {
  p1: 33, p2: 160, p3: 158, p4: 133, p5: 153, p6: 144,
};

const vertical1 = dist(p2, p6);
const vertical2 = dist(p3, p5);
const horizontal = dist(p1, p4);

return (vertical1 + vertical2) / (2 * horizontal);
```

p1–p4는 수평축(눈 양 끝), p2–p6·p3–p5는 수직축(위·아래 눈꺼풀). 눈을 감으면 수직 거리가 줄어 EAR이 감소한다.

**Euler 각도 추출** — 회전 행렬(column-major 4×4)에서 yaw/pitch/roll을 계산:

```typescript
// src/features/detection/lib/extractSignals.ts

// Rotation matrix elements (column-major 4x4)
const r00 = matrix[0], r10 = matrix[4], r20 = matrix[8];
const r21 = matrix[9], r22 = matrix[10];

const pitch = Math.asin(-r20) * toDeg;
const yaw   = Math.atan2(r10, r00) * toDeg;
const roll  = Math.atan2(r21, r22) * toDeg;
```

### Focus Scoring 알고리즘

4가지 신호를 가중 합산하여 0–1 범위의 집중 점수를 산출한다.

| 요소 | 가중치 | 측정 방식 |
|------|--------|-----------|
| Eye openness | 30% | EAR + Blink blendshape (50:50 혼합) |
| Gaze direction | 35% | lookOut, lookUp, lookDown blendshape |
| Head pose | 25% | yaw, pitch 패널티 |
| Face presence | 10% | 얼굴 감지 신뢰도 |

**Hard gate**: `faceDetectionConfidence < 0.5`이면 즉시 `score = 0` 반환.

```typescript
// src/features/focus-scoring/lib/focusScorer.ts

const focusScore =
  eyeScore   * 0.3 +
  gazeScore  * 0.35 +
  headScore  * 0.25 +
  signals.faceDetectionConfidence * 0.1;
```

**StudyMode 분기**: `book` 모드에서는 고개를 숙이는 자세가 자연스럽다.

```typescript
// book 모드: pitchDivisor 80 (관대), eyeLookDown 패널티 제외
// desktop 모드: pitchDivisor 40 (엄격), eyeLookDown 패널티 포함
if (studyMode !== "book") {
  lookAwayCandidates.push(
    (signals.eyeLookDownLeft + signals.eyeLookDownRight) / 2,
  );
}
const pitchDivisor = studyMode === "book" ? 80 : 40;
```

### 상태 머신 (Hysteresis)

점수를 3단계 상태로 분류하되, **연속 5프레임** 이상 같은 상태가 유지되어야 전환한다.
이 히스테리시스 로직이 상태 flickering을 방지한다.

```
focused (≥ 0.6) ←── 5프레임 ──→ distracted (≥ 0.3) ←── 5프레임 ──→ absent (< 0.3)
```

```typescript
// src/features/focus-scoring/lib/stateMachine.ts

// 같은 후보 상태가 반복되면 카운트 증가
if (rawState === state.candidateState) {
  state.candidateCount += 1;
} else {
  state.candidateState = rawState;
  state.candidateCount = 1;
}

// 임계값 도달 시 상태 전환 + 세그먼트 기록
if (state.candidateCount >= config.hysteresisFrames) {
  state.segments.push({
    state: state.currentState,
    startMs: state.segmentStartMs,
    endMs: timestampMs,
    avgScore: state.segmentScoreSum / state.segmentFrameCount,
  });
  state.currentState = rawState;
  // ...
}
```

### Web Worker 아키텍처

**Module Worker 패턴**으로 ESM import를 Worker 내에서 사용한다.

```typescript
new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" })
```

WorkerBridge가 `WORKER_READY` 핸드셰이크를 관리하며, Discriminated Union 타입으로 메시지 프로토콜의 타입 안전성을 보장한다.

```typescript
// src/features/focus-scoring/lib/analysis.worker.ts

ctx.addEventListener("message", (e: MessageEvent<MainToWorkerMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "SESSION_START": { /* 초기화 */ break; }
    case "SIGNALS":       { /* 점수 계산 → STATE_UPDATE */ break; }
    case "SESSION_STOP":  { /* 요약 생성 → SESSION_SUMMARY */ break; }
    case "START_HEARTBEAT": { /* 백그라운드 타이머 */ break; }
    // ...
  }
});

post({ type: "WORKER_READY" });
```

### Picture-in-Picture

탭을 전환해도 집중 상태를 확인할 수 있도록 PiP 창에 상태 뱃지를 오버레이한다.

**Canvas 합성 파이프라인**:

```
sourceVideo → canvas.drawImage(미러링) → 상태 뱃지 오버레이
→ canvas.captureStream(30) → hidden video → PiP
```

```typescript
// src/features/pip/lib/pipCanvasRenderer.ts

function render() {
  // 미러링된 비디오 프레임
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(sourceVideo, -WIDTH, 0, WIDTH, HEIGHT);
  ctx.restore();

  // 상태 뱃지 (미러링 안 함)
  const { color, label } = STATE_CONFIG[currentState];
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fill();
  // ...
}

// rAF 대신 setInterval — 백그라운드 탭에서 rAF는 throttle됨
const intervalId = setInterval(render, 33);
```

**Automatic PiP**: Chrome의 Video Conferencing PiP API를 활용하여 매 탭 전환마다 자동 진입.

```typescript
// src/features/pip/lib/setupAutoPip.ts

navigator.mediaSession.setCameraActive(true);
navigator.mediaSession.setMicrophoneActive(true);

navigator.mediaSession.setActionHandler(
  "enterpictureinpicture",
  async () => {
    await video.requestPictureInPicture();
  },
);
```

### 백그라운드 감지

탭이 비활성화되면 `rVFC`가 중단되므로 Worker의 `setInterval`을 사용한다.

```
visibilitychange → hidden:
  rVFC 중단 → Worker START_HEARTBEAT(500ms)
  Worker: HEARTBEAT_TICK → Main: 캡처 1회 → SIGNALS → Worker

visibilitychange → visible:
  Worker STOP_HEARTBEAT → rVFC 재개
```

Worker의 `setInterval`은 백그라운드 탭에서도 throttle되지 않으므로 안정적인 캡처 주기를 유지한다.

<br/>

## 개발 과정: 문제 해결 기록

### 이슈 1: MediaPipe는 Worker에서 실행할 수 없다

**문제**: 초기 설계에서는 MediaPipe 추론을 Worker에서 실행하여 메인 스레드를 완전히 해방시키려 했다.

**원인**: WebGL 컨텍스트는 메인 스레드 전용이며, WASM 로더가 `importScripts()`를 사용해 Module Worker에서 로드에 실패한다. ([#5527](https://github.com/google/mediapipe/issues/5527), [#4694](https://github.com/google/mediapipe/issues/4694))

**해결**: **GPU가 필요한 추론은 메인 스레드**, 순수 계산은 Worker로 역할을 분리. 전송 데이터를 `FaceSignals`(~200 bytes)로 최소화하여 postMessage 오버헤드를 제거했다.

---

### 이슈 2: Turbopack에서 Module Worker 빌드 실패

**문제**: `new URL("./worker.ts", import.meta.url)` 패턴이 Turbopack에서 MIME type 오류 발생.

**해결**: dev/build 모두 `--webpack` 플래그를 사용하여 Webpack 기반으로 전환.

```json
"dev": "next dev --webpack",
"build": "next build --webpack"
```

---

### 이슈 3: PiP 자동 진입과 User Gesture 요구사항

**문제**: `visibilitychange` 이벤트에서 `requestPictureInPicture()` 호출 시 "사용자 제스처 필요" 에러. `visibilitychange`는 사용자 제스처로 인정되지 않는다.

**해결**: 3단계 PiP 전략 도입.
1. **Auto**: Chrome Automatic PiP (Video Conferencing API)
2. **Manual**: 사용자가 버튼 클릭으로 PiP 진입
3. **None**: PiP 미지원 브라우저

---

### 이슈 4: 첫 번째 탭 전환만 PiP 작동

**문제**: muted video를 사용하자 Chrome이 media session으로 인식하지 않아 한 번만 PiP 진입됨.

**원인**: Chrome Auto PiP 필수 조건 — playing + **not muted** + `enterpictureinpicture` handler 등록.

**해결**: `visibilitychange` 기반에서 MediaSession API 기반으로 전환.

---

### 이슈 5: 탭 복귀 시 PiP 재진입 실패

**문제**: 탭 복귀 시 `exitPictureInPicture()`를 호출하면 Chrome이 "사용자가 닫음"으로 처리하여 재진입을 차단.

**흐름**: PiP 열림 → `exitPiP()`(프로그래밍) → Chrome: "dismissed" → 재진입 실패

**해결**: `exitPictureInPicture()` 호출을 **제거**. PiP 창을 유지하여 YouTube 등과 동일한 UX 패턴을 따름.

---

### 이슈 6: Video PiP API의 근본적 한계 → Automatic PiP 전환

**문제**: `visibilitychange` 기반도 첫 1회만 허용되는 경우 발생.

**해결**: Chrome **Automatic PiP for Video Conferencing** API 도입.

```typescript
getUserMedia({ audio: true })           // 오디오 트랙 필수
navigator.mediaSession.setCameraActive(true)
navigator.mediaSession.setMicrophoneActive(true)
// enterpictureinpicture handler → Chrome이 매 탭 전환마다 자동 호출
```

**발견**: localhost에서는 작동하지 않음 → localtunnel로 HTTPS 환경을 만들어 확인.

---

### 이슈 7: 얼굴 미감지 시 상태 머신 고착

**문제**: `extractSignals()`가 `null`을 반환하면 CaptureLoop이 이를 무시하여 마지막 상태가 무한히 유지됨.

**해결**: 30프레임 연속 `null` 후 `faceDetectionConfidence: 0`인 시그널을 전송. Hard gate가 `score = 0`을 반환하고 상태 머신이 `absent`로 전환.

---

### 이슈 8: 책 공부 시 distracted 오판

**문제**: Desktop 모드의 pitch 패널티(`/40`)가 고개 숙인 독서 자세를 distracted로 판정.

**해결**: `StudyMode` 도입.

| 파라미터 | Desktop | Book |
|----------|---------|------|
| pitchDivisor | 40 | 80 |
| eyeLookDown 패널티 | 적용 | 제외 |

---

### 이슈 9: PiP 창에서 집중 상태 확인 불가

**문제**: 네이티브 PiP 창은 DOM 오버레이를 지원하지 않는다.

**해결**: Canvas 합성 파이프라인. video → canvas(미러링 + 뱃지) → `captureStream(30)` → PiP용 hidden video.

---

### 이슈 10: rAF가 백그라운드 탭에서 throttle

**문제**: `requestAnimationFrame` → 백그라운드 탭에서 ~1fps, `setInterval` → 5분 후 1회/분까지 감소.

**해결**: Worker 내 `setInterval`은 백그라운드 throttle 대상이 아님. Worker가 500ms 간격으로 `HEARTBEAT_TICK`을 발행하면 메인 스레드가 1회 캡처 후 결과를 Worker에 전달.

<br/>

## 테스트 전략

**단위 테스트 (Vitest, 25개)**:

| 모듈 | 테스트 수 | 검증 대상 |
|------|-----------|-----------|
| focusScorer | 10 | 가중치 계산, hard gate, study mode 분기, 클램핑 |
| stateMachine | 10 | 분류, 히스테리시스 전환, 세그먼트 누적, finalize |
| coverageTracker | 5 | 샘플 기록, 커버리지 퍼센트, 실효 샘플레이트 |

순수 함수(scorer, stateMachine)는 단위 테스트로 검증하고, 브라우저 API 의존 코드(MediaPipe, PiP)는 Playwright E2E로 통합 테스트한다.

<br/>

## Quick Start

```bash
npm install
npm run dev          # next dev --webpack (http://localhost:3000)
npx vitest run       # 25 unit tests
npx playwright test  # E2E tests
```

<br/>

## 주요 설정값

| 설정 | 기본값 | 설명 |
|------|--------|------|
| targetFps | 10 | 캡처 목표 프레임 레이트 |
| focusThreshold | 0.6 | focused 판정 임계값 |
| distractedThreshold | 0.3 | distracted 판정 임계값 |
| hysteresisFrames | 5 | 상태 전환에 필요한 연속 프레임 수 |
| HEARTBEAT_INTERVAL_MS | 500 | 백그라운드 하트비트 간격 |

<br/>

## 알려진 제한사항 & 향후 계획

- **Auto PiP**: localhost 미지원 (HTTPS 필요)
- **세션 히스토리**: 메모리 기반 (DB 미연동)
- **단일 얼굴만 지원**
- **모델**: 런타임 다운로드 (오프라인 미지원)

<br/>

## 참고 문서

**Browser APIs:**
- [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
- [Picture-in-Picture API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API)
- [Automatic PiP for Web Apps (Chrome)](https://developer.chrome.com/blog/automatic-picture-in-picture)
- [MediaSession API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession)
- [requestVideoFrameCallback (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- [Canvas.captureStream() (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)
- [Page Visibility API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Web Workers (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [getUserMedia (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

**Frameworks:**
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

**GitHub Issues:**
- [mediapipe#5527 — Worker에서 WASM 로드 불가](https://github.com/google/mediapipe/issues/5527)
- [mediapipe#4694 — Worker에서 WebGL 사용 불가](https://github.com/google/mediapipe/issues/4694)

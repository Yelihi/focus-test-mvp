---
description: FSD(Feature-Sliced Design)내 entities(Models) rules
---


# FSD Entity Slice 생성 스킬

이 스킬은 `src/entities/` 하위에 새로운 entity slice를 생성할 때 사용한다.
요청을 받으면 아래 절차를 따라 파일을 생성한다.

---

## Step 1. Entity 유형 판단

| 유형 | 조건 | 생성 파일 |
|------|------|-----------|
| **A. 데이터 모델만** | HTTP 호출 없음, 다른 entity의 DTO에서 참조만 됨 | `models/dtos.ts`, `models/enums.ts` |
| **B. Repository 포함** | features 레이어에서 직접 API 호출 필요 | A + `models/repository.ts`, `services/{Entity}RepositoryImpl.ts` |
| **C. Behavior 포함** | enum → 표시 텍스트 변환, 타입 가드 등 도메인 로직 필요 | A + `models/behaviors/{Entity}Behavior.ts` |
| **D. 풀 슬라이스** | Repository + Behavior 모두 필요 | A + B + C |

---

## Step 2. 디렉토리명 결정

- 형식: `kebab-case`, **단수형**
- 경로: `src/entities/{entity-name}/`
- 예: `free-trial-user`, `temp-user`, `promotion`, `inflow`

---

## Step 3. 유형별 생성 파일 목록

### A. 데이터 모델만

```
{entity}/
└── models/
    ├── dtos.ts
    └── enums.ts
```

### B. Repository 포함

```
{entity}/
├── models/
│   ├── dtos.ts
│   ├── enums.ts
│   └── repository.ts
└── services/
    └── {Entity}RepositoryImpl.ts
```

### C. Behavior 포함

```
{entity}/
└── models/
    ├── dtos.ts
    ├── enums.ts
    └── behaviors/
        └── {Entity}Behavior.ts
```

### D. 풀 슬라이스

```
{entity}/
├── models/
│   ├── dtos.ts
│   ├── enums.ts
│   ├── repository.ts
│   └── behaviors/
│       └── {Entity}Behavior.ts
└── services/
    └── {Entity}RepositoryImpl.ts
```

---

## Step 4. 각 파일 생성 규칙

### `models/enums.ts`

```typescript
// 도메인 상태/타입 enum — string 값은 CONSTANT_CASE
export enum {Entity}Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// 등급/분류 enum — PascalCase 키, CONSTANT_CASE 값
export enum {Entity}Grade {
  ElementarySchool1 = 'ELEMENTARY_1',
  ElementarySchool2 = 'ELEMENTARY_2',
  MiddleSchool1 = 'MIDDLE_1',
}

// 날짜/요일 enum — 키와 값이 동일한 경우
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}
```

**규칙:**
- enum 이름: `PascalCase`
- enum 값: `CONSTANT_CASE` 문자열
- 등급·분류처럼 계층이 있는 경우 키는 `PascalCase`, 값은 `CONSTANT_CASE`
- 같은 파일에 관련 enum을 모두 모은다

---

### `models/dtos.ts`

```typescript
import { {Entity}Grade, DayOfWeek } from './enums';
import { PageableObject, SortObject } from '@/entities/common/dtos';
// 다른 entity DTO 참조 시
import { RelatedEntityDto } from '@/entities/related-entity/models/dtos';

// ── Request DTOs ──────────────────────────────────────

// POST/PATCH 요청 본문 — 중첩 객체로 논리적 그룹화
export interface {Action}{Entity}RequestDto {
  user: {
    name: string;
    phoneNumber: string;
    grade: {Entity}Grade;
  };
  schedule: {
    startDate: string;      // 'YYYY-MM-DD'
    days: DayOfWeek[];
  };
  optionalSection?: {
    fieldA: string;
    fieldB?: string;
  };
}

// GET 목록 요청 — 쿼리 파라미터를 flat하게 나열
export interface Get{Entity}sRequestDto {
  page: number;
  size: number;
  // 필터 파라미터
  periodType?: string;
  baseDate?: string;
  keyword?: string;
}

// GET 단건 요청
export interface Get{Entity}RequestDto {
  id: string;
}

// ── Response DTOs ──────────────────────────────────────

// 단건 entity 표현
export interface {Entity}Dto {
  id: string;
  name: string;
  grade: {Entity}Grade;
  createdAt: string;
  // 관련 entity 포함
  related?: RelatedEntityDto;
}

// 목록 페이지 응답 (공통 페이지네이션 구조)
export interface Page{Entity}ResponseDto {
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  pageable: PageableObject;
  size: number;
  content: {Entity}Dto[];
  number: number;
  sort: SortObject;
  numberOfElements: number;
  empty: boolean;
}

// API 응답 래퍼
export interface Get{Entity}sResponseDto {
  {entities}: Page{Entity}ResponseDto;
}

// 생성/수정 응답
export interface {Action}{Entity}ResponseDto {
  id: string;
  // 필요한 응답 필드
}
```

**규칙:**
- Request: `{Action}{Entity}RequestDto` (POST→Create, PATCH→Patch, DELETE→Delete)
- Response 단건: `{Entity}Dto`
- Response 목록 페이지: `Page{Entity}ResponseDto`
- Response API 래퍼: `Get{Entity}sResponseDto`
- GET 목록 파라미터는 flat 인터페이스, POST 본문은 중첩 객체
- 날짜는 `string` 타입, 포맷은 주석으로 명시

---

### `models/behaviors/{Entity}Behavior.ts`

```typescript
export interface {Entity}BehaviorStructure {
  // 필요한 메서드 선언
}

export class {Entity}Behavior implements {Entity}BehaviorStructure {
  // 필요한 메서드 구현
  create = (entity: {Entity}Dto) => {
    // entity 기반의 비즈니스 로직 구현
  }
}


// index.ts
export const {Entity}Behavior = new {Entity}Behavior();

// 혹은 tsyringe 를 사용한다면
export const { {Entity}BehaviorStructure } from './behaviors/{Entity}Behavior';
```

**규칙**
- behavior 구현체의 목적은 해당 entity 기반의 비즈니스 로직 구현입니다.
- 따라서 순수 자바스크립트 로직 외 어떠한 라이브러리 (tsyringe 제외)도 사용하지 않습니다.
- 또한 인자로 entity 를 전달 받습니다. (ex: create(entity: {Entity}Dto))
- 반대로 entity 를 기반으로 한 로직 구현이 아니라면 behavior 에 적합하지 않습니다.

### `models/repository.ts`

```typescript
import {
  {Action}{Entity}RequestDto,
  Get{Entity}sRequestDto,
  Get{Entity}RequestDto,
  Get{Entity}sResponseDto,
  {Action}{Entity}ResponseDto,
} from './dtos';

export interface {Entity}Repository {
  // 목록 조회
  get{Entity}s: (
    request: Get{Entity}sRequestDto,
    options?: RequestInit
  ) => Promise<Get{Entity}sResponseDto>;

  // 단건 조회
  get{Entity}: (
    request: Get{Entity}RequestDto,
    options?: RequestInit
  ) => Promise<{Entity}Dto>;

  // 생성
  create{Entity}: (
    request: Create{Entity}RequestDto,
    options?: RequestInit
  ) => Promise<{Action}{Entity}ResponseDto>;

  // 수정
  patch{Entity}: (
    request: Patch{Entity}RequestDto,
    id: string,
    options?: RequestInit
  ) => Promise<{Action}{Entity}ResponseDto>;

  // 삭제
  delete{Entity}: (
    request: Delete{Entity}RequestDto,
    options?: RequestInit
  ) => Promise<unknown>;
}
```

**규칙:**
- 필요한 메서드만 선언 (없는 기능은 제외)
- `options?: RequestInit` 는 SSR prefetch에서 헤더 주입을 위해 항상 포함
- 반환 타입은 `Promise<T>` 형태로 명시

---

### `services/{Entity}RepositoryImpl.ts`

```typescript
import { httpAdaptor } from '@/shared/lib/https/HttpAdapter';
import { {Entity}Repository } from '../models/repository';
import {
  Get{Entity}sRequestDto,
  Get{Entity}sResponseDto,
  Create{Entity}RequestDto,
  {Action}{Entity}ResponseDto,
} from '../models/dtos';

class {Entity}RepositoryImpl implements {Entity}Repository {
  constructor(private readonly httpAdaptor: typeof httpAdaptor) {}

  // ── GET 목록 ──────────────────────────────────────────
  public get{Entity}s = async (
    request: Get{Entity}sRequestDto,
    options?: RequestInit
  ): Promise<Get{Entity}sResponseDto> => {
    // 쿼리스트링 직접 조합 (URLSearchParams 미사용 — 기존 패턴 유지)
    let url = `back-office/{endpoint}?`;
    if (request.periodType) url += `periodType=${request.periodType}&`;
    if (request.baseDate)   url += `baseDate=${request.baseDate}&`;
    url += `page=${request.page}&size=${request.size}`;

    const response = await this.httpAdaptor.get<Get{Entity}sResponseDto>(url, {
      credentials: 'include',
      ...options,
    });
    return response.data;
  };

  // ── POST 생성 ──────────────────────────────────────────
  public create{Entity} = async (
    request: Create{Entity}RequestDto,
    options?: RequestInit
  ): Promise<{Action}{Entity}ResponseDto> => {
    const response = await this.httpAdaptor.post<{Action}{Entity}ResponseDto>(
      `back-office/{endpoint}`,
      request,
      {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options,
      }
    );
    return response.data;
  };

  // ── PATCH 수정 ──────────────────────────────────────────
  public patch{Entity} = async (
    request: Patch{Entity}RequestDto,
    id: string,
    options?: RequestInit
  ): Promise<{Action}{Entity}ResponseDto> => {
    const response = await this.httpAdaptor.patch<{Action}{Entity}ResponseDto>(
      `back-office/{endpoint}/${id}`,
      request,
      {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options,
      }
    );
    return response.data;
  };

  // ── DELETE ──────────────────────────────────────────────
  public delete{Entity} = async (
    request: Delete{Entity}RequestDto,
    options?: RequestInit
  ): Promise<unknown> => {
    const response = await this.httpAdaptor.delete<unknown>(
      `back-office/{endpoint}/${request.id}`,
      {
        credentials: 'include',
        ...options,
      }
    );
    return response.data;
  };
}

// 싱글톤 export
export const {entity}Repository = new {Entity}RepositoryImpl(httpAdaptor);
```

**규칙:**
- 클래스는 `private`으로 정의하고 싱글톤 인스턴스만 `export`
- `Object.freeze()` 는 불변 보장이 필요한 경우에만 추가
- GET 목록은 쿼리스트링 직접 조합 (기존 프로젝트 패턴)
- 모든 HTTP 옵션에 `credentials: 'include'` 포함
- `...options` spread로 SSR 헤더 주입 허용
- `response.data` 로 실제 데이터만 반환

---

### `models/behaviors/{Entity}Behavior.ts`

```typescript
import { {Entity}Status, {Entity}Grade } from '../enums';

class {Entity}Behavior {
  // enum → 한국어 표시 텍스트 변환
  mapStatusToLabel(status: {Entity}Status): string {
    const map: Record<{Entity}Status, string> = {
      [{Entity}Status.ACTIVE]: '활성',
      [{Entity}Status.INACTIVE]: '비활성',
    };
    return map[status] ?? '알 수 없음';
  }

  // 타입 가드 (폴리모픽 detail 구조 구분 시)
  isTypeA(detail: unknown): detail is TypeADetail {
    return typeof detail === 'object' && detail !== null && 'typeAField' in detail;
  }

  isTypeB(detail: unknown): detail is TypeBDetail {
    return typeof detail === 'object' && detail !== null && 'typeBField' in detail;
  }
}

// 싱글톤 export — 불변 보장
export const {entity}Behavior = Object.freeze(new {Entity}Behavior());
```

**규칙:**
- Behavior 클래스는 HTTP 호출, Repository 의존 없이 순수 변환/판별 로직만
- 싱글톤은 `Object.freeze()` 로 내보낸다
- enum-to-label 맵은 `Record<EnumType, string>` 형태로 완전 커버

---

## 네이밍 치환 규칙

| 플레이스홀더 | 의미 | 예시 |
|---|---|---|
| `{Entity}` | PascalCase 엔티티명 | `FreeTrialUser` |
| `{entity}` | camelCase 엔티티명 | `freeTrialUser` |
| `{entity-name}` | kebab-case 디렉토리명 | `free-trial-user` |
| `{entities}` | camelCase 복수형 | `freeTrialUsers` |
| `{Action}` | 동작 PascalCase | `Create`, `Patch`, `Delete`, `Get` |
| `{endpoint}` | API URL 경로 세그먼트 | `free-trial-users` |

**DTO 네이밍 패턴:**

| 상황 | 이름 | 예시 |
|------|------|------|
| POST 요청 본문 | `Create{Entity}RequestDto` | `CreateFreeTrialUserRequestDto` |
| PATCH 요청 본문 | `Patch{Entity}RequestDto` | `PatchFreeTrialUserRequestDto` |
| DELETE 요청 | `Delete{Entity}RequestDto` | `DeleteFreeTrialUserRequestDto` |
| GET 목록 쿼리 | `Get{Entity}sRequestDto` | `GetFreeTrialUsersRequestDto` |
| GET 단건 쿼리 | `Get{Entity}RequestDto` | `GetFreeTrialUserRequestDto` |
| 단건 응답 | `{Entity}Dto` | `FreeTrialUserDto` |
| 페이지 응답 | `Page{Entity}ResponseDto` | `PageFreeTrialUserResponseDto` |
| 목록 API 래퍼 | `Get{Entity}sResponseDto` | `GetFreeTrialUsersResponseDto` |
| 생성/수정 응답 | `{Action}{Entity}ResponseDto` | `CreateFreeTrialUserResponseDto` |

---

## 공통 참조

### 페이지네이션 구조 (`@/entities/common/dtos`)

```typescript
// 모든 목록 응답의 Page* DTO에서 사용
import { PageableObject, SortObject } from '@/entities/common/dtos';
```

### 공통 Enum (`@/entities/common/enums`)

```typescript
import { PeriodType } from '@/entities/common/enums';
// PeriodType.DAY | PeriodType.WEEK | PeriodType.MONTH
```

### HttpAdaptor (`@/shared/lib/https/HttpAdapter`)

```typescript
import { httpAdaptor } from '@/shared/lib/https/HttpAdapter';
// httpAdaptor.get<T>(url, options?)
// httpAdaptor.post<T>(url, data?, options?)
// httpAdaptor.patch<T>(url, data, options?)
// httpAdaptor.delete<T>(url, options?)
// → 모두 Promise<{ data: T }> 반환 → .data 로 꺼냄
```

---

## Import 레이어 규칙

```
shared  ←  entities  ←  features  ←  widgets  ←  views
```

- entities는 `shared`만 import 가능
- entities 내 다른 entity DTO 참조는 허용 (응답 중첩 구조용)
- entities에서 `features` 이상 레이어 import 금지

---

## 생성 전 확인 사항

1. **`common/dtos.ts`** — 페이지네이션 DTO 재사용 여부 확인
2. **`common/enums.ts`** — `PeriodType` 등 공통 enum 재사용 여부 확인
3. **다른 entity DTO 참조** — 응답에 중첩 데이터가 있을 경우 해당 entity 먼저 생성
4. **API 엔드포인트** — `back-office/{endpoint}` 경로 확인
5. **Repository 필요 여부** — features에서 직접 호출하는지, 다른 entity의 DTO에서 참조만 하는지 판단
6. **Behavior 필요 여부** — UI에서 enum → 표시 텍스트 변환 또는 타입 가드가 필요한지 판단

---

description: FSD(Feature-Sliced Design)내 features rules

---


# FSD Feature Slice 생성 스킬

이 스킬은 `features/` 하위에 새로운 feature slice를 생성할 때 사용한다.
요청을 받으면 아래 절차를 따라 파일을 생성한다.

---

## Step 1. Feature 유형 판단

사용자의 요청에서 아래 유형을 파악한다.

| 유형 | 조건 | 예시 |
|------|------|------|
| **A. 단순 Mutation** | 단일 생성/삭제/수정, 폼 없음 | "삭제 버튼", "상태 변경" |
| **B. 목록 조회** | 리스트/테이블 데이터 읽기 | "목록 조회", "필터 검색" |
| **C. 폼 등록/수정** | 입력 폼 + 제출, 상태 관리 필요 | "등록 다이얼로그", "수정 폼" |
| **D. 복합** | 위 유형 혼합 | "등록 + 목록" |

유형이 결정되면 아래 해당 섹션의 파일 목록대로 생성한다.

---

## Step 2. Feature 디렉토리명 결정

- 형식: `kebab-case`
- 단일 작업(삭제·수정·등록): **단수형** → `delete-user`, `edit-product`
- 목록 조회: **복수형** → `users`, `products`
- 경로: `features/{feature-name}/`

---

## Step 3. 유형별 생성 파일 목록

### A. 단순 Mutation

```
{feature}/
├── config/
│   └── query-keys.ts
├── services/query/
│   └── use{Action}{Entity}.ts
└── ui/
    └── {Action}{Entity}Button.tsx   ← 버튼이 아닌 경우 적절히 변경
```

### B. 목록 조회

```
{feature}/
├── config/
│   └── query-keys.ts
└── services/
    ├── prefetch/
    │   └── prefetch{Entity}s.ts
    └── query/
        └── useFilter{Entity}s.ts
```

### C. 폼 등록/수정

```
{feature}/
├── config/
│   ├── query-keys.ts
│   ├── schema.ts
│   └── const.ts                     ← 상수가 있을 경우
├── model/
│   ├── interface.ts
│   ├── converter/
│   │   └── {entity}Converter.ts
│   └── store/
│       ├── interface.ts
│       └── index.ts
├── services/query/
│   └── use{Action}{Entity}.ts
└── ui/
    ├── {Feature}Dialog.tsx
    └── SchemaSectionLayout.tsx      ← 섹션이 여러 개일 경우
```

### D. 복합 (B + C)

A·B·C를 조합한다. query-keys.ts는 하나로 통합한다.

---

## Step 4. 각 파일 생성 규칙

### `config/query-keys.ts`

```typescript
import { createQueryKeyStore } from '@lukemorales/query-key-factory';
// 필요한 DTO import

// --- Mutation 전용 (목록 없을 때) ---
export const {Feature}QueryKeys = createQueryKeyStore({
  {action}: null,
});

// --- 목록 조회 포함 (dynamic params) ---
export const {Feature}QueryKeys = createQueryKeyStore({
  {entity}_list: {
    queryKey: ['{entity}_list'],
    lists: (params: Get{Entity}RequestDto) => ({
      queryKey: [params.page, params.size, /* 필터 필드 나열 */],
    }),
  },
  // mutation이 있을 경우 추가
  {action}: null,
});
```

**규칙:**
- key 이름은 snake_case
- 목록은 항상 `.lists(params)` 형태로 dynamic key 생성
- 같은 feature의 mutation/query는 하나의 store에 통합

---

### `config/schema.ts`

```typescript
import { z } from 'zod';
import { {Entity}Grade } from '@/entities/{entity}/models/enums'; // enum 있을 때

// 1. 폼 입력용 — nullable 허용, 사용자가 아직 입력 안 한 상태 표현
export const {Feature}FormSchema = z.object({
  fieldA: z.string().nullable(),
  fieldB: z.nativeEnum({Entity}Grade).nullable(),
  fieldC: z.array(z.string()).nullable(),
});
export type {Feature}Form = z.infer<typeof {Feature}FormSchema>;

// 2. API 전송용 — non-null strict, 제출 직전 검증
export const {Feature}RequestSchema = z.object({
  fieldA: z.string().min(1, { message: '필수 항목입니다.' }),
  fieldB: z.nativeEnum({Entity}Grade),
  fieldC: z.array(z.string()).min(1),
});
export type {Feature}Request = z.infer<typeof {Feature}RequestSchema>;

// 3. 실시간 검증용 — refine으로 복합 조건 처리 (선택)
export const {Feature}ValidableSchema = {Feature}RequestSchema.refine(
  (data) => /* 복합 조건 */,
  { message: '조건을 확인해주세요.', path: ['fieldName'] }
);
```

**규칙:**
- 폼 스키마는 nullable, 요청 스키마는 strict
- enum 필드는 `z.nativeEnum()` 사용
- 배열 필드는 `.min(1)` 로 최소 1개 보장

---

### `config/const.ts`

```typescript
// feature 내부에서만 쓰는 상수
export const {FEATURE}_DEFAULT_PAGE_SIZE = 20;

export const {FEATURE}_INITIAL_FILTER = {
  page: 0,
  size: {FEATURE}_DEFAULT_PAGE_SIZE,
} as const;
```

---

### `model/interface.ts`

```typescript
import { {Feature}Form } from '../config/schema';

// UI 컴포넌트 Props
export interface {Feature}DialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// 필요한 경우 추가 타입 정의
export interface {Feature}TableRow {
  id: string;
  // ...
}
```

---

### `model/store/interface.ts`

```typescript
import { {Feature}Form } from '../../config/schema';

export interface {Feature}State {
  // --- State ---
  form: {Feature}Form;
  // 다단계 폼일 경우: currentStep: {Feature}Step;

  // --- Actions ---
  setForm: (form: {Feature}Form) => void;
  setField: <K extends keyof {Feature}Form>(key: K, value: {Feature}Form[K]) => void;
  resetForm: () => void;
}
```

---

### `model/store/index.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { {Feature}State } from './interface';
import { {Feature}Form } from '../../config/schema';

const initialForm: {Feature}Form = {
  fieldA: null,
  fieldB: null,
};

export const use{Feature}Store = create<{Feature}State>()(
  devtools(
    (set) => ({
      form: initialForm,

      setForm: (form) =>
        set({ form }, undefined, '{Feature}/setForm'),

      setField: (key, value) =>
        set((state) => ({ form: { ...state.form, [key]: value } }), undefined, '{Feature}/setField'),

      resetForm: () =>
        set({ form: initialForm }, undefined, '{Feature}/resetForm'),
    }),
    { name: '{Feature}Store' }
  )
);
```

**규칙:**
- devtools 두 번째 인자 `{ name: '{Feature}Store' }` 항상 포함
- 모든 set 액션에 `'{Feature}/actionName'` 레이블 부여
- 초기값은 상단에 `const initialForm`으로 분리

---

### `model/converter/{entity}Converter.ts`

```typescript
import { {Feature}Form } from '../../config/schema';
import { {Action}{Entity}RequestDto } from '@/entities/{entity}/models/dtos';
import { Get{Entity}ResponseDto } from '@/entities/{entity}/models/dtos';

// Form → Request DTO (제출 시)
export const {feature}FormToRequestDto = (form: {Feature}Form): {Action}{Entity}RequestDto => ({
  fieldA: form.fieldA!,
  fieldB: form.fieldB!,
});

// Response DTO → Form (수정 폼 초기값 세팅 시)
export const {entity}ResponseToForm = (response: Get{Entity}ResponseDto): {Feature}Form => ({
  fieldA: response.fieldA,
  fieldB: response.fieldB,
});
```

---

### `services/query/use{Action}{Entity}.ts` — Mutation

```typescript
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wrapperSentry } from '@/shared/lib/errors/wrapperSentry';
import { parsingErrorCapture } from '@/shared/lib/errors/parsingErrorCapture';
import { SENTRY_OP_GUIDE } from '@/shared/lib/errors/const';
import { httpAdaptor } from '@/shared/lib/https/HttpAdapter';
import { ServerCustomError, UnknownError } from '@/shared/lib/errors/customError';
import { {Feature}QueryKeys } from '../config/query-keys';
// 목록 무효화가 필요할 때
import { {ListFeature}QueryKeys } from '@/features/{list-feature}/config/query-keys';

interface Use{Action}{Entity}Props {
  onSuccessCallback?: () => void;
  onErrorCallback?: (error: ServerCustomError | UnknownError) => void;
}

export const use{Action}{Entity} = ({
  onSuccessCallback,
  onErrorCallback,
}: Use{Action}{Entity}Props) => {
  const queryClient = useQueryClient();

  const { mutate: {action}{Entity}, isPending, error } = useMutation({
    ...{Feature}QueryKeys.{action},
    mutationFn: (data: {Action}{Entity}RequestDto) =>
      wrapperSentry(
        async () => {
          try {
            // POST: httpAdaptor.post(`api/{endpoint}`, data, { credentials: 'include' }, true)
            // DELETE: httpAdaptor.delete(`api/{endpoint}/${data.id}`, { credentials: 'include' }, true)
            // PATCH: httpAdaptor.patch(`api/{endpoint}/${data.id}`, data, { credentials: 'include' }, true)
            const response = await httpAdaptor.post(`api/{endpoint}`, data, {
              credentials: 'include',
            }, true);
            return response;
          } catch (error) {
            const customError = parsingErrorCapture.capture(error);
            throw customError;
          }
        },
        'use{Action}{Entity}',
        SENTRY_OP_GUIDE.QUERY_MUTATION
      ),
    meta: { skipCapture: true },
    onSuccess: () => {
      // 관련 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: {ListFeature}QueryKeys.{entity}_list.queryKey,
      });
      onSuccessCallback?.();
    },
    onError: (error) => onErrorCallback?.(error as ServerCustomError | UnknownError),
  });

  return { {action}{Entity}, isPending, error };
};
```

**규칙:**
- `'use client'` 필수
- `meta: { skipCapture: true }` 항상 포함 (Sentry 이중 캡처 방지)
- `credentials: 'include'` 항상 포함 (쿠키 인증)
- 반환값: `{ {action}{Entity}, isPending, error }` 구조 유지
- mutation 성공 시 연관 list query 반드시 `invalidateQueries`

---

### `services/query/useFilter{Entity}s.ts` — Query

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useSuspenseLikeQuery } from '@/shared/lib/https/useSuspenseLikeQuery';
import { wrapperSentry } from '@/shared/lib/errors/wrapperSentry';
import { SENTRY_OP_GUIDE } from '@/shared/lib/errors/const';
import { ServerCustomError, UnknownError } from '@/shared/lib/errors/customError';
import { {entity}Repository } from '@/entities/{entity}/services/{Entity}RepositoryImpl';
import { Get{Entity}sRequestDto, Get{Entity}sResponseDto } from '@/entities/{entity}/models/dtos';
import { {Feature}QueryKeys } from '../config/query-keys';

export const useFilter{Entity}s = (filter: Get{Entity}sRequestDto) => {
  const queryClient = useQueryClient();

  const data = useSuspenseLikeQuery<Get{Entity}sResponseDto, ServerCustomError | UnknownError>({
    ...{Feature}QueryKeys.{entity}_list.lists(filter),
    queryFn: () =>
      wrapperSentry(
        async () => {entity}Repository.get{Entity}s(filter),
        'useFilter{Entity}s',
        SENTRY_OP_GUIDE.QUERY
      ),
    retry: false,
    throwOnError: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialData: queryClient.getQueryData(
      {Feature}QueryKeys.{entity}_list.lists(filter).queryKey
    ),
  });

  return data;
};
```

**규칙:**
- `useSuspenseLikeQuery` 사용 (Suspense boundary와 함께 동작)
- `initialData`로 prefetch 데이터 재사용 필수
- `retry: false`, `refetchOn*: false` 기본값 유지

---

### `services/prefetch/prefetch{Entity}s.ts`

```typescript
import { {entity}Repository } from '@/entities/{entity}/services/{Entity}RepositoryImpl';
import { parsingErrorCapture } from '@/shared/lib/errors/parsingErrorCapture';
import { Get{Entity}sRequestDto } from '@/entities/{entity}/models/dtos';

const initialFilter: Get{Entity}sRequestDto = {
  page: 0,
  size: 20,
  // 기본 필터값
};

export const prefetch{Entity}s = async (session: string) => {
  const options = {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `SESSION=${session}`,
    },
  };

  try {
    return await {entity}Repository.get{Entity}s(initialFilter, options);
  } catch (error) {
    const customError = parsingErrorCapture.capture(error);
    throw customError;
  }
};
```

---

### `ui/{Feature}Dialog.tsx` — 폼 다이얼로그

```typescript
'use client';
import { toast } from 'sonner';
import { alertError } from '@/shared/lib/errors/alertError';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { use{Feature}Store } from '../model/store';
import { use{Action}{Entity} } from '../services/query/use{Action}{Entity}';
import { {feature}FormToRequestDto } from '../model/converter/{entity}Converter';

export const {Feature}Dialog = () => {
  const { form, resetForm } = use{Feature}Store();

  const { {action}{Entity}, isPending } = use{Action}{Entity}({
    onSuccessCallback: () => {
      toast.success('완료되었습니다.');
      resetForm();
    },
    onErrorCallback: (error) => alertError(error),
  });

  const handleSubmit = () => {
    {action}{Entity}({feature}FormToRequestDto(form));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{/* 트리거 텍스트 */}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{/* 제목 */}</DialogTitle>
        </DialogHeader>
        {/* 폼 내용 */}
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? '처리 중...' : '확인'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
```

### `ui/{Action}{Entity}Button.tsx` — 단순 액션 버튼

```typescript
'use client';
import { toast } from 'sonner';
import { alertError } from '@/shared/lib/errors/alertError';
import { Button } from '@/shared/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { use{Action}{Entity} } from '../services/query/use{Action}{Entity}';

interface {Action}{Entity}ButtonProps {
  {entity}Id: string;
}

export const {Action}{Entity}Button = ({ {entity}Id }: {Action}{Entity}ButtonProps) => {
  const { {action}{Entity}, isPending } = use{Action}{Entity}({
    onSuccessCallback: () => toast.success('완료되었습니다.'),
    onErrorCallback: (error) => alertError(error),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>삭제</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={() => {action}{Entity}({ id: {entity}Id })}>
            확인
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

---

## 네이밍 치환 규칙

파일·코드 생성 시 아래 플레이스홀더를 실제 이름으로 치환한다.

| 플레이스홀더 | 의미 | 예시 |
|---|---|---|
| `{Feature}` | PascalCase feature 이름 | `RegisterUser` |
| `{feature}` | camelCase feature 이름 | `registerUser` |
| `{feature-name}` | kebab-case 디렉토리명 | `register-user` |
| `{Entity}` | PascalCase 엔티티 | `User` |
| `{entity}` | camelCase 엔티티 | `user` |
| `{Action}` | PascalCase 동작 | `Post`, `Delete`, `Patch` |
| `{action}` | camelCase 동작 | `post`, `delete`, `patch` |
| `{endpoint}` | API 경로 | `users`, `free-trial-users` |

**HTTP 메서드 → Action 이름 매핑:**

| HTTP | Action 접두사 | 예시 훅 이름 |
|------|-------------|------------|
| POST (생성) | `Post` | `usePostUser` |
| DELETE | `Delete` | `useDeleteUser` |
| PATCH (수정) | `Patch` | `usePatchUser` |
| GET (단건) | `Get` | `useGetUser` |
| GET (목록) | `Filter` | `useFilterUsers` |

---

## Import 레이어 규칙

```
shared  ←  entities  ←  features  ←  widgets  ←  views
```

- features는 `shared`, `entities`만 import 가능
- 같은 features 레이어에서 다른 feature의 `config/query-keys.ts`는 import 가능 (쿼리 무효화 목적)
- features에서 `widgets`, `views` import 금지

---

## 생성 전 확인 사항

1. `src/entities/{entity}/` 가 이미 존재하는지 확인 → 없으면 entities 레이어도 함께 생성 필요
2. API endpoint 경로 확인 (`api/...` or `api/proxy/...`)
3. 목록 조회 feature라면 SSR prefetch 사용 여부 확인
4. 기존 feature에서 query 무효화가 필요한지 확인 (어떤 list query를 invalidate할지)

---

description: FSD(Feature-Sliced Design)내 shared rules

---


# FSD Shared Layer 구현 스킬

`src/shared/`는 모든 레이어에서 import 가능한 공통 자원이다.
이 스킬은 shared에 새 자원을 추가하거나, 다른 레이어에서 shared를 올바르게 사용할 때 따른다.

---

## Step 1. 추가 위치 판단

새 자원이 어디에 속하는지 판단한다.

| 추가 위치 | 조건 |
|-----------|------|
| `components/atomics/` | 외부 UI 라이브러리(shadcn, Radix 등)를 래핑하는 기본 컴포넌트 |
| `components/ui/` | atomics 위에 앱 공통 스타일·애니메이션을 얹은 고수준 컴포넌트 |
| `components/{name}/` | 특정 목적의 독립 컴포넌트 (date-picker, async-boundary 등) |
| `hooks/` | 2개 이상의 레이어에서 재사용되는 커스텀 훅 |
| `lib/{domain}/` | HTTP, 에러 처리, 날짜, 외부 라이브러리 설정 등 인프라 |
| `utils/` | 순수 함수 유틸리티 (포맷, 변환 등) |

**추가하지 말아야 할 것:**
- 특정 feature나 entity에만 쓰이는 것 → 해당 레이어에 작성
- 비즈니스 로직이 포함된 것 → features 레이어에 작성

---

## Step 2. 유형별 생성 규칙

### A. `components/atomics/` — 기본 UI 컴포넌트

외부 라이브러리 컴포넌트를 프로젝트에서 제어 가능하도록 래핑한다.

```typescript
// src/shared/components/atomics/{component-name}.tsx
'use client';
import * as {LibPrimitive} from '{external-library}';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

// CVA로 variant 정의
const {component}Variants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-classes',
        destructive: 'destructive-classes',
      },
      size: {
        sm: 'sm-classes',
        md: 'md-classes',
        lg: 'lg-classes',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface {Component}Props
  extends React.ComponentPropsWithoutRef<typeof {LibPrimitive}.Root>,
    VariantProps<typeof {component}Variants> {
  className?: string;
}

const {Component} = React.forwardRef<
  React.ElementRef<typeof {LibPrimitive}.Root>,
  {Component}Props
>(({ className, variant, size, ...props }, ref) => (
  <{LibPrimitive}.Root
    ref={ref}
    className={cn({component}Variants({ variant, size }), className)}
    {...props}
  />
));
{Component}.displayName = '{LibPrimitive}.Root';

export { {Component}, {component}Variants };
```

**규칙:**
- `forwardRef` 사용으로 ref 전달 지원
- `data-slot` attribute로 합성 컴포넌트 식별 가능하게 설정
- CVA로 variant 시스템 구축
- `className` prop 항상 지원 (`cn()` 으로 병합)

---

### B. `components/ui/` — 고수준 공통 컴포넌트

atomics에 앱 공통 스타일, 상태(로딩, 에러), 애니메이션을 추가한 컴포넌트.

```typescript
// src/shared/components/ui/views/{Component}.tsx
'use client';
import { motion } from 'framer-motion';
import { Base{Component} } from '@/shared/components/atomics/{component}';
import { cn } from '@/shared/lib/utils';

interface {Component}Props extends React.ComponentPropsWithoutRef<typeof Base{Component}> {
  isLoading?: boolean;
}

export const {Component} = ({ isLoading, children, className, ...props }: {Component}Props) => {
  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Base{Component}
        className={cn('app-common-styles', className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? <LoadingSpinner /> : children}
      </Base{Component}>
    </motion.div>
  );
};
```

**규칙:**
- atomics를 import해서 확장, 외부 라이브러리 직접 사용 금지
- `src/shared/components/ui/index.ts` barrel에 export 추가

```typescript
// src/shared/components/ui/index.ts 에 추가
export { {Component} } from './views/{Component}';
```

---

### C. `components/{name}/` — 독립 목적 컴포넌트

단일 목적을 가진 복합 컴포넌트. 인터페이스 파일과 함께 작성한다.

```
components/{component-name}/
├── interface.ts          # Props 타입 정의
└── {Component}.tsx       # 컴포넌트 구현
```

```typescript
// interface.ts
export interface {Component}Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// {Component}.tsx
'use client';
import { {Component}Props } from './interface';

export const {Component} = ({ value, onChange, placeholder }: {Component}Props) => {
  // 구현
};
```

---

### D. `hooks/` — 재사용 커스텀 훅

2개 이상의 feature/view에서 쓰이는 훅만 작성한다.

```typescript
// src/shared/hooks/use{HookName}.ts
'use client';
import { useState, useCallback } from 'react';

interface Use{HookName}Options {
  // 옵션
}

interface Use{HookName}Return {
  // 반환값 타입
}

export const use{HookName} = (options: Use{HookName}Options): Use{HookName}Return => {
  // 구현
  return { /* ... */ };
};
```

**규칙:**
- 훅 파일명: `use{HookName}.ts` (camelCase)
- 비즈니스 로직 포함 금지 — 범용 로직만
- entities/features import 금지

---

### E. `lib/{domain}/` — 인프라 라이브러리

외부 서비스(HTTP, 에러 추적, 날짜 등) 연동 코드.

```
lib/{domain}/
├── index.ts or {Main}.ts   # 핵심 구현 및 싱글톤 export
├── interface.ts             # 타입/인터페이스 정의
└── config.ts                # 설정값·상수
```

```typescript
// lib/{domain}/{Domain}.ts
class {Domain}Client {
  constructor(private config: {Domain}Config) {}

  public doSomething = async <T>(params: SomeParams): Promise<T> => {
    // 구현
  };
}

// 싱글톤 export
export const {domain}Client = new {Domain}Client(defaultConfig);
```

---

### F. `utils/` — 순수 함수 유틸리티

부수 효과 없는 순수 변환·포맷 함수.

```typescript
// src/shared/utils/{domain}.ts

// 타입을 명확히 지정
export const format{Thing} = (input: InputType): OutputType => {
  // 순수 변환 로직
};

export const parse{Thing} = (input: string): ParsedType => {
  // 파싱 로직
};
```

**규칙:**
- React, 외부 라이브러리 의존 없이 순수 TypeScript만 사용
- 각 함수는 단일 책임

---

## Step 3. 공통 작성 원칙

### Import 방향 (엄격 준수)

```
shared 내부에서 import 가능한 것:
  ✅ shared 내 다른 파일 (하위 디렉토리 포함)
  ✅ 외부 npm 패키지
  ❌ entities, features, widgets, views, app — 절대 금지
```

### 파일명 규칙

| 위치 | 규칙 | 예시 |
|------|------|------|
| `components/` | PascalCase | `DatePicker.tsx`, `AsyncBoundary.tsx` |
| `hooks/` | camelCase, `use` 접두사 | `useSuspenseLikeQuery.ts` |
| `lib/` | PascalCase (클래스) or camelCase (유틸) | `HttpAdapter.ts`, `config.ts` |
| `utils/` | camelCase | `format.ts` |

### Barrel Export

`components/ui/` 는 `index.ts`로 묶어서 export.
그 외는 직접 경로로 import.

```typescript
// ✅ components/ui
import { Button, Input } from '@/shared/components/ui';

// ✅ 그 외 직접 경로
import { cn } from '@/shared/lib/utils';
import { httpAdaptor } from '@/shared/lib/https/HttpAdapter';
import { AsyncBoundary } from '@/shared/components/async-boundary/AsyncBoundary';
```

---

## Step 4. 자주 쓰는 패턴 참조

### Tailwind 클래스 병합

```typescript
import { cn } from '@/shared/lib/utils';
// clsx + tailwind-merge: 조건부 클래스·중복 클래스 자동 처리
cn('px-4 py-2', isActive && 'bg-primary', className)
```

### CVA (Class Variance Authority) 스타일 variant

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const variants = cva('base', {
  variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
  defaultVariants: { size: 'sm' },
});

// 컴포넌트 Props에 variant 타입 포함
interface Props extends VariantProps<typeof variants> {
  className?: string;
}
```

### 에러 처리 3단 계층

```typescript
// 1. Repository/Query 훅 내부 — 에러 파싱
import { parsingErrorCapture } from '@/shared/lib/errors/parsingErrorCapture';
const err = parsingErrorCapture.capture(unknownError); // → ServerCustomError | UnknownError

// 2. Query 훅 — Sentry 추적
import { wrapperSentry } from '@/shared/lib/errors/wrapperSentry';
import { SENTRY_OP_GUIDE } from '@/shared/lib/errors/config';
await wrapperSentry(async () => { /* ... */ }, 'spanName', SENTRY_OP_GUIDE.QUERY_MUTATION);

// 3. UI 컴포넌트 — 토스트 표시
import { alertError } from '@/shared/lib/errors/queryOnErrorCallback';
onErrorCallback: (error) => alertError(error);
```

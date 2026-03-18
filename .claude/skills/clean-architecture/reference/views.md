---
description: FSD(Feature-Sliced Design)내 pages(views) rules
---

# Pages Layer or Views Layer

### Pages? (`src/pages/[page-name]/`)

페이지 단위 비즈니스 로직과 UI 컴포넌트를 포함하는 최상위 레이어입니다.

```
pages/[page-name]/
├── config/               # 페이지 레벨 상수 (선택적)
│   └── const.ts
├── models/               # 페이지 레벨 상태 및 타입
│   ├── interface.ts      # Props/Callback 인터페이스 정의
│   ├── formSchema.ts     # Form validation schema (선택적)
│   ├── converters/       # 데이터 변환 로직
│   │   ├── BaseStrategy.ts # (필요하다면) 전략 패턴
│   │   ├── StrategyA.ts # (필요하다면)
│   │   ├── StrategyB.ts # (필요하다면)
│   │   └── ConverterRegistry.ts # (필요하다면) registry
│   └── stores/           # Zustand 상태 관리 (선택적)
│       ├── index.ts      # Store 정의
│       └── interface.ts  # Store 타입
├── services/             # 비즈니스 로직 및 데이터 페칭
│   ├── query/            # TanStack Query hooks
│   ├── service/          # 도메인 로직 (선택적)
│   └── _mocks/           # Mock 데이터 (테스트용, 선택적)
└── ui/                   # React 컴포넌트
    ├── IndexPage.tsx     # 메인 페이지 또는 Index.tsx
    └── [section-name]/   # 섹션별 컴포넌트
        ├── index.tsx
        ├── Component.tsx
        └── Component.stories.ts
```

- 만일 next.js 내에서 작업이라면 pages -> views 로 변경합니다.

**Widget vs Page 구분**:

- **Widget**: 여러 페이지에서 재사용 가능한 복합 컴포넌트 (search-students, navigation)
- **Page**: 특정 라우트에 종속된 페이지 컴포넌트


### Simplified Page Pattern

**목적**: 간단한 페이지 작성시의 패턴으로 몇가지 layer 및 slice 를 생략합니다.

**구조**:

```
pages/simple-page/
├── config/              # 상수 정의
│   └── const.ts
├── models/              # 타입 및 Converter
│   ├── interface.ts
│   └── converters/
│       └── DataConverter.ts
├── services/            # Query hooks와 Service만
│   ├── query/
│   │   └── useSyncData.ts
│   └── service/
│       └── SimpleService.ts
└── ui/                  # UI 컴포넌트
    ├── IndexPage.tsx
    └── section/
        └── Component.tsx
```

**Query Hook**:

```typescript
// services/query/useSyncData.ts
import { useMemo } from "react";
import { container } from "tsyringe";
import { useQueryData } from "@/features/[feature]/services/query/useQueryData";
import { DataConverter } from "@/pages/simple-page/models/converters/DataConverter";

export const useSyncData = () => {
    const converter = container.resolve(DataConverter);

    const { data, isPending, error } = useQueryData();

    const convertedData = useMemo(() => {
        if (!data) return [];
        return data.map((dto) => converter.convert(dto));
    }, [data, converter]);

    return {
        convertedData,
        isPending,
        error,
    };
};
```

**특징**:

- 단순한 데이터 페칭 및 변환만 필요한 경우
- Config 폴더로 상수 분리
---
description: FSD(Feature-Sliced Design)내 widgets rules

---

### Widgets Layer (`src/widgets/[widget-name]/`)

재사용 가능한 복합 컴포넌트 (Pages에서 사용)

```
widgets/[widget-name]/
├── config/               # Widget 상수
│   └── const.ts
├── models/               # Widget 레벨 타입 및 변환
│   ├── interface.ts
│   ├── converters/       # Strategy 패턴 Converters (필요하다면)
│   │   ├── BaseStrategy.ts
│   │   ├── StrategyA.ts
│   │   ├── StrategyB.ts
│   │   └── ConverterRegistry.ts
│   └── store/            # Widget 상태 (context store)
│       ├── interface.ts
│       └── [widget]-context.ts
├── services/             # Widget 비즈니스 로직
│   └── query/            # TanStack Query hooks
│       ├── useSyncDataA.ts
│       └── useSyncDataB.ts
└── ui/                   # Widget UI 컴포넌트
    ├── Component.tsx
    ├── Section.tsx
    └── popup/            # 하위 섹션
        └── index.tsx
```

**Widget vs Page 구분**:

- **Widget**: 여러 페이지에서 재사용 가능한 복합 컴포넌트 (search-students, navigation)
- **Page**: 특정 라우트에 종속된 페이지 컴포넌트
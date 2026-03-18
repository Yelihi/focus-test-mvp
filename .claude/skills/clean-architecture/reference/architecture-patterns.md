---

description: FSD 내 각 layer 내부 slice 를 구현하기에 앞서 해당 패턴 및 규칙을 반드시 숙지합니다.

---

## 2. Architecture Patterns

### 1. Query Hook Pattern (services/query/)

**목적**: TanStack Query를 활용한 서버 상태 관리

**구조**:

```typescript
// services/query/useSyncData.ts
import { useMemo } from "react";
import { useInfiniteQueriesData } from "@/features/[feature]/services/query/useInfiniteQueriesData";
import { converter } from "@/pages/[page]/models/converters/ConverterRegistry";

export const useSyncData = ({ selectedId, filters }: { selectedId: string | undefined; filters: FilterType }) => {
    const { infiniteData, isPending, error, isFetchingNextPage, fetchNextPage } =
        useInfiniteQueriesData({
            id: selectedId,
            filters,
        });

    const convertedData = useMemo(() => {
        if (!infiniteData) return [];

        return infiniteData.pages
            .flatMap((page) => page.items)
            .map((item) => converter.convert(item));
    }, [infiniteData]);

    return {
        convertedData,
        isPending,
        error,
        isFetchingNextPage,
        fetchNextPage,
    };
};
```

**특징**:

- 위 코드는 하나의 예시입니다.
- Features layer의 query hook 재사용
- Converter로 데이터 변환
- Infinite scroll 지원 (pages flat mapping)
- 에러 및 로딩 상태 반환

### 2. Entity Query Keys Pattern (entities/[entity]/infrastructure/)

**목적**: TanStack Query의 query key를 Entity layer에서 중앙 관리

**구조**:

```typescript
// entities/[entity]/infrastructure/query-keys.ts
import { createQueryKeys, mergeQueryKeys } from "@lukemorales/query-key-factory";

// 단일 Entity Query Keys
export const EntityDetailQueryKeys = createQueryKeys("entity_detail", {
    detail: (entityId: string | undefined) => [entityId],
    update: null,
});

// List/Infinite Query Keys
export const EntityListQueryKeys = createQueryKeys("entity_list", {
    lists: (params: RequestPayload) => [params.keyword, params.size, params.nextToken],
    infinite: (params: RequestPayload) => [params.keyword, params.size, params.orders],
});

// 여러 Query Keys 병합 (선택적)
export const EntityQueryKeys = mergeQueryKeys(EntityDetailQueryKeys, EntityListQueryKeys);
```

**Features Layer에서 사용**:

```typescript
// features/[feature]/services/query/useQueryEntity.ts
import { useQuery } from "@tanstack/react-query";
import { EntityQueryKeys } from "@/entities/[entity]/infrastructure/query-keys";

export const useQueryEntity = (entityId: string | undefined) => {
    const { data, isPending, error } = useQuery({
        ...EntityQueryKeys.detail(entityId),
        queryFn: async () => {
            // query implementation
        },
        enabled: !!entityId,
    });

    return { data, isPending, error };
};
```

**특징**:

- `@lukemorales/query-key-factory` 사용
- `createQueryKeys()`로 타입 안전한 query key 생성
- `mergeQueryKeys()`로 여러 query keys 통합
- 명시적 selector/원시값 입력으로 의존성 명확화
- Entity별 query key 네이밍 (`entity_detail`, `entity_list`)
- Spread operator로 query options 적용

### 3. Converter Pattern (models/converters/)

**목적**: Entity DTO를 UI Props로 변환

**구조**:

```typescript
// models/converters/DataConverter.ts
import { injectable, inject } from "tsyringe";
import type { IDateAdapter } from "@/shared/libs/date/interface";
import { DataDto } from "@/entities/[entity]/domain/dtos";
import type { DataItemProps } from "@/pages/[page]/models/interface";

export interface DataConverterStructure {
    convert: (dto: DataDto) => DataItemProps;
}

@injectable()
export class DataConverter implements DataConverterStructure {
    constructor(@inject("DateAdapter") private readonly dateAdapter: IDateAdapter) {}

    public convert = (dto: DataDto): DataItemProps => {
        return {
            id: dto.id,
            name: dto.name,
            createdAt: this.dateAdapter.formatRelativeDateIn24Hours(
                new Date(dto.createdAt),
                "Asia/Seoul",
            ),
        };
    };
}

// 혹은 inject 대신 함수로 대체해도 된다. dataAdapter 는 인자로 inject 하던지, 아니면 직접 참조한다. (왠만하면 inject 로 구조를 받아야 테스트가 쉬워짐)
import { DateAdapter } from "@/shared/libs/date/adapter";

const dateAdapter = new DateAdapter();

export const convertData = (dto: DataDto): DataItemProps => {
    return {
        id: dto.id,
        name: dto.name,
        createdAt: dateAdapter.formatRelativeDateIn24Hours(new Date(dto.createdAt), "Asia/Seoul"),
    };
}
```

**특징**:

- `@injectable()` 데코레이터로 DI 컨테이너 등록 혹은 함수형으로 진행
- Shared libs (DateAdapter 등) 주입 혹은 직접 참조 (다만 주입을 권장)
- Interface로 타입 안정성 보장
- Entity DTO → UI Props 변환 책임

### 4. Store Pattern (models/stores/)

**목적**: 페이지 레벨 클라이언트 상태 관리

**구조**:

```typescript
// models/stores/index.ts
import { create } from "zustand";
import type { StoreState } from "@/pages/[page]/models/stores/interface";

type PageStore = StoreState & {
    isFilterActive: boolean;
    setFilters: <K extends keyof StoreState["filters"]>(key: K, value: StoreState["filters"][K]) => void;
    setSelectedId: (value: StoreState["selectedId"]) => void;
    resetFilters: () => void;
};

export const usePageStore = create<PageStore>((set) => ({
    filters: {
        keyword: undefined,
        category: null,
    },
    selectedId: undefined,
    isFilterActive: false,
    setFilters: (key, value) =>
        set((state) => {
            const nextFilters = { ...state.filters, [key]: value };
            return { filters: nextFilters, isFilterActive: nextFilters.category !== null };
        }),
    setSelectedId: (value) => set({ selectedId: value }),
    resetFilters: () => set({ filters: { keyword: undefined, category: null }, isFilterActive: false }),
}));
```

**특징**:

- Zustand 단일 store + selector 기반 접근
- Type-safe setters (Generic key-value pair)
- Reset 함수로 초기화 로직 캡슐화
- Interface로 타입 정의 분리

### 5. UI Component Pattern (ui/)

**목적**: 재사용 가능하고 테스트 가능한 React 컴포넌트

**구조**:

```tsx
// ui/[section]/Component.tsx
import type { ComponentProps } from "@/pages/[page]/models/interface";

export const Component = ({ id, value, name, onAction }: ComponentProps) => {
    const handleAction = () => {
        onAction({ id, value });
    };

    return <div onClick={handleAction}>{name}</div>;
};
```

**특징**:

- Props/Callback 타입을 interface.ts에서 import
- TypeScript strict mode 준수
- Callback payload도 타입 정의 (구조화된 객체)
- Storybook stories 파일 동반

### 6. Form Pattern (TanStack Form) (services/)

**목적**: Form 상태 관리 및 검증 로직 캡슐화

**구조**:

```typescript
// services/useFormName.ts
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { FormSchema } from "@/pages/[page]/models/formSchema";
import { useMutationSubmit } from "@/features/[feature]/services/query/useMutationSubmit";

export const useFormName = () => {
    const [additionalState, setAdditionalState] = useState<boolean>(false);
    const { submitAction, isPending } = useMutationSubmit();

    const form = useForm({
        defaultValues: {
            field1: "",
            field2: "",
        },
        validators: {
            onMount: FormSchema,
            onChange: FormSchema,
        },
        onSubmit: async ({ value }) => {
            await submitAction({
                field1: value.field1,
                field2: value.field2,
                additional: additionalState,
            });
        },
    });

    const handleCustomAction = () => {
        // Custom business logic
    };

    return {
        form,
        isPending,
        additionalState,
        setAdditionalState,
        handleCustomAction,
    };
};
```


**컴포넌트 사용**:

```tsx
import { Input } from "@/shared/components/Input";
import { useFormName } from "@/pages/[page]/services/useFormName";
import { FieldInfo } from "@/shared/components/FieldInfo";

export const FormSection = () => {
    const { form } = useFormName();

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
            }}
        >
            <form.Field name="field1">
                {({ state, handleChange, handleBlur }) => (
                    <>
                <Input
                        value={String(state.value ?? "")}
                        onChange={(e) => handleChange(String(e.target.value))}
                        onBlur={handleBlur}
                />
                        {!!state.value && <FieldInfo state={state} />}
                    </>
                )}
            </form.Field>
        </form>
    );
};
```

**특징**:

- TanStack Form의 Field, Subscribe 컴포넌트 활용
- Zod schema로 validation (models/formSchema.ts)
- Features layer mutation hooks 재사용
- DI 컨테이너로 usecase 주입 가능
- 다만 form 이 너무 복잡하지 않다면 UI 내 form 을 구현할수도 있음 (권장까진 안함)

### 7. Service Pattern (Singleton Business Logic) (services/service/)

**목적**: 도메인 비즈니스 로직을 DI 가능한 서비스로 캡슐화

**구조**:

```typescript
// services/service/DomainService.ts
import { singleton, inject } from "tsyringe";
import type { EntityBehaviorStructure } from "@/entities/[entity]/domain/behaviors/EntityBehavior";
import type { EntityDto } from "@/entities/[entity]/domain/dtos";

@singleton()
export class DomainService {
    constructor(
        @inject("EntityBehavior")
        private readonly entityBehavior: EntityBehaviorStructure,
    ) {}

    public businessMethod = (dto: EntityDto): ResultType => {
        // Entity behavior를 활용한 비즈니스 로직
        return this.entityBehavior.someCheck(dto) ? "result-a" : "result-b";
    };

    public calculateSomething = (data: DataType): number => {
        // 복잡한 계산 로직
        return this.entityBehavior.calculate(data);
    };
}
```

**특징**:

- `@singleton()` 데코레이터로 싱글톤 패턴
- Entity Behavior 주입으로 도메인 로직 재사용
- Pure function 스타일 (side-effect 최소화)
- 테스트 시 mock 주입 용이

### 8. Strategy Pattern (Converter Strategies) (models/converters/)

**목적**: 여러 타입의 DTO를 처리하기 위한 전략 패턴

**구조**:

```typescript
// models/converters/BaseStrategy.ts
export abstract class BaseConverterStrategy<T> {
    abstract support: (dto: unknown) => dto is T;
    abstract convert: (dtos: T[], context: ContextType) => ResultType[];
}

// models/converters/StrategyA.ts
@singleton()
export class StrategyA extends BaseConverterStrategy<DtoA> {
    constructor(@inject(BehaviorA) private readonly behaviorA: BehaviorA) {
        super();
    }

    public support = (dto: unknown): dto is DtoA => {
        return this.behaviorA.isTypeA(dto);
    };

    public convert = (dtos: DtoA[], context: ContextType) => {
        return dtos.map((dto) => ({
            id: dto.id,
            name: dto.name,
            // ... 변환 로직
        }));
    };
}

// models/converters/StrategyB.ts
@singleton()
export class StrategyB extends BaseConverterStrategy<DtoB> {
    constructor(@inject(BehaviorB) private readonly behaviorB: BehaviorB) {
        super();
    }

    public support = (dto: unknown): dto is DtoB => {
        return this.behaviorB.isTypeB(dto);
    };

    public convert = (dtos: DtoB[], context: ContextType) => {
        return dtos.map((dto) => ({
            id: dto.id,
            name: dto.name,
            // ... 변환 로직
        }));
    };
}
```

**특징**:

- Type guard (`dto is T`) 활용
- 각 Strategy는 `@singleton()`으로 등록
- Entity Behavior 주입으로 타입 검증
- 추상 클래스로 interface 강제

### 9. Registry Pattern (Converter Registry) (models/converters/)

**목적**: 여러 Strategy를 관리하고 적절한 Strategy 선택

**구조**:

```typescript
// models/converters/ConverterRegistry.ts
import { singleton, inject } from "tsyringe";

@singleton()
export class ConverterRegistry {
    private readonly strategies: BaseConverterStrategy<any>[];

    constructor(
        @inject(StrategyA) private readonly strategyA: StrategyA,
        @inject(StrategyB) private readonly strategyB: StrategyB,
        @inject(StrategyC) private readonly strategyC: StrategyC,
    ) {
        this.strategies = [this.strategyA, this.strategyB, this.strategyC];
    }

    public findMatchingConverter = (dto: unknown): BaseConverterStrategy<any> => {
        const converter = this.strategies.find((strategy) => strategy.support(dto));

        if (!converter) {
            throw new Error("No matching converter found for DTO");
        }

        return converter;
    };
}
```

**사용 예시**:

```typescript
// services/query/useSyncData.ts
import { container } from "tsyringe";
import { useMemo } from "react";
import { ConverterRegistry } from "@/pages/[page]/models/converters/ConverterRegistry";

export const useSyncData = () => {
    const registry = container.resolve(ConverterRegistry);

    const convertedData = useMemo(() => {
        if (!data) return [];

        // 첫 번째 item으로 적절한 converter 찾기
        const converter = registry.findMatchingConverter(data[0]);

        return converter.convert(data, context);
    }, [data, context, registry]);

    return { convertedData };
};
```

**특징**:

- 여러 Strategy를 DI로 주입받아 배열로 관리
- `findMatchingConverter()`로 동적 Strategy 선택
- Type safety 보장 (support 메서드의 type guard)
- 확장성 (새 Strategy 추가 시 Registry만 수정)

### 10. Readonly State Pattern (Zustand Store) (models/stores/)

**목적**: 상태 변경을 명시적 setter로만 허용

**구조**:

```typescript
// models/stores/index.ts
import { create } from "zustand";

interface PageStore {
    currentStatus: StatusType;
    selectedId: string | undefined;
    keyword: string;
    setCurrentStatus: (status: StatusType) => void;
    setSelectedId: (id: string | undefined) => void;
    setKeyword: (word: string) => void;
    resetState: () => void;
}

export const usePageStore = create<PageStore>((set) => ({
    currentStatus: "default",
    selectedId: undefined,
    keyword: "",
    setCurrentStatus: (status) => set({ currentStatus: status }),
    setSelectedId: (id) => set({ selectedId: id }),
    setKeyword: (word) => set({ keyword: word }),
    resetState: () =>
        set({
            currentStatus: "default",
            selectedId: undefined,
            keyword: "",
        }),
}));
```

**특징**:

- 상태 변경 경로를 Action으로 제한
- Setter 함수로만 상태 변경
- Reset 함수로 초기화 로직 캡슐화
- 명시적 상태 관리로 추적 용이

### 11. Interface Definition Pattern

#### models/interface.ts 구조

```typescript
// models/interface.ts

/** Section 1 - Component Props */
export interface ComponentNameProps {
    id: string;
    name: string;
    selected: boolean;
    onAction: (value: { id: string; name: string }) => void;
}

/** Section 2 - Search Result Props */
export interface SearchResultSectionProps {
    totalCount: number;
    searchResults: Omit<ComponentNameProps, "selected">[];
    isFirstPending: boolean;
    isFetchingNextPage: boolean;
    nextPageRequest: (options?: any) => Promise<any>;
}

/** Section 3 - Filter Props */
export interface FilterProps {
    selectedValue: string | null;
    options: { label: string; value: string | null }[];
    onSelectValue: (value: string | null) => void;
}
```

**특징**:

- Section 주석으로 Props 그룹 분류
- 콜백 시그니처를 Props에 명시적으로 정의
- `Omit<>` 유틸리티 타입으로 재사용성 향상
- `Readonly<>`, `Omit<>`, `Partial<>` 타입으로 재사용성 향상

### 12. Pattern Decision Guide

#### 언제 Strategy + Registry 패턴을 사용하는가?

**사용하는 경우**:

- 여러 타입의 DTO를 동적으로 처리
- Type guard를 통한 타입 안전성 보장 필요
- 런타임에 적절한 Converter 선택 필요

**생략하는 경우**:

- 단일 DTO 타입만 처리
- 컴파일 타임에 Converter 확정 가능

### 언제 Service 클래스를 사용하는가?

**사용하는 경우**:

- Entity Behavior를 활용한 복잡한 비즈니스 로직
- Singleton으로 관리해야 하는 도메인 로직
- 여러 컴포넌트에서 재사용되는 계산 로직

**생략하는 경우**:

- 단순 유틸리티 함수
- 컴포넌트 local 로직

### 언제 Form 패턴을 사용하는가?

**사용하는 경우**:

- TanStack Form 사용
- Zod schema validation 필요
- 복잡한 form 상태 관리

**구조**:

- `models/formSchema.ts`: Zod validation
- `services/useFormName.ts`: Form logic
- `services/useWrapperFormName.ts`: 객체 export

#### Widget vs Page 판단

**Widget으로 분리**:

- 여러 페이지에서 재사용
- 독립적인 상태 관리 (context store)
- 복합 컴포넌트 (search, navigation, popup)

**Page로 유지**:

- 특정 라우트에 종속
- 페이지 전용 로직
- 재사용 가능성 낮음


### 13. Best Practices

#### 1. 타입 안전성

- 모든 Props/Callback 타입을 `models/interface.ts`에 정의
- Generic 타입으로 Type-safe setter 구현
- `Readonly<>`, `Omit<>`, `Partial<>` 활용

#### 2. 의존성 관리

- Adapter 패턴으로 DI 의존성 분리
- Wrapper 패턴으로 재사용성 향상
- Features layer query hooks 적극 활용

#### 3. 상태 관리

- 페이지 레벨 상태는 Zustand store
- 서버 상태는 TanStack Query
- `useMemo`로 파생 상태 관리

#### 4. 컴포넌트 설계

- Section별 폴더 분리
- index.tsx를 Section 진입점으로
- Storybook으로 독립적 개발

#### 5. 테스트 가능성

- Wrapper로 mock 주입 용이
- Props 기반 컴포넌트 테스트
- Storybook play functions

### 14. Anti-Patterns (피해야 할 것)

#### ❌ 직접 Entity 의존

```typescript
// Bad: 컴포넌트가 Entity DTO를 직접 사용
import { StudentDto } from "@/entities/student/domain/dtos";

type Props = { student: StudentDto };
```

```typescript
// Good: Converter로 변환된 Props 사용
import type { StudentItemProps } from "@/pages/[page]/models/interface";

type Props = StudentItemProps;
```

#### ❌ Store에서 직접 API 호출

```typescript
// Bad: Store actions에서 API 호출
const fetchData = async () => {
    const data = await api.getData();
    setItems(data);
};
```

```typescript
// Good: TanStack Query로 서버 상태 관리
const { data } = useQueryData();
const setSelectedId = usePageStore((state) => state.setSelectedId);

useEffect(() => {
    if (data) {
        // Store는 클라이언트 상태만 관리
        setSelectedId(data.id);
    }
}, [data, setSelectedId]);
```

#### ❌ 순환 의존성

```typescript
// Bad: pages → features → pages 순환 참조
// pages/ai-tutor/adapter/SomeAdapter.ts
import { somethingFromFeature } from "@/features/ai-tutor/...";
```

```typescript
// Good: 단방향 의존성 유지
// pages → features → entities → shared (단방향)
```

### 15.Dependencies

- **tsyringe**: DI 컨테이너
- **react / react-dom (>=18)**: UI 렌더링 및 hooks
- **@tanstack/react-query**: 서버 상태 관리
- **zustand**: 클라이언트 상태 관리
- **class-variance-authority**: 스타일 variant 관리

### 16. Integration with Existing Layers

#### Features Layer 재사용

```typescript
// pages에서 features의 query hooks 재사용
import { useInfiniteQueriesData } from "@/features/[feature]/services/query/useInfiniteQueriesData";
```

#### Entities Layer 참조

```typescript
// Entity DTOs와 Enums import
import { DataDto } from "@/entities/[entity]/domain/dtos";
import { DataType } from "@/entities/[entity]/domain/enums";
```

#### Shared Layer 활용

```typescript
// Shared components, utils, libs 사용
import { cn } from "@/shared/utils/cn";
import Badge from "@/shared/components/atomic/badge/Badge.tsx";
import type { IDateAdapter } from "@/shared/libs/date/interface";
```

### 17. Notes

- 한 번에 하나의 페이지만 마이그레이션
- 기존 테스트가 통과하는지 확인
- Import 경로 일괄 변경 시 주의
- DI 컨테이너 등록 확인 (tsyringe)
- Storybook과 Jest 설정 호환성 검증

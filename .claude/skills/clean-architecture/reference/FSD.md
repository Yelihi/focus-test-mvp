---
description: FSD(Feature-Sliced Design) 에 대한 참고문서
---

FSD(Feature-Sliced Design) 아키텍처에 대한 문서입니다.

## 0. Architecture Patterns

FSD 구조에 맞는 코드 구현을 하시기 전에, 먼저 해당 패턴과 규칙들을 **반드시** 먼저 숙지한 다음에 아래 FSD Layer 내 reference 를 참고하여 작업해주세요

[architecture-patterns](architecture-patterns.md)


## 1. FSD Layer

FSD layer 설계는 [shared.md](shared.md), [entities.md](entities.md), [features.md](features.md), [pages.md](pages.md)를 참고하세요.

- 의존성을 아래처럼 지켜주어야 합니다.
- 의존 방향: `shared` ← `entities` ← `features` ← `widgets` ← `views` ← `app`
- 의존을 해치는 import 는 절대로 해서는 안됩니다.
- 각 레이어는 아래 레이어만 import 할 수 있습니다.

### views

views layer 를 구현해야할때, 자세한 설명은 [views.md](views.md)를 참고하세요.

### pages

pages layer 를 구현해야할때, 자세한 설명은 [pages.md](pages.md)를 참고하세요.

### features

features layer 를 구현해야할때, 자세한 설명은 [features.md](features.md)를 참고하세요.

### entities

entities layer 를 구현해야할때, 자세한 설명은 [entities.md](entities.md)를 참고하세요.

### shared

shared layer 를 구현해야할때, 자세한 설명은 [shared.md](shared.md)를 참고하세요.
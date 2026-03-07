const MESSAGES = [
  "흐름이 끊길 조짐이 보여요. 잠깐 정리하고 갈래요?",
  "집중이 흐트러지고 있어요. 짧은 break가 도움이 될 수 있어요.",
  "지금 잠깐 멈추면 더 빨리 돌아올 수 있어요.",
];

let lastIndex = -1;

export function getCoachingMessage(): string {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * MESSAGES.length);
  } while (idx === lastIndex && MESSAGES.length > 1);
  lastIndex = idx;
  return MESSAGES[idx];
}

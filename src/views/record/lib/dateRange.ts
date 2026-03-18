import type { Period } from "@/widgets/period-filter";

export function getDateRange(period: Period): { start: number; end: number } {
  const now = new Date();
  const end = now.getTime();

  switch (period) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return { start, end };
    }
    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff).getTime();
      return { start, end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { start, end };
    }
    case "all":
    default:
      return { start: 0, end };
  }
}

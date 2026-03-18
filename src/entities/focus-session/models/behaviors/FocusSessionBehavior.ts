import type { BreakReason } from "../dtos";

export interface FocusSessionBehaviorStructure {
  getBreakReasonLabel(reason: BreakReason): string;
  isQuickBreakReason(reason: BreakReason): boolean;
}

class FocusSessionBehavior implements FocusSessionBehaviorStructure {
  private readonly breakReasonLabels: Record<BreakReason, string> = {
    phone: "전화",
    bathroom: "화장실",
    sns: "SNS",
    news: "뉴스",
    colleague: "동료",
    fatigue: "피로",
    other: "기타",
  };

  private readonly quickBreakReasons: BreakReason[] = ["phone", "bathroom"];

  getBreakReasonLabel(reason: BreakReason): string {
    return this.breakReasonLabels[reason];
  }

  isQuickBreakReason(reason: BreakReason): boolean {
    return this.quickBreakReasons.includes(reason);
  }
}

export const focusSessionBehavior = Object.freeze(new FocusSessionBehavior());

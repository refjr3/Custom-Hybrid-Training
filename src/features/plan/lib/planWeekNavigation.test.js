import { describe, expect, it } from "vitest";
import { buildWeekOrderMap, getAdjacentWeekByOrder, getWeekOrderValue } from "./planWeekNavigation.js";

function buildWeeks(count) {
  return Array.from({ length: count }, (_, idx) => {
    const weekOrder = idx + 1;
    const phase = weekOrder <= 4 ? "BASE REBUILD" : weekOrder <= 8 ? "BUILD" : "PEAK";
    return {
      id: `week-${weekOrder}`,
      week_order: weekOrder,
      label: `${phase} WK ${weekOrder}`,
      phase,
      _weekOrder: weekOrder,
    };
  });
}

describe("plan week navigation", () => {
  it("maps orders and steps exactly one week at a time", () => {
    const weeks = buildWeeks(22);
    const byOrder = buildWeekOrderMap(weeks);
    expect(byOrder.size).toBe(22);

    const w4 = byOrder.get(4);
    expect(w4?.id).toBe("week-4");
    expect(getAdjacentWeekByOrder(weeks, 4, -1)?.id).toBe("week-3");
    expect(getAdjacentWeekByOrder(weeks, 3, -1)?.id).toBe("week-2");
    expect(getAdjacentWeekByOrder(weeks, 2, -1)?.id).toBe("week-1");
    expect(getAdjacentWeekByOrder(weeks, 1, -1)).toBeNull();
    expect(getAdjacentWeekByOrder(weeks, 1, 1)?.id).toBe("week-2");
  });

  it("walks full next sequence from week 1 to week 22", () => {
    const weeks = buildWeeks(22);
    const visited = [1];
    let currentOrder = 1;
    for (let i = 0; i < 21; i += 1) {
      const nextWeek = getAdjacentWeekByOrder(weeks, currentOrder, 1);
      expect(nextWeek).not.toBeNull();
      currentOrder = getWeekOrderValue(nextWeek, null);
      visited.push(currentOrder);
    }
    expect(visited).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
      12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
    expect(getAdjacentWeekByOrder(weeks, 22, 1)).toBeNull();
  });
});

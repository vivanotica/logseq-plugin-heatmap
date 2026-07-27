import { describe, expect, it } from "vitest";
import {
  aggregateCreatedBlocks,
  buildActivityRange,
  getTimestampBounds,
  normalizeCreatedAt,
} from "../src/heatmap/activity";
import { formatDateKey } from "../src/heatmap/dates";

describe("block activity aggregation", () => {
  it("accepts timestamps in milliseconds and seconds", () => {
    const timestamp = new Date(2026, 6, 27, 12).getTime();
    const key = formatDateKey(new Date(timestamp));
    const counts = aggregateCreatedBlocks([
      [timestamp],
      [Math.floor(timestamp / 1000)],
      ["invalid"],
    ]);

    expect(counts.get(key)).toBe(2);
    expect(normalizeCreatedAt("invalid")).toBeNull();
  });

  it("groups timestamps by the local calendar day", () => {
    const first = new Date(2026, 6, 27, 0, 1).getTime();
    const second = new Date(2026, 6, 27, 23, 59).getTime();
    const counts = aggregateCreatedBlocks([[first], [second]]);

    expect(counts.get("2026-07-27")).toBe(2);
  });

  it("builds an inclusive range and fills inactive days", () => {
    const timestamp = new Date(2026, 6, 28, 12).getTime();
    const range = buildActivityRange(
      "2026-07-27",
      "2026-07-29",
      [[timestamp]],
      "en"
    );

    expect(range.map(({ date, count }) => ({ date, count }))).toEqual([
      { date: "2026-07-27", count: 0 },
      { date: "2026-07-28", count: 1 },
      { date: "2026-07-29", count: 0 },
    ]);
  });

  it("uses calendar days across daylight-saving boundaries", () => {
    const range = buildActivityRange("2026-03-07", "2026-03-10", [], "en");
    expect(range).toHaveLength(4);
  });

  it("includes the complete local end date in query bounds", () => {
    const [start, end] = getTimestampBounds("2026-07-27", "2026-07-27");
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(end).getHours()).toBe(23);
    expect(new Date(end).getMinutes()).toBe(59);
    expect(new Date(end).getSeconds()).toBe(59);
    expect(new Date(end).getMilliseconds()).toBe(999);
  });
});

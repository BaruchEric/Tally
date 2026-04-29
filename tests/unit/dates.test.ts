import { describe, expect, it } from "vitest";

import { localDayBounds, monthBounds } from "@/src/lib/dates";

describe("date helpers", () => {
  it("uses local midnight for day boundaries", () => {
    const bounds = localDayBounds("2026-04-28T19:30:00", "America/Los_Angeles");
    expect(bounds.key).toBe("2026-04-28");
    expect(bounds.start.toISO()).toContain("2026-04-28T00:00:00.000-07:00");
  });

  it("computes local month bounds", () => {
    const bounds = monthBounds("2026-04-28T19:30:00", "America/Los_Angeles");
    expect(bounds.key).toBe("2026-04");
    expect(bounds.start.toISO()).toContain("2026-04-01T00:00:00.000-07:00");
  });
});

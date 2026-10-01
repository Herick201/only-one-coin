import { describe, expect, it } from "vitest";
import { scheduleTextFromSlots } from "@/infra/persistence/catalog/scheduleText.js";

/**
 * `class_groups.schedule` is the text twin of `slots`: seed, legacy import and
 * the enrollment ledger search read it. Panel-made class groups derive it from
 * `slots` in the same shape the seed and the legacy sheet already use.
 */
describe("scheduleTextFromSlots", () => {
  it("is empty for no slots", () => {
    expect(scheduleTextFromSlots([])).toBe("");
  });

  it("joins two days that share a time with a slash", () => {
    expect(
      scheduleTextFromSlots([
        { weekday: "mon", startTime: "18:00", endTime: "19:00" },
        { weekday: "wed", startTime: "18:00", endTime: "19:00" },
      ]),
    ).toBe("Lun/Mié 18:00-19:00");
  });

  it("collapses three or more consecutive days into a range", () => {
    const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;
    expect(
      scheduleTextFromSlots(weekdays.map((weekday) => ({ weekday, startTime: "07:00", endTime: "08:00" }))),
    ).toBe("Lun-Vie 07:00-08:00");
  });

  it("writes a single day on its own", () => {
    expect(scheduleTextFromSlots([{ weekday: "sat", startTime: "09:00", endTime: "12:00" }])).toBe("Sáb 09:00-12:00");
  });

  it("orders days Monday first whatever order they come in", () => {
    expect(
      scheduleTextFromSlots([
        { weekday: "wed", startTime: "18:00", endTime: "19:00" },
        { weekday: "mon", startTime: "18:00", endTime: "19:00" },
      ]),
    ).toBe("Lun/Mié 18:00-19:00");
  });

  it("mixes ranges and single days in one time window", () => {
    const weekdays = ["mon", "tue", "wed", "fri"] as const;
    expect(
      scheduleTextFromSlots(weekdays.map((weekday) => ({ weekday, startTime: "18:00", endTime: "19:30" }))),
    ).toBe("Lun-Mié/Vie 18:00-19:30");
  });

  it("gives each time window its own part when days meet at different hours", () => {
    expect(
      scheduleTextFromSlots([
        { weekday: "thu", startTime: "06:30", endTime: "08:30" },
        { weekday: "tue", startTime: "09:00", endTime: "13:00" },
      ]),
    ).toBe("Mar 09:00-13:00 · Jue 06:30-08:30");
  });
});

import type { WeeklySlot } from "@ooc/domain";

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * The legacy sheet's own day abbreviations. `class_groups.schedule` is stored
 * data in the institution's language — what the seed, the legacy import and
 * the ledger search already hold — not screen copy: every screen formats
 * `slots` through the locale instead.
 */
const DAY_TEXT: Record<WeeklySlot["weekday"], string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mié",
  thu: "Jue",
  fri: "Vie",
  sat: "Sáb",
  sun: "Dom",
};

/**
 * `slots` as the seed-era text column writes them: `Lun/Mié 18:00-19:00`,
 * `Lun-Vie 07:00-08:00`. Days sharing a time window form one part; three or
 * more consecutive days collapse into a range. Days that meet at different
 * hours get one part per window, joined by ` · `.
 */
export function scheduleTextFromSlots(slots: WeeklySlot[]): string {
  const windows = new Map<string, number[]>();

  for (const slot of slots) {
    const key = `${slot.startTime}-${slot.endTime}`;
    const days = windows.get(key) ?? [];
    days.push(WEEK.indexOf(slot.weekday));
    windows.set(key, days);
  }

  return [...windows.entries()]
    .map(([window, days]) => ({ window, days: [...new Set(days)].sort((a, b) => a - b) }))
    .sort((a, b) => a.days[0]! - b.days[0]!)
    .map(({ window, days }) => `${dayRuns(days)} ${window}`)
    .join(" · ");
}

function dayRuns(days: number[]): string {
  const runs: number[][] = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run && day === run.at(-1)! + 1) run.push(day);
    else runs.push([day]);
  }

  return runs
    .flatMap((run) =>
      run.length >= 3
        ? [`${DAY_TEXT[WEEK[run[0]!]!]}-${DAY_TEXT[WEEK[run.at(-1)!]!]}`]
        : run.map((day) => DAY_TEXT[WEEK[day]!]),
    )
    .join("/");
}

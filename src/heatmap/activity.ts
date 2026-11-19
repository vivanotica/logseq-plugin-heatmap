import {
  addDays,
  differenceInCalendarDays,
  formatDateKey,
  parseDateKey,
} from "./dates";

export type CreatedAtRow = readonly [unknown];

export type ActivityDay = {
  date: string;
  label: string;
  count: number;
};

const SECOND_TIMESTAMP_LIMIT = 1_000_000_000_000;

export { formatDateKey, parseDateKey } from "./dates";

export const normalizeCreatedAt = (value: unknown): Date | null => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;

  const date = new Date(
    timestamp < SECOND_TIMESTAMP_LIMIT ? timestamp * 1000 : timestamp
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

export const aggregateCreatedBlocks = (
  rows: readonly CreatedAtRow[]
): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const [createdAt] of rows) {
    const date = normalizeCreatedAt(createdAt);
    if (!date) continue;

    const key = formatDateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
};

export const buildActivityRange = (
  startDate: string,
  endDate: string,
  rows: readonly CreatedAtRow[],
  locale = "en-US"
): ActivityDay[] => {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const counts = aggregateCreatedBlocks(rows);
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return Array.from({ length: Math.max(totalDays, 0) }, (_, index) => {
    const date = addDays(start, index);
    const key = formatDateKey(date);
    return {
      date: key,
      label: formatter.format(date),
      count: counts.get(key) ?? 0,
    };
  });
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));

export const getTimestampBounds = (
  startDate: string,
  endDate: string
): readonly [startTimestamp: number, endTimestamp: number] => [
  parseDateKey(startDate).getTime(),
  addDays(parseDateKey(endDate), 1).getTime() - 1,
];

const query = async (q: string): Promise<unknown[][]> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await logseq.DB.datascriptQuery(q);
    if (Array.isArray(result)) return result as unknown[][];
    await wait(200);
  }
  throw new Error("The Logseq DB graph is not ready.");
};

// journal-day is a yyyymmdd integer, e.g. 20260127
export const journalDayToTimestamp = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 10000101) return null;
  const date = new Date(
    Math.floor(n / 10000),
    Math.floor((n % 10000) / 100) - 1,
    n % 100,
    12
  );
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

export const fetchCreatedAtRows = async (
  startDate: string,
  endDate: string
): Promise<CreatedAtRow[]> => {
  const [startTimestamp, endTimestamp] = getTimestampBounds(
    startDate,
    endDate
  );
  const inRange = (t: number) => t >= startTimestamp && t <= endTimestamp;

  // Include ?block so blocks sharing one timestamp (imports, pastes) are not
  // collapsed by the :find set semantics.
  const created = await query(`
    [:find ?block ?created-at
     :where
     [?block :block/created-at ?created-at]
     [?block :block/parent ?parent]]
  `);

  // Blocks migrated from older graphs may lack :block/created-at; fall back to
  // the day of the journal page they live on.
  const undated = await query(`
    [:find ?block ?day
     :where
     [?block :block/parent ?parent]
     [(missing? $ ?block :block/created-at)]
     [?block :block/page ?page]
     [?page :block/journal-day ?day]]
  `);

  const rows: CreatedAtRow[] = [];
  for (const [, createdAt] of created) {
    const date = normalizeCreatedAt(createdAt);
    if (date && inRange(date.getTime())) rows.push([date.getTime()]);
  }
  for (const [, day] of undated) {
    const t = journalDayToTimestamp(day);
    if (t !== null && inRange(t)) rows.push([t]);
  }
  return rows;
};

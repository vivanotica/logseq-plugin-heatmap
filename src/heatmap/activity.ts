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

export const fetchCreatedAtRows = async (
  startDate: string,
  endDate: string
): Promise<CreatedAtRow[]> => {
  const [startTimestamp, endTimestamp] = getTimestampBounds(
    startDate,
    endDate
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await logseq.DB.datascriptQuery(`
      [:find ?created-at
       :where
       [?block :block/created-at ?created-at]
       [?block :block/parent ?parent]
       [(>= ?created-at ${startTimestamp})]
       [(<= ?created-at ${endTimestamp})]]
    `);

    if (Array.isArray(result)) {
      return result as CreatedAtRow[];
    }
    await wait(200);
  }

  throw new Error("The Logseq DB graph is not ready.");
};

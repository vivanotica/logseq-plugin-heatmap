const DAY_IN_MILLISECONDS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

export const addWeeks = (date: Date, amount: number) =>
  addDays(date, amount * 7);

export const startOfWeek = (date: Date) => addDays(date, -date.getDay());

export const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);

export const differenceInCalendarDays = (later: Date, earlier: Date) => {
  const asUtcDate = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((asUtcDate(later) - asUtcDate(earlier)) / DAY_IN_MILLISECONDS);
};

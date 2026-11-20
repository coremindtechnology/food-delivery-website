const INDIA_OFFSET_MS = 330 * 60 * 1000;

export function getIndiaDateKey(date = new Date()) {
  return new Date(date.getTime() + INDIA_OFFSET_MS).toISOString().slice(0, 10);
}

export function getIndiaDateBounds(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== dateKey) {
    return null;
  }

  const start = new Date(utcDate.getTime() - INDIA_OFFSET_MS);
  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

export function getIndiaDateRange(from?: string | null, to?: string | null) {
  const range: Record<string, Date> = {};
  const toBoundary = (date: string, dayOffset = 0) => {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + dayOffset) - 330 * 60 * 1000);
  };

  if (from) range.$gte = toBoundary(from);
  if (to) range.$lt = toBoundary(to, 1);
  return range;
}

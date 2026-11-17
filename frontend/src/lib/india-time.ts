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

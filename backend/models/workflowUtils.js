export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + Number(minutes) * 60 * 1000);
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + Number(days) * 24 * 60 * 60 * 1000);
}

export function formatEmployeeCode(id, year = new Date().getFullYear()) {
  return `EMP-${year}-${String(id).padStart(4, "0")}`;
}

export function daysInMonth(month, year) {
  return new Date(Number(year), Number(month), 0).getDate();
}

export function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

export function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function countWorkingDays(startDate, endDate, holidays = []) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const holidaySet = new Set(holidays.map((holiday) => toDateKey(holiday)));
  let count = 0;

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    if (!isWeekend(current) && !holidaySet.has(toDateKey(current))) {
      count += 1;
    }
  }

  return count;
}

export function parseJson(value, fallback) {
  if (typeof value === "object" && value !== null) {
    return value;
  }

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function calculateTds(annualizedIncome, taxSlabs = []) {
  const slabs = [...taxSlabs]
    .map((slab) => ({
      min: Number(slab.min || 0),
      max: slab.max == null ? null : Number(slab.max),
      rate: Number(slab.rate || 0),
    }))
    .sort((left, right) => left.min - right.min);

  let tds = 0;
  for (const slab of slabs) {
    if (annualizedIncome <= slab.min) {
      continue;
    }
    const taxableUpperBound = slab.max == null ? annualizedIncome : Math.min(annualizedIncome, slab.max);
    const taxableIncome = Math.max(0, taxableUpperBound - slab.min);
    tds += taxableIncome * slab.rate;
  }

  return Math.max(0, Math.round(tds / 12));
}

export function buildCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");
}

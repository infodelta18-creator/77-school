const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

function parseIsoDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [datePart] = value.split("T");
  const [yearRaw = "", monthRaw = "", dayRaw = ""] = datePart.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

export function formatDateDDMMYYYY(value: string | null | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return "";
  }

  const day = parsed.day.toString().padStart(2, "0");
  const month = parsed.month.toString().padStart(2, "0");
  return `${day}.${month}.${parsed.year}`;
}

export function formatDateUzDayMonth(value: string | null | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return "";
  }

  return `${parsed.day}-${UZ_MONTHS[parsed.month - 1]}`;
}

export function getUzMonthShort(value: string | null | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return "";
  }

  return UZ_MONTHS[parsed.month - 1].slice(0, 3);
}

export function getUzDateParts(value: string | null | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return { day: "", monthShort: "", monthName: "", year: "" };
  }

  return {
    day: parsed.day.toString(),
    monthShort: UZ_MONTHS[parsed.month - 1].slice(0, 3),
    monthName: UZ_MONTHS[parsed.month - 1],
    year: parsed.year.toString(),
  };
}

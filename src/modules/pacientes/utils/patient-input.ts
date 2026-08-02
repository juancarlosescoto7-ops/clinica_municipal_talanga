export interface LegacyPatientNameParts {
  firstNames: string;
  lastNames: string;
}

export function normalizePatientFullName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function splitPatientFullName(
  value: string,
): LegacyPatientNameParts | null {
  const parts = normalizePatientFullName(value).split(" ").filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const lastNames = parts.pop();

  if (!lastNames) {
    return null;
  }

  return {
    firstNames: parts.join(" "),
    lastNames,
  };
}

export function formatPatientBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const groups = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 8),
  ].filter(Boolean);

  return groups.join("/");
}

export function parsePatientBirthDate(value: string): string | null {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const separatedMatch = /^(\d{2})[/.\-](\d{2})[/.\-](\d{4})$/.exec(
    trimmed,
  );

  if (!isoMatch && !separatedMatch) {
    return null;
  }

  const day = Number(isoMatch?.[3] ?? separatedMatch?.[1]);
  const month = Number(isoMatch?.[2] ?? separatedMatch?.[2]);
  const year = Number(isoMatch?.[1] ?? separatedMatch?.[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    year < 1900 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

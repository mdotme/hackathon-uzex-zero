const NUMBER_RE =
  /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[   ]\d{3})*(?:[.,]\d+)?/g;

const DATE_RE =
  /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g;

const RELATIVE_TOLERANCE = 1e-13;

const SCALES = [0, 3, 6, 9, 12, -2];

const MAX_UNCHECKED_INTEGER = 10;

const MAX_PAIR_SOURCES = 400;

interface ParsedNumber {
  raw: string;
  values: number[];
  decimals: number;
}

function parseNumber(raw: string): ParsedNumber {
  const compact = raw.replace(/[   ]/g, "");

  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(compact)) {
    const thousands = Number(compact.replaceAll(",", ""));
    const decimals = compact.split(".")[1]?.length ?? 0;
    const values = [thousands];
    if (/^\d{1,3},\d{3}$/.test(compact)) {
      values.push(Number(compact.replace(",", ".")));
    }
    return { raw, values, decimals };
  }

  const normalized = compact.replace(",", ".");
  const fraction = normalized.split(".")[1] ?? "";
  const decimals = /^0*$/.test(fraction) ? 0 : fraction.length;
  return { raw, values: [Number(normalized)], decimals };
}

export function extractNumbers(text: string): ParsedNumber[] {
  return [...text.matchAll(NUMBER_RE)].map((m) => parseNumber(m[0]));
}

function splitDates(text: string) {
  const dates: { raw: string; iso: string }[] = [];
  const rest = text.replace(DATE_RE, (raw, y, m, d, dd, mm, yyyy) => {
    const iso = y
      ? `${y}-${m}-${d}`
      : `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    dates.push({ raw, iso });
    return " ";
  });
  return { dates, rest };
}

function collect(value: unknown, numbers: Set<number>, dates: Set<string>) {
  if (typeof value === "number") {
    if (Number.isFinite(value)) numbers.add(Math.abs(value));
  } else if (typeof value === "string") {
    const split = splitDates(value);
    for (const date of split.dates) {
      dates.add(date.iso);
      for (const part of date.iso.split("-")) numbers.add(Number(part));
    }
    for (const n of extractNumbers(split.rest)) {
      for (const v of n.values) numbers.add(v);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collect(item, numbers, dates);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collect(item, numbers, dates);
  }
}

function matchesRounded(
  answer: number,
  decimals: number,
  source: number,
  scales = [0],
) {
  return scales.some((k) => {
    const scaled = source / 10 ** k;
    const tolerance =
      0.5 * 10 ** -decimals +
      Math.max(Math.abs(scaled), Math.abs(answer)) * RELATIVE_TOLERANCE +
      1e-9;
    return Math.abs(scaled - answer) <= tolerance;
  });
}

function usableInArithmetic(value: number) {
  return !(Number.isInteger(value) && value <= 31);
}

function derivedValues(a: number, b: number) {
  const values = [a + b, Math.abs(a - b)];
  if (b !== 0) values.push(a / b, (a / b) * 100);
  if (a !== 0) values.push(b / a, (b / a) * 100);
  return values;
}

export interface VerificationResult {
  ok: boolean;
  unverified: string[];
}

export function verifyAnswer(
  answer: string,
  sources: unknown[],
): VerificationResult {
  const known = new Set<number>();
  const knownDates = new Set<string>();
  for (const source of sources) collect(source, known, knownDates);
  const knownList = [...known];
  const pairSources = knownList
    .filter(usableInArithmetic)
    .slice(0, MAX_PAIR_SOURCES);

  function isTraced(n: ParsedNumber) {
    return n.values.some((value) => {
      if (n.decimals === 0 && value <= MAX_UNCHECKED_INTEGER) return true;
      if (knownList.some((s) => matchesRounded(value, n.decimals, s, SCALES))) {
        return true;
      }
      for (let i = 0; i < pairSources.length; i++) {
        for (let j = i + 1; j < pairSources.length; j++) {
          const derived = derivedValues(pairSources[i]!, pairSources[j]!);
          if (derived.some((d) => matchesRounded(value, n.decimals, d))) {
            return true;
          }
        }
      }
      return false;
    });
  }

  const { dates, rest } = splitDates(answer);
  const unverified = [
    ...dates.filter((d) => !knownDates.has(d.iso)).map((d) => d.raw),
    ...extractNumbers(rest)
      .filter((n) => !isTraced(n))
      .map((n) => n.raw.trim()),
  ];

  return { ok: unverified.length === 0, unverified: [...new Set(unverified)] };
}

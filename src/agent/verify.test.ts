import { describe, expect, test } from "bun:test";

import { extractNumbers, verifyAnswer } from "./verify";

const totals = {
  rows: [
    {
      deals_total: "115763",
      deals_cancelled: "8085",
      deals_traded: "107678",
      amount_uzs: "52060836360057.1205",
      amount_usd: 4201188537.3028955,
      example_deal_nos: [432930, 487689, 425061],
    },
  ],
};
const sql =
  "SELECT * FROM deal_totals(date_from := '2025-01-01', date_to := '2025-12-31')";

describe("extractNumbers", () => {
  test("reads space-grouped thousands and decimals", () => {
    const values = extractNumbers("jami 1 234 567.89 söm va 42,5 t").map(
      (n) => n.values[0],
    );
    expect(values).toEqual([1234567.89, 42.5]);
  });

  test("reads comma-grouped thousands both ways", () => {
    const [n] = extractNumbers("115,763");
    expect(n?.values).toEqual([115763, 115.763]);
  });
});

describe("verifyAnswer", () => {
  test("accepts values copied from results with formatting", () => {
    const answer =
      "2025-yilda **115 763** ta bitim, şundan 8 085 tasi bekor qilingan. " +
      "Aylanma **52 060 836 360 057.12 söm** (4 201 188 537.30 USD). " +
      "Asos: № 432930, 487689.";
    expect(verifyAnswer(answer, [totals, sql])).toEqual({
      ok: true,
      unverified: [],
    });
  });

  test("accepts rounding, scale words and simple arithmetic", () => {
    const answer =
      "Aylanma 52.06 trln söm, bekor qilinganlar ulushi 6.98%, " +
      "farq 107 678 ta, 115,763 jami.";
    expect(verifyAnswer(answer, [totals]).ok).toBe(true);
  });

  test("ignores small integers and accepts numbers inside source strings", () => {
    const answer = "Top-3 mahsulot: ЦЕМ I 42,5 Н, 1-sort.";
    expect(
      verifyAnswer(answer, [{ spec: "Портландцемент ЦЕМ I 42,5 Н" }]).ok,
    ).toBe(true);
  });

  test("accepts large decimals despite float precision", () => {
    const yearly = { rows: [{ amount_uzs: "42724135079483.6551" }] };
    expect(verifyAnswer("Оборот 42 724 135 079 483.66 сум", [yearly]).ok).toBe(
      true,
    );
  });

  test("treats trailing zero decimals as an integer", () => {
    const trend = { rows: [{ vwap_uzs: 5452239.9946 }] };
    expect(verifyAnswer("III kvartal: 5 452 240.00 söm/t", [trend]).ok).toBe(
      true,
    );
  });

  test("checks dates as dates in both formats", () => {
    const coverage = { rows: [{ from: "2022-01-03", to: "2026-10-30" }] };
    expect(verifyAnswer("Davr: 03.01.2022 – 2026-10-30", [coverage]).ok).toBe(
      true,
    );
    expect(verifyAnswer("Sana: 2025-07-23", [coverage])).toEqual({
      ok: false,
      unverified: ["2025-07-23"],
    });
  });

  test("flags a total summed from more than two values", () => {
    const years = { rows: [{ a: 222.7 }, { a: 193.4 }, { a: 202.5 }] };
    expect(verifyAnswer("Jami 618.6 mln USD", [years]).ok).toBe(false);
  });

  test("flags numbers that are not in the results", () => {
    const answer =
      "2025-yilda 120 000 ta bitim, aylanma 51 000 000 000 000 söm.";
    expect(verifyAnswer(answer, [totals, sql])).toEqual({
      ok: false,
      unverified: ["120 000", "51 000 000 000 000"],
    });
  });
});

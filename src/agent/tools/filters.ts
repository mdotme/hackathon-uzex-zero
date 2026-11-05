import z from "zod";

const STATUS_CODES = [
  "new",
  "unsigned",
  "concluded",
  "awaiting_payment",
  "paid",
  "executed",
  "partially_executed",
  "cancelled_unpaid",
];

function commaList(item: string) {
  return new RegExp(`^${item}(,${item})*$`);
}

export const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const INN = z.string().regex(/^\d{9}$/, "INN is 9 digits");

export const FILTERS = {
  date_from: DATE.describe("First day, inclusive, YYYY-MM-DD"),
  date_to: DATE.describe("Last day, inclusive, YYYY-MM-DD"),
  commodity: z
    .string()
    .regex(commaList("[a-z_]+"), "Use commodity_id values")
    .describe("commodity_id, or a comma list like 'petrol,diesel'"),
  product: z
    .string()
    .regex(commaList("\\d+"), "Use product_id values")
    .describe("product_id from find_commodity, or a comma list like '60,61'"),
  region: z
    .string()
    .regex(/^UZ-[A-Z]{2}$/, "Use a region code like UZ-TK")
    .describe("Warehouse region code like 'UZ-TK'"),
  seller: INN.describe("Seller INN"),
  buyer: INN.describe("Buyer INN"),
  broker: z
    .string()
    .regex(/^BK\d{3}$/, "Use a broker code like BK012")
    .describe("Broker code like 'BK012', on either side"),
  status: z
    .string()
    .regex(commaList(`(${STATUS_CODES.join("|")})`), "Use status_code values")
    .describe("status_code, or a comma list"),
  form: z.enum(["spot", "forward", "futures"]).describe("Contract form"),
  ctype: z
    .enum(["domestic", "export"])
    .describe("Contract type: domestic (UZS) or export (USD)"),
  ttype: z.enum(["english", "reverse", "double"]).describe("Trading type"),
  currency: z.enum(["UZS", "USD"]).describe("Contract currency"),
  exclude_cancelled: z
    .boolean()
    .describe(
      "Also drop cancelled deals from deal counts (amounts never include them). Default false",
    ),
};

export type FilterName = keyof typeof FILTERS;

const ALL_FILTERS = Object.keys(FILTERS) as FilterName[];

export function filterShape<const N extends FilterName>(names: readonly N[]) {
  return Object.fromEntries(
    names.map((name) => [name, FILTERS[name].optional()]),
  ) as { [K in N]: z.ZodOptional<(typeof FILTERS)[K]> };
}

export function filtersExcept<const N extends FilterName>(
  excluded: readonly N[],
) {
  return ALL_FILTERS.filter(
    (name): name is Exclude<FilterName, N> => !excluded.includes(name as N),
  );
}

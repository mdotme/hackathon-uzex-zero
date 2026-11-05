export interface EvalCase {
  id: string;
  question: string;
  truth?: string;
  numbers?: string[];
  texts?: string[];
  rows?: number;
  absent?: boolean;
}

export const CASES: EvalCase[] = [
  {
    id: "count-year",
    question: "2025-yilda nechta bitim tuzilgan?",
    truth:
      "SELECT * FROM deal_totals(date_from := '2025-01-01', date_to := '2025-12-31')",
    numbers: ["deals_total"],
  },
  {
    id: "count-commodity",
    question: "Сколько сделок по пшенице было в 2025 году?",
    truth:
      "SELECT * FROM deal_totals(commodity := 'wheat', date_from := '2025-01-01', date_to := '2025-12-31')",
    numbers: ["deals_total"],
  },
  {
    id: "top-buyers",
    question: "Топ-3 покупателя цемента по сумме сделок в 2024 году",
    truth:
      "SELECT * FROM breakdown(dimension := 'buyer', commodity := 'cement', date_from := '2024-01-01', date_to := '2024-12-31', top_n := 3)",
    numbers: ["amount_uzs"],
    texts: ["name_ru"],
    rows: 3,
  },
  {
    id: "price-product",
    question: "AI-92 benzinning 2026-yildagi örtaça narxi qancha?",
    truth:
      "SELECT * FROM price_stats(product := '28', date_from := '2026-01-01')",
    numbers: ["vwap"],
    rows: 2,
  },
  {
    id: "usd-rate",
    question: "Какой курс доллара был 15.03.2024?",
    truth: "SELECT * FROM usd_rate('2024-03-15')",
    numbers: ["uzs_per_usd"],
  },
  {
    id: "deal-seller",
    question: "100001-sonli bitimda sotuvchi kim bo'lgan?",
    truth: "SELECT * FROM deal_card(100001)",
    texts: ["seller_name"],
  },
  {
    id: "top-region",
    question: "В каком регионе было больше всего сделок в 2023 году?",
    truth:
      "SELECT * FROM breakdown(dimension := 'region', metric := 'deals_total', date_from := '2023-01-01', date_to := '2023-12-31', top_n := 1)",
    numbers: ["deals_total"],
    texts: ["name_ru|name_uz"],
  },
  {
    id: "export-year",
    question:
      "Сколько экспортных сделок было в 2024 году и на какую сумму в долларах?",
    truth:
      "SELECT * FROM deal_totals(ctype := 'export', date_from := '2024-01-01', date_to := '2024-12-31')",
    numbers: ["deals_total", "amount_usd"],
  },
  {
    id: "largest-deal",
    question: "2025-yildagi eng katta bitim qaysi?",
    truth:
      "SELECT * FROM list_deals(sort := 'amount_desc', top_n := 1, date_from := '2025-01-01', date_to := '2025-12-31', exclude_cancelled := true)",
    numbers: ["deal_no", "amount"],
  },
  {
    id: "cancel-share",
    question: "Какая доля аннулированных сделок в 2024 году?",
    truth:
      "SELECT round(deals_cancelled * 100.0 / deals_total, 2) AS pct FROM deal_totals(date_from := '2024-01-01', date_to := '2024-12-31')",
    numbers: ["pct"],
  },
  {
    id: "company-turnover",
    question: "Pudexiz Plast kompaniyasining savdo aylanmasi qancha?",
    truth: "SELECT * FROM company_profile('975923536')",
    numbers: ["amount_uzs"],
  },
  {
    id: "top-broker",
    question:
      "Какой брокер покупателей был самым активным по числу сделок в 2026 году?",
    truth:
      "SELECT * FROM top_brokers(side := 'buyer', metric := 'deals', date_from := '2026-01-01', top_n := 1)",
    texts: ["broker_code"],
  },
  {
    id: "volume-commodity",
    question: "Сколько тонн хлопка-сырца продано в 2025 году?",
    truth:
      "SELECT * FROM deal_totals(commodity := 'raw_cotton', date_from := '2025-01-01', date_to := '2025-12-31')",
    numbers: ["volume_t"],
  },
  {
    id: "top-month",
    question: "2025-yilda qaysi oyda eng ko'p bitim tuzilgan?",
    truth:
      "SELECT * FROM breakdown(dimension := 'month', metric := 'deals_total', date_from := '2025-01-01', date_to := '2025-12-31', top_n := 1)",
    numbers: ["deals_total"],
  },
  {
    id: "price-commodity",
    question: "Средняя цена карбамида в 2025 году",
    truth:
      "SELECT * FROM price_stats(level := 'commodity', commodity := 'urea', date_from := '2025-01-01', date_to := '2025-12-31')",
    numbers: ["vwap"],
  },
  {
    id: "vat-sellers",
    question: "Сколько продавцов являются плательщиками НДС?",
    truth:
      "SELECT count(*) FILTER (WHERE is_vat_payer) AS n FROM participants WHERE role = 'seller'",
    numbers: ["n"],
  },
  {
    id: "commodity-count",
    question: "Birjada necha xil tovar sotiladi?",
    truth: "SELECT count(*) AS n FROM commodities",
    numbers: ["n"],
  },
  {
    id: "broker-deals",
    question: "Сколько сделок провёл брокер BK012 в 2025 году?",
    truth:
      "SELECT * FROM deal_totals(broker := 'BK012', date_from := '2025-01-01', date_to := '2025-12-31')",
    numbers: ["deals_total"],
  },
  {
    id: "futures-cyrillic",
    question: "2024 йилда фьючерс шартномалари бўйича нечта битим тузилган?",
    truth:
      "SELECT * FROM deal_totals(form := 'futures', date_from := '2024-01-01', date_to := '2024-12-31')",
    numbers: ["deals_total"],
  },
  {
    id: "delivery-delay",
    question:
      "На сколько дней в среднем опаздывают поставки хлопка-сырца, когда опаздывают?",
    truth:
      "SELECT * FROM delivery_stats(dimension := 'total', commodity := 'raw_cotton')",
    numbers: ["avg_delay_days_when_late"],
  },
  {
    id: "price-compare",
    question: "Сравни среднюю цену бензина АИ-92 за литр в 2025 и 2026 годах",
    truth:
      "SELECT vwap FROM price_stats(product := '28', date_from := '2025-01-01', date_to := '2025-12-31') WHERE unit_code = 'l' " +
      "UNION ALL SELECT vwap FROM price_stats(product := '28', date_from := '2026-01-01') WHERE unit_code = 'l'",
    numbers: ["vwap"],
    rows: 2,
  },
  {
    id: "top-canceller",
    question: "Qaysi sotuvchining 2025-yilda eng ko'p bitimi bekor qilingan?",
    truth:
      "SELECT * FROM breakdown(dimension := 'seller', metric := 'cancelled', date_from := '2025-01-01', date_to := '2025-12-31', top_n := 1)",
    numbers: ["deals_cancelled"],
    texts: ["name_ru"],
  },
  {
    id: "cement-region",
    question:
      "Сколько сделок с цементом было в Ферганской области в 2024 году?",
    truth:
      "SELECT * FROM deal_totals(commodity := 'cement', region := 'UZ-FA', date_from := '2024-01-01', date_to := '2024-12-31')",
    numbers: ["deals_total"],
  },
  {
    id: "absent-zero",
    question:
      "Сколько сделок со сжиженным газом было в Ферганской области в 2024 году?",
    absent: true,
  },
  {
    id: "buyer-region",
    question:
      "2026-yilda Toshkent shahridan bo'lgan xaridorlar jami qancha summaga xarid qilgan?",
    truth:
      "SELECT * FROM breakdown(dimension := 'buyer_region', date_from := '2026-01-01', top_n := 20) WHERE key = 'UZ-TK'",
    numbers: ["amount_uzs"],
  },
  {
    id: "absent-company",
    question: "Gazprom Neft qancha mahsulot sotgan?",
    absent: true,
  },
  {
    id: "absent-commodity",
    question: "Сколько золота продали на бирже в 2023 году?",
    absent: true,
  },
  {
    id: "absent-period",
    question: "2021-yilda nechta bitim bo'lgan?",
    absent: true,
  },
  {
    id: "absent-deal",
    question: "Кто продавец по сделке 999999?",
    absent: true,
  },
  {
    id: "absent-field",
    question: "Pudexiz Plast kompaniyasining telefon raqami qanday?",
    absent: true,
  },
  {
    id: "absent-rate",
    question: "Какой курс доллара на 1 января 2027 года?",
    absent: true,
  },
];

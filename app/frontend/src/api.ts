const BASE = '';

export type SalesSummary = {
  total_sales: number;
  total_transactions: number;
  avg_transaction_amount: number;
  by_category: { Category: string; Sales: number; count: number }[];
  by_season: { Season: string; Sales: number }[];
};

export type SalesDataResponse = {
  total: number;
  data: Record<string, unknown>[];
};

export type ModelMetricRow = {
  model?: string;
  'R2 Train'?: number;
  'R2 Test'?: number;
  MAE?: number;
  MAPE?: number;
  RMSE?: number;
  [key: string]: unknown;
};

export type ModelMetrics = {
  combined_metrics: ModelMetricRow[];
  tuned_metrics: ModelMetricRow[];
  baseline_metrics: ModelMetricRow[];
  best_params: Record<string, Record<string, unknown>>;
  summary_text: string;
};

export type PredictRequest = {
  Age: number;
  Gender: string;
  Category: string;
  ItemPurchased: string;
  Price: number;
  PaymentMethod: string;
  ItemRating: number;
  DiscountApplied: number;
  PreviousPurchases: number;
};

export type PredictResponse = {
  predicted_sales: number;
  model: string;
};

export async function getSalesSummary(): Promise<SalesSummary> {
  const r = await fetch(`${BASE}/api/sales/summary`);
  if (!r.ok) throw new Error('Failed to fetch sales summary');
  return r.json();
}

export async function getSalesData(limit = 100, offset = 0, category?: string): Promise<SalesDataResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (category) params.set('category', category);
  const r = await fetch(`${BASE}/api/sales/data?${params}`);
  if (!r.ok) throw new Error('Failed to fetch sales data');
  return r.json();
}

export async function getCategories(): Promise<string[]> {
  const r = await fetch(`${BASE}/api/sales/categories`);
  if (!r.ok) throw new Error('Failed to fetch categories');
  return r.json();
}

export async function getItems(category?: string): Promise<string[]> {
  const url = category ? `${BASE}/api/sales/items?category=${encodeURIComponent(category)}` : `${BASE}/api/sales/items`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch items');
  return r.json();
}

export async function getPaymentMethods(): Promise<string[]> {
  const r = await fetch(`${BASE}/api/sales/payment-methods`);
  if (!r.ok) throw new Error('Failed to fetch payment methods');
  return r.json();
}

export async function getModelMetrics(): Promise<ModelMetrics> {
  const r = await fetch(`${BASE}/api/models/metrics`);
  if (!r.ok) throw new Error('Failed to fetch model metrics');
  return r.json();
}

export async function predictSales(body: PredictRequest): Promise<PredictResponse> {
  const r = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Prediction failed');
  }
  return r.json();
}

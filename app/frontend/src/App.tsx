import { useState, useEffect } from 'react'
import { getSalesSummary, getModelMetrics, getCategories, getItems, getPaymentMethods, predictSales } from './api'
import type { SalesSummary, ModelMetrics, PredictRequest } from './api'
import { CategoryBarChart, SeasonPieChart, ModelMetricsChart } from './components/SalesCharts'
import { TrendingUp, PieChart as PieIcon, Cpu, Calculator, Info } from 'lucide-react'
import './App.css'

function App() {
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [items, setItems] = useState<string[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<number | null>(null)
  const [predictLoading, setPredictLoading] = useState(false)
  const [predictError, setPredictError] = useState<string | null>(null)
  const [form, setForm] = useState<PredictRequest>({
    Age: 35,
    Gender: 'Female',
    Category: '',
    ItemPurchased: '',
    Price: 500,
    PaymentMethod: '',
    ItemRating: 4.2,
    DiscountApplied: 15,
    PreviousPurchases: 3,
  })

  useEffect(() => {
    Promise.all([
      getSalesSummary(),
      getModelMetrics(),
      getCategories(),
      getItems(),
      getPaymentMethods(),
    ])
      .then(([s, m, c, i, p]) => {
        setSummary(s)
        setMetrics(m)
        setCategories(c)
        setItems(i)
        setPaymentMethods(p)
        if (c.length > 0 || i.length > 0 || p.length > 0) {
          setForm((f) => ({
            ...f,
            Category: c.length > 0 ? (c.includes(f.Category) ? f.Category : c[0]) : f.Category,
            ItemPurchased: i.length > 0 ? (i.includes(f.ItemPurchased) ? f.ItemPurchased : i[0]) : f.ItemPurchased,
            PaymentMethod: p.length > 0 ? (p.includes(f.PaymentMethod) ? f.PaymentMethod : p[0]) : f.PaymentMethod,
          }))
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load data from backend.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!form.Category) return
    getItems(form.Category)
      .then((itemList) => {
        setItems(itemList)
        setForm((f) => ({
          ...f,
          ItemPurchased: itemList.length > 0 ? (itemList.includes(f.ItemPurchased) ? f.ItemPurchased : itemList[0]) : f.ItemPurchased,
        }))
      })
      .catch(() => {})
  }, [form.Category])

  const handlePredict = () => {
    setPredictError(null)
    setPrediction(null)
    setPredictLoading(true)
    predictSales(form)
      .then((res) => setPrediction(res.predicted_sales))
      .catch((e) => setPredictError(e instanceof Error ? e.message : 'Prediction failed'))
      .finally(() => setPredictLoading(false))
  }

  if (loading) {
    return (
      <div className="app loading">
        <div className="loader" />
        <p>Initializing dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app error">
        <div className="panel" style={{ textAlign: 'center', maxWidth: '500px' }}>
          <Info color="var(--error)" size={48} style={{ marginBottom: '1rem' }} />
          <h1>Connection Error</h1>
          <p className="err-msg">{error}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--textMuted)' }}>
            Please ensure your backend server is running at <code>http://localhost:8000</code>
          </p>
          <button className="btn" style={{ marginTop: '1.5rem' }} onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Sales Project</h1>
        <p>Market Intelligence & MLOps Analytics</p>
      </header>

      <section className="cards">
        {summary && (
          <>
            <div className="card">
              <span className="label">Total Revenue</span>
              <span className="value">${summary.total_sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="card">
              <span className="label">Orders Volume</span>
              <span className="value">{summary.total_transactions.toLocaleString()}</span>
            </div>
            <div className="card">
              <span className="label">Avg. Order Value</span>
              <span className="value">${summary.avg_transaction_amount.toFixed(2)}</span>
            </div>
          </>
        )}
      </section>

      <div className="grid">
        <section className="panel">
          <h2><TrendingUp size={20} color="var(--accent)" /> Sales by Category</h2>
          <div className="chart-container">
            {summary && <CategoryBarChart data={summary.by_category} />}
          </div>
        </section>

        <section className="panel">
          <h2><PieIcon size={20} color="var(--accent)" /> Seasonal Distribution</h2>
          <div className="chart-container">
            {summary && <SeasonPieChart data={summary.by_season} />}
          </div>
        </section>

        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <h2><Cpu size={20} color="var(--accent)" /> Model Performance Comparison</h2>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1.5fr', alignItems: 'start' }}>
            <div className="chart-container">
              {metrics && <ModelMetricsChart metrics={metrics.combined_metrics as any} />}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>R2 Train</th>
                    <th>R2 Test</th>
                    <th>MAE</th>
                    <th>RMSE</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.combined_metrics.map((row: Record<string, unknown>, i: number) => (
                    <tr key={i}>
                      <td>{String(row.model ?? row[''] ?? row['Unnamed: 0'] ?? '-')}</td>
                      <td>{typeof row['R2 Train'] === 'number' ? (row['R2 Train'] as number).toFixed(4) : '-'}</td>
                      <td>{typeof row['R2 Test'] === 'number' ? (row['R2 Test'] as number).toFixed(4) : '-'}</td>
                      <td>{typeof row['MAE'] === 'number' ? (row['MAE'] as number).toFixed(2) : '-'}</td>
                      <td>{typeof row['RMSE'] === 'number' ? (row['RMSE'] as number).toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {metrics?.summary_text && (
            <details className="summary-details">
              <summary>View detailed training report</summary>
              <pre className="summary-text">{metrics.summary_text}</pre>
            </details>
          )}
        </section>

        <section className="panel predict-panel" style={{ gridColumn: '1 / -1' }}>
          <h2><Calculator size={20} color="var(--accent)" /> Sales Prediction Engine</h2>
          <p className="muted">Configure parameters below to estimate potential sales volume using the production model.</p>
          <div className="form-grid">
            <label>
              Customer Age
              <input
                type="number"
                min={1}
                max={120}
                value={form.Age}
                onChange={(e) => setForm((f) => ({ ...f, Age: Number(e.target.value) }))}
              />
            </label>
            <label>
              Gender
              <select
                value={form.Gender}
                onChange={(e) => setForm((f) => ({ ...f, Gender: e.target.value }))}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </label>
            <label>
              Category
              <select
                value={form.Category}
                onChange={(e) => setForm((f) => ({ ...f, Category: e.target.value }))}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Item
              <select
                value={form.ItemPurchased}
                onChange={(e) => setForm((f) => ({ ...f, ItemPurchased: e.target.value }))}
              >
                {items.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
                {items.length === 0 && <option value="">—</option>}
              </select>
            </label>
            <label>
              Base Price ($)
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.Price}
                onChange={(e) => setForm((f) => ({ ...f, Price: Number(e.target.value) }))}
              />
            </label>
            <label>
              Payment Method
              <select
                value={form.PaymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, PaymentMethod: e.target.value }))}
              >
                {paymentMethods.map((pm) => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
                {paymentMethods.length === 0 && <option value="">—</option>}
              </select>
            </label>
            <label>
              Item Rating (1–5)
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={form.ItemRating}
                onChange={(e) => setForm((f) => ({ ...f, ItemRating: Number(e.target.value) }))}
              />
            </label>
            <label>
              Discount Applied (%)
              <input
                type="number"
                min={0}
                max={100}
                value={form.DiscountApplied}
                onChange={(e) => setForm((f) => ({ ...f, DiscountApplied: Number(e.target.value) }))}
              />
            </label>
            <label>
              Previous Purchases
              <input
                type="number"
                min={0}
                value={form.PreviousPurchases}
                onChange={(e) => setForm((f) => ({ ...f, PreviousPurchases: Number(e.target.value) }))}
              />
            </label>
          </div>
          <button
            className="btn"
            onClick={handlePredict}
            disabled={predictLoading || !form.Category || !form.ItemPurchased || !form.PaymentMethod}
          >
            {predictLoading ? 'Calculating...' : 'Run Sales Prediction'}
          </button>
          {predictError && <p className="err-msg">{predictError}</p>}
          {prediction !== null && !predictError && (
            <div className="result">
              <span>Estimated Sales Value</span>
              <strong>${Number(prediction).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default App

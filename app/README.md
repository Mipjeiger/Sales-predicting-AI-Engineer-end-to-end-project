# Sales Project — App (Frontend + Backend)

Integrated frontend and backend for the Sales project, using data from `dataset/store_sales.csv` and model metrics from `MLOps/models/`.

## Structure

- **backend/** — FastAPI server (sales summary, data, MLOps metrics, predict)
- **frontend/** — React (Vite + TypeScript) dashboard

## Quick start

### 1. Backend

From the **project root** (Sales/):

```bash
cd app/backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be at `http://127.0.0.1:8000`. Docs: `http://127.0.0.1:8000/docs`.

### 2. Frontend

In another terminal:

```bash
cd app/frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend proxies `/api` and `/health` to the backend.

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/sales/summary` | Aggregated sales (total, by category, by season) |
| `GET /api/sales/data` | Paginated sales records (optional `category` filter) |
| `GET /api/sales/categories` | Unique categories |
| `GET /api/models/metrics` | MLOps metrics (combined, tuned, baseline, best_params, summary text) |
| `POST /api/predict` | Predict sales (same feature logic as EDA notebook) |

## Data & models

- **Data:** `../dataset/store_sales.csv` (relative to project root).
- **Models:** `../MLOps/models/` — reads latest `combined_metrics_*.csv`, `tuned_metrics_*.csv`, `best_params_*.json`, `summary_report_*.txt`.

Prediction uses the same preprocessing and target (Sales) as in `notebooks/01_eda.ipynb` and fits a Linear Regression on the fly for the request (no saved .pkl required).

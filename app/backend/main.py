"""
Sales Project API — optimized with data caching and persistent MLOps models.
"""
from pathlib import Path
import json
import logging
from contextlib import asynccontextmanager
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("SalesAPI")

# Paths relative to project root (parent of app/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATASET_PATH = PROJECT_ROOT / "dataset" / "store_sales.csv"
MLOPS_MODELS_DIR = PROJECT_ROOT / "MLOps" / "models"

class DataManager:
    """Handles CSV data loading and caching."""
    def __init__(self):
        self.df = None
        self.categories = []
        self.items = []
        self.payment_methods = []

    def load_data(self):
        if not DATASET_PATH.exists():
            logger.error(f"Dataset not found at {DATASET_PATH}")
            return False
        try:
            logger.info(f"Loading dataset from {DATASET_PATH}")
            df = pd.read_csv(DATASET_PATH)
            # Preprocess for summary consistency
            df = df.rename(columns={"Amount": "Price"})
            df["Sales"] = df["Price"] * (1 - df["DiscountApplied(%)"] / 100)
            self.df = df
            self.categories = sorted(list(df["Category"].dropna().astype(str).unique()))
            self.items = sorted(list(df["ItemPurchased"].dropna().astype(str).unique()))
            self.payment_methods = sorted(list(df["PaymentMethod"].dropna().astype(str).unique()))
            logger.info(f"Successfully loaded {len(df)} records")
            return True
        except Exception as e:
            logger.error(f"Failed to load dataset: {e}")
            return False

class PredictionService:
    """Handles model training and real-time inference."""
    def __init__(self):
        self.model = None
        self.scaler = None
        self.le_dict = {}
        self.cat_cols = []
        self.num_cols = []
        self.feature_cols = []
        self.cat_fallback = {}  # fallback encoded value per cat column for unseen labels

    def train(self, df: pd.DataFrame):
        """Train the LinearRegression model once."""
        try:
            logger.info("Training prediction model...")
            train_df = df.copy()
            
            # Feature engineering logic from EDA
            train_df["Discount_value"] = train_df["Price"] - train_df["Sales"]
            train_df["Discount_ratio"] = train_df["Discount_value"] / train_df["Price"]
            train_df["Is_loyal_customer"] = train_df["PreviousPurchases"].apply(lambda x: 1 if x > 5 else 0)
            train_df["High_rating"] = train_df["ItemRating"].apply(lambda x: 1 if x >= 4 else 0)
            
            self.cat_cols = [c for c in train_df.columns if train_df[c].dtype == "object"]
            self.le_dict = {}
            for col in self.cat_cols:
                le = LabelEncoder()
                train_df[col] = le.fit_transform(train_df[col].astype(str))
                self.le_dict[col] = le
            
            X = train_df.drop(columns=["CustomerID", "Sales", "Season"], errors="ignore")
            y = train_df["Sales"]
            
            self.feature_cols = X.columns.tolist()
            self.num_cols = X.select_dtypes(include=np.number).columns.tolist()
            
            self.scaler = StandardScaler()
            X[self.num_cols] = self.scaler.fit_transform(X[self.num_cols])
            
            self.model = LinearRegression()
            self.model.fit(X, y)
            for col in self.cat_cols:
                classes = self.le_dict[col].classes_
                mode_idx = 0
                self.cat_fallback[col] = int(self.le_dict[col].transform([classes[mode_idx]])[0])
            logger.info("Model training complete")
        except Exception as e:
            logger.error(f"Model training failed: {e}")

    def predict(self, req: 'PredictRequest'):
        if self.model is None:
            raise ValueError("Model is not initialized")
        
        row = pd.DataFrame([{
            "Age": req.Age,
            "Gender": req.Gender,
            "Category": req.Category,
            "ItemPurchased": req.ItemPurchased,
            "Price": req.Price,
            "PaymentMethod": req.PaymentMethod,
            "ItemRating": req.ItemRating,
            "DiscountApplied(%)": req.DiscountApplied,
            "PreviousPurchases": req.PreviousPurchases,
        }])
        
        # Engineering same features
        row["Sales"] = row["Price"] * (1 - row["DiscountApplied(%)"] / 100)
        row["Discount_value"] = row["Price"] - row["Sales"]
        row["Discount_ratio"] = (row["Discount_value"] / row["Price"]).fillna(0)
        row["Is_loyal_customer"] = (row["PreviousPurchases"] > 5).astype(int)
        row["High_rating"] = (row["ItemRating"] >= 4).astype(int)
        
        for col in self.cat_cols:
            if col in row.columns:
                try:
                    val = str(row[col].iloc[0]).strip()
                    row[col] = self.le_dict[col].transform([val])[0]
                except Exception:
                    row[col] = self.cat_fallback.get(col, 0)
                    
        row = row[self.feature_cols]
        row[self.num_cols] = self.scaler.transform(row[self.num_cols])
        pred = float(self.model.predict(row)[0])
        return round(max(0, pred), 2)

# Global managers
data_manager = DataManager()
prediction_service = PredictionService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    if data_manager.load_data():
        prediction_service.train(data_manager.df)
    yield

app = FastAPI(
    title="Sales Project API",
    description="Optimized API for sales data and MLOps model metrics",
    version="1.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    Age: int
    Gender: str
    Category: str
    ItemPurchased: str
    Price: float
    PaymentMethod: str
    ItemRating: float
    DiscountApplied: float
    PreviousPurchases: int

def _get_latest_metrics():
    """Load latest metrics from MLOps/models."""
    if not MLOPS_MODELS_DIR.exists():
        return None
    combined = sorted(MLOPS_MODELS_DIR.glob("combined_metrics_*.csv"), key=lambda p: p.name)
    if not combined:
        return None
    latest = combined[-1]
    ts = "_".join(latest.stem.split("_")[-2:])
    tuned_path = MLOPS_MODELS_DIR / f"tuned_metrics_{ts}.csv"
    baseline_path = MLOPS_MODELS_DIR / f"baseline_metrics_{ts}.csv"
    best_params_path = MLOPS_MODELS_DIR / f"best_params_{ts}.json"
    summary_path = MLOPS_MODELS_DIR / f"summary_report_{ts}.txt"
    def _metrics_records(path: Path) -> list:
        if not path.exists():
            return []
        df = pd.read_csv(path, index_col=0)
        df = df.reset_index()
        df = df.rename(columns={"index": "model"})
        records = []
        for _, r in df.iterrows():
            row = {"model": str(r["model"])}
            for k, v in r.items():
                if k == "model":
                    continue
                if isinstance(v, (np.floating, np.integer, float, int)):
                    fv = float(v)
                    row[k] = 0.0 if (fv != fv) else fv  # NaN check
                else:
                    row[k] = v
            records.append(row)
        return records
    out = {
        "combined_metrics": _metrics_records(latest),
        "tuned_metrics": _metrics_records(tuned_path),
        "baseline_metrics": _metrics_records(baseline_path),
        "best_params": {},
        "summary_text": "",
    }
    if best_params_path.exists():
        out["best_params"] = json.loads(best_params_path.read_text())
    if summary_path.exists():
        out["summary_text"] = summary_path.read_text()
    return out

@app.get("/")
def root():
    return {"message": "Sales Project API (Optimized)", "docs": "/docs"}

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "data_loaded": data_manager.df is not None,
        "model_ready": prediction_service.model is not None
    }

@app.get("/api/sales/summary")
def sales_summary():
    """Aggregated sales summary for dashboard."""
    if data_manager.df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    df = data_manager.df
    total_sales = float(df["Sales"].sum())
    total_transactions = len(df)
    avg_amount = float(df["Price"].mean())
    by_category = df.groupby("Category").agg({"Sales": "sum", "CustomerID": "count"}).rename(columns={"CustomerID": "count"}).reset_index()
    by_season = df.groupby("Season").agg({"Sales": "sum"}).reset_index()
    # Ensure JSON-serializable types (e.g. numpy float64 -> float)
    by_cat_records = [{"Category": str(r["Category"]), "Sales": float(r["Sales"]), "count": int(r["count"])} for _, r in by_category.iterrows()]
    by_season_records = [{"Season": str(r["Season"]), "Sales": float(r["Sales"])} for _, r in by_season.iterrows()]
    return {
        "total_sales": round(total_sales, 2),
        "total_transactions": int(total_transactions),
        "avg_transaction_amount": round(avg_amount, 2),
        "by_category": by_cat_records,
        "by_season": by_season_records,
    }

@app.get("/api/sales/data")
def sales_data(
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    category: Optional[str] = None,
):
    """Paginated sales records."""
    if data_manager.df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    df = data_manager.df
    if category:
        df = df[df["Category"] == category]
    
    total = len(df)
    df_slice = df.iloc[offset : offset + limit]
    return {"total": total, "data": df_slice.to_dict(orient="records")}

@app.get("/api/sales/categories")
def sales_categories():
    if data_manager.df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")
    return data_manager.categories


@app.get("/api/sales/items")
def sales_items(category: Optional[str] = None):
    """Unique ItemPurchased values (optionally filtered by category) for prediction form."""
    if data_manager.df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")
    if category and str(category).strip():
        subset = data_manager.df[data_manager.df["Category"] == category]["ItemPurchased"].dropna().astype(str).unique()
        return sorted(list(subset))
    return data_manager.items


@app.get("/api/sales/payment-methods")
def sales_payment_methods():
    if data_manager.df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")
    return data_manager.payment_methods

@app.get("/api/models/metrics")
def model_metrics():
    metrics = _get_latest_metrics()
    if metrics is None:
        raise HTTPException(status_code=404, detail="No model metrics found")
    return metrics

@app.post("/api/predict")
def predict_sales_endpoint(req: PredictRequest):
    try:
        prediction = prediction_service.predict(req)
        return {"predicted_sales": prediction, "model": "LinearRegression (cached)"}
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

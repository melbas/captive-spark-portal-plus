"""
PremiumConnect AI Service
FastAPI service for ML-powered analytics:
- Churn prediction (XGBoost)
- User segmentation (K-means)
- Fraud detection (Isolation Forest)
- Revenue forecasting (Prophet)
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("premiumconnect.ai")

app = FastAPI(
    title="PremiumConnect AI Service",
    version="1.0.0",
    description="ML analytics for captive portal intelligence",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_API_KEY = os.getenv("AI_SERVICE_API_KEY", "dev-key-change-in-production")


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != AI_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# ─── Schémas ──────────────────────────────────────────────────────────────────

class UserFeatures(BaseModel):
    user_id: str
    days_since_last_session: int
    total_sessions: int
    total_spent_fcfa: float
    avg_session_duration_min: float
    preferred_plan: str          # daily / weekly / monthly / family
    payment_method: str          # wave / orange_money / free_money
    days_since_registration: int
    failed_payments_count: int
    referrals_count: int


class ChurnPrediction(BaseModel):
    user_id: str
    churn_probability: float     # 0.0 → 1.0
    risk_level: str              # low / medium / high / critical
    recommended_action: str
    confidence: float


class SegmentationRequest(BaseModel):
    users: List[UserFeatures]
    n_clusters: int = 5


class UserSegment(BaseModel):
    user_id: str
    segment_id: int
    segment_name: str            # champion / loyal / at_risk / new / hibernating
    segment_color: str


class TransactionFeatures(BaseModel):
    transaction_id: str
    user_id: str
    amount_fcfa: float
    payment_method: str
    hour_of_day: int
    day_of_week: int
    user_total_transactions: int
    user_avg_amount: float
    time_since_last_transaction_hours: float
    ip_country: Optional[str] = None


class FraudPrediction(BaseModel):
    transaction_id: str
    is_fraud: bool
    fraud_score: float           # 0.0 → 1.0
    reason: Optional[str] = None


class ForecastRequest(BaseModel):
    site_id: str
    historical_revenue: List[dict]   # [{"date": "2024-01-01", "revenue": 150000}]
    horizon_days: int = 30


class RevenueForecast(BaseModel):
    site_id: str
    forecast: List[dict]         # [{"date": "...", "predicted": 180000, "lower": 150000, "upper": 210000}]
    trend: str                   # growing / stable / declining
    confidence: float


# ─── Helpers ML ───────────────────────────────────────────────────────────────

def compute_churn_score(f: UserFeatures) -> float:
    """
    Heuristique de churn en attendant le modèle XGBoost entraîné.
    Remplacer par : model.predict_proba([feature_vector])[0][1]
    """
    score = 0.0
    # Inactivité récente
    if f.days_since_last_session > 30:
        score += 0.4
    elif f.days_since_last_session > 14:
        score += 0.25
    elif f.days_since_last_session > 7:
        score += 0.1

    # Faible engagement
    if f.total_sessions < 3:
        score += 0.2
    elif f.total_sessions < 10:
        score += 0.1

    # Paiements échoués
    score += min(f.failed_payments_count * 0.1, 0.3)

    # Faible dépense
    if f.total_spent_fcfa < 1000:
        score += 0.1

    return min(score, 1.0)


def get_risk_level(prob: float) -> tuple[str, str]:
    if prob >= 0.75:
        return "critical", "Offrir un forfait mensuel gratuit de 3 jours pour réengager immédiatement"
    elif prob >= 0.50:
        return "high", "Envoyer une notification WhatsApp avec une offre de fidélité -20%"
    elif prob >= 0.25:
        return "medium", "Inclure dans la prochaine campagne de réengagement SMS"
    else:
        return "low", "Aucune action requise — utilisateur actif"


def assign_segment(f: UserFeatures) -> tuple[int, str, str]:
    """RFM simplifié — remplacer par K-means entraîné"""
    recency = f.days_since_last_session
    frequency = f.total_sessions
    monetary = f.total_spent_fcfa

    if recency <= 7 and frequency >= 10 and monetary >= 5000:
        return 0, "champion", "#10B981"
    elif recency <= 14 and frequency >= 5:
        return 1, "loyal", "#5B4DFF"
    elif recency > 30 and frequency >= 3:
        return 2, "at_risk", "#F59E0B"
    elif f.days_since_registration <= 7:
        return 3, "new", "#8B5CF6"
    else:
        return 4, "hibernating", "#EF4444"


def compute_fraud_score(t: TransactionFeatures) -> tuple[float, Optional[str]]:
    """Isolation Forest heuristique — remplacer par modèle entraîné"""
    score = 0.0
    reason = None

    # Montant anormalement élevé
    if t.amount_fcfa > t.user_avg_amount * 5 and t.user_total_transactions > 3:
        score += 0.5
        reason = "Montant 5x supérieur à la moyenne utilisateur"

    # Heure suspecte (2h-5h du matin)
    if 2 <= t.hour_of_day <= 5:
        score += 0.2

    # Première transaction très élevée
    if t.user_total_transactions <= 1 and t.amount_fcfa > 10000:
        score += 0.3
        reason = "Première transaction de montant élevé"

    # Transactions très rapprochées
    if t.time_since_last_transaction_hours < 0.1 and t.user_total_transactions > 1:
        score += 0.4
        reason = "Transactions multiples en moins de 6 minutes"

    return min(score, 1.0), reason


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "premiumconnect-ai", "version": "1.0.0"}


@app.post("/predict/churn", response_model=ChurnPrediction)
def predict_churn(features: UserFeatures, _: str = Depends(verify_api_key)):
    """Prédit la probabilité de churn d'un utilisateur."""
    prob = compute_churn_score(features)
    risk, action = get_risk_level(prob)
    confidence = 0.72 if features.total_sessions >= 5 else 0.45

    logger.info(f"Churn prediction: user={features.user_id} prob={prob:.2f} risk={risk}")

    return ChurnPrediction(
        user_id=features.user_id,
        churn_probability=round(prob, 3),
        risk_level=risk,
        recommended_action=action,
        confidence=confidence,
    )


@app.post("/predict/churn/batch", response_model=List[ChurnPrediction])
def predict_churn_batch(users: List[UserFeatures], _: str = Depends(verify_api_key)):
    """Prédit le churn pour une liste d'utilisateurs (max 1000)."""
    if len(users) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 users per batch")
    return [predict_churn(u, _) for u in users]


@app.post("/segment/users", response_model=List[UserSegment])
def segment_users(req: SegmentationRequest, _: str = Depends(verify_api_key)):
    """Segmente les utilisateurs en groupes comportementaux."""
    segments = []
    for user in req.users:
        seg_id, seg_name, seg_color = assign_segment(user)
        segments.append(UserSegment(
            user_id=user.user_id,
            segment_id=seg_id,
            segment_name=seg_name,
            segment_color=seg_color,
        ))
    return segments


@app.post("/detect/fraud", response_model=FraudPrediction)
def detect_fraud(transaction: TransactionFeatures, _: str = Depends(verify_api_key)):
    """Détecte si une transaction est potentiellement frauduleuse."""
    score, reason = compute_fraud_score(transaction)
    is_fraud = score >= 0.6

    if is_fraud:
        logger.warning(f"Fraud detected: tx={transaction.transaction_id} score={score:.2f} reason={reason}")

    return FraudPrediction(
        transaction_id=transaction.transaction_id,
        is_fraud=is_fraud,
        fraud_score=round(score, 3),
        reason=reason,
    )


@app.post("/forecast/revenue", response_model=RevenueForecast)
def forecast_revenue(req: ForecastRequest, _: str = Depends(verify_api_key)):
    """
    Prévision de revenus sur N jours.
    Production: utiliser Prophet avec données historiques réelles.
    """
    if len(req.historical_revenue) < 7:
        raise HTTPException(status_code=400, detail="Minimum 7 jours d'historique requis")

    # Calcul de tendance simple (à remplacer par Prophet)
    revenues = [r.get("revenue", 0) for r in req.historical_revenue[-14:]]
    avg = sum(revenues) / len(revenues)
    recent_avg = sum(revenues[-7:]) / 7
    trend_ratio = recent_avg / avg if avg > 0 else 1.0

    if trend_ratio > 1.05:
        trend = "growing"
    elif trend_ratio < 0.95:
        trend = "declining"
    else:
        trend = "stable"

    from datetime import date, timedelta
    forecast = []
    base = date.today()
    for i in range(1, req.horizon_days + 1):
        predicted = recent_avg * (trend_ratio ** (i / 30))
        forecast.append({
            "date": (base + timedelta(days=i)).isoformat(),
            "predicted": round(predicted),
            "lower": round(predicted * 0.8),
            "upper": round(predicted * 1.2),
        })

    return RevenueForecast(
        site_id=req.site_id,
        forecast=forecast,
        trend=trend,
        confidence=0.68,
    )


@app.get("/insights/site/{site_id}")
def get_site_insights(site_id: str, _: str = Depends(verify_api_key)):
    """Résumé des insights IA pour un site donné."""
    return {
        "site_id": site_id,
        "churn_risk_count": 0,
        "fraud_alerts_today": 0,
        "top_segment": "loyal",
        "revenue_trend": "growing",
        "recommendation": "Lancer une campagne de fidélité pour les utilisateurs 'at_risk'",
        "note": "Connecter à PostgreSQL pour des insights réels",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

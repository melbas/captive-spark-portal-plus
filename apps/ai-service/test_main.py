"""Tests unitaires pour le service IA PremiumConnect"""
import pytest
from fastapi.testclient import TestClient
from main import app, compute_churn_score, assign_segment, compute_fraud_score, UserFeatures, TransactionFeatures

client = TestClient(app)
HEADERS = {"x-api-key": "dev-key-change-in-production"}


# ─── Health ────────────────────────────────────────────────────────────────────
def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ─── Churn ────────────────────────────────────────────────────────────────────
def make_user(**kwargs):
    defaults = dict(
        user_id="u1", days_since_last_session=5, total_sessions=20,
        total_spent_fcfa=15000, avg_session_duration_min=45,
        preferred_plan="monthly", payment_method="wave",
        days_since_registration=90, failed_payments_count=0, referrals_count=2
    )
    defaults.update(kwargs)
    return UserFeatures(**defaults)


def test_churn_low_risk_active_user():
    user = make_user(days_since_last_session=2, total_sessions=30, total_spent_fcfa=20000)
    score = compute_churn_score(user)
    assert score < 0.25, f"Utilisateur actif ne devrait pas être à risque élevé: {score}"


def test_churn_high_risk_inactive_user():
    user = make_user(days_since_last_session=45, total_sessions=2, failed_payments_count=3)
    score = compute_churn_score(user)
    assert score >= 0.5, f"Utilisateur inactif devrait être à risque élevé: {score}"


def test_churn_score_bounded():
    user = make_user(days_since_last_session=365, total_sessions=0, failed_payments_count=10)
    score = compute_churn_score(user)
    assert 0.0 <= score <= 1.0, "Le score de churn doit être entre 0 et 1"


def test_churn_api_endpoint():
    payload = make_user().model_dump()
    r = client.post("/predict/churn", json=payload, headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "churn_probability" in data
    assert "risk_level" in data
    assert data["risk_level"] in ["low", "medium", "high", "critical"]


def test_churn_api_requires_auth():
    payload = make_user().model_dump()
    r = client.post("/predict/churn", json=payload)
    assert r.status_code == 422  # Header manquant


def test_churn_batch():
    users = [make_user(user_id=f"u{i}").model_dump() for i in range(5)]
    r = client.post("/predict/churn/batch", json=users, headers=HEADERS)
    assert r.status_code == 200
    assert len(r.json()) == 5


# ─── Segmentation ─────────────────────────────────────────────────────────────
def test_segment_champion():
    user = make_user(days_since_last_session=3, total_sessions=15, total_spent_fcfa=8000)
    seg_id, seg_name, _ = assign_segment(user)
    assert seg_name == "champion"


def test_segment_new_user():
    user = make_user(days_since_registration=3, total_sessions=1, total_spent_fcfa=300)
    seg_id, seg_name, _ = assign_segment(user)
    assert seg_name == "new"


def test_segment_at_risk():
    user = make_user(days_since_last_session=35, total_sessions=8, total_spent_fcfa=5000)
    seg_id, seg_name, _ = assign_segment(user)
    assert seg_name == "at_risk"


def test_segmentation_api():
    payload = {"users": [make_user(user_id="u1").model_dump()], "n_clusters": 5}
    r = client.post("/segment/users", json=payload, headers=HEADERS)
    assert r.status_code == 200
    result = r.json()
    assert len(result) == 1
    assert result[0]["segment_name"] in ["champion", "loyal", "at_risk", "new", "hibernating"]


# ─── Fraude ───────────────────────────────────────────────────────────────────
def make_tx(**kwargs):
    defaults = dict(
        transaction_id="tx1", user_id="u1", amount_fcfa=1000,
        payment_method="wave", hour_of_day=14, day_of_week=2,
        user_total_transactions=10, user_avg_amount=800,
        time_since_last_transaction_hours=48.0
    )
    defaults.update(kwargs)
    return TransactionFeatures(**defaults)


def test_fraud_normal_transaction():
    tx = make_tx()
    score, reason = compute_fraud_score(tx)
    assert score < 0.6, "Transaction normale ne devrait pas être frauduleuse"


def test_fraud_suspicious_amount():
    tx = make_tx(amount_fcfa=50000, user_avg_amount=800, user_total_transactions=5)
    score, reason = compute_fraud_score(tx)
    assert score >= 0.5, "Montant 60x supérieur à la moyenne devrait être suspect"


def test_fraud_suspicious_hour():
    tx = make_tx(hour_of_day=3)
    score, reason = compute_fraud_score(tx)
    assert score > 0.0, "Transaction à 3h du matin devrait augmenter le score"


def test_fraud_rapid_transactions():
    tx = make_tx(time_since_last_transaction_hours=0.05, user_total_transactions=5)
    score, reason = compute_fraud_score(tx)
    assert score >= 0.4, "Transactions très rapprochées devraient être suspectes"


def test_fraud_api():
    payload = make_tx().model_dump()
    r = client.post("/detect/fraud", json=payload, headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "is_fraud" in data
    assert "fraud_score" in data
    assert 0.0 <= data["fraud_score"] <= 1.0


# ─── Prévision revenus ────────────────────────────────────────────────────────
def test_forecast_requires_minimum_history():
    payload = {
        "site_id": "site-1",
        "historical_revenue": [{"date": "2024-01-01", "revenue": 100000}],
        "horizon_days": 30
    }
    r = client.post("/forecast/revenue", json=payload, headers=HEADERS)
    assert r.status_code == 400


def test_forecast_returns_correct_horizon():
    history = [{"date": f"2024-01-{i+1:02d}", "revenue": 150000 + i * 1000} for i in range(14)]
    payload = {"site_id": "site-1", "historical_revenue": history, "horizon_days": 7}
    r = client.post("/forecast/revenue", json=payload, headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert len(data["forecast"]) == 7
    assert data["trend"] in ["growing", "stable", "declining"]

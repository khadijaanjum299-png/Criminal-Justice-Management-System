"""Unit tests for notification helpers (no DB, no network)."""
from services.notification_service import normalize_phone_e164, sms_body, user_sms_enabled


def test_normalize_phone_blank():
    assert normalize_phone_e164(None) is None
    assert normalize_phone_e164("") is None
    assert normalize_phone_e164("   ") is None


def test_normalize_e164_with_plus():
    assert normalize_phone_e164("+15551234567") == "+15551234567"


def test_sms_body_includes_fir_and_status():
    b = sms_body("FIR-2026-ABC", "Judgment Issued", "Verdict: Guilty")
    assert "FIR-2026-ABC" in b
    assert "Judgment Issued" in b
    assert "Guilty" in b


def test_sms_body_truncates_summary():
    long = "w" * 500
    b = sms_body("FIR-1", "Closed", long, max_summary=40)
    assert "…" in b or len(b) < len(long) + 80


def test_user_sms_enabled_defaults():
    assert user_sms_enabled({}) is True
    assert user_sms_enabled({"notify_sms_enabled": True}) is True
    assert user_sms_enabled({"notify_sms_enabled": False}) is False

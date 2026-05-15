"""Backend tests for AI Criminal Case Management System."""
import os
import io
import time
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://evidence-chain-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN = {"email": "admin@cjs.gov", "password": "Admin@123"}
CITIZEN = {"email": f"citizen_{int(time.time())}@test.com", "password": "Citizen@123", "name": "Cit User", "role": "citizen"}
POLICE = {"email": f"police_{int(time.time())}@test.com", "password": "Police@123", "name": "Pol User", "role": "police"}
FORENSIC = {"email": f"forensic_{int(time.time())}@test.com", "password": "Forensic@123", "name": "Forensic User", "role": "forensic"}

state = {}


def _session():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_sess():
    s = _session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def citizen_sess():
    s = _session()
    r = s.post(f"{API}/auth/register", json=CITIZEN, timeout=30)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def police_sess():
    s = _session()
    r = s.post(f"{API}/auth/register", json=POLICE, timeout=30)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def forensic_sess():
    s = _session()
    r = s.post(f"{API}/auth/register", json=FORENSIC, timeout=30)
    assert r.status_code == 200, r.text
    return s


# ---------- Auth ----------
def test_admin_login(admin_sess):
    r = admin_sess.get(f"{API}/auth/me", timeout=30)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    assert r.json()["email"] == "admin@cjs.gov"


def test_register_duplicate(citizen_sess):
    r = citizen_sess.post(f"{API}/auth/register", json=CITIZEN, timeout=30)
    assert r.status_code == 400


def test_login_bad_pwd():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=30)
    assert r.status_code == 401


def test_me_citizen(citizen_sess):
    r = citizen_sess.get(f"{API}/auth/me", timeout=30)
    assert r.status_code == 200
    assert r.json()["role"] == "citizen"


def test_register_assigns_wallet_id():
    s = _session()
    payload = {
        "email": f"wallet_{int(time.time())}@test.com",
        "password": "Wallet@123",
        "name": "Wallet User",
        "role": "citizen",
    }
    r = s.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "wallet_id" in d
    assert isinstance(d["wallet_id"], str)
    assert len(d["wallet_id"]) == 64


def test_get_user_wallet_matches_me(citizen_sess):
    me = citizen_sess.get(f"{API}/auth/me", timeout=30)
    assert me.status_code == 200, me.text
    me_wallet = me.json().get("wallet_id")
    assert me_wallet

    r = citizen_sess.get(f"{API}/user/wallet", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["wallet_id"] == me_wallet
    assert len(d["wallet_id"]) == 64


# ---------- FIR ----------
def test_fir_create_citizen(citizen_sess):
    r = citizen_sess.post(f"{API}/firs", json={
        "crime_type": "theft", "location": "Lahore", "description": "test FIR"
    }, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "FIR Registered"
    assert data["fir_id"].startswith("FIR-")
    state["fir_id"] = data["fir_id"]


def test_fir_list_citizen_scoped(citizen_sess):
    r = citizen_sess.get(f"{API}/firs", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert all(f["citizen_id"] for f in data)
    assert any(f["fir_id"] == state["fir_id"] for f in data)


def test_fir_detail(citizen_sess):
    r = citizen_sess.get(f"{API}/firs/{state['fir_id']}", timeout=30)
    assert r.status_code == 200
    assert "status_history" in r.json()


def test_fir_status_citizen_forbidden(citizen_sess):
    r = citizen_sess.patch(f"{API}/firs/{state['fir_id']}/status", json={"status": "Approved"}, timeout=30)
    assert r.status_code == 403


def test_fir_status_police(police_sess):
    r = police_sess.patch(f"{API}/firs/{state['fir_id']}/status",
                          json={"status": "Under Investigation", "note": "review"}, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "Under Investigation"


def test_fir_list_police_sees_all(police_sess):
    r = police_sess.get(f"{API}/firs", timeout=30)
    assert r.status_code == 200
    assert any(f["fir_id"] == state["fir_id"] for f in r.json())


# ---------- Suspects ----------
def test_suspect_citizen_forbidden(citizen_sess):
    r = citizen_sess.get(f"{API}/suspects", timeout=30)
    assert r.status_code == 403


def test_suspect_create_police(police_sess):
    r = police_sess.post(f"{API}/suspects", json={"name": "TEST_Suspect", "age": 30, "risk_level": "high"}, timeout=30)
    assert r.status_code == 200, r.text
    state["suspect_id"] = r.json()["suspect_id"]


def test_suspect_list(police_sess):
    r = police_sess.get(f"{API}/suspects", timeout=30)
    assert r.status_code == 200
    assert any(s["suspect_id"] == state["suspect_id"] for s in r.json())


def test_suspect_citizen_create_forbidden(citizen_sess):
    r = citizen_sess.post(f"{API}/suspects", json={"name": "X"}, timeout=30)
    assert r.status_code == 403


# ---------- Evidence ----------
def test_evidence_upload(police_sess):
    content = b"evidence-bytes-ABC-" + os.urandom(8)
    files = {"file": ("ev.txt", io.BytesIO(content), "text/plain")}
    data = {"case_id": state["fir_id"], "evidence_type": "document", "description": "test"}
    r = police_sess.post(f"{API}/evidence", files=files, data=data, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["evidence_id"].startswith("EVD-")
    assert "cid" in d
    assert d["file_name"] == "ev.txt"
    assert d["file_type"] == "text/plain"
    assert "timestamp" in d
    state["evidence_id"] = d["evidence_id"]
    state["stored_filename"] = d["stored_filename"]
    state["original_hash"] = d["sha256_hash"]


def test_ipfs_upload_endpoint(police_sess):
    content = b"ipfs-only-upload-" + os.urandom(8)
    files = {"file": ("ipfs-test.txt", io.BytesIO(content), "text/plain")}
    r = police_sess.post(f"{API}/ipfs/upload", files=files, timeout=30)
    # Compatible with setups where IPFS daemon is not available.
    assert r.status_code in (200, 502), r.text
    if r.status_code == 200:
        d = r.json()
        assert "cid" in d
        assert d["file_name"] == "ipfs-test.txt"


def test_evidence_verify_ok(police_sess):
    r = police_sess.get(f"{API}/evidence/{state['evidence_id']}/verify", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["current_hash"] == state["original_hash"]


def test_evidence_verify_compat_endpoint(police_sess):
    r = police_sess.get(f"{API}/evidence/verify/{state['evidence_id']}", timeout=30)
    assert r.status_code == 200
    assert "ok" in r.json()


def test_evidence_tampering():
    """Modify file on disk and verify returns ok=false."""
    path = f"/app/backend/uploads/{state['stored_filename']}"
    assert os.path.exists(path)
    with open(path, "ab") as f:
        f.write(b"TAMPERED")
    # Re-verify (use admin session)
    s = _session()
    assert s.post(f"{API}/auth/login", json=ADMIN, timeout=30).status_code == 200
    r = s.get(f"{API}/evidence/{state['evidence_id']}/verify", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is False
    assert "Tampered" in d["message"] or "Hash Mismatch" in d["message"]


def test_evidence_download(police_sess):
    r = police_sess.get(f"{API}/evidence/{state['evidence_id']}/download", timeout=30)
    assert r.status_code == 200
    assert len(r.content) > 0


# ---------- Forensic ----------
def test_forensic_add(forensic_sess):
    r = forensic_sess.post(f"{API}/forensic", json={"case_id": state["fir_id"], "notes": "test forensic"}, timeout=30)
    assert r.status_code == 200, r.text


def test_forensic_citizen_forbidden(citizen_sess):
    r = citizen_sess.get(f"{API}/forensic", timeout=30)
    assert r.status_code == 403


# ---------- Smart contract validation ----------
def test_smart_contract_validate_payload_contract(police_sess):
    payload = {
        "evidence_id": state["evidence_id"],
        "approval_count": 2,
        "hash_value": state["original_hash"],
    }
    r = police_sess.post(f"{API}/smart-contract/validate", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("accepted", "status", "hash_match", "approvals_valid", "provided_approval_count"):
        assert k in d
    assert d["provided_approval_count"] == payload["approval_count"]


def test_smart_contract_validate_rejects_legacy_field_names(police_sess):
    legacy_payload = {
        "evidence_id": state["evidence_id"],
        "approvals": 2,
        "sha256_hash": state["original_hash"],
    }
    r = police_sess.post(f"{API}/smart-contract/validate", json=legacy_payload, timeout=30)
    assert r.status_code == 422


def test_smart_contract_validate_invalid_hash(police_sess):
    payload = {
        "evidence_id": state["evidence_id"],
        "approval_count": 2,
        "hash_value": "not-a-valid-sha256",
    }
    r = police_sess.post(f"{API}/smart-contract/validate", json=payload, timeout=30)
    assert r.status_code == 400, r.text
    assert "Invalid hash" in r.text


# ---------- Blockchain ----------
def test_blockchain_integrity(admin_sess):
    r = admin_sess.get(f"{API}/blockchain", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["integrity_ok"] is True
    assert d["count"] >= 3
    # Verify chaining
    blocks = d["blocks"]
    if blocks:
        assert "action_type" in blocks[-1]
    for i in range(1, len(blocks)):
        assert blocks[i]["previous_hash"] == blocks[i - 1]["current_hash"]


# ---------- Analytics ----------
def test_analytics_stats(admin_sess):
    r = admin_sess.get(f"{API}/analytics/stats", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_firs", "by_crime_type", "by_location", "by_month", "pending_appeals", "total_appeals"):
        assert k in d


# ---------- Activity logs ----------
def test_activity_logs_admin(admin_sess):
    r = admin_sess.get(f"{API}/activity-logs", timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) > 0


def test_activity_logs_citizen_forbidden(citizen_sess):
    r = citizen_sess.get(f"{API}/activity-logs", timeout=30)
    assert r.status_code == 403


# ---------- Users (admin) ----------
def test_users_list_admin(admin_sess):
    r = admin_sess.get(f"{API}/users", timeout=30)
    assert r.status_code == 200
    users = r.json()
    assert any(u["email"] == CITIZEN["email"] for u in users)
    # find citizen id for update/delete tests
    for u in users:
        if u["email"] == CITIZEN["email"]:
            state["citizen_uid"] = u["id"]


def test_users_list_citizen_forbidden(citizen_sess):
    r = citizen_sess.get(f"{API}/users", timeout=30)
    assert r.status_code == 403


def test_user_update_admin(admin_sess):
    uid = state["citizen_uid"]
    r = admin_sess.patch(f"{API}/users/{uid}", json={"trust_score": 88.5}, timeout=30)
    assert r.status_code == 200
    assert r.json()["trust_score"] == 88.5


def test_user_delete_admin(admin_sess):
    # create a throwaway user then delete
    tmp_email = f"tmp_{int(time.time())}@test.com"
    s = _session()
    r = s.post(f"{API}/auth/register", json={"email": tmp_email, "password": "Temp@123", "name": "Tmp", "role": "citizen"}, timeout=30)
    assert r.status_code == 200
    uid = r.json()["id"]
    r2 = admin_sess.delete(f"{API}/users/{uid}", timeout=30)
    assert r2.status_code == 200
    assert r2.json().get("ok") is True


# ---------- Reports ----------
def test_crime_report(admin_sess):
    r = admin_sess.get(f"{API}/reports/crime", timeout=30)
    assert r.status_code == 200
    assert "AI CRIMINAL CASE MANAGEMENT SYSTEM" in r.json()["report"]

from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import hashlib
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------- Setup ----------------
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AI Criminal Case Management System")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ROLES = {"citizen", "police", "forensic", "admin"}

# ---------------- Helpers ----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

def verify_password(pwd: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pwd.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(uid: str, email: str, role: str) -> str:
    payload = {
        "sub": uid, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def create_refresh_token(uid: str) -> str:
    payload = {
        "sub": uid,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

# ---------------- Auth Dependency ----------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def require_roles(*roles: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles and user["role"] != "admin":
            raise HTTPException(403, f"Requires one of roles: {roles}")
        return user
    return checker

# ---------------- Activity Log ----------------
async def log_activity(user_email: str, action: str, details: str = ""):
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_email": user_email,
        "action": action,
        "details": details,
        "timestamp": now_iso(),
    })

# ---------------- Blockchain ----------------
async def append_block(case_id: str, action: str, data: dict, user_email: str):
    last = await db.blockchain.find_one({}, sort=[("index", -1)], projection={"_id": 0})
    prev_hash = last["current_hash"] if last else "0" * 64
    index = (last["index"] + 1) if last else 0
    timestamp = now_iso()
    block_body = f"{index}|{timestamp}|{case_id}|{action}|{str(data)}|{prev_hash}|{user_email}"
    current_hash = sha256_hex(block_body.encode())
    block = {
        "id": str(uuid.uuid4()),
        "index": index,
        "timestamp": timestamp,
        "case_id": case_id,
        "action": action,
        "data": data,
        "user_email": user_email,
        "previous_hash": prev_hash,
        "current_hash": current_hash,
    }
    await db.blockchain.insert_one(block)
    return block

# ---------------- Pydantic Models ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    cnic: Optional[str] = ""
    phone: Optional[str] = ""
    role: str = "citizen"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class FIRCreate(BaseModel):
    crime_type: str
    location: str
    description: str
    incident_date: Optional[str] = None

class FIRStatusUpdate(BaseModel):
    status: str
    assigned_officer_id: Optional[str] = None
    note: Optional[str] = ""

class SuspectCreate(BaseModel):
    name: str
    age: Optional[int] = None
    cnic: Optional[str] = ""
    address: Optional[str] = ""
    crime_history: Optional[str] = ""
    associated_cases: Optional[List[str]] = []
    risk_level: str = "low"  # low, medium, high

class ForensicCreate(BaseModel):
    case_id: str
    call_logs: Optional[str] = ""
    emails: Optional[str] = ""
    ip_addresses: Optional[str] = ""
    device_ids: Optional[str] = ""
    browser_history: Optional[str] = ""
    social_media: Optional[str] = ""
    deleted_files: Optional[str] = ""
    notes: Optional[str] = ""

class UserUpdate(BaseModel):
    trust_score: Optional[float] = None
    role: Optional[str] = None

# ---------------- Auth Routes ----------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if body.role not in ROLES:
        raise HTTPException(400, "Invalid role")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "cnic": body.cnic,
        "phone": body.phone,
        "role": body.role,
        "trust_score": 100.0,
        "complaints": 0,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(uid, email, body.role)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await log_activity(email, "register", f"role={body.role}")
    user_out = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    return user_out

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    access = create_access_token(user["id"], email, user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    await log_activity(email, "login")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    await log_activity(user["email"], "logout")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ---------------- FIR Routes ----------------
FIR_STATUSES = [
    "FIR Registered", "Approved", "Under Investigation",
    "Evidence Collected", "Forensic Review", "Sent to Court",
    "Hearing Scheduled", "Judgment Issued", "Closed", "Rejected"
]

@api.post("/firs")
async def create_fir(body: FIRCreate, user: dict = Depends(get_current_user)):
    fir_id = f"FIR-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    doc = {
        "id": str(uuid.uuid4()),
        "fir_id": fir_id,
        "citizen_id": user["id"],
        "citizen_name": user["name"],
        "cnic": user.get("cnic", ""),
        "crime_type": body.crime_type,
        "location": body.location,
        "description": body.description,
        "incident_date": body.incident_date or now_iso(),
        "status": "FIR Registered",
        "assigned_officer_id": None,
        "assigned_officer_name": None,
        "status_history": [{"status": "FIR Registered", "at": now_iso(), "by": user["email"], "note": ""}],
        "created_at": now_iso(),
    }
    await db.firs.insert_one(doc)
    await append_block(fir_id, "FIR_CREATED", {"crime_type": body.crime_type, "location": body.location}, user["email"])
    await log_activity(user["email"], "fir_create", fir_id)
    doc.pop("_id", None)
    return doc

@api.get("/firs")
async def list_firs(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "citizen":
        query = {"citizen_id": user["id"]}
    cursor = db.firs.find(query, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)

@api.get("/firs/{fir_id}")
async def get_fir(fir_id: str, user: dict = Depends(get_current_user)):
    fir = await db.firs.find_one({"fir_id": fir_id}, {"_id": 0})
    if not fir:
        raise HTTPException(404, "FIR not found")
    if user["role"] == "citizen" and fir["citizen_id"] != user["id"]:
        raise HTTPException(403, "Not allowed")
    return fir

@api.patch("/firs/{fir_id}/status")
async def update_fir_status(fir_id: str, body: FIRStatusUpdate, user: dict = Depends(require_roles("police", "forensic"))):
    if body.status not in FIR_STATUSES:
        raise HTTPException(400, "Invalid status")
    fir = await db.firs.find_one({"fir_id": fir_id})
    if not fir:
        raise HTTPException(404, "FIR not found")
    updates = {
        "status": body.status,
        "status_history": fir.get("status_history", []) + [
            {"status": body.status, "at": now_iso(), "by": user["email"], "note": body.note or ""}
        ],
    }
    if body.assigned_officer_id:
        officer = await db.users.find_one({"id": body.assigned_officer_id})
        updates["assigned_officer_id"] = body.assigned_officer_id
        updates["assigned_officer_name"] = officer["name"] if officer else None
    await db.firs.update_one({"fir_id": fir_id}, {"$set": updates})
    await append_block(fir_id, "FIR_STATUS_CHANGE", {"status": body.status}, user["email"])
    await log_activity(user["email"], "fir_status_update", f"{fir_id} → {body.status}")
    updated = await db.firs.find_one({"fir_id": fir_id}, {"_id": 0})
    return updated

# ---------------- Suspects ----------------
@api.post("/suspects")
async def create_suspect(body: SuspectCreate, user: dict = Depends(require_roles("police", "forensic"))):
    doc = {
        "id": str(uuid.uuid4()),
        "suspect_id": f"SUS-{str(uuid.uuid4())[:6].upper()}",
        **body.model_dump(),
        "created_by": user["email"],
        "created_at": now_iso(),
    }
    await db.suspects.insert_one(doc)
    await log_activity(user["email"], "suspect_add", doc["suspect_id"])
    doc.pop("_id", None)
    return doc

@api.get("/suspects")
async def list_suspects(user: dict = Depends(get_current_user)):
    if user["role"] == "citizen":
        raise HTTPException(403, "Not allowed")
    return await db.suspects.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

# ---------------- Evidence (with file upload) ----------------
@api.post("/evidence")
async def upload_evidence(
    case_id: str = Form(...),
    evidence_type: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    user: dict = Depends(require_roles("police", "forensic")),
):
    content = await file.read()
    file_hash = sha256_hex(content)
    eid = str(uuid.uuid4())
    ext = Path(file.filename or "").suffix
    stored_name = f"{eid}{ext}"
    (UPLOAD_DIR / stored_name).write_bytes(content)
    doc = {
        "id": eid,
        "evidence_id": f"EVD-{str(uuid.uuid4())[:6].upper()}",
        "case_id": case_id,
        "type": evidence_type,
        "description": description,
        "original_filename": file.filename,
        "stored_filename": stored_name,
        "size_bytes": len(content),
        "sha256_hash": file_hash,
        "uploaded_by": user["email"],
        "uploaded_at": now_iso(),
        "tampered": False,
    }
    await db.evidence.insert_one(doc)
    await append_block(case_id, "EVIDENCE_UPLOAD", {"evidence_id": doc["evidence_id"], "hash": file_hash}, user["email"])
    await log_activity(user["email"], "evidence_upload", doc["evidence_id"])
    doc.pop("_id", None)
    return doc

@api.get("/evidence")
async def list_evidence(case_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if case_id:
        query["case_id"] = case_id
    if user["role"] == "citizen":
        # citizens only see evidence for their own FIRs
        my_firs = await db.firs.find({"citizen_id": user["id"]}, {"fir_id": 1, "_id": 0}).to_list(500)
        my_ids = [f["fir_id"] for f in my_firs]
        query["case_id"] = {"$in": my_ids}
    return await db.evidence.find(query, {"_id": 0}).sort("uploaded_at", -1).to_list(500)

@api.get("/evidence/{evidence_id}/verify")
async def verify_evidence(evidence_id: str, user: dict = Depends(get_current_user)):
    ev = await db.evidence.find_one({"evidence_id": evidence_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Evidence not found")
    path = UPLOAD_DIR / ev["stored_filename"]
    if not path.exists():
        return {"ok": False, "reason": "file_missing", "original_hash": ev["sha256_hash"]}
    current_hash = sha256_hex(path.read_bytes())
    ok = current_hash == ev["sha256_hash"]
    if not ok:
        await db.evidence.update_one({"evidence_id": evidence_id}, {"$set": {"tampered": True}})
        await log_activity(user["email"], "evidence_tampered_detected", evidence_id)
    return {
        "ok": ok,
        "evidence_id": evidence_id,
        "original_hash": ev["sha256_hash"],
        "current_hash": current_hash,
        "message": "Evidence Verified Successfully - No Tampering Detected" if ok else "Warning: Evidence May Be Tampered - Hash Mismatch Detected",
    }

@api.get("/evidence/{evidence_id}/download")
async def download_evidence(evidence_id: str, user: dict = Depends(get_current_user)):
    ev = await db.evidence.find_one({"evidence_id": evidence_id})
    if not ev:
        raise HTTPException(404, "Not found")
    path = UPLOAD_DIR / ev["stored_filename"]
    if not path.exists():
        raise HTTPException(404, "File missing")
    return FileResponse(str(path), filename=ev["original_filename"])

# ---------------- Forensic ----------------
@api.post("/forensic")
async def add_forensic(body: ForensicCreate, user: dict = Depends(require_roles("forensic"))):
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "uploaded_by": user["email"],
        "uploaded_at": now_iso(),
    }
    await db.forensic_records.insert_one(doc)
    await append_block(body.case_id, "FORENSIC_ADD", {"case_id": body.case_id}, user["email"])
    await log_activity(user["email"], "forensic_add", body.case_id)
    doc.pop("_id", None)
    return doc

@api.get("/forensic")
async def list_forensic(case_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] == "citizen":
        raise HTTPException(403, "Not allowed")
    query = {"case_id": case_id} if case_id else {}
    return await db.forensic_records.find(query, {"_id": 0}).sort("uploaded_at", -1).to_list(500)

# ---------------- Blockchain ----------------
@api.get("/blockchain")
async def list_blockchain(user: dict = Depends(get_current_user)):
    blocks = await db.blockchain.find({}, {"_id": 0}).sort("index", 1).to_list(1000)
    # verify integrity
    integrity_ok = True
    for i, b in enumerate(blocks):
        body = f"{b['index']}|{b['timestamp']}|{b['case_id']}|{b['action']}|{str(b['data'])}|{b['previous_hash']}|{b['user_email']}"
        if sha256_hex(body.encode()) != b["current_hash"]:
            integrity_ok = False
            break
        if i > 0 and blocks[i-1]["current_hash"] != b["previous_hash"]:
            integrity_ok = False
            break
    return {"integrity_ok": integrity_ok, "count": len(blocks), "blocks": blocks}

# ---------------- Activity Logs ----------------
@api.get("/activity-logs")
async def list_activity(user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "police"):
        raise HTTPException(403, "Not allowed")
    return await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(500).to_list(500)

# ---------------- Analytics ----------------
@api.get("/analytics/stats")
async def analytics(user: dict = Depends(get_current_user)):
    firs = await db.firs.find({}, {"_id": 0}).to_list(2000)
    total = len(firs)
    closed = sum(1 for f in firs if f["status"] == "Closed")
    open_cases = total - closed
    by_type = {}
    by_location = {}
    by_month = {}
    for f in firs:
        by_type[f["crime_type"]] = by_type.get(f["crime_type"], 0) + 1
        by_location[f["location"]] = by_location.get(f["location"], 0) + 1
        m = f["created_at"][:7]
        by_month[m] = by_month.get(m, 0) + 1
    top_suspects = await db.suspects.find({}, {"_id": 0}).sort("risk_level", -1).limit(10).to_list(10)
    return {
        "total_firs": total,
        "open_cases": open_cases,
        "closed_cases": closed,
        "total_evidence": await db.evidence.count_documents({}),
        "total_suspects": await db.suspects.count_documents({}),
        "tampered_evidence": await db.evidence.count_documents({"tampered": True}),
        "by_crime_type": [{"name": k, "value": v} for k, v in by_type.items()],
        "by_location": [{"name": k, "value": v} for k, v in by_location.items()],
        "by_month": [{"name": k, "value": v} for k, v in sorted(by_month.items())],
        "top_suspects": top_suspects,
    }

# ---------------- Users (Admin) ----------------
@api.get("/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)

@api.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, user: dict = Depends(require_roles("admin"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "role" in updates and updates["role"] not in ROLES:
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"id": user_id}, {"$set": updates})
    await log_activity(user["email"], "user_update", user_id)
    return await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    await db.users.delete_one({"id": user_id})
    await log_activity(user["email"], "user_delete", user_id)
    return {"ok": True}

# ---------------- Officers list (for assigning) ----------------
@api.get("/officers")
async def list_officers(user: dict = Depends(require_roles("police", "forensic"))):
    return await db.users.find(
        {"role": {"$in": ["police", "forensic"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(200)

# ---------------- Report ----------------
@api.get("/reports/crime")
async def crime_report(user: dict = Depends(get_current_user)):
    total = await db.firs.count_documents({})
    closed = await db.firs.count_documents({"status": "Closed"})
    evidence_count = await db.evidence.count_documents({})
    suspects_count = await db.suspects.count_documents({})
    tampered = await db.evidence.count_documents({"tampered": True})
    text = (
        "=== AI CRIMINAL CASE MANAGEMENT SYSTEM ===\n"
        f"Generated: {now_iso()}\n"
        f"Generated By: {user['email']} ({user['role']})\n"
        "\n--- SUMMARY ---\n"
        f"Total FIRs: {total}\n"
        f"Closed Cases: {closed}\n"
        f"Open Cases: {total - closed}\n"
        f"Evidence Items: {evidence_count}\n"
        f"Suspects: {suspects_count}\n"
        f"Tampered Evidence Detected: {tampered}\n"
    )
    return {"report": text}

# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.firs.create_index("fir_id", unique=True)
    await db.blockchain.create_index("index")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@cjs.gov")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "System Admin",
            "cnic": "",
            "phone": "",
            "role": "admin",
            "trust_score": 100.0,
            "complaints": 0,
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ---------------- Middleware & mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "*")] + ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

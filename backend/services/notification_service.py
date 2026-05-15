"""
SMS (Twilio or mock) and optional SMTP email for case lifecycle events.
Logs every attempt to MongoDB collection `notification_logs`.
Environment:
  SMS_PROVIDER=twilio|mock (default mock)
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
  SMS_DEFAULT_DIAL_PREFIX — e.g. +92 if user phone is stored without country code
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM — optional email
"""
from __future__ import annotations

import asyncio
import logging
import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import TYPE_CHECKING, Any, Dict, List, Optional

import requests

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

SMS_PROVIDER = (os.getenv("SMS_PROVIDER") or "mock").strip().lower()
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM = os.getenv("TWILIO_FROM_NUMBER", "").strip()
SMS_DEFAULT_DIAL_PREFIX = os.getenv("SMS_DEFAULT_DIAL_PREFIX", "").strip()

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587") or "587")
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASS = os.getenv("SMTP_PASS", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", "").strip()


def now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_phone_e164(phone: Optional[str]) -> Optional[str]:
    if not phone or not str(phone).strip():
        return None
    raw = str(phone).strip()
    digits = "".join(c for c in raw if c.isdigit() or c == "+")
    if not digits:
        return None
    if digits.startswith("+"):
        return digits if len(digits) >= 11 else None
    if SMS_DEFAULT_DIAL_PREFIX:
        prefix = SMS_DEFAULT_DIAL_PREFIX.strip()
        if not prefix.startswith("+"):
            prefix = "+" + prefix.lstrip("+")
        return prefix + digits.lstrip("0")
    return None


def sms_body(fir_id: str, case_status: str, summary: str, max_summary: int = 280) -> str:
    fir = fir_id or "—"
    st = (case_status or "—").strip()
    summ = (summary or "").strip().replace("\n", " ")
    if len(summ) > max_summary:
        summ = summ[: max_summary - 1] + "…"
    return f"CJS | FIR {fir} | {st} | {summ}".strip()[:1600]


def _mask_phone(p: str) -> str:
    if not p or len(p) < 8:
        return "***"
    return p[:4] + "…" + p[-3:]


async def _insert_log(db: AsyncIOMotorDatabase, doc: Dict[str, Any]) -> None:
    row = {**doc, "id": str(uuid.uuid4()), "created_at": now_iso()}
    await db.notification_logs.insert_one(row)


async def send_sms(
    db: AsyncIOMotorDatabase,
    *,
    to_e164: str,
    body: str,
    event: str,
    case_id: Optional[str],
    fir_id: Optional[str],
    recipient_user_id: Optional[str],
    recipient_email: Optional[str],
) -> None:
    log_base: Dict[str, Any] = {
        "channel": "sms",
        "event": event,
        "case_id": case_id,
        "fir_id": fir_id,
        "recipient_user_id": recipient_user_id,
        "recipient_email": recipient_email,
        "to_phone_display": _mask_phone(to_e164),
        "message_preview": (body or "")[:500],
    }
    use_twilio = (
        SMS_PROVIDER == "twilio"
        and TWILIO_ACCOUNT_SID
        and TWILIO_AUTH_TOKEN
        and TWILIO_FROM
    )
    if SMS_PROVIDER == "twilio" and not use_twilio:
        await _insert_log(
            db,
            {**log_base, "provider": "twilio", "status": "failed", "error": "Twilio credentials incomplete"},
        )
        logger.warning("SMS_PROVIDER=twilio but TWILIO_* env incomplete; SMS not sent")
        return

    if use_twilio:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
            auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

            def _post() -> requests.Response:
                return requests.post(
                    url,
                    auth=auth,
                    data={"To": to_e164, "From": TWILIO_FROM, "Body": (body or "")[:1600]},
                    timeout=25,
                )

            r = await asyncio.to_thread(_post)
            if r.status_code >= 300:
                await _insert_log(
                    db,
                    {**log_base, "provider": "twilio", "status": "failed", "error": (r.text or "")[:800]},
                )
                logger.error("Twilio SMS failed: %s %s", r.status_code, r.text)
                return
            sid = None
            try:
                sid = (r.json() or {}).get("sid")
            except Exception:
                pass
            await _insert_log(
                db,
                {**log_base, "provider": "twilio", "status": "sent", "external_sid": sid, "error": None},
            )
            logger.info("Twilio SMS sent event=%s to=%s", event, _mask_phone(to_e164))
            return
        except Exception as e:
            await _insert_log(
                db,
                {**log_base, "provider": "twilio", "status": "failed", "error": str(e)[:800]},
            )
            logger.exception("Twilio SMS error")
            return

    logger.info("[MOCK SMS] event=%s to=%s body=%s", event, to_e164, (body or "")[:240])
    await _insert_log(db, {**log_base, "provider": "mock", "status": "sent", "error": None})


async def send_email_case(
    db: AsyncIOMotorDatabase,
    *,
    to_email: str,
    subject: str,
    text_body: str,
    event: str,
    case_id: Optional[str],
    fir_id: Optional[str],
    recipient_user_id: Optional[str],
) -> None:
    log_base: Dict[str, Any] = {
        "channel": "email",
        "event": event,
        "case_id": case_id,
        "fir_id": fir_id,
        "recipient_user_id": recipient_user_id,
        "recipient_email": to_email,
        "to_phone_display": None,
        "message_preview": (text_body or "")[:500],
    }
    if not SMTP_HOST or not SMTP_FROM:
        await _insert_log(
            db,
            {**log_base, "provider": "smtp", "status": "skipped_no_smtp", "error": None},
        )
        logger.info("Email skipped (SMTP_HOST/SMTP_FROM not set) to=%s", to_email)
        return

    try:

        def _send() -> None:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = SMTP_FROM
            msg["To"] = to_email
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as s:
                if SMTP_USER:
                    s.starttls()
                    s.login(SMTP_USER, SMTP_PASS or "")
                s.sendmail(SMTP_FROM, [to_email], msg.as_string())

        await asyncio.to_thread(_send)
        await _insert_log(db, {**log_base, "provider": "smtp", "status": "sent", "error": None})
    except Exception as e:
        await _insert_log(db, {**log_base, "provider": "smtp", "status": "failed", "error": str(e)[:800]})
        logger.exception("SMTP send failed")


def user_sms_enabled(user: dict) -> bool:
    return user.get("notify_sms_enabled") is not False


async def _queue_sms_for_user(
    db: AsyncIOMotorDatabase,
    user: dict,
    *,
    body: str,
    event: str,
    case_id: Optional[str],
    fir_id: Optional[str],
) -> None:
    if not user_sms_enabled(user):
        await _insert_log(
            db,
            {
                "channel": "sms",
                "event": event,
                "case_id": case_id,
                "fir_id": fir_id,
                "recipient_user_id": user.get("id"),
                "recipient_email": user.get("email"),
                "to_phone_display": None,
                "message_preview": (body or "")[:500],
                "provider": "none",
                "status": "skipped_disabled",
                "error": None,
            },
        )
        return
    phone = normalize_phone_e164(user.get("phone"))
    if not phone:
        await _insert_log(
            db,
            {
                "channel": "sms",
                "event": event,
                "case_id": case_id,
                "fir_id": fir_id,
                "recipient_user_id": user.get("id"),
                "recipient_email": user.get("email"),
                "to_phone_display": None,
                "message_preview": (body or "")[:500],
                "provider": "none",
                "status": "skipped_no_phone",
                "error": None,
            },
        )
        return
    await send_sms(
        db,
        to_e164=phone,
        body=body,
        event=event,
        case_id=case_id,
        fir_id=fir_id,
        recipient_user_id=user.get("id"),
        recipient_email=user.get("email"),
    )


async def _queue_email_for_user(
    db: AsyncIOMotorDatabase,
    user: dict,
    *,
    subject: str,
    text_body: str,
    event: str,
    case_id: Optional[str],
    fir_id: Optional[str],
) -> None:
    em = (user.get("email") or "").strip()
    if not em:
        return
    await send_email_case(
        db,
        to_email=em,
        subject=subject,
        text_body=text_body,
        event=event,
        case_id=case_id,
        fir_id=fir_id,
        recipient_user_id=user.get("id"),
    )


async def gather_stakeholder_users(db: AsyncIOMotorDatabase, case_doc: dict) -> List[dict]:
    seen: set = set()
    out: List[dict] = []
    cid = case_doc.get("citizen_id")
    if cid:
        u = await db.users.find_one({"id": cid}, {"_id": 0, "password_hash": 0})
        if u and u.get("id") not in seen:
            seen.add(u["id"])
            out.append(u)
    inv = (case_doc.get("assigned_investigator_email") or "").strip().lower()
    if inv:
        u = await db.users.find_one({"email": inv}, {"_id": 0, "password_hash": 0})
        if u and u.get("id") not in seen:
            seen.add(u["id"])
            out.append(u)
    return out


async def notify_verdict_issued(db: AsyncIOMotorDatabase, case_doc: dict, judgment: dict) -> None:
    fir_id = case_doc.get("fir_id") or "—"
    status = case_doc.get("status") or "Judgment Issued"
    verdict = judgment.get("verdict") or "—"
    parts = [f"Verdict: {verdict}"]
    dn = (judgment.get("decision_note") or "").strip()
    if dn:
        parts.append(dn[:160])
    hn = (judgment.get("hearing_notes") or "").strip()
    if hn:
        parts.append(f"Hearing notes: {hn[:120]}")
    summ = " ".join(parts)
    body = sms_body(fir_id, status, summ)
    subj = f"[CJS] Judgment issued — FIR {fir_id}"
    text = f"FIR: {fir_id}\nCase status: {status}\n\n{summ}\n"
    users = await gather_stakeholder_users(db, case_doc)
    for u in users:
        await _queue_sms_for_user(db, u, body=body, event="verdict_issued", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))
        await _queue_email_for_user(db, u, subject=subj, text_body=text, event="verdict_issued", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))


async def notify_hearing_scheduled(db: AsyncIOMotorDatabase, case_doc: dict, hearing_date: str, note: str) -> None:
    fir_id = case_doc.get("fir_id") or "—"
    status = case_doc.get("status") or "Hearing Scheduled"
    summ = f"Hearing {hearing_date}. {(note or '').strip()}".strip()
    body = sms_body(fir_id, status, summ)
    subj = f"[CJS] Hearing scheduled — FIR {fir_id}"
    text = f"FIR: {fir_id}\nCase status: {status}\n\n{summ}\n"
    users = await gather_stakeholder_users(db, case_doc)
    for u in users:
        await _queue_sms_for_user(db, u, body=body, event="hearing_scheduled", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))
        await _queue_email_for_user(db, u, subject=subj, text_body=text, event="hearing_scheduled", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))


async def notify_case_closed(db: AsyncIOMotorDatabase, case_doc: dict, close_note: str) -> None:
    fir_id = case_doc.get("fir_id") or "—"
    status = case_doc.get("status") or "Closed"
    summ = (close_note or "").strip() or "Case closed."
    body = sms_body(fir_id, status, summ)
    subj = f"[CJS] Case closed — FIR {fir_id}"
    text = f"FIR: {fir_id}\nCase status: {status}\n\n{summ}\n"
    users = await gather_stakeholder_users(db, case_doc)
    for u in users:
        await _queue_sms_for_user(db, u, body=body, event="case_closed", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))
        await _queue_email_for_user(db, u, subject=subj, text_body=text, event="case_closed", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))


async def notify_higher_court_reopen_broadcast(db: AsyncIOMotorDatabase, case_doc: dict, appeal_id: Optional[str]) -> None:
    """Notify officials (excluding the citizen) that a case was reopened after a higher-court appeal."""
    fir_id = case_doc.get("fir_id") or "—"
    status = case_doc.get("status") or "REOPENED"
    aid = appeal_id or "—"
    summ = f"Higher court appeal {aid} accepted — case reopened for review."
    body = sms_body(fir_id, status, summ)
    subj = f"[CJS] Case REOPENED — FIR {fir_id}"
    text = f"FIR: {fir_id}\nCase status: {status}\n\n{summ}\n"
    cid = case_doc.get("citizen_id")
    q: Dict[str, Any] = {
        "role": {"$in": ["police", "investigator", "forensic", "court_officer", "judge", "admin"]},
    }
    if cid:
        q["id"] = {"$ne": cid}
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(800)
    seen: set = set()
    for u in users:
        uid = u.get("id")
        if not uid or uid in seen:
            continue
        seen.add(uid)
        await _queue_sms_for_user(db, u, body=body, event="higher_court_reopen", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))
        await _queue_email_for_user(db, u, subject=subj, text_body=text, event="higher_court_reopen", case_id=case_doc.get("case_id"), fir_id=case_doc.get("fir_id"))


async def notify_appeal_decision(
    db: AsyncIOMotorDatabase,
    case_doc: dict,
    appeal_doc: dict,
    decision: str,
    decision_note: str,
) -> None:
    fir_id = appeal_doc.get("fir_id") or case_doc.get("fir_id") or "—"
    status = case_doc.get("status") or "—"
    if decision == "accept":
        summ = f"Appeal accepted. {(decision_note or '').strip()}".strip()
        ev = "appeal_accepted"
    else:
        summ = f"Appeal rejected. {(decision_note or '').strip()}".strip()
        ev = "appeal_rejected"
    body = sms_body(fir_id, status, summ)
    subj = f"[CJS] Appeal {'accepted' if decision == 'accept' else 'rejected'} — FIR {fir_id}"
    text = f"FIR: {fir_id}\nCase status: {status}\n\n{summ}\n"
    email_addr = (appeal_doc.get("requested_by") or "").strip().lower()
    if not email_addr:
        return
    u = await db.users.find_one({"email": email_addr}, {"_id": 0, "password_hash": 0})
    if not u:
        return
    await _queue_sms_for_user(db, u, body=body, event=ev, case_id=case_doc.get("case_id"), fir_id=fir_id)
    await _queue_email_for_user(db, u, subject=subj, text_body=text, event=ev, case_id=case_doc.get("case_id"), fir_id=fir_id)


def schedule_case_notifications(coro):
    """Run notification coroutine in background; failures are logged only."""

    async def _runner():
        try:
            await coro
        except Exception:
            logger.exception("Background case notification failed")

    try:
        asyncio.get_running_loop().create_task(_runner())
    except RuntimeError:
        logger.warning("No running event loop; case notification not scheduled")

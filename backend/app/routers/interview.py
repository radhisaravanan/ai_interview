from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from app.routers.auth import get_current_user
from app.database import (
    resumes_collection,
    interview_sessions_collection,  # legacy read-only fallback
    asked_questions_collection,
    interview_records_collection,
    global_asked_questions_collection,
)
from app.services.ai_service import (
    generate_interview_questions,
    generate_single_unique_question,
    evaluate_answer_and_generate_report,
)
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/interview", tags=["Interview Room"])


# --------------------------------------------------------------------------
# Repeat-prevention helpers (asked_questions collection: reg_no keyed)
# --------------------------------------------------------------------------
async def get_asked_questions(reg_no: str) -> list:
    """Fetch every question previously asked to this student (zero-repetition source)."""
    doc = await asked_questions_collection.find_one({"reg_no": reg_no})
    return doc.get("questions", []) if doc else []


async def record_asked_questions(reg_no: str, questions: list):
    """Store newly generated questions so future interviews never repeat them."""
    if not questions:
        return
    await asked_questions_collection.update_one(
        {"reg_no": reg_no},
        {"$push": {"questions": {"$each": questions}}},
        upsert=True,
    )


async def record_global_asked_questions(reg_no: str, questions: list):
    """
    IMMEDIATELY push every question sent to ANY candidate into the GLOBAL
    anti-malpractice store. These entries permanently blacklist the question
    for ALL candidates across ALL future sessions.
    """
    if not questions:
        return
    now = datetime.utcnow()
    await global_asked_questions_collection.insert_many(
        [
            {"reg_no": reg_no, "question_text": q, "asked_at": now}
            for q in questions
            if q
        ]
    )


async def get_global_banned_questions(user_reg_no: str, skills: list) -> list:
    """
    Build the ABSOLUTE GLOBAL banned pool for EVERY session request:
    the latest 100-200 questions asked across ALL candidates/registers (any
    skills, any session) plus the candidate's own history. No skill matching is
    applied - a question used for ANY candidate is permanently banned for all.
    """
    # Latest-most-recent global questions across ALL candidates & sessions.
    docs = await global_asked_questions_collection.find(
        {"reg_no": {"$ne": user_reg_no}},
        {"question_text": 1},
    ).sort("asked_at", -1).limit(200).to_list(length=200)

    pool = []
    for doc in docs:
        q = doc.get("question_text", "")
        if q and q not in pool:
            pool.append(q)
    return pool


async def get_all_global_banned_questions() -> list:
    """
    Fetch EVERY question ever asked to ANY candidate across ALL registers,
    sessions, and skill sets. Used by the on-demand 1-by-1 generator so no
    question can EVER be repeated once it has been delivered to anyone.
    """
    docs = await global_asked_questions_collection.find(
        {}, {"question_text": 1}
    ).to_list(length=None)

    pool = []
    for doc in docs:
        q = doc.get("question_text", "")
        if q and q not in pool:
            pool.append(q)
    return pool


# --------------------------------------------------------------------------
# Pydantic Schemas for Request Body Validation
# --------------------------------------------------------------------------
class SubmitAnswerRequest(BaseModel):
    session_id: Optional[str] = None
    question_number: int
    transcribed_text: str

class FinishInterviewRequest(BaseModel):
    session_id: Optional[str] = None


def _strip_answer(text: str) -> str:
    """Empty / whitespace answers are stored as a sentinel (no fabricated content)."""
    if text and text.strip():
        return text.strip()
    return "(No answer provided)"


# --------------------------------------------------------------------------
# 1. Start Interview Endpoint
#    Creates / RESETS the candidate's SINGLE interview record (reg_no = _id).
# --------------------------------------------------------------------------
@router.post("/start", status_code=201)
async def start_interview(current_user: dict = Depends(get_current_user)):
    user_reg_no = current_user.get("reg_no")

    resume_doc = await resumes_collection.find_one({"reg_no": user_reg_no})
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded resume found for this user. Please upload your resume first."
        )

    skills = resume_doc.get("skills", [])
    projects = resume_doc.get("projects", [])
    department = resume_doc.get("department", "Information Technology")
    job_role = resume_doc.get("job_role", "Software Developer")
    experience_level = resume_doc.get("experience_level", "Fresher")

    if not skills or not projects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded resume does not contain any detected skills or projects. Please upload a valid resume."
        )

    # Fetch ALL previously asked questions to PREVENT repetition (Zero Duplicates).
    past_questions_history = await get_asked_questions(user_reg_no)

    seen = set()
    unique_history = []
    for q in past_questions_history:
        if q and q not in seen:
            seen.add(q)
            unique_history.append(q)

    # GLOBAL banned pool: questions asked to other candidates sharing a skill.
    global_banned = await get_global_banned_questions(user_reg_no, skills)

    # FRESH resume text fetched this request (never cached) → unique per candidate.
    resume_text = resume_doc.get("extracted_text", "") or ""

    # AI generates exactly 20 unique questions (no hardcoded fallbacks ever).
    questions = await generate_interview_questions(
        department=department,
        job_role=job_role,
        experience_level=experience_level,
        skills=skills,
        projects=projects,
        past_questions_history=unique_history,
        reg_no=user_reg_no,
        resume_text=resume_text,
        global_banned_questions=global_banned,
    )

    # Assign a unique question_id to every question (frontend reference only).
    for q in questions:
        q["question_id"] = str(ObjectId())

    # Record new questions to block repeats in future interviews.
    recorded_texts = [q.get("question_text", "") for q in questions if q.get("question_text")]
    await record_asked_questions(user_reg_no, recorded_texts)
    # IMMEDIATELY blacklist globally for ALL candidates & future sessions
    # (anti-malpractice: no question is ever reusable once asked to anyone).
    await record_global_asked_questions(user_reg_no, recorded_texts)

    # Strict storage schema for the single candidate record (reg_no = _id).
    interview_data = [
        {
            "question_no": q.get("question_number"),
            "question_text": q.get("question_text", ""),
            "candidate_answer": "",
            "question_score": None,
            "question_suggestion": "",
        }
        for q in questions
    ]

    await interview_records_collection.update_one(
        {"_id": user_reg_no},
        {
            "$set": {
                "reg_no": user_reg_no,
                "interview_data": interview_data,
                "overall_score": 0,
                "completed_at": None,
            }
        },
        upsert=True,
    )

    return {
        "success": True,
        "message": "Interview session started successfully!",
        "session_id": user_reg_no,
        "sessionId": user_reg_no,
        "total_questions": len(questions),
        "questions": questions
    }


# --------------------------------------------------------------------------
# 1c. ON-DEMAND 1-BY-1 QUESTION GENERATION (4-PHASE STRUCTURE)
#     GET /interview/next-question?user_id=..&session_id=..&question_index=1..20
#     Generates EXACTLY ONE unique resume-tailored question for the requested
#     index using the strict 4-phase structure (1-5 Self Intro & Basic Resume,
#     6-10 Target Role, 11-15 Core Skills, 16-20 Projects & Experience). The
#     FULL global_asked_questions store (across ALL candidates) is loaded into
#     the Groq system prompt; any candidate question with difflib similarity
#     > 0.50 is discarded & regenerated; the accepted question is IMMEDIATELY
#     saved to global_asked_questions so it is banned for everyone forever.
# --------------------------------------------------------------------------
@router.get("/next-question")
async def get_next_question(
    question_index: int = Query(..., ge=1, le=20, description="1-20 on-demand question index"),
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    user_reg_no = current_user.get("reg_no")

    resume_doc = await resumes_collection.find_one({"reg_no": user_reg_no})
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded resume found for this user. Please upload your resume first."
        )

    skills = resume_doc.get("skills", [])
    projects = resume_doc.get("projects", [])
    job_role = resume_doc.get("job_role", "Software Developer")
    resume_text = resume_doc.get("extracted_text", "") or ""

    if not skills or not projects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded resume does not contain any detected skills or projects. Please upload a valid resume."
        )

    # Idempotency: if this question index was already generated & persisted,
    # return the cached copy (no wasted AI call on page refresh/retry).
    record = await interview_records_collection.find_one({"_id": user_reg_no})
    if record:
        for d in record.get("interview_data", []):
            if d.get("question_no") == question_index and d.get("question_text"):
                return {
                    "success": True,
                    "user_id": user_id or user_reg_no,
                    "session_id": session_id or user_reg_no,
                    "question_index": question_index,
                    "question_number": question_index,
                    "question_text": d.get("question_text"),
                    "total_questions": 20,
                }

    # FULL GLOBAL BANNED POOL: every question ever asked to ANY candidate
    # across ALL registers & sessions + this candidate's own history.
    global_banned = await get_all_global_banned_questions()
    own_history = await get_asked_questions(user_reg_no)
    banned_pool = []
    seen = set()
    for q in list(global_banned) + list(own_history):
        if q and q not in seen:
            seen.add(q)
            banned_pool.append(q)

    # Generate ONE unique question for this index (max_tokens=150, strict
    # difflib rejection at similarity > 0.50, never a static fallback).
    question_text = await generate_single_unique_question(
        category="on_demand",
        constraints="On-demand 4-phase interview question.",
        banned_questions=banned_pool,
        reg_no=user_reg_no,
        resume_text=resume_text,
        question_number=question_index,
        skills=skills,
        projects=projects,
        job_role=job_role,
        max_tokens=150,
        similarity_threshold=0.50,
    )

    # IMMEDIATELY blacklist globally (anti-malpractice: no question is ever
    # reusable once asked to anyone) + keep the candidate's own history in sync.
    now = datetime.utcnow()
    await global_asked_questions_collection.insert_one(
        {
            "reg_no": user_reg_no,
            "question_text": question_text,
            "asked_at": now,
        }
    )
    await asked_questions_collection.update_one(
        {"reg_no": user_reg_no},
        {"$addToSet": {"questions": question_text}},
        upsert=True,
    )

    # Persist into the candidate's single interview record so the existing
    # /submit-answer and /finish flows work against the same record.
    interview_data = record.get("interview_data", []) if record else []
    updated = False
    for d in interview_data:
        if d.get("question_no") == question_index:
            d["question_text"] = question_text
            d["question_score"] = None
            updated = True
            break
    if not updated:
        interview_data.append({
            "question_no": question_index,
            "question_text": question_text,
            "candidate_answer": "",
            "question_score": None,
            "question_suggestion": "",
        })
        interview_data.sort(key=lambda d: d.get("question_no", 0))

    await interview_records_collection.update_one(
        {"_id": user_reg_no},
        {
            "$set": {
                "reg_no": user_reg_no,
                "interview_data": interview_data,
                "overall_score": record.get("overall_score", 0) if record else 0,
                "completed_at": record.get("completed_at") if record else None,
            }
        },
        upsert=True,
    )

    return {
        "success": True,
        "user_id": user_id or user_reg_no,
        "session_id": session_id or user_reg_no,
        "question_index": question_index,
        "question_number": question_index,
        "question_text": question_text,
        "total_questions": 20,
    }


# --------------------------------------------------------------------------
# 1b. Resume a current session (reg_no) or a legacy session (ObjectId)
# --------------------------------------------------------------------------
@router.get("/session/{identifier}")
async def get_interview_session(
    identifier: str,
    current_user: dict = Depends(get_current_user)
):
    user_reg_no = current_user.get("reg_no")

    if identifier == user_reg_no:
        record = await interview_records_collection.find_one({"_id": user_reg_no})
        if record:
            return {
                "session_id": user_reg_no,
                "questions": [
                    {
                        "question_number": d.get("question_no"),
                        "question_id": d.get("question_id"),
                        "question_text": d.get("question_text", ""),
                    }
                    for d in record.get("interview_data", [])
                ],
                "total_questions": len(record.get("interview_data", []))
            }

    # Legacy fallback: old session documents keyed by ObjectId
    try:
        session_obj_id = ObjectId(identifier)
        session_doc = await interview_sessions_collection.find_one({"_id": session_obj_id})
        if session_doc and session_doc.get("reg_no") == user_reg_no:
            return {
                "session_id": identifier,
                "questions": session_doc.get("questions", []),
                "total_questions": len(session_doc.get("questions", []))
            }
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Interview session not found.")


# --------------------------------------------------------------------------
# 2. Submit Answer (LIGHTWEIGHT — NO heavy LLM evaluation, <200ms)
#    The answer is appended/updated on the candidate's single record and the
#    UI advances to the next question immediately. Full AI evaluation only
#    runs ONCE during the /finish call.
# --------------------------------------------------------------------------
@router.post("/submit-answer")
async def submit_answer(
    payload: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user)
):
    user_reg_no = current_user.get("reg_no")

    record = await interview_records_collection.find_one({"_id": user_reg_no})
    if not record:
        raise HTTPException(status_code=404, detail="No active interview found. Please start the interview first.")

    interview_data = record.get("interview_data", [])
    for d in interview_data:
        if d.get("question_no") == payload.question_number:
            answer = _strip_answer(payload.transcribed_text)
            question_text = d.get("question_text", "")
            d["candidate_answer"] = answer

            # IMMEDIATELY save the answer AND append the Q&A pair to the
            # candidate's cumulative history (reg_no keyed) - no LLM involved.
            await interview_records_collection.update_one(
                {"_id": user_reg_no},
                {
                    "$set": {
                        "interview_data": interview_data,
                    },
                    "$push": {
                        "interview_history": {
                            "question_no": payload.question_number,
                            "question": question_text,
                            "answer": answer,
                            "submitted_at": datetime.utcnow(),
                        }
                    },
                },
            )

            # Keep the asked question inside the zero-repetition store (idempotent).
            if question_text:
                await asked_questions_collection.update_one(
                    {"reg_no": user_reg_no},
                    {"$addToSet": {"questions": question_text}},
                    upsert=True,
                )
                # GLOBAL anti-malpractice push: the question becomes permanently
                # banned for ALL candidates the moment it is delivered.
                await global_asked_questions_collection.insert_one(
                    {
                        "reg_no": user_reg_no,
                        "question_text": question_text,
                        "asked_at": datetime.utcnow(),
                    }
                )

            return {
                "status": "success",
                "message": f"Answer for question {payload.question_number} saved successfully.",
            }

    raise HTTPException(status_code=404, detail=f"Question {payload.question_number} not found in active interview.")


# --------------------------------------------------------------------------
# 3. Finish Interview — RUNS THE FULL AI EVALUATION EXACTLY ONCE.
#    Scores every answer, generates UNIQUE answer-specific suggestions, stores
#    them on the candidate's single record along with the overall score.
# --------------------------------------------------------------------------
@router.post("/finish")
async def finish_interview(
    payload: FinishInterviewRequest,
    current_user: dict = Depends(get_current_user)
):
    user_reg_no = current_user.get("reg_no")

    record = await interview_records_collection.find_one({"_id": user_reg_no})
    if not record:
        raise HTTPException(status_code=404, detail="No active interview found. Please start the interview first.")

    interview_data = record.get("interview_data", [])
    if not interview_data:
        raise HTTPException(status_code=400, detail="No questions recorded for this interview.")

    qna_pair = [
        {
            "question_number": d.get("question_no"),
            "question_text": d.get("question_text", ""),
            "candidate_answer": d.get("candidate_answer") or "No answer provided.",
        }
        for d in interview_data
    ]

    # Single heavy AI call (only here, not per-question).
    report = await evaluate_answer_and_generate_report(questions_and_answers=qna_pair)

    overall_score = report.get("overall_score", 0)
    eval_map = {e.get("question_number"): e for e in report.get("evaluations", [])}

    for d in interview_data:
        ev = eval_map.get(d.get("question_no"), {}) or {}
        d["question_score"] = int(ev.get("question_score", 0)) if ev.get("question_score") is not None else 0
        d["question_suggestion"] = ev.get("question_suggestion", "")

    await interview_records_collection.update_one(
        {"_id": user_reg_no},
        {
            "$set": {
                "overall_score": overall_score,
                "interview_data": interview_data,
                "completed_at": datetime.utcnow(),
            }
        },
    )

    return {
        "message": "Interview completed successfully!",
        "reg_no": user_reg_no,
        "overall_score": overall_score,
    }


# --------------------------------------------------------------------------
# 4. Get Result / Detailed Report (reg_no is the primary key)
#    Serves BOTH the /result summary page and the /report detailed page.
# --------------------------------------------------------------------------
@router.get("/report/{session_id}")
async def get_interview_report(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_reg_no = current_user.get("reg_no")

    record = await interview_records_collection.find_one({"_id": user_reg_no})

    # Legacy fallback: if a candidate has no new record but an old ObjectId session,
    # build a compatible response from the legacy completed report when possible.
    if not record:
        try:
            session_obj_id = ObjectId(session_id)
        except Exception:
            session_obj_id = None
        if session_obj_id:
            legacy = await interview_sessions_collection.find_one({"_id": session_obj_id})
            if legacy and legacy.get("reg_no") == user_reg_no:
                return {
                    "success": True,
                    "reg_no": user_reg_no,
                    "overall_score": legacy.get("overall_score", 0) or 0,
                    "completed_at": legacy.get("completed_at"),
                    "total_questions": len(legacy.get("questions", [])),
                    "interview_data": legacy.get("questions", []),
                }
        raise HTTPException(status_code=404, detail="No interview record found for this candidate. Please complete an interview first.")

    return {
        "success": True,
        "reg_no": user_reg_no,
        "overall_score": record.get("overall_score", 0) or 0,
        "completed_at": record.get("completed_at"),
        "total_questions": len(record.get("interview_data", [])),
        "interview_data": record.get("interview_data", []),
    }


# --------------------------------------------------------------------------
# 5. Past User Interview Summary (uses the candidate's single record)
# --------------------------------------------------------------------------
@router.get("/my-history")
async def get_my_interview_history(current_user: dict = Depends(get_current_user)):
    user_reg_no = current_user.get("reg_no")

    record = await interview_records_collection.find_one({"_id": user_reg_no})
    if not record:
        return {
            "status": "success",
            "reg_no": user_reg_no,
            "total_interviews": 0,
            "history": [],
        }

    data = record.get("interview_data", [])
    answered = sum(1 for d in data if d.get("candidate_answer"))
    history = [{
        "reg_no": user_reg_no,
        "completed_at": record.get("completed_at"),
        "overall_score": record.get("overall_score", 0) or 0,
        "total_questions": len(data),
        "answered": answered,
    }]

    return {
        "status": "success",
        "reg_no": user_reg_no,
        "total_interviews": len(history),
        "history": history,
    }
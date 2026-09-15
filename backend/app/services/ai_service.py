import os
import re
import json
import time
import asyncio
import random
import logging
from datetime import datetime, timezone
from difflib import SequenceMatcher
# Replaced Groq with local Hugging Face transformers pipeline (lazy-loaded)
from dotenv import load_dotenv
from fastapi import HTTPException, status

load_dotenv()

logger = logging.getLogger("ai_interview")


def _unique_stamp(reg_no: str):
    """Dynamic per-candidate/per-request stamp = timestamp + epoch-ms + nonce,
    forcing the model to treat every candidate AND every single request as
    fresh so the random seed changes on EACH call (never cached/repetitive)."""
    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%d%H%M%S")
    epoch_ms = round(now.timestamp() * 1000)  # current Unix epoch in milliseconds
    nonce = random.randint(100000, 999999)
    stamp = f"UNIQUE-STAMP(reg_no={reg_no or 'n/a'}, ts={ts}, epoch_ms={epoch_ms}, nonce={nonce})"
    return stamp, ts, nonce, epoch_ms


def _phase_hint(question_number, projects=None, skills=None, job_role=None):
    """Strict 4-PHASE progressive structure for a 1-20 question number.

    Phase mapping (1-by-1 on-demand interview):
      Q1-5   -> PHASE 1: Self Intro & Basic Resume Background
      Q6-10  -> PHASE 2: Target Role scenarios
      Q11-15 -> PHASE 3: Core Skills scenarios
      Q16-20 -> PHASE 4: Projects & Experience (system/logic)

    Every phase is explicitly anchored to the candidate's OWN resume data
    (specific project names, listed skills, and the selected Target Role), so
    the generated question is always dynamic and resume-specific - NEVER a
    static/template question. Guidance only; the model fills in the question.
    """
    q = question_number or 1
    p1 = (projects or [None])[0]
    p2 = (projects or [None])[1] if len(projects or []) > 1 else p1
    skill_sample = ", ".join((skills or [])[:3]) or "the candidate's listed core skills"
    role = job_role or "the candidate's selected target role"

    if q <= 5:
        # PHASE 1 (Q1-5): SELF INTRO & BASIC RESUME BACKGROUND.
        return (
            f"PHASE 1 (Q{q}): SELF INTRO & BASIC RESUME BACKGROUND - a personalized "
            f"introductory scenario that explicitly names the candidate's own project "
            f"'{p1}' and skill(s) [{skill_sample}] from their resume - ask them to walk "
            f"through their background, role, and personal contribution."
        )
    if q <= 10:
        # PHASE 2 (Q6-10): TARGET ROLE scenarios.
        return (
            f"PHASE 2 (Q{q}): TARGET ROLE - a real-world scenario question STRICTLY "
            f"tailored to the {role} position: on-the-job situations, role-specific "
            f"responsibilities, decisions and tradeoffs a {role} would actually face, "
            f"grounded in the candidate's resume projects and skills."
        )
    if q <= 15:
        # PHASE 3 (Q11-15): CORE SKILLS scenarios.
        return (
            f"PHASE 3 (Q{q}): CORE SKILLS - a scenario question STRICTLY based on the "
            f"candidate's extracted core skills [{skill_sample}]: implementation-level "
            f"depth, debugging, architecture or design decisions using those exact skills."
        )
    # PHASE 4 (Q16-20): PROJECTS & EXPERIENCE (system/logic).
    return (
        f"PHASE 4 (Q{q}): PROJECTS & EXPERIENCE - a system/logic question based on the "
        f"candidate's project(s) '{p1}' and '{p2}' and their work experience: architecture, "
        f"database schema, edge cases, scaling and the real design decisions they made."
    )


# ---------------------------------------------------------------------------
# Multi-API-Key Load Balancing (Round-Robin + 429 failover)
# ---------------------------------------------------------------------------
MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "gpt2-medium")
REQUEST_TIMEOUT = 10            # kept for compatibility with older settings
DEFAULT_TEMPERATURE = 0.95      # high creativity + unpredictable storylike human angles
MAX_BANNED_IN_PROMPT = 20       # ONLY last 20 banned questions go to Groq
MAX_TOTAL_ATTEMPTS = 4          # per-question regeneration attempts
SIM_RETRY_THRESHOLD = 0.55      # difflib > 55% => strict structural repetition
MAX_RESUME_CHARS = 1200         # truncate resume text to stay well under 6000 TPM

_generator = None  # transformers pipeline generator (lazy)
_tokenizer = None
_model = None
_use_ollama = False


def _init_local_generator():
    """Lazy-load a Hugging Face text-generation pipeline."""
    global _generator, _tokenizer, _model
    global _use_ollama
    if _generator is not None or _use_ollama:
        return

    backend = os.getenv("AI_BACKEND", "transformers").strip().lower()
    if backend == "ollama":
        # Use Ollama CLI (local inference) if requested. Validate that the
        # `ollama` binary is available on the host and bail early with a
        # helpful error if it's not found.
        import shutil

        if not shutil.which("ollama"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "AI_BACKEND=ollama was selected but the `ollama` CLI was not found in PATH. "
                    "Install Ollama (https://ollama.ai) and pull a model, or unset AI_BACKEND to use the transformers fallback."
                ),
            )

        _use_ollama = True
        return

    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
        import torch
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"transformers or torch not installed: {exc}"
        )

    model_name = MODEL_NAME
    # Load tokenizer + model (may be large; choose a small model for dev by default)
    _tokenizer = AutoTokenizer.from_pretrained(model_name)
    _model = AutoModelForCausalLM.from_pretrained(model_name)

    device = 0 if torch.cuda.is_available() else -1
    _generator = pipeline(
        "text-generation",
        model=_model,
        tokenizer=_tokenizer,
        device=device,
    )


async def _call(messages: list, temperature: float = DEFAULT_TEMPERATURE, max_tokens: int = 512) -> str:
    """Local text-generation call using the transformers pipeline.

    `messages` is expected to be a list of dicts with `role` and `content`.
    We convert that to a single prompt string (system + user) and generate text.
    """
    _init_local_generator()

    # Build a single prompt from system + user messages
    prompt_parts = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "system":
            prompt_parts.append(f"[SYSTEM]\n{content}\n")
        else:
            prompt_parts.append(content)
    prompt = "\n\n".join(prompt_parts)

    # Ollama mode: call local `ollama` CLI if configured
    backend = os.getenv("AI_BACKEND", "transformers").strip().lower()
    model_name = os.getenv("LOCAL_MODEL_NAME", MODEL_NAME)
    if backend == "ollama":
        # Use subprocess to call `ollama generate <model> --prompt "..."`
        def run_ollama():
            import subprocess
            try:
                cmd = ["ollama", "generate", model_name, "--prompt", prompt]
                proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
                return proc.stdout.strip()
            except Exception as e:
                raise RuntimeError(f"Ollama generation failed: {e} - stderr: {getattr(e, 'stderr', '')}")

        try:
            result = await asyncio.to_thread(run_ollama)
            # Ollama may echo metadata; return full stdout trimmed.
            return result.strip()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Ollama generation failed: {exc}"
            )

    # Default: transformers pipeline
    try:
        # transformers pipeline runs in a blocking thread; offload to thread
        def gen():
            out = _generator(
                prompt,
                max_new_tokens=max_tokens,
                do_sample=True,
                temperature=float(temperature),
                top_k=50,
                num_return_sequences=1,
            )
            # pipeline returns list of dicts with 'generated_text'
            return out[0]["generated_text"] if isinstance(out, list) and out else str(out)

        result = await asyncio.to_thread(gen)
        # Strip the prompt prefix if the model echoes it
        if result.startswith(prompt):
            return result[len(prompt) :].strip()
        return result.strip()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Local AI generation failed: {exc}"
        )


def _extract_json(content: str):
    """Paranoia : strip any markdown fences before json.loads."""
    content = (content or "").strip()
    if content.startswith("```"):
        content = content.replace("```json", "").replace("```", "").strip()
    return content


def _normalize_text(text: str) -> str:
    """Normalize text for strict duplicate comparison (lowercase, strip punctuation)."""
    return re.sub(r"[^a-z0-9 ]", " ", (text or "").lower()).strip()


# ---------------------------------------------------------------------------
# Python-Level Duplicate Rejection (200% Zero-Repetition Interceptor)
# ---------------------------------------------------------------------------

# Hard freeze: ANY similarity above this threshold => question is REJECTED.
SIM_THRESHOLD = 0.55

# Template / scaffolding words must not inflate the difflib character-ratio,
# so the 55% check runs on CONTENT tokens (keywords) only - this is the
# semantic part of "difflib.SequenceMatcher OR keyword match" from the spec.
_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "am", "of", "in", "on",
    "to", "for", "with", "and", "or", "your", "you", "my", "me", "do",
    "does", "did", "what", "why", "how", "when", "where", "which", "who",
    "this", "that", "it", "at", "by", "from", "as", "about", "explain",
    "describe", "tell", "give", "please", "can", "could", "would", "have",
    "has", "had", "be", "been", "being", "not", "if", "so", "then",
    "project", "projects", "resume", "candidate", "work", "experience",
}


def _content_tokens(text: str) -> set:
    """Deduplicated, stopword-free, normalized content keywords."""
    return {w for w in _normalize_text(text).split() if w not in _STOPWORDS}


def _content_similarity(a: str, b: str) -> float:
    """difflib.SequenceMatcher ratio computed on CONTENT keywords only."""
    ta, tb = _content_tokens(a), _content_tokens(b)
    ja, jb = " ".join(sorted(ta)), " ".join(sorted(tb))
    if not ja or not jb:
        return 0.0
    return SequenceMatcher(None, ja, jb).ratio()


def _keyword_overlap(a: str, b: str) -> float:
    """Jaccard keyword-match ratio over content tokens (0.0 - 1.0)."""
    ta, tb = _content_tokens(a), _content_tokens(b)
    if not ta or not tb:
        return 0.0
    return (len(ta & tb)) / (len(ta | tb)) if (ta | tb) else 0.0


# ANSI color helpers for CLEAR VISUAL ERRORS in the Uvicorn terminal.
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def _find_similar_match(new_q: str, history_list: list, threshold: float = SIM_THRESHOLD):
    """Return (score, matching_banned_question) for the FIRST history entry that
    trips the 0.55 difflib/keyword interceptor, else (None, None)."""
    if not new_q:
        return None, None
    nq = _normalize_text(new_q)
    for b in history_list:
        if not b:
            continue
        if nq == _normalize_text(b):
            return 1.0, b  # exact normalized duplicate -> 100% similarity
        ta, tb = _content_tokens(new_q), _content_tokens(b)
        shared = ta & tb
        if len(shared) < 2:
            continue  # no meaningful topical overlap -> distinct question
        score = _content_similarity(new_q, b)
        if score > threshold:
            return score, b
        score = _keyword_overlap(new_q, b)
        if score > threshold:
            return score, b
    return None, None


def is_too_similar(new_q: str, history_list: list, threshold: float = SIM_THRESHOLD) -> bool:
    """STRICT Python-level duplication interceptor (boolean wrapper).

    Delegates to _find_similar_match; returns True when ANY history entry trips
    the exact/difflib/keyword 55% interceptor.
    """
    score, _ = _find_similar_match(new_q, history_list, threshold)
    return score is not None


def _format_banned_list(questions: list, max_items: int = MAX_BANNED_IN_PROMPT) -> str:
    """Render the ABSOLUTE BANNED QUESTIONS LIST block for the system prompt.

    FAST-PROMPT OPTIMIZATION: only the LAST `max_items` (default 20) distinct
    questions are sent to Groq so the request context stays tiny and the model
    responds in well under a second. Newest questions are prioritized because
    they are the most likely repeat candidates.
    """
    cleaned = [q for q in reversed(questions) if q]
    seen = set()
    kept = []
    for q in cleaned:
        key = _normalize_text(q) or q
        if key in seen:
            continue
        seen.add(key)
        kept.append(q)
        if len(kept) >= max_items:
            break
    if not kept:
        return "(None yet - this is the candidate's first interview. All 20 questions are free to use.)"
    return "\n".join(f"- {q}" for q in reversed(kept))


# 🚀 Generate ONE brand-new question that is guaranteed (server-side) not to repeat history
async def generate_single_unique_question(
    category: str,
    constraints: str,
    banned_questions: list,
    client=None,
    reg_no: str = None,
    resume_text: str = "",
    question_number: int = None,
    skills: list = None,
    projects: list = None,
    job_role: str = None,
    max_tokens: int = 200,
    similarity_threshold: float = SIM_RETRY_THRESHOLD,
) -> str:
    """Generate EXACTLY ONE unique, candidate-tailored question.

    STRICT DYNAMIC RESUME-BASED GENERATION: every question is produced live by
    the Groq API (stream=False) from the candidate's uploaded resume, skills,
    projects, and target role - there are NO static/in-built default questions
    anywhere in this pipeline. The question number is mapped to a strict
    progressive-difficulty phase (see _phase_hint). The fail-safe difflib check
    (threshold 0.50/0.55) discards any overlap with the GLOBAL banned pool across
    all candidates & sessions, logs a RED repetition error, pauses 0.3s, rotates
    to the next API key, and regenerates. After MAX_TOTAL_ATTEMPTS (4) a hard
    500 is raised (never a fallback question).
    """
    banned_clean = [q for q in (banned_questions or []) if q]
    stamp, _, _, epoch_ms = _unique_stamp(reg_no)
    phase_hint = _phase_hint(question_number, projects=projects, skills=skills, job_role=job_role)

    # TOKEN OPTIMIZATION: never send the full multi-page resume - truncate to
    # 1200 chars so the prompt stays well under Groq's 6000 TPM limit.
    resume_text = (resume_text or "")[:MAX_RESUME_CHARS]

    system_prompt = f"""You are an unpredictable, experienced Senior Technical Interviewer evaluating a candidate based on their extracted resume details.

CANDIDATE CONTEXT:
Skills: {', '.join(skills or []) or 'n/a'}
Projects: {', '.join(projects or []) or 'n/a'}
Target Role: {job_role or 'n/a'}
Candidate Identifier: {reg_no or 'n/a'}
Question Number: {question_number or '?'} of 20
Global Banned Questions: {_format_banned_list(banned_clean)}

YOUR BEHAVIOR AND INTERVIEW STYLE:
1. Act like a real human interviewer who evaluates technical depth dynamically.
2. Switch up your interviewing angles naturally:
   - Angle A: Ask about a specific architecture or framework choice ('Why did you choose X over Y for this project?').
   - Angle B: Present a real-world failure/edge-case scenario ('What happens if 10,000 concurrent users hit this endpoint in your project?').
   - Angle C: Ask about database design, schema decisions, or API security in their listed work.
   - Angle D: Ask a practical debugging or code-level troubleshooting question based on their tech stack.
   - Angle E: Ask them to defend a tradeoff they made while building their project.
3. CURRENT PHASE FOR THIS QUESTION: {phase_hint}
4. STRICT MANDATE:
   - Generate a completely unique question. DO NOT repeat or paraphrase any question from the banned list.
   - NO repetitive question framing or sentence templates.
   - NEVER ask generic fluff like 'How did you build X?' or 'What is X?'.
   - NEVER ask personal hobbies or non-technical questions.
   - NEVER repeat or conceptually overlap with ANY question in Global Banned Questions.
   - Output ONLY the raw question text in natural, conversational, professional English."""

    def build_user_prompt(temp):
        return f"""Candidate Extracted Skills: {', '.join(skills or []) or 'n/a'}
Candidate Extracted Projects: {', '.join(projects or []) or 'n/a'}
Candidate Target Role: {job_role or 'n/a'}
Candidate Reg No: {reg_no or 'n/a'}
Global Banned Questions: {_format_banned_list(banned_clean)}
Request Seed (epoch ms): {epoch_ms}

FRESH RESUME CONTEXT (length {len(resume_text or '')}):
{resume_text or ''}

Generate Question #{question_number} of 20 for this candidate, in phase: {phase_hint}, as a natural human interviewer would.
MANDATE: Generate a completely unique question. DO NOT repeat or paraphrase any question from the banned list. Deeply unique and specific to THEIR listed projects or skills. Reference the actual project name(s) / skill(s) / target role directly from the resume. No templates, no generic 'What is X?' or 'How did you build X?', no personal/hobby questions. Never repeat any banned question. Output ONLY the raw question string."""

    attempts = 0
    while attempts < MAX_TOTAL_ATTEMPTS:
        attempts += 1
        # First attempt uses base temperature 0.95; subsequent overlapping /
        # failed attempts are re-generated at a higher temperature for variety.
        attempt_temp = DEFAULT_TEMPERATURE + (0.1 * (attempts - 1))
        try:
            content = await _call(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": build_user_prompt(attempt_temp)},
                ],
                temperature=attempt_temp,
                max_tokens=max_tokens,  # single question: short output -> tiny token footprint
            )
        except Exception as e:
            print(f"Groq Single-Question Generation Error (attempt {attempts}): {str(e)}")
            time.sleep(0.3)  # brief pause before retry to avoid Groq 429 rate limits
            continue  # _call already rotated all keys; just retry the loop

        candidate = ""
        raw = (content or "").strip()
        try:
            data = json.loads(_extract_json(content))
            if isinstance(data, dict):
                candidate = (data.get("question_text") or "").strip()
            elif isinstance(data, str):
                candidate = data.strip()
        except Exception:
            # Raw natural-language output (no JSON): strip common artifacts.
            candidate = (
                raw.strip()
                .strip('"')
                .strip()
            )
        # Trim any leading "Question N:" / label artifacts the model may add.
        candidate = re.sub(r"^(Question\s*\d*\s*[#:.\-]*\s*)", "", candidate).strip()

        if not candidate:
            continue

        # FAIL-SAFE UNIQUE CHECK: difflib similarity against the GLOBAL banned
        # pool (across all candidates & sessions). If > threshold (0.50 for the
        # on-demand endpoint) => log a prominent RED error and regenerate
        # immediately with the next/fallback API key.
        score, existing_q = _find_similar_match(candidate, banned_clean, threshold=similarity_threshold)
        if score is not None:
            print(f"{BOLD}{RED}❌ [REPETITION ERROR] Score: {score:.2f}{RESET}")
            print(f"{RED}❌ Candidate Generated: {candidate}{RESET}")
            print(f"{RED}❌ Existing Banned Match: {existing_q}{RESET}")
            print(f"{YELLOW}🔄 Rejecting question and retrying Groq API with next key... (attempt {attempts}/{MAX_TOTAL_ATTEMPTS}){RESET}")
            time.sleep(0.3)  # brief pause before retry to avoid Groq 429 rate limits
            continue

        return candidate

    # HARD EXCEPTION: after MAX_TOTAL_ATTEMPTS every generated question tripped
    # the similarity interceptor -> hard fail. NEVER fall back to a default
    # question.
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="REPETITION_BLOCKED",
    )


# 🚀 Interview Questions Generator (ADAPTIVE HUMAN INTERVIEWER, NO TEMPLATES)
async def generate_interview_questions(
    department: str,
    job_role: str,
    experience_level: str,
    skills: list,
    projects: list,
    past_questions_history: list = None,
    reg_no: str = None,
    resume_text: str = None,
    global_banned_questions: list = None,
) -> list:
    if not skills or len(skills) == 0 or not projects or len(projects) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume contains no valid skills or projects. Please upload a properly formatted resume before starting the interview."
        )

    # ---- ABSOLUTE GLOBAL BANNED POOL (own history + all similarly-skilled
    # candidates' questions) to guarantee cross-candidate zero-duplication ----
    pool = list((global_banned_questions or []) + (past_questions_history or []))
    seen = set()
    banned_pool = []
    for q in pool:
        if q and q not in seen:
            seen.add(q)
            banned_pool.append(q)

    _, _, _, epoch_ms = _unique_stamp(reg_no)
    resume_text = resume_text or ""
    logger.info(
        "Generating ADAPTIVE INTERVIEW for reg_no=%s | banned pool=%d | fresh resume text length=%d | epoch_ms=%d",
        reg_no, len(banned_pool), len(resume_text), epoch_ms,
    )

    def _category_for(q_num):
        # Category labels ONLY drive the frontend badge; they never constrain
        # the adaptive (template-free) question content.
        if q_num <= 2:
            return "self_intro"
        if q_num <= 5:
            return "education"
        if q_num <= 12:
            return "project_skill"
        if q_num <= 18:
            return "experience"
        return "behavioral"

    # Generate 20 questions ONE AT A TIME with the adaptive human interviewer.
    # Each accepted question is appended to the live banned pool so no two
    # questions in this run (or any prior run) ever repeat.
    questions = []
    for q_num in range(1, 21):
        question_text = await generate_single_unique_question(
            category=_category_for(q_num),
            constraints="Be adaptive, natural and candidate-specific.",
            banned_questions=banned_pool,
            reg_no=reg_no,
            resume_text=resume_text,
            question_number=q_num,
            skills=skills,
            projects=projects,
            job_role=job_role,
        )

        # HARD FREEZE: no fallback — only a confirmed unique question may be used.
        if not question_text:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate dynamic question. Retry required.",
            )

        questions.append({
            "question_number": q_num,
            "category": _category_for(q_num),
            "question_text": question_text,
        })
        banned_pool.append(question_text)

    logger.info("Adaptive interview complete for reg_no=%s | %d unique questions", reg_no, len(questions))
    return questions


# 📊 Single-Answer Evaluation (used at finish-time / suggestion-uniqueness fill)
async def evaluate_single_answer(
    question_text: str,
    category: str,
    candidate_answer: str
) -> dict:
    prompt = f"""
    You are an expert AI Interview Evaluator. Evaluate the candidate's SINGLE answer for ONE interview question.

    Category: {category}
    Question: {question_text}
    Candidate's Answer: {candidate_answer if candidate_answer and candidate_answer.strip() else "(No answer provided - candidate stayed silent or the answer was empty.)"}

    EVALUATION INSTRUCTIONS:
    1. Give a question score from 0 to 100.
    2. Provide concise feedback (2 sentences max) on what was good or missing in the answer.
    3. Provide one concrete, actionable "How to Improve" suggestion (2 sentences max) that is specific to this answer.

    RETURN FORMAT:
    Return ONLY raw JSON with this exact structure:
    {{
        "score": 75,
        "feedback": "Concise feedback here.",
        "suggestion": "Actionable improvement tip here."
    }}
    """

    try:
        content = await _call(
            messages=[
                {"role": "system", "content": "You are a JSON-only response generator. Return raw JSON object with no markdown syntax."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
        )
        data = json.loads(_extract_json(content))
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object.")

        return {
            "score": int(data.get("score", 0)),
            "feedback": data.get("feedback", ""),
            "suggestion": data.get("suggestion", "")
        }
    except Exception as e:
        print(f"Groq Single-Answer Evaluation Error: {str(e)}")
        return {
            "score": None,
            "feedback": "",
            "suggestion": ""
        }


# 📊 Enhanced Evaluation Engine & Detailed Report Generator
async def evaluate_answer_and_generate_report(questions_and_answers: list) -> dict:
    if not questions_and_answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No interview questions and answers provided for evaluation."
        )

    prompt = f"""
    Evaluate the candidate's interview performance.

    Interview Q&A Data:
    {json.dumps(questions_and_answers, indent=2)}

    EVALUATION INSTRUCTIONS:
    1. Provide an overall score (0 to 100) for the whole interview.
    2. Provide a concise overall summary paragraph (2-3 sentences).
    3. Evaluate EVERY question individually:
       - Give a question score from 0 to 100 that reflects how well THIS specific answer
         answered THIS specific question.
       - Provide ONE concrete, actionable improvement suggestion that is TAILORED to what
         the candidate actually said for that question.
    CRITICAL UNIQUENESS RULE:
    - Every question's improvement suggestion MUST be unique. NEVER repeat the same
      suggestion text across two different questions. Reference the specific answer content.

    RETURN FORMAT:
    Return ONLY raw JSON with this exact format:
    {{
        "overall_score": 85,
        "overall_summary": "Overall candidate performance assessment...",
        "evaluations": [
            {{
                "question_number": 1,
                "question_score": 80,
                "question_suggestion": "Answer-specific, unique improvement tip here."
            }}
        ]
    }}
    """

    try:
        content = await _call(
            messages=[
                {"role": "system", "content": "You are a JSON-only response generator. Return raw JSON object with no markdown syntax."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
        )
        data = json.loads(_extract_json(content))
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object.")
    except Exception as e:
        print(f"Groq Report Generation Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Service Unavailable. Please Try Again."
        )

    # Guarantee every question has a score and that all improvement suggestions
    # are UNIQUE and answer-specific (regenerated via AI, never static).
    return await _ensure_unique_suggestions(data, questions_and_answers)


async def _ensure_unique_suggestions(report: dict, questions_and_answers: list) -> dict:
    """Post-process the aggregate report:
    - Fill any missing per-question score with a live per-question AI call.
    - Regenerate any duplicate or empty suggestion via AI until every suggestion
      is unique and tailored to the candidate's own answer.
    Never injects a hardcoded/static suggestion.
    """
    qna_by_num = {int(q.get("question_number")): q for q in questions_and_answers}
    evals_by_num = {
        int(e.get("question_number")): e
        for e in report.get("evaluations", [])
        if "question_number" in e
    }

    used_keys = set()

    for q in questions_and_answers:
        num = int(q.get("question_number"))
        question_text = q.get("question_text", "")
        category = q.get("category", "")
        answer = q.get("candidate_answer", "") or ""

        ev = evals_by_num.get(num, {})

        score = ev.get("question_score")
        if not isinstance(score, (int, float)):
            single = await evaluate_single_answer(question_text, category, answer)
            score = single.get("score", 0)

        suggestion = (ev.get("question_suggestion") or "").strip()
        skey = _normalize_text(suggestion)

        if not suggestion or skey in used_keys:
            for _ in range(4):
                single = await evaluate_single_answer(question_text, category, answer)
                new_suggestion = (single.get("suggestion") or "").strip()
                new_key = _normalize_text(new_suggestion)
                if new_suggestion and new_key not in used_keys:
                    suggestion = new_suggestion
                    skey = new_key
                    break

        if suggestion:
            used_keys.add(skey)

        evals_by_num[num] = {
            "question_number": num,
            "question_score": int(round(float(score))),
            "question_suggestion": suggestion,
        }

    ordered = [
        evals_by_num[int(q.get("question_number"))]
        for q in questions_and_answers
        if int(q.get("question_number")) in evals_by_num
    ]
    report["evaluations"] = ordered
    return report

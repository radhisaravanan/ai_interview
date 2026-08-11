from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from app.routers.auth import get_current_user
from app.database import resumes_collection
import re
from pypdf import PdfReader

router = APIRouter(prefix="/resume", tags=["Resume Management"])

# Below this length, a text extraction attempt is treated as "failed"
MIN_EXTRACTED_CHARS = 80


# --------------------------------------------------------------------------
# 1. PDF TEXT EXTRACTION (pypdf only - instant, < 300ms)
# --------------------------------------------------------------------------
def clean_extracted_text(text: str) -> str:
    """
    Normalize raw PDF text: fix broken encodings, hyphenation across
    line breaks, stray whitespace and repeated blank lines so regex
    parsers see readable text.
    """
    if not text:
        return ""
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2022", "-").replace("\u00a0", " ")
    # join words split across lines: "React\n.js" or "pro-\nject"
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)
    lines = []
    for raw in text.splitlines():
        line = re.sub(r"[ \t]+", " ", raw).strip()
        if line:
            lines.append(line)
    return "\n".join(lines).strip()


def extract_pdf_text(pdf_file) -> str:
    """
    Extract raw text DIRECTLY from the uploaded PDF stream using pypdf.
    Returns cleaned text, or "" when the PDF is empty / scanned / image-only.
    """
    try:
        reader = PdfReader(pdf_file)
    except Exception as e:
        print(f"[resume] pypdf failed to open PDF: {e}")
        return ""
    raw = "\n".join(page.extract_text() or "" for page in reader.pages)
    return clean_extracted_text(raw)


# --------------------------------------------------------------------------
# 2. VALIDITY HEURISTIC (works without any AI)
# --------------------------------------------------------------------------
CAREER_SECTION_KEYWORDS = [
    "education", "skills", "experience", "employment", "objective",
    "summary", "project", "certification", "professional profile",
    "work history", "internship", "achievement", "academic",
    "university", "degree", "course",
]


def has_standard_career_details(text: str) -> bool:
    lowered = text.lower()
    return any(
        re.search(r"\b" + re.escape(kw) + r"\b", lowered)
        for kw in CAREER_SECTION_KEYWORDS
    )


# --------------------------------------------------------------------------
# 3. INSTANT REGEX/SET EXTRACTION (no AI, no hardcoded/mock fallbacks)
#    Skills are ONLY returned when they literally appear in the resume text.
#    No canned profiles, no mock questions - everything is derived from the
#    candidate's own PDF content.
# --------------------------------------------------------------------------
SKILL_MATCH_SET = {
    # Languages
    "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Go",
    "Rust", "Ruby", "PHP", "Kotlin", "Swift", "Scala", "R", "SQL", "HTML",
    "CSS", "Shell", "Bash",
    # Frameworks & Libraries
    "React", "React.js", "React Native", "Next.js", "Vue.js", "Angular",
    "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot",
    "Spring", "Laravel", "Rails", "Flutter", "Dart", "Bootstrap", "Tailwind",
    "jQuery", "Redux", "pandas", "NumPy", "TensorFlow", "PyTorch", "Keras",
    "scikit-learn", "OpenCV",
    # Databases
    "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Oracle", "Redis",
    "Firebase", "DynamoDB", "Cassandra", "Elasticsearch",
    # Cloud & DevOps
    "AWS", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes",
    "Jenkins", "Terraform", "Ansible", "Git", "GitHub", "GitLab",
    "Nginx", "CI/CD", "Linux",
    # Tools & Platforms
    "REST API", "GraphQL", "Postman", "Jira", "Agile", "Scrum",
    "Tableau", "Power BI", "Excel", "Figma", "Jupyter", "Apache Kafka",
    "RabbitMQ", "Celery", "Airflow",
    # Domains
    "Machine Learning", "Deep Learning", "NLP", "Data Science",
    "Computer Vision", "Cybersecurity", "Blockchain", "IoT", "AR",
    "VR", "Microservices", "Big Data", "Hadoop", "Spark",
}

# Lines matching these verbs are treated as project entries.
PROJECT_VERB_RE = re.compile(
    r"\b(developed|built|created|designed|implemented|engineered|devised|"
    r"architected|launched|deployed|constructed|spearheaded)\b",
    re.IGNORECASE,
)

# Minor/secondary tools that must NOT appear as "Top Core Skills" (kept out of
# the clean capped list even if they appear in the resume).
MINOR_SKILLS = {
    "HTML", "CSS", "Git", "GitHub", "GitLab", "Postman", "Jira", "Excel",
    "Bash", "Shell", "Linux", "Agile", "Scrum", "Jupyter", "Figma", "CI/CD",
    "Jenkins", "Nginx", "Ansible", "Terraform", "jQuery", "Bootstrap",
}

# Primary technical core skills ranked by relevance (languages, frameworks,
# databases, cloud, ML). Used to pick the TOP 5-6 skills from everything found.
CORE_SKILL_RANK = {
    "Python": 0, "Java": 1, "C++": 2, "C": 3, "JavaScript": 4, "TypeScript": 5,
    "React": 6, "React.js": 6, "React Native": 7, "Node.js": 8, "Django": 9,
    "Flask": 10, "FastAPI": 11, "Spring Boot": 12, "Spring": 12, "Angular": 13,
    "Vue.js": 14, "Next.js": 15, "SQL": 16, "MySQL": 17, "PostgreSQL": 18,
    "MongoDB": 19, "Redis": 20, "Firebase": 21, "AWS": 22, "Azure": 23,
    "Google Cloud": 24, "GCP": 24, "Docker": 25, "Kubernetes": 26,
    "TensorFlow": 27, "PyTorch": 28, "Machine Learning": 29,
    "Deep Learning": 30, "Data Science": 31, "NLP": 32, "Computer Vision": 33,
    "Flutter": 34, "Kotlin": 35, "Swift": 36, "R": 37, "Go": 38, "Rust": 39,
    "PHP": 40, "C#": 41, "Ruby": 42, "Laravel": 43, "Express": 44,
}

_SECTION_START_RE = re.compile(
    r"^\s*(projects?|academic projects?|professional projects?|personal projects?|"
    r"work samples?)\s*[:]?$", re.IGNORECASE,
)
_SECTION_END_RE = re.compile(
    r"^\s*(skills?|experience|education|certifications?|work history|"
    r"employment|achievements?|objective|summary|internships?|awards|"
    r"interests?|languages?|contact|references)\s*[:]?$", re.IGNORECASE,
)
# Also ends the projects section when a line STARTS with one of these section
# keywords followed by a colon + content (e.g. "Education: B.Tech Computer
# Science, XYZ University" or "Skills: Python, React, ...").
_SECTION_END_PREFIX_RE = re.compile(
    r"^\s*(skills?|experience|education|certifications?|work history|"
    r"employment|achievements?|objective|summary|internships?|awards|"
    r"interests?|languages?|contact|references)\s*[:]",
    re.IGNORECASE,
)

# Lines that describe features / tech stack / responsibilities (NOT titles).
_DESCRIPTION_HINT_RE = re.compile(
    r"\b(using|technolog|framework|database|tool|built with|developed using|"
    r"features|includes|responsible|designed to|aims to|which |that provides|"
    r"allows users|enables|implemented with|tech stack)\b",
    re.IGNORECASE,
)

# Character breaks that end a project title (title: description / title - desc).
_TITLE_BREAK_RE = re.compile(r"\s[-–—,]\s|\s*[:|]\s+")

# Max counts for the clean response payload.
MAX_TOP_SKILLS = 6
MAX_PROJECT_TITLES = 3


def extract_skills_instant(text: str) -> list:
    """Set matching: return ONLY the top 5-6 PRIMARY core skills that are
    literally present in the resume text. Minor/secondary tools (HTML, Git,
    Postman, ...) are filtered out, then the strongest core skills are ranked
    first and the list is capped at MAX_TOP_SKILLS."""
    lowered = text.lower()
    found = []
    for skill in SKILL_MATCH_SET:
        pattern = r"(?<![a-z0-9])" + re.escape(skill.lower()) + r"(?![a-z0-9])"
        if re.search(pattern, lowered):
            if skill not in found:
                found.append(skill)

    # Drop minor/secondary tools from the "top skills" list.
    primary = [s for s in found if s not in MINOR_SKILLS]

    # Rank primary skills so languages/frameworks/databases/cloud come first.
    primary.sort(key=lambda s: CORE_SKILL_RANK.get(s, 1000))

    # If we somehow have fewer than MAX after filtering, top up with the
    # remaining found skills (never minor tools if a primary exists).
    if len(primary) < MAX_TOP_SKILLS:
        for s in found:
            if s not in primary and s not in MINOR_SKILLS and len(primary) < MAX_TOP_SKILLS:
                primary.append(s)

    return primary[:MAX_TOP_SKILLS]


def _clean_project_title(raw: str) -> str:
    """Reduce a raw project line to a concise title ONLY (strip numbers,
    bullets, descriptions, tech stacks and feature lists)."""
    title = re.sub(r"^[\s\d\.\)\-•·*]+", "", raw).strip()
    # Cut off anything after 'title: description', 'title - desc', 'title, desc'.
    title = re.split(_TITLE_BREAK_RE, title)[0].strip()
    # Cut off trailing descriptions / tech-stack tails.
    title = re.split(
        r"\.\s|\s+using\s+|\s+with\s+|\s+for\s+|\s+to\s+|\s+which\s+|\s+that\s+",
        title,
    )[0].strip().rstrip(".")
    # Drop a leading article ("an E-commerce Platform" -> "E-commerce Platform").
    title = re.sub(r"^(a|an|the)\s+", "", title, flags=re.IGNORECASE).strip()
    return title.strip()


def extract_projects_instant(text: str) -> list:
    """Regex extraction of CONCISE project TITLES ONLY (max 2-3). Long
    descriptions, bullet points, feature lists and tech stacks are stripped."""
    lines = text.splitlines()
    in_projects_section = False
    candidates = []
    for raw in lines:
        line = re.sub(r"\s+", " ", raw).strip()
        if not line:
            continue
        if _SECTION_START_RE.search(line):
            in_projects_section = True
            continue
        if in_projects_section and (_SECTION_END_RE.search(line) or _SECTION_END_PREFIX_RE.search(line)):
            in_projects_section = False
            continue

        if in_projects_section:
            # Strip bullet markers ("- ", "• ", ...) so bulleted project
            # entries are parsed as titles, NOT skipped.
            line = re.sub(r"^\s*[-•·*◦▪‣–—]\s*", "", line).strip()
            if not line:
                continue
            # Strip leading project verbs: "Developed a X" -> "X".
            stripped = re.sub(
                r"^(developed|built|created|designed|implemented|engineered|"
                r"devised|architected|launched|deployed|constructed|spearheaded|"
                r"used|uses|built using)\b\s*",
                "", line, flags=re.IGNORECASE,
            )
            title = _clean_project_title(stripped)
            if len(title.split()) < 2:
                continue
            if not any(w[0].isupper() for w in title.split() if w[0].isalpha()):
                continue  # all-lowercase -> not a project title
            if len(title.split()) > 10:
                continue  # still too long after splitting -> description, not a title
            if _DESCRIPTION_HINT_RE.search(title):
                continue  # title portion itself describes features/tech
            candidates.append(title)
        elif PROJECT_VERB_RE.search(line):
            # Line begins with a build verb (outside a PROJECTS section):
            # keep the subject/title that follows the verb.
            match = PROJECT_VERB_RE.search(line)
            rest = line[match.end():].strip(" -•·*:,.")
            if rest and not _DESCRIPTION_HINT_RE.search(rest):
                title = _clean_project_title(rest)
                if len(title.split()) >= 2:
                    candidates.append(title)

    cleaned = []
    for c in candidates:
        if c and c not in cleaned:
            cleaned.append(c)
    return cleaned[:MAX_PROJECT_TITLES]


def extract_experience_instant(text: str) -> str:
    """Regex extraction of years of experience (e.g. '3+ years', '5 years')."""
    m = re.search(r"(\d{1,2})\s*\+?\s*(?:yrs?|years?)\s*(?:of\s+experience)?", text, re.IGNORECASE)
    if m:
        return f"{m.group(1)}+ years"
    return ""


# --------------------------------------------------------------------------
# 3.5 POST-PROCESSING FILTER (strip personal details from extracted lists)
# --------------------------------------------------------------------------
def extract_candidate_name(text: str) -> str:
    """
    Best-effort detection of the candidate's name from the top of the resume.
    The name is usually the first short line in Title Case or ALL CAPS that is
    not a section header and contains no digits, emails, or phone numbers.
    """
    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) > 45:
            continue
        words = line.split()
        if not 1 <= len(words) <= 5:
            continue
        if any(ch.isdigit() for ch in line) or "@" in line:
            continue
        if re.search(r"\+?\d[\d\s\-().]{6,}\d", line):
            continue
        lowered = line.lower()
        if any(kw in lowered for kw in (
            "resume", "curriculum", "profile", "career", "objective", "summary",
        )):
            continue
        if all(w and w[0].isupper() for w in words):
            return line
    return ""


def clean_extraction_lists(skills, projects, text, reg_no):
    """
    Remove candidate personal details that leaked into the extracted lists:
    - any item containing the candidate's name, reg_no, email, or phone number
    - single-word items and uppercase initials in the projects array
    """
    blocked = set()
    name = extract_candidate_name(text)
    if name:
        blocked.update(
            token.strip().lower()
            for token in name.split()
            if len(token.strip()) > 1
        )
    if reg_no:
        blocked.add(str(reg_no).lower())
    for email in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text):
        blocked.add(email.lower())
    for phone in re.findall(r"\+?\d[\d\s\-().]{6,}\d", text):
        blocked.add(re.sub(r"\s+", "", phone).lower())

    def contains_personal(item):
        low = item.lower()
        if any(token and token in low for token in blocked):
            return True
        if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", item):
            return True
        if re.search(r"\+?\d[\d\s\-().]{6,}\d", item):
            return True
        return False

    def dedupe(items):
        seen, out = set(), []
        for it in items:
            key = it.lower()
            if key not in seen:
                seen.add(key)
                out.append(it)
        return out

    skills = [
        s.strip() for s in skills
        if s and s.strip() and not contains_personal(s)
    ]

    cleaned_projects = []
    for p in projects:
        item = p.strip()
        if not item or contains_personal(item):
            continue
        words = item.split()
        if len(words) == 1:
            continue  # single-word item: likely a name / location / initial
        if item.isupper() and len(item) <= 20:
            continue  # uppercase initials such as "MANGUDIS"
        cleaned_projects.append(item)
    projects = cleaned_projects

    return dedupe(skills), dedupe(projects)


# --------------------------------------------------------------------------
# 4. UPLOAD ENDPOINT — INSTANT, NON-BLOCKING
#    pypdf parse + regex/set extraction only. Returns immediately (200 OK).
#    NO AI call, NO question generation here. Interview questions are
#    generated ON-DEMAND when the candidate starts the interview
#    (POST /interview/start).
# --------------------------------------------------------------------------
@router.post("/upload", status_code=200)
async def upload_resume(
    file: UploadFile = File(...),
    department: str = Form(...),
    role: str = Form(...),
    experience: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    user_reg_no = current_user.get("reg_no")

    # 1. File Type Check
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resume files are supported."
        )

    # 2. Extract Text Directly from the Uploaded PDF Stream (pypdf)
    try:
        extracted_text = extract_pdf_text(file.file)
    except Exception as e:
        print(f"[resume] pypdf extraction failed: {e}")
        extracted_text = ""

    if not extracted_text or not extracted_text.strip() or len(extracted_text.strip()) < MIN_EXTRACTED_CHARS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RESUME_PARSING_FAILED",
        )

    # 3. Instant Regex/Set extraction (no AI, no mock fallbacks).
    skills, projects = clean_extraction_lists(
        extract_skills_instant(extracted_text),
        extract_projects_instant(extracted_text),
        extracted_text,
        user_reg_no,
    )
    # Hard caps: max 6 clean top skills, max 3 concise project titles.
    skills = skills[:MAX_TOP_SKILLS]
    projects = projects[:MAX_PROJECT_TITLES]
    experience_years = extract_experience_instant(extracted_text) or experience
    is_valid = has_standard_career_details(extracted_text)

    if not skills or not projects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RESUME_PARSING_FAILED",
        )

    # 4. Save to Database (Upsert) — fast, no AI involved.
    resume_doc = {
        "reg_no": user_reg_no,
        "filename": file.filename,
        "extracted_text": extracted_text,
        "skills": skills,
        "projects": projects,
        "certifications": [],
        "department": department,
        "job_role": role,
        "experience_level": experience_years,
    }

    await resumes_collection.update_one(
        {"reg_no": user_reg_no},
        {"$set": resume_doc},
        upsert=True
    )

    # 5. Return IMMEDIATELY. No question generation here — the candidate's
    #    interview questions are generated ON-DEMAND one-by-one at
    #    GET /interview/next-question?session_id=<reg_no>&question_index=1..20.
    return {
        "isValidResume": is_valid,
        "generatedInterviewQuestions": [],
        "message": "Resume parsed successfully! Interview questions will be generated on-demand.",
        "skills": skills,
        "top_skills": skills,
        "projects": projects,
        "certifications": [],
        "session_id": user_reg_no,
        "experience_level": experience_years,
        "department": department,
        "job_role": role,
    }

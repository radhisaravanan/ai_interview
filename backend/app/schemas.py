from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Existing Schemas (Register & Login)
class UserRegister(BaseModel):
    reg_no: str = Field(..., example="921321104001")
    password: str = Field(..., example="mystrongpassword")

class UserLogin(BaseModel):
    reg_no: str
    password: str

class UserOut(BaseModel):
    id: str
    reg_no: str
    is_approved: bool
    is_admin: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

# NEW: Resume & Interview Candidate Details Schema
class CandidateDetailOut(BaseModel):
    user_id: str
    department: str
    job_role: str
    experience_level: str  # 'Fresher' or 'Experienced'
    extracted_skills: List[str]
    extracted_projects: List[str]
    extracted_certifications: List[str]
    short_summary: str
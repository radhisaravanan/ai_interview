import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_interview_db")

# MongoDB Connection
client = AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]

def get_database():
    return database

# Collections Setup
users_collection = database["users"]
resumes_collection = database["resumes"]
interview_sessions_collection = database["interview_sessions"]  # legacy (read-only fallback)
asked_questions_collection = database["asked_questions"]  # repeat-prevention store (reg_no keyed)
interview_records_collection = database["interview_records"]  # single doc per candidate (reg_no = _id)
global_asked_questions_collection = database["global_asked_questions"]  # ACROSS ALL CANDIDATES & SESSIONS
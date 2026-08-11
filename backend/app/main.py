from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, resume, interview

app = FastAPI(
    title="AI Mock Interview Platform API",
    version="1.0.0",
    description="Backend API for AI-based mock interview system"
)

# Enable CORS for React Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(interview.router)

@app.get("/", tags=["Health Check"])
def root():
    return {"message": "AI Mock Interview Backend API is running successfully!"}
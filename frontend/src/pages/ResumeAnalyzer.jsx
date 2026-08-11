import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../assets/css/upload.css";

const ResumeAnalyzer = () => {
  const navigate = useNavigate();

  // ==============================
  // STATES
  // ==============================

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState([]);

  const [errorMsg, setErrorMsg] = useState("");
  const [flashMessage, setFlashMessage] = useState("");

  const [roleOpen, setRoleOpen] = useState(false);

  const [candidateDetails, setCandidateDetails] = useState({
    department: "",
    role: "",
    experience: "",
  });

  // ==============================
  // DEPARTMENT WISE ROLES
  // ==============================

  const departmentRoles = {
    CSE: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "Java Developer",
      "Python Developer",
      "React Developer",
      "Node.js Developer",
      "Cloud Engineer",
      "DevOps Engineer",
      "Cyber Security Analyst",
      "QA Engineer",
      "Mobile App Developer",
      "Game Developer",
      "Database Developer",
    ],

    IT: [
      "Software Developer",
      "Web Developer",
      "System Administrator",
      "Network Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
      "Database Administrator",
      "Technical Support Engineer",
      "Cyber Security Analyst",
      "Business Analyst",
      "UI/UX Developer",
      "IT Support Engineer",
      "Application Support Engineer",
      "Software Tester",
      "System Analyst",
    ],

    "AI&DS": [
      "AI Engineer",
      "Machine Learning Engineer",
      "Data Scientist",
      "Data Analyst",
      "Business Intelligence Analyst",
      "Deep Learning Engineer",
      "Computer Vision Engineer",
      "NLP Engineer",
      "Prompt Engineer",
      "Generative AI Engineer",
      "Data Engineer",
      "Research Engineer",
      "Big Data Engineer",
      "AI Research Assistant",
      "Analytics Engineer",
    ],

    ECE: [
      "Embedded Systems Engineer",
      "Electronics Engineer",
      "VLSI Design Engineer",
      "Firmware Engineer",
      "IoT Engineer",
      "PCB Design Engineer",
      "Telecommunication Engineer",
      "RF Engineer",
      "Automation Engineer",
      "Hardware Engineer",
      "Robotics Engineer",
      "Testing Engineer",
      "Control Systems Engineer",
      "ASIC Engineer",
      "Signal Processing Engineer",
    ],

    EEE: [
      "Electrical Design Engineer",
      "Power Systems Engineer",
      "Automation Engineer",
      "PLC Programmer",
      "Electrical Maintenance Engineer",
      "Control Systems Engineer",
      "Substation Engineer",
      "Solar Engineer",
      "Energy Engineer",
      "Testing Engineer",
      "Field Engineer",
      "Project Engineer",
      "Electrical Site Engineer",
      "Protection Engineer",
      "Commissioning Engineer",
    ],

    MECH: [
      "Mechanical Design Engineer",
      "CAD Engineer",
      "CAE Engineer",
      "Production Engineer",
      "Manufacturing Engineer",
      "Maintenance Engineer",
      "Quality Engineer",
      "Industrial Engineer",
      "HVAC Engineer",
      "Automobile Engineer",
      "Robotics Engineer",
      "Project Engineer",
      "Tool Design Engineer",
      "Plant Engineer",
      "Process Engineer",
    ],

    CIVIL: [
      "Site Engineer",
      "Structural Engineer",
      "Construction Engineer",
      "Planning Engineer",
      "Quantity Surveyor",
      "Project Engineer",
      "Survey Engineer",
      "Transportation Engineer",
      "Geotechnical Engineer",
      "Environmental Engineer",
      "Building Design Engineer",
      "Quality Control Engineer",
      "Bridge Engineer",
      "Water Resources Engineer",
      "Highway Engineer",
    ],
  };
    // ==============================
  // LOAD SAVED DETAILS
  // ==============================

  useEffect(() => {
    const details = JSON.parse(
      localStorage.getItem("interview_details")
    );

    if (details) {
      setCandidateDetails(details);
    }
  }, []);

  // ==============================
  // CLEAR CACHE
  // ==============================

  const clearResumeCache = () => {
    localStorage.removeItem("resume_context");
    localStorage.removeItem("resume_questions_log");
    localStorage.removeItem("interview_questions");
  };

  // ==============================
  // FILE CHANGE
  // ==============================

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setErrorMsg("");
  };

  // ==============================
  // UPLOAD & ANALYZE RESUME
  // ==============================

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!candidateDetails.department) {
      setErrorMsg("Please select your department.");
      return;
    }

    if (!candidateDetails.role) {
      setErrorMsg("Please select your target role.");
      return;
    }

    if (!candidateDetails.experience) {
      setErrorMsg("Please select your experience.");
      return;
    }

    if (!file) {
      setErrorMsg("Please upload your resume (PDF).");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("department", candidateDetails.department);
    formData.append("role", candidateDetails.role);
    formData.append("experience", candidateDetails.experience);

    try {
      const { data } = await API.post(
        "/resume/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (data.isValidResume) {
        const generatedQuestions =
          data.generatedInterviewQuestions || [];

        setQuestions(generatedQuestions);

        // Save interview details
        localStorage.setItem(
          "interview_details",
          JSON.stringify(candidateDetails)
        );

        // Save resume context
        localStorage.setItem(
          "resume_context",
          JSON.stringify({
            details: candidateDetails,
            questions: generatedQuestions,
          })
        );

        // Save generated questions
        localStorage.setItem(
          "resume_questions_log",
          JSON.stringify(generatedQuestions)
        );

        localStorage.setItem(
          "interview_questions",
          JSON.stringify(generatedQuestions)
        );

        // Save extracted resume details
        localStorage.setItem(
          "resume_extraction",
          JSON.stringify({
            top_skills: data.top_skills || [],
            projects: data.projects || [],
          })
        );

        // Allow next stage
        localStorage.setItem("highest_stage", "4");

        // Go to Resume Extraction Result page
        setTimeout(() => {
          navigate("/resume-result");
        }, 1000);

      } else {
        clearResumeCache();

        setErrorMsg("This is not a valid resume.");

        setFlashMessage("❌ Invalid Resume");

        setTimeout(() => {
          setFlashMessage("");
        }, 2000);
      }

    } catch (error) {
      setErrorMsg(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Resume upload failed."
      );
    } finally {
      setLoading(false);
    }
  };
    return (
    <div className="upload-page">
      <div className="upload-overlay"></div>

      {/* Flash Message */}
      {flashMessage && (
        <div className="flash-message">
          {flashMessage}
        </div>
      )}

      {/* Upload Card */}
      <div className="upload-card">

        <div className="upload-icon">
          📄
        </div>

        <h1>AI Resume Analyzer</h1>

        {errorMsg && (
          <p className="error-message">
            {errorMsg}
          </p>
        )}

        {/* Department */}
        <label>🏢 Department</label>

        <select
          value={candidateDetails.department}
          onChange={(e) => {
            setCandidateDetails({
              ...candidateDetails,
              department: e.target.value,
              role: "",
            });

            setRoleOpen(false);
          }}
        >
          <option value="">Select Department</option>

          <option value="CSE">CSE</option>
          <option value="IT">IT</option>
          <option value="AI&DS">AI&DS</option>
          <option value="ECE">ECE</option>
          <option value="EEE">EEE</option>
          <option value="MECH">MECH</option>
          <option value="CIVIL">CIVIL</option>
        </select>

        {/* Target Role */}
        <label>🎯 Target Role</label>

        <div className="custom-role-dropdown">

          <div
            className={`role-selected ${
              !candidateDetails.department ? "disabled" : ""
            }`}
            onClick={() => {
              if (candidateDetails.department) {
                setRoleOpen(!roleOpen);
              }
            }}
          >
            <span>
              {candidateDetails.role || "Select Role"}
            </span>

            <span>⌄</span>
          </div>

          {roleOpen && candidateDetails.department && (
            <div className="role-list">

              {departmentRoles[
                candidateDetails.department
              ]?.map((role, index) => (

                <div
                  key={index}
                  className="role-item"
                  onClick={() => {
                    setCandidateDetails({
                      ...candidateDetails,
                      role,
                    });

                    setRoleOpen(false);
                  }}
                >
                  {role}
                </div>

              ))}

            </div>
          )}

        </div>

        {/* Experience */}

        <label>💼 Experience</label>

        <select
          value={candidateDetails.experience}
          onChange={(e) =>
            setCandidateDetails({
              ...candidateDetails,
              experience: e.target.value,
            })
          }
        >
          <option value="">Select Experience</option>

          <option value="Fresher">
            Fresher
          </option>

          <option value="1-2 Years">
            1-2 Years
          </option>

          <option value="3-5 Years">
            3-5 Years
          </option>

          <option value="5+ Years">
            5+ Years
          </option>

        </select>

        {/* Resume Upload */}

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
        >
          {loading
            ? "Analyzing Resume..."
            : "Upload & Analyze"}
        </button>

      </div>

    </div>
  );
};

export default ResumeAnalyzer;
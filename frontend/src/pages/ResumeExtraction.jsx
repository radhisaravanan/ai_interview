import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import "../assets/css/upload.css";

const ResumeExtraction = () => {
  const navigate = useNavigate();

  const extraction = JSON.parse(
    localStorage.getItem("resume_extraction")
  ) || {
    top_skills: [],
    projects: [],
  };

  const handleProceed = () => {
    navigate("/instructions");
  };

  return (
    <div className="upload-page">
      <div className="upload-overlay"></div>

      <div className="result-card">
        <div className="success-icon">✓</div>

        <h1>Resume Extraction Result</h1>

        <div className="details-result">
          <h2>🧠 Top Core Skills</h2>
          {extraction.top_skills.length > 0 ? (
            <div className="skill-badges">
              {extraction.top_skills.map((skill, index) => (
                <span key={index} className="skill-badge">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p>No skills extracted.</p>
          )}

          <h2>📁 Extracted Projects</h2>
          {extraction.projects.length > 0 ? (
            <div className="project-list">
              {extraction.projects.map((project, index) => (
                <div key={index} className="project-item">
                  <span className="project-dot">●</span>
                  <span className="project-title">{project}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No projects extracted.</p>
          )}
        </div>

        <button className="proceed-btn" onClick={handleProceed}>
          Proceed to Instructions <FaArrowRight />
        </button>
      </div>
    </div>
  );
};

export default ResumeExtraction;

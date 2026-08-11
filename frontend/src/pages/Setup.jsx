import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCloudUploadAlt,
  FaFilePdf,
  FaRobot,
  FaSpinner,
} from "react-icons/fa";
import API from "../services/api";
import "../assets/css/dashboard.css"; // Reusing dashboard styles or your custom setup setup

function Setup() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
    } else {
      setError("Please select a valid PDF file.");
      setFile(null);
    }
  };

  const handleAnalyzeAndStart = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload your resume first!");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      // Send resume to backend for skill analysis
      const response = await API.post("/resume/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        const { detectedRole, skills, sessionId } = response.data;

        // Save session data locally to build custom questions in the next step
        localStorage.setItem("sessionId", sessionId);
        localStorage.setItem("detectedRole", detectedRole);
        localStorage.setItem("parsedSkills", JSON.stringify(skills));

        alert(
          `Resume analyzed successfully for: ${detectedRole}! Starting your tailored interview.`,
        );
        navigate("/interview"); // Redirect to the actual interview loop
      } else {
        setError(response.data.message || "Failed to analyze resume.");
      }
    } catch (err) {
      console.error("Resume processing failed:", err);
      setError(
        err.response?.data?.message ||
          "An error occurred while analyzing your resume.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <div
        className="dashboard-card"
        style={{ padding: "30px", textAlign: "center" }}
      >
        <div
          className="card-header"
          style={{ justifyContent: "center", gap: "10px" }}
        >
          <h2>
            <FaRobot /> AI Resume Interview Setup
          </h2>
        </div>
        <p style={{ margin: "15px 0", color: "#666" }}>
          Upload your resume. Our AI will extract your structural skills and
          auto-generate specialized questions just for you.
        </p>

        {error && (
          <div style={{ color: "red", marginBottom: "15px" }}>{error}</div>
        )}

        <form onSubmit={handleAnalyzeAndStart}>
          <div style={{ margin: "20px 0" }}>
            <label
              htmlFor="resume-upload"
              style={{
                display: "block",
                border: "2px dashed #ccc",
                padding: "40px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: "#f9f9f9",
              }}
            >
              <FaCloudUploadAlt
                size={40}
                style={{ color: "#aaa", marginBottom: "10px" }}
              />
              {file ? (
                <div>
                  <FaFilePdf style={{ color: "red", marginRight: "5px" }} />
                  <strong>{file.name}</strong>
                </div>
              ) : (
                <div>
                  <span>Click to select your PDF resume</span>
                  <br />
                  <small style={{ color: "#99px" }}>
                    Only PDF formats accepted
                  </small>
                </div>
              )}
              <input
                id="resume-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={loading}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <button
            type="submit"
            className="start-btn"
            style={{ width: "100%", padding: "12px", justifyContent: "center" }}
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <FaSpinner className="fa-spin" style={{ marginRight: "8px" }} />{" "}
                Analyzing Profile...
              </>
            ) : (
              "Generate Custom Interview"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Setup;

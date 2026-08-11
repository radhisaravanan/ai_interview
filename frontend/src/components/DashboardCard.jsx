import { useNavigate } from "react-router-dom";
import API from "../services/api";

import { FaPlay, FaFileAlt, FaHistory, FaUser, FaRobot } from "react-icons/fa";

import "../assets/css/dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  // Get logged-in user
  const user = JSON.parse(localStorage.getItem("user")) || {
    full_name: "Candidate",
  };

  // ==========================
  // Start Interview
  // ==========================
  const startInterview = async () => {
    try {
      const response = await API.post("/interview/start");

      if (response.data.success) {
        navigate(`/interview/${response.data.sessionId}`);
      } else {
        alert(response.data.message || "Unable to start interview.");
      }
    } catch (error) {
      console.error("Error starting interview:", error);

      // Offline fallback
      navigate("/interview/1");
    }
  };

  return (
    <div className="dashboard">
      <h1>Welcome {user.full_name || user.name || "Candidate"}</h1>

      <p>AI Voice Interview Dashboard</p>

      <div className="dashboard-grid">
        {/* Resume Analyzer */}
        <div className="dashboard-card" onClick={() => navigate("/resume")}>
          <FaFileAlt size={45} />
          <h3>Upload Resume</h3>
          <p>Upload your resume and let AI analyze your skills.</p>
        </div>

        {/* Start Interview */}
        <div className="dashboard-card" onClick={startInterview}>
          <FaPlay size={45} />
          <h3>Start Interview</h3>
          <p>Begin your AI Interview Session.</p>
        </div>

        {/* History */}
        <div className="dashboard-card" onClick={() => navigate("/history")}>
          <FaHistory size={45} />
          <h3>Interview History</h3>
          <p>View previous interviews and reports.</p>
        </div>

        {/* Profile */}
        <div className="dashboard-card" onClick={() => navigate("/profile")}>
          <FaUser size={45} />
          <h3>Profile</h3>
          <p>Manage your profile information.</p>
        </div>
      </div>

      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <FaRobot size={60} />
        <h2>AI Interview Assistant</h2>
      </div>
    </div>
  );
}

export default Dashboard;

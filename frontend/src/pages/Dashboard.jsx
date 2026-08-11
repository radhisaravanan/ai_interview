import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import "../assets/css/dashboard.css";

// Required Icons
import { FaPlay, FaHistory, FaChartLine, FaFileAlt } from "react-icons/fa";

const Dashboard = () => {
  const navigate = useNavigate();
  const [candidateId, setCandidateId] = useState("9301");
  const [collapsed, setCollapsed] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || { name: "Student" };

  useEffect(() => {
    const storedRegno = localStorage.getItem("user_regno");
    if (storedRegno) setCandidateId(storedRegno);
  }, []);

  // =============== NAVIGATION TRIGGERS TO STANDALONE PAGES ===============
  const openHome = () => navigate("/dashboard");

  const startInterview = () => {
    localStorage.setItem("highest_stage", "3");
    navigate("//resume-analyzer"); // Direct dynamic redirection to new page
  };

  const openResume = () => {
    localStorage.setItem("highest_stage", "3");
    navigate("/resume"); // Standalone new page
  };

  const openReports = () => navigate("/report");
  const openHistory = () => navigate("/history");

  return (
    <div className="dashboard-layout" style={masterLayoutFixStyle}>
      <div style={darkOverlayStyle} />

      {/* 🔴 SIDEBAR INTEGRATION */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onHomeClick={openHome}
        onInterviewClick={startInterview}
        onResumeClick={openResume}
        onReportsClick={openReports}
        onHistoryClick={openHistory}
        activePanel="home" // Since this file is explicitly home dashboard now
      />

      <div
        className={`dashboard-page ${collapsed ? "collapsed" : ""}`}
        style={contentPageDynamicStretchStyle}
      >
        {/* ================= 🏠 CORE DASHBOARD HOME VIEWS ================= */}
        <div style={homePanelStackStyle}>
          {/* Top Stat Summary Cards */}
          <div className="stats-container">
            <div
              className="stat-card total-card"
              onClick={openHistory}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon">
                <FaHistory />
              </div>
              <div>
                <h2>25</h2>
                <p>Total Interviews</p>
              </div>
            </div>
            <div
              className="stat-card average-card"
              onClick={openReports}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon">
                <FaChartLine />
              </div>
              <div>
                <h2>89%</h2>
                <p>Average Score</p>
              </div>
            </div>
            <div
              className="stat-card resume-card"
              onClick={openResume}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon">
                <FaFileAlt />
              </div>
              <div>
                <h2>85%</h2>
                <p>Resume Score</p>
              </div>
            </div>
          </div>

          {/* Main Welcome Hero Box */}
          <div className="hero-card">
            
            <button className="start-btn" onClick={startInterview}>
              <FaPlay /> Start AI Interview
            </button>
          </div>

          {/* 🎯 QUICK ACCESS MATRIX */}
          <div className="quick-section">
            <h2>Quick Access</h2>
            <div className="quick-access">
              <div
                className="quick-card interview-card"
                onClick={startInterview}
              >
                <div className="circle-icon">
                  <FaPlay />
                </div>
                <h3>AI Interview</h3>
              </div>
              <div className="quick-card resume-btn" onClick={openResume}>
                <div className="circle-icon">
                  <FaFileAlt />
                </div>
                <h3>Resume Analyzer</h3>
              </div>
              <div className="quick-card report-btn" onClick={openReports}>
                <div className="circle-icon">
                  <FaChartLine />
                </div>
                <h3>Performance Reports</h3>
              </div>
              <div className="quick-card history-btn" onClick={openHistory}>
                <div className="circle-icon">
                  <FaHistory />
                </div>
                <h3>Interview History</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= STYLING METRICS =================
const masterLayoutFixStyle = {
  position: "relative",
  minHeight: "100vh",
  backgroundColor: "#0b1329",
  display: "flex",
};
const darkOverlayStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(11, 19, 41, 0.45)",
  pointerEvents: "none",
  zIndex: 1,
};
const contentPageDynamicStretchStyle = {
  flex: 1,
  position: "relative",
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  width: "100%",
};
const homePanelStackStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  padding: "20px",
  boxSizing: "border-box",
};

export default Dashboard;
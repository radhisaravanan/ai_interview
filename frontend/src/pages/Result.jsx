import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Result() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [report, setReport] = useState(null);

  const sessionId =
    localStorage.getItem("sessionId") ||
    sessionStorage.getItem("last_interview_session") ||
    "";

  useEffect(() => {
    const fetchResult = async () => {
      try {
        if (!sessionId) {
          setErrorMsg("No interview session found. Please complete an interview first.");
          setLoading(false);
          return;
        }

        const res = await API.get(`/interview/report/${sessionId}`);
        setReport(res.data);
      } catch (err) {
        console.error("Failed to fetch result:", err);
        setErrorMsg(
          err.response?.data?.detail ||
            "Failed to load your result. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [sessionId]);

  const handleViewDetailedReport = () => {
    navigate("/report");
  };

  const handleFinishAndLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <h2 style={styles.loadingTitle}>Calculating Evaluation Report...</h2>
        <p style={styles.loadingSubtext}>
          Your final AI evaluation is being prepared.
        </p>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes spin { to { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.cardContainer}>
          <div style={styles.header}>
            <div style={styles.badge}>RESULT</div>
            <h1 style={styles.mainTitle}>⚠️ Unable to Load Result</h1>
            <p style={styles.subTitle}>{errorMsg}</p>
          </div>
          <div style={styles.actionRow}>
            <button onClick={() => navigate("/dashboard")} style={styles.reportBtn}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const overall = report?.overall_score ?? 0;
  const regNo = report?.reg_no || "Candidate";

  return (
    <div style={styles.pageContainer}>
      <div style={styles.cardContainer}>
        <div style={styles.header}>
          <div style={styles.badge}>COMPLETED</div>
          <h1 style={styles.mainTitle}>Interview Completed</h1>
          <p style={styles.subTitle}>
            Candidate Register Number:{" "}
            <strong style={{ color: "#38bdf8" }}>{regNo}</strong>
          </p>
        </div>

        <div style={styles.scoreSection}>
          <small style={styles.scoreLabel}>OVERALL SCORE</small>
          <h2 style={styles.scoreValue}>{overall}%</h2>
        </div>

        <div style={styles.actionRow}>
          <button onClick={handleViewDetailedReport} style={styles.reportBtn}>
            📋 View Detailed Report
          </button>

          <button onClick={handleFinishAndLogout} style={styles.logoutBtn}>
            Exit Session & Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    padding: "40px 20px",
    background: "#0b1329",
    color: "#fff",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    maxWidth: "560px",
    width: "100%",
    background: "#1e293b",
    padding: "40px",
    borderRadius: "20px",
    border: "1px solid #334155",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
  },
  header: { textAlign: "center", marginBottom: "32px" },
  badge: {
    background: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "800",
    display: "inline-block",
    marginBottom: "12px",
    letterSpacing: "1px",
  },
  mainTitle: {
    fontSize: "28px",
    fontWeight: "800",
    margin: "0 0 8px 0",
    color: "#f8fafc",
  },
  subTitle: { fontSize: "14px", color: "#94a3b8", margin: 0 },
  scoreSection: {
    background: "#0f172a",
    padding: "36px 20px",
    borderRadius: "16px",
    border: "1px solid #334155",
    marginBottom: "8px",
  },
  scoreLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "1px",
    display: "block",
    marginBottom: "10px",
  },
  scoreValue: { fontSize: "64px", fontWeight: "900", margin: 0, color: "#4ade80" },
  actionRow: {
    display: "flex",
    gap: "16px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "28px",
  },
  reportBtn: {
    padding: "14px 24px",
    background: "#0284c7",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },
  logoutBtn: {
    padding: "14px 24px",
    background: "#475569",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },
  loadingContainer: {
    padding: "80px 20px",
    color: "#fff",
    textAlign: "center",
    background: "#0f172a",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #1e293b",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: "20px",
  },
  loadingTitle: { fontSize: "22px", fontWeight: "700", margin: "0 0 10px 0" },
  loadingSubtext: { fontSize: "14px", color: "#94a3b8", margin: 0 },
};

export default Result;

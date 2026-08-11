import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const Report = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedIdx, setExpandedIdx] = useState(0);

  const sessionId = localStorage.getItem("sessionId");

  useEffect(() => {
    const buildReport = async () => {
      try {
        if (!sessionId) {
          setErrorMsg("No interview session data found. Please complete an interview first.");
          setLoading(false);
          return;
        }

        const { data } = await API.get(`/interview/report/${sessionId}`);

        if (data && Array.isArray(data.interview_data)) {
          setReportData(data);
        } else {
          throw new Error("Invalid report format from API.");
        }
      } catch (err) {
        console.error("Failed to load detailed report:", err);
        setErrorMsg(
          err.response?.data?.detail ||
            "Unable to load evaluation data. Please restart the interview session.",
        );
      } finally {
        setLoading(false);
      }
    };

    buildReport();
  }, [sessionId]);

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={loadingPageStyle}>
        <div style={{ textAlign: "center" }}>
          <div style={spinnerStyle} />
          <h2
            style={{
              color: "#f8fafc",
              fontSize: "22px",
              fontWeight: "700",
              margin: "24px 0 8px 0",
            }}
          >
            Loading your detailed report...
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Fetching question-by-question scores and improvement tips.
          </p>
        </div>
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
      <div style={loadingPageStyle}>
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2
            style={{
              color: "#f87171",
              fontSize: "20px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            {errorMsg}
          </h2>
          <button onClick={() => navigate("/result")} style={retryBtnStyle}>
            ← Back to Result
          </button>
        </div>
      </div>
    );
  }

  const evaluations = reportData?.interview_data || [];

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* HEADER */}
        <div style={headerStyle}>
          <div>
            <span style={stageLabelStyle}>Stage 7 · Detailed Evaluation</span>
            <h1 style={pageTitleStyle}>📊 Question-by-Question Performance Report</h1>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: "8px 0 0 0" }}>
              Candidate:{" "}
              <strong style={{ color: "#38bdf8" }}>
                {reportData?.reg_no || "Candidate"}
              </strong>{" "}
              · Overall Score:{" "}
              <strong style={{ color: "#10b981" }}>
                {reportData?.overall_score ?? 0}%
              </strong>
            </p>
          </div>
          <div
            style={{
              ...gradeCircleStyle,
              borderColor: "#38bdf8",
              color: "#38bdf8",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontWeight: "700",
                letterSpacing: "0.05em",
              }}
            >
              QUESTIONS
            </span>
            <span style={{ fontSize: "28px", fontWeight: "900", lineHeight: 1 }}>
              {evaluations.length}
            </span>
          </div>
        </div>

        {/* EVALUATIONS LIST */}
        <div style={sectionStyle}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h2 style={sectionTitleStyle}>🧠 Detailed Q&A Breakdown</h2>
            <p style={sectionSubtitleStyle}>
              Every question with your transcribed answer, its score, and a
              unique improvement tip.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {evaluations.map((ev, idx) => {
              const isOpen = expandedIdx === idx;
              const score = ev.question_score ?? 0;
              const scoreColor =
                score >= 75 ? "#10b981" : score >= 50 ? "#38bdf8" : "#f59e0b";
              return (
                <div
                  key={idx}
                  style={{
                    ...questionCardStyle,
                    border: isOpen ? "1px solid rgba(99,102,241,0.4)" : "1px solid #1f2937",
                  }}
                >
                  <button
                    onClick={() => setExpandedIdx(isOpen ? -1 : idx)}
                    style={{
                      ...accordionHeaderStyle,
                      borderBottom: isOpen ? "1px solid #1f2937" : "none",
                      backgroundColor: isOpen ? "#111827" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        flex: 1,
                        textAlign: "left",
                        minWidth: 0,
                      }}
                    >
                      <span style={qNumberStyle}>Q{ev.question_no}</span>
                      <span
                        style={{
                          color: "#f1f5f9",
                          fontSize: "15px",
                          fontWeight: "600",
                          lineHeight: "1.4",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: isOpen ? "normal" : "nowrap",
                        }}
                      >
                        {ev.question_text}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: scoreColor, fontWeight: "800", fontSize: "15px" }}>
                        {score}%
                      </span>
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "14px",
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      >
                        ↓
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div style={accordionBodyStyle}>
                      <div style={answerBoxStyle}>
                        <span style={miniLabelStyle}>🗣️ YOUR TRANSCRIBED ANSWER</span>
                        <p style={answerTextStyle}>
                          {ev.candidate_answer || "(No answer provided)"}
                        </p>
                      </div>

                      <div style={scoreRowStyle}>
                        <span style={scoreChipStyle(scoreColor)}>Score: {score}%</span>
                        <span style={scoreChipStyle("#8b5cf6")}>Question {ev.question_no}</span>
                      </div>

                      {/* HOW TO IMPROVE (answer-specific, unique) */}
                      {ev.question_suggestion && (
                        <div
                          style={evaluationBlockStyle(
                            "rgba(245,158,11,0.01)",
                            "rgba(245,158,11,0.15)",
                          )}
                        >
                          <div style={evalHeaderStyle}>
                            <span style={tagStyle("#f59e0b")}>[HOW TO IMPROVE]</span>
                            <span style={evalTitleStyle}>COACHING TIP FOR NEXT TIME</span>
                          </div>
                          <p style={{ ...evalTextStyle, color: "#e2e8f0" }}>
                            {ev.question_suggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div style={actionsRowStyle}>
          <button
            onClick={() => {
              localStorage.setItem("highest_stage", "6");
              navigate("/interview/1");
            }}
            style={retryBtnStyle}
          >
            🔄 Retake Interview Round
          </button>
          <button onClick={handleSignOut} style={signOutBtnStyle}>
            Sign Out & Clear Session Logs
          </button>
        </div>
      </div>
    </div>
  );
};

const pageStyle = {
  backgroundColor: "#020617",
  minHeight: "100vh",
  padding: "40px 20px",
  fontFamily: "'Inter', sans-serif",
  color: "#f1f5f9",
  boxSizing: "border-box",
};
const containerStyle = {
  maxWidth: "1000px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "32px",
};
const loadingPageStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  backgroundColor: "#020617",
};
const spinnerStyle = {
  width: "50px",
  height: "50px",
  border: "4px solid #1e293b",
  borderTop: "4px solid #3b82f6",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #1f2937",
  paddingBottom: "24px",
  flexWrap: "wrap",
  gap: "20px",
};
const stageLabelStyle = {
  color: "#3b82f6",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
const pageTitleStyle = {
  fontSize: "26px",
  fontWeight: "700",
  margin: "6px 0 0 0",
  color: "#f8fafc",
};
const gradeCircleStyle = {
  width: "74px",
  height: "74px",
  borderRadius: "50%",
  border: "3px solid",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};
const sectionStyle = {
  backgroundColor: "#111827",
  borderRadius: "20px",
  padding: "32px 24px",
  border: "1px solid #1f2937",
};
const sectionTitleStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#f8fafc",
  margin: 0,
};
const sectionSubtitleStyle = {
  fontSize: "14px",
  color: "#94a3b8",
  margin: "6px 0 0 0",
};
const questionCardStyle = {
  backgroundColor: "#111827",
  borderRadius: "14px",
  overflow: "hidden",
};
const accordionHeaderStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 24px",
  border: "none",
  cursor: "pointer",
  color: "inherit",
};
const qNumberStyle = {
  backgroundColor: "#2563eb",
  color: "#fff",
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: "700",
};
const accordionBodyStyle = {
  padding: "24px",
  backgroundColor: "#0f1624",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  borderTop: "1px solid #1f2937",
};
const answerBoxStyle = {
  backgroundColor: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "12px",
  padding: "16px",
};
const miniLabelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  color: "#94a3b8",
  marginBottom: "8px",
};
const answerTextStyle = {
  color: "#cbd5e1",
  fontSize: "14px",
  margin: 0,
  fontStyle: "italic",
};
const scoreRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
const scoreChipStyle = (color) => ({
  backgroundColor: `${color}10`,
  color,
  border: `1px solid ${color}30`,
  padding: "5px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "600",
});
const evaluationBlockStyle = (bg, border) => ({
  backgroundColor: bg,
  border: `1px solid ${border}`,
  borderRadius: "12px",
  padding: "16px",
});
const evalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "6px",
};
const tagStyle = (color) => ({ fontSize: "11px", fontWeight: "700", color });
const evalTitleStyle = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#94a3b8",
};
const evalTextStyle = { margin: 0, fontSize: "14px", lineHeight: "1.6" };
const actionsRowStyle = { display: "flex", gap: "16px", flexWrap: "wrap" };
const retryBtnStyle = {
  flex: 1,
  padding: "14px",
  backgroundColor: "#111827",
  color: "#38bdf8",
  border: "1px solid #1f2937",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};
const signOutBtnStyle = {
  flex: 1,
  padding: "14px",
  backgroundColor: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

export default Report;

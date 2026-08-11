import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        navigate("/admin/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/admin/dashboard-stats", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Session expired or unauthorized");
        }

        setData(result);
      } catch (err) {
        setError(err.message);
        localStorage.removeItem("adminToken");
        setTimeout(() => navigate("/admin/login"), 1500);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2>Loading Analytics...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#d32f2f" }}>
        <h3>{error}</h3>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const menuItems = [
    { id: "overview", label: "📊 Overview" },
    { id: "candidates", label: "👥 Candidates" },
    { id: "interviews", label: "📜 Interview Logs" },
    { id: "questions", label: "📝 Question Bank" },
    { id: "settings", label: "⚙️ System Settings" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* ================= SIDEBAR ================= */}
      <aside
        style={{
          width: sidebarOpen ? "250px" : "0px",
          backgroundColor: "#1e293b",
          color: "#ffffff",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          whiteSpace: "nowrap",
          boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          justify: "space-between",
          zIndex: 100,
        }}
      >
        <div>
          {/* Sidebar Header */}
          <div style={{ padding: "24px 20px", borderBottom: "1px solid #334155" }}>
            <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "20px" }}>Admin Portal</h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>AI Interview Engine</p>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: "20px 10px" }}>
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    marginBottom: "8px",
                    backgroundColor: isActive ? "#2563eb" : "transparent",
                    color: isActive ? "#ffffff" : "#cbd5e1",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: isActive ? "bold" : "normal",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <div style={{ padding: "20px", borderTop: "1px solid #334155" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main style={{ flex: 1, padding: "30px", overflowY: "auto", transition: "margin 0.4s ease" }}>
        {/* Navbar Header */}
        <div
          style={{
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            background: "#fff",
            padding: "20px 30px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "16px",
              }}
              title="Toggle Sidebar"
            >
              ☰
            </button>
            <div>
              <h2 style={{ margin: 0, color: "#111827" }}>AI Mock Interview — Admin Portal</h2>
              <p style={{ margin: "5px 0 0", color: "#6b7280" }}>Platform Overview & Analytics</p>
            </div>
          </div>

          <span style={{ fontSize: "14px", color: "#6b7280", background: "#e2e8f0", padding: "6px 12px", borderRadius: "20px" }}>
            Status: <strong>Online</strong>
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h4 style={{ margin: "0 0 10px", color: "#6b7280" }}>Total Candidates</h4>
            <h2 style={{ margin: 0, color: "#2563eb", fontSize: "32px" }}>{data?.stats?.totalCandidates}</h2>
          </div>

          <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h4 style={{ margin: "0 0 10px", color: "#6b7280" }}>Interviews Completed</h4>
            <h2 style={{ margin: 0, color: "#10b981", fontSize: "32px" }}>{data?.stats?.totalInterviews}</h2>
          </div>

          <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h4 style={{ margin: "0 0 10px", color: "#6b7280" }}>AI Engine Status</h4>
            <h3 style={{ margin: 0, color: "#8b5cf6" }}>{data?.stats?.aiEngineStatus}</h3>
          </div>

          <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h4 style={{ margin: "0 0 10px", color: "#6b7280" }}>System Uptime</h4>
            <h3 style={{ margin: 0, color: "#059669" }}>{data?.stats?.systemHealth}</h3>
          </div>
        </div>

        {/* Candidate Table */}
        <div style={{ background: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#111827" }}>Recent Registered Candidates</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb", color: "#4b5563" }}>
                <th style={{ padding: "12px" }}>ID</th>
                <th style={{ padding: "12px" }}>Username</th>
                <th style={{ padding: "12px" }}>Email</th>
                <th style={{ padding: "12px" }}>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentCandidates?.length > 0 ? (
                data.recentCandidates.map((candidate) => (
                  <tr key={candidate.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px" }}>#{candidate.id}</td>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>{candidate.username}</td>
                    <td style={{ padding: "12px" }}>{candidate.email}</td>
                    <td style={{ padding: "12px" }}>
                      {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                    No candidate records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
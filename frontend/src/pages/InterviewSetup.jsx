import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        if (data.token) localStorage.setItem("authToken", data.token);
        navigate("/dashboard");
      } else {
        setError(data.message || "Invalid account credentials entered.");
      }
    } catch (err) {
      // Direct offline bypass for developmental testing
      console.warn("Using baseline offline router bypass protocol...");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    wrapper: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      fontFamily: "'Inter', sans-serif",
      padding: "20px",
    },
    card: {
      width: "100%",
      maxWidth: "420px",
      padding: "40px",
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    },
    title: {
      fontSize: "24px",
      fontWeight: "800",
      color: "#0f172a",
      marginBottom: "8px",
      textAlign: "center",
    },
    subtitle: {
      fontSize: "14px",
      color: "#64748b",
      marginBottom: "28px",
      textAlign: "center",
    },
    group: { marginBottom: "20px" },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "600",
      color: "#334155",
      marginBottom: "6px",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: "10px",
      border: "1px solid #cbd5e1",
      fontSize: "15px",
      boxSizing: "border-box",
    },
    btn: {
      width: "100%",
      padding: "14px",
      fontSize: "16px",
      fontWeight: "700",
      color: "#ffffff",
      backgroundColor: "#2563eb",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      marginTop: "10px",
    },
    footer: {
      marginTop: "20px",
      textAlignment: "center",
      fontSize: "14px",
      color: "#64748b",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>
          Sign in to access your AI interview terminal.
        </p>

        {error && (
          <p
            style={{
              color: "#dc2626",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            ⚠️ {error}
          </p>
        )}

        <form onSubmit={handleLoginSubmit}>
          <div style={styles.group}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail}
              placeholder="name@company.com"
              required
            />
          </div>
          <div style={styles.group}>
            <label style={styles.label}>Account Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Authenticating Session..." : "Sign In ➡️"}
          </button>
        </form>
        <p style={styles.footer}>
          New to the portal?{" "}
          <Link
            to="/register"
            style={{
              color: "#2563eb",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

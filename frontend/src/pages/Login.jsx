import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import "../assets/css/login.css";

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    reg_no: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // 💡 FastAPI OAuth2PasswordRequestForm expects Form Data with 'username' & 'password'
      const formData = new URLSearchParams();
      formData.append("username", credentials.regno.trim()); // reg_no goes into username
      formData.append("password", credentials.password);

      const { data } = await API.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (data.access_token) {
        localStorage.setItem("auth_token", data.access_token);
        localStorage.setItem("user_regno", credentials.regno.trim());
        localStorage.setItem("highest_stage", "3");

        // Navigation (Small 'd' to match AppRoutes.jsx)
        navigate("/dashboard");
      } else {
        setErrorMsg("Invalid token received from server.");
      }
    } catch (error) {
      setErrorMsg(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Login authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div
        className="login-card"
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          padding: "30px 40px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "460px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#efe8e8",
            marginBottom: "20px",
          }}
        >
          Welcome Back
        </h1>
        {errorMsg && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#fca5a5",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {errorMsg}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label style={{ color: "#156dda", fontSize: "19px" }}>
              Register Number
            </label>
            <input
              type="text"
              name="regno"
              value={credentials.regno}
              onChange={handleChange}
              autoComplete="username"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ color: "#156dda", fontSize: "19px" }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              style={inputStyle}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "10px",
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "50%",
                padding: "12px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "16px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </div>
        </form>
        <p
          style={{
            textAlign: "center",
            color: "#180ad67f",
            marginTop: "20px",
            fontSize: "16px",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{ color: "#19269f9e", textDecoration: "none" }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "8px",
  color: "#fff",
  marginTop: "4px",
  boxSizing: "border-box",
};

export default Login;

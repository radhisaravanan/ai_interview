import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import "../assets/css/register.css";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    reg_no: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Reg No validation: only numbers
    if (name === "reg_no") {
      if (value === "" || /^\d+$/.test(value)) {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const regNo = form.reg_no.trim(); // 👈 Fixed: reg_no instead of regno
    const pass = form.password.trim();

    if (!/^\d+$/.test(regNo)) {
      setErrorMsg("Only numbers are allowed in Register Number!");
      return;
    }

    if (pass !== form.confirmPassword.trim()) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 💡 Sends exactly what FastAPI UserRegister schema expects: { reg_no, password }
      const payload = {
        reg_no: regNo,
        password: pass,
      };

      const { data } = await API.post("/auth/register", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (data.id || data.reg_no) {
        alert("Registration complete! Switching to Login.");
        navigate("/login");
      } else {
        setErrorMsg("Registration failed.");
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      setErrorMsg(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? `${detail[0]?.loc.at(-1)}: ${detail[0]?.msg}`
            : "Registration Failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="register-page"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div
        className="register-card"
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
        <h2
          style={{ textAlign: "center", color: "#fff", marginBottom: "20px" }}
        >
          Create Account
        </h2>
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
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div>
            <label style={{ color: "#327bd4", fontSize: "19px" }}>
              Register Number
            </label>
            <input
              type="text"
              name="reg_no" // 👈 Fixed name attribute
              autoComplete="username"
              value={form.reg_no} // 👈 Fixed value reference
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ color: "#327bd4", fontSize: "19px" }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ color: "#327bd4", fontSize: "19px" }}>
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              marginTop: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        <p
          style={{
            textAlign: "center",
            color: "#327bd4",
            marginTop: "16px",
            fontSize: "15px",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            style={{ color: "#3b82f6", textDecoration: "none" }}
          >
            Login
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

export default Register;

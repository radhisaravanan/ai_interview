import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// If AdminLogin.css is inside src/styles/
import "../assets/css/adminLogin.css";


export default function AdminLogin() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid Admin Credentials");
      }

      // Save token & user state in LocalStorage
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.admin));

      // Redirect directly to the Admin Dashboard
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <h2 className="admin-login-title">Admin Portal Login</h2>

      {error && <div className="admin-login-error">{error}</div>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            autoComplete="off"
            placeholder="Enter admin username"
            className="form-input"
          />
        </div>

        <div className="form-group-password">
          <label className="form-label">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            placeholder="Enter admin password"
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="admin-login-button"
        >
          {loading ? "Authenticating..." : "Login to Admin Portal"}
        </button>
      </form>
    </div>
  );
}
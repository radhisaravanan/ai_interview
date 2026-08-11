import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import ResumeExtraction from "./pages/ResumeExtraction";
import Permission from "./pages/Permission";
import InterviewRoom from "./pages/InterviewRoom";
import Report from "./pages/Report";
import Result from "./pages/Result";
import Instructions from "./pages/Instructions";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

// Admin Components
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedAdminRoute from "./components/ProtectedRoute";

import { StageGuard } from "./components/StageGuard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= PUBLIC PAGES ================= */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* ================= PROFILE ================= */}
        <Route
          path="/profile"
          element={
            <StageGuard requiredStage={1}>
              <Profile />
            </StageGuard>
          }
        />

        {/* ================= HISTORY ================= */}
        <Route
          path="/history"
          element={
            <StageGuard requiredStage={1}>
              <History />
            </StageGuard>
          }
        />

        {/* ================= DASHBOARD ================= */}
        <Route
          path="/dashboard"
          element={
            <StageGuard requiredStage={3}>
              <Dashboard />
            </StageGuard>
          }
        />

        {/* ================= RESUME ANALYZER ================= */}
        <Route
          path="/resume"
          element={
            <StageGuard requiredStage={3}>
              <ResumeAnalyzer />
            </StageGuard>
          }
        />

        <Route
          path="/resume-analyzer"
          element={
            <StageGuard requiredStage={3}>
              <ResumeAnalyzer />
            </StageGuard>
          }
        />

        {/* ================= RESUME EXTRACTION RESULT ================= */}
        <Route
          path="/resume-result"
          element={
            <StageGuard requiredStage={4}>
              <ResumeExtraction />
            </StageGuard>
          }
        />

        {/* ================= PERMISSION ================= */}
        <Route
          path="/permissions"
          element={
            <StageGuard requiredStage={4}>
              <Permission />
            </StageGuard>
          }
        />

        <Route
          path="/instructions"
          element={
            <StageGuard requiredStage={4}>
              <Instructions />
            </StageGuard>
          }
        />

        {/* ================= INTERVIEW START ================= */}
        <Route path="/interview" element={<Navigate to="/interview/1" replace />} />
        <Route path="/interview/start" element={<Navigate to="/interview/1" replace />} />

        {/* ================= INTERVIEW ROOM ================= */}
        <Route
          path="/interview/:questionId"
          element={
            <StageGuard requiredStage={6}>
              <InterviewRoom />
            </StageGuard>
          }
        />

        {/* ================= RESULT ================= */}
        <Route
          path="/result"
          element={
            <StageGuard requiredStage={7}>
              <Result />
            </StageGuard>
          }
        />

        {/* ================= REPORT ================= */}
        <Route
          path="/report"
          element={
            <StageGuard requiredStage={7}>
              <Report />
            </StageGuard>
          }
        />

        {/* ================= ADMIN ================= */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />

        {/* ================= 404 PAGE ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
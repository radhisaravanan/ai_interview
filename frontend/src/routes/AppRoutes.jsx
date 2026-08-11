import { BrowserRouter, Routes, Route } from "react-router-dom";
import Permission from "../pages/Permission";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import InterviewSetup from "../pages/InterviewSetup";
import InterviewRoom from "../pages/InterviewRoom";
import Report from "../pages/Report";
import History from "../pages/History";
import ResumeAnalyzer from "../pages/ResumeAnalyzer";
import AdminLogin from "../pages/AdminLogin";
import AdminDashboard from "../pages/AdminDashboard";




function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <StageGuard requiredStage={5}>
              <Dashboard />
            </StageGuard>
          }
        />

        <Route path="/profile" element={<Profile />} />

        <Route path="/InterviewSetup" element={<InterviewSetup />} />

        <Route path="/report" element={<Report />} />
        <Route path="/interview" element={<InterviewRoom />} />
        <Route path="/interview/:questionId" element={<InterviewRoom />} />
        <Route path="/permission" element={<Permission />} />

        <Route path="/resume" element={<ResumeAnalyzer />} />
        <Route
path="/admin"
element={<AdminLogin/>}
/>


<Route

path="/admin/dashboard"

element={<AdminDashboard/>}

/>

        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;

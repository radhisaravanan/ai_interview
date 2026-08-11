import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  FaBars,
  FaHome,
  FaUser,
  FaRobot,
  FaHistory,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";

import "../assets/css/sidebar.css";
import collegeLogo from "../assets/images/mountzion-logo.png";

function Sidebar() {

  const [showSidebar, setShowSidebar] = useState(false);

  const [showSettings, setShowSettings] = useState(false);

  const navigate = useNavigate();

  // ==========================
  // LOGOUT
  // ==========================

  const logout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");

  };

  return (
    <>

      {/* Overlay */}

      {showSidebar && (

        <div
          className="sidebar-overlay"
          onClick={() => setShowSidebar(false)}
        />

      )}

      {/* Hamburger */}

      <button
        className="menu-toggle"
        onClick={() => setShowSidebar(true)}
      >
        <FaBars />
      </button>

      {/* Sidebar */}

      <aside className={`sidebar ${showSidebar ? "show" : ""}`}>

        {/* Logo */}

        <div className="sidebar-logo">

          <div className="logo-circle">

            <img
              src={collegeLogo}
              alt="College Logo"
              className="college-logo"
            />

          </div>

          <div className="logo-text">

            <h2>MZORA AI</h2>

            <p>Interview Platform</p>

          </div>

        </div>

        {/* ==========================
             MENU
        ========================== */}

        <nav className="sidebar-menu">

          {/* Dashboard */}

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setShowSidebar(false)}
          >
            <FaHome />

            <span>Dashboard</span>

          </NavLink>

          {/* Profile */}

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setShowSidebar(false)}
          >
            <FaUser />

            <span>Profile</span>

          </NavLink>

          {/* Interview */}

          <NavLink
            to="/interview/1"
            className={({ isActive }) =>
              isActive
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setShowSidebar(false)}
          >
            <FaRobot />

            <span>AI Interview</span>

          </NavLink>

          {/* History */}

          <NavLink
            to="/history"
            className={({ isActive }) =>
              isActive
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setShowSidebar(false)}
          >
            <FaHistory />

            <span>History</span>

          </NavLink>

          {/* Reports */}

          <NavLink
            to="/report"
            className={({ isActive }) =>
              isActive
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setShowSidebar(false)}
          >
            <FaChartBar />

            <span>Reports</span>

          </NavLink>

          {/* ==========================
                 SETTINGS
          ========================== */}

          <div className="settings-menu">

            <button
              className="menu-item settings-button"
              onClick={() =>
                setShowSettings(!showSettings)
              }
            >

              <div className="settings-left">

                <FaCog />

                <span>Settings</span>

              </div>

              {showSettings ? (

                <FaChevronDown />

              ) : (

                <FaChevronRight />

              )}

            </button>

            {showSettings && (

              <div className="submenu">

                <NavLink
                  to="/change-password"
                  className={({ isActive }) =>
                    isActive
                      ? "submenu-item active"
                      : "submenu-item"
                  }
                  onClick={() => setShowSidebar(false)}
                >
                  🔒 Account & Security
                </NavLink>

                <NavLink
                  to="/appearance"
                  className={({ isActive }) =>
                    isActive
                      ? "submenu-item active"
                      : "submenu-item"
                  }
                  onClick={() => setShowSidebar(false)}
                >
                  🎨 Appearance
                </NavLink>

                <NavLink
                  to="/device-settings"
                  className={({ isActive }) =>
                    isActive
                      ? "submenu-item active"
                      : "submenu-item"
                  }
                  onClick={() => setShowSidebar(false)}
                >
                  🎤 Device Settings
                </NavLink>

                <NavLink
                  to="/ai-settings"
                  className={({ isActive }) =>
                    isActive
                      ? "submenu-item active"
                      : "submenu-item"
                  }
                  onClick={() => setShowSidebar(false)}
                >
                  🤖 AI Interview Settings
                </NavLink>

              </div>

            )}

          </div>

        </nav>

        {/* ==========================
             LOGOUT
        ========================== */}

        <div className="sidebar-bottom">

          <button
            className="logout-btn"
            onClick={logout}
          >

            <FaSignOutAlt />

            <span>Logout</span>

          </button>

        </div>

      </aside>

    </>
  );

}

export default Sidebar;
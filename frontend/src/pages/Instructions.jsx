import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaCamera,
  FaMicrophone,
  FaEye,
  FaClock,
  FaBan,
  FaLaptop,
  FaCheckCircle,
  FaArrowRight,
  FaRobot,
} from "react-icons/fa";

import "../assets/css/instructions.css";

const Instructions = () => {
  const navigate = useNavigate();

  const [agree, setAgree] = useState(false);

  const interviewDetails = JSON.parse(
    localStorage.getItem("interview_details")
  ) || {
    department: "-",
    role: "-",
    experience: "-",
  };

  const handleContinue = () => {
    if (!agree) return;

    localStorage.setItem("highest_stage", "4");
    navigate("/permissions");
  };

  return (
    <div className="instructions-page">
      <div className="instructions-overlay"></div>

      <div className="instructions-card">

        {/* ================= HEADER ================= */}

        <div className="instruction-header">
          <div className="robot-icon">
            <FaRobot />
          </div>

          <h1>Prepare for Your AI Interview</h1>

        </div>

        

        {/* ================= CANDIDATE ================= */}


        {/* ================= INSTRUCTION CARDS ================= */}

        <div className="instruction-grid">

          

   <div className="instruction-box">

    <div className="instruction-top">

        <div className="instruction-icon">
            <FaCamera />
        </div>

        <h3>Camera</h3>

    </div>

    <p>
        Keep your face clearly visible throughout the interview.
    </p>

</div>

          <div className="instruction-box">
            <FaEye className="instruction-icon" />
            <h3>Eye Contact</h3>
            <p>Maintain eye contact with the camera while answering.</p>
          </div>

          <div className="instruction-box">
            <FaLaptop className="instruction-icon" />
            <h3>Interview Rules</h3>
            <p>Do not switch tabs or close the browser.</p>
          </div>

          <div className="instruction-box">
            <FaClock className="instruction-icon" />
            <h3>Duration</h3>
            <p>Each question has a limited time to answer.</p>
          </div>

          <div className="instruction-box">
            <FaBan className="instruction-icon" />
            <h3>Important</h3>
            <p>Once started, the interview cannot be restarted.</p>
          </div>

        </div>

        {/* ================= AGREEMENT ================= */}

        <div className="agreement">

          <label>

            <input
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
            />

            I have read and understood all interview instructions.

          </label>

        </div>

        {/* ================= BUTTON ================= */}

        <button
          className="continue-btn"
          disabled={!agree}
          onClick={handleContinue}
        >
          Proceed to Device Check

          <FaArrowRight />
        </button>

      </div>
    </div>
  );
};

export default Instructions;
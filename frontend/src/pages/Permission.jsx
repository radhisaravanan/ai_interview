import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/permission.css";

import {
  FaCamera,
  FaMicrophone,
  FaLightbulb,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowRight,
} from "react-icons/fa";

const Permission = () => {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [devices, setDevices] = useState({
    camera: "Pending",
    mic: "Pending",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestPermissions();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const requestPermissions = async () => {
    setLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setDevices({
        camera: "Granted",
        mic: "Granted",
      });
    } catch (error) {
      console.error(error);

      setDevices({
        camera: "Denied",
        mic: "Denied",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = () => {
    localStorage.setItem("highest_stage", "6");

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    navigate("/interview/1");
  };

  return (
    <div className="permission-page">

      <div className="permission-overlay"></div>

      <div className="permission-card">

        {/* Left Side */}

        <div className="preview-column">

          <div className="video-box">

            <div className="camera-label">

              <span className="live-dot"></span>

              <FaCamera />

              LIVE CAMERA

            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />

          </div>

        </div>

        {/* Right Side */}

        <div className="controls-column">

          

          <h1 className="title">
            Device Permission Check
          </h1>

          <div className="status-grid">

            {/* Camera */}

            <div className="status-card">

              <div className="icon-circle">
                <FaCamera />
              </div>

              <h3>Camera</h3>

              {devices.camera === "Granted" ? (
                <p className="success">
                  <FaCheckCircle />
                  Connected
                </p>
              ) : (
                <p className="error">
                  <FaTimesCircle />
                  Not Connected
                </p>
              )}

            </div>

            {/* Microphone */}

            <div className="status-card">

              <div className="icon-circle">
                <FaMicrophone />
              </div>

              <h3>Microphone</h3>

              {devices.mic === "Granted" ? (
                <p className="success">
                  <FaCheckCircle />
                  Working
                </p>
              ) : (
                <p className="error">
                  <FaTimesCircle />
                  Not Working
                </p>
              )}

            </div>

            {/* Lighting */}

            <div className="status-card">

              <div className="icon-circle">
                <FaLightbulb />
              </div>

              <h3>Lighting</h3>

              {devices.camera === "Granted" ? (
                <p className="success">
                  <FaCheckCircle />
                  Good
                </p>
              ) : (
                <p className="error">
                  <FaTimesCircle />
                  Improve
                </p>
              )}

            </div>

          </div>
<div className="button-group">

  <button
    className="recheck-btn"
    onClick={requestPermissions}
    disabled={loading}
  >
    🔄 Recheck Devices
  </button>

  <button
    className="continue-btn"
    onClick={handleStartInterview}
    disabled={
      devices.camera !== "Granted" ||
      devices.mic !== "Granted"
    }
  >
    <span>Start Interview</span>
    <FaArrowRight />
  </button>

</div>

        </div>

      </div>

    </div>
  );
};

export default Permission;
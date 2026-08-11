import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import API from "../services/api";

import "../assets/css/interviewRoom.css";

const QUESTION_TIME = 60;

const CATEGORY_LABELS = {
  self_intro: "Friendly Introduction",
  education: "Education & Background",
  role_based: "Job Role",
  project_skill: "Resume Skills & Projects",
  experience: "Experience Level",
  behavioral: "Behavioral & Problem Solving",
};

const InterviewRoom = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const timerRef = useRef(null);
  const submittingRef = useRef(false);

  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [index, setIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [reading, setReading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [status, setStatus] = useState("Preparing your interview...");
  const [submitting, setSubmitting] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // ==============================
  // CAMERA START (robust binding, StrictMode-safe)
  // ==============================
  useEffect(() => {
    let active = true;
    let retryTimer = null;

    const attachStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;

          // Play once metadata is ready (prevents black screen)
          const tryPlay = () => {
            video.play().catch(() => {
              /* autoplay still pending user gesture in some browsers */
            });
          };
          video.addEventListener("loadedmetadata", tryPlay, { once: true });
          tryPlay();
        }

        setCameraReady(true);
        setCameraError("");
      } catch (error) {
        console.log(error);
        if (active) {
          setCameraError("Camera permission denied");
          // Retry once after a short delay (covers transient device busy)
          retryTimer = setTimeout(() => {
            if (active) {
              setCameraError("Camera starting...");
              attachStream();
            }
          }, 1200);
        }
      }
    };

    attachStream();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ==============================
  // SESSION LOAD (real backend questions)
  // ==============================
  useEffect(() => {
    const auditQuestions = (items) => {
      if (!Array.isArray(items)) return;
      items.forEach((q) => {
        console.error("[REPETITION AUDIT]", q?.question_text || q);
      });
    };

    const loadSession = async () => {
      try {
        // The URL param is a Mongo ObjectId (24-hex) when coming from the
        // Dashboard "Start Interview" card -> resume that existing session.
        const isSessionId = /^[a-fA-F0-9]{24}$/.test(questionId || "");
        if (isSessionId) {
          const { data } = await API.get(`/interview/session/${questionId}`);
          localStorage.setItem("sessionId", data.session_id);
          localStorage.setItem(
            "interview_session",
            JSON.stringify({ questions: data.questions })
          );
          auditQuestions(data.questions);
          setSessionId(data.session_id);
          setQuestions(data.questions || []);
          return;
        }

        const storedSession = JSON.parse(
          localStorage.getItem("interview_session") || "null"
        );
        const storedId = localStorage.getItem("sessionId");

        if (
          storedSession &&
          Array.isArray(storedSession.questions) &&
          storedSession.questions.length > 0 &&
          storedId
        ) {
          auditQuestions(storedSession.questions);
          setQuestions(storedSession.questions);
          setSessionId(storedId);
          return;
        }

        const { data } = await API.post("/interview/start");

        // Fresh session isolation: clear any previously cached interview
        // (different student / older run) BEFORE persisting this new session.
        localStorage.removeItem("sessionId");
        localStorage.removeItem("interview_session");
        sessionStorage.removeItem("last_interview_session");

        localStorage.setItem("sessionId", data.session_id);
        localStorage.setItem(
          "interview_session",
          JSON.stringify({ questions: data.questions })
        );

        auditQuestions(data.questions);
        setSessionId(data.session_id);
        setQuestions(data.questions || []);
      } catch (err) {
        console.error("Failed to start interview session:", err);
        const status = err.response?.status;
        const detail = err.response?.data?.detail || "";
        // REPETITION_BLOCKED (HTTP 500) -> visible error alert with key refresh.
        if (
          status === 500 &&
          String(detail).includes("REPETITION_BLOCKED")
        ) {
          setLoadError("Repetition Blocked by AI Engine - Refreshing Key");
          return;
        }
        setLoadError(
          err.response?.data?.detail || "Failed to start interview session."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==============================
  // SPEECH SETUP (live interim transcription)
  // ==============================
  useEffect(() => {
    synthesisRef.current = window.speechSynthesis;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let liveText = "";
      for (let i = 0; i < event.results.length; i++) {
        liveText += event.results[i][0].transcript;
      }
      setTranscript(liveText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        setStatus(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // ==============================
  // CURRENT QUESTION INDEX
  // ==============================
  useEffect(() => {
    if (!questions.length) return;

    const idx = Math.max(
      0,
      Math.min(Number(questionId || 1) - 1, questions.length - 1)
    );
    setIndex(idx);
    setActiveQuestion(questions[idx]);
  }, [questionId, questions]);

  // ==============================
  // QUESTION LOAD: read aloud, then start timer
  // ==============================
  useEffect(() => {
    if (!activeQuestion) return;

    stopRecognition();
    setTranscript("");
    setRecording(false);
    setReading(true);
    setSubmitting(false);
    submittingRef.current = false;
    setTimeLeft(QUESTION_TIME);
    setStatus("🔊 Reading Question...");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    speakQuestion(activeQuestion.question_text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion?.question_number]);

  // ==============================
  // TIMER AUTO-SUBMIT at 0
  // ==============================
  useEffect(() => {
    if (timeLeft === 0 && activeQuestion && !submittingRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus("⏰ Time's up! Submitting answer...");
      submitAnswer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ==============================
  // TEXT-TO-SPEECH (reads question, delays the timer)
  // ==============================
  const speakQuestion = (text) => {
    if (!synthesisRef.current || !text) {
      setReading(false);
      setStatus("🟢 Speak Now / Ready");
      startTimer();
      return;
    }

    try {
      synthesisRef.current.cancel();
    } catch {
      /* noop */
    }

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 0.95;

    speech.onstart = () => {
      setReading(true);
      setStatus("🔊 Reading Question...");
    };

    speech.onend = () => {
      setReading(false);
      setStatus("🟢 Speak Now / Ready");
      startTimer();
    };

    speech.onerror = () => {
      setReading(false);
      setStatus("🟢 Speak Now / Ready");
      startTimer();
    };

    synthesisRef.current.speak(speech);
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
  };

  // ==============================
  // RECORDING CONTROLS
  // ==============================
  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
    }
    setRecording(false);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setStatus("Speech recognition is not supported in this browser.");
      return;
    }

    if (reading) {
      setStatus("Please wait for the question to finish reading.");
      return;
    }

    if (recording) {
      stopRecognition();
      setStatus("🎤 Listening paused");
    } else {
      try {
        setTranscript("");
        recognitionRef.current.start();
        setRecording(true);
        setStatus("🎤 Listening... (live text updating)");
      } catch (err) {
        console.warn("Recognition start failed:", err);
      }
    }
  };

  const retakeAnswer = () => {
    stopRecognition();
    setTranscript("");
    setStatus("🔄 Answer reset. Press Start Answer to re-record.");
  };

  // ==============================
  // SUBMIT ANSWER / NEXT QUESTION
  // ==============================
  const submitAnswer = async (auto = false) => {
    if (submittingRef.current) return;

    if (!auto && !transcript.trim()) {
      setStatus("Please speak your answer first.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    stopRecognition();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const text = transcript.trim();

    try {
      await API.post("/interview/submit-answer", {
        session_id: sessionId,
        question_number: activeQuestion.question_number,
        transcribed_text: text || "(No answer provided)",
      }, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Answer submit failed:", err);
    }

    submittingRef.current = false;
    setSubmitting(false);

    if (index < questions.length - 1) {
      navigate(`/interview/${index + 2}`);
    } else {
      try {
        await API.post("/interview/finish", { session_id: sessionId }, {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Finish interview failed:", err);
      }
      localStorage.setItem("highest_stage", "7");
      navigate("/result");
    }
  };

  // ==============================
  // RENDER
  // ==============================
  if (loading) {
    return (
      <div className="room">
        <div className="container">
          <div className="card">
            <div className="loading-box">
              <div className="spinner" />
              <div className="status">Fetching AI Questions...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="room">
        <div className="container">
          <div className="card">
            <div className="status">⚠️ {loadError}</div>
            <button className="mic" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length || !activeQuestion) {
    return (
      <div className="room">
        <div className="container">
          <div className="card">
            <div className="status">No interview questions available.</div>
            <button className="mic" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room">
      <div className="container">
        {/* LEFT PANEL */}
        <div className="card">
          <div className="badge">
            Question {index + 1} / {questions.length}
            {activeQuestion.category && (
              <span className="category-tag">
                {CATEGORY_LABELS[activeQuestion.category] ||
                  activeQuestion.category}
              </span>
            )}
          </div>

          <h1>MZORA AI Live Interview</h1>

          <div className="status">{status}</div>

          <div className="timer">
            ⏱ {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
            {String(timeLeft % 60).padStart(2, "0")}
          </div>

          <div className="question">{activeQuestion.question_text}</div>

          <textarea
            className="transcript"
            readOnly
            placeholder="Your spoken answer appears here live..."
            value={transcript}
          />

          <div className="button-area">
            <button
              className={recording ? "stop" : "mic"}
              onClick={toggleRecording}
              disabled={reading}
            >
              {recording ? "⏹ Stop Answer" : "🎤 Start Answer"}
            </button>

            <button className="retake" onClick={retakeAnswer} disabled={reading}>
              🔄 Retake Answer
            </button>

            <button
              className="next"
              disabled={submitting || reading}
              onClick={() => submitAnswer(false)}
            >
              {submitting
                ? "Saving..."
                : index === questions.length - 1
                  ? "Submit Interview"
                  : "Next Question"}
            </button>
          </div>
        </div>

        {/* CAMERA PANEL */}
        <div className="card camera-card">
          <h2>🎥 Candidate Camera</h2>

          <div className="camera-wrapper">
            <video ref={videoRef} autoPlay playsInline muted />
            <span className="live-tag">● LIVE</span>
          </div>

          {!cameraReady && (
            <p className="camera-msg">Camera initializing...</p>
          )}

          {cameraError && <p className="camera-error">{cameraError}</p>}
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;

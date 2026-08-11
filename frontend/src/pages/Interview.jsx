import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../assets/css/interview.css";

function Interview() {
  const navigate = useNavigate();

  const sessionId = localStorage.getItem("sessionId");

  const [question, setQuestion] = useState("");
  const [questionId, setQuestionId] = useState(null);
  const [answer, setAnswer] = useState("");
  const [time, setTime] = useState(1200);
  const [isListening, setIsListening] = useState(false);

  // Audio playback and binary state tracking references
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const recognitionRef = useRef(null);

  // ===============================
  // Load Question
  // ===============================
  const loadQuestion = async () => {
    try {
      const res = await API.get(`/interview/question/${sessionId}`);

      if (res.data.success) {
        setQuestion(res.data.question.question);
        setQuestionId(res.data.question.id);

        speakQuestion(res.data.question.question);
      } else {
        alert("Interview Completed");
        navigate("/dashboard");
      }
    } catch (err) {
      console.log(err);
      alert("Unable to load question");
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadQuestion();
    } else {
      alert("Session ID missing. Please restart from dashboard.");
      navigate("/dashboard");
    }
  }, []);

  // ===============================
  // Timer
  // ===============================
  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("Interview Completed");
          navigate("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ===============================
  // Text To Speech
  // ===============================
  const speakQuestion = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  };

  // ===============================
  // Initialize Speech Recognition & MediaRecorder
  // ===============================
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Native browser Speech Recognition is not supported.");
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        console.log("Speech engine tracking online...");
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim().length > 0) {
          setAnswer(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // ===============================
  // Start Recording (Audio + Text)
  // ===============================
  const startRecording = async () => {
    setAnswer("");
    setAudioUrl(null);
    audioChunksRef.current = [];

    // 1. Try starting audio stream recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorderRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error("Microphone hardware connection rejected:", err);
      alert("Please grant Microphone permission inside your browser settings!");
    }

    // 2. Start parallel Speech Recognition text tracking
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Recognition engine already initialized or active:", err);
      }
    }
  };

  // ===============================
  // Stop Recording
  // ===============================
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      // stop mic tracks to turn off the hardware light indicator
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn(err);
      }
    }

    setIsListening(false);
  };

  // ===============================
  // Submit Answer (Using Multi-part payload)
  // ===============================
  const submitAnswer = async () => {
    stopRecording();

    // Prepare FormData payload configuration to send raw audio files & properties cleanly
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("question_id", questionId);

    // Send final transcript answer text string if browser Speech API processed it successfully
    formData.append("answer", answer);

    // Append raw audio blob file data if recorded
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      formData.append("audio", audioBlob, "user_voice_recording.wav");
    }

    try {
      const res = await API.post("/interview/answer", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        // If server successfully transcribes, let's update state with backend's returned clean text!
        const serverText =
          res.data.transcribedText || "Answer Saved Successfully!";
        setAnswer(serverText);

        // Brief interval check visual status feedback then reload next questions sequence
        setTimeout(() => {
          setAnswer("");
          setAudioUrl(null);
          loadQuestion();
        }, 3000);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Form Submit Error:", err);
      alert("Unable to save answer processing payload.");
    }
  };

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="interview-page">
      <div className="interview-card">
        <div className="header">
          <h2>🤖 AI Interview Assistant</h2>
          <h3>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </h3>
        </div>

        <div className="question-box">
          <h3>{question || "Loading Question..."}</h3>
        </div>

        <button className="speak-btn" onClick={() => speakQuestion(question)}>
          🔊 Listen Again
        </button>

        {/* Real-time transcription displaying text as user talks */}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Recording voice stream transcript will reflect here..."
        />

        {/* Audio playback segment showing recorded output container */}
        {audioUrl && (
          <div className="audio-player-container">
            <span
              style={{ fontSize: "12px", color: "#22c55e", fontWeight: "bold" }}
            >
              📢 Review Your Captured Answer:
            </span>
            <audio
              src={audioUrl}
              controls
              style={{ width: "100%", marginTop: "5px" }}
            />
          </div>
        )}

        <div className="button-group">
          {!isListening ? (
            <button className="mic-btn" onClick={startRecording}>
              🎤 Start Speaking
            </button>
          ) : (
            <button className="stop-btn" onClick={stopRecording}>
              ⏹ Stop Speaking
            </button>
          )}

          <button className="submit-btn" onClick={submitAnswer}>
            Next Question
          </button>
        </div>
      </div>
    </div>
  );
}

export default Interview;

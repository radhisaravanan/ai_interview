import { useEffect, useState } from "react";
import { FaSearch, FaEye, FaTrash, FaChartLine } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../assets/css/history.css";

function History() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================
  // Load Interview History
  // ==========================

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await API.get("/performance");

      if (res.data.success) {
        setInterviews(res.data.performance);
      }
    } catch (err) {
      console.log(err);
      alert("Unable to load interview history");
    }

    setLoading(false);
  };

  // ==========================
  // Delete Interview
  // ==========================

  const deleteInterview = (index) => {
    const data = [...interviews];
    data.splice(index, 1);
    setInterviews(data);
  };

  // ==========================
  // Search
  // ==========================

  const filtered = interviews.filter((item) => {
    return (
      String(item.question_id).includes(search) ||
      item.feedback.toLowerCase().includes(search.toLowerCase())
    );
  });

  // ==========================
  // Statistics
  // ==========================

  const totalInterviews = interviews.length;

  const averageScore =
    totalInterviews > 0
      ? Math.round(
          interviews.reduce((sum, item) => sum + item.total_score, 0) /
            totalInterviews,
        )
      : 0;

  const successRate =
    totalInterviews > 0
      ? Math.round(
          (interviews.filter((item) => item.total_score >= 60).length /
            totalInterviews) *
            100,
        )
      : 0;

  return (
    <div className="history-page">
      <h1>Interview History</h1>

      <div className="search-box">
        <FaSearch />

        <input
          type="text"
          placeholder="Search Question ID / Feedback"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <h2>Loading...</h2>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Question ID</th>

              <th>Answer</th>

              <th>Technical</th>

              <th>Communication</th>

              <th>Total</th>

              <th>Feedback</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7">No Interview History Found</td>
              </tr>
            ) : (
              filtered.map((item, index) => (
                <tr key={index}>
                  <td>{item.question_id}</td>

                  <td>{item.answer}</td>

                  <td>{item.technical_score}%</td>

                  <td>{item.communication_score}%</td>

                  <td>{item.total_score}%</td>

                  <td>{item.feedback}</td>

                  <td>
                    <button
                      className="view"
                      onClick={() =>
                        navigate("/report", {
                          state: item,
                        })
                      }
                    >
                      <FaEye />
                    </button>

                    <button
                      className="delete"
                      onClick={() => deleteInterview(index)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <div className="summary">
        <div className="summary-card">
          <FaChartLine />

          <h2>{totalInterviews}</h2>

          <p>Total Interviews</p>
        </div>

        <div className="summary-card">
          <h2>{averageScore}%</h2>

          <p>Average Score</p>
        </div>

        <div className="summary-card">
          <h2>{successRate}%</h2>

          <p>Success Rate</p>
        </div>
      </div>
    </div>
  );
}

export default History;

import { useState } from "react";
import {
  FaUserGraduate,
  FaEnvelope,
  FaPhone,
  FaUniversity,
  FaCode,
  FaFileUpload,
  FaSave,
  FaEdit
} from "react-icons/fa";
import "../assets/css/profile.css";

function Profile() {

  const [profile, setProfile] = useState({

    name: "Nagajothi",

    email: "nagajothi@gmail.com",

    phone: "9876543210",

    college: "ABC Engineering College",

    department: "Computer Science",

    skills: "React, Java, Python, MySQL"

  });

  const handleChange = (e) => {

    setProfile({

      ...profile,

      [e.target.name]: e.target.value

    });

  };

  return (

    <div className="profile-page">

      <div className="profile-card">

        <div className="profile-top">

          <img
            src="https://i.pravatar.cc/200"
            alt="profile"
          />

          <h2>{profile.name}</h2>

          <p>Student</p>

        </div>

        <div className="form">

          <div className="input-box">

            <FaUserGraduate />

            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
            />

          </div>

          <div className="input-box">

            <FaEnvelope />

            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
            />

          </div>

          <div className="input-box">

            <FaPhone />

            <input
              type="text"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
            />

          </div>

          <div className="input-box">

            <FaUniversity />

            <input
              type="text"
              name="college"
              value={profile.college}
              onChange={handleChange}
            />

          </div>

          <div className="input-box">

            <FaCode />

            <input
              type="text"
              name="skills"
              value={profile.skills}
              onChange={handleChange}
            />

          </div>

          <div className="resume-upload">

            <FaFileUpload />

            <input type="file" />

          </div>

          <div className="buttons">

            <button className="edit-btn">

              <FaEdit />

              Edit

            </button>

            <button className="save-btn">

              <FaSave />

              Save

            </button>

          </div>

        </div>

      </div>

      <div className="stats-section">

        <div className="stat-box">

          <h2>15</h2>

          <p>Interviews</p>

        </div>

        <div className="stat-box">

          <h2>88%</h2>

          <p>Average Score</p>

        </div>

        <div className="stat-box">

          <h2>5</h2>

          <p>Certificates</p>

        </div>

        <div className="stat-box">

          <h2>Top 10</h2>

          <p>Leaderboard</p>

        </div>

      </div>

    </div>

  );

}

export default Profile;
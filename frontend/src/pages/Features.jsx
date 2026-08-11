import {
    FaRobot,
    FaFileAlt,
    FaMicrophone,
    FaChartLine
} from "react-icons/fa";

import "../assets/css/features.css";


function Features() {

    const featureList = [

        {
            icon: <FaRobot />,
            title: "AI Interviewer",
            description:
                "Conducts smart interviews with AI-generated questions based on your resume."
        },

        {
            icon: <FaFileAlt />,
            title: "Resume Analysis",
            description:
                "Automatically extracts skills, education, projects, and experience."
        },

        {
            icon: <FaMicrophone />,
            title: "Voice Interaction",
            description:
                "Answer interview questions using voice or text with a seamless experience."
        },

        {
            icon: <FaChartLine />,
            title: "Performance Report",
            description:
                "Receive detailed feedback with scores and improvement suggestions."
        }

    ];

    return (

        <section className="features" id="features">

            <div className="section-title">

                <h2>Platform Features</h2>


            </div>

            <div className="feature-grid">

                {
                    featureList.map((item, index) => (

                        <div className="feature-card" key={index}>

                            <div className="feature-icon">

                                {item.icon}

                            </div>

                            <h3>{item.title}</h3>

                            <p>{item.description}</p>

                        </div>

                    ))
                }

            </div>

        </section>

    );

}

export default Features;
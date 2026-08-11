import { Link } from "react-router-dom";
import { FaArrowRight, FaSignInAlt } from "react-icons/fa";
import "../assets/css/hero.css";


function Hero() {

  return (

    <section className="hero">


      <div className="hero-content">


        {/* Left Content */}

        <div className="hero-left">


          <h1>
            Welcome to 
            <span> MZORA AI</span>
          
          </h1>


        



          <div className="hero-buttons">


            <Link 
              to="/register"
              className="btn-primary"
            >
              Get Started <FaArrowRight />
            </Link>



            <Link
              to="/login"
              className="btn-secondary"
            >
              <FaSignInAlt />
              Login
            </Link>


          </div>




        


        </div>




        {/* Right Image */}

        <div className="hero-right">




        </div>



      </div>


    </section>

  );

}


export default Hero;
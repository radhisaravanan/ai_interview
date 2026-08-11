import "../assets/css/contact.css";

import {
  FaGlobe,
  FaEnvelope,
  FaPhone,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaMapMarkerAlt
} from "react-icons/fa";

function Contact() {
  return (
    <section className="contact">

      <div className="contact-overlay"></div>

      <div className="contact-container">

        <span className="contact-tag">
          Contact Us
        </span>

        <h2>
          Mount Zion College of Engineering and Technology
        </h2>

        <p className="contact-description">
          We'd love to hear from you. Feel free to contact us for
          admissions, technical support, placement assistance,
          or any queries related to our AI Interview Platform.
        </p>

        <div className="contact-grid">

          <div className="contact-card">
            <FaGlobe className="contact-icon" />
            <h3>Website</h3>

            <a
              href="https://www.mzcet.in"
              target="_blank"
              rel="noreferrer"
            >
              www.mzcet.in
            </a>
          </div>

          <div className="contact-card">
            <FaEnvelope className="contact-icon" />
            <h3>Email</h3>

            <a href="mailto:info@mzcet.in">
              info@mzcet.in
            </a>
          </div>

          <div className="contact-card">
            <FaPhone className="contact-icon" />
            <h3>Phone</h3>

            <a href="tel:+917373344444">
              +91 73733 44444
            </a>
          </div>

          <div className="contact-card">
            <FaFacebook className="contact-icon" />
            <h3>Facebook</h3>

            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noreferrer"
            >
              Mount Zion College of Engineering
            </a>
          </div>

          <div className="contact-card">
            <FaInstagram className="contact-icon" />
            <h3>Instagram</h3>

            <a
              href="https://www.instagram.com/mountzioncet"
              target="_blank"
              rel="noreferrer"
            >
              @mountzioncet
            </a>
          </div>

          <div className="contact-card">
            <FaLinkedin className="contact-icon" />
            <h3>LinkedIn</h3>

            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
            >
              Mount Zion College of Engineering
            </a>
          </div>

        </div>

        <div className="address-box">

          <FaMapMarkerAlt className="address-icon" />

          <div>
            <h3>Address</h3>

            <p>
              Mount Zion College of Engineering and Technology
              <br />
              Pudukkottai, Tamil Nadu, India
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}

export default Contact;
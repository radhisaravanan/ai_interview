import { Link, NavLink } from "react-router-dom";
import "../assets/css/navbar.css";

function Navbar() {

    return (

        <nav className="navbar">

            <Link to="/" className="logo">
                🤖 MZORA AI
            </Link>

            <ul className="nav-links">

                <li>
                    <NavLink to="/">Home</NavLink>
                </li>

                <li>
                    <NavLink to="/features">Features</NavLink>
                </li>

                <li>
                    <NavLink to="/about">About</NavLink>
                </li>

                <li>
                    <NavLink to="/contact">Contact</NavLink>
                </li>

            </ul>

        </nav>

    );

}

export default Navbar;
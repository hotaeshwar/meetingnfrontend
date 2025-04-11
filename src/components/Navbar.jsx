import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPowerOff, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/images/logo.png';
import { useState, useEffect } from 'react';

function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (isMenuOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('nav')) {
          setIsMenuOpen(false);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? "bg-white bg-opacity-90 backdrop-blur-md shadow-lg" 
        : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18 md:h-20">
          {/* Logo - Responsive sizing */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
              <img 
                src={logo} 
                alt="Logo" 
                className="h-12 sm:h-16 md:h-20 w-auto transition-all duration-300" 
              />
            </Link>
          </div>
          
          {/* Desktop Navigation - Hidden on mobile, visible from medium screens up */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
            {user ? (
              <>
                <span className={`font-semibold text-base lg:text-lg ${scrolled ? 'text-blue-900' : 'text-white'}`}>
                  <span>Welcome, </span><span className="font-bold">{user.first_name}</span><span>!</span>
                </span>
                <Link 
                  to="/dashboard" 
                  className={`font-medium text-base lg:text-lg transition duration-300 relative group ${
                    scrolled ? 'text-blue-900 hover:text-blue-700' : 'text-white hover:text-blue-200'
                  }`}
                >
                  <span>Dashboard</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-3 py-1.5 sm:px-4 rounded-full hover:from-red-600 hover:to-red-700 transition duration-300 flex items-center text-sm sm:text-base font-medium shadow-md hover:shadow-lg"
                >
                  <span className="mr-1">Logout</span>
                  <FontAwesomeIcon icon={faPowerOff} className="text-xs sm:text-sm" />
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/" 
                  className={`font-medium text-base lg:text-lg transition duration-300 relative group ${
                    scrolled ? 'text-blue-900 hover:text-blue-700' : 'text-white hover:text-blue-200'
                  }`}
                >
                  Login
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  to="/register" 
                  className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-4 py-1.5 sm:px-6 sm:py-2 rounded-full hover:shadow-lg transform hover:-translate-y-1 transition duration-300 text-sm sm:text-base lg:text-lg font-medium shadow-md"
                >
                  Register
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button - Visible only on small screens */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={toggleMenu}
              className="p-2 rounded-full bg-blue-50 text-blue-900 hover:bg-blue-100 focus:outline-none transition duration-300"
              aria-label="Toggle menu"
            >
              <FontAwesomeIcon 
                icon={isMenuOpen ? faTimes : faBars} 
                className="h-5 w-5 sm:h-6 sm:w-6" 
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu - Slides down with animation */}
      <div 
        className={`md:hidden transition-all duration-300 ease-in-out transform ${
          isMenuOpen 
            ? "opacity-100 max-h-96 translate-y-0" 
            : "opacity-0 max-h-0 -translate-y-4 pointer-events-none"
        } overflow-hidden bg-white bg-opacity-95 backdrop-blur-md shadow-lg`}
      >
        <div className="px-4 pt-2 pb-4 space-y-4">
          {user ? (
            <>
              <div className={`font-semibold text-base sm:text-lg text-center border-b border-blue-100 pb-2 ${scrolled ? 'text-blue-900' : 'text-blue-900'}`}>
                <span>Welcome, </span><span className="font-bold">{user.first_name}</span><span>!</span>
              </div>
              <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                <Link 
                  to="/dashboard" 
                  className="text-blue-900 font-medium text-base sm:text-lg hover:text-blue-700 transition duration-300 w-full text-center py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>Dashboard</span>
                </Link>
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }} 
                  className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-4 py-1.5 rounded-full hover:from-red-600 hover:to-red-700 transition duration-300 flex items-center justify-center text-sm sm:text-base font-medium shadow-md w-full sm:w-3/4"
                >
                  <span className="mr-1">Logout</span>
                  <FontAwesomeIcon icon={faPowerOff} className="text-xs sm:text-sm" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <Link 
                to="/" 
                className="text-blue-900 font-medium text-base sm:text-lg hover:text-blue-700 transition duration-300 w-full text-center py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-2 rounded-full hover:shadow-lg transition duration-300 text-base sm:text-lg font-medium shadow-md w-full text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEnvelope,
    faLock,
    faGlobe,
    faMapMarkerAlt,
    faEye,
    faEyeSlash,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/images/logo.png';

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState("");
    const [states, setStates] = useState([]);
    const [selectedState, setSelectedState] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch countries with states from API
        setLoading(true);
        axios
            .get("https://api.xautrademeeting.com/countries-with-states")
            .then((response) => {
                if (response.data.success) {
                    setCountries(response.data.data.countries);
                } else {
                    setError("Failed to load country data");
                }
            })
            .catch((error) => {
                console.error("API error:", error);
                setError("Failed to load country data");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleCountryChange = (e) => {
        const countryId = parseInt(e.target.value);
        setSelectedCountry(countryId);

        const country = countries.find((c) => c.id === countryId);
        setStates(country ? country.states : []);
        setSelectedState(""); // Reset state selection
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Based on your backend UserCreate schema, include all required fields
            const loginData = {
                email,
                password,
                first_name: "", // Add these fields to match UserCreate schema
                last_name: "",
                mobile_number: "",
                country_id: selectedCountry,
                state_id: selectedState
            };
            
            const response = await axios.post("https://api.xautrademeeting.com/login", loginData);

            if (response.data.success) {
                const { access_token, user } = response.data.data;

                // Store user & token
                localStorage.setItem("token", access_token);
                localStorage.setItem("user", JSON.stringify(user));

                navigate("/dashboard"); // Redirect to Dashboard
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            console.error("Login error:", err);
            // Display more detailed error message from the server if available
            if (err.response && err.response.data) {
                setError(err.response.data.detail || err.response.data.message || "Login failed");
            } else {
                setError("Invalid email or password.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-white px-4 py-8">
            <div className="w-full max-w-4xl">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row border border-blue-300">
                    {/* Left Section - Form Header */}
                    <div className="bg-gradient-to-b from-blue-600 to-indigo-600 text-white p-6 lg:w-1/3 flex flex-col justify-center items-center lg:items-start">
                        <img src={logo} alt="Logo" className="h-24 mb-6" />
                        <h2 className="text-3xl font-bold mb-4 text-center lg:text-left">Sign In</h2>
                        <p className="text-blue-100 mb-6 text-center lg:text-left">Welcome back to our platform</p>
                        <div className="hidden lg:block mt-auto">
                            <p className="mb-4">Don't have an account yet?</p>
                            <Link 
                                to="/register" 
                                className="inline-flex items-center bg-white/20 text-white px-4 py-2 rounded-lg 
                                           font-medium relative overflow-hidden group transition-all duration-300
                                           hover:bg-white/30 border border-white/30"
                            >
                                <span className="relative z-10 group-hover:text-blue-50 transition-colors duration-300">Create Account</span>
                                <FontAwesomeIcon 
                                    icon={faArrowRight} 
                                    className="ml-2 relative z-10 group-hover:text-blue-50 group-hover:translate-x-1 transition-all duration-300" 
                                />
                            </Link>
                        </div>
                    </div>

                    {/* Right Section - Form Content */}
                    <div className="p-6 lg:p-8 lg:w-2/3">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm flex items-center">
                                    {error}
                                </div>
                            )}

                            {/* Email */}
                            <div className="relative">
                                <label className="block text-blue-600 text-sm font-medium mb-1">Email Address</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                        <FontAwesomeIcon icon={faEnvelope} />
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-blue-50 border border-blue-200 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <label className="block text-blue-600 text-sm font-medium mb-1">Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                        <FontAwesomeIcon icon={faLock} />
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2 bg-blue-50 border border-blue-200 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-500 focus:outline-none transition-colors"
                                    >
                                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>

                            {/* Country */}
                            <div className="relative">
                                <label className="block text-blue-600 text-sm font-medium mb-1">Country</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                        <FontAwesomeIcon icon={faGlobe} />
                                    </span>
                                    <select
                                        value={selectedCountry}
                                        onChange={handleCountryChange}
                                        className="w-full pl-10 pr-3 py-2 bg-blue-50 border border-blue-200 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 appearance-none transition-all"
                                        required
                                    >
                                        <option value="">Select Country</option>
                                        {countries.map((country) => (
                                            <option key={country.id} value={country.id}>
                                                {country.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* State */}
                            <div className="relative">
                                <label className="block text-blue-600 text-sm font-medium mb-1">State</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} />
                                    </span>
                                    <select
                                        value={selectedState}
                                        onChange={(e) => setSelectedState(parseInt(e.target.value))}
                                        className={`w-full pl-10 pr-3 py-2 bg-blue-50 border border-blue-200 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 appearance-none transition-all ${!states.length ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                                        required
                                        disabled={!states.length}
                                    >
                                        <option value="">Select State</option>
                                        {states.map((state) => (
                                            <option key={state.id} value={state.id}>
                                                {state.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Login Button */}
                            <div className="relative mt-6">
                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium shadow-md 
                                    hover:shadow-lg hover:shadow-blue-300 transform hover:-translate-y-1 hover:scale-102 
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                    transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden group"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <>
                                            <span className="relative z-10">Sign In</span>
                                            <span className="absolute right-4 transform translate-x-0 opacity-100 group-hover:translate-x-1 transition-all duration-300 ease-in-out z-10">
                                                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                                            </span>
                                            <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 transform -skew-x-45 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Register Link - Only shown on mobile */}
                            <div className="text-center text-sm text-gray-600 mt-6 lg:hidden flex flex-col items-center">
                                <p>Don't have an account yet?</p>
                                <Link 
                                    to="/register" 
                                    className="mt-2 inline-flex items-center bg-blue-50 text-blue-600 px-4 py-2 rounded-lg 
                                               font-medium relative overflow-hidden group transition-all duration-300
                                               hover:shadow-lg hover:shadow-blue-200 transform hover:-translate-y-1 border border-blue-300"
                                >
                                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">Create Account</span>
                                    <FontAwesomeIcon 
                                        icon={faArrowRight} 
                                        className="ml-2 relative z-10 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" 
                                    />
                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
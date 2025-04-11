import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [countries, setCountries] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    topic: "",
    date: "",
    time: "",
    duration: 60
  });
  const [showModal, setShowModal] = useState(false);
  const [expandedMeetings, setExpandedMeetings] = useState({});
  const [selectedDateView, setSelectedDateView] = useState("upcoming");
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCountriesWithStates = async () => {
      try {
        const response = await axios.get("https://api.xautrademeeting.com/countries-with-states");
        if (response.data.success) {
          setCountries(response.data.data.countries);
        }
      } catch (err) {
        console.error("Error fetching countries and states:", err);
      }
    };

    fetchCountriesWithStates();
  }, []);

  // Function to fetch all meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("https://api.xautrademeeting.com/meetings");
      if (response.data.success) {
        setMeetings(response.data.data.meetings || []);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError("Failed to fetch meetings. Please try again later.");
      console.error("Error fetching meetings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new meeting
  const createMeeting = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Combine date and time into UTC format
      const utcDateTime = new Date(`${meetingForm.date}T${meetingForm.time}Z`).toISOString();
      
      const response = await axios.post("https://api.xautrademeeting.com/create-meeting/", {
        topic: meetingForm.topic,
        start_time: utcDateTime,
        duration: meetingForm.duration
      });
      
      if (response.data.success) {
        // Clear form and refresh meetings list
        setMeetingForm({ topic: "", date: "", time: "", duration: 60 });
        setShowModal(false);
        fetchMeetings();
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError("Failed to create meeting. Please try again later.");
      console.error("Error creating meeting:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load meetings when component mounts
  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMeetingForm({
      ...meetingForm,
      [name]: value
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format UTC time to local time
  const formatUTCToLocal = (utcDateString) => {
    const date = new Date(utcDateString);
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }) + ' (UTC)';
  };

  // Toggle meeting expansion
  const toggleMeetingExpansion = (meetingId) => {
    setExpandedMeetings(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId]
    }));
  };

  // Filter meetings based on selected date view
  const filterMeetings = () => {
    const now = new Date();
    
    switch (selectedDateView) {
      case 'upcoming':
        return meetings.filter(meeting => new Date(meeting.start_time) >= now);
      case 'past':
        return meetings.filter(meeting => new Date(meeting.start_time) < now);
      case 'today':
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        return meetings.filter(meeting => {
          const meetingDate = new Date(meeting.start_time);
          return meetingDate >= todayStart && meetingDate <= todayEnd;
        });
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return meetings.filter(meeting => {
          const meetingDate = new Date(meeting.start_time);
          return meetingDate >= weekStart && meetingDate <= weekEnd;
        });
      default:
        return meetings;
    }
  };

  // Group meetings by date (year-month-day)
  const groupMeetingsByDate = () => {
    const filtered = filterMeetings();
    const grouped = {};
    
    filtered.forEach(meeting => {
      const date = new Date(meeting.start_time);
      const dateKey = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric'
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(meeting);
    });
    
    return grouped;
  };

  // Match country and state
  const userCountry = countries.find((c) => c.id === user?.country_id);
  const userState = userCountry?.states.find((s) => s.id === user?.state_id);

  const groupedMeetings = groupMeetingsByDate();
  
  // Get current date in YYYY-MM-DD format for date input min value
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black to-gray-900">
      {/* Navbar */}
      <Navbar user={user} setUser={setUser} />
      
      <div className="flex-grow p-2 sm:p-4 mt-16">
        <div className="flex flex-col gap-4">
          {/* User Info Card - Small welcome back card */}
          <div className="bg-black rounded-lg shadow-md p-3 max-w-sm mx-auto w-full border border-yellow-600">
            <h3 className="text-sm sm:text-base font-bold text-yellow-500 mb-2">Welcome Back!</h3>
            
            {user ? (
              <div className="flex items-center">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold mr-2">
                  {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-xs sm:text-sm text-yellow-100">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-yellow-300 truncate max-w-xs">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse flex space-x-2">
                <div className="rounded-full bg-yellow-700 h-8 w-8"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-yellow-700 rounded w-3/4"></div>
                  <div className="h-2 bg-yellow-700 rounded w-1/2"></div>
                </div>
              </div>
            )}
            
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <div className="p-1 sm:p-2 bg-gray-900 rounded">
                <span className="block text-yellow-400">Country</span>
                <span className="font-medium text-yellow-100">{userCountry?.name || "N/A"}</span>
              </div>
              <div className="p-1 sm:p-2 bg-gray-900 rounded">
                <span className="block text-yellow-400">State</span>
                <span className="font-medium text-yellow-100">{userState?.name || "N/A"}</span>
              </div>
            </div>
          </div>
          
          {/* Meetings Management Card - Full width separate card */}
          <div className="bg-black rounded-lg shadow-md p-3 sm:p-4 w-full border border-yellow-600">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 space-y-2 sm:space-y-0">
              <h3 className="text-sm sm:text-lg font-bold text-yellow-500">Your Meetings</h3>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {/* Date View Selector */}
                <div className="flex text-xs bg-gray-900 rounded-md p-1">
                  <button
                    onClick={() => setSelectedDateView('upcoming')}
                    className={`px-2 py-1 rounded ${selectedDateView === 'upcoming' ? 'bg-yellow-600 text-black' : 'text-yellow-400 hover:bg-gray-800'}`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => setSelectedDateView('today')}
                    className={`px-2 py-1 rounded ${selectedDateView === 'today' ? 'bg-yellow-600 text-black' : 'text-yellow-400 hover:bg-gray-800'}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedDateView('week')}
                    className={`px-2 py-1 rounded ${selectedDateView === 'week' ? 'bg-yellow-600 text-black' : 'text-yellow-400 hover:bg-gray-800'}`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setSelectedDateView('past')}
                    className={`px-2 py-1 rounded ${selectedDateView === 'past' ? 'bg-yellow-600 text-black' : 'text-yellow-400 hover:bg-gray-800'}`}
                  >
                    Past
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowModal(true)} 
                  className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs sm:text-sm font-medium py-1 px-2 sm:py-2 sm:px-4 rounded-md transition"
                >
                  Create Meeting
                </button>
              </div>
            </div>

            {/* Meetings List */}
            <div>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 mx-auto border-4 border-yellow-500 border-t-transparent rounded-full"></div>
                  <p className="text-xs sm:text-sm text-yellow-400 mt-2">Loading meetings...</p>
                </div>
              ) : Object.keys(groupedMeetings).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(groupedMeetings).map(([dateKey, dateMeetings]) => (
                    <div key={dateKey} className="border border-yellow-700 rounded-md overflow-hidden">
                      <div 
                        className="bg-gray-900 px-3 py-2 flex justify-between items-center cursor-pointer"
                        onClick={() => toggleMeetingExpansion(dateKey)}
                      >
                        <h4 className="font-medium text-xs sm:text-sm text-yellow-400">{dateKey} ({dateMeetings.length})</h4>
                        <svg 
                          className={`h-4 w-4 text-yellow-500 transition-transform ${expandedMeetings[dateKey] ? 'transform rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {expandedMeetings[dateKey] && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-yellow-900 text-left">
                            <thead className="bg-gray-900">
                              <tr>
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-yellow-500 uppercase tracking-wider">Topic</th>
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-yellow-500 uppercase tracking-wider">Time (UTC)</th>
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-yellow-500 uppercase tracking-wider">Join URL</th>
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-yellow-500 uppercase tracking-wider">Host URL</th>
                              </tr>
                            </thead>
                            <tbody className="bg-black divide-y divide-yellow-900">
                              {dateMeetings.map((meeting) => (
                                <tr key={meeting.id} className="hover:bg-gray-900">
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-yellow-200">{meeting.topic}</td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs text-yellow-300">
                                    {formatUTCToLocal(meeting.start_time)}
                                  </td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs">
                                    <a 
                                      href={meeting.join_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-yellow-400 hover:text-yellow-300 hover:underline"
                                    >
                                      <span className="hidden sm:inline mr-1">Join Meeting</span>
                                      <span className="sm:hidden">Join</span>
                                      <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs">
                                    <a 
                                      href={meeting.formatted_info?.host_url || meeting.start_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-yellow-400 hover:text-yellow-300 hover:underline"
                                    >
                                      <span className="hidden sm:inline mr-1">Host Meeting</span>
                                      <span className="sm:hidden">Host</span>
                                      <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-900 rounded">
                  <svg className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="mt-2 text-xs sm:text-sm text-yellow-400">
                    {selectedDateView === 'upcoming' ? 'No upcoming meetings scheduled.' :
                     selectedDateView === 'today' ? 'No meetings scheduled for today.' :
                     selectedDateView === 'week' ? 'No meetings scheduled for this week.' :
                     selectedDateView === 'past' ? 'No past meetings found.' :
                     'No meetings found.'}
                  </p>
                  <button 
                    onClick={() => setShowModal(true)} 
                    className="mt-2 text-xs sm:text-sm text-yellow-500 hover:text-yellow-400"
                  >
                    Schedule a meeting
                  </button>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <div className="mt-3 text-right">
              <button 
                onClick={fetchMeetings} 
                disabled={loading}
                className="text-xs text-yellow-500 hover:text-yellow-400 underline"
              >
                Refresh Meetings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Creating Meeting */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="relative bg-black rounded-lg shadow-xl w-full max-w-md mx-auto border border-yellow-600">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-yellow-500">Schedule a New Meeting (UTC)</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-yellow-400 hover:text-yellow-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {error && <div className="text-red-500 text-xs mb-4 p-2 bg-red-900 bg-opacity-20 rounded">{error}</div>}
              
              <form onSubmit={createMeeting}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-yellow-400 mb-1">Meeting Topic</label>
                    <input
                      type="text"
                      name="topic"
                      value={meetingForm.topic}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-yellow-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-900 text-yellow-100"
                      placeholder="Enter meeting topic"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-yellow-400 mb-1">Date (UTC)</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="date"
                        value={meetingForm.date}
                        min={today}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-yellow-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-900 text-yellow-100"
                        style={{ colorScheme: 'dark' }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-yellow-400 mb-1">Time (UTC)</label>
                    <div className="relative">
                      <input
                        type="time"
                        name="time"
                        value={meetingForm.time}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-yellow-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-900 text-yellow-100"
                        style={{ colorScheme: 'dark' }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-400 mt-1">Times are in Coordinated Universal Time (UTC)</p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-yellow-700 rounded-md text-sm font-medium text-yellow-400 hover:bg-gray-800 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black text-sm font-medium rounded-md transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                  >
                    {loading ? "Creating..." : "Schedule Meeting"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
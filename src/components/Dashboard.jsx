import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import Navbar from "./Navbar";
import logo from '../assets/images/logo.png';

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
  const [selectedDateView, setSelectedDateView] = useState("today");
  const [hidePastMeetings, setHidePastMeetings] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [redirectTimer, setRedirectTimer] = useState(5);
  const timerRef = useRef(null);

  const [copiedLink, setCopiedLink] = useState(null);
  const [qrModal, setQrModal] = useState({
    show: false,
    url: "",
    type: "",
    topic: "",
    meetingId: null
  });

  // Create ref for the QR modal
  const qrModalRef = useRef(null);

  const isPastMeeting = (meeting) => {
    return new Date(meeting.start_time) < new Date();
  };

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

  const createMeeting = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const utcDateTime = new Date(`${meetingForm.date}T${meetingForm.time}Z`).toISOString();

      const response = await axios.post("https://api.xautrademeeting.com/create-meeting/", {
        topic: meetingForm.topic,
        start_time: utcDateTime,
        duration: meetingForm.duration
      });

      if (response.data.success) {
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

  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user]);

  useEffect(() => {
    if (showRedirectModal && redirectTimer > 0) {
      timerRef.current = setTimeout(() => {
        setRedirectTimer(redirectTimer - 1);
      }, 1000);
    } else if (showRedirectModal && redirectTimer === 0) {
      window.location.href = redirectUrl;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [showRedirectModal, redirectTimer, redirectUrl]);

  useEffect(() => {
    let timeout;
    if (copiedLink) {
      timeout = setTimeout(() => {
        setCopiedLink(null);
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [copiedLink]);

  const handleMeetingRedirect = (url, e) => {
    e.preventDefault();
    setRedirectUrl(url);
    setRedirectTimer(5);
    setShowRedirectModal(true);
  };

  const generateShareableUrl = (meeting, type) => {
    return type === 'join' ? meeting.join_url : (meeting.formatted_info?.host_url || meeting.start_url);
  };

  const generateDashboardShareLink = () => {
    return "https://xautrademeeting.com/dashboard";
  };

  const generateQRCode = (meeting, type) => {
    const url = generateShareableUrl(meeting, type);
    setQrModal({
      show: true,
      url: url,
      type: type === 'join' ? 'Join Meeting' : 'Host Meeting',
      topic: meeting.topic,
      meetingId: meeting.id
    });
  };

  const handleCopyLink = (meeting, type, e) => {
    e.preventDefault();
    e.stopPropagation();

    let shareableUrl;
    if (type === 'dashboard') {
      shareableUrl = generateDashboardShareLink();
    } else {
      shareableUrl = generateShareableUrl(meeting, type);
    }

    navigator.clipboard.writeText(shareableUrl).then(() => {
      setCopiedLink(`${meeting.id}-${type}`);
      if (type !== 'dashboard') {
        generateQRCode(meeting, type);
      }
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMeetingForm({
      ...meetingForm,
      [name]: value
    });
  };

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

  const toggleMeetingExpansion = (meetingId) => {
    setExpandedMeetings(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId]
    }));
  };

  const filterMeetings = () => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let filtered = meetings;

    if (selectedDateView === "today") {
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.start_time);
        return meetingDate >= todayStart && meetingDate <= todayEnd;
      });
    } else {
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.start_time);
        return meetingDate >= todayStart;
      });
    }

    if (hidePastMeetings) {
      filtered = filtered.filter(meeting => !isPastMeeting(meeting));
    }

    return filtered;
  };

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

  const userCountry = countries.find((c) => c.id === user?.country_id);
  const userState = userCountry?.states.find((s) => s.id === user?.state_id);

  const groupedMeetings = groupMeetingsByDate();
  const today = new Date().toISOString().split('T')[0];

  // Enhanced download function with CSS fixes
  const downloadQRCode = async () => {
    if (!qrModalRef.current) return;

    try {
      // 1. Create clone and position off-screen
      const modalClone = qrModalRef.current.cloneNode(true);

      // 2. Remove text truncation styles from the clone
      const topicElement = modalClone.querySelector('.truncate');
      if (topicElement) {
        topicElement.style.whiteSpace = 'normal';
        topicElement.style.textOverflow = 'clip';
        topicElement.style.overflow = 'visible';
        topicElement.style.display = 'block';
      }

      // 3. Remove ALL buttons from the clone
      const buttons = modalClone.querySelectorAll('button');
      buttons.forEach(button => button.remove());

      // 4. Position clone for capture
      modalClone.style.position = 'fixed';
      modalClone.style.left = '-9999px';
      modalClone.style.top = '0';
      modalClone.style.zIndex = '99999';
      document.body.appendChild(modalClone);

      // 5. Replace unsupported color functions
      const replaceModernColors = (element) => {
        const computedStyle = window.getComputedStyle(element);
        ['color', 'background-color', 'border-color'].forEach(prop => {
          const value = computedStyle.getPropertyValue(prop);
          if (value.includes('oklab') || value.includes('oklch')) {
            element.style.setProperty(prop, '#EFBF04', 'important');
          }
        });
      };

      replaceModernColors(modalClone);
      modalClone.querySelectorAll('*').forEach(replaceModernColors);

      // 6. Wait for fonts to load
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 100));

      // 7. Capture with html2canvas
      const canvas = await html2canvas(modalClone, {
        scale: 2,
        backgroundColor: '#000000',
        logging: true,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (el) => el.tagName === 'SCRIPT',
        onclone: (clonedDoc) => {
          // Ensure all text is visible
          clonedDoc.querySelectorAll('*').forEach(el => {
            el.style.visibility = 'visible';
            el.style.opacity = '1';
          });
        }
      });

      // 8. Clean up
      document.body.removeChild(modalClone);

      // 9. Trigger download
      const link = document.createElement('a');
      link.download = `xautrade-meeting-${qrModal.meetingId}-${qrModal.topic.substring(0, 20).replace(/[^a-z0-9]/gi, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error('Error:', error);
      // Fallback to SVG only
      const svg = document.getElementById('qr-code-svg');
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const link = document.createElement('a');
        link.download = `xautrade-qr-${qrModal.meetingId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };
  const shareQRCode = async () => {
    try {
      // Convert logo to base64 for embedding
      const logoResponse = await fetch(logo);
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });
  
      // Create HTML content with bigger logo, QR code and clickable link in a card layout
      const shareContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Join ${qrModal.topic}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #000;
              color: #EFBF04;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .card {
              background: #121212;
              border-radius: 16px;
              box-shadow: 0 0 30px rgba(239, 191, 4, 0.4);
              overflow: hidden;
              width: 90%;
              max-width: 500px;
              margin: 20px auto;
              position: relative;
            }
            .logo {
              height: 100px; /* Bigger logo */
              margin: 30px auto 20px;
              display: block;
              opacity: 0.95;
            }
            .content {
              padding: 20px 25px 30px;
              border-top: 2px solid rgba(239, 191, 4, 0.3);
            }
            h1 {
              margin: 0 0 15px 0;
              font-size: 22px;
              font-weight: 600;
            }
            .qr-container {
              margin: 25px auto;
              padding: 15px;
              background: #000;
              border: 1px solid rgba(239, 191, 4, 0.3);
              border-radius: 8px;
              display: inline-block;
            }
            .join-btn {
              display: inline-block;
              padding: 14px 30px;
              background-color: #EFBF04;
              color: #000 !important;
              text-decoration: none;
              font-weight: 600;
              border-radius: 8px;
              font-size: 18px;
              margin: 20px 0;
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(239, 191, 4, 0.3);
            }
            .join-btn:hover {
              background-color: #f8d34d;
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(239, 191, 4, 0.4);
            }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${logoBase64}" alt="Company Logo" class="logo">
            
            <div class="content">
              <h1>${qrModal.topic}</h1>
              <p class="instructions">Scan the QR code or tap the button below to join</p>
              
              <div class="qr-container">
                ${document.getElementById('qr-code-svg').outerHTML}
              </div>
              
              <a href="${qrModal.url}" class="join-btn">Tap to Join Meeting</a>
            </div>
          </div>
        </body>
        </html>
      `;
  
      // For native apps (WhatsApp, email, etc.)
      if (navigator.share) {
        try {
          const blob = new Blob([shareContent], { type: 'text/html' });
          const file = new File([blob], `join-${qrModal.topic}.html`, { type: 'text/html' });
          
          await navigator.share({
            title: `Join ${qrModal.topic}`,
            text: `Tap to join: ${qrModal.url}`,
            files: [file]
          });
          return;
        } catch (shareError) {
          console.log('Native share with file failed, falling back to URL sharing');
        }
      }
  
      // Fallback for browsers that don't support sharing files
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(`Join ${qrModal.topic}: ${qrModal.url}`);
          
          const blob = new Blob([shareContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          window.open(url, '_blank');
          alert('Meeting link copied to clipboard! The QR page has opened in a new tab.');
          return;
        } catch (e) {
          console.error('Clipboard or window.open failed', e);
        }
      }
  
      // Ultimate fallback - just show the HTML in a new tab
      const newWindow = window.open('', '_blank');
      newWindow.document.write(shareContent);
      newWindow.document.close();
  
    } catch (err) {
      console.error('Error sharing QR code:', err);
      try {
        await navigator.clipboard.writeText(`Join ${qrModal.topic}: ${qrModal.url}`);
        alert('Meeting link copied to clipboard!');
      } catch (copyErr) {
        alert(`Couldn't share automatically. Here's the meeting link:\n\n${qrModal.url}`);
      }
    }
  };
  const copyMeetingLink = async () => {
    try {
      await navigator.clipboard.writeText(qrModal.url);
      alert('Meeting link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black to-gray-900">
      <Navbar user={user} setUser={setUser} />

      <div className="flex-grow p-2 sm:p-4 mt-16">
        <div className="flex flex-col gap-4">
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

          <div className="bg-black rounded-lg shadow-md p-3 sm:p-4 w-full border border-yellow-600">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-lg font-bold text-yellow-500">
                    {selectedDateView === "today" ? "Today's Meetings" : "Upcoming Meetings"}
                  </h3>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input
                      type="checkbox"
                      name="toggle"
                      id="toggle"
                      checked={selectedDateView === "upcoming"}
                      onChange={() => setSelectedDateView(selectedDateView === "today" ? "upcoming" : "today")}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-yellow-500 border-4 appearance-none cursor-pointer transition-transform"
                    />
                    <label
                      htmlFor="toggle"
                      className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-700 cursor-pointer"
                    ></label>
                  </div>
                </div>

                <button
                  onClick={() => setHidePastMeetings(!hidePastMeetings)}
                  className={`text-xs px-2 py-1 rounded ${hidePastMeetings ? 'bg-gray-800 text-yellow-400' : 'bg-yellow-600 text-black'}`}
                >
                  {hidePastMeetings ? 'Show Ended' : 'Hide Ended'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs sm:text-sm font-medium py-1 px-2 sm:py-2 sm:px-4 rounded-md transition"
                >
                  Create Meeting
                </button>
              </div>
            </div>

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
                          className={`h-4 w-4 text-yellow-500 transition-transform ${expandedMeetings[dateKey] ? 'transform rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
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
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-yellow-500 uppercase tracking-wider">Share</th>
                              </tr>
                            </thead>
                            <tbody className="bg-black divide-y divide-yellow-900">
                              {dateMeetings.map((meeting) => (
                                <tr
                                  key={meeting.id}
                                  className={`hover:bg-gray-900 ${isPastMeeting(meeting) ? 'opacity-70 grayscale' : ''}`}
                                >
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-yellow-200">
                                    {meeting.topic}
                                    {isPastMeeting(meeting) && (
                                      <span className="ml-2 text-xs text-yellow-500">(Ended)</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs text-yellow-300">
                                    {formatUTCToLocal(meeting.start_time)}
                                  </td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs">
                                    <div className="flex items-center space-x-2">
                                      {isPastMeeting(meeting) ? (
                                        <span className="inline-flex items-center text-yellow-600 opacity-50 cursor-not-allowed">
                                          <span className="hidden sm:inline mr-1">Join Meeting</span>
                                          <span className="sm:hidden">Join</span>
                                          <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>

                                        </span>
                                      ) : (
                                        <a
                                          href="#"
                                          onClick={(e) => handleMeetingRedirect(meeting.join_url, e)}
                                          className="inline-flex items-center text-yellow-400 hover:text-yellow-300 hover:underline"
                                        >
                                          <span className="hidden sm:inline mr-1">Join Meeting</span>
                                          <span className="sm:hidden">Join</span>
                                          <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>

                                        </a>
                                      )}
                                      <button
                                        onClick={(e) => handleCopyLink(meeting, 'join', e)}
                                        className={`${isPastMeeting(meeting) ? 'text-yellow-600' : 'text-yellow-500 hover:text-yellow-400'} p-1 rounded-full`}
                                        title="Copy join link"
                                      >
                                        <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>

                                      </button>
                                      {copiedLink === `${meeting.id}-join` && (
                                        <span className="text-xs text-green-400 animate-pulse">Copied!</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs">
                                    <div className="flex items-center space-x-2">
                                      {isPastMeeting(meeting) ? (
                                        <span className="inline-flex items-center text-yellow-600 opacity-50 cursor-not-allowed">
                                          <span className="hidden sm:inline mr-1">Host Meeting</span>
                                          <span className="sm:hidden">Host</span>
                                          <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>

                                        </span>
                                      ) : (
                                        <a
                                          href="#"
                                          onClick={(e) => handleMeetingRedirect(meeting.formatted_info?.host_url || meeting.start_url, e)}
                                          className="inline-flex items-center text-yellow-400 hover:text-yellow-300 hover:underline"
                                        >
                                          <span className="hidden sm:inline mr-1">Host Meeting</span>
                                          <span className="sm:hidden">Host</span>
                                          <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>

                                        </a>
                                      )}
                                      <button
                                        onClick={(e) => handleCopyLink(meeting, 'host', e)}
                                        className={`${isPastMeeting(meeting) ? 'text-yellow-600' : 'text-yellow-500 hover:text-yellow-400'} p-1 rounded-full`}
                                        title="Copy host link"
                                      >
                                        <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>

                                      </button>
                                      {copiedLink === `${meeting.id}-host` && (
                                        <span className="text-xs text-green-400 animate-pulse">Copied!</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-xs">
                                    <button
                                      onClick={(e) => handleCopyLink(meeting, 'dashboard', e)}
                                      className={`${isPastMeeting(meeting) ? 'text-yellow-600' : 'text-yellow-500 hover:text-yellow-400'} p-1 rounded-full`}
                                      title="Copy dashboard share link"
                                    >
                                      <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>

                                    </button>
                                    {copiedLink === `${meeting.id}-dashboard` && (
                                      <span className="text-xs text-green-400 animate-pulse ml-1">Copied!</span>
                                    )}
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
                  <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>

                  <p className="mt-2 text-xs sm:text-sm text-yellow-400">
                    {selectedDateView === "today"
                      ? "No meetings scheduled for today."
                      : "No upcoming meetings scheduled."}
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
                  <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
                        <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
                        <svg className="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

      {showRedirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-90">
          <div className="bg-black rounded-lg shadow-xl w-full max-w-md mx-auto border border-yellow-600 text-center p-8">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="Company Logo" className="h-20 sm:h-24" />
            </div>

            <h3 className="text-lg sm:text-xl font-semibold text-yellow-500 mb-4">
              Preparing Your Meeting
            </h3>
            <p className="text-yellow-300 text-sm mb-6">
              You will be redirected to your meeting in {redirectTimer} seconds...
            </p>

            <div className="w-full bg-gray-800 rounded-full h-2.5">
              <div
                className="bg-yellow-600 h-2.5 rounded-full transition-all duration-1000 ease-in-out"
                style={{ width: `${(5 - redirectTimer) * 20}%` }}
              ></div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => window.location.href = redirectUrl}
                className="bg-yellow-600 hover:bg-yellow-500 text-black text-sm font-medium py-2 px-4 rounded transition"
              >
                Start Now
              </button>
            </div>
          </div>
        </div>
      )}
      {qrModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-90">
          <div
            ref={qrModalRef}
            className="bg-black rounded-lg shadow-xl w-full max-w-xs mx-auto border-2 border-[#EFBF04] text-center p-6"
            style={{
              background: '#000',
              boxShadow: '0 0 20px rgba(239, 191, 4, 0.3)'
            }}
          >
            {/* Logo Section */}
            <div className="flex flex-col items-center justify-center mb-4">
              <img src={logo} alt="Brand Logo" className="h-16 opacity-90 mb-2" />
              <span className="text-sm text-[#EFBF04]">
                Scan to {qrModal.type.toLowerCase()}
              </span>
            </div>

            {/* QR Code Section */}
            <div className="flex justify-center mb-4 p-2 bg-black rounded border border-[#EFBF04]/30">
              <QRCodeSVG
                id="qr-code-svg"
                value={qrModal.url}
                size={200}
                level="H"
                includeMargin={false}
                fgColor="#EFBF04"
                bgColor="#000000"
                imageSettings={{
                  src: logo,
                  height: 50,
                  width: 50,
                  excavate: true,
                }}
              />
            </div>

            {/* Visible Meeting Link Section */}
            <div className="mb-4 group relative">
              <div className="flex items-center justify-center space-x-2">
                <svg
                  className="w-4 h-4 text-[#EFBF04]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <a
                  href={qrModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#EFBF04] hover:text-[#EFBF04]/80 text-sm break-all underline"
                >
                  {qrModal.url.replace(/https?:\/\//, '')}
                </a>
              </div>
              <span className="absolute -bottom-5 left-0 right-0 text-xs text-[#EFBF04]/70 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to open meeting
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={copyMeetingLink}
                className="bg-[#EFBF04] hover:bg-[#EFBF04]/90 text-black font-medium py-2 px-2 rounded transition flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>

              <button
                onClick={downloadQRCode}
                className="bg-[#EFBF04] hover:bg-[#EFBF04]/90 text-black font-medium py-2 px-2 rounded transition flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>

              <button
                onClick={shareQRCode}
                className="col-span-2 bg-[#EFBF04] hover:bg-[#EFBF04]/90 text-black font-medium py-2 rounded transition flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>

            <button
              onClick={() => setQrModal({ show: false, url: "", type: "", topic: "", meetingId: null })}
              className="w-full border border-[#EFBF04] hover:bg-[#EFBF04]/10 text-[#EFBF04] font-medium py-2 rounded transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;


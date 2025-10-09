"use client";

import { useState, useEffect } from "react";
import { useNotification } from "@/app/components/Notification";
import LoadingOverlay from "@/app/components/LoadingOverlay";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const Messages = () => {
  const { success, error, warning, info } = useNotification();
  
  const [activeTab, setActiveTab] = useState('compose');
  const [isLoading, setIsLoading] = useState(false);
  const [liveTests, setLiveTests] = useState([]);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [messageHistory, setMessageHistory] = useState([]);
  
  const [messageData, setMessageData] = useState({
    message: '',
    targetType: 'all',
    testId: '',
    schedule: false,
    timeMinutes: 10
  });

  useEffect(() => {
    fetchLiveTests();
    fetchMessageHistory();
  }, []);

  useEffect(() => {
    if (messageData.schedule) {
      fetchUpcomingTests();
    }
  }, [messageData.schedule]);

  const fetchLiveTests = async () => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/live-tests/${facultyId}`, {
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setLiveTests(data.data);
      }
    } catch (err) {
      console.error("Fetch live tests error:", err);
    }
  };

  const fetchUpcomingTests = async () => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/upcoming-tests/${facultyId}`, {
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUpcomingTests(data.data);
      }
    } catch (err) {
      console.error("Fetch upcoming tests error:", err);
    }
  };

  const fetchMessageHistory = async () => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/history/${facultyId}?limit=20`, {
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setMessageHistory(data.data);
      }
    } catch (err) {
      console.error("Fetch message history error:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMessageData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageData.message.trim()) {
      error("Please enter a message", "Validation Error");
      return;
    }

    if (!messageData.testId && messageData.targetType === 'test') {
      error("Please select a test", "Validation Error");
      return;
    }

    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    setIsLoading(true);

    try {
      let url, payload;

      if (messageData.schedule) {
        // Schedule message
        url = `${API_BASE_URL}/messages/schedule`;
        payload = {
          faculty_id: facultyId,
          test_id: messageData.testId,
          message: messageData.message.trim(),
          time_minutes: parseInt(messageData.timeMinutes)
        };
      } else {
        // Send instant message
        url = `${API_BASE_URL}/messages/send-instant`;
        payload = {
          faculty_id: facultyId,
          test_id: messageData.testId,
          message: messageData.message.trim(),
          target_type: messageData.targetType
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        success(
          messageData.schedule 
            ? "Message scheduled successfully!" 
            : `Message sent to ${data.data?.recipients || 0} students!`,
          "Success"
        );
        
        // Reset form
        setMessageData({
          message: '',
          targetType: 'all',
          testId: '',
          schedule: false,
          timeMinutes: 10
        });

        // Refresh history
        fetchMessageHistory();
      } else {
        error(data.message || "Failed to send message", "Error");
      }
    } catch (err) {
      console.error("Send message error:", err);
      error("Failed to send message", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelScheduledMessage = async (messageId) => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/scheduled/${messageId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty_id: facultyId })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        success("Scheduled message cancelled", "Success");
        fetchMessageHistory();
      } else {
        error(data.message || "Failed to cancel message", "Error");
      }
    } catch (err) {
      console.error("Cancel message error:", err);
      error("Failed to cancel message", "Network Error");
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min ago`;
    return "Just now";
  };

  const getTestsToShow = () => {
    return messageData.schedule ? upcomingTests : liveTests;
  };

  return (
    <>
      <LoadingOverlay active={isLoading} message="Processing..." type="spinner" />
      
      <div className="fade-in">
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ color: "#06b6d4", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Live Messaging
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>
            Send real-time messages to students during tests or schedule messages for upcoming tests.
          </p>
        </div>

        <div className="tabs-container">
          <div className="tabs-nav">
            <button 
              className={`tab-button ${activeTab === 'compose' ? 'active' : ''}`}
              onClick={() => setActiveTab('compose')}
            >
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
              </svg>
              Compose Message
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Message History ({messageHistory.length})
            </button>
          </div>

          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <div className="tab-content active">
              <div className="grid-2">
                <div className="dashboard-card">
                  <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
                    {messageData.schedule ? 'Schedule Message' : 'Broadcast Message'}
                  </h3>
                  <form onSubmit={handleSendMessage} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    
                    {/* Schedule Toggle */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.3)'}}>
                      <input 
                        type="checkbox" 
                        id="schedule"
                        name="schedule"
                        checked={messageData.schedule}
                        onChange={handleInputChange}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <label htmlFor="schedule" style={{color: '#e2e8f0', fontWeight: 600, cursor: 'pointer'}}>
                        Schedule for later (upcoming tests only)
                      </label>
                    </div>

                    {/* Target Selection */}
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                        Target Audience
                      </label>
                      <select 
                        name="targetType"
                        className="filter-select" 
                        style={{width: '100%'}}
                        value={messageData.targetType}
                        onChange={handleInputChange}
                        disabled={messageData.schedule} // Force specific test for scheduled messages
                      >
                        <option value="all">All Students in Test</option>
                        <option value="test">Specific Test</option>
                      </select>
                    </div>

                    {/* Test Selection */}
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                        Select Test
                        {messageData.schedule && (
                          <span style={{ color: '#94a3b8', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                            (Upcoming tests only)
                          </span>
                        )}
                      </label>
                      <select 
                        name="testId"
                        className="filter-select" 
                        style={{width: '100%'}}
                        value={messageData.testId}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">
                          {messageData.schedule ? 'Choose Upcoming Test' : 'Choose Live Test'}
                        </option>
                        {getTestsToShow().map(test => (
                          <option key={test.test_id} value={test.test_id}>
                            {test.title} - {test.branch} {test.section} ({test.language})
                          </option>
                        ))}
                      </select>
                      {getTestsToShow().length === 0 && (
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                          {messageData.schedule 
                            ? 'No upcoming tests available for scheduling'
                            : 'No live tests available for messaging'
                          }
                        </div>
                      )}
                    </div>

                    {/* Schedule Time (for scheduled messages) */}
                    {messageData.schedule && (
                      <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                          Send Message After (minutes from test start)
                        </label>
                        <input 
                          type="number" 
                          name="timeMinutes"
                          className="search-input" 
                          style={{width: '100%'}}
                          value={messageData.timeMinutes}
                          onChange={handleInputChange}
                          min="1"
                          max="180"
                          placeholder="e.g., 30 (will send 30 minutes after test starts)"
                        />
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          Message will be sent {messageData.timeMinutes} minutes after the test begins
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                        Message
                      </label>
                      <textarea 
                        name="message"
                        className="form-textarea" 
                        style={{width: '100%', height: '120px'}} 
                        placeholder={messageData.schedule 
                          ? "Enter message to schedule for students..." 
                          : "Enter message to broadcast to students..."
                        }
                        value={messageData.message}
                        onChange={handleInputChange}
                        required
                      />
                      <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {messageData.message.length}/500 characters
                      </div>
                    </div>

                    <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                      <button type="submit" className="action-btn primary" disabled={isLoading}>
                        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                        </svg>
                        {messageData.schedule ? 'Schedule Message' : 'Send Now'}
                      </button>
                      <button 
                        type="button" 
                        className="action-btn secondary"
                        onClick={() => setMessageData({
                          message: '',
                          targetType: 'all',
                          testId: '',
                          schedule: false,
                          timeMinutes: 10
                        })}
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </div>

                {/* Quick Templates */}
                <div className="dashboard-card">
                  <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
                    Quick Templates
                  </h3>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                    <button 
                      className="btn-sm secondary"
                      onClick={() => setMessageData(prev => ({
                        ...prev,
                        message: 'You have 30 minutes remaining. Please review your solutions before submission.'
                      }))}
                      style={{justifyContent: 'flex-start', padding: '0.75rem'}}
                    >
                      ⏰ 30 Minutes Remaining
                    </button>
                    <button 
                      className="btn-sm secondary"
                      onClick={() => setMessageData(prev => ({
                        ...prev,
                        message: 'Test will end in 10 minutes. Please finalize your submissions now.'
                      }))}
                      style={{justifyContent: 'flex-start', padding: '0.75rem'}}
                    >
                      🚨 Final Warning
                    </button>
                    <button 
                      className="btn-sm secondary"
                      onClick={() => setMessageData(prev => ({
                        ...prev,
                        message: 'Take your time and think through each problem carefully. Good luck!'
                      }))}
                      style={{justifyContent: 'flex-start', padding: '0.75rem'}}
                    >
                      💪 Encouragement
                    </button>
                    <button 
                      className="btn-sm secondary"
                      onClick={() => setMessageData(prev => ({
                        ...prev,
                        message: 'Please ensure your internet connection is stable and avoid refreshing the page.'
                      }))}
                      style={{justifyContent: 'flex-start', padding: '0.75rem'}}
                    >
                      ⚠️ Technical Reminder
                    </button>
                    <button 
                      className="btn-sm secondary"
                      onClick={() => setMessageData(prev => ({
                        ...prev,
                        message: 'Please read the problem statement carefully and follow the required output format.'
                      }))}
                      style={{justifyContent: 'flex-start', padding: '0.75rem'}}
                    >
                      📝 Instructions Reminder
                    </button>
                  </div>

                  {/* Live Test Status */}
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <h4 style={{ color: '#86efac', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Live Tests Status
                    </h4>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      {liveTests.length > 0 ? (
                        <>
                          <div>✅ {liveTests.length} live test{liveTests.length > 1 ? 's' : ''} available for messaging</div>
                          <div style={{ marginTop: '0.5rem' }}>
                            {liveTests.map(test => (
                              <div key={test.test_id} style={{ marginLeft: '1rem' }}>
                                • {test.title}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div>📭 No live tests available for messaging</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="tab-content active">
              <div className="dashboard-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600}}>
                    Message History
                  </h3>
                  <button 
                    className="btn-sm secondary"
                    onClick={fetchMessageHistory}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg className="icon" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Refresh
                  </button>
                </div>
                
                {messageHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <svg style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <p>No messages sent yet</p>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {messageHistory.map(msg => (
                      <div key={`${msg.type}-${msg.message_id}`} style={{
                        padding: '1rem',
                        background: msg.type === 'instant' && msg.status === 'sent' ? 'rgba(34, 197, 94, 0.1)' : 
                                   msg.type === 'scheduled' && msg.status === 'pending' ? 'rgba(59, 130, 246, 0.1)' : 
                                   'rgba(107, 114, 128, 0.1)',
                        border: `1px solid ${msg.type === 'instant' && msg.status === 'sent' ? 'rgba(34, 197, 94, 0.3)' : 
                                              msg.type === 'scheduled' && msg.status === 'pending' ? 'rgba(59, 130, 246, 0.3)' : 
                                              'rgba(107, 114, 128, 0.3)'}`,
                        borderRadius: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{
                            color: msg.type === 'instant' && msg.status === 'sent' ? '#86efac' : 
                                  msg.type === 'scheduled' && msg.status === 'pending' ? '#93c5fd' : '#d1d5db',
                            fontWeight: 500
                          }}>
                            {msg.type === 'instant' ? '📢 Instant Message' : '⏰ Scheduled Message'}
                            {msg.type === 'scheduled' && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                                (at {msg.time_minutes} min)
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`status-badge ${msg.status}`}>
                              {msg.status.toUpperCase()}
                            </span>
                            {msg.type === 'scheduled' && msg.status === 'pending' && (
                              <button
                                onClick={() => cancelScheduledMessage(msg.message_id)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#fca5a5',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem', fontStyle: 'italic'}}>
                          "{msg.message}"
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280'}}>
                          <span>Test: {msg.test_title} ({msg.branch} {msg.section})</span>
                          <span>{formatTime(msg.sent_at || msg.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Messages;

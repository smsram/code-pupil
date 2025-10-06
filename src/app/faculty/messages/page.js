"use client";

import { useState } from 'react';

const Messages = () => {
  const [activeTab, setActiveTab] = useState('compose');
  const [messageData, setMessageData] = useState({
    message: '',
    targetType: 'all',
    testId: '',
    schedule: false,
    scheduleTime: ''
  });

  const [messageHistory] = useState([
    {
      id: 1,
      type: 'broadcast',
      message: 'You have 30 minutes remaining. Please review your solutions.',
      target: 'All students in Advanced Algorithms Final',
      time: '15 min ago',
      status: 'sent'
    },
    {
      id: 2,
      type: 'scheduled',
      message: 'Test will end in 10 minutes. Please finalize your submissions.',
      target: 'All students in Advanced Algorithms Final',
      time: 'Scheduled for 10 min remaining',
      status: 'pending'
    },
    {
      id: 3,
      type: 'auto',
      message: 'Advanced Algorithms test has begun. Good luck!',
      target: 'All students in Advanced Algorithms Final',
      time: '1 hour ago',
      status: 'sent'
    }
  ]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMessageData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    console.log('Sending message:', messageData);
    alert('Message sent successfully!');
    setMessageData({
      message: '',
      targetType: 'all',
      testId: '',
      schedule: false,
      scheduleTime: ''
    });
  };

  return (
    <div className="fade-in">
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-button ${activeTab === 'compose' ? 'active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            <svg className="icon" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
            </svg>
            Compose Message
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <svg className="icon" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Message History
          </button>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="tab-content active">
            <div className="grid-2">
              <div className="dashboard-card">
                <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
                  Broadcast Message
                </h3>
                <form onSubmit={handleSendMessage} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
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
                    >
                      <option value="all">All Active Students</option>
                      <option value="test">Specific Test</option>
                      <option value="batch">Specific Batch</option>
                    </select>
                  </div>

                  {messageData.targetType === 'test' && (
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                        Select Test
                      </label>
                      <select 
                        name="testId"
                        className="filter-select" 
                        style={{width: '100%'}}
                        value={messageData.testId}
                        onChange={handleInputChange}
                      >
                        <option value="">Choose Test</option>
                        <option value="test_001">Advanced Algorithms Final</option>
                        <option value="test_002">Data Structures Midterm</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                      Message
                    </label>
                    <textarea 
                      name="message"
                      className="form-textarea" 
                      style={{width: '100%', height: '120px'}} 
                      placeholder="Enter message to broadcast to students..."
                      value={messageData.message}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <input 
                      type="checkbox" 
                      id="schedule"
                      name="schedule"
                      checked={messageData.schedule}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="schedule" style={{color: '#e2e8f0'}}>Schedule for later</label>
                  </div>

                  {messageData.schedule && (
                    <div>
                      <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                        Schedule Time
                      </label>
                      <input 
                        type="datetime-local" 
                        name="scheduleTime"
                        className="search-input" 
                        style={{width: '100%'}}
                        value={messageData.scheduleTime}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}

                  <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                    <button type="submit" className="action-btn primary">
                      <svg className="icon" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
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
                        scheduleTime: ''
                      })}
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>

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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content active">
            <div className="dashboard-card">
              <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
                Message History
              </h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {messageHistory.map(msg => (
                  <div key={msg.id} style={{
                    padding: '1rem',
                    background: msg.status === 'sent' ? 'rgba(34, 197, 94, 0.1)' : 
                           msg.status === 'pending' ? 'rgba(59, 130, 246, 0.1)' : 
                           'rgba(107, 114, 128, 0.1)',
                    border: `1px solid ${msg.status === 'sent' ? 'rgba(34, 197, 94, 0.3)' : 
                                      msg.status === 'pending' ? 'rgba(59, 130, 246, 0.3)' : 
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
                        color: msg.status === 'sent' ? '#86efac' : 
                              msg.status === 'pending' ? '#93c5fd' : '#d1d5db',
                        fontWeight: 500
                      }}>
                        {msg.status === 'sent' ? '📢 Broadcast Sent' : 
                         msg.status === 'pending' ? '⏰ Scheduled Message' : 
                         '📝 Auto Message'}
                      </div>
                      <span className={`status-badge ${msg.status}`}>
                        {msg.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem'}}>
                      &quot;{msg.message}&quot;
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280'}}>
                      <span>Target: {msg.target}</span>
                      <span>{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

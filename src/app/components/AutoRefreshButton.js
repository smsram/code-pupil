'use client'

import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const AutoRefreshButton = ({ 
  userId, 
  userType, 
  pageName, 
  onRefresh, 
  isRefreshing,
  showCountdown = false,
  showText = false,
  testStatus = 'upcoming'  // New prop: 'upcoming', 'live', 'completed'
}) => {
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [isEditing, setIsEditing] = useState(false);
  const [tempInterval, setTempInterval] = useState(5);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(5);
  
  const intervalIdRef = useRef(null);
  const countdownIdRef = useRef(null);

  const isLive = testStatus === 'live';

  // Load saved refresh interval
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/settings/refresh/${userType}/${userId}/${pageName}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setRefreshInterval(data.refresh_interval);
          setTempInterval(data.refresh_interval);
          setTimeUntilRefresh(data.refresh_interval);
        }
      } catch (err) {
        console.error('Failed to load refresh settings:', err);
      }
    };

    if (userId && userType && pageName) {
      loadSettings();
    }
  }, [userId, userType, pageName]);

  // Auto-refresh countdown and trigger - ONLY if test is live
  useEffect(() => {
    // Clear existing intervals
    if (countdownIdRef.current) {
      clearInterval(countdownIdRef.current);
    }
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    // Only setup auto-refresh if test is live
    if (!isLive) {
      return;
    }

    // Countdown timer (updates every second)
    countdownIdRef.current = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1) {
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-refresh timer
    intervalIdRef.current = setInterval(() => {
      onRefresh();
    }, refreshInterval * 1000);

    return () => {
      if (countdownIdRef.current) {
        clearInterval(countdownIdRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [refreshInterval, onRefresh, isLive]);

  // Save interval to database
  const saveInterval = async (newInterval) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/refresh/${userType}/${userId}/${pageName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_interval: newInterval })
        }
      );

      if (response.ok) {
        setRefreshInterval(newInterval);
        setTimeUntilRefresh(newInterval);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save refresh settings:', err);
    }
  };

  const handleManualRefresh = () => {
    onRefresh();
    setTimeUntilRefresh(refreshInterval);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'rgba(30, 41, 59, 0.5)',
      padding: '0.5rem 0.75rem',
      borderRadius: '8px',
      border: '1px solid rgba(71, 85, 105, 0.3)'
    }}>
      {/* Refresh Button */}
      <button
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'transparent',
          border: 'none',
          color: '#06b6d4',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          transition: 'all 0.2s',
          opacity: isRefreshing ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!isRefreshing) {
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        title={isLive ? `Auto-refresh every ${refreshInterval}s` : 'Manual refresh only (test not live)'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          style={{
            width: '20px',
            height: '20px',
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
          }}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" 
          />
        </svg>
        
        {/* Optional Text Display - Only show countdown if test is live */}
        {(showCountdown || showText) && (
          <span>
            {showText && isRefreshing && 'Refreshing...'}
            {showText && !isRefreshing && !showCountdown && 'Refresh'}
            {showCountdown && !isRefreshing && isLive && `${timeUntilRefresh}s`}
            {showCountdown && !isRefreshing && !isLive && 'Manual'}
          </span>
        )}
      </button>

      {/* Edit Button - Only show if test is live */}
      {isLive && !isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#06b6d4';
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'transparent';
          }}
          title="Edit refresh interval"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            style={{ width: '16px', height: '16px' }}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" 
            />
          </svg>
        </button>
      ) : isLive && isEditing ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <input
            type="number"
            value={tempInterval}
            onChange={(e) => setTempInterval(Number(e.target.value))}
            min="3"
            max="60"
            style={{
              width: '60px',
              padding: '0.25rem 0.5rem',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              borderRadius: '4px',
              color: '#e2e8f0',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>sec</span>
          <button
            onClick={() => saveInterval(tempInterval)}
            style={{
              padding: '0.25rem 0.5rem',
              background: '#06b6d4',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setTempInterval(refreshInterval);
            }}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'rgba(71, 85, 105, 0.5)',
              border: 'none',
              borderRadius: '4px',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AutoRefreshButton;

'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // 1) Define removeNotification first
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  // 2) Then define showNotification and include removeNotification in deps
  const showNotification = useCallback(({ 
    message, 
    type = 'info', 
    duration = 5000,
    title = '',
    icon = null // Add custom icon support
  }) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, title, icon };
    
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  // Convenience methods
  const success = useCallback((message, title = 'Success') => {
    return showNotification({ message, type: 'success', title });
  }, [showNotification]);

  const error = useCallback((message, title = 'Error') => {
    return showNotification({ message, type: 'error', title });
  }, [showNotification]);

  const warning = useCallback((message, title = 'Warning') => {
    return showNotification({ message, type: 'warning', title });
  }, [showNotification]);

  const info = useCallback((message, title = 'Info') => {
    return showNotification({ message, type: 'info', title });
  }, [showNotification]);

  // NEW: Faculty live message
  const liveMessage = useCallback((message, title = 'Faculty Message') => {
    return showNotification({ 
      message, 
      type: 'live', 
      title, 
      duration: 8000,
      icon: 'live'
    });
  }, [showNotification]);

  // NEW: Scheduled message
  const scheduledMessage = useCallback((message, title = 'Reminder') => {
    return showNotification({ 
      message, 
      type: 'scheduled', 
      title,
      duration: 8000,
      icon: 'scheduled'
    });
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ 
      showNotification, 
      success, 
      error, 
      warning, 
      info,
      liveMessage,
      scheduledMessage
    }}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification} 
      />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = ({ notifications, onClose }) => {
  return (
    <div style={styles.container}>
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id}
          notification={notification}
          onClose={() => onClose(notification.id)}
        />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification, onClose }) => {
  const { type, title, message, icon } = notification;

  const getIcon = () => {
    // Custom icons for live and scheduled messages
    if (icon === 'live') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      );
    }

    if (icon === 'scheduled') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
        </svg>
      );
    }

    // Default icons based on type
    switch (type) {
      case 'success':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'warning':
      case 'live':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23672 20.5467 2.53771 20.7239C2.83869 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'info':
      case 'scheduled':
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  const typeStyles = {
    success: styles.success,
    error: styles.error,
    warning: styles.warning,
    info: styles.info,
    live: styles.live,
    scheduled: styles.scheduled,
  };

  return (
    <div style={{ ...styles.notification, ...typeStyles[type] }}>
      <div style={styles.iconWrapper}>
        {getIcon()}
      </div>
      <div style={styles.content}>
        {title && <div style={styles.title}>{title}</div>}
        <div style={styles.message}>{message}</div>
      </div>
      <button 
        onClick={onClose}
        style={styles.closeButton}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '420px',
    width: '100%',
    pointerEvents: 'none',
  },
  notification: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    backdropFilter: 'blur(20px)',
    border: '1px solid',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
    animation: 'slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    pointerEvents: 'auto',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  success: {
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    color: '#86efac',
  },
  error: {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
  },
  warning: {
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    color: '#fcd34d',
  },
  info: {
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(14, 165, 233, 0.1) 100%)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    color: '#93c5fd',
  },
  live: {
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.15) 100%)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    color: '#fcd34d',
  },
  scheduled: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    color: '#93c5fd',
  },
  iconWrapper: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: '1.4',
  },
  message: {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: '1.5',
  },
  closeButton: {
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default NotificationProvider;

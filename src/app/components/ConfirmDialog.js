'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmDialogContext = createContext(null);

export const useConfirm = () => {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return confirm;
};

export const ConfirmDialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback(
    ({
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Proceed',
      cancelText = 'Cancel',
      type = 'info', // 'info', 'warning', 'danger', 'success'
      onConfirm,
      onCancel,
    }) => {
      return new Promise((resolve) => {
        setDialog({
          title,
          message,
          confirmText,
          cancelText,
          type,
          onConfirm: () => {
            if (onConfirm) onConfirm();
            resolve(true);
            setDialog(null);
          },
          onCancel: () => {
            if (onCancel) onCancel();
            resolve(false);
            setDialog(null);
          },
        });
      });
    },
    []
  );

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog dialog={dialog} />}
    </ConfirmDialogContext.Provider>
  );
};

const ConfirmDialog = ({ dialog }) => {
  const { title, message, confirmText, cancelText, type, onConfirm, onCancel } = dialog;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
          iconColor: '#ef4444',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          confirmButton: styles.dangerButton,
        };
      case 'warning':
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23672 20.5467 2.53771 20.7239C2.83869 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
          iconColor: '#f59e0b',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          confirmButton: styles.warningButton,
        };
      case 'success':
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
          iconColor: '#22c55e',
          iconBg: 'rgba(34, 197, 94, 0.15)',
          confirmButton: styles.successButton,
        };
      case 'info':
      default:
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
          iconColor: '#06b6d4',
          iconBg: 'rgba(6, 182, 212, 0.15)',
          confirmButton: styles.infoButton,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <>
      <div style={styles.overlay} onClick={onCancel} />
      <div style={styles.dialogContainer}>
        <div style={styles.dialog}>
          <div style={{ ...styles.iconContainer, backgroundColor: typeStyles.iconBg }}>
            <div style={{ color: typeStyles.iconColor }}>
              {typeStyles.icon}
            </div>
          </div>

          <div style={styles.content}>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.message}>{message}</p>
          </div>

          <div style={styles.buttonGroup}>
            <button
              onClick={onCancel}
              style={styles.cancelButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(71, 85, 105, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(71, 85, 105, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              style={{ ...styles.confirmButton, ...typeStyles.confirmButton }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    zIndex: 9998,
    animation: 'fadeIn 0.3s ease',
  },
  dialogContainer: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    animation: 'scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    maxWidth: '90vw',
    width: '480px',
  },
  dialog: {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)',
    borderRadius: '20px',
    padding: '32px',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(6, 182, 212, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  content: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    lineHeight: '1.3',
  },
  message: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.6',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    marginTop: '8px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0',
    background: 'rgba(71, 85, 105, 0.2)',
    border: '1px solid rgba(71, 85, 105, 0.4)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  confirmButton: {
    flex: 1,
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    fontFamily: 'inherit',
  },
  infoButton: {
    background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
  },
  successButton: {
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
  },
  warningButton: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  dangerButton: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
  },
};

// Add keyframes for animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
      to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes bounceIn {
      0% { transform: scale(0); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ConfirmDialogProvider;

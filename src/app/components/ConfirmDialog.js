'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmDialogContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return context;
};

export const ConfirmDialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback(({
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
  }, []);

  const closeDialog = useCallback(() => {
    if (dialog?.onCancel) {
      dialog.onCancel();
    } else {
      setDialog(null);
    }
  }, [dialog]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && <ConfirmDialog dialog={dialog} onClose={closeDialog} />}
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
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.645 18.3 1.55 18.65 1.55 19C1.55 19.35 1.64 19.69 1.81 19.99C1.99 20.29 2.24 20.55 2.54 20.72C2.84 20.9 3.18 20.99 3.53 21H20.47C20.82 20.99 21.16 20.9 21.46 20.72C21.76 20.55 22.01 20.29 22.19 19.99C22.36 19.69 22.45 19.35 22.45 19C22.45 18.65 22.35 18.3 22.18 18L13.71 3.86C13.53 3.57 13.28 3.32 12.98 3.15C12.68 2.98 12.34 2.9 12 2.9C11.66 2.9 11.32 2.98 11.02 3.15C10.72 3.32 10.47 3.57 10.29 3.86Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              <path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          iconColor: '#22c55e',
          iconBg: 'rgba(34, 197, 94, 0.15)',
          confirmButton: styles.successButton,
        };
      default:
        return {
          icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
            <div style={{ color: typeStyles.iconColor }}>{typeStyles.icon}</div>
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
                e.target.style.background = 'rgba(71, 85, 105, 0.3)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(71, 85, 105, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              style={{ ...styles.confirmButton, ...typeStyles.confirmButton }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
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
    top: 0, left: 0, right: 0, bottom: 0,
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

// ✅ Inject animations only once
if (typeof document !== 'undefined' && !document.getElementById('confirm-dialog-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'confirm-dialog-animations';
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
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

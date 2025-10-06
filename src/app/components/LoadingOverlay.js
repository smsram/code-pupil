'use client';
import { useEffect, useState } from 'react';

const LoadingOverlay = ({ 
  active = false, 
  message = 'Loading...', 
  type = 'spinner', // 'spinner', 'dots', 'pulse', 'bars'
  blur = true,
  fullScreen = true 
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (active) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      const timeout = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timeout);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [active]);

  if (!mounted) return null;

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return <DotsLoader />;
      case 'pulse':
        return <PulseLoader />;
      case 'bars':
        return <BarsLoader />;
      case 'spinner':
      default:
        return <SpinnerLoader />;
    }
  };

  return (
    <div 
      style={{
        ...styles.overlay,
        opacity: active ? 1 : 0,
        pointerEvents: active ? 'all' : 'none',
        backdropFilter: blur ? 'blur(8px)' : 'none',
        position: fullScreen ? 'fixed' : 'absolute',
      }}
    >
      <div style={styles.container}>
        {renderLoader()}
        {message && <div style={styles.message}>{message}</div>}
      </div>
    </div>
  );
};

// Spinner Loader
const SpinnerLoader = () => (
  <div style={styles.spinnerContainer}>
    <svg style={styles.spinner} viewBox="0 0 50 50">
      <circle
        style={styles.spinnerCircle}
        cx="25"
        cy="25"
        r="20"
        fill="none"
        strokeWidth="4"
      />
    </svg>
  </div>
);

// Dots Loader
const DotsLoader = () => (
  <div style={styles.dotsContainer}>
    <div style={{ ...styles.dot, animationDelay: '0s' }} />
    <div style={{ ...styles.dot, animationDelay: '0.2s' }} />
    <div style={{ ...styles.dot, animationDelay: '0.4s' }} />
  </div>
);

// Pulse Loader
const PulseLoader = () => (
  <div style={styles.pulseContainer}>
    <div style={{ ...styles.pulseRing, animationDelay: '0s' }} />
    <div style={{ ...styles.pulseRing, animationDelay: '0.5s' }} />
    <div style={{ ...styles.pulseRing, animationDelay: '1s' }} />
    <div style={styles.pulseCore} />
  </div>
);

// Bars Loader
const BarsLoader = () => (
  <div style={styles.barsContainer}>
    <div style={{ ...styles.bar, animationDelay: '0s' }} />
    <div style={{ ...styles.bar, animationDelay: '0.1s' }} />
    <div style={{ ...styles.bar, animationDelay: '0.2s' }} />
    <div style={{ ...styles.bar, animationDelay: '0.3s' }} />
    <div style={{ ...styles.bar, animationDelay: '0.4s' }} />
  </div>
);

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    transition: 'opacity 0.3s ease',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    animation: 'fadeInScale 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  message: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: '0.5px',
    animation: 'pulse 2s ease-in-out infinite',
  },

  // Spinner Styles
  spinnerContainer: {
    width: '80px',
    height: '80px',
    position: 'relative',
  },
  spinner: {
    width: '100%',
    height: '100%',
    animation: 'rotate 2s linear infinite',
  },
  spinnerCircle: {
    stroke: 'url(#gradient)',
    strokeLinecap: 'round',
    strokeDasharray: '1, 150',
    strokeDashoffset: '0',
    animation: 'dash 1.5s ease-in-out infinite',
  },

  // Dots Styles
  dotsContainer: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  dot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    animation: 'bounce 1.4s ease-in-out infinite',
    boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)',
  },

  // Pulse Styles
  pulseContainer: {
    width: '80px',
    height: '80px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '4px solid #06b6d4',
    animation: 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
  },
  pulseCore: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    boxShadow: '0 0 30px rgba(6, 182, 212, 0.8)',
    animation: 'pulseCore 2s ease-in-out infinite',
  },

  // Bars Styles
  barsContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    height: '60px',
  },
  bar: {
    width: '8px',
    height: '100%',
    borderRadius: '4px',
    background: 'linear-gradient(180deg, #06b6d4, #8b5cf6)',
    animation: 'barScale 1s ease-in-out infinite',
    boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)',
  },
};

// Add keyframes and gradient
if (typeof document !== 'undefined') {
  // Check if styles already exist
  if (!document.getElementById('loading-overlay-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'loading-overlay-styles';
    styleSheet.textContent = `
      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes rotate {
        100% {
          transform: rotate(360deg);
        }
      }

      @keyframes dash {
        0% {
          stroke-dasharray: 1, 150;
          stroke-dashoffset: 0;
        }
        50% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -35;
        }
        100% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -124;
        }
      }

      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes pulseRing {
        0% {
          transform: scale(0.8);
          opacity: 1;
        }
        100% {
          transform: scale(1.2);
          opacity: 0;
        }
      }

      @keyframes pulseCore {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      @keyframes barScale {
        0%, 100% {
          transform: scaleY(0.4);
        }
        50% {
          transform: scaleY(1);
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `;
    document.head.appendChild(styleSheet);

    // Add SVG gradient definition
    const svgDef = document.createElement('div');
    svgDef.innerHTML = `
      <svg style="position: absolute; width: 0; height: 0;" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `;
    document.body.appendChild(svgDef);
  }
}

export default LoadingOverlay;

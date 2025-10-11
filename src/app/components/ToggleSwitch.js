"use client";

import { useState, useEffect } from 'react';

const ToggleSwitch = ({ checked, onChange, disabled = false, label }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "24px",
          opacity: 0,
        }}
      >
        <span style={{ color: "#e2e8f0", fontSize: "0.95rem" }}>{label}</span>
        <div style={{ width: "48px", height: "24px" }} />
      </div>
    );
  }

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        pointerEvents: "auto",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ color: "#e2e8f0", fontSize: "0.95rem" }}>{label}</span>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          position: "relative",
          width: "48px",
          height: "24px",
          background: checked
            ? "linear-gradient(135deg, #06b6d4, #0ea5e9)"
            : "rgba(71, 85, 105, 0.4)",
          borderRadius: "12px",
          transition: "all 0.3s ease",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: checked ? "0 2px 8px rgba(6, 182, 212, 0.4)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "2px",
            left: checked ? "26px" : "2px",
            width: "20px",
            height: "20px",
            background: "white",
            borderRadius: "50%",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        />
      </div>
    </label>
  );
};

export default ToggleSwitch;

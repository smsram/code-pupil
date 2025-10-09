"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useNotification } from "@/app/components/Notification";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const Header = ({ onToggleSidebar, onToggleMobileMenu }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { success, error, warning, info } = useNotification();

  const [facultyInfo, setFacultyInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchFacultyInfo();
    fetchNotifications();

    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchFacultyInfo = async () => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/faculty/verify/${facultyId}`,
        { headers: { "Content-Type": "application/json" } }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setFacultyInfo(data.data);
      }
    } catch (err) {
      console.error("Fetch faculty info error:", err);
    }
  };

  const fetchNotifications = async () => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/faculty/${facultyId}?limit=20&t=${Date.now()}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId ? { ...n, read: 1 } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Mark notification as read error:", err);
    }
  };

  const markAllAsRead = async () => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/faculty/${facultyId}/read-all`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
        setUnreadCount(0);
        success("All notifications marked as read", "Success");
      }
    } catch (err) {
      console.error("Mark all as read error:", err);
      error("Failed to mark notifications as read", "Error");
    }
  };

  const getPageInfo = () => {
    if (pathname === "/faculty" || pathname === "/faculty/dashboard") {
      return {
        title: "Faculty Dashboard",
        subtitle: "Overview of all activities",
      };
    } else if (pathname === "/faculty/tests") {
      return {
        title: "All Tests",
        subtitle: "Manage and monitor all programming tests",
      };
    } else if (pathname === "/faculty/tests/create") {
      return {
        title: "Create New Test",
        subtitle: "Design and schedule programming assessments",
      };
    } else if (pathname.match(/^\/faculty\/tests\/[^\/]+$/)) {
      return {
        title: "Test Details",
        subtitle: "Monitor and analyze test performance",
      };
    } else if (pathname.match(/^\/faculty\/tests\/[^\/]+\/analytics$/)) {
      return {
        title: "Test Analytics",
        subtitle: "Performance insights and statistics",
      };
    } else if (pathname === "/faculty/students") {
      return { title: "Students", subtitle: "Manage student records" };
    } else if (pathname.startsWith("/faculty/students/")) {
      return {
        title: "Student Details",
        subtitle: "Detailed student performance review",
      };
    } else if (pathname === "/faculty/settings") {
      return {
        title: "Settings",
        subtitle: "System preferences and configuration",
      };
    }

    return {
      title: "Faculty Dashboard",
      subtitle: "Overview of all activities",
    };
  };

  const { title, subtitle } = getPageInfo();

  const handleCreateTest = () => {
    router.push("/faculty/create");
  };

  const handleBroadcast = () => {
    info("📢 Broadcast feature coming soon", "Info");
  };

  const handleNotificationToggle = () => {
    setShowNotifications(!showNotifications);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("faculty_id");
      success("Logged out successfully", "Success");
      router.push("/auth/faculty");
    }
  };

  const getInitials = () => {
    if (!facultyInfo) return "FT";
    return `${facultyInfo.first_name[0]}${facultyInfo.last_name[0]}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";

    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <>
      <header className="top-header" style={{ pointerEvents: "auto" }}>
        <div className="header-content">
          <div className="header-left">
            <button
              className="mobile-menu-toggle"
              onClick={onToggleMobileMenu}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
            >
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.75 6.75h16.5M3.75 12h16.5m-4.5 5.25h4.5"
                />
              </svg>
            </button>
            <div className="page-info">
              <h1 className="page-title">{title}</h1>
              <p className="page-subtitle">{subtitle}</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="action-btn primary"
              onClick={handleCreateTest}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
            >
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span className="btn-text">Create Test</span>
            </button>

            <button
              className="action-btn success"
              onClick={handleBroadcast}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
            >
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
                />
              </svg>
              <span className="btn-text">Broadcast</span>
            </button>

            {/* Notification Bell */}
            <div style={{ position: "relative", zIndex: 1000001 }}>
              <button
                className="notification-btn"
                onClick={handleNotificationToggle}
                style={{ pointerEvents: "auto", cursor: "pointer" }}
              >
                <svg
                  className="icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
            </div>

            {/* User Profile */}
            <div className="user-profile" style={{ position: "relative" }}>
              <div
                className="user-avatar"
                style={{ cursor: "pointer", pointerEvents: "auto" }}
                onClick={() => router.push("/faculty/settings")}
                title="Settings"
              >
                {getInitials()}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {facultyInfo
                    ? `${facultyInfo.first_name} ${facultyInfo.last_name}`
                    : "Loading..."}
                </div>
                <div className="user-role">
                  {facultyInfo ? facultyInfo.department || "Faculty" : ""}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0.5rem",
                  pointerEvents: "auto",
                  transition: "color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                title="Logout"
              >
                <svg
                  style={{ width: "20px", height: "20px" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Dropdown - OUTSIDE HEADER */}
      {showNotifications && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            width: "420px",
            maxWidth: "calc(100vw - 40px)",
            maxHeight: "600px",
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(71, 85, 105, 0.3)",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            zIndex: 1000002,
            overflow: "hidden",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid rgba(71, 85, 105, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "rgba(15, 23, 42, 0.95)",
              flexShrink: 0,
            }}
          >
            <svg
              style={{
                width: "20px",
                height: "20px",
                stroke: "#06b6d4",
                flexShrink: 0,
              }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span
              style={{
                color: "#06b6d4",
                fontWeight: 600,
                fontSize: "1rem",
                flex: 1,
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await markAllAsRead();
                }}
                style={{
                  background: "rgba(6, 182, 212, 0.1)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  color: "#06b6d4",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(6, 182, 212, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(6, 182, 212, 0.1)";
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              background: "rgba(15, 23, 42, 0.95)",
              maxHeight: "500px",
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "3rem 1rem",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                <svg
                  style={{
                    width: "48px",
                    height: "48px",
                    margin: "0 auto 1rem",
                    opacity: 0.5,
                    display: "block",
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p style={{ margin: 0 }}>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await markAsRead(notification.notification_id);
                    if (notification.link) {
                      setShowNotifications(false);
                      router.push(notification.link);
                    }
                  }}
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid rgba(71, 85, 105, 0.2)",
                    cursor: "pointer",
                    opacity: notification.read ? 0.6 : 1,
                    transition: "background 0.3s ease",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(6, 182, 212, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ flexShrink: 0, marginTop: "0.125rem" }}>
                      {notification.type === "alert" ? (
                        <svg
                          style={{ width: "18px", height: "18px", stroke: "#ef4444" }}
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      ) : notification.type === "success" ? (
                        <svg
                          style={{ width: "18px", height: "18px", stroke: "#22c55e" }}
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : notification.type === "warning" ? (
                        <svg
                          style={{ width: "18px", height: "18px", stroke: "#f59e0b" }}
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          style={{ width: "18px", height: "18px", stroke: "#3b82f6" }}
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#e2e8f0",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          marginBottom: "0.375rem",
                          wordWrap: "break-word",
                        }}
                      >
                        {notification.title}
                      </div>
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "0.8125rem",
                          lineHeight: 1.5,
                          wordWrap: "break-word",
                          whiteSpace: "normal",
                        }}
                      >
                        {notification.message}
                      </div>
                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: "0.75rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                    {!notification.read && (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          marginTop: "0.5rem",
                          background:
                            notification.type === "alert"
                              ? "#ef4444"
                              : notification.type === "success"
                              ? "#22c55e"
                              : notification.type === "warning"
                              ? "#f59e0b"
                              : "#3b82f6",
                        }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showNotifications && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000000,
            background: "transparent",
          }}
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  );
};

export default Header;

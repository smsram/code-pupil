"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TestCard from "../components/TestCard";
import LoadingOverlay from "../components/LoadingOverlay";
import AutoRefreshButton from "@/app/components/AutoRefreshButton";
import { useNotification } from "@/app/components/Notification";
import "./style.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function StudentDashboard() {
  const router = useRouter();
  const { success, error, warning } = useNotification();

  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState({
    upcoming: 0,
    live: 0,
    active: 0,
    completed: 0,
    avgScore: 0,
  });
  const [tests, setTests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading dashboard...");

  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async (studentId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/student/${studentId}?limit=20&t=${Date.now()}`,
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
  }, []);

  const fetchStudentData = useCallback(async () => {
    const studentId = localStorage.getItem("student_id");

    if (!studentId) {
      error("Please login to view dashboard", "Authentication Required");
      router.push("/auth/student");
      return;
    }

    if (isFirstLoadRef.current) {
      setIsLoading(true);
      setLoadingMessage("Loading dashboard...");
    } else {
      setIsRefreshing(true);
    }

    try {
      // Fetch student info
      const studentResponse = await fetch(
        `${API_BASE_URL}/auth/student/verify/${studentId}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      const studentData = await studentResponse.json();
      if (studentResponse.ok && studentData.success) {
        setStudent(studentData.data);
      }

      // Fetch student stats
      const statsResponse = await fetch(
        `${API_BASE_URL}/test/student/${studentId}/stats`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      const statsData = await statsResponse.json();
      if (statsResponse.ok && statsData.success) {
        setStats(statsData.data);
      }

      // Fetch student tests
      const testsResponse = await fetch(
        `${API_BASE_URL}/test/student/${studentId}/tests?t=${Date.now()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }
      );
      const testsData = await testsResponse.json();
      if (testsResponse.ok && testsData.success) {
        setTests(testsData.data);
      }

      // Fetch notifications from database
      await fetchNotifications(studentId);
    } catch (err) {
      console.error("Fetch student data error:", err);
      if (isFirstLoadRef.current) {
        error("Unable to connect to server", "Network Error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFirstLoadRef.current = false;
    }
  }, [error, router, fetchNotifications]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleNotificationToggle = () => {
    setShowNotifications(!showNotifications);
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId ? { ...n, read: 1 } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Mark notification read error:", err);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("student_id");
      router.push("/auth/student");
    }
  };

  // Get active test
  const activeTest = tests.find(
    (test) => test.studentStatus === "in-progress" && test.testStatus === "live"
  );

  // Sort tests
  const sortedTests = [...tests].sort((a, b) => {
    const statusOrder = {
      "in-progress": 0,
      live: 1,
      upcoming: 2,
      completed: 3,
      missed: 4,
    };

    if (a.studentStatus === "in-progress" && a.testStatus === "live") return -1;
    if (b.studentStatus === "in-progress" && b.testStatus === "live") return 1;

    const aOrder = statusOrder[a.testStatus] || 5;
    const bOrder = statusOrder[b.testStatus] || 5;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return new Date(a.start_time) - new Date(b.start_time);
  });

  const getActiveTestRemaining = (test) => {
    if (!test) return 0;
    const startTime = new Date(test.start_time);
    const endTime = new Date(startTime.getTime() + test.duration * 60000);
    return Math.max(0, Math.floor((endTime - currentTime) / (1000 * 60)));
  };

  const hasLiveTests = tests.some(
    (t) => t.testStatus === "live" || t.studentStatus === "in-progress"
  );

  // Format notification time
  const formatNotificationTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "alert":
        return (
          <svg
            className="w-4 h-4 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "success":
        return (
          <svg
            className="w-4 h-4 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className="w-4 h-4 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default: // 'info'
        return (
          <svg
            className="w-4 h-4 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  if (isLoading || !student) {
    return (
      <>
        <LoadingOverlay
          active={isLoading}
          message={loadingMessage}
          type="spinner"
          blur={true}
        />
        <div className="student-app-container">
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div
              className="loading-spinner"
              style={{ margin: "0 auto 1rem" }}
            ></div>
            <p style={{ color: "#94a3b8" }}>Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LoadingOverlay
        active={isLoading}
        message={loadingMessage}
        type="spinner"
        blur={true}
      />

      <div className="student-app-container" style={{ pointerEvents: "auto" }}>
        {/* Header */}
        <header className="student-header">
          <div className="student-header-content">
            <div className="student-logo-section">
              <div>
                <h1 className="student-logo-title">Code Pupil</h1>
                <span className="student-logo-subtitle">Student Portal</span>
              </div>
            </div>

            <div className="student-profile-section">
              {/* Auto Refresh Button */}
              <AutoRefreshButton
                userId={student.student_id}
                userType="student"
                pageName="dashboard"
                onRefresh={fetchStudentData}
                isRefreshing={isRefreshing}
                showOnlyWhenLive={hasLiveTests}
                autoRefreshInterval={30000}
              />

              {/* Notification Bell */}
              <div style={{ position: "relative" }}>
                <button
                  className="student-notification-bell"
                  onClick={handleNotificationToggle}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="student-notification-badge">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                <div
                  className={`student-notifications-dropdown ${
                    showNotifications ? "active" : ""
                  }`}
                >
                  <div className="student-notifications-header">
                    <svg
                      className="w-4 h-4 inline mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div
                      className="student-notification-item"
                      style={{ textAlign: "center", opacity: 0.6 }}
                    >
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.notification_id}
                        className="student-notification-item"
                        onClick={() =>
                          markNotificationRead(notification.notification_id)
                        }
                        style={{
                          opacity: notification.read ? 0.6 : 1,
                          pointerEvents: "auto",
                          cursor: "pointer",
                        }}
                      >
                        <div className="student-notification-content">
                          {getNotificationIcon(notification.type)}
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                marginBottom: "0.25rem",
                              }}
                            >
                              {notification.title}
                            </div>
                            <div style={{ fontSize: "0.875rem" }}>
                              {notification.message}
                            </div>
                          </div>
                        </div>
                        <div className="student-notification-time">
                          {formatNotificationTime(notification.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="student-profile-info">
                <div className="student-avatar">
                  {student.first_name[0]}
                  {student.last_name[0]}
                </div>
                <div className="student-profile-details">
                  <div className="student-profile-name">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="student-profile-pin">PIN: {student.pin}</div>
                </div>
              </div>

              <button
                className="student-logout-btn"
                onClick={handleLogout}
                style={{ pointerEvents: "auto", cursor: "pointer" }}
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="student-main-content">
          <div className="student-fade-in">
            {/* Active Test Alert */}
            {activeTest && (
              <div className="student-active-test-alert">
                <div className="student-alert-content">
                  <div className="student-alert-icon">
                    <svg
                      className="w-8 h-8 text-orange-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="student-alert-info">
                    <h3 className="student-alert-title">
                      Test In Progress: {activeTest.title}
                    </h3>
                    <p className="student-alert-subtitle">
                      You have a test currently in progress. Time remaining:{" "}
                      {getActiveTestRemaining(activeTest)} minutes
                    </p>
                    <div className="student-alert-stats">
                      <span>
                        Progress: {activeTest.progress}% • Time Spent:{" "}
                        {activeTest.duration_taken || 0} min
                      </span>
                    </div>
                  </div>
                  <div className="student-alert-actions">
                    <Link href={`/student/tests/${activeTest.test_id}`}>
                      <button
                        className="student-alert-btn primary"
                        style={{ pointerEvents: "auto", cursor: "pointer" }}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        Continue Test
                      </button>
                    </Link>
                    <div className="student-progress-bar">
                      <div
                        className="student-progress-fill"
                        style={{ width: `${activeTest.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <h1 className="student-dashboard-title">
              <svg
                className="w-8 h-8 inline mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Available Tests
            </h1>
            <p className="student-dashboard-subtitle">
              {activeTest
                ? "Continue your active test or view other available assessments."
                : "Join live tests or view your completed assessments and upcoming schedules."}
            </p>

            {/* Quick Stats */}
            <div className="student-stats-grid">
              {stats.active > 0 && (
                <div className="student-stat-card active">
                  <div
                    className="student-stat-value"
                    style={{ color: "var(--student-warning-color)" }}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    {stats.active}
                  </div>
                  <div className="student-stat-label">Active Test</div>
                </div>
              )}

              <div className="student-stat-card">
                <div
                  className="student-stat-value"
                  style={{ color: "var(--student-primary-blue)" }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {stats.upcoming}
                </div>
                <div className="student-stat-label">Upcoming Tests</div>
              </div>

              <div className="student-stat-card">
                <div
                  className="student-stat-value"
                  style={{ color: "var(--student-success-color)" }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  {stats.live}
                </div>
                <div className="student-stat-label">Live Tests</div>
              </div>

              <div className="student-stat-card">
                <div
                  className="student-stat-value"
                  style={{ color: "var(--student-primary-purple)" }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {stats.completed}
                </div>
                <div className="student-stat-label">Completed</div>
              </div>

              <div className="student-stat-card">
                <div
                  className="student-stat-value"
                  style={{ color: "var(--student-warning-color)" }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  {stats.avgScore}%
                </div>
                <div className="student-stat-label">Avg Score</div>
              </div>
            </div>

            {/* Tests Grid */}
            {sortedTests.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "#94a3b8",
                }}
              >
                <svg
                  style={{
                    width: "64px",
                    height: "64px",
                    margin: "0 auto 1rem",
                    opacity: 0.5,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    marginBottom: "0.5rem",
                    color: "#e2e8f0",
                  }}
                >
                  No Tests Available
                </h3>
                <p>
                  There are no tests scheduled for your batch at the moment.
                </p>
              </div>
            ) : (
              <div className="student-tests-grid">
                {sortedTests.map((test) => (
                  <TestCard
                    key={test.test_id}
                    test={test}
                    currentTime={currentTime}
                    onStatusUpdate={fetchStudentData}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Click Outside to Close Notifications */}
        {showNotifications && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
            }}
            onClick={() => setShowNotifications(false)}
          />
        )}
      </div>
    </>
  );
}

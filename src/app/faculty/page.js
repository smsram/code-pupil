"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import AutoRefreshButton from "@/app/components/AutoRefreshButton";
import { useNotification } from "@/app/components/Notification";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const FacultyDashboard = () => {
  const router = useRouter();
  const { success, error, warning } = useNotification();

  const [stats, setStats] = useState({
    activeTests: 0,
    liveTests: 0,
    upcomingTests: 0,
    completedTests: 0,
    totalStudents: 0,
    completionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [liveTests, setLiveTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [facultyInfo, setFacultyInfo] = useState(null);

  // Track first load to decide overlay without closing over facultyInfo
  const isFirstLoadRef = useRef(true);

  const fetchDashboardData = useCallback(async () => {
    const facultyId = localStorage.getItem("faculty_id");

    if (!facultyId) {
      error("Please login to view dashboard", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    // Only show loading overlay on initial load
    if (isFirstLoadRef.current) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Fetch faculty info
      const facultyResponse = await fetch(
        `${API_BASE_URL}/auth/faculty/verify/${facultyId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const facultyData = await facultyResponse.json();

      if (facultyResponse.ok && facultyData.success) {
        setFacultyInfo(facultyData.data);
      }

      // Fetch dashboard stats
      const statsResponse = await fetch(
        `${API_BASE_URL}/test/faculty/${facultyId}/dashboard?t=${Date.now()}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      const statsData = await statsResponse.json();

      if (statsResponse.ok && statsData.success) {
        setStats(statsData.data.stats);
        setLiveTests(statsData.data.liveTests);
        setRecentActivity(statsData.data.recentActivity);
      }
    } catch (err) {
      console.error("Fetch dashboard data error:", err);
      if (isFirstLoadRef.current) {
        error("Unable to connect to server", "Network Error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFirstLoadRef.current = false;
    }
  }, [error, router, API_BASE_URL]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const hasLiveTests = liveTests.length > 0;

  if (isLoading || !facultyInfo) {
    return (
      <LoadingOverlay
        active={isLoading}
        message="Loading dashboard..."
        type="spinner"
        blur={true}
      />
    );
  }

  return (
    <>
      <LoadingOverlay
        active={isLoading}
        message="Loading dashboard..."
        type="spinner"
        blur={true}
      />

      <div className="fade-in" style={{ pointerEvents: "auto" }}>
        {/* Header with Auto Refresh */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h1
              style={{
                color: "#06b6d4",
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              Dashboard Overview
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "1rem" }}>
              Welcome back, {facultyInfo.first_name} {facultyInfo.last_name}
            </p>
          </div>

          <AutoRefreshButton
            userId={facultyInfo.faculty_id}
            userType="faculty"
            pageName="dashboard"
            onRefresh={fetchDashboardData}
            isRefreshing={isRefreshing}
            showOnlyWhenLive={hasLiveTests}
            autoRefreshInterval={30000} // 30 seconds
          />
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#ef4444" }}>
              <span>{stats.liveTests}</span>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
            </div>
            <div className="stat-label">Live Tests</div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: "#22c55e" }}>
              <span>{stats.activeTests}</span>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <div className="stat-label">Active Students</div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: "#3b82f6" }}>
              <span>{stats.upcomingTests}</span>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="stat-label">Upcoming Tests</div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: "#8b5cf6" }}>
              <span>{stats.completionRate}%</span>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="stat-label">Completion Rate</div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: "#f59e0b" }}>
              <span>{stats.totalStudents}</span>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <div className="stat-label">Total Students</div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: "#ec4899" }}>
              <span>{stats.completedTests}</span>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="stat-label">Completed Tests</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid-2">
          {/* Live Tests */}
          <div className="dashboard-card">
            <h3
              style={{
                color: "#06b6d4",
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
              Live Tests ({liveTests.length})
            </h3>

            {liveTests.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "#94a3b8",
                }}
              >
                <svg
                  style={{
                    width: "48px",
                    height: "48px",
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>No live tests at the moment</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {liveTests.map((test) => (
                  <Link
                    key={test.test_id}
                    href={`/faculty/tests/${test.test_id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        padding: "1rem",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <h4 style={{ fontWeight: 600, color: "#fca5a5" }}>
                          {test.title}
                        </h4>
                        <span className="status-badge live">🔴 LIVE</span>
                      </div>
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "0.875rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {test.language} • {test.branch} - {test.section} •{" "}
                        {test.activeStudents} active
                      </div>
                      <div className="progress-bar" style={{ marginTop: "0.75rem" }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${test.completionPercentage}%`,
                            background: "linear-gradient(90deg, #ef4444, #dc2626)",
                          }}
                        ></div>
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          marginTop: "0.25rem",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {test.completedStudents}/{test.totalStudents} completed
                        </span>
                        <span>
                          {Math.floor(
                            (new Date(test.start_time).getTime() +
                              test.duration * 60000 -
                              Date.now()) /
                              60000
                          )}{" "}
                          min remaining
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card">
            <h3
              style={{
                color: "#06b6d4",
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              Recent Activity
            </h3>

            {recentActivity.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "#94a3b8",
                }}
              >
                <svg
                  style={{
                    width: "48px",
                    height: "48px",
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
                <p>No recent activity</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      background: `rgba(${
                        activity.type === "alert"
                          ? "239, 68, 68"
                          : activity.type === "success"
                          ? "34, 197, 94"
                          : activity.type === "warning"
                          ? "251, 191, 36"
                          : "59, 130, 246"
                      }, 0.1)`,
                      border: `1px solid rgba(${
                        activity.type === "alert"
                          ? "239, 68, 68"
                          : activity.type === "success"
                          ? "34, 197, 94"
                          : activity.type === "warning"
                          ? "251, 191, 36"
                          : "59, 130, 246"
                      }, 0.3)`,
                      padding: "1rem",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        color:
                          activity.type === "alert"
                            ? "#fca5a5"
                            : activity.type === "success"
                            ? "#86efac"
                            : activity.type === "warning"
                            ? "#fcd34d"
                            : "#93c5fd",
                        fontWeight: 500,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {activity.type === "alert"
                        ? "🚨"
                        : activity.type === "success"
                        ? "✅"
                        : activity.type === "warning"
                        ? "⚠️"
                        : "ℹ️"}{" "}
                      {activity.title}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                      {activity.description}
                    </div>
                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: "0.75rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <h3
            style={{
              color: "#06b6d4",
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            Quick Actions
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <Link href="/faculty/create" style={{ textDecoration: "none" }}>
              <div
                className="action-card"
                style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <svg
                  style={{ width: "32px", height: "32px", margin: "0 auto 0.5rem" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <div style={{ color: "#86efac", fontWeight: 600 }}>Create Test</div>
              </div>
            </Link>

            <Link href="/faculty/tests" style={{ textDecoration: "none" }}>
              <div
                className="action-card"
                style={{
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <svg
                  style={{ width: "32px", height: "32px", margin: "0 auto 0.5rem" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3b82f6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div style={{ color: "#93c5fd", fontWeight: 600 }}>View All Tests</div>
              </div>
            </Link>

            <Link href="/faculty/students" style={{ textDecoration: "none" }}>
              <div
                className="action-card"
                style={{
                  background: "rgba(139, 92, 246, 0.1)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <svg
                  style={{ width: "32px", height: "32px", margin: "0 auto 0.5rem" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8b5cf6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                <div style={{ color: "#c4b5fd", fontWeight: 600 }}>
                  Manage Students
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default FacultyDashboard;

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/app/components/Notification";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import AutoRefreshButton from "@/app/components/AutoRefreshButton";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Calculate test status based on current time
const getTestStatus = (startTime, duration) => {
  try {
    const now = new Date();
    const start = new Date(startTime);

    if (isNaN(start.getTime())) return "upcoming";

    const end = new Date(start.getTime() + duration * 60000);

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "completed";
  } catch (error) {
    console.error("Status calculation error:", error);
    return "upcoming";
  }
};

// Format datetime to readable format
const formatDateTime = (datetimeStr) => {
  if (!datetimeStr) return "N/A";

  try {
    const dateTime = new Date(datetimeStr);
    if (isNaN(dateTime.getTime())) return "N/A";

    const day = dateTime.getDate().toString().padStart(2, "0");
    const month = (dateTime.getMonth() + 1).toString().padStart(2, "0");
    const year = dateTime.getFullYear();

    let hours = dateTime.getHours();
    const minutes = dateTime.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = hours.toString().padStart(2, "0");

    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "N/A";
  }
};

// Format batch info
const formatBatchInfo = (branch, section, startYear) => {
  const start = parseInt(startYear);
  const end = start + 4;
  return `${branch} - ${section} Batch ${start}-${end}`;
};

const TestDetail = () => {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId;
  const { success, error, warning } = useNotification();

  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading test details..."
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time statistics
  const [statistics, setStatistics] = useState({
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    total: 0,
  });

  useEffect(() => {
    if (testId) {
      fetchTestDetails();
    }
  }, [testId]);

  const fetchTestDetails = async () => {
    const facultyId = localStorage.getItem("faculty_id");

    if (!facultyId) {
      error("Please login to view test details", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    if (!test) {
      setIsLoading(true);
      setLoadingMessage("Loading test details...");
    }

    setIsRefreshing(true);

    try {
      // Fetch test details
      const response = await fetch(`${API_BASE_URL}/test/${testId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTest(data.data);

        // Fetch statistics separately
        const statsResponse = await fetch(
          `${API_BASE_URL}/test/${testId}/statistics`
        );
        const statsData = await statsResponse.json();

        if (statsResponse.ok && statsData.success) {
          // Map the statistics to match the component's expected format
          setStatistics({
            total: statsData.data.totalEligible,
            completed: statsData.data.submitted, // Students who submitted
            inProgress: statsData.data.attended - statsData.data.submitted, // Attended but not submitted
            notStarted: statsData.data.notAttended,
          });
        } else {
          // Fallback to default statistics if API fails
          setStatistics({
            total: data.data.totalStudents || 0,
            completed: 0,
            inProgress: 0,
            notStarted: data.data.totalStudents || 0,
          });
        }
      } else {
        error(data.message || "Failed to fetch test details", "Error");
        router.push("/faculty/tests");
      }
    } catch (err) {
      console.error("Fetch test error:", err);

      if (!test) {
        error("Unable to connect to server", "Network Error");
        router.push("/faculty/tests");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading || !test) {
    return (
      <>
        <LoadingOverlay
          active={isLoading}
          message={loadingMessage}
          type="spinner"
          blur={true}
        />
      </>
    );
  }

  const testStatus = getTestStatus(test.test.start_time, test.test.duration);
  const endTime = new Date(
    new Date(test.test.start_time).getTime() + test.test.duration * 60000
  );

  const tabItems = [
    { key: "overview", label: "Overview", path: `/faculty/tests/${testId}` },
    {
      key: "monitor",
      label: "Live Monitoring",
      path: `/faculty/tests/${testId}/monitor`,
    },
    {
      key: "analytics",
      label: "Analytics",
      path: `/faculty/tests/${testId}/analytics`,
    },
    {
      key: "reports",
      label: "Reports & Export",
      path: `/faculty/tests/${testId}/reports`,
    },
    {
      key: "messages",
      label: "Messages",
      path: `/faculty/tests/${testId}/messages`,
    },
  ];

  const handleTabNavigation = (path) => {
    router.push(path);
  };

  return (
    <>
      <LoadingOverlay
        active={isLoading}
        message={loadingMessage}
        type="spinner"
        blur={true}
      />

      <div className="fade-in" style={{ pointerEvents: "auto" }}>
        <div className="dashboard-card" style={{ pointerEvents: "auto" }}>
          {/* Back Button */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              href="/faculty/tests"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#06b6d4",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              <svg
                style={{ width: "16px", height: "16px" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to All Tests
            </Link>
          </div>

          {/* Test Header */}
          <div style={{ marginBottom: "2rem" }}>
            <h1
              style={{
                color: "#06b6d4",
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              {test.test.title}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <span className={`status-badge ${testStatus}`}>
                {testStatus === "live"
                  ? "🔴 LIVE"
                  : testStatus === "upcoming"
                  ? "📅 UPCOMING"
                  : "✅ COMPLETED"}
              </span>
              <span
                className={`status-badge ${
                  test.test.status === "published"
                    ? "live"
                    : test.test.status === "draft"
                    ? "upcoming"
                    : "completed"
                }`}
              >
                {test.test.status === "published"
                  ? "📢 Published"
                  : test.test.status === "draft"
                  ? "📝 Draft"
                  : "🔒 Unpublished"}
              </span>
              <span style={{ color: "#94a3b8" }}>
                {test.test.language} •{" "}
                {formatBatchInfo(
                  test.test.branch,
                  test.test.section,
                  test.test.start_year
                )}
              </span>
              <span style={{ color: "#94a3b8" }}>
                {test.totalStudents} students
              </span>
              <span
                style={{
                  color: "#06b6d4",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                ID: {test.test.test_id}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tabs-nav">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                className={`tab-button ${
                  activeTab === tab.key ? "active" : ""
                }`}
                onClick={() => handleTabNavigation(tab.path)}
                style={{ pointerEvents: "auto", cursor: "pointer" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Overview */}
          <div className="grid-2" style={{ marginTop: "2rem" }}>
            <div>
              <h3
                style={{
                  color: "#06b6d4",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Test Information
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "#94a3b8" }}>Duration:</span>
                  <span style={{ fontWeight: 600 }}>
                    {test.test.duration} minutes
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "#94a3b8" }}>Start Time:</span>
                  <span style={{ fontWeight: 600, color: "#22c55e" }}>
                    {formatDateTime(test.test.start_time)}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "#94a3b8" }}>End Time:</span>
                  <span style={{ fontWeight: 600, color: "#3b82f6" }}>
                    {formatDateTime(endTime)}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "#94a3b8" }}>Max Attempts:</span>
                  <span style={{ fontWeight: 600 }}>
                    {test.test.max_attempts}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "#94a3b8" }}>
                    Similarity Threshold:
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {test.test.similarity_threshold}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h3
                  style={{
                    color: "#06b6d4",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                  }}
                >
                  Live Statistics
                </h3>

                {/* Auto Refresh Button */}
                <AutoRefreshButton
                  userId={localStorage.getItem("faculty_id")}
                  userType="faculty"
                  pageName="test-detail-stats"
                  onRefresh={fetchTestDetails}
                  isRefreshing={isRefreshing}
                  testStatus={testStatus}
                />
              </div>

              <div
                className="stats-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "#06b6d4" }}>
                    {statistics.total}
                  </div>
                  <div className="stat-label">Total Students</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "#22c55e" }}>
                    {statistics.completed}
                  </div>
                  <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "#3b82f6" }}>
                    {statistics.inProgress}
                  </div>
                  <div className="stat-label">In Progress</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "#f59e0b" }}>
                    {statistics.notStarted}
                  </div>
                  <div className="stat-label">Not Started</div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Settings */}
          <div style={{ marginTop: "2rem" }}>
            <h3
              style={{
                color: "#06b6d4",
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Test Settings
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    color: test.test.fullscreen_mode ? "#22c55e" : "#ef4444",
                  }}
                >
                  {test.test.fullscreen_mode ? "✓" : "✗"}
                </span>
                <span style={{ color: "#94a3b8" }}>Fullscreen Mode</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    color: test.test.auto_submit ? "#22c55e" : "#ef4444",
                  }}
                >
                  {test.test.auto_submit ? "✓" : "✗"}
                </span>
                <span style={{ color: "#94a3b8" }}>Auto Submit</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    color: test.test.show_results ? "#22c55e" : "#ef4444",
                  }}
                >
                  {test.test.show_results ? "✓" : "✗"}
                </span>
                <span style={{ color: "#94a3b8" }}>Show Results</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    color: test.test.wait_until_end ? "#22c55e" : "#ef4444",
                  }}
                >
                  {test.test.wait_until_end ? "✓" : "✗"}
                </span>
                <span style={{ color: "#94a3b8" }}>Wait Until End</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    color: test.test.allow_copy ? "#22c55e" : "#ef4444",
                  }}
                >
                  {test.test.allow_copy ? "✓" : "✗"}
                </span>
                <span style={{ color: "#94a3b8" }}>Allow Copy</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    color: test.test.allow_paste ? "#22c55e" : "#ef4444",
                  }}
                >
                  {test.test.allow_paste ? "✓" : "✗"}
                </span>
                <span style={{ color: "#94a3b8" }}>Allow Paste</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {test.test.description && (
            <div style={{ marginTop: "2rem" }}>
              <h4
                style={{
                  color: "#06b6d4",
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                }}
              >
                Description
              </h4>
              <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>
                {test.test.description}
              </p>
            </div>
          )}

          {/* Scheduled Messages */}
          {test.scheduledMessages && test.scheduledMessages.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <h4
                style={{
                  color: "#06b6d4",
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                }}
              >
                Scheduled Messages ({test.scheduledMessages.length})
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {test.scheduledMessages.map((msg, index) => (
                  <div
                    key={msg.message_id || index}
                    style={{
                      padding: "0.75rem",
                      background: "rgba(30, 41, 59, 0.3)",
                      borderRadius: "6px",
                      border: "1px solid rgba(71, 85, 105, 0.3)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#e2e8f0" }}>{msg.message}</span>
                    <span
                      style={{
                        color: "#06b6d4",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                      }}
                    >
                      {msg.time_minutes} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "2rem",
              paddingTop: "2rem",
              borderTop: "1px solid rgba(71, 85, 105, 0.3)",
              flexWrap: "wrap",
            }}
          >
            <button
              className="action-btn primary"
              onClick={() => router.push(`/faculty/tests/${testId}/monitor`)}
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              Monitor Students
            </button>

            <button
              className="action-btn secondary"
              onClick={() => router.push(`/faculty/tests/${testId}/analytics`)}
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
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              View Analytics
            </button>

            {testStatus === "live" && (
              <button
                className="action-btn success"
                onClick={() => router.push(`/faculty/tests/${testId}/messages`)}
                style={{
                  pointerEvents: "auto",
                  cursor: "pointer",
                  background: "#22c55e",
                  color: "white",
                }}
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
                Send Message
              </button>
            )}

            {testStatus === "upcoming" && (
              <Link
                href={`/faculty/tests/edit/${testId}`}
                className="action-btn"
                style={{
                  pointerEvents: "auto",
                  textDecoration: "none",
                  background: "#8b5cf6",
                  color: "white",
                }}
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                Edit Test
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TestDetail;

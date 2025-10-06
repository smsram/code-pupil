"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/app/components/Notification";
import { useConfirm } from "@/app/components/ConfirmDialog";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import AutoRefreshButton from "@/app/components/AutoRefreshButton";
import FacultyCodeExecutor from "@/app/components/FacultyCodeExecutor";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Format datetime
const formatDateTime = (datetimeStr) => {
  if (!datetimeStr) return "N/A";
  try {
    const dateTime = new Date(datetimeStr);
    if (isNaN(dateTime.getTime())) return "N/A";
    return dateTime.toLocaleString();
  } catch (error) {
    return "N/A";
  }
};

// Calculate duration from start and end time
const calculateDuration = (startTime, endTime) => {
  if (!startTime) return 0;

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();

  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);

  return diffMins;
};

// Format duration from minutes to human readable
const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return "0 min";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
};

// Calculate test status
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
    return "upcoming";
  }
};

// Live Timer Component
const LiveTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      return { minutes: diffMins, seconds: diffSecs };
    };

    // Initial calculation
    const initial = calculateElapsed();
    setElapsed(initial);

    // Update every second
    const interval = setInterval(() => {
      const current = calculateElapsed();
      setElapsed(current);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed.minutes / 60);
  const mins = elapsed.minutes % 60;
  const secs = elapsed.seconds;

  return (
    <span
      style={{
        fontWeight: 600,
        color: "#f59e0b",
        fontFamily: "monospace",
        fontSize: "1rem",
      }}
    >
      {hours > 0 && `${hours}h `}
      {mins}m {secs}s
    </span>
  );
};

const StudentDetail = () => {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId;
  const studentId = params.studentId;
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();

  const [studentData, setStudentData] = useState(null);
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading student details..."
  );
  const [editingScore, setEditingScore] = useState(false);
  const [newScore, setNewScore] = useState(0);

  const initialLoadRef = useRef(true);

  const fetchStudentDetails = useCallback(async () => {
    const facultyId =
      typeof window !== "undefined" ? localStorage.getItem("faculty_id") : null;
    if (!facultyId) {
      error("Please login to view student details", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    if (initialLoadRef.current) {
      setIsLoading(true);
      setLoadingMessage("Loading student details...");
    }
    setIsRefreshing(true);

    try {
      // Always fetch the student record
      const studentRes = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}`
      );
      const studentJson = await studentRes.json();
      if (!studentRes.ok || !studentJson.success) {
        throw new Error("Failed to load student data");
      }
      setStudentData(studentJson.data);

      // Always fetch the test record to avoid branching on state
      const testRes = await fetch(`${API_BASE_URL}/test/${testId}`);
      const testJson = await testRes.json();
      if (testRes.ok && testJson.success) {
        setTest(testJson.data.test);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (initialLoadRef.current) {
        error("Failed to load student details", "Error");
        router.push(`/faculty/tests/${testId}/monitor`);
      }
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
      initialLoadRef.current = false;
    }
  }, [testId, studentId, router, error]);

  useEffect(() => {
    if (studentId && testId) {
      fetchStudentDetails();
    }
  }, [studentId, testId, fetchStudentDetails]);

  const handleLockTest = async () => {
    if (studentData?.student && studentData.student.status === "in-progress") {
      const confirmed = await confirm({
        title: "Lock Student Test",
        message: `Lock test for ${studentData.student.first_name} ${studentData.student.last_name}?\n\nThis will prevent them from continuing and submit their current progress.`,
        confirmText: "Lock",
        cancelText: "Cancel",
        type: "danger",
      });

      if (!confirmed) return;

      setLoadingMessage("Locking student test...");
      setIsLoading(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/test/${testId}/student/${studentId}/lock`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              facultyId: parseInt(localStorage.getItem("faculty_id")),
            }),
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          success(
            `Test locked for ${studentData.student.first_name} ${studentData.student.last_name}`,
            "Locked"
          );
          fetchStudentDetails();
        } else {
          error(data.message || "Failed to lock student test", "Error");
        }
      } catch (err) {
        error("Unable to connect to server", "Network Error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUnlockTest = async () => {
    if (studentData?.student && studentData.student.status === "locked") {
      const confirmed = await confirm({
        title: "Unlock Student Test",
        message: `Unlock test for ${studentData.student.first_name} ${studentData.student.last_name}?\n\nThis will allow them to continue the test.`,
        confirmText: "Unlock",
        cancelText: "Cancel",
        type: "warning",
      });

      if (!confirmed) return;

      setLoadingMessage("Unlocking student test...");
      setIsLoading(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/test/${testId}/student/${studentId}/unlock`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              facultyId: parseInt(localStorage.getItem("faculty_id")),
            }),
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          success(
            `Test unlocked for ${studentData.student.first_name} ${studentData.student.last_name}`,
            "Unlocked"
          );
          fetchStudentDetails();
        } else {
          error(data.message || "Failed to unlock student test", "Error");
        }
      } catch (err) {
        error("Unable to connect to server", "Network Error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRestartTest = async () => {
    const confirmed = await confirm({
      title: "Restart Student Test",
      message: `Restart test for ${studentData.student.first_name} ${studentData.student.last_name}?\n\nThis will clear all progress, code, and submissions. This action cannot be undone.`,
      confirmText: "Restart",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    setLoadingMessage("Restarting student test...");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/restart`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facultyId: parseInt(localStorage.getItem("faculty_id")),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        success(
          `Test restarted for ${studentData.student.first_name} ${studentData.student.last_name}`,
          "Restarted"
        );
        fetchStudentDetails();
      } else {
        error(data.message || "Failed to restart student test", "Error");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScore = async () => {
    if (newScore < 0 || newScore > 100) {
      warning("Score must be between 0 and 100", "Invalid Score");
      return;
    }

    setLoadingMessage("Updating score...");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: newScore,
            facultyId: parseInt(localStorage.getItem("faculty_id")),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        success("Score updated successfully", "Updated");
        setEditingScore(false);
        fetchStudentDetails();
      } else {
        error(data.message || "Failed to update score", "Error");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !studentData || !test) {
    return (
      <LoadingOverlay
        active={isLoading}
        message={loadingMessage}
        type="spinner"
        blur={true}
      />
    );
  }

  const student = studentData.student;
  const snapshots = studentData.snapshots || [];
  const submissions = studentData.submissions || [];
  const latestSnapshot = snapshots[0];
  const latestSubmission = submissions[0];
  const testStatus = getTestStatus(test.start_time, test.duration);

  const activityClass =
    student.last_active === "now"
      ? "active"
      : student.last_active?.includes("sec") ||
        student.last_active?.includes("min")
      ? "idle"
      : "offline";

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
          {/* Back Navigation */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              href={`/faculty/tests/${testId}/monitor`}
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
              Back to Monitoring
            </Link>
          </div>

          {/* Student Header */}
          <div style={{ marginBottom: "2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              <h1
                style={{ color: "#06b6d4", fontSize: "2rem", fontWeight: 700 }}
              >
                {student.first_name} {student.last_name}
              </h1>

              {student.status === "in-progress" && testStatus === "live" && (
                <AutoRefreshButton
                  userId={localStorage.getItem("faculty_id")}
                  userType="faculty"
                  pageName={`student-${studentId}`}
                  onRefresh={fetchStudentDetails}
                  isRefreshing={isRefreshing}
                  testStatus={testStatus}
                />
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "#94a3b8" }}>Test: {test.title}</span>
              <span style={{ color: "#94a3b8" }}>PIN: {student.pin}</span>
              <span className={`status-badge ${student.status}`}>
                {student.status === "completed"
                  ? "✅ Completed"
                  : student.status === "in-progress"
                  ? "⏳ In Progress"
                  : student.status === "locked"
                  ? "🔒 Locked"
                  : "📝 Not Started"}
              </span>
              {student.similarity > 0 && (
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "12px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    background:
                      student.similarity > 80
                        ? "rgba(239, 68, 68, 0.2)"
                        : student.similarity > 60
                        ? "rgba(251, 191, 36, 0.2)"
                        : "rgba(34, 197, 94, 0.2)",
                    color:
                      student.similarity > 80
                        ? "#fca5a5"
                        : student.similarity > 60
                        ? "#fbbf24"
                        : "#86efac",
                    border: `1px solid ${
                      student.similarity > 80
                        ? "rgba(239, 68, 68, 0.3)"
                        : student.similarity > 60
                        ? "rgba(251, 191, 36, 0.3)"
                        : "rgba(34, 197, 94, 0.3)"
                    }`,
                  }}
                >
                  {student.similarity > 80
                    ? "⚠️"
                    : student.similarity > 60
                    ? "⚡"
                    : "✓"}{" "}
                  Similarity: {student.similarity}%
                </span>
              )}
            </div>
          </div>

          {/* Student Overview - UPDATED DURATION SECTION */}
          <div className="grid-2" style={{ marginTop: "2rem" }}>
            <div className="dashboard-card">
              <h3
                style={{
                  color: "#06b6d4",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Student Information
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  className="student-avatar"
                  style={{ width: "60px", height: "60px", fontSize: "1.5rem" }}
                >
                  {student.first_name[0]}
                  {student.last_name[0]}
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {student.first_name} {student.last_name}
                  </h4>
                  <p style={{ color: "#94a3b8", margin: 0 }}>
                    PIN: {student.pin}
                  </p>
                  <p
                    style={{
                      color: "#94a3b8",
                      margin: 0,
                      fontSize: "0.875rem",
                    }}
                  >
                    <span
                      className={`activity-indicator ${activityClass}`}
                    ></span>
                    {student.email}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {student.start_time ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>Start Time:</span>
                      <span style={{ fontWeight: 600, color: "#22c55e" }}>
                        {formatDateTime(student.start_time)}
                      </span>
                    </div>

                    {/* Duration - Show live timer if in progress, otherwise show completed duration */}
                    {student.end_time ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ color: "#94a3b8" }}>End Time:</span>
                          <span style={{ fontWeight: 600, color: "#3b82f6" }}>
                            {formatDateTime(student.end_time)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ color: "#94a3b8" }}>Duration:</span>
                          <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                            {formatDuration(
                              calculateDuration(
                                student.start_time,
                                student.end_time
                              )
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "#94a3b8" }}>
                          {student.status === "in-progress"
                            ? "Elapsed Time:"
                            : "Duration:"}
                        </span>
                        {student.status === "in-progress" ? (
                          <LiveTimer startTime={student.start_time} />
                        ) : (
                          <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                            {formatDuration(
                              calculateDuration(
                                student.start_time,
                                student.end_time
                              )
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>Attempts:</span>
                      <span style={{ fontWeight: 600 }}>
                        {student.attempt || 0}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>Code Snapshots:</span>
                      <span style={{ fontWeight: 600 }}>
                        {snapshots.length}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>Submissions:</span>
                      <span style={{ fontWeight: 600 }}>
                        {submissions.length}
                      </span>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      color: "#94a3b8",
                      textAlign: "center",
                      padding: "1rem",
                    }}
                  >
                    Student has not started the test yet
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <h3
                style={{
                  color: "#06b6d4",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Performance Metrics
              </h3>
              <div
                className="stats-grid"
                style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
              >
                <div className="stat-card">
                  <div
                    className="stat-value"
                    style={{
                      color:
                        student.progress > 75
                          ? "#22c55e"
                          : student.progress > 50
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {student.progress}%
                  </div>
                  <div className="stat-label">Progress</div>
                </div>
                <div className="stat-card">
                  <div
                    className="stat-value"
                    style={{
                      color:
                        student.wpm > 45
                          ? "#22c55e"
                          : student.wpm > 30
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {student.wpm}
                  </div>
                  <div className="stat-label">WPM</div>
                </div>
                <div className="stat-card">
                  <div
                    className="stat-value"
                    style={{
                      color:
                        student.errors < 3
                          ? "#22c55e"
                          : student.errors < 6
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {student.errors}
                  </div>
                  <div className="stat-label">Errors</div>
                </div>
                <div className="stat-card">
                  <div
                    className="stat-value"
                    style={{
                      color:
                        student.similarity < 40
                          ? "#22c55e"
                          : student.similarity < 80
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {student.similarity}%
                  </div>
                  <div className="stat-label">Similarity</div>
                </div>
              </div>

              {/* Score Editor */}
              {latestSubmission && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid rgba(71, 85, 105, 0.3)",
                  }}
                >
                  {editingScore ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                        Score:
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newScore}
                        onChange={(e) => setNewScore(parseInt(e.target.value))}
                        style={{
                          width: "80px",
                          padding: "0.5rem",
                          background: "rgba(15, 23, 42, 0.6)",
                          border: "1px solid rgba(71, 85, 105, 0.3)",
                          borderRadius: "6px",
                          color: "#e2e8f0",
                          fontSize: "0.875rem",
                        }}
                      />
                      <span style={{ color: "#94a3b8" }}>%</span>
                      <button
                        onClick={handleUpdateScore}
                        style={{
                          padding: "0.5rem 1rem",
                          background: "#22c55e",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingScore(false);
                          setNewScore(latestSubmission.score || 0);
                        }}
                        style={{
                          padding: "0.5rem 1rem",
                          background: "rgba(71, 85, 105, 0.3)",
                          color: "#94a3b8",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>Current Score:</span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color:
                              (latestSubmission.score || 0) >= 70
                                ? "#22c55e"
                                : (latestSubmission.score || 0) >= 50
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        >
                          {latestSubmission.score || 0}%
                        </span>
                        <button
                          onClick={() => {
                            setEditingScore(true);
                            setNewScore(latestSubmission.score || 0);
                          }}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "rgba(6, 182, 212, 0.2)",
                            color: "#06b6d4",
                            border: "1px solid rgba(6, 182, 212, 0.3)",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Code Executor */}
          {latestSnapshot && (
            <div className="dashboard-card" style={{ marginTop: "2rem" }}>
              <h3
                style={{
                  color: "#06b6d4",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Code Execution & Testing
              </h3>
              <FacultyCodeExecutor
                code={latestSnapshot.code}
                language={test.language.toLowerCase()}
                studentOutput={latestSubmission?.output}
                readOnly={true}
              />
            </div>
          )}

          {/* Submissions History */}
          {submissions.length > 0 && (
            <div className="dashboard-card" style={{ marginTop: "2rem" }}>
              <h3
                style={{
                  color: "#06b6d4",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Submission History ({submissions.length})
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {submissions.map((sub, index) => (
                  <div
                    key={sub.submission_id}
                    style={{
                      padding: "1.5rem",
                      background: "rgba(30, 41, 59, 0.4)",
                      borderRadius: "8px",
                      border: "1px solid rgba(71, 85, 105, 0.3)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "1rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#e2e8f0",
                          fontSize: "1.1rem",
                        }}
                      >
                        Submission #{submissions.length - index}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                        {formatDateTime(sub.submitted_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "1rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: "#94a3b8",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Score
                        </span>
                        <strong
                          style={{
                            fontSize: "1.5rem",
                            color:
                              (sub.score || 0) >= 70
                                ? "#22c55e"
                                : (sub.score || 0) >= 50
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        >
                          {sub.score || 0}%
                        </strong>
                      </div>
                      <div>
                        <span
                          style={{
                            color: "#94a3b8",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Similarity
                        </span>
                        <strong
                          style={{
                            fontSize: "1.5rem",
                            color:
                              (sub.similarity || 0) > 80
                                ? "#ef4444"
                                : (sub.similarity || 0) > 60
                                ? "#f59e0b"
                                : "#22c55e",
                          }}
                        >
                          {sub.similarity || 0}%
                        </strong>
                      </div>
                      <div>
                        <span
                          style={{
                            color: "#94a3b8",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Execution
                        </span>
                        <strong
                          style={{
                            fontSize: "1rem",
                            color: sub.executed === 0 ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {sub.executed === 0 ? "✓ Success" : "✗ Failed"}
                        </strong>
                      </div>
                    </div>
                    {sub.output && (
                      <div
                        style={{
                          marginTop: "1rem",
                          paddingTop: "1rem",
                          borderTop: "1px solid rgba(71, 85, 105, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "0.875rem",
                            display: "block",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Program Output:
                        </span>
                        <pre
                          style={{
                            padding: "0.75rem",
                            background: "rgba(15, 23, 42, 0.6)",
                            borderRadius: "6px",
                            color: "#e2e8f0",
                            fontSize: "0.875rem",
                            overflow: "auto",
                            maxHeight: "200px",
                          }}
                        >
                          {sub.output}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Control Actions */}
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
            {student.status === "in-progress" && (
              <button
                className="action-btn danger"
                onClick={handleLockTest}
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
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                Lock Test
              </button>
            )}

            {student.status === "locked" && (
              <button
                className="action-btn warning"
                onClick={handleUnlockTest}
                style={{
                  pointerEvents: "auto",
                  cursor: "pointer",
                  background: "#f59e0b",
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
                    d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                Unlock Test
              </button>
            )}

            <button
              className="action-btn"
              onClick={handleRestartTest}
              style={{
                pointerEvents: "auto",
                cursor: "pointer",
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
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
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Restart Test
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentDetail;

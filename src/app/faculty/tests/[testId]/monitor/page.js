"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/app/components/Notification";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import { useConfirm } from "@/app/components/ConfirmDialog";
import AutoRefreshButton from "@/app/components/AutoRefreshButton";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Get similarity class based on percentage
const getSimilarityClass = (percentage) => {
  if (percentage > 80) return "critical";
  if (percentage > 60) return "high";
  if (percentage > 40) return "medium";
  return "low";
};

// Calculate elapsed time
const getElapsedTime = (startTime) => {
  if (!startTime) return "0";
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins;
};

// Format batch info
const formatBatchInfo = (branch, section, startYear) => {
  const start = parseInt(startYear);
  const end = start + 4;
  return `${branch} - ${section} Batch ${start}-${end}`;
};

const TestMonitoring = () => {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId;
  const { success, error, warning } = useNotification();
  const { confirm } = useConfirm();

  const [test, setTest] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading monitoring data..."
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // NEW: track first load to avoid depending on `test` inside the callback
  const isFirstLoadRef = useRef(true);

  const fetchTestData = useCallback(async () => {
    const facultyId = localStorage.getItem("faculty_id");

    if (!facultyId) {
      error("Please login to view monitoring", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    // Only show full overlay on first load; use refresh state afterwards
    if (isFirstLoadRef.current) {
      setLoadingMessage("Loading monitoring data...");
      setIsLoading(true);
    }
    setIsRefreshing(true);

    try {
      const testResponse = await fetch(`${API_BASE_URL}/test/${testId}`);
      const testData = await testResponse.json();

      if (testResponse.ok && testData.success) {
        setTest(testData.data);

        const studentsResponse = await fetch(
          `${API_BASE_URL}/test/${testId}/students`
        );
        const studentsData = await studentsResponse.json();

        if (studentsResponse.ok && studentsData.success) {
          setStudents(studentsData.data);
        } else {
          setStudents([]);
        }
      } else {
        if (isFirstLoadRef.current) {
          error(testData.message || "Failed to fetch test details", "Error");
          router.push("/faculty/tests");
        }
      }
    } catch {
      if (isFirstLoadRef.current) {
        error("Unable to connect to server", "Network Error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFirstLoadRef.current = false;
    }
  }, [error, router, testId, API_BASE_URL]);

  // Initial fetch
  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId, fetchTestData]);

  // Filter students
  useEffect(() => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.pin.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((student) => student.status === statusFilter);
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, statusFilter]);

  // Add helper function to calculate test status
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

  // In your component
  const testStatus = test
    ? getTestStatus(test.test.start_time, test.test.duration)
    : "upcoming";

  const handleLockStudent = async (studentId, studentName) => {
    const confirmed = await confirm({
      title: "Lock Student Test",
      message: `Lock test for ${studentName}?\n\nThis will prevent them from continuing and submit their current progress.`,
      confirmText: "Lock",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    const facultyId = localStorage.getItem("faculty_id");
    setLoadingMessage("Locking student test...");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/lock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facultyId: parseInt(facultyId) }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        success(`Test locked for ${studentName}`, "Locked");
        fetchTestData();
      } else {
        error(data.message || "Failed to lock student test", "Error");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockStudent = async (studentId, studentName) => {
    const confirmed = await confirm({
      title: "Unlock Student Test",
      message: `Unlock test for ${studentName}?\n\nThis will allow them to continue the test.`,
      confirmText: "Unlock",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!confirmed) return;

    const facultyId = localStorage.getItem("faculty_id");
    setLoadingMessage("Unlocking student test...");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facultyId: parseInt(facultyId) }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        success(`Test unlocked for ${studentName}`, "Unlocked");
        fetchTestData();
      } else {
        error(data.message || "Failed to unlock student test", "Error");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewStudent = (studentId) => {
    router.push(`/faculty/tests/${testId}/monitor/student/${studentId}`);
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
        <div className="fade-in">
          <div className="dashboard-card">
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div
                className="loading-spinner"
                style={{ margin: "0 auto 1rem" }}
              ></div>
              <p style={{ color: "#94a3b8" }}>Loading test monitoring...</p>
            </div>
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

      <div className="fade-in" style={{ pointerEvents: "auto" }}>
        <div className="dashboard-card" style={{ pointerEvents: "auto" }}>
          {/* Back Button */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              href={`/faculty/tests/${testId}`}
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
              Back to Test Details
            </Link>
          </div>

          <div className="table-container">
            <div className="table-header">
              <div>
                <h2 className="table-title">
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
                  Live Student Monitoring
                </h2>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#94a3b8",
                    marginTop: "0.5rem",
                  }}
                >
                  {test.test.title} •{" "}
                  {formatBatchInfo(
                    test.test.branch,
                    test.test.section,
                    test.test.start_year
                  )}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div
              className="stats-grid"
              style={{
                gridTemplateColumns: "repeat(4, 1fr)",
                marginBottom: "2rem",
              }}
            >
              <div className="stat-card">
                <div className="stat-value" style={{ color: "#06b6d4" }}>
                  {test.totalStudents}
                </div>
                <div className="stat-label">Total Students</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: "#22c55e" }}>
                  {students.filter((s) => s.status === "completed").length}
                </div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: "#3b82f6" }}>
                  {students.filter((s) => s.status === "in-progress").length}
                </div>
                <div className="stat-label">In Progress</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: "#f59e0b" }}>
                  {test.totalStudents - students.length}
                </div>
                <div className="stat-label">Not Started</div>
              </div>
            </div>

            {/* Filters with AutoRefreshButton */}
            <div className="table-controls" style={{ marginBottom: "1.5rem" }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, PIN, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ pointerEvents: "auto", cursor: "text" }}
                disabled={isLoading}
              />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ pointerEvents: "auto", cursor: "pointer" }}
                disabled={isLoading}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="locked">Locked</option>
                <option value="not-started">Not Started</option>
              </select>

              {/* Auto Refresh Button Component */}
              <AutoRefreshButton
                userId={localStorage.getItem("faculty_id")}
                userType="faculty"
                pageName="test-monitoring"
                onRefresh={fetchTestData}
                isRefreshing={isRefreshing}
                testStatus={testStatus} // Pass the test status
              />
            </div>

            {/* Student Table - Keep existing table code */}
            {filteredStudents.length === 0 ? (
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    marginBottom: "0.5rem",
                    color: "#e2e8f0",
                  }}
                >
                  No Students Found
                </h3>
                <p>
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "No students have started this test yet"}
                </p>
              </div>
            ) : (
              <div className="table-scroll-wrapper">
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Time Analysis</th>
                      <th>Performance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const activityClass =
                        student.last_active === "now"
                          ? "active"
                          : student.last_active?.includes("sec") ||
                            student.last_active?.includes("min")
                          ? "idle"
                          : "offline";
                      const progressClass =
                        student.progress > 75
                          ? "high"
                          : student.progress > 50
                          ? "medium"
                          : "low";
                      const similarityClass = getSimilarityClass(
                        student.similarity || 0
                      );

                      return (
                        <tr key={student.student_id}>
                          <td>
                            <div className="student-info">
                              <div className="student-avatar">
                                {student.first_name[0]}
                                {student.last_name[0]}
                              </div>
                              <div className="student-details">
                                <h4>
                                  {student.first_name} {student.last_name}
                                </h4>
                                <p>PIN: {student.pin}</p>
                                <p style={{ fontSize: "0.75rem" }}>
                                  <span
                                    className={`activity-indicator ${activityClass}`}
                                  ></span>
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                student.status || "not-started"
                              }`}
                            >
                              {student.status === "completed"
                                ? "✅ Completed"
                                : student.status === "in-progress"
                                ? "⏳ In Progress"
                                : student.status === "locked"
                                ? "🔒 Locked"
                                : "📝 Not Started"}
                            </span>
                          </td>

                          <td>
                            <div className="progress-container">
                              <div className="progress-bar">
                                <div
                                  className={`progress-fill ${progressClass}`}
                                  style={{ width: `${student.progress || 0}%` }}
                                ></div>
                              </div>
                              <div
                                className="progress-text"
                                style={{
                                  color:
                                    progressClass === "high"
                                      ? "#22c55e"
                                      : progressClass === "medium"
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                              >
                                {student.progress || 0}%
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: "0.875rem" }}>
                              {student.start_time ? (
                                <>
                                  <div
                                    style={{
                                      color: "#22c55e",
                                      marginBottom: "0.25rem",
                                    }}
                                  >
                                    <strong>Started:</strong>{" "}
                                    {new Date(
                                      student.start_time
                                    ).toLocaleTimeString()}
                                  </div>
                                  {student.end_time ? (
                                    <>
                                      <div
                                        style={{
                                          color: "#3b82f6",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        <strong>Completed:</strong>{" "}
                                        {new Date(
                                          student.end_time
                                        ).toLocaleTimeString()}
                                      </div>
                                      <div style={{ color: "#f59e0b" }}>
                                        <strong>Duration:</strong>{" "}
                                        {Math.floor(
                                          (new Date(student.end_time) -
                                            new Date(student.start_time)) /
                                            60000
                                        )}{" "}
                                        min
                                      </div>
                                    </>
                                  ) : (
                                    <div style={{ color: "#f59e0b" }}>
                                      <strong>Elapsed:</strong>{" "}
                                      {getElapsedTime(student.start_time)} min
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div style={{ color: "#94a3b8" }}>
                                  Not started yet
                                </div>
                              )}
                            </div>
                          </td>

                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                                fontSize: "0.875rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span style={{ color: "#94a3b8" }}>Score:</span>
                                <span
                                  style={{ fontWeight: 600, color: "#22c55e" }}
                                >
                                  {student.score || 0}%
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span style={{ color: "#94a3b8" }}>
                                  Errors:
                                </span>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color:
                                      student.errors > 5
                                        ? "#ef4444"
                                        : "#f59e0b",
                                  }}
                                >
                                  {student.errors || 0}
                                </span>
                              </div>
                              {student.similarity &&
                                student.similarity > 60 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span style={{ color: "#94a3b8" }}>
                                      Similarity:
                                    </span>
                                    <span
                                      className={`similarity-indicator ${similarityClass}`}
                                    >
                                      {student.similarity}%
                                    </span>
                                  </div>
                                )}
                            </div>
                          </td>

                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-sm primary"
                                onClick={() =>
                                  handleViewStudent(student.student_id)
                                }
                                style={{
                                  pointerEvents: "auto",
                                  cursor: "pointer",
                                }}
                              >
                                <svg
                                  className="icon"
                                  style={{ width: "14px", height: "14px" }}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                View
                              </button>
                              {student.status === "in-progress" ? (
                                <button
                                  className="btn-sm danger"
                                  onClick={() =>
                                    handleLockStudent(
                                      student.student_id,
                                      `${student.first_name} ${student.last_name}`
                                    )
                                  }
                                  style={{
                                    pointerEvents: "auto",
                                    cursor: "pointer",
                                  }}
                                >
                                  <svg
                                    className="icon"
                                    style={{ width: "14px", height: "14px" }}
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
                                  Lock
                                </button>
                              ) : student.status === "locked" ? (
                                <button
                                  className="btn-sm warning"
                                  onClick={() =>
                                    handleUnlockStudent(
                                      student.student_id,
                                      `${student.first_name} ${student.last_name}`
                                    )
                                  }
                                  style={{
                                    pointerEvents: "auto",
                                    cursor: "pointer",
                                    background: "#f59e0b",
                                    color: "white",
                                  }}
                                >
                                  <svg
                                    className="icon"
                                    style={{ width: "14px", height: "14px" }}
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
                                  Unlock
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TestMonitoring;

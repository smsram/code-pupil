'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNotification } from '@/app/components/Notification'
import LoadingOverlay from '@/app/components/LoadingOverlay'
import { useConfirm } from '@/app/components/ConfirmDialog'
import AutoRefreshButton from '@/app/components/AutoRefreshButton'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

// Format datetime
const formatDateTime = (datetimeStr) => {
  if (!datetimeStr) return { date: "N/A", time: "N/A", full: "N/A" };

  try {
    const dateTime = new Date(datetimeStr);
    if (isNaN(dateTime.getTime()))
      return { date: "N/A", time: "N/A", full: "N/A" };

    const day = dateTime.getDate().toString().padStart(2, "0");
    const month = (dateTime.getMonth() + 1).toString().padStart(2, "0");
    const year = dateTime.getFullYear();

    let hours = dateTime.getHours();
    const minutes = dateTime.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = hours.toString().padStart(2, "0");

    return {
      date: `${day}/${month}/${year}`,
      time: `${formattedHours}:${minutes} ${ampm}`,
      full: `${day}/${month}/${year}, ${formattedHours}:${minutes} ${ampm}`,
    };
  } catch (error) {
    return { date: "N/A", time: "N/A", full: "N/A" };
  }
};

// Format duration
const formatDuration = (minutes) => {
  if (!minutes) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

// Format batch info
const formatBatchInfo = (branch, section, startYear) => {
  const start = parseInt(startYear);
  const end = start + 4;
  return `${branch} - ${section} Batch ${start}-${end}`;
};

// Export to CSV
const exportToCsv = (data, filename) => {
  if (!data || data.length === 0) return;

  const csvContent = [
    Object.keys(data[0]).join(","),
    ...data.map((row) =>
      Object.values(row)
        .map((val) => `"${val}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

const AllTests = () => {
  const router = useRouter()
  const { success, error, warning } = useNotification()
  const confirm = useConfirm()

  const [tests, setTests] = useState([])
  const [filteredTests, setFilteredTests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading tests...')
  const [hasLiveTests, setHasLiveTests] = useState(false)

  // Memoized fetch to satisfy exhaustive-deps
  const fetchTests = useCallback(async () => {
    const facultyId = typeof window !== 'undefined' ? localStorage.getItem('faculty_id') : null
    if (!facultyId) {
      error('Please login to view tests', 'Authentication Required')
      router.push('/auth/faculty')
      return
    }

    if (!tests.length) {
      setIsLoading(true)
      setLoadingMessage('Loading tests...')
    }
    setIsRefreshing(true)

    try {
      const response = await fetch(`${API_BASE_URL}/test/faculty/${facultyId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setTests(data.data)
        setFilteredTests(data.data)

        // Check live tests
        const liveTests = data.data.some((test) => getTestStatus(test.start_time, test.duration) === 'live')
        setHasLiveTests(liveTests)
      } else {
        error(data.message || 'Failed to fetch tests', 'Error')
      }
    } catch (err) {
      console.error('Fetch tests error:', err)
      if (!tests.length) {
        error('Unable to connect to server', 'Network Error')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [router, error, tests.length])

  useEffect(() => {
    fetchTests()
  }, [fetchTests])
  
  useEffect(() => {
    let filtered = tests;

    if (searchTerm) {
      filtered = filtered.filter(
        (test) =>
          test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.start_year.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((test) => {
        const status = getTestStatus(test.start_time, test.duration);
        return status === statusFilter;
      });
    }

    setFilteredTests(filtered);
  }, [tests, searchTerm, statusFilter]);
  
  const handleDelete = async (testId, testTitle) => {
    const confirmed = await confirm({
      title: "Delete Test",
      message: `Are you sure you want to delete "${testTitle}"?\n\nThis action cannot be undone and will delete all associated data.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    const facultyId = localStorage.getItem("faculty_id");
    setIsLoading(true);
    setLoadingMessage("Deleting test...");

    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facultyId: parseInt(facultyId) }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        success("Test deleted successfully", "Deleted");
        setTests(tests.filter((test) => test.test_id !== testId));
      } else {
        error(data.message || "Failed to delete test", "Error");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async (testId, testTitle) => {
    const confirmed = await confirm({
      title: "Unpublish Test",
      message: `Unpublish "${testTitle}"?\n\nThis will hide the test from students.`,
      confirmText: "Unpublish",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!confirmed) return;

    const facultyId = localStorage.getItem("faculty_id");
    setIsLoading(true);
    setLoadingMessage("Unpublishing test...");

    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}/unpublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facultyId: parseInt(facultyId) }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        success("Test unpublished successfully", "Unpublished");
        fetchTests(); // Refresh
      } else {
        error(data.message || "Failed to unpublish test", "Error");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (testId, testTitle, asTemplate = false) => {
    const confirmed = await confirm({
      title: asTemplate ? "Duplicate as Template" : "Duplicate and Publish",
      message: asTemplate
        ? `Create a draft copy of "${testTitle}"?\n\nYou can modify it before publishing.`
        : `Create and publish a copy of "${testTitle}"?\n\nThe new test will be immediately available to students.`,
      confirmText: asTemplate ? "Create Draft" : "Duplicate & Publish",
      cancelText: "Cancel",
      type: "info",
    });

    if (!confirmed) return;

    const facultyId = localStorage.getItem("faculty_id");
    setIsLoading(true);
    setLoadingMessage("Duplicating test...");

    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyId: parseInt(facultyId),
          asTemplate,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        success(
          asTemplate
            ? "Template created successfully"
            : "Test duplicated and published successfully",
          "Success"
        );
        fetchTests(); // Refresh
      } else {
        error(data.message || "Failed to duplicate test", "Error");
      }
    } catch (err) {
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredTests.length === 0) {
      warning("No tests to export", "Export Warning");
      return;
    }

    const exportData = filteredTests.map((test) => {
      const status = getTestStatus(test.start_time, test.duration);
      const formatted = formatDateTime(test.start_time);
      return {
        "Test ID": test.test_id,
        "Test Title": test.title,
        Language: test.language,
        Batch: formatBatchInfo(test.branch, test.section, test.start_year),
        Status: test.status,
        "Test Status": status,
        "Start Time": formatted.full,
        Duration: formatDuration(test.duration),
        "Total Students": test.totalStudents,
        Completed: test.completedStudents,
      };
    });

    exportToCsv(
      exportData,
      `all-tests-${new Date().toISOString().split("T")[0]}.csv`
    );
    success("Tests exported successfully", "Export Complete");
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
          <div className="table-container">
            <div className="table-header">
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
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                All Tests Management
              </h2>
              <div className="table-controls">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search tests..."
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
                  <option value="live">Live</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Auto Refresh Button - Only show if there are live tests */}
                {hasLiveTests && (
                  <AutoRefreshButton
                    userId={localStorage.getItem("faculty_id")}
                    userType="faculty"
                    pageName="all-tests"
                    onRefresh={fetchTests}
                    isRefreshing={isRefreshing}
                    testStatus="live"
                  />
                )}

                <button
                  className="action-btn secondary"
                  onClick={handleExport}
                  disabled={isLoading || filteredTests.length === 0}
                  style={{
                    pointerEvents: "auto",
                    cursor:
                      isLoading || filteredTests.length === 0
                        ? "not-allowed"
                        : "pointer",
                    opacity: isLoading || filteredTests.length === 0 ? 0.5 : 1,
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
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Export
                </button>
                <Link
                  href="/faculty/create"
                  className="action-btn primary"
                  style={{ pointerEvents: "auto", textDecoration: "none" }}
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
                  Create Test
                </Link>
              </div>
            </div>

            {filteredTests.length === 0 && !isLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem 2rem",
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
                  No Tests Found
                </h3>
                <p style={{ marginBottom: "1.5rem" }}>
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first test to get started"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Link
                    href="/faculty/create"
                    className="action-btn primary"
                    style={{ textDecoration: "none", display: "inline-flex" }}
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
                    Create Your First Test
                  </Link>
                )}
              </div>
            ) : (
              <div className="table-scroll-wrapper">
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th>Test Details</th>
                      <th>Status</th>
                      <th>Schedule</th>
                      <th>Participants</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((test) => {
                      const status = getTestStatus(
                        test.start_time,
                        test.duration
                      );
                      const formatted = formatDateTime(test.start_time);
                      const progressPercentage =
                        test.totalStudents > 0
                          ? Math.round(
                              (test.completedStudents / test.totalStudents) *
                                100
                            )
                          : 0;

                      return (
                        <tr key={test.test_id} className="test-row">
                          <td>
                            <div>
                              <h4
                                style={{
                                  fontWeight: 600,
                                  color: "#ffffff",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                {test.title}
                              </h4>
                              <p
                                style={{
                                  color: "#94a3b8",
                                  fontSize: "0.875rem",
                                  margin: 0,
                                }}
                              >
                                {test.language} •{" "}
                                {formatBatchInfo(
                                  test.branch,
                                  test.section,
                                  test.start_year
                                )}
                              </p>
                              <p
                                style={{
                                  color: "#06b6d4",
                                  fontSize: "0.75rem",
                                  margin: 0,
                                  marginTop: "0.25rem",
                                  fontWeight: 600,
                                  letterSpacing: "0.05em",
                                }}
                              >
                                ID: {test.test_id}
                              </p>
                              {test.description && (
                                <p
                                  style={{
                                    color: "#6b7280",
                                    fontSize: "0.75rem",
                                    margin: 0,
                                    marginTop: "0.25rem",
                                  }}
                                >
                                  {test.description.length > 60
                                    ? test.description.substring(0, 60) + "..."
                                    : test.description}
                                </p>
                              )}
                            </div>
                          </td>

                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              <span className={`status-badge ${status}`}>
                                {status === "live"
                                  ? "🔴 LIVE"
                                  : status === "upcoming"
                                  ? "📅 UPCOMING"
                                  : "✅ COMPLETED"}
                              </span>
                              <span
                                className={`status-badge ${
                                  test.status === "published"
                                    ? "live"
                                    : test.status === "draft"
                                    ? "upcoming"
                                    : "completed"
                                }`}
                              >
                                {test.status === "published"
                                  ? "📢 Published"
                                  : test.status === "draft"
                                  ? "📝 Draft"
                                  : "🔒 Unpublished"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: "0.875rem" }}>
                              <div
                                style={{
                                  color: "#22c55e",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                <strong>Date:</strong> {formatted.date}
                              </div>
                              <div
                                style={{
                                  color: "#3b82f6",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                <strong>Time:</strong> {formatted.time}
                              </div>
                              <div style={{ color: "#f59e0b" }}>
                                <strong>Duration:</strong>{" "}
                                {formatDuration(test.duration)}
                              </div>
                            </div>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <div
                              style={{
                                fontSize: "1.25rem",
                                fontWeight: 700,
                                color: "#06b6d4",
                                marginBottom: "0.25rem",
                              }}
                            >
                              {test.totalStudents}
                            </div>
                            <div
                              style={{ fontSize: "0.75rem", color: "#94a3b8" }}
                            >
                              students
                            </div>
                          </td>

                          <td>
                            <div className="progress-container">
                              <div className="progress-bar">
                                <div
                                  className={`progress-fill ${
                                    progressPercentage >= 75
                                      ? "high"
                                      : progressPercentage >= 50
                                      ? "medium"
                                      : progressPercentage >= 25
                                      ? "low"
                                      : "critical"
                                  }`}
                                  style={{ width: `${progressPercentage}%` }}
                                ></div>
                              </div>
                              <div
                                className="progress-text"
                                style={{
                                  color:
                                    progressPercentage >= 75
                                      ? "#22c55e"
                                      : progressPercentage >= 50
                                      ? "#3b82f6"
                                      : progressPercentage >= 25
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                              >
                                {progressPercentage}%
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#94a3b8",
                                textAlign: "center",
                                marginTop: "0.25rem",
                              }}
                            >
                              {test.completedStudents}/{test.totalStudents}{" "}
                              completed
                            </div>
                          </td>

                          <td>
                            <div
                              className="action-buttons"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              {/* Row 1: View/Edit */}
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                {test.status === "draft" ? (
                                  <Link
                                    href={`/faculty/tests/edit/${test.test_id}`}
                                    className="btn-sm secondary"
                                    style={{
                                      pointerEvents: "auto",
                                      textDecoration: "none",
                                      flex: 1,
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
                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                      />
                                    </svg>
                                    Edit
                                  </Link>
                                ) : (
                                  <>
                                    <Link
                                      href={`/faculty/tests/${test.test_id}`}
                                      className="btn-sm primary"
                                      style={{
                                        pointerEvents: "auto",
                                        textDecoration: "none",
                                        flex: 1,
                                      }}
                                    >
                                      <svg
                                        className="icon"
                                        style={{
                                          width: "14px",
                                          height: "14px",
                                        }}
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
                                    </Link>
                                    {status === "upcoming" && (
                                      <Link
                                        href={`/faculty/tests/edit/${test.test_id}`}
                                        className="btn-sm secondary"
                                        style={{
                                          pointerEvents: "auto",
                                          textDecoration: "none",
                                          flex: 1,
                                        }}
                                      >
                                        <svg
                                          className="icon"
                                          style={{
                                            width: "14px",
                                            height: "14px",
                                          }}
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
                                        Edit
                                      </Link>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Row 2: Duplicate Options */}
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  className="btn-sm"
                                  onClick={() =>
                                    handleDuplicate(
                                      test.test_id,
                                      test.title,
                                      false
                                    )
                                  }
                                  disabled={isLoading}
                                  style={{
                                    pointerEvents: "auto",
                                    cursor: isLoading
                                      ? "not-allowed"
                                      : "pointer",
                                    opacity: isLoading ? 0.5 : 1,
                                    background: "#8b5cf6",
                                    color: "white",
                                    flex: 1,
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
                                      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                                    />
                                  </svg>
                                  Publish
                                </button>
                                <button
                                  className="btn-sm secondary"
                                  onClick={() =>
                                    handleDuplicate(
                                      test.test_id,
                                      test.title,
                                      true
                                    )
                                  }
                                  disabled={isLoading}
                                  style={{
                                    pointerEvents: "auto",
                                    cursor: isLoading
                                      ? "not-allowed"
                                      : "pointer",
                                    opacity: isLoading ? 0.5 : 1,
                                    flex: 1,
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
                                      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                                    />
                                  </svg>
                                  Template
                                </button>
                              </div>

                              {/* Row 3: Unpublish/Delete */}
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                {test.status === "published" &&
                                  status === "upcoming" && (
                                    <button
                                      className="btn-sm"
                                      onClick={() =>
                                        handleUnpublish(
                                          test.test_id,
                                          test.title
                                        )
                                      }
                                      disabled={isLoading}
                                      style={{
                                        pointerEvents: "auto",
                                        cursor: isLoading
                                          ? "not-allowed"
                                          : "pointer",
                                        opacity: isLoading ? 0.5 : 1,
                                        background: "#f59e0b",
                                        color: "white",
                                        flex: 1,
                                      }}
                                    >
                                      <svg
                                        className="icon"
                                        style={{
                                          width: "14px",
                                          height: "14px",
                                        }}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                        />
                                      </svg>
                                      Unpublish
                                    </button>
                                  )}
                                <button
                                  className="btn-sm danger"
                                  onClick={() =>
                                    handleDelete(test.test_id, test.title)
                                  }
                                  disabled={isLoading}
                                  style={{
                                    pointerEvents: "auto",
                                    cursor: isLoading
                                      ? "not-allowed"
                                      : "pointer",
                                    opacity: isLoading ? 0.5 : 1,
                                    flex: 1,
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
                                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                    />
                                  </svg>
                                  Delete
                                </button>
                              </div>
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

export default AllTests;

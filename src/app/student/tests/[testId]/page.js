"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNotification } from "@/app/components/Notification";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import "../../style.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function TestOverview() {
  const params = useParams();
  const router = useRouter();
  const { testId } = params;
  const { success, error, warning } = useNotification();

  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilStart, setTimeUntilStart] = useState("");
  const [canStart, setCanStart] = useState(false);
  const [testState, setTestState] = useState("new"); // 'new', 'active', 'can-resume', 'ended', 'locked'

  // Memoized fetch to satisfy exhaustive-deps
  const fetchTestDetails = useCallback(async () => {
    const studentId =
      typeof window !== "undefined" ? localStorage.getItem("student_id") : null;

    if (!studentId) {
      error("Please login to view test", "Authentication Required");
      router.push("/auth/student");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Get student's progress for this test
        const studentTestsResponse = await fetch(
          `${API_BASE_URL}/test/student/${studentId}/tests`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const studentTestsData = await studentTestsResponse.json();

        if (studentTestsResponse.ok && studentTestsData.success) {
          // Find this specific test
          const thisTest = studentTestsData.data.find(
            (t) => t.test_id === testId
          );

          if (thisTest) {
            setTest({
              ...data.data.test,
              studentStatus: thisTest.studentStatus,
              progress: thisTest.progress,
              score: thisTest.score,
            });
          } else {
            // Student hasn't started this test yet
            setTest({
              ...data.data.test,
              studentStatus: "not-started",
              progress: 0,
              score: null,
            });
          }
        } else {
          setTest({
            ...data.data.test,
            studentStatus: "not-started",
            progress: 0,
            score: null,
          });
        }
      } else {
        error(data.message || "Failed to fetch test details", "Error");
        router.push("/student");
      }
    } catch (err) {
      console.error("Fetch test error:", err);
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  }, [testId, router, error]);

  useEffect(() => {
    fetchTestDetails();
  }, [fetchTestDetails]);

  useEffect(() => {
    if (!test) return;

    const updateTimer = () => {
      const now = new Date();
      const startTime = new Date(test.start_time);
      const endTime = new Date(startTime.getTime() + test.duration * 60000);

      // Check if student is currently taking the test
      if (test.studentStatus === "in-progress") {
        setTestState("can-resume");
        setCanStart(true);
        const remainingMinutes = Math.floor((endTime - now) / (1000 * 60));
        const remainingSeconds = Math.floor(
          ((endTime - now) % (1000 * 60)) / 1000
        );
        if (remainingMinutes >= 0) {
          setTimeUntilStart(
            `Time remaining: ${remainingMinutes}:${remainingSeconds
              .toString()
              .padStart(2, "0")}`
          );
        } else {
          setTimeUntilStart("Test time has ended");
          setCanStart(false);
        }
        return;
      }

      // Check if test is locked
      if (test.studentStatus === "locked") {
        setTestState("locked");
        setCanStart(false);
        setTimeUntilStart("This test has been locked by your instructor");
        return;
      }

      // Check if test is completed
      if (test.studentStatus === "completed") {
        setTestState("completed");
        setCanStart(false);
        setTimeUntilStart("You have already completed this test");
        return;
      }

      // Regular timer logic for new tests
      if (now >= startTime && now <= endTime) {
        // Test is LIVE
        setTestState("live");
        setCanStart(true);
        const remainingMinutes = Math.floor((endTime - now) / (1000 * 60));
        setTimeUntilStart(
          `Test is LIVE - ${remainingMinutes} minutes remaining`
        );
      } else if (now < startTime) {
        // Test is UPCOMING
        const timeDiff = startTime - now;
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Can start 10 minutes before scheduled time
        if (timeDiff <= 10 * 60 * 1000) {
          setTestState("ready");
          setCanStart(true);
          setTimeUntilStart(
            `Starts in ${minutes}:${seconds.toString().padStart(2, "0")}`
          );
        } else {
          setTestState("upcoming");
          setCanStart(false);
          if (days > 0) {
            setTimeUntilStart(`Starts in ${days}d ${hours}h ${minutes}m`);
          } else if (hours > 0) {
            setTimeUntilStart(`Starts in ${hours}h ${minutes}m`);
          } else {
            setTimeUntilStart(`Starts in ${minutes}m ${seconds}s`);
          }
        }
      } else {
        // Test has ended
        setTestState("ended");
        setCanStart(false);
        setTimeUntilStart("Test has ended");
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [test]);

  const handleStartTest = async () => {
    if (!canStart) return;

    const studentId = localStorage.getItem("student_id");

    // If resuming an active test, just navigate
    if (testState === "can-resume") {
      router.push(`/student/tests/${testId}/start`);
      return;
    }

    // Starting a new test - create record in TestStudents
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/progress`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "in-progress",
            progress: 0,
            errors: 0,
            wpm: 0,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        success("Test started successfully", "Started");
        router.push(`/student/tests/${testId}/start`);
      } else {
        error(data.message || "Failed to start test", "Error");
      }
    } catch (err) {
      console.error("Start test error:", err);
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (testState === "can-resume") {
      return (
        <>
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
        </>
      );
    }
    if (testState === "live" || testState === "ready") {
      return (
        <>
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Start Test Now
        </>
      );
    }
    if (testState === "completed") {
      return (
        <>
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          View Results
        </>
      );
    }
    return "Not Available";
  };

  const getButtonClass = () => {
    if (testState === "can-resume") {
      return "student-resume-btn";
    }
    if (testState === "live") {
      return "student-start-btn live";
    }
    return "student-start-btn";
  };

  if (isLoading || !test) {
    return (
      <>
        <LoadingOverlay
          active={isLoading}
          message="Loading test details..."
          type="spinner"
          blur={true}
        />
        <div className="student-app-container">
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div
              className="loading-spinner"
              style={{ margin: "0 auto 1rem" }}
            ></div>
            <p style={{ color: "#94a3b8" }}>Loading test details...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LoadingOverlay
        active={isLoading}
        message="Starting test..."
        type="spinner"
        blur={true}
      />

      <div className="student-app-container" style={{ pointerEvents: "auto" }}>
        {/* Header */}
        <header className="student-header">
          <div className="student-header-content">
            <div className="student-logo-section">
              <div>
                <h1 className="student-logo-title">CodeTest Pro</h1>
                <span className="student-logo-subtitle">
                  {testState === "can-resume"
                    ? "Resume Test"
                    : "Test Instructions"}
                </span>
              </div>
            </div>

            <div className="student-profile-section">
              <button
                className="student-logout-btn"
                onClick={() => router.push("/student")}
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="student-overview-container">
          <div className="student-fade-in">
            {/* Active Test Alert */}
            {testState === "can-resume" && (
              <div
                className="student-active-test-alert"
                style={{ marginBottom: "var(--student-space-xl)" }}
              >
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
                    <h3 className="student-alert-title">Test In Progress</h3>
                    <p className="student-alert-subtitle">
                      You have an active test session. Click &quot;Continue
                      Test&quot; to resume where you left off.
                    </p>
                    <div
                      style={{
                        marginTop: "0.5rem",
                        color: "var(--student-text-muted)",
                      }}
                    >
                      Progress: {test.progress || 0}%
                    </div>
                  </div>
                  <div className="student-alert-actions">
                    <div
                      style={{
                        color: "var(--student-warning-color)",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                        textAlign: "center",
                      }}
                    >
                      {timeUntilStart}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Locked Alert */}
            {testState === "locked" && (
              <div
                className="student-active-test-alert"
                style={{
                  marginBottom: "var(--student-space-xl)",
                  background: "rgba(239, 68, 68, 0.1)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                <div className="student-alert-content">
                  <div className="student-alert-icon">
                    <svg
                      className="w-8 h-8"
                      style={{ color: "#ef4444" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <div className="student-alert-info">
                    <h3
                      className="student-alert-title"
                      style={{ color: "#ef4444" }}
                    >
                      Test Locked
                    </h3>
                    <p className="student-alert-subtitle">
                      This test has been locked by your instructor. Please
                      contact them for more information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Test Overview Card */}
            <div className="student-test-overview-card">
              <h1 className="student-overview-title">{test.title}</h1>

              {/* Test Meta Information */}
              <div className="student-test-meta-grid">
                <div className="student-meta-item">
                  <div className="student-meta-label">Test ID</div>
                  <div className="student-meta-value">{test.test_id}</div>
                </div>

                <div className="student-meta-item">
                  <div className="student-meta-label">Language</div>
                  <div className="student-meta-value">{test.language}</div>
                </div>

                <div className="student-meta-item">
                  <div className="student-meta-label">Duration</div>
                  <div className="student-meta-value">{test.duration} min</div>
                </div>

                <div className="student-meta-item">
                  <div className="student-meta-label">Max Attempts</div>
                  <div className="student-meta-value">{test.max_attempts}</div>
                </div>

                <div className="student-meta-item">
                  <div className="student-meta-label">
                    {testState === "can-resume" ? "Started At" : "Start Time"}
                  </div>
                  <div className="student-meta-value">
                    {new Date(test.start_time).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                </div>

                {test.score !== null && test.score !== undefined && (
                  <div className="student-meta-item">
                    <div className="student-meta-label">Your Score</div>
                    <div
                      className="student-meta-value"
                      style={{
                        color:
                          test.score >= 80
                            ? "#22c55e"
                            : test.score >= 60
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {test.score}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description Section */}
            {test.description && (
              <div className="student-instructions-section">
                <h2 className="student-instructions-title">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Test Description
                </h2>
                <div className="student-problem-statement">
                  <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                    {test.description}
                  </p>
                </div>
              </div>
            )}

            {/* Test Settings */}
            <div className="student-rules-section">
              <h2 className="student-rules-title">
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Test Settings
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      color: test.fullscreen_mode ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {test.fullscreen_mode ? "✓" : "✗"}
                  </span>
                  <span>Fullscreen Mode</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{ color: test.auto_submit ? "#22c55e" : "#ef4444" }}
                  >
                    {test.auto_submit ? "✓" : "✗"}
                  </span>
                  <span>Auto Submit</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{ color: test.show_results ? "#22c55e" : "#ef4444" }}
                  >
                    {test.show_results ? "✓" : "✗"}
                  </span>
                  <span>Show Results</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{ color: test.allow_copy ? "#22c55e" : "#ef4444" }}
                  >
                    {test.allow_copy ? "✓" : "✗"}
                  </span>
                  <span>Allow Copy</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{ color: test.allow_paste ? "#22c55e" : "#ef4444" }}
                  >
                    {test.allow_paste ? "✓" : "✗"}
                  </span>
                  <span>Allow Paste</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>📊</span>
                  <span>
                    Similarity Threshold: {test.similarity_threshold}%
                  </span>
                </div>
              </div>
            </div>

            {/* Start/Continue Button */}
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              {timeUntilStart && (
                <div
                  style={{
                    marginBottom: "var(--student-space-lg)",
                    color: canStart
                      ? "var(--student-success-color)"
                      : "var(--student-warning-color)",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                  }}
                >
                  {timeUntilStart}
                </div>
              )}

              {testState === "completed" ? (
                <button
                  className="student-start-btn"
                  onClick={() =>
                    router.push(`/student/tests/${testId}/results`)
                  }
                  style={{
                    pointerEvents: "auto",
                    cursor: "pointer",
                    background: "#22c55e",
                  }}
                >
                  {getButtonText()}
                </button>
              ) : (
                <button
                  className={getButtonClass()}
                  onClick={handleStartTest}
                  disabled={!canStart}
                  style={{
                    opacity: canStart ? 1 : 0.6,
                    cursor: canStart ? "pointer" : "not-allowed",
                    pointerEvents: "auto",
                  }}
                >
                  {getButtonText()}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

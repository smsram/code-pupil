"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function TestCard({ test, currentTime, onStatusUpdate }) {
  const [isClient, setIsClient] = useState(false);
  const [formattedStartTime, setFormattedStartTime] = useState("");
  const [hasAutoUpdated, setHasAutoUpdated] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (test.start_time) {
      const date = new Date(test.start_time);
      setFormattedStartTime(
        date.toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    }
  }, [test.start_time]);

  // Stable function reference for exhaustive-deps
  const updateExpiredTest = useCallback(async () => {
    const studentId = localStorage.getItem("student_id");
    if (!studentId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${test.test_id}/update-expired`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: parseInt(studentId, 10),
          }),
        }
      );

      if (response.ok) {
        setHasAutoUpdated(true);
        console.log(`Test ${test.test_id} status updated to 'left'`);
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      }
    } catch (error) {
      console.error("Error updating expired test:", error);
    }
  }, [test.test_id, onStatusUpdate]);

  // Auto-update database when test expires with in-progress status
  useEffect(() => {
    const now = currentTime;
    const startTime = new Date(test.start_time);
    const endTime = new Date(startTime.getTime() + test.duration * 60000);
    const isExpired = now > endTime;

    // Only update once per test
    if (
      isExpired &&
      test.studentStatus === "in-progress" &&
      !test.hasSubmission &&
      !hasAutoUpdated
    ) {
      updateExpiredTest();
    }
  }, [
    currentTime,
    test.start_time,
    test.duration,
    test.studentStatus,
    test.hasSubmission,
    hasAutoUpdated,
    updateExpiredTest,
  ]);

  const getStatusInfo = () => {
    const now = currentTime;
    const startTime = new Date(test.start_time);
    const endTime = new Date(startTime.getTime() + test.duration * 60000);
    const isExpired = now > endTime;

    // Priority 1: Check if test expired with in-progress status and no submission (LEFT TEST)
    // This includes cases where auto-update didn't happen yet
    if (
      isExpired &&
      test.studentStatus === "in-progress" &&
      !test.hasSubmission
    ) {
      return {
        status: "left",
        text: "LEFT",
        actionText: "View Details",
        actionPath: `/student/tests/${test.test_id}`,
        disabled: false,
        description: "Test was started but left incomplete",
        icon: (
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
              d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
            />
          </svg>
        ),
      };
    }

    // Priority 1.5: Check if status is explicitly 'left'
    if (test.studentStatus === "left") {
      return {
        status: "left",
        text: "LEFT",
        actionText: "View Details",
        actionPath: `/student/tests/${test.test_id}`,
        disabled: false,
        description: "Test was started but left incomplete",
        icon: (
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
              d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
            />
          </svg>
        ),
      };
    }

    // Priority 2: Check if student is actively taking the test (test still running)
    if (test.studentStatus === "in-progress" && !isExpired) {
      const remainingMinutes = Math.max(
        0,
        Math.floor((endTime - now) / (1000 * 60))
      );
      return {
        status: "active",
        text: "IN PROGRESS",
        actionText: "Continue Test",
        actionPath: `/student/tests/${test.test_id}`,
        urgent: remainingMinutes < 30,
        disabled: false,
        description: `${remainingMinutes} minutes remaining`,
        icon: (
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
        ),
      };
    }

    // Priority 3: Check if student completed the test
    if (test.studentStatus === "completed" || test.hasSubmission) {
      return {
        status: "completed",
        text: "COMPLETED",
        actionText: test.show_results ? "View Results" : "View Details",
        actionPath: test.show_results
          ? `/student/tests/${test.test_id}/results`
          : `/student/tests/${test.test_id}/completed`,
        disabled: false,
        description:
          test.score !== null
            ? `Score: ${test.score}%`
            : "Submitted successfully",
        icon: (
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
        ),
      };
    }

    // Priority 4: Check if test is locked for student
    if (test.studentStatus === "locked") {
      return {
        status: "locked",
        text: "LOCKED",
        actionText: "Test Locked",
        actionPath: null,
        disabled: true,
        description: "Access denied by faculty",
        icon: (
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      };
    }

    // Priority 5: Check if test is currently LIVE
    if (now >= startTime && now <= endTime) {
      const remainingMinutes = Math.floor((endTime - now) / (1000 * 60));
      return {
        status: "live",
        text: "LIVE",
        actionText: "Start Test",
        actionPath: `/student/tests/${test.test_id}`,
        disabled: false,
        remainingMinutes,
        description: `${remainingMinutes} minutes remaining`,
        icon: (
          <svg
            className="w-5 h-5 animate-pulse"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="8" />
          </svg>
        ),
      };
    }

    // Priority 6: Check if test hasn't started yet (UPCOMING)
    if (now < startTime) {
      const timeDiff = startTime - now;
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      let timeText = "";
      let description = "";
      if (days > 0) {
        timeText = `Starts in ${days}d ${hours}h`;
        description = `Scheduled for ${formattedStartTime}`;
      } else if (hours > 0) {
        timeText = `Starts in ${hours}h ${minutes}m`;
        description = `Scheduled for ${formattedStartTime}`;
      } else {
        timeText = `Starts in ${minutes}m`;
        description = "Test starting soon";
      }

      return {
        status: "upcoming",
        text: "UPCOMING",
        actionText: timeText,
        actionPath: `/student/tests/${test.test_id}`,
        disabled: true,
        description,
        icon: (
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    }

    // Priority 7: Test has ended and student didn't take it (MISSED)
    return {
      status: "missed",
      text: "MISSED",
      actionText: "View Details",
      actionPath: `/student/tests/${test.test_id}`,
      disabled: false,
      description: "Test was not attempted",
      icon: (
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      className={`student-test-card student-fade-in-up ${
        statusInfo.urgent ? "urgent" : ""
      } ${statusInfo.status === "left" ? "left" : ""}`}
    >
      <div className={`student-test-status-bar ${statusInfo.status}`}></div>

      <div className="student-test-content">
        <div className="student-test-header">
          <div>
            <h3 className="student-test-title">{test.title}</h3>
            <p className="student-test-professor">
              ID: {test.test_id} • {test.branch} - {test.section}
            </p>
          </div>
          <span className={`student-test-status-badge ${statusInfo.status}`}>
            {statusInfo.icon} {statusInfo.text}
          </span>
        </div>

        {/* Rest of the component remains the same... */}
        <div className="student-test-details">
          <div className="student-test-detail-row">
            <span className="student-test-detail-label">
              <svg
                className="w-4 h-4 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              Language:
            </span>
            <span
              className="student-test-detail-value"
              style={{ color: "var(--student-primary-blue)" }}
            >
              {test.language}
            </span>
          </div>

          <div className="student-test-detail-row">
            <span className="student-test-detail-label">
              <svg
                className="w-4 h-4 inline mr-1"
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
              Duration:
            </span>
            <span className="student-test-detail-value">
              {test.duration} minutes
            </span>
          </div>

          {statusInfo.status === "live" &&
            statusInfo.remainingMinutes !== undefined && (
              <div className="student-test-detail-row">
                <span className="student-test-detail-label">
                  <svg
                    className="w-4 h-4 inline mr-1 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  Time Remaining:
                </span>
                <span
                  className="student-test-detail-value"
                  style={{
                    color: "var(--student-danger-color)",
                    fontWeight: "bold",
                  }}
                >
                  {statusInfo.remainingMinutes} minutes
                </span>
              </div>
            )}

          {statusInfo.status === "left" && (
            <>
              <div className="student-test-detail-row">
                <span
                  className="student-test-detail-label"
                  style={{ color: "#ef4444" }}
                >
                  <svg
                    className="w-4 h-4 inline mr-1"
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
                  Status:
                </span>
                <span
                  className="student-test-detail-value"
                  style={{ color: "#ef4444", fontWeight: "bold" }}
                >
                  Test was started but left incomplete
                </span>
              </div>
              {test.duration_taken && (
                <div className="student-test-detail-row">
                  <span className="student-test-detail-label">Time Spent:</span>
                  <span className="student-test-detail-value">
                    {test.duration_taken} min
                  </span>
                </div>
              )}
              {test.progress && test.progress > 0 && (
                <div className="student-test-detail-row">
                  <span className="student-test-detail-label">Progress:</span>
                  <span className="student-test-detail-value">
                    {test.progress}%
                  </span>
                </div>
              )}
            </>
          )}

          {test.studentStatus === "in-progress" &&
            statusInfo.status === "active" && (
              <>
                <div className="student-test-detail-row">
                  <span className="student-test-detail-label">Progress:</span>
                  <span
                    className="student-test-detail-value"
                    style={{ color: "var(--student-warning-color)" }}
                  >
                    {test.progress || 0}%
                  </span>
                </div>
                {test.duration_taken && (
                  <div className="student-test-detail-row">
                    <span className="student-test-detail-label">
                      Time Spent:
                    </span>
                    <span className="student-test-detail-value">
                      {test.duration_taken} min
                    </span>
                  </div>
                )}
              </>
            )}

          {(test.studentStatus === "completed" || test.hasSubmission) &&
            test.score !== null &&
            test.score !== undefined && (
              <div className="student-test-detail-row">
                <span className="student-test-detail-label">Score:</span>
                <span
                  className="student-test-detail-value"
                  style={{
                    color:
                      test.score >= 80
                        ? "var(--student-success-color)"
                        : test.score >= 60
                        ? "var(--student-warning-color)"
                        : "var(--student-danger-color)",
                  }}
                >
                  {test.score}%
                </span>
              </div>
            )}

          {test.description && (
            <div
              style={{
                marginTop: "var(--student-space-sm)",
                padding: "var(--student-space-sm)",
                background: "rgba(15, 23, 42, 0.5)",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "var(--student-text-muted)",
                lineHeight: "1.5",
              }}
            >
              {test.description.length > 150
                ? test.description.substring(0, 150) + "..."
                : test.description}
            </div>
          )}
        </div>

        {statusInfo.status === "in-progress" &&
          statusInfo.status === "active" && (
            <div
              className="student-progress-wrapper"
              style={{ marginBottom: "var(--student-space-md)" }}
            >
              <div className="student-progress-bar">
                <div
                  className="student-progress-fill"
                  style={{
                    width: `${test.progress || 0}%`,
                    background:
                      (test.progress || 0) > 75
                        ? "var(--student-gradient-success)"
                        : (test.progress || 0) > 50
                        ? "var(--student-gradient-primary)"
                        : (test.progress || 0) > 25
                        ? "var(--student-gradient-warning)"
                        : "var(--student-gradient-danger)",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--student-text-muted)",
                  textAlign: "center",
                  marginTop: "0.25rem",
                }}
              >
                {test.progress || 0}% Complete
              </div>
            </div>
          )}

        {statusInfo.actionPath ? (
          <Link href={statusInfo.actionPath}>
            <button
              className={`student-test-action-btn ${statusInfo.status} ${
                statusInfo.urgent ? "urgent" : ""
              }`}
            >
              {statusInfo.icon}
              {statusInfo.actionText}
            </button>
          </Link>
        ) : (
          <button
            className={`student-test-action-btn ${statusInfo.status}`}
            disabled={statusInfo.disabled}
          >
            {statusInfo.icon}
            {statusInfo.actionText}
          </button>
        )}
      </div>
    </div>
  );
}

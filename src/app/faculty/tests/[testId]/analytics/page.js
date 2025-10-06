"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/app/components/Notification";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import AutoRefreshButton from "@/app/components/AutoRefreshButton";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

// Format batch info
const formatBatchInfo = (branch, section, startYear) => {
  const start = parseInt(startYear);
  const end = start + 4;
  return `${branch} - ${section} Batch ${start}-${end}`;
};

const TestAnalytics = () => {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId;
  const { success, error, warning } = useNotification();

  const [test, setTest] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading analytics...");

  // Track first load to show full-screen loader only once
  const initialLoadRef = useRef(true);

  const fetchAnalytics = useCallback(async () => {
    const facultyId = localStorage.getItem("faculty_id");

    if (!facultyId) {
      error("Please login to view analytics", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    // Full loader only on initial load
    if (initialLoadRef.current) {
      setIsLoading(true);
      setLoadingMessage("Loading analytics...");
    }

    setIsRefreshing(true);

    try {
      // Fetch analytics data (includes test data)
      const analyticsResponse = await fetch(
        `${API_BASE_URL}/test/${testId}/analytics?t=${Date.now()}`,
        {
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );
      const analyticsData = await analyticsResponse.json();

      if (analyticsResponse.ok && analyticsData.success) {
        // Set test data from analytics response
        setTest({
          test: analyticsData.data.test,
          totalStudents: analyticsData.data.totalStudents,
        });

        setAnalytics(analyticsData.data);
      } else {
        error(analyticsData.message || "Failed to fetch analytics", "Error");
        if (initialLoadRef.current) {
          router.push("/faculty/tests");
        }
      }
    } catch (err) {
      console.error("Fetch analytics error:", err);
      if (initialLoadRef.current) {
        error("Unable to connect to server", "Network Error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      initialLoadRef.current = false;
    }
  }, [testId, router, error]);

  useEffect(() => {
    if (testId) {
      fetchAnalytics();
    }
  }, [testId, fetchAnalytics]);

  if (isLoading || !test || !analytics) {
    return (
      <LoadingOverlay
        active={isLoading}
        message={loadingMessage}
        type="spinner"
        blur={true}
      />
    );
  }

  const testStatus = getTestStatus(test.test.start_time, test.test.duration);

  return (
    <>
      <LoadingOverlay
        active={isLoading}
        message={loadingMessage}
        type="spinner"
        blur={true}
      />

      <div className="analytics-fade-in" style={{ pointerEvents: "auto" }}>
        <div
          className="analytics-dashboard-card"
          style={{ pointerEvents: "auto" }}
        >
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

          {/* Header */}
          <div style={{ marginBottom: "2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
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
                  Test Analytics
                </h1>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      color: "#e2e8f0",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                    }}
                  >
                    {test.test.title}
                  </span>
                  <span className={`status-badge ${testStatus}`}>
                    {testStatus === "live"
                      ? "🔴 LIVE"
                      : testStatus === "upcoming"
                      ? "📅 UPCOMING"
                      : "✅ COMPLETED"}
                  </span>
                  <span style={{ color: "#94a3b8" }}>
                    {formatBatchInfo(
                      test.test.branch,
                      test.test.section,
                      test.test.start_year
                    )}
                  </span>
                </div>
              </div>

              {/* Auto Refresh Button */}
              <AutoRefreshButton
                userId={localStorage.getItem("faculty_id")}
                userType="faculty"
                pageName="test-analytics"
                onRefresh={fetchAnalytics}
                isRefreshing={isRefreshing}
                testStatus={testStatus}
              />
            </div>
          </div>

          {/* Overview Statistics */}
          <div className="analytics-section">
            <h2 className="analytics-section-title">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Overview Statistics
            </h2>

            <div className="analytics-stats-grid">
              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#06b6d4" }}
                >
                  {analytics.overview.totalStudents}
                </div>
                <div className="analytics-stat-label">Total Students</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#22c55e" }}
                >
                  {analytics.overview.completed}
                </div>
                <div className="analytics-stat-label">Completed</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#3b82f6" }}
                >
                  {analytics.overview.inProgress}
                </div>
                <div className="analytics-stat-label">In Progress</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#f59e0b" }}
                >
                  {analytics.overview.notStarted}
                </div>
                <div className="analytics-stat-label">Not Started</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#8b5cf6" }}
                >
                  {analytics.overview.averageScore.toFixed(1)}%
                </div>
                <div className="analytics-stat-label">Average Score</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#ec4899" }}
                >
                  {Math.floor(analytics.overview.averageTime)} min
                </div>
                <div className="analytics-stat-label">Average Time</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#10b981" }}
                >
                  {analytics.overview.passRate}%
                </div>
                <div className="analytics-stat-label">Pass Rate</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#f97316" }}
                >
                  {analytics.overview.highestScore}
                </div>
                <div className="analytics-stat-label">Highest Score</div>
              </div>
            </div>
          </div>

          {/* Performance Distribution */}
          <div className="analytics-grid-2">
            <div className="analytics-section">
              <h3 className="analytics-section-subtitle">Score Distribution</h3>
              <div className="analytics-distribution-list">
                {Object.entries(analytics.performance.scoreDistribution).map(
                  ([range, count]) => (
                    <div key={range} className="analytics-distribution-item">
                      <span className="analytics-dist-label">{range}</span>
                      <div className="analytics-dist-bar-container">
                        <div
                          className="analytics-dist-bar"
                          style={{
                            width: `${
                              (count / analytics.overview.completed) * 100 || 0
                            }%`,
                            background: range.includes("90")
                              ? "#22c55e"
                              : range.includes("80")
                              ? "#3b82f6"
                              : range.includes("70")
                              ? "#f59e0b"
                              : range.includes("60")
                              ? "#f97316"
                              : "#ef4444",
                          }}
                        ></div>
                      </div>
                      <span className="analytics-dist-count">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="analytics-section">
              <h3 className="analytics-section-subtitle">Time Distribution</h3>
              <div className="analytics-distribution-list">
                {Object.entries(analytics.performance.timeDistribution).map(
                  ([range, count]) => (
                    <div key={range} className="analytics-distribution-item">
                      <span className="analytics-dist-label">{range}</span>
                      <div className="analytics-dist-bar-container">
                        <div
                          className="analytics-dist-bar"
                          style={{
                            width: `${
                              (count / analytics.overview.completed) * 100 || 0
                            }%`,
                            background:
                              "linear-gradient(90deg, #06b6d4, #8b5cf6)",
                          }}
                        ></div>
                      </div>
                      <span className="analytics-dist-count">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="analytics-section">
            <h2 className="analytics-section-title">
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
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              Error Analysis
            </h2>

            <div
              className="analytics-stats-grid"
              style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
            >
              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#ef4444" }}
                >
                  {analytics.quality.totalErrors}
                </div>
                <div className="analytics-stat-label">Total Errors</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#f59e0b" }}
                >
                  {analytics.quality.averageErrors.toFixed(1)}
                </div>
                <div className="analytics-stat-label">Avg per Student</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#f97316" }}
                >
                  {analytics.quality.syntaxErrors}
                </div>
                <div className="analytics-stat-label">Syntax Errors</div>
              </div>

              <div className="analytics-stat-card">
                <div
                  className="analytics-stat-value"
                  style={{ color: "#dc2626" }}
                >
                  {analytics.quality.runtimeErrors}
                </div>
                <div className="analytics-stat-label">Runtime Errors</div>
              </div>
            </div>
          </div>

          {/* Plagiarism Detection */}
          <div className="analytics-section">
            <h2 className="analytics-section-title">
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
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              Plagiarism Analysis
            </h2>

            <div className="analytics-grid-3">
              <div className="analytics-plagiarism-card high">
                <div className="analytics-plag-value">
                  {analytics.plagiarism.highSimilarity}
                </div>
                <div className="analytics-plag-label">
                  High Similarity (&gt;80%)
                </div>
              </div>

              <div className="analytics-plagiarism-card medium">
                <div className="analytics-plag-value">
                  {analytics.plagiarism.mediumSimilarity}
                </div>
                <div className="analytics-plag-label">
                  Medium Similarity (60-80%)
                </div>
              </div>

              <div className="analytics-plagiarism-card low">
                <div className="analytics-plag-value">
                  {analytics.plagiarism.lowSimilarity}
                </div>
                <div className="analytics-plag-label">
                  Low Similarity (&lt;60%)
                </div>
              </div>
            </div>

            {analytics.plagiarism.flaggedStudents.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <h4
                  style={{
                    color: "#ef4444",
                    marginBottom: "1rem",
                    fontSize: "1rem",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Flagged Students (
                  {analytics.plagiarism.flaggedStudents.length})
                </h4>
                <div className="analytics-flagged-list">
                  {analytics.plagiarism.flaggedStudents.map(
                    (student, index) => (
                      <div key={index} className="analytics-flagged-item">
                        <span>{student.name}</span>
                        <span className="analytics-similarity-badge">
                          {student.similarity}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Question-wise Analysis */}
          {analytics.questions.length > 0 && (
            <div className="analytics-section">
              <h2 className="analytics-section-title">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Question Performance
              </h2>

              <div className="analytics-table-scroll">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Attempts</th>
                      <th>Correct</th>
                      <th>Success Rate</th>
                      <th>Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.questions.map((q, index) => (
                      <tr key={q.question_id}>
                        <td>
                          <div style={{ fontWeight: 600, color: "#e2e8f0" }}>
                            Q{index + 1}: {q.title}
                          </div>
                        </td>
                        <td>{q.attemptCount}</td>
                        <td style={{ color: "#22c55e", fontWeight: 600 }}>
                          {q.correctCount}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <div className="analytics-mini-progress">
                              <div
                                className="analytics-mini-progress-fill"
                                style={{
                                  width: `${q.successRate}%`,
                                  background:
                                    q.successRate > 70
                                      ? "#22c55e"
                                      : q.successRate > 50
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                              ></div>
                            </div>
                            <span style={{ fontWeight: 600, minWidth: "45px" }}>
                              {q.successRate}%
                            </span>
                          </div>
                        </td>
                        <td>{Math.floor(q.averageTime)} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .analytics-fade-in {
          animation: fadeIn 0.6s ease-out both;
        }

        .analytics-dashboard-card {
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.9) 0%,
            rgba(30, 41, 59, 0.8) 100%
          );
          backdrop-filter: blur(20px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .analytics-section {
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .analytics-section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #06b6d4;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .analytics-section-subtitle {
          font-size: 1rem;
          font-weight: 600;
          color: #06b6d4;
          margin-bottom: 1rem;
        }

        .analytics-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .analytics-stat-card {
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.8) 0%,
            rgba(30, 41, 59, 0.6) 100%
          );
          backdrop-filter: blur(15px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .analytics-stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(6, 182, 212, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .analytics-stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .analytics-stat-label {
          color: #94a3b8;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .analytics-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }

        .analytics-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .analytics-distribution-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .analytics-distribution-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .analytics-dist-label {
          min-width: 100px;
          font-size: 0.875rem;
          color: #e2e8f0;
          font-weight: 500;
        }

        .analytics-dist-bar-container {
          flex: 1;
          height: 32px;
          background: rgba(30, 41, 59, 0.6);
          border-radius: 6px;
          overflow: hidden;
        }

        .analytics-dist-bar {
          height: 100%;
          transition: width 0.8s ease;
          border-radius: 6px;
        }

        .analytics-dist-count {
          min-width: 40px;
          text-align: right;
          font-weight: 600;
          color: #06b6d4;
        }

        .analytics-plagiarism-card {
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.8),
            rgba(30, 41, 59, 0.6)
          );
          border: 2px solid;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .analytics-plagiarism-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
        }

        .analytics-plagiarism-card.high {
          border-color: rgba(239, 68, 68, 0.5);
        }

        .analytics-plagiarism-card.medium {
          border-color: rgba(251, 191, 36, 0.5);
        }

        .analytics-plagiarism-card.low {
          border-color: rgba(34, 197, 94, 0.5);
        }

        .analytics-plag-value {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .analytics-plagiarism-card.high .analytics-plag-value {
          color: #ef4444;
        }

        .analytics-plagiarism-card.medium .analytics-plag-value {
          color: #f59e0b;
        }

        .analytics-plagiarism-card.low .analytics-plag-value {
          color: #22c55e;
        }

        .analytics-plag-label {
          color: #94a3b8;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .analytics-flagged-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .analytics-flagged-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
        }

        .analytics-similarity-badge {
          padding: 0.25rem 0.75rem;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 12px;
          font-weight: 600;
          color: #fca5a5;
          font-size: 0.875rem;
        }

        .analytics-table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        .analytics-table {
          width: 100%;
          border-collapse: collapse;
        }

        .analytics-table th {
          background: linear-gradient(
            135deg,
            rgba(30, 41, 59, 0.9),
            rgba(15, 23, 42, 0.9)
          );
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          color: #e2e8f0;
          border-bottom: 1px solid rgba(71, 85, 105, 0.3);
          white-space: nowrap;
        }

        .analytics-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(71, 85, 105, 0.2);
          color: #94a3b8;
        }

        .analytics-table tr:hover {
          background: rgba(6, 182, 212, 0.05);
        }

        .analytics-mini-progress {
          flex: 1;
          height: 8px;
          background: rgba(71, 85, 105, 0.3);
          border-radius: 4px;
          overflow: hidden;
        }

        .analytics-mini-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s ease;
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @media (max-width: 1024px) {
          .analytics-grid-2 {
            grid-template-columns: 1fr;
          }

          .analytics-grid-3 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .analytics-dashboard-card {
            padding: 1rem;
          }

          .analytics-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .analytics-stat-value {
            font-size: 2rem;
          }
        }

        @media (max-width: 480px) {
          .analytics-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default TestAnalytics;

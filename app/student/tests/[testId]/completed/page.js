"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import "../../../style.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function TestCompleted() {
  const params = useParams();
  const router = useRouter();
  const { testId } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadTestData();
  }, [testId]);

  const loadTestData = async () => {
    const studentId = localStorage.getItem("student_id");

    if (!studentId) {
      router.push("/auth/student");
      return;
    }

    setIsLoading(true);

    try {
      // Fetch test details
      const testResponse = await fetch(`${API_BASE_URL}/test/${testId}`);
      const testResult = await testResponse.json();

      if (!testResponse.ok || !testResult.success) {
        throw new Error("Failed to load test");
      }

      // Fetch submission data
      const submissionResponse = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/submission`
      );
      const submissionResult = await submissionResponse.json();

      if (!submissionResponse.ok || !submissionResult.success) {
        throw new Error("Failed to load submission");
      }

      setTestData(testResult.data.test);
      setSubmissionData(submissionResult.data);
    } catch (err) {
      console.error("Load error:", err);
      router.push("/student");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCode = () => {
    if (!submissionData?.code) return;

    const blob = new Blob([submissionData.code], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const extension =
      testData?.language === "python"
        ? "py"
        : testData?.language === "java"
        ? "java"
        : testData?.language === "cpp"
        ? "cpp"
        : "c";

    a.download = `${testId}_solution.${extension}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <LoadingOverlay
        active={true}
        message="Loading..."
        type="spinner"
        blur={true}
      />
    );
  }

  if (!testData || !submissionData) {
    return null;
  }

  return (
    <div className="student-app-container">
      <header className="student-header">
        <div className="student-header-content">
          <div className="student-logo-section">
            <div>
              <h1 className="student-logo-title">CodeTest Pro</h1>
              <span className="student-logo-subtitle">Test Completed</span>
            </div>
          </div>

          <div className="student-profile-section">
            <button
              className="student-logout-btn"
              onClick={() => router.push("/student")}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="student-completion-container">
        <div className="student-fade-in">
          <div className="student-completion-icon">🎉</div>
          <h1 className="student-completion-title">
            Test Submitted Successfully!
          </h1>
          <p className="student-completion-subtitle">
            Your solution has been saved and is awaiting faculty evaluation.
          </p>

          {/* Completion Stats */}
          <div className="student-completion-stats">
            <div
              className="student-completion-stat"
              style={{ animationDelay: "0s" }}
            >
              <div
                className="student-completion-stat-value"
                style={{ color: "var(--student-primary-blue)" }}
              >
                {submissionData.duration || 0} min
              </div>
              <div className="student-completion-stat-label">Time Taken</div>
            </div>

            <div
              className="student-completion-stat"
              style={{ animationDelay: "0.2s" }}
            >
              <div
                className="student-completion-stat-value"
                style={{
                  color:
                    submissionData.executed === 0
                      ? "var(--student-success-color)"
                      : "var(--student-warning-color)",
                }}
              >
                {submissionData.executed === 0 ? "✓" : "✗"}
              </div>
              <div className="student-completion-stat-label">
                {submissionData.executed === 0
                  ? "Executed Successfully"
                  : "Not Executed"}
              </div>
            </div>

            <div
              className="student-completion-stat"
              style={{ animationDelay: "0.4s" }}
            >
              <div
                className="student-completion-stat-value"
                style={{ color: "var(--student-primary-blue)" }}
              >
                {submissionData.attempt || 1}/{testData.max_attempts}
              </div>
              <div className="student-completion-stat-label">Attempt</div>
            </div>
          </div>

          {/* Code Preview */}
          {submissionData.code && (
            <div className="student-code-preview">
              <div className="student-code-preview-header">
                <h3 className="student-panel-title">Final Code Submission</h3>
              </div>
              <div className="student-code-preview-content">
                <pre className="student-final-code">{submissionData.code}</pre>
              </div>
            </div>
          )}

          {/* Status Message */}
          <div
            style={{
              background:
                submissionData.executed === 0
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(251, 191, 36, 0.1)",
              border: `1px solid ${
                submissionData.executed === 0
                  ? "var(--student-success-color)"
                  : "var(--student-border-warning)"
              }`,
              borderRadius: "16px",
              padding: "var(--student-space-xl)",
              textAlign: "center",
              marginBottom: "var(--student-space-xl)",
            }}
          >
            <div
              style={{
                color:
                  submissionData.executed === 0
                    ? "var(--student-success-color)"
                    : "var(--student-warning-color)",
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: "var(--student-space-sm)",
              }}
            >
              {submissionData.executed === 0
                ? "✅ Code Executed Successfully"
                : "⚠️ Code Not Executed / Failed"}
            </div>
            <p
              style={{
                color: "var(--student-text-muted)",
                marginBottom: "0.5rem",
              }}
            >
              Your professor will review your submission and provide feedback.
              Results will be available in your dashboard once grading is
              complete.
            </p>
            {isClient && (
              <p
                style={{
                  color: "var(--student-text-muted)",
                  fontSize: "0.875rem",
                  marginTop: "var(--student-space-sm)",
                }}
              >
                Submitted at:{" "}
                {new Date(submissionData.submitted_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="student-completion-actions">
            <button
              className="student-completion-btn primary"
              onClick={() => router.push("/student")}
            >
              🏠 Back to Dashboard
            </button>
            {submissionData.code && (
              <button
                className="student-completion-btn secondary"
                onClick={downloadCode}
              >
                💾 Download Code
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

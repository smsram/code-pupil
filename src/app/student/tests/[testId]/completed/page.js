"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [error, setError] = useState(null);

  // Memoize the loader so effects and props can safely depend on it
  const loadTestData = useCallback(async () => {
    const studentId = localStorage.getItem("student_id");
    if (!studentId) {
      router.push("/auth/student");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch test details
      const testResponse = await fetch(`${API_BASE_URL}/test/${testId}`);
      const testResult = await testResponse.json();
      
      console.log('[COMPLETED] Test response:', testResult);
      
      if (!testResponse.ok || !testResult.success) {
        throw new Error(testResult.message || "Failed to load test");
      }

      // Fetch submission data
      const submissionResponse = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/submission`
      );
      const submissionResult = await submissionResponse.json();
      
      console.log('[COMPLETED] Submission response:', submissionResult);
      
      if (!submissionResponse.ok || !submissionResult.success) {
        throw new Error(submissionResult.message || "Failed to load submission");
      }

      setTestData(testResult.data.test);
      setSubmissionData(submissionResult.data);
    } catch (err) {
      console.error("[COMPLETED] Load error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [router, testId]);

  // Mount effect: mark client and load data; depend on the memoized function
  useEffect(() => {
    setIsClient(true);
    loadTestData();
  }, [loadTestData]);

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

  // Show error state
  if (error) {
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
          <div className="student-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: 'var(--student-warning-color)', marginBottom: '1rem' }}>
              Unable to Load Submission
            </h2>
            <p style={{ color: 'var(--student-text-muted)', marginBottom: '2rem' }}>
              {error}
            </p>
            <button 
              className="student-completion-btn primary"
              onClick={() => router.push("/student")}
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!testData || !submissionData) {
    return null;
  }

  // Check if test was left incomplete
  const isLeftIncomplete = submissionData.status === 'left';

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
          <div className="student-completion-icon">
            {isLeftIncomplete ? '⚠️' : '🎉'}
          </div>
          <h1 className="student-completion-title">
            {isLeftIncomplete ? 'Test Left Incomplete!' : 'Test Submitted Successfully!'}
          </h1>
          <p className="student-completion-subtitle">
            {isLeftIncomplete 
              ? 'The test was started but not submitted. Your progress has been saved.'
              : 'Your solution has been saved and is awaiting faculty evaluation.'}
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
                  color: isLeftIncomplete
                    ? "var(--student-warning-color)"
                    : submissionData.executed === 0
                    ? "var(--student-success-color)"
                    : "var(--student-warning-color)",
                }}
              >
                {isLeftIncomplete ? "⚠" : submissionData.executed === 0 ? "✓" : "✗"}
              </div>
              <div className="student-completion-stat-label">
                {isLeftIncomplete 
                  ? "Not Submitted"
                  : submissionData.executed === 0
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
                <h3 className="student-panel-title">
                  {isLeftIncomplete ? 'Last Saved Code' : 'Final Code Submission'}
                </h3>
              </div>
              <div className="student-code-preview-content">
                <pre className="student-final-code">{submissionData.code}</pre>
              </div>
            </div>
          )}

          {/* Status Message */}
          <div
            style={{
              background: isLeftIncomplete
                ? "rgba(251, 191, 36, 0.1)"
                : submissionData.executed === 0
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(251, 191, 36, 0.1)",
              border: `1px solid ${
                isLeftIncomplete
                  ? "var(--student-border-warning)"
                  : submissionData.executed === 0
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
                color: isLeftIncomplete
                  ? "var(--student-warning-color)"
                  : submissionData.executed === 0
                  ? "var(--student-success-color)"
                  : "var(--student-warning-color)",
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: "var(--student-space-sm)",
              }}
            >
              {isLeftIncomplete
                ? "⚠️ Test Was Started But Left Incomplete"
                : submissionData.executed === 0
                ? "✅ Code Executed Successfully"
                : "⚠️ Code Not Executed / Failed"}
            </div>
            <p
              style={{
                color: "var(--student-text-muted)",
                marginBottom: "0.5rem",
              }}
            >
              {isLeftIncomplete
                ? "Your progress has been saved but the test was not formally submitted. Contact your professor if you need clarification."
                : "Your professor will review your submission and provide feedback. Results will be available in your dashboard once grading is complete."}
            </p>
            {isClient && submissionData.submitted_at && (
              <p
                style={{
                  color: "var(--student-text-muted)",
                  fontSize: "0.875rem",
                  marginTop: "var(--student-space-sm)",
                }}
              >
                {isLeftIncomplete ? 'Last active at:' : 'Submitted at:'}{" "}
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

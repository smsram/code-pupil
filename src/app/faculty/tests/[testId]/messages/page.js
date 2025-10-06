"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/app/components/Notification";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import { useConfirm } from "@/app/components/ConfirmDialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Message templates
const MESSAGE_TEMPLATES = [
  {
    id: 1,
    title: "⏰ Time Reminder",
    text: "You have 15 minutes remaining. Please complete your test.",
  },
  {
    id: 2,
    title: "💡 Tip",
    text: "Remember to save your code frequently and test it before submitting.",
  },
  {
    id: 3,
    title: "🎯 Focus",
    text: "Stay focused and do your best! You've got this!",
  },
  {
    id: 4,
    title: "⚠️ Warning",
    text: "Please avoid copying code from external sources. Plagiarism will be detected.",
  },
  {
    id: 5,
    title: "✅ Encouragement",
    text: "Great work! Keep going and finish strong!",
  },
  {
    id: 6,
    title: "📝 Submit Reminder",
    text: "Don't forget to click Submit when you're done!",
  },
];

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

// Format batch info
const formatBatchInfo = (branch, section, startYear) => {
  const start = parseInt(startYear);
  const end = start + 4;
  return `${branch} - ${section} Batch ${start}-${end}`;
};

export default function TestMessages() {
  const params = useParams();
  const router = useRouter();
  const { testId } = params;
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();

  const [isLoading, setIsLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [liveMessageText, setLiveMessageText] = useState("");
  const [isSendingLive, setIsSendingLive] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 500;

  useEffect(() => {
    loadTestData();
    loadMessageHistory();
  }, [testId]);

  useEffect(() => {
    setCharCount(liveMessageText.length);
  }, [liveMessageText]);

  const loadTestData = useCallback(async () => {
    const facultyId = localStorage.getItem("faculty_id");
    if (!facultyId) {
      error("Please login", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    setIsLoading(true);
    try {
      const testResponse = await fetch(`${API_BASE_URL}/test/${testId}`);
      const testResult = await testResponse.json();

      if (!testResponse.ok || !testResult.success) {
        throw new Error("Failed to load test");
      }
      setTest(testResult.data.test);
    } catch (err) {
      console.error("Load error:", err);
      error("Failed to load test data", "Error");
      router.push("/faculty/tests");
    } finally {
      setIsLoading(false);
    }
  }, [error, router, testId]);

  const loadMessageHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/message-history`
      );
      const data = await response.json();
      if (response.ok && data.success) {
        setMessageHistory(data.data || []);
      }
    } catch (err) {
      console.error("Load history error:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [testId]);

  useEffect(() => {
    loadTestData();
    loadMessageHistory();
  }, [testId, loadTestData, loadMessageHistory]);

  const sendLiveMessage = async () => {
    if (!liveMessageText.trim()) {
      warning("Please enter a message", "Empty Message");
      return;
    }

    if (charCount > MAX_CHARS) {
      warning(`Message too long! Maximum ${MAX_CHARS} characters.`, "Too Long");
      return;
    }

    const confirmed = await confirm({
      title: "Send Live Message?",
      message: `Send this message to all students taking the test?\n\n"${liveMessageText.trim()}"`,
      confirmText: "Send",
      cancelText: "Cancel",
      type: "info",
    });

    if (!confirmed) return;

    setIsSendingLive(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/live-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: liveMessageText.trim() }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        success("Live message sent to all students!", "Message Sent");
        setLiveMessageText("");
        loadMessageHistory(); // Refresh history
      } else {
        error(data.message || "Failed to send message", "Error");
      }
    } catch (err) {
      console.error("Send message error:", err);
      error("Unable to send message", "Network Error");
    } finally {
      setIsSendingLive(false);
    }
  };

  const useTemplate = (template) => {
    setLiveMessageText(template.text);
    setShowTemplates(false);
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

  if (!test) return null;

  return (
    <>
      <LoadingOverlay
        active={isSendingLive}
        message="Sending message..."
        type="spinner"
        blur={true}
      />

      <div className="messages-fade-in" style={{ pointerEvents: "auto" }}>
        <div
          className="messages-dashboard-card"
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
            <h1
              style={{
                color: "#06b6d4",
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              Live Messages
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
                {test.title}
              </span>
              <span style={{ color: "#94a3b8" }}>
                {formatBatchInfo(test.branch, test.section, test.start_year)}
              </span>
            </div>
          </div>

          {/* Send Message Section */}
          <div className="messages-section">
            <h2 className="messages-section-title">
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Compose Message
            </h2>

            {/* Message Templates */}
            <div style={{ marginBottom: "1.5rem" }}>
              <button
                className="messages-template-toggle"
                onClick={() => setShowTemplates(!showTemplates)}
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                {showTemplates ? "Hide Templates" : "Show Message Templates"}
              </button>

              {showTemplates && (
                <div className="messages-templates-grid">
                  {MESSAGE_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="messages-template-card"
                      onClick={() => useTemplate(template)}
                    >
                      <div className="messages-template-title">
                        {template.title}
                      </div>
                      <div className="messages-template-text">
                        {template.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <textarea
              value={liveMessageText}
              onChange={(e) => setLiveMessageText(e.target.value)}
              placeholder="Type your message here... (e.g., 'You have 15 minutes remaining')"
              maxLength={MAX_CHARS}
              className="messages-textarea"
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  color: charCount > MAX_CHARS ? "#ef4444" : "#94a3b8",
                }}
              >
                {charCount} / {MAX_CHARS} characters
              </span>
            </div>

            <button
              onClick={sendLiveMessage}
              disabled={
                isSendingLive ||
                !liveMessageText.trim() ||
                charCount > MAX_CHARS
              }
              className="messages-send-btn"
            >
              <svg
                style={{ width: "20px", height: "20px" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              {isSendingLive ? "Sending..." : "Send Live Message"}
            </button>
          </div>

          {/* Message History */}
          <div className="messages-section">
            <h2 className="messages-section-title">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Message History
            </h2>

            {isLoadingHistory ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#94a3b8",
                }}
              >
                Loading history...
              </div>
            ) : messageHistory.length === 0 ? (
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    marginBottom: "0.5rem",
                    color: "#e2e8f0",
                  }}
                >
                  No Messages Yet
                </h3>
                <p>Messages sent during this test will appear here</p>
              </div>
            ) : (
              <div className="messages-history-list">
                {messageHistory.map((msg, index) => (
                  <div key={index} className="messages-history-item">
                    <div className="messages-history-icon">📤</div>
                    <div className="messages-history-content">
                      <div className="messages-history-text">{msg.message}</div>
                      <div className="messages-history-time">
                        {formatDateTime(msg.sent_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="messages-info-box">
            <svg
              style={{ width: "20px", height: "20px", flexShrink: 0 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <strong>Note:</strong> Messages are sent instantly to all students
              currently taking the test. Students will see a notification banner
              with your message.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .messages-fade-in {
          animation: fadeIn 0.6s ease-out both;
        }

        .messages-dashboard-card {
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

        .messages-section {
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .messages-section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #06b6d4;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .messages-template-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 8px;
          color: #06b6d4;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .messages-template-toggle:hover {
          background: rgba(6, 182, 212, 0.1);
          border-color: rgba(6, 182, 212, 0.5);
        }

        .messages-templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .messages-template-card {
          padding: 1rem;
          background: linear-gradient(
            135deg,
            rgba(30, 41, 59, 0.8),
            rgba(15, 23, 42, 0.6)
          );
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .messages-template-card:hover {
          transform: translateY(-3px);
          border-color: rgba(6, 182, 212, 0.5);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .messages-template-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #06b6d4;
          margin-bottom: 0.5rem;
        }

        .messages-template-text {
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .messages-textarea {
          width: 100%;
          min-height: 150px;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 0.5rem;
          transition: all 0.3s ease;
        }

        .messages-textarea:focus {
          outline: none;
          border-color: rgba(6, 182, 212, 0.5);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .messages-send-btn {
          width: 100%;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .messages-send-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0891b2, #06b6d4);
          transform: scale(1.02);
        }

        .messages-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .messages-history-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .messages-history-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 8px;
          border: 1px solid rgba(71, 85, 105, 0.2);
        }

        .messages-history-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .messages-history-content {
          flex: 1;
        }

        .messages-history-text {
          color: #e2e8f0;
          font-size: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }

        .messages-history-time {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .messages-info-box {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .messages-dashboard-card {
            padding: 1rem;
          }

          .messages-templates-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

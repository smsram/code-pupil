"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/app/components/Notification";
import LoadingOverlay from "@/app/components/LoadingOverlay";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const EditTest = () => {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId;
  const { success, error, warning } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading test...");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    language: "",
    startYear: "",
    branch: "",
    section: "",
    description: "",
    date: "",
    time: "",
    duration: 90,
    maxAttempts: 3,
    similarityThreshold: 80,
    fullscreenMode: true,
    autoSubmit: true,
    showResults: false,
    waitUntilEnd: false,
    allowCopy: true,
    allowPaste: false,
  });
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [originalStatus, setOriginalStatus] = useState("");

  // Track first load to control overlay/errors without depending on state
  const isFirstLoadRef = useRef(true);

  const fetchTestDetails = useCallback(async () => {
    const facultyId = localStorage.getItem("faculty_id");

    if (!facultyId) {
      error("Please login to edit test", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    if (isFirstLoadRef.current) {
      setIsLoading(true);
      setLoadingMessage("Loading test details...");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const test = data.data.test;

        const startTime = new Date(test.start_time);
        const date = startTime.toISOString().split("T")[0];
        const time = startTime.toTimeString().slice(0, 5);

        setFormData({
          title: test.title,
          language: test.language,
          startYear: test.start_year,
          branch: test.branch,
          section: test.section.toString(),
          description: test.description || "",
          date,
          time,
          duration: test.duration,
          maxAttempts: test.max_attempts,
          similarityThreshold: test.similarity_threshold,
          fullscreenMode: test.fullscreen_mode === 1,
          autoSubmit: test.auto_submit === 1,
          showResults: test.show_results === 1,
          waitUntilEnd: test.wait_until_end === 1,
          allowCopy: test.allow_copy === 1,
          allowPaste: test.allow_paste === 1,
        });

        setOriginalStatus(test.status);
        setScheduledMessages(data.data.scheduledMessages || []);
      } else {
        if (isFirstLoadRef.current) {
          error(data.message || "Failed to fetch test details", "Error");
          router.push("/faculty/tests");
        }
      }
    } catch (err) {
      if (isFirstLoadRef.current) {
        console.error("Fetch test error:", err);
        error("Unable to connect to server", "Network Error");
        router.push("/faculty/tests");
      }
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [error, router, testId, API_BASE_URL]);

  useEffect(() => {
    if (testId) {
      fetchTestDetails();
    }
  }, [testId, fetchTestDetails]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addScheduledMessage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setScheduledMessages((prev) => [
      ...prev,
      { time_minutes: "", message: "" },
    ]);
  };

  const removeScheduledMessage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setScheduledMessages((prev) => prev.filter((_, i) => i !== index));
  };

  const updateScheduledMessage = (index, field, value) => {
    setScheduledMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, [field]: value } : msg))
    );
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      error("Please enter a test title", "Validation Error");
      return false;
    }
    if (!formData.language) {
      error("Please select a programming language", "Validation Error");
      return false;
    }
    if (!formData.startYear) {
      error("Please select a start year", "Validation Error");
      return false;
    }
    if (!formData.branch) {
      error("Please select a branch", "Validation Error");
      return false;
    }
    if (!formData.section || formData.section < 1) {
      error("Please enter a valid section number", "Validation Error");
      return false;
    }
    if (!formData.date) {
      error("Please select a test date", "Validation Error");
      return false;
    }
    if (!formData.time) {
      error("Please select a start time", "Validation Error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (status) => {
    if (!validateForm()) return;

    const facultyId = localStorage.getItem("faculty_id");

    if (!facultyId) {
      error("Please login to update test", "Authentication Required");
      router.push("/auth/faculty");
      return;
    }

    setIsSaving(true);
    setLoadingMessage(
      status === "published" ? "Publishing test..." : "Saving changes..."
    );

    try {
      const response = await fetch(`${API_BASE_URL}/test/${testId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyId: parseInt(facultyId),
          title: formData.title,
          language: formData.language,
          startYear: formData.startYear,
          branch: formData.branch,
          section: formData.section,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          maxAttempts: formData.maxAttempts,
          similarityThreshold: formData.similarityThreshold,
          fullscreenMode: formData.fullscreenMode,
          autoSubmit: formData.autoSubmit,
          showResults: formData.showResults,
          waitUntilEnd: formData.waitUntilEnd,
          allowCopy: formData.allowCopy,
          allowPaste: formData.allowPaste,
          status,
          scheduledMessages: scheduledMessages
            .filter((msg) => msg.time_minutes && msg.message)
            .map((msg) => ({
              message_id: msg.message_id,
              time_minutes: msg.time_minutes,
              message: msg.message,
            })),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLoadingMessage("Success! Redirecting...");
        success(
          data.message,
          status === "published" ? "Test Published" : "Changes Saved"
        );
        setTimeout(() => {
          setIsSaving(false);
          router.push(`/faculty/tests/${testId}`);
        }, 1500);
      } else {
        setIsSaving(false);
        error(data.message || "Failed to update test", "Error");
      }
    } catch (err) {
      console.error("Test update error:", err);
      setIsSaving(false);
      error(
        "Unable to connect to server. Please check your connection.",
        "Network Error"
      );
    }
  };

  const handleSaveChanges = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(originalStatus);
  };

  const handlePublish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit("published");
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/faculty/tests/${testId}`);
  };

  if (isLoading) {
    return (
      <LoadingOverlay
        active={isLoading}
        message={loadingMessage}
        type="spinner"
        blur={true}
      />
    );
  }

  return (
    <>
      <LoadingOverlay
        active={isSaving}
        message={loadingMessage}
        type="spinner"
        blur={true}
      />
      return (
      <>
        <LoadingOverlay
          active={isSaving}
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

            <h2
              style={{
                color: "#06b6d4",
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: "2rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <svg
                className="icon"
                style={{ width: "32px", height: "32px" }}
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
              Edit Programming Test
            </h2>

            <form
              style={{ display: "grid", gap: "2rem", pointerEvents: "auto" }}
            >
              {/* Title and Language */}
              <div className="grid-2">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Test Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="search-input"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "text",
                    }}
                    placeholder="e.g., Advanced Data Structures Final Exam"
                    value={formData.title}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Programming Language *
                  </label>
                  <select
                    name="language"
                    className="filter-select"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "pointer",
                    }}
                    value={formData.language}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  >
                    <option value="">Select Language</option>
                    <option value="python">🐍 Python</option>
                    <option value="java">☕ Java</option>
                    <option value="cpp">⚡ C++</option>
                    <option value="c">🔧 C</option>
                    <option value="csharp">🟣 C#</option>
                  </select>
                </div>
              </div>

              {/* Batch Details */}
              <div className="grid-3">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Start Year *
                  </label>
                  <select
                    name="startYear"
                    className="filter-select"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "pointer",
                    }}
                    value={formData.startYear}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Branch *
                  </label>
                  <select
                    name="branch"
                    className="filter-select"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "pointer",
                    }}
                    value={formData.branch}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  >
                    <option value="">Select Branch</option>
                    <option value="CSM">CSM - AI and ML</option>
                    <option value="CSE">
                      CSE - Computer Science & Engineering
                    </option>
                    <option value="CDS">CDS - Data Science</option>
                    <option value="CSC">CSC - Cybersecurity</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Section *
                  </label>
                  <input
                    type="number"
                    name="section"
                    className="search-input"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "text",
                    }}
                    placeholder="e.g., 1"
                    min="1"
                    max="20"
                    value={formData.section}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 500,
                    color: "#e2e8f0",
                  }}
                >
                  Task Description & Instructions
                </label>
                <textarea
                  name="description"
                  className="form-textarea"
                  style={{
                    width: "100%",
                    height: "120px",
                    pointerEvents: "auto",
                    cursor: "text",
                  }}
                  placeholder="Provide detailed instructions, problem statements, expected outputs, constraints, and any additional information students need to complete the test..."
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
              </div>

              {/* Date, Time, Duration */}
              <div className="grid-3">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Test Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    className="search-input"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "text",
                    }}
                    value={formData.date}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Start Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    className="search-input"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "text",
                    }}
                    value={formData.time}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    className="search-input"
                    style={{
                      width: "100%",
                      pointerEvents: "auto",
                      cursor: "text",
                    }}
                    min="15"
                    max="300"
                    value={formData.duration}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                  />
                </div>
              </div>

              {/* Advanced Configuration - Same as create page */}
              <div
                className="dashboard-card"
                style={{
                  background: "rgba(30, 41, 59, 0.3)",
                  margin: 0,
                  pointerEvents: "auto",
                }}
              >
                <h4
                  style={{
                    color: "#06b6d4",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                  }}
                >
                  Advanced Configuration
                </h4>

                <div className="grid-2">
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                        color: "#e2e8f0",
                      }}
                    >
                      Maximum Attempts per Student
                    </label>
                    <input
                      type="number"
                      name="maxAttempts"
                      className="search-input"
                      style={{
                        width: "100%",
                        pointerEvents: "auto",
                        cursor: "text",
                      }}
                      min="1"
                      max="10"
                      value={formData.maxAttempts}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                        color: "#e2e8f0",
                      }}
                    >
                      Similarity Threshold (%)
                    </label>
                    <input
                      type="number"
                      name="similarityThreshold"
                      className="search-input"
                      style={{
                        width: "100%",
                        pointerEvents: "auto",
                        cursor: "text",
                      }}
                      min="50"
                      max="100"
                      value={formData.similarityThreshold}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Checkboxes - Same as create */}
                <div style={{ marginTop: "1rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="fullscreenMode"
                      checked={formData.fullscreenMode}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      style={{ cursor: "pointer", pointerEvents: "auto" }}
                    />
                    <span style={{ color: "#e2e8f0" }}>
                      Full screen exam mode
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="autoSubmit"
                      checked={formData.autoSubmit}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      style={{ cursor: "pointer", pointerEvents: "auto" }}
                    />
                    <span style={{ color: "#e2e8f0" }}>
                      Auto-submit when time expires
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="showResults"
                      checked={formData.showResults}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      style={{ cursor: "pointer", pointerEvents: "auto" }}
                    />
                    <span style={{ color: "#e2e8f0" }}>
                      Allow students to view results after completion
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="waitUntilEnd"
                      checked={formData.waitUntilEnd}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      style={{ cursor: "pointer", pointerEvents: "auto" }}
                    />
                    <span style={{ color: "#e2e8f0" }}>
                      Wait until exam ends (no submit button enabled)
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="allowCopy"
                      checked={formData.allowCopy}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      style={{ cursor: "pointer", pointerEvents: "auto" }}
                    />
                    <span style={{ color: "#e2e8f0" }}>Allow copy</span>
                  </label>
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="allowPaste"
                      checked={formData.allowPaste}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      style={{ cursor: "pointer", pointerEvents: "auto" }}
                    />
                    <span style={{ color: "#e2e8f0" }}>Allow paste</span>
                  </label>
                </div>
              </div>

              {/* Scheduled Messages - Same structure as create */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 500,
                    color: "#e2e8f0",
                  }}
                >
                  Scheduled Messages (Optional)
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  {scheduledMessages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(120px, auto) 1fr auto",
                        gap: "1rem",
                        alignItems: "end",
                        padding: "1rem",
                        background: "rgba(30, 41, 59, 0.3)",
                        borderRadius: "8px",
                        border: "1px solid rgba(71, 85, 105, 0.3)",
                        pointerEvents: "auto",
                      }}
                    >
                      <input
                        type="number"
                        className="search-input"
                        placeholder="Time (min)"
                        min="1"
                        max="300"
                        style={{
                          padding: "0.5rem",
                          pointerEvents: "auto",
                          cursor: "text",
                        }}
                        value={msg.time_minutes}
                        onChange={(e) =>
                          updateScheduledMessage(
                            index,
                            "time_minutes",
                            e.target.value
                          )
                        }
                        disabled={isSaving}
                      />
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Message to display to students..."
                        style={{
                          padding: "0.5rem",
                          pointerEvents: "auto",
                          cursor: "text",
                        }}
                        value={msg.message}
                        onChange={(e) =>
                          updateScheduledMessage(
                            index,
                            "message",
                            e.target.value
                          )
                        }
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        onClick={(e) => removeScheduledMessage(e, index)}
                        disabled={isSaving}
                        style={{
                          cursor: isSaving ? "not-allowed" : "pointer",
                          border: "none",
                          background: "#ef4444",
                          color: "white",
                          padding: "0.5rem 1rem",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          pointerEvents: "auto",
                          fontWeight: 600,
                          opacity: isSaving ? 0.5 : 1,
                        }}
                      >
                        <svg
                          style={{ width: "14px", height: "14px" }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addScheduledMessage}
                  disabled={isSaving}
                  style={{
                    cursor: isSaving ? "not-allowed" : "pointer",
                    border: "none",
                    background: "#06b6d4",
                    color: "white",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "14px",
                    fontWeight: 600,
                    pointerEvents: "auto",
                    opacity: isSaving ? 0.5 : 1,
                  }}
                >
                  <svg
                    style={{ width: "14px", height: "14px" }}
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
                  Add Scheduled Message
                </button>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  paddingTop: "2rem",
                  borderTop: "1px solid rgba(71, 85, 105, 0.3)",
                }}
              >
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={{
                    cursor: isSaving ? "not-allowed" : "pointer",
                    border: "1px solid rgba(71, 85, 105, 0.4)",
                    background: "rgba(71, 85, 105, 0.2)",
                    color: "#e2e8f0",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: 600,
                    pointerEvents: "auto",
                    opacity: isSaving ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    style={{
                      cursor: isSaving ? "not-allowed" : "pointer",
                      border: "none",
                      background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                      color: "#ffffff",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "8px",
                      fontSize: "15px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
                      pointerEvents: "auto",
                      opacity: isSaving ? 0.5 : 1,
                    }}
                  >
                    <svg
                      style={{ width: "18px", height: "18px" }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                    Save Changes
                  </button>

                  {originalStatus !== "published" && (
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isSaving}
                      style={{
                        cursor: isSaving ? "not-allowed" : "pointer",
                        border: "none",
                        background: "linear-gradient(135deg, #22c55e, #16a34a)",
                        color: "#ffffff",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "8px",
                        fontSize: "15px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
                        pointerEvents: "auto",
                        opacity: isSaving ? 0.5 : 1,
                      }}
                    >
                      <svg
                        style={{ width: "18px", height: "18px" }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.93 2.58m-.09-8.54a14.926 14.926 0 015.93-2.58M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Publish Now
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </>
      );
    </>
  );
};

export default EditTest;

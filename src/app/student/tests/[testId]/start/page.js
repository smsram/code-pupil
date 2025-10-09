"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNotification } from "@/app/components/Notification";
import { useConfirm } from "@/app/components/ConfirmDialog";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import CodeEditor from "@/app/components/CodeEditor";
import TestTimer from "@/app/components/TestTimer";
import "../../../style.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function TestStart() {
  const params = useParams();
  const router = useRouter();
  const { testId } = params;
  const { success, error, warning, liveMessage, scheduledMessage } =
    useNotification();
  const { confirm } = useConfirm();

  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [mobileTab, setMobileTab] = useState("code");
  const [toasts, setToasts] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const messagePollingRef = useRef(null);
  const [shownScheduledMessages] = useState(new Set());
  const [isLocked, setIsLocked] = useState(false);
  const [lockDialogShown, setLockDialogShown] = useState(false);
  const isPollingRef = useRef(false);
  const lastLockStateRef = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const [consoleOutput, setConsoleOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");

  const codeEditorRef = useRef(null);
  const consoleRef = useRef(null);
  const notifBtnRef = useRef(null);
  const notifMenuRef = useRef(null);
  const saveTimerRef = useRef(null);
  const lastSavedCodeRef = useRef("");
  const currentCodeRef = useRef("");
  const hasInitialized = useRef(false);
  const hasExpiredRef = useRef(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(20);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasRequestedFullscreen = useRef(false);

  // Memoized init to satisfy exhaustive-deps
  const initTestSession = useCallback(async () => {
    const studentId = localStorage.getItem("student_id");

    if (!studentId) {
      error("Please login to take test", "Authentication Required");
      router.push("/auth/student");
      return;
    }

    setIsLoading(true);

    try {
      const initResponse = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/init`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const initData = await initResponse.json();

      if (!initResponse.ok) {
        if (initData.locked) {
          error(
            `Test locked! Attempts: ${initData.currentAttempt}/${initData.maxAttempts}`,
            "Locked"
          );
          router.push(`/student/tests/${testId}`);
          return;
        }
        if (initData.completed) {
          success("Test already completed", "Completed");
          router.push(`/student/tests/${testId}/results`);
          return;
        }
        throw new Error(initData.message || "Failed to initialize test");
      }

      setCurrentAttempt(initData.currentAttempt);
      setMaxAttempts(initData.maxAttempts);

      if (initData.isReEntry) {
        warning(
          `Re-entry detected! Attempt ${initData.currentAttempt} of ${initData.maxAttempts}`,
          4000
        );
      }

      const response = await fetch(`${API_BASE_URL}/test/${testId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const startTime = new Date(data.data.test.start_time);
        const endTime = new Date(
          startTime.getTime() + data.data.test.duration * 60000
        );

        setTest({
          ...data.data.test,
          endTime: endTime.toISOString(),
        });

        if (initData.savedCode) {
          lastSavedCodeRef.current = initData.savedCode;
          currentCodeRef.current = initData.savedCode;
          setTimeout(() => {
            if (codeEditorRef.current) {
              codeEditorRef.current.setValue(initData.savedCode);
            }
          }, 500);
        }

        // Auto-enter fullscreen if required by test
        if (data.data.test.fullscreen_mode) {
          setTimeout(() => {
            enterFullscreenAuto();
          }, 500);
        }
      } else {
        error(data.message || "Failed to fetch test details", "Error");
        router.push("/student");
      }
    } catch (err) {
      console.error("Init test error:", err);
      error("Unable to connect to server", "Network Error");
      router.push("/student");
    } finally {
      setIsLoading(false);
    }
  }, [testId, router, error, success, warning]);

  useEffect(() => {
    setIsClient(true);
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initTestSession();
    }
  }, [testId, initTestSession]);

  // Add state for scheduled messages
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const shownMessageIds = useRef(new Set());

  // Load scheduled messages on mount
  useEffect(() => {
    if (!test) return;

    const loadScheduledMessages = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/test/${testId}/scheduled-messages`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setScheduledMessages(data.scheduled_messages || []);
          console.log(
            `[SCHEDULED] Loaded ${data.scheduled_messages.length} scheduled messages`
          );
        }
      } catch (err) {
        console.error("Load scheduled messages error:", err);
      }
    };

    loadScheduledMessages();
  }, [test, testId]);

  // Check scheduled messages
  useEffect(() => {
    if (!test || isSubmitted || scheduledMessages.length === 0) return;

    const checkScheduledMessages = () => {
      const testStartTime = new Date(test.start_time);
      const now = new Date();
      const elapsedMinutes = Math.floor((now - testStartTime) / 60000);

      scheduledMessages.forEach((msg) => {
        const isAtScheduledTime =
          elapsedMinutes >= msg.time_minutes &&
          elapsedMinutes <= msg.time_minutes + 0.5;

        if (
          msg.time_minutes <= elapsedMinutes &&
          !shownMessageIds.current.has(msg.message_id) &&
          isAtScheduledTime
        ) {
          shownMessageIds.current.add(msg.message_id);
          scheduledMessage(msg.message, "⏰ Reminder");
          setNotifList((prev) =>
            [
              {
                id: `scheduled-${msg.message_id}`,
                type: "info",
                message: `⏰ Scheduled: ${msg.message}`,
                ts: new Date(),
                read: false,
              },
              ...prev,
            ].slice(0, 20)
          );
        }
      });
    };

    checkScheduledMessages();
    const interval = setInterval(checkScheduledMessages, 30000);
    return () => clearInterval(interval);
  }, [scheduledMessages, test, isSubmitted, scheduledMessage]);

  // Polling useEffect
  useEffect(() => {
    if (!test || isSubmitted) return;

    let isMounted = true; // Track component mount state

    const pollLiveStatus = async () => {
      // Prevent concurrent requests
      if (isPollingRef.current) {
        return;
      }

      const studentId = localStorage.getItem("student_id");
      if (!studentId) return;

      isPollingRef.current = true;

      try {
        const response = await fetch(
          `${API_BASE_URL}/test/${testId}/student/${studentId}/live-status`,
          {
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(4000), // 4s timeout
          }
        );

        const data = await response.json();

        if (!isMounted) return; // Component unmounted, ignore response

        if (response.ok && data.success) {
          // Handle LOCK status change (only if actually changed)
          if (data.locked !== lastLockStateRef.current) {
            lastLockStateRef.current = data.locked;

            if (data.locked && !isLocked) {
              // Just got locked
              setIsLocked(true);
              console.log("🔒 [FRONTEND] Student locked by faculty");

              if (!lockDialogShown) {
                setLockDialogShown(true);
                confirm({
                  title: "🔒 Test Locked",
                  message:
                    "Your test has been locked by the instructor. Please wait for further instructions or contact support.",
                  confirmText: "Understood",
                  cancelText: "Close",
                  type: "locked",
                }).catch(() => {}); // Handle dialog close
              }
            } else if (!data.locked && isLocked) {
              // Just got unlocked
              setIsLocked(false);
              setLockDialogShown(false);
              console.log("🔓 [FRONTEND] Student unlocked by faculty");
              success(
                "✅ Your test has been unlocked. You may now continue.",
                "Test Unlocked"
              );
            }
          }

          // Handle live messages
          if (data.messages && data.messages.length > 0) {
            data.messages.forEach((msg) => {
              if (shownMessageIds.current.has(msg.message_id)) return;
              shownMessageIds.current.add(msg.message_id);

              liveMessage(msg.message, "📢 Faculty Message");
              setNotifList((prev) =>
                [
                  {
                    id: `live-${msg.message_id}`,
                    type: "warning",
                    message: `📢 Live: ${msg.message}`,
                    ts: new Date(msg.created_at),
                    read: false,
                  },
                  ...prev,
                ].slice(0, 20)
              );
            });
          }
        }
      } catch (err) {
        if (err.name !== "TimeoutError" && err.name !== "AbortError") {
          console.error("❌ [FRONTEND] Poll error:", err);
        }
      } finally {
        if (isMounted) {
          isPollingRef.current = false;
        }
      }
    };

    // Initial poll
    pollLiveStatus();

    // Set up interval (5 seconds)
    const interval = setInterval(pollLiveStatus, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      isPollingRef.current = false;
    };
  }, [
    test,
    testId,
    isSubmitted,
    liveMessage,
    success,
    isLocked,
    lockDialogShown,
    confirm,
  ]);

  // Auto-enter fullscreen on test start
  const enterFullscreenAuto = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      hasRequestedFullscreen.current = true;
      success("Fullscreen mode activated", "Success");
    } catch (err) {
      console.error("Auto fullscreen failed:", err);
      setShowFullscreenPrompt(true);
    }
  };

  const saveCodeToServer = async (code, immediate = false) => {
    if (code === lastSavedCodeRef.current) {
      return;
    }

    const studentId = localStorage.getItem("student_id");

    try {
      setIsSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/save-code`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );

      if (response.ok) {
        lastSavedCodeRef.current = code;
        console.log(
          `Code saved ${immediate ? "immediately" : "automatically"}`
        );
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleAutoSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const code = currentCodeRef.current;
      if (code && code !== lastSavedCodeRef.current) {
        saveCodeToServer(code, false);
      }
    }, 10000);
  };

  const handleCodeChange = () => {
    if (!codeEditorRef.current) return;

    const newCode = codeEditorRef.current.getValue();
    currentCodeRef.current = newCode;

    if (newCode !== lastSavedCodeRef.current) {
      scheduleAutoSave();
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Memoized confirmEndTest
  const confirmEndTest = useCallback(async () => {
    if (isSubmitted) return;

    const studentId = localStorage.getItem("student_id");
    const code = codeEditorRef.current?.getValue() || "";

    setIsLoading(true);

    try {
      let outputToSave = "";
      let executedStatus = 1;

      if (consoleOutput.length === 0) {
        outputToSave =
          "No output - The test was submitted without executing the code.";
        executedStatus = 1;
      } else {
        outputToSave = consoleOutput.map((o) => o.message).join("\n");
        const hasErrors = consoleOutput.some((o) => o.type === "error");
        executedStatus = hasErrors ? 1 : 0;
      }

      // ✅ Frontend just calls API - backend handles notification
      const response = await fetch(
        `${API_BASE_URL}/test/${testId}/student/${studentId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            output: outputToSave,
            executed: executedStatus,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSubmitted(true);
        success(`Test submitted! (Attempt ${data.attempt})`, "Submitted");

        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }

        // Backend already sent notification - just redirect
        router.push(`/student/tests/${testId}/completed`);
      } else if (response.status === 409) {
        error("Test already submitted", "Already Submitted");
        router.push(`/student/tests/${testId}/completed`);
      } else {
        error(data.message || "Failed to submit test", "Error");
      }
    } catch (err) {
      console.error("Submit test error:", err);
      error("Unable to connect to server", "Network Error");
    } finally {
      setIsLoading(false);
    }
  }, [isSubmitted, testId, router, success, error, consoleOutput]);

  // Fullscreen enforcement with warning and auto-submit
  useEffect(() => {
    if (!test || !test.fullscreen_mode) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);

      if (
        !isCurrentlyFullscreen &&
        hasRequestedFullscreen.current &&
        !isSubmitted
      ) {
        setShowFullscreenWarning(true);
        setWarningCountdown(20);

        countdownIntervalRef.current = setInterval(() => {
          setWarningCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        warning("Time expired! Auto-submitting test...", 3000);
        warningTimerRef.current = setTimeout(async () => {
          await confirmEndTest();
        }, 20000);
      } else if (isCurrentlyFullscreen) {
        if (warningTimerRef.current) {
          clearTimeout(warningTimerRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        setShowFullscreenWarning(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [test, isSubmitted, confirmEndTest, warning]);

  const enterFullscreenMode = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      hasRequestedFullscreen.current = true;
      setShowFullscreenPrompt(false);
      success("Fullscreen mode activated", "Success");
    } catch (err) {
      console.error("Fullscreen error:", err);
      error("Fullscreen permission denied", "Error");
    }
  };

  const reEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowFullscreenWarning(false);
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      success("Returned to fullscreen", "Success");
    } catch (err) {
      console.error("Fullscreen error:", err);
      error("Could not enter fullscreen", "Error");
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmitted) {
        e.preventDefault();
        e.returnValue =
          "You have an active test. Leaving will count as an attempt.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitted]);

  useEffect(() => {
    if (!test) return;

    const handleVisibilityChange = async () => {
      const studentId = localStorage.getItem("student_id");
      try {
        await fetch(
          `${API_BASE_URL}/test/${testId}/student/${studentId}/track-activity`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              activity_type: "visibility_change",
              details: { hidden: document.hidden },
            }),
          }
        );
        if (document.hidden) {
          warning("Tab switching detected!", 2000);
        }
      } catch (err) {
        console.error("Track visibility error:", err);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [test, testId, warning]);

  useEffect(() => {
    if (!test) return;

    const handleCopy = (e) => {
      if (!test.allow_copy) {
        e.preventDefault();
        warning("Copying is disabled", 2000);
      }
    };

    const handlePaste = (e) => {
      if (!test.allow_paste) {
        e.preventDefault();
        warning("Pasting is disabled", 2000);
      }
    };

    const handleCut = (e) => {
      if (!test.allow_copy) {
        e.preventDefault();
        warning("Cutting is disabled", 2000);
      }
    };

    if (!test.allow_copy || !test.allow_paste) {
      document.addEventListener("copy", handleCopy);
      document.addEventListener("paste", handlePaste);
      document.addEventListener("cut", handleCut);
    }

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
    };
  }, [test, warning]);

  useEffect(() => {
    const onClick = (e) => {
      if (!notifOpen) return;
      if (
        notifBtnRef.current &&
        notifMenuRef.current &&
        !notifBtnRef.current.contains(e.target) &&
        !notifMenuRef.current.contains(e.target)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  const notify = (type, message, durationMs = 3000) => {
    const id = Date.now() + Math.random();
    const isDuplicate = toasts.some(
      (t) => t.message === message && t.type === type
    );
    if (isDuplicate) return;

    setToasts((prev) => [...prev, { id, type, message }]);
    setNotifList((prev) =>
      [{ id, type, message, ts: new Date(), read: false }, ...prev].slice(0, 15)
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, Math.max(2000, Math.min(durationMs, 4000)));
  };

  const unreadCount = notifList.filter((n) => !n.read).length;

  const addConsoleOutput = (type, message) => {
    setConsoleOutput((prev) => {
      const newEntry = { type, message, timestamp: new Date() };
      return [...prev, newEntry];
    });

    setTimeout(() => {
      if (consoleRef.current) {
        consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
      }
    }, 30);
  };

  const clearConsole = () => setConsoleOutput([]);

  const handleRunStart = () => {
    clearConsole();
    setIsRunning(true);
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setMobileTab("output");
    }
    const currentCode = codeEditorRef.current?.getValue() || "";
    if (currentCode && currentCode !== lastSavedCodeRef.current) {
      saveCodeToServer(currentCode, true);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setWaitingForInput(false);
    if (codeEditorRef.current?.stopExecution) {
      codeEditorRef.current.stopExecution();
    }
    addConsoleOutput("warning", "Execution stopped by user\n");
    notify("warning", "Execution stopped", 2500);
  };

  const handleOutput = (type, message) => addConsoleOutput(type, message);

  const handleError = (message) => {
    setIsRunning(false);
    setWaitingForInput(false);
    const cleanMessage = String(message || "")
      .replace(/Exit code: \d+/, "")
      .trim();
    if (cleanMessage) addConsoleOutput("error", cleanMessage + "\n");
    notify("error", "Execution failed", 2500);
  };

  const handleSuccess = () => {
    setIsRunning(false);
    setWaitingForInput(false);
    notify("success", "Run successful", 2500);
  };

  const handleInputRequest = () => setWaitingForInput(true);

  const sendInput = () => {
    if (!waitingForInput || !terminalInput.trim()) return;
    const input = terminalInput.trim();
    addConsoleOutput("user-input", input + "\n");
    if (codeEditorRef.current?.sendInput) {
      codeEditorRef.current.sendInput(input);
    }
    setTerminalInput("");
    setWaitingForInput(false);
  };

  // Update the timer effect to track remaining time
  useEffect(() => {
    if (!test) return;

    const updateTimeRemaining = () => {
      const endTime = new Date(test.endTime);
      const now = new Date();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000)); // seconds
      setTimeRemaining(remaining);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [test]);

  // Update the handleSubmitTest function
  const handleSubmitTest = async () => {
    if (isSubmitted) return;

    // Check if wait_until_end is enabled and time hasn't expired
    if (test.wait_until_end && timeRemaining > 0) {
      warning(
        `You cannot submit until the test time expires. Time remaining: ${Math.floor(
          timeRemaining / 60
        )}m ${timeRemaining % 60}s`,
        "Submit Not Allowed"
      );
      return;
    }

    const confirmed = await confirm({
      title: "Submit Test?",
      message: `Are you sure you want to submit? (${currentAttempt} of ${maxAttempts})\nThis action cannot be undone.`,
      confirmText: "Submit Test",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!confirmed) return;

    await confirmEndTest();
  };

  const handleTimerExpire = async () => {
    if (hasExpiredRef.current || isSubmitted) return;
    hasExpiredRef.current = true;
    notify("warning", "Time's up! Submitting test...", 3000);
    await confirmEndTest();
  };

  if (isLoading || !test) {
    return (
      <LoadingOverlay
        active={isLoading}
        message="Loading test..."
        type="spinner"
        blur={true}
      />
    );
  }

  return (
    <>
      <LoadingOverlay
        active={isLoading}
        message="Submitting..."
        type="spinner"
        blur={true}
      />

      <div className="student-test-interface clamp-viewport">
        {/* Toolbar */}
        <div className="student-test-toolbar sticky-top">
          <div className="student-test-info">
            <div className="student-test-title-section">
              <h2 className="student-title">{test.title}</h2>
              <div className="student-test-language">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75L22.5 12l-5.25 5.25M6.75 17.25L1.5 12l5.25-5.25"
                  />
                </svg>
                <span>{test.language.toUpperCase()}</span>
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: currentAttempt > 1 ? "#f59e0b" : "#94a3b8",
                  fontWeight: currentAttempt > 1 ? "600" : "400",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>
                  Attempt {currentAttempt}/{maxAttempts}
                </span>
                {isSaving && (
                  <span style={{ color: "#22c55e", fontSize: "0.75rem" }}>
                    ● Saving...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="student-toolbar-actions">
            <div className="student-toolbar-timer">
              <TestTimer endTime={test.endTime} onExpire={handleTimerExpire} />
            </div>

            <button
              ref={notifBtnRef}
              className="student-toolbar-bell"
              onClick={() => {
                setNotifOpen((v) => !v);
                setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="student-notification-badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                ref={notifMenuRef}
                className="student-notifications-dropdown active"
              >
                <div className="student-notifications-header">
                  Notifications
                </div>
                {notifList.length === 0 && (
                  <div className="student-notification-item">
                    No notifications
                  </div>
                )}
                {notifList.map((n) => (
                  <div key={n.id} className="student-notification-item">
                    <div className="student-notification-content">
                      {n.message}
                    </div>
                    <div className="student-notification-time">
                      {isClient ? n.ts.toLocaleTimeString() : "--:--:--"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="student-action-btn danger"
              onClick={handleSubmitTest}
              disabled={
                isSubmitted || (test.wait_until_end && timeRemaining > 0)
              }
              style={{
                pointerEvents: "auto",
                cursor:
                  isSubmitted || (test.wait_until_end && timeRemaining > 0)
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isSubmitted || (test.wait_until_end && timeRemaining > 0)
                    ? 0.6
                    : 1,
              }}
              title={
                test.wait_until_end && timeRemaining > 0
                  ? "Submit will be enabled after test time expires"
                  : isSubmitted
                  ? "Already submitted"
                  : "Submit your test"
              }
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeWidth="1.5"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.5l16.5 7.5-16.5 7.5 4.5-7.5-4.5-7.5z"
                />
              </svg>
              {isSubmitted
                ? "Submitted"
                : test.wait_until_end && timeRemaining > 0
                ? "Submit Locked"
                : "Submit Test"}
            </button>
          </div>
        </div>

        <div className="student-mobile-tabs">
          <button
            className={`student-tab-btn ${
              mobileTab === "code" ? "active" : ""
            }`}
            onClick={() => setMobileTab("code")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 9.75L5.25 12l3 2.25m7.5-4.5L18.75 12l-3 2.25M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z"
              />
            </svg>
            Code
          </button>
          <button
            className={`student-tab-btn ${
              mobileTab === "output" ? "active" : ""
            }`}
            onClick={() => setMobileTab("output")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 9.75L5.25 12l3 2.25M11.25 15h3.75"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75Z"
              />
            </svg>
            Output
          </button>
        </div>

        <div className="student-editor-split">
          <div
            className={`student-split-pane code-pane ${
              mobileTab === "code" ? "show" : "hide"
            }`}
            onMouseDown={() => {
              if (typeof window !== "undefined" && window.innerWidth <= 1024)
                setMobileTab("code");
            }}
          >
            <CodeEditor
              ref={codeEditorRef}
              value=""
              onChange={handleCodeChange}
              language={test.language}
              onRunStart={handleRunStart}
              isRunning={isRunning}
              onStop={handleStop}
              onOutput={handleOutput}
              onError={handleError}
              onSuccess={handleSuccess}
              onInputRequest={handleInputRequest}
              allowCopy={test.allow_copy}
              allowPaste={test.allow_paste}
              isSaving={isSaving}
            />
          </div>

          <div
            className={`student-split-pane output-pane ${
              mobileTab === "output" ? "show" : "hide"
            }`}
            onMouseDown={() => {
              if (typeof window !== "undefined" && window.innerWidth <= 1024)
                setMobileTab("output");
            }}
          >
            <div className="student-console-section full-height">
              <div className="student-console-header">
                <div className="student-console-title">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 9.75 5.25 12l3 2.25M11.25 15h4.5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75Z"
                    />
                  </svg>
                  Console
                </div>
                <button
                  onClick={clearConsole}
                  className="student-console-clear-btn"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 7.5h15"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.5 4.5h5a1 1 0 0 1 1 1V7.5h-7V5.5a1 1 0 0 1 1-1Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 7.5l.546 10.385A2.25 2.25 0 0 0 8.79 20.25h6.42A2.25 2.25 0 0 0 17.454 17.885L18 7.5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.394 9l-.346 9M9.952 18L9.606 9"
                    />
                  </svg>
                  Clear
                </button>
              </div>

              <div className="student-console-output" ref={consoleRef}>
                <pre className="student-console-content">
                  {consoleOutput.map((o, i) => (
                    <span
                      key={i}
                      className={`student-console-segment ${o.type}`}
                    >
                      {o.message}
                    </span>
                  ))}
                </pre>
              </div>

              {waitingForInput && (
                <div className="student-console-input-section">
                  <div className="student-input-prompt">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 9.75 5.25 12l3 2.25M11.25 15h4.5"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75Z"
                      />
                    </svg>
                    Program waiting for input
                  </div>

                  <div className="student-input-controls">
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          sendInput();
                        }
                      }}
                      placeholder="Type your input and press Enter..."
                      className="student-terminal-input"
                      autoFocus
                      disabled={!waitingForInput}
                    />
                    <button
                      onClick={sendInput}
                      className="student-input-send-btn"
                      disabled={!terminalInput.trim() || !waitingForInput}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 4.5l16.5 7.5-16.5 7.5 4.5-7.5-4.5-7.5z"
                        />
                      </svg>
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="student-toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`student-toast ${t.type}`}>
              <span className="student-toast-text">{t.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Fullscreen Prompt (shown if auto-enter fails) */}
      {test?.fullscreen_mode && showFullscreenPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              padding: "2.5rem",
              borderRadius: "16px",
              maxWidth: "500px",
              textAlign: "center",
              border: "2px solid #3b82f6",
              boxShadow: "0 20px 60px rgba(59, 130, 246, 0.3)",
            }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>⛶</div>

            <h2
              style={{
                color: "#f1f5f9",
                fontSize: "1.75rem",
                marginBottom: "1rem",
                fontWeight: "700",
              }}
            >
              Fullscreen Mode Required
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: "2rem",
                lineHeight: "1.8",
              }}
            >
              This test must be taken in fullscreen mode to ensure test
              integrity.
            </p>

            <button
              onClick={enterFullscreenMode}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                padding: "1rem 2.5rem",
                borderRadius: "10px",
                border: "none",
                fontSize: "1.125rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
              }}
            >
              🖥️ Enter Fullscreen Mode
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Exit Warning with 20s Countdown */}
      {test?.fullscreen_mode && showFullscreenWarning && !isSubmitted && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(220, 38, 38, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            animation: "pulse 1s infinite",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              padding: "2.5rem",
              borderRadius: "16px",
              maxWidth: "550px",
              textAlign: "center",
              border: "3px solid #dc2626",
              boxShadow: "0 20px 60px rgba(220, 38, 38, 0.5)",
            }}
          >
            <div
              style={{
                fontSize: "5rem",
                marginBottom: "1rem",
                animation: "shake 0.5s infinite",
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                color: "#fca5a5",
                fontSize: "2rem",
                marginBottom: "1rem",
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              FULLSCREEN VIOLATION!
            </h2>

            <div
              style={{
                background: "#dc2626",
                color: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                marginBottom: "2rem",
                fontSize: "3rem",
                fontWeight: "700",
                fontFamily: "monospace",
                letterSpacing: "0.1em",
              }}
            >
              {warningCountdown}
            </div>

            <p
              style={{
                color: "#f1f5f9",
                marginBottom: "2rem",
                lineHeight: "1.8",
                fontSize: "1.125rem",
              }}
            >
              <strong>
                Your test will be automatically submitted in {warningCountdown}{" "}
                seconds!
              </strong>
              <br />
              Return to fullscreen immediately to continue.
            </p>

            <button
              onClick={reEnterFullscreen}
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                color: "white",
                padding: "1.25rem 3rem",
                borderRadius: "10px",
                border: "none",
                fontSize: "1.25rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.6)",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.1)";
                e.target.style.boxShadow = "0 6px 20px rgba(220, 38, 38, 0.8)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.6)";
              }}
            >
              ⛶ RETURN TO FULLSCREEN NOW
            </button>

            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.875rem",
                marginTop: "1.5rem",
              }}
            >
              Exiting fullscreen violates test integrity policies
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes shake {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }
      `}</style>
    </>
  );
}

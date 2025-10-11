// app/components/CodeEditor.js
"use client";

import { forwardRef, useEffect, useRef, useState } from "react";

const API_SOCKET_BASE = process.env.NEXT_PUBLIC_API_BASE_SOCKET_URL;

const CM_BASE = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.7";
const CM_ASSETS = {
  cssCore: `${CM_BASE}/codemirror.min.css`,
  cssTheme: `${CM_BASE}/theme/material.min.css`,
  jsCore: `${CM_BASE}/codemirror.min.js`,
  jsClike: `${CM_BASE}/mode/clike/clike.min.js`,
  jsPython: `${CM_BASE}/mode/python/python.min.js`,
  jsMatchBrackets: `${CM_BASE}/addon/edit/matchbrackets.min.js`,
  jsCloseBrackets: `${CM_BASE}/addon/edit/closebrackets.min.js`,
  jsAutoCloseTags: `${CM_BASE}/addon/edit/closetag.min.js`,
  jsSearchCursor: `${CM_BASE}/addon/search/searchcursor.min.js`,
  jsMatchHighlighter: `${CM_BASE}/addon/search/match-highlighter.min.js`,
};

const ensureCSS = (href) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`link[data-href="${href}"]`)) return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-href", href);
    link.onload = () => resolve();
    link.onerror = (e) => reject(e);
    document.head.appendChild(link);
  });

const ensureScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) {
      if (window.CodeMirror) return resolve();
      document
        .querySelector(`script[data-src="${src}"]`)
        .addEventListener("load", resolve, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.async = true;
    s.setAttribute("data-src", src);
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });

const loadCodeMirror = async (language) => {
  await ensureCSS(CM_ASSETS.cssCore);
  await ensureCSS(CM_ASSETS.cssTheme);
  await ensureScript(CM_ASSETS.jsCore);
  await ensureScript(CM_ASSETS.jsMatchBrackets);
  await ensureScript(CM_ASSETS.jsCloseBrackets);
  await ensureScript(CM_ASSETS.jsAutoCloseTags);
  await ensureScript(CM_ASSETS.jsSearchCursor);
  await ensureScript(CM_ASSETS.jsMatchHighlighter);

  if (language === "python") {
    await ensureScript(CM_ASSETS.jsPython);
  } else {
    await ensureScript(CM_ASSETS.jsClike);
  }
};

const cmModeFor = (lang) => {
  if (lang === "python") return "python";
  if (lang === "java") return "text/x-java";
  if (lang === "c") return "text/x-csrc";
  if (lang === "cpp" || lang === "c++") return "text/x-c++src";
  return "text/x-java";
};

const CodeEditor = forwardRef(
  (
    {
      value,
      onChange,
      language = "java",
      onRunStart,
      isRunning,
      onStop,
      onOutput,
      onError,
      onSuccess,
      onInputRequest,
      allowCopy = true,
      allowPaste = true,
      isSaving = false,
      onWPMUpdate, // NEW: Callback to send WPM updates
    },
    ref
  ) => {
    const editorHostRef = useRef(null);
    const editorRef = useRef(null);

    const [code, setCode] = useState("");
    const [cmReady, setCmReady] = useState(false);
    const closeReasonRef = useRef(null);

    const socketRef = useRef(null);
    const connectionTimeoutRef = useRef(null);
    const heartbeatRef = useRef(null);
    const isStoppingRef = useRef(false);

    // WPM tracking state
    const [wpm, setWpm] = useState(0);
    const wpmDataRef = useRef({
      totalCharacters: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      typingIntervals: [], // Store intervals between keystrokes
    });
    const wpmUpdateIntervalRef = useRef(null);

    // Calculate WPM
    const calculateWPM = () => {
      const data = wpmDataRef.current;
      const elapsedMinutes = (Date.now() - data.startTime) / 60000;
      
      if (elapsedMinutes === 0) return 0;
      
      // Standard: 1 word = 5 characters
      const words = data.totalCharacters / 5;
      const currentWPM = Math.round(words / elapsedMinutes);
      
      return currentWPM;
    };

    // Update WPM periodically
    useEffect(() => {
      wpmUpdateIntervalRef.current = setInterval(() => {
        const currentWPM = calculateWPM();
        setWpm(currentWPM);
        
        // Send WPM update to parent component
        if (onWPMUpdate && currentWPM > 0) {
          onWPMUpdate(currentWPM);
        }
      }, 5000); // Update every 5 seconds

      return () => {
        if (wpmUpdateIntervalRef.current) {
          clearInterval(wpmUpdateIntervalRef.current);
        }
      };
    }, [onWPMUpdate]);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          await loadCodeMirror(language);
          if (!mounted) return;
          const CM = window.CodeMirror;

          editorRef.current = CM(editorHostRef.current, {
            value: "",
            mode: cmModeFor(language),
            theme: "material",
            lineNumbers: true,
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: false,
            lineWrapping: false,
            autofocus: false,
            matchBrackets: true,
            autoCloseBrackets: true,
            autoCloseTags: true,
            highlightSelectionMatches: {
              showToken: /\w/,
              annotateScrollbar: true,
              minChars: 2,
            },
            styleActiveLine: true,

            extraKeys: {
              "Ctrl-Enter": () => executeCode(),
              "Cmd-Enter": () => executeCode(),
              F9: () => {
                if (!isRunning) executeCode();
              },
              F10: () => {
                if (isRunning) stopExecution();
              },
              Tab: (cm) => {
                if (cm.somethingSelected()) {
                  cm.indentSelection("add");
                } else {
                  cm.replaceSelection("    ", "end");
                }
              },
              "Shift-Tab": (cm) => cm.indentSelection("subtract"),
              "Alt-Up": (cm) => {
                const cursor = cm.getCursor();
                const line = cursor.line;
                if (line === 0) return;
                const currentLine = cm.getLine(line);
                const previousLine = cm.getLine(line - 1);
                cm.replaceRange(
                  previousLine + "\n",
                  { line: line, ch: 0 },
                  { line: line + 1, ch: 0 }
                );
                cm.replaceRange(
                  currentLine + "\n",
                  { line: line - 1, ch: 0 },
                  { line: line, ch: 0 }
                );
                cm.setCursor({ line: line - 1, ch: cursor.ch });
              },
              "Alt-Down": (cm) => {
                const cursor = cm.getCursor();
                const line = cursor.line;
                const lastLine = cm.lastLine();
                if (line === lastLine) return;
                const currentLine = cm.getLine(line);
                const nextLine = cm.getLine(line + 1);
                cm.replaceRange(
                  currentLine + "\n",
                  { line: line + 1, ch: 0 },
                  { line: line + 2, ch: 0 }
                );
                cm.replaceRange(
                  nextLine + "\n",
                  { line: line, ch: 0 },
                  { line: line + 1, ch: 0 }
                );
                cm.setCursor({ line: line + 1, ch: cursor.ch });
              },
              "Alt-Shift-Up": (cm) => {
                const cursor = cm.getCursor();
                const line = cm.getLine(cursor.line);
                cm.replaceRange(line + "\n", { line: cursor.line, ch: 0 });
                cm.setCursor({ line: cursor.line + 1, ch: cursor.ch });
              },
              "Alt-Shift-Down": (cm) => {
                const cursor = cm.getCursor();
                const line = cm.getLine(cursor.line);
                cm.replaceRange("\n" + line, { line: cursor.line + 1, ch: 0 });
                cm.setCursor({ line: cursor.line + 1, ch: cursor.ch });
              },
              "Ctrl-C": (cm) =>
                !allowCopy ? (onError?.("Copying disabled"), false) : true,
              "Cmd-C": (cm) =>
                !allowCopy ? (onError?.("Copying disabled"), false) : true,
              "Ctrl-V": (cm) =>
                !allowPaste ? (onError?.("Pasting disabled"), false) : true,
              "Cmd-V": (cm) =>
                !allowPaste ? (onError?.("Pasting disabled"), false) : true,
              "Ctrl-D": (cm) => cm.execCommand("deleteLine"),
              "Cmd-D": (cm) => cm.execCommand("deleteLine"),
              "Ctrl-/": (cm) => cm.execCommand("toggleComment"),
              "Cmd-/": (cm) => cm.execCommand("toggleComment"),
            },
          });

          const initial =
            value && value.length ? value : getDefaultCode(language);
          editorRef.current.setValue(initial);
          setCode(initial);
          onChange?.(initial);

          // Track typing for WPM
          editorRef.current.on("change", (cm, changeObj) => {
            const val = cm.getValue();
            setCode(val);
            onChange?.(val);

            // Track WPM only for user input (not programmatic changes)
            if (changeObj.origin === "+input" || changeObj.origin === "paste") {
              const added = changeObj.text.join("").length;
              const removed = changeObj.removed ? changeObj.removed.join("").length : 0;
              const netChange = added - removed;

              if (netChange > 0) {
                wpmDataRef.current.totalCharacters += netChange;
                wpmDataRef.current.lastUpdateTime = Date.now();
              }
            }
          });

          setCmReady(true);
        } catch (e) {
          onError?.("Failed to load editor");
        }
      })();
      return () => {
        mounted = false;
        isStoppingRef.current = false;
        closeReasonRef.current = "unmount";
        disconnectFromServer();
        if (wpmUpdateIntervalRef.current) {
          clearInterval(wpmUpdateIntervalRef.current);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (!editorHostRef.current) return;
      const handleCopy = (e) =>
        !allowCopy && (e.preventDefault(), onError?.("Copying disabled"));
      const handlePaste = (e) =>
        !allowPaste && (e.preventDefault(), onError?.("Pasting disabled"));
      const handleCut = (e) =>
        !allowCopy && (e.preventDefault(), onError?.("Cutting disabled"));
      const el = editorHostRef.current;
      el.addEventListener("copy", handleCopy);
      el.addEventListener("paste", handlePaste);
      el.addEventListener("cut", handleCut);
      return () => {
        el.removeEventListener("copy", handleCopy);
        el.removeEventListener("paste", handlePaste);
        el.removeEventListener("cut", handleCut);
      };
    }, [allowCopy, allowPaste, onError]);

    useEffect(() => {
      (async () => {
        if (!editorRef.current) return;
        if (language === "python") {
          await ensureScript(CM_ASSETS.jsPython);
        } else {
          await ensureScript(CM_ASSETS.jsClike);
        }
        editorRef.current.setOption("mode", cmModeFor(language));
      })();
    }, [language]);

    useEffect(() => {
      if (typeof value === "string" && editorRef.current) {
        if (value !== editorRef.current.getValue()) {
          editorRef.current.setValue(value);
          setCode(value);
        }
      }
    }, [value]);

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = {
          executeCode,
          stopExecution,
          sendInput,
          getValue: () => code,
          setValue: (newCode) => {
            if (editorRef.current) {
              editorRef.current.setValue(newCode);
              setCode(newCode);
              onChange?.(newCode);
            }
          },
          getWPM: () => wpm, // NEW: Expose WPM
          resetWPM: () => {
            wpmDataRef.current = {
              totalCharacters: 0,
              startTime: Date.now(),
              lastUpdateTime: Date.now(),
              typingIntervals: [],
            };
            setWpm(0);
          },
        };
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, isRunning, wpm, ref]);

    const getDefaultCode = (lang) => {
      const templates = {
        python: `# Python Solution\nimport sys\n\ndef solve():\n    # Your solution here\n    print("Hello World!")\n\nif __name__ == "__main__":\n    solve()`,
        java: `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Your solution here\n        System.out.println("Hello World!");\n        scanner.close();\n    }\n}`,
        cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    cout << "Hello World!" << endl;\n    return 0;\n}`,
        c: `#include <stdio.h>\n\nint main() {\n    // Your solution here\n    printf("Hello World!\\n");\n    return 0;\n}`,
      };
      return templates[lang] || templates.java;
    };

    const connectToExecutionServer = () =>
      new Promise((resolve, reject) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          resolve(socketRef.current);
          return;
        }
        try {
          socketRef.current = new WebSocket(`${API_SOCKET_BASE}/code-runner`);
          connectionTimeoutRef.current = setTimeout(() => {
            if (socketRef.current?.readyState !== WebSocket.OPEN) {
              socketRef.current?.close();
              reject(new Error("Connection timeout"));
            }
          }, 10000);

          socketRef.current.onopen = () => {
            clearTimeout(connectionTimeoutRef.current);
            heartbeatRef.current = setInterval(() => {
              if (socketRef.current?.readyState === WebSocket.OPEN) {
                try {
                  socketRef.current.send(JSON.stringify({ type: "ping" }));
                } catch (e) {}
              }
            }, 30000);
            resolve(socketRef.current);
          };

          socketRef.current.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              handleServerMessage(message);
            } catch (error) {
              onError?.(`Parse error: ${error.message}`);
            }
          };

          socketRef.current.onclose = (event) => {
            clearTimeout(connectionTimeoutRef.current);
            clearInterval(heartbeatRef.current);
            if (
              closeReasonRef.current === "complete" ||
              closeReasonRef.current === "stop"
            ) {
              closeReasonRef.current = null;
              return;
            }
          };

          socketRef.current.onerror = () => {
            clearTimeout(connectionTimeoutRef.current);
            clearInterval(heartbeatRef.current);
            onError?.("Connection failed");
            disconnectFromServer();
            reject(new Error("Connection error"));
          };
        } catch (error) {
          reject(error);
        }
      });

    const handleServerMessage = (message) => {
      const { type, data, exit_code } = message;
      switch (type) {
        case "output":
          onOutput?.("output", data);
          break;
        case "error_output":
        case "stderr":
          onOutput?.("error", data);
          break;
        case "warning":
          onOutput?.("warning", data);
          break;
        case "success":
          onOutput?.("success", data);
          break;
        case "input_request":
        case "waiting_for_input":
          onInputRequest?.();
          break;
        case "execution_complete":
          try {
            if (typeof exit_code === "number" && exit_code !== 0) {
              onError?.(`Execution failed (exit code: ${exit_code})`);
            } else {
              onSuccess?.();
            }
          } catch (e) {
            console.error("Error in completion handler:", e);
          }
          closeReasonRef.current = "complete";
          disconnectFromServer();
          break;
        case "compilation_error":
          onError?.("Compilation failed");
          disconnectFromServer();
          break;
        case "runtime_error":
          onError?.("Runtime error");
          disconnectFromServer();
          break;
        case "execution_timeout":
          onError?.("Timeout");
          disconnectFromServer();
          break;
        default:
          break;
      }
    };

    const disconnectFromServer = () => {
      clearTimeout(connectionTimeoutRef.current);
      clearInterval(heartbeatRef.current);
      if (socketRef.current) {
        try {
          socketRef.current.onmessage = null;
          socketRef.current.onclose = null;
          socketRef.current.onerror = null;
        } catch (e) {}
        try {
          if (
            socketRef.current.readyState === WebSocket.OPEN ||
            socketRef.current.readyState === WebSocket.CONNECTING
          ) {
            socketRef.current.close();
          }
        } catch (e) {}
        socketRef.current = null;
      }
    };

    const executeCode = async () => {
      const current = editorRef.current?.getValue() ?? code;
      if (!current.trim()) {
        onError?.("No code to execute");
        return;
      }
      if (isRunning) {
        return;
      }

      if (onRunStart) {
        onRunStart();
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        const socket = await connectToExecutionServer();
        const payload = {
          type: "run_code",
          code: current.trim(),
          language,
          timestamp: new Date().toISOString(),
          client_id: Date.now().toString(),
          timeout: 30000,
        };
        socket.send(JSON.stringify(payload));
      } catch (error) {
        onError?.(`Connection failed: ${error.message}`);
      }
    };

    const stopExecution = () => {
      if (isStoppingRef.current) return;
      isStoppingRef.current = true;
      closeReasonRef.current = "stop";

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(
            JSON.stringify({
              type: "stop_execution",
              timestamp: new Date().toISOString(),
            })
          );
        } catch (error) {
          console.error("Stop error:", error);
        }
      }

      onStop?.();
      disconnectFromServer();
      setTimeout(() => (isStoppingRef.current = false), 1000);
    };

    const sendInput = (input) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "input_response",
            input: input.toString(),
            timestamp: new Date().toISOString(),
          })
        );
      } else {
        onError?.("Not connected");
      }
    };

    return (
      <div className="student-code-editor-wrapper">
        <div className="student-editor-toolbar">
          <div className="student-editor-info">
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
                d="M8 4H6a2 2 0 00-2 2v3m0 6v3a2 2 0 002 2h2M16 4h2a2 2 0 012 2v3m0 6v3a2 2 0 01-2 2h-2"
              />
            </svg>
            <span className="student-language-display">
              {language.toUpperCase()}
            </span>
            {/* NEW: Display WPM */}
            {wpm > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginLeft: "1rem",
                  padding: "0.25rem 0.75rem",
                  background: "rgba(6, 182, 212, 0.1)",
                  borderRadius: "6px",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                }}
              >
                <svg
                  style={{ width: "14px", height: "14px", color: "#06b6d4" }}
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
                <span
                  style={{
                    color: "#06b6d4",
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                  }}
                >
                  {wpm} WPM
                </span>
              </div>
            )}
          </div>

          <div className="student-editor-actions">
            {isSaving && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: "rgba(34, 197, 94, 0.1)",
                  borderRadius: "6px",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                }}
              >
                <svg
                  style={{
                    width: "14px",
                    height: "14px",
                    animation: "spin 1s linear infinite",
                    color: "#22c55e",
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span
                  style={{
                    color: "#22c55e",
                    fontSize: "0.8125rem",
                    fontWeight: "500",
                  }}
                >
                  Saving
                </span>
              </div>
            )}

            <button
              className="student-editor-btn run"
              onClick={executeCode}
              disabled={!cmReady || isRunning}
              style={{
                opacity: isRunning ? 0.5 : 1,
                cursor: isRunning ? "not-allowed" : "pointer",
              }}
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
                  d="M5.25 5.25l13.5 6.75-13.5 6.75V5.25z"
                />
              </svg>
              Run
            </button>

            {isRunning && (
              <button
                className="student-editor-btn stop"
                onClick={stopExecution}
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
                    d="M6.75 6.75h10.5v10.5H6.75z"
                  />
                </svg>
                Stop
              </button>
            )}
          </div>
        </div>

        {cmReady && (!code || code.trim().length === 0) && (
          <div className="student-editor-empty-hint">
            Ctrl+Enter to execute • Alt+Shift+↑/↓ to duplicate lines
          </div>
        )}

        <div className="student-cm-host" ref={editorHostRef} />

        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }
);

CodeEditor.displayName = "CodeEditor";
export default CodeEditor;

"use client";

import { useState, useRef } from "react";

const API_SOCKET_BASE = "ws://zeus.hidencloud.com:24650";

const FacultyCodeExecutor = ({ 
  code, 
  language = "c", 
  studentOutput = null,
  readOnly = false 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  const socketRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const heartbeatRef = useRef(null);
  const closeReasonRef = useRef(null);

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
            addOutput("error", `Parse error: ${error.message}`);
          }
        };

        socketRef.current.onclose = () => {
          clearTimeout(connectionTimeoutRef.current);
          clearInterval(heartbeatRef.current);
        };

        socketRef.current.onerror = () => {
          clearTimeout(connectionTimeoutRef.current);
          clearInterval(heartbeatRef.current);
          addOutput("error", "Connection failed");
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
        addOutput("output", data);
        break;
      case "error_output":
      case "stderr":
        addOutput("error", data);
        break;
      case "warning":
        addOutput("warning", data);
        break;
      case "success":
        addOutput("success", data);
        break;
      case "input_request":
      case "waiting_for_input":
        setShowInput(true);
        addOutput("info", "⌨️ Waiting for input...");
        break;
      case "execution_complete":
        if (typeof exit_code === "number" && exit_code !== 0) {
          addOutput("error", `Execution failed (exit code: ${exit_code})`);
        } else {
          addOutput("success", "✓ Execution completed successfully");
        }
        closeReasonRef.current = "complete";
        disconnectFromServer();
        setIsRunning(false);
        setShowInput(false);
        break;
      case "compilation_error":
        addOutput("error", "❌ Compilation failed");
        disconnectFromServer();
        setIsRunning(false);
        break;
      case "runtime_error":
        addOutput("error", "❌ Runtime error");
        disconnectFromServer();
        setIsRunning(false);
        break;
      case "execution_timeout":
        addOutput("error", "⏱️ Execution timeout");
        disconnectFromServer();
        setIsRunning(false);
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

  const addOutput = (type, text) => {
    setOutput((prev) => [...prev, { type, text, timestamp: Date.now() }]);
  };

  const executeCode = async () => {
    if (!code || !code.trim()) {
      addOutput("error", "No code to execute");
      return;
    }
    if (isRunning) return;

    setIsRunning(true);
    setOutput([]);
    setShowInput(false);
    setInput("");
    addOutput("info", `🚀 Executing ${language.toUpperCase()} code...`);

    try {
      const socket = await connectToExecutionServer();
      const payload = {
        type: "run_code",
        code: code.trim(),
        language,
        timestamp: new Date().toISOString(),
        client_id: Date.now().toString(),
        timeout: 30000,
      };
      socket.send(JSON.stringify(payload));
    } catch (error) {
      addOutput("error", `Connection failed: ${error.message}`);
      setIsRunning(false);
    }
  };

  const stopExecution = () => {
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
    addOutput("warning", "⏹️ Execution stopped by user");
    disconnectFromServer();
    setIsRunning(false);
    setShowInput(false);
  };

  const sendInput = () => {
    if (!input.trim()) return;
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "input_response",
          input: input.toString(),
          timestamp: new Date().toISOString(),
        })
      );
      addOutput("input", `> ${input}`);
      setInput("");
      setShowInput(false);
    } else {
      addOutput("error", "Not connected");
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === "Enter") {
      sendInput();
    }
  };

  return (
    <div className="faculty-code-executor">
      {/* Code Display */}
      <div className="faculty-code-section">
        <div className="faculty-code-header">
          <span className="faculty-code-label">
            Student Code ({language.toUpperCase()})
          </span>
          <button
            onClick={executeCode}
            disabled={isRunning || !code}
            className="faculty-run-btn"
          >
            {isRunning ? (
              <>
                <svg className="spinning" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.25l13.5 6.75-13.5 6.75V5.25z" />
                </svg>
                Run Code
              </>
            )}
          </button>
          {isRunning && (
            <button onClick={stopExecution} className="faculty-stop-btn">
              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 6.75h10.5v10.5H6.75z" />
              </svg>
              Stop
            </button>
          )}
        </div>
        <pre className="faculty-code-display">{code || "No code available"}</pre>
      </div>

      {/* Output Section */}
      <div className="faculty-output-section">
        <div className="faculty-output-header">
          <span>Execution Output</span>
          {output.length > 0 && (
            <button
              onClick={() => setOutput([])}
              className="faculty-clear-btn"
            >
              Clear
            </button>
          )}
        </div>
        <div className="faculty-output-display">
          {output.length === 0 ? (
            <div className="faculty-output-empty">
              Click "Run Code" to execute the student's code
            </div>
          ) : (
            output.map((item, index) => (
              <div key={index} className={`faculty-output-line ${item.type}`}>
                {item.text}
              </div>
            ))
          )}
          
          {showInput && (
            <div className="faculty-input-section">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleInputKeyPress}
                placeholder="Enter input and press Enter..."
                className="faculty-input-field"
                autoFocus
              />
              <button onClick={sendInput} className="faculty-send-input-btn">
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student's Actual Output (if available) */}
      {studentOutput && (
        <div className="faculty-student-output-section">
          <div className="faculty-output-header">
            <span>Student's Actual Output (from submission)</span>
          </div>
          <pre className="faculty-student-output">{studentOutput}</pre>
        </div>
      )}

      <style jsx>{`
        .faculty-code-executor {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .faculty-code-section,
        .faculty-output-section,
        .faculty-student-output-section {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 8px;
          overflow: hidden;
        }

        .faculty-code-header,
        .faculty-output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(30, 41, 59, 0.6);
          border-bottom: 1px solid rgba(71, 85, 105, 0.3);
        }

        .faculty-code-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #06b6d4;
        }

        .faculty-run-btn,
        .faculty-stop-btn,
        .faculty-clear-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .faculty-run-btn {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
        }

        .faculty-run-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .faculty-run-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .faculty-stop-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .faculty-clear-btn {
          background: rgba(71, 85, 105, 0.3);
          color: #94a3b8;
          padding: 0.25rem 0.75rem;
        }

        .faculty-clear-btn:hover {
          background: rgba(71, 85, 105, 0.5);
        }

        .faculty-code-display,
        .faculty-student-output {
          padding: 1rem;
          margin: 0;
          color: #e2e8f0;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .faculty-output-display {
          padding: 1rem;
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .faculty-output-empty {
          color: #94a3b8;
          text-align: center;
          padding: 3rem 1rem;
        }

        .faculty-output-line {
          margin-bottom: 0.5rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .faculty-output-line.output {
          color: #e2e8f0;
        }

        .faculty-output-line.error {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }

        .faculty-output-line.success {
          color: #86efac;
          background: rgba(34, 197, 94, 0.1);
        }

        .faculty-output-line.warning {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.1);
        }

        .faculty-output-line.info {
          color: #7dd3fc;
          background: rgba(14, 165, 233, 0.1);
        }

        .faculty-output-line.input {
          color: #c4b5fd;
          background: rgba(139, 92, 246, 0.1);
        }

        .faculty-input-section {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(71, 85, 105, 0.3);
        }

        .faculty-input-field {
          flex: 1;
          padding: 0.5rem;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 0.875rem;
        }

        .faculty-input-field:focus {
          outline: none;
          border-color: rgba(6, 182, 212, 0.5);
        }

        .faculty-send-input-btn {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        @keyframes spinning {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinning {
          animation: spinning 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default FacultyCodeExecutor;

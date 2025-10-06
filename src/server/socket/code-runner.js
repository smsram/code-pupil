// code-runner.js (ES Module) - MINIMAL LOGGING VERSION
import WebSocket, { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Input marker for interactive programs
const INPUT_MARKER = 'INPUT';

// Server configuration
const SERVER_CONFIG = {
  maxConcurrentExecutions: 10,
  executionTimeout: 60000, // 60 seconds (1 minute)
  maxIterations: 1000, // Maximum loop iterations
  maxOutputLines: 2000, // Maximum output lines
  maxQueueSize: 100,
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  heartbeatInterval: 30000,
  cleanupInterval: 60000
};

// SafeQueue implementation (unchanged)
class SafeQueue {
  constructor(maxSize = 100) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(item) {
    if (this.queue.length >= this.maxSize) {
      throw new Error('Queue is full');
    }
    this.queue.push(item);
  }

  dequeue() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  size() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }
}

// ExecutionLimiter implementation (unchanged)
class ExecutionLimiter {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.activeCount = 0;
    this.waitingQueue = new SafeQueue();
  }

  async acquire() {
    return new Promise((resolve, reject) => {
      if (this.activeCount < this.maxConcurrent) {
        this.activeCount++;
        resolve();
      } else {
        try {
          this.waitingQueue.enqueue({ resolve, reject });
        } catch (error) {
          reject(new Error('Execution queue is full'));
        }
      }
    });
  }

  release() {
    this.activeCount--;
    if (!this.waitingQueue.isEmpty()) {
      const { resolve } = this.waitingQueue.dequeue();
      this.activeCount++;
      resolve();
    }
  }

  getStats() {
    return {
      active: this.activeCount,
      waiting: this.waitingQueue.size(),
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Module-level state
let clients = new Map();
let tempDirs = new Set();
let executionLimiter = new ExecutionLimiter(SERVER_CONFIG.maxConcurrentExecutions);
let cleanupInterval = null;
let isShuttingDown = false;
let wss = null;
let JAVA_PATH = 'java';
let JAVAC_PATH = 'javac';

// Utility functions

// Remove directory (no logging)
async function removeDirectory(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.lstat(filePath);
      if (stat.isDirectory()) {
        await removeDirectory(filePath);
      } else {
        await fs.unlink(filePath);
      }
    }
    await fs.rmdir(dirPath);
  } catch (error) {
    // Silent directory removal errors
  }
}

// Generate client ID (no logging)
function generateClientId(ws, req) {
  const remoteAddress = req.socket.remoteAddress || 'unknown';
  const remotePort = req.socket.remotePort || 0;
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${remoteAddress}:${remotePort}:${timestamp}:${random}`;
}

// Setup heartbeat for a client (no logging)
function setupHeartbeat(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  const heartbeatInterval = setInterval(async () => {
    try {
      const client = clients.get(clientId);
      if (!client || client.websocket.readyState !== WebSocket.OPEN) {
        clearInterval(heartbeatInterval);
        return;
      }

      // Check for inactive clients
      if (Date.now() - client.lastActivity > SERVER_CONFIG.heartbeatInterval * 3) {
        clearInterval(heartbeatInterval);
        await cleanupClient(clientId);
        return;
      }

      await sendMessage(clientId, { type: 'ping' });
    } catch (error) {
      clearInterval(heartbeatInterval);
      await cleanupClient(clientId);
    }
  }, SERVER_CONFIG.heartbeatInterval);
}

// Handle message (no logging)
async function handleMessage(clientId, data) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    client.lastActivity = Date.now();

    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      return; // Ignore invalid JSON
    }

    switch (message.type) {
      case 'run_code':
        await runCode(clientId, message.code, message.language || 'python');
        break;
      case 'input_response':
        handleInputResponse(clientId, message.input);
        break;
      case 'stop_execution':
        await stopExecution(clientId);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        // Ignore unknown message types
        break;
    }
  } catch (error) {
    // Silent error handling
  }
}

// Handle input response (no logging)
function handleInputResponse(clientId, input) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    client.inputQueue.enqueue(input);
  } catch (error) {
    // Queue is full or other error
  }
}

// Run code (main dispatcher) - MINIMAL LOGGING
async function runCode(clientId, code, language = 'python') {
  let executionAcquired = false;
  try {
    const client = clients.get(clientId);
    if (!client) return;

    console.log(`🟢 [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} executing ${language} code`);

    // Stop any existing execution
    await stopExecution(clientId);

    if (!code.trim()) {
      await sendMessage(clientId, { type: 'error', message: 'No code provided' });
      return;
    }

    // Check execution limits
    const stats = executionLimiter.getStats();
    if (stats.waiting >= SERVER_CONFIG.maxQueueSize) {
      await sendMessage(clientId, { type: 'error', message: 'Server is overloaded. Please try again later.' });
      return;
    }

    // Acquire execution slot
    await executionLimiter.acquire();
    executionAcquired = true;

    client.executionCount++;
    // Rate limiting per client
    if (client.executionCount > 50) {
      await sendMessage(clientId, { type: 'error', message: 'Rate limit exceeded. Please reconnect.' });
      return;
    }

    // Dispatch to language-specific handlers
    const handlers = {
      'c': runCCode,
      'python': runPythonCode,
      'javascript': runJavaScriptCode,
      'node': runJavaScriptCode,
      'cpp': runCppCode,
      'c++': runCppCode,
      'java': runJavaCode,
      'csharp': runCSharpCode,
      'c#': runCSharpCode,
      'cs': runCSharpCode
    };

    const handler = handlers[language.toLowerCase()];
    if (handler) {
      await handler(clientId, code);
    } else {
      await sendMessage(clientId, { type: 'error', message: `Unsupported language: ${language}` });
    }
  } catch (error) {
    await sendMessage(clientId, { type: 'error', message: `Execution failed: ${error.message}` });
  } finally {
    if (executionAcquired) {
      executionLimiter.release();
    }
  }
}

// Language-specific input wrappers (unchanged - too long to repeat)
function getCInputWrapper() {
  return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>

// Iteration counter for loop limiting
static int __iteration_counter__ = 0;
static const int __max_iterations__ = ${SERVER_CONFIG.maxIterations};

#define CHECK_ITERATION_LIMIT() do { \\
  if (++__iteration_counter__ > __max_iterations__) { \\
    fprintf(stderr, "\\n[Execution limit reached: Maximum %d iterations exceeded]\\n", __max_iterations__); \\
    exit(0); \\
  } \\
} while(0)

char* get_server_input(const char* prompt) {
  if (prompt != NULL && strlen(prompt) > 0) {
    printf("%s", prompt);
    fflush(stdout);
  }
  printf("${INPUT_MARKER}");
  fflush(stdout);
  char* line = malloc(1024);
  if (line == NULL) return NULL;
  if (fgets(line, 1024, stdin) != NULL) {
    size_t len = strlen(line);
    if (len > 0 && line[len-1] == '\\n') line[len-1] = '\\0';
    return line;
  }
  free(line);
  return NULL;
}

#undef scanf
#define scanf custom_scanf
int custom_scanf(const char* format, ...) {
  CHECK_ITERATION_LIMIT();
  va_list args;
  va_start(args, format);
  char* input = get_server_input(NULL);
  if (!input) {
    va_end(args);
    return 0;
  }
  int result = vsscanf(input, format, args);
  free(input);
  va_end(args);
  return result;
}
  `;
}

function getPythonInputWrapper() {
  return `
import sys
import builtins

# Iteration counter for loop limiting
__iteration_counter__ = [0]
__max_iterations__ = ${SERVER_CONFIG.maxIterations}

def __check_iteration_limit__():
    __iteration_counter__[0] += 1
    if __iteration_counter__[0] > __max_iterations__:
        print(f"\\n[Execution limit reached: Maximum {__max_iterations__} iterations exceeded]", file=sys.stderr)
        sys.exit(0)

# Hook into loop operations
def __trace_hook__(frame, event, arg):
    if event == 'line':
        __check_iteration_limit__()
    return __trace_hook__

sys.settrace(__trace_hook__)

original_input = builtins.input
def custom_input(prompt=''):
  try:
    if prompt:
      sys.stdout.write(str(prompt))
      sys.stdout.flush()
    sys.stdout.write('${INPUT_MARKER}')
    sys.stdout.flush()
    line = sys.stdin.readline()
    return line.rstrip('\\n')
  except:
    return ''
builtins.input = custom_input
  `;
}

function getCppInputWrapper() {
  return `
#include <iostream>
#include <string>
#include <sstream>
#include <cstdlib>

// Iteration counter for loop limiting
static int __iteration_counter__ = 0;
static const int __max_iterations__ = ${SERVER_CONFIG.maxIterations};

#define CHECK_ITERATION_LIMIT() do { \\
  if (++__iteration_counter__ > __max_iterations__) { \\
    std::cerr << "\\n[Execution limit reached: Maximum " << __max_iterations__ << " iterations exceeded]\\n"; \\
    std::exit(0); \\
  } \\
} while(0)

std::string get_cpp_input(const std::string& prompt) {
  try {
    if (!prompt.empty()) {
      std::cout << prompt << std::flush;
    }
    std::cout << "${INPUT_MARKER}" << std::flush;
    std::string line;
    std::getline(std::cin, line);
    return line;
  } catch (...) {
    return "";
  }
}

class CustomInputStream {
private:
  std::string current_input;
  std::istringstream stream;
public:
  CustomInputStream& operator>>(int& value) {
    CHECK_ITERATION_LIMIT();
    try {
      current_input = get_cpp_input("");
      stream.clear();
      stream.str(current_input);
      stream >> value;
    } catch (...) {
      value = 0;
    }
    return *this;
  }

  CustomInputStream& operator>>(double& value) {
    CHECK_ITERATION_LIMIT();
    try {
      current_input = get_cpp_input("");
      stream.clear();
      stream.str(current_input);
      stream >> value;
    } catch (...) {
      value = 0.0;
    }
    return *this;
  }

  CustomInputStream& operator>>(std::string& value) {
    CHECK_ITERATION_LIMIT();
    try {
      value = get_cpp_input("");
    } catch (...) {
      value = "";
    }
    return *this;
  }
};

#define cin custom_cin_instance
CustomInputStream custom_cin_instance;
using namespace std;
  `;
}

function getJavaInputWrapper() {
  return `
import java.io.*;
import java.util.*;

class IterationLimiter {
  private static int counter = 0;
  private static final int MAX_ITERATIONS = ${SERVER_CONFIG.maxIterations};
  
  public static void check() {
    if (++counter > MAX_ITERATIONS) {
      System.err.println("\\n[Execution limit reached: Maximum " + MAX_ITERATIONS + " iterations exceeded]");
      System.exit(0);
    }
  }
}

class InputHelper {
  private static BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

  public static String getInput(String prompt) {
    IterationLimiter.check();
    try {
      if (prompt != null && !prompt.isEmpty()) {
        System.out.print(prompt);
        System.out.flush();
      }
      System.out.print("${INPUT_MARKER}");
      System.out.flush();
      String line = reader.readLine();
      return line != null ? line : "";
    } catch (Exception e) {
      return "";
    }
  }

  public static int getInt(String prompt) {
    try {
      return Integer.parseInt(getInput(prompt).trim());
    } catch (Exception e) {
      return 0;
    }
  }

  public static double getDouble(String prompt) {
    try {
      return Double.parseDouble(getInput(prompt).trim());
    } catch (Exception e) {
      return 0.0;
    }
  }
}

class Scanner {
  private boolean closed = false;

  public Scanner(java.io.InputStream source) {
    // Constructor that accepts System.in
  }

  public int nextInt() {
    return InputHelper.getInt("");
  }

  public double nextDouble() {
    return InputHelper.getDouble("");
  }

  public String nextLine() {
    return InputHelper.getInput("");
  }

  public String next() {
    String line = InputHelper.getInput("");
    String[] parts = line.trim().split("\\\\s+");
    return parts.length > 0 ? parts[0] : "";
  }

  public boolean hasNext() {
    return !closed;
  }

  public void close() {
    closed = true;
  }
}
  `;
}

function getCSharpInputWrapper() {
  return `
using System;

public static class IterationLimiter {
  private static int counter = 0;
  private static readonly int MAX_ITERATIONS = ${SERVER_CONFIG.maxIterations};
  
  public static void Check() {
    if (++counter > MAX_ITERATIONS) {
      Console.Error.WriteLine("\\n[Execution limit reached: Maximum " + MAX_ITERATIONS + " iterations exceeded]");
      Environment.Exit(0);
    }
  }
}

public static class InputHelper {
  public static string GetInput(string prompt) {
    IterationLimiter.Check();
    try {
      if (!string.IsNullOrEmpty(prompt)) {
        Console.Write(prompt);
      }
      Console.Write("${INPUT_MARKER}");
      return Console.ReadLine() ?? "";
    } catch {
      return "";
    }
  }

  public static int GetInt(string prompt) {
    try {
      return int.Parse(GetInput(prompt));
    } catch {
      return 0;
    }
  }

  public static double GetDouble(string prompt) {
    try {
      return double.Parse(GetInput(prompt));
    } catch {
      return 0.0;
    }
  }
}
  `;
}

function getJavaScriptInputWrapper() {
  return `// JavaScript input wrapper placeholder`;
}

// Python - with error handling and disconnect
async function runPythonCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const fullCode = getPythonInputWrapper() + '\n' + code;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'py-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const scriptFile = path.join(tempDir, 'main.py');
    await fs.writeFile(scriptFile, fullCode, 'utf8');

    // Check for syntax errors by attempting to compile
    const syntaxCheck = await runCommand('python3', ['-m', 'py_compile', scriptFile], { 
      timeout: 5000, 
      cwd: tempDir 
    });
    
    if (syntaxCheck.exitCode !== 0) {
      // SYNTAX ERROR - SEND AND DISCONNECT
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} Python syntax error`);
      
      // Clean up the error message
      let errorMsg = syntaxCheck.stderr;
      // Remove the wrapper code lines from error display
      errorMsg = errorMsg.replace(/File ".*main\.py", line (\d+)/g, (match, lineNum) => {
        const actualLine = parseInt(lineNum) - getPythonInputWrapper().split('\n').length;
        return `Line ${Math.max(1, actualLine)}`;
      });
      
      await sendMessage(clientId, { 
        type: 'error_output', 
        data: `Python syntax error:\n${errorMsg}` 
      });
      await sendMessage(clientId, { 
        type: 'compilation_error', 
        message: 'Syntax error in Python code' 
      });
      await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
      
      await cleanupProcess(clientId);
      
      // Disconnect client after syntax error
      await disconnectClient(clientId);
      return;
    }

    // Execute Python code
    await executeProgram(clientId, ['python3', '-u', scriptFile], { cwd: tempDir });
    
  } catch (error) {
    console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} Python execution error`);
    
    await sendMessage(clientId, { 
      type: 'error', 
      message: `Python execution failed: ${error.message}` 
    });
    await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
    
    await cleanupProcess(clientId);
    await disconnectClient(clientId);
  }
}

// JavaScript/Node.js - with error handling and disconnect
async function runJavaScriptCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    let fullCode = code;
    if (code.includes("require('readline')") || code.includes('require("readline")')) {
      fullCode = getJavaScriptInputWrapper() + '\n' + code;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'js-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const scriptFile = path.join(tempDir, 'main.js');
    await fs.writeFile(scriptFile, fullCode, 'utf8');

    // Check for syntax errors
    const syntaxCheck = await runCommand('node', ['--check', scriptFile], { 
      timeout: 5000, 
      cwd: tempDir 
    });
    
    if (syntaxCheck.exitCode !== 0) {
      // SYNTAX ERROR - SEND AND DISCONNECT
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} JavaScript syntax error`);
      
      await sendMessage(clientId, { 
        type: 'error_output', 
        data: `JavaScript syntax error:\n${syntaxCheck.stderr}` 
      });
      await sendMessage(clientId, { 
        type: 'compilation_error', 
        message: 'Syntax error in JavaScript code' 
      });
      await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
      
      await cleanupProcess(clientId);
      await disconnectClient(clientId);
      return;
    }

    // Execute JavaScript code
    await executeProgram(clientId, ['node', scriptFile], { cwd: tempDir });
    
  } catch (error) {
    console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} JavaScript execution error`);
    
    await sendMessage(clientId, { 
      type: 'error', 
      message: `JavaScript execution failed: ${error.message}` 
    });
    await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
    
    await cleanupProcess(clientId);
    await disconnectClient(clientId);
  }
}

// Example for Java - apply same pattern to all languages
async function runJavaCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userImports, userCode } = extractImportsAndPackages(code, 'java');
    const className = extractJavaClassName(userCode);
    const wrapperCode = getJavaInputWrapper();
    const fullCode = userImports.join('\n') + '\n' + wrapperCode + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'java-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const javaFile = path.join(tempDir, `${className}.java`);
    await fs.writeFile(javaFile, fullCode, 'utf8');

    // Compile
    const compileResult = await runCommand(JAVAC_PATH, [javaFile], { timeout: 30000, cwd: tempDir });
    if (compileResult.exitCode !== 0) {
      // COMPILATION ERROR - SEND AND DISCONNECT
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} compilation failed`);
      
      await sendMessage(clientId, { 
        type: 'error_output', 
        data: `Java compilation error:\n${compileResult.stderr}` 
      });
      await sendMessage(clientId, { 
        type: 'compilation_error', 
        message: 'Compilation failed' 
      });
      await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
      
      await cleanupProcess(clientId);
      
      // Disconnect client after compilation error
      await disconnectClient(clientId);
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'Java compilation successful!\n' });
    await executeProgram(clientId, [JAVA_PATH, '-cp', tempDir, className], { cwd: tempDir });
    
  } catch (error) {
    await sendMessage(clientId, { 
      type: 'error', 
      message: `Java execution failed: ${error.message}` 
    });
    await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
    await cleanupProcess(clientId);
    await disconnectClient(clientId);
  }
}

// Apply same pattern to C, C++, C# compilation functions
async function runCCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userIncludes, userCode } = extractImportsAndPackages(code, 'c');
    const fullCode = userIncludes.join('\n') + '\n' + getCInputWrapper() + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'c-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const sourceFile = path.join(tempDir, 'main.c');
    const execFile = path.join(tempDir, process.platform === 'win32' ? 'main.exe' : 'main');

    await fs.writeFile(sourceFile, fullCode, 'utf8');

    // Compile
    const compileResult = await runCommand('gcc', [sourceFile, '-o', execFile, '-std=c99', '-lm'], { timeout: 30000, cwd: tempDir });
    if (compileResult.exitCode !== 0) {
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} C compilation failed`);
      
      await sendMessage(clientId, { 
        type: 'error_output', 
        data: `C compilation error:\n${compileResult.stderr}` 
      });
      await sendMessage(clientId, { 
        type: 'compilation_error', 
        message: 'Compilation failed' 
      });
      await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
      
      await cleanupProcess(clientId);
      await disconnectClient(clientId);
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'C compilation successful!\n' });
    await executeProgram(clientId, [execFile], { cwd: tempDir });
    
  } catch (error) {
    await sendMessage(clientId, { type: 'error', message: `C execution failed: ${error.message}` });
    await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
    await cleanupProcess(clientId);
    await disconnectClient(clientId);
  }
}

// Apply to C++
async function runCppCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userIncludes, userCode } = extractImportsAndPackages(code, 'cpp');
    const fullCode = userIncludes.join('\n') + '\n' + getCppInputWrapper() + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cpp-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const sourceFile = path.join(tempDir, 'main.cpp');
    const execFile = path.join(tempDir, process.platform === 'win32' ? 'main.exe' : 'main');

    await fs.writeFile(sourceFile, fullCode, 'utf8');

    // Compile
    const compileResult = await runCommand('g++', [sourceFile, '-o', execFile, '-std=c++17', '-lm'], { timeout: 30000, cwd: tempDir });
    if (compileResult.exitCode !== 0) {
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} C++ compilation failed`);
      
      await sendMessage(clientId, { 
        type: 'error_output', 
        data: `C++ compilation error:\n${compileResult.stderr}` 
      });
      await sendMessage(clientId, { 
        type: 'compilation_error', 
        message: 'Compilation failed' 
      });
      await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
      
      await cleanupProcess(clientId);
      await disconnectClient(clientId);
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'C++ compilation successful!\n' });
    await executeProgram(clientId, [execFile], { cwd: tempDir });
    
  } catch (error) {
    await sendMessage(clientId, { type: 'error', message: `C++ execution failed: ${error.message}` });
    await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
    await cleanupProcess(clientId);
    await disconnectClient(clientId);
  }
}

// Apply to C#
async function runCSharpCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userUsings, userCode } = extractImportsAndPackages(code, 'csharp');
    const wrapperCode = getCSharpInputWrapper();
    const fullCode = userUsings.join('\n') + '\n' + wrapperCode + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    // Create dotnet project
    await runCommand('dotnet', ['new', 'console', '-n', 'Runner', '--force'], { timeout: 30000, cwd: tempDir });

    const projectDir = path.join(tempDir, 'Runner');
    const programFile = path.join(projectDir, 'Program.cs');
    await fs.writeFile(programFile, fullCode, 'utf8');

    // Build
    const buildResult = await runCommand('dotnet', ['build'], { timeout: 30000, cwd: projectDir });
    if (buildResult.exitCode !== 0) {
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} C# compilation failed`);
      
      await sendMessage(clientId, { 
        type: 'error_output', 
        data: `C# build error:\n${buildResult.stderr}` 
      });
      await sendMessage(clientId, { 
        type: 'compilation_error', 
        message: 'Compilation failed' 
      });
      await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
      
      await cleanupProcess(clientId);
      await disconnectClient(clientId);
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'C# compilation successful!\n' });
    await executeProgram(clientId, ['dotnet', 'run', '--no-build'], { cwd: projectDir });
    
  } catch (error) {
    await sendMessage(clientId, { type: 'error', message: `C# execution failed: ${error.message}` });
    await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
    await cleanupProcess(clientId);
    await disconnectClient(clientId);
  }
}

// Extract imports and packages (unchanged)
function extractImportsAndPackages(code, language) {
  const lines = code.split('\n');
  const imports = [];
  const otherLines = [];

  if (language === 'java') {
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith('import ') || stripped.startsWith('package ')) {
        if (!stripped.includes('Scanner')) {
          imports.push(line);
        }
      } else {
        otherLines.push(line);
      }
    }
    return { userImports: imports, userCode: otherLines.join('\n') };
  } else if (language === 'c' || language === 'cpp') {
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith('#include') || stripped.startsWith('#define') || stripped.startsWith('#pragma')) {
        imports.push(line);
      } else {
        otherLines.push(line);
      }
    }
    return { userIncludes: imports, userCode: otherLines.join('\n') };
  } else if (language === 'csharp') {
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith('using ')) {
        imports.push(line);
      } else {
        otherLines.push(line);
      }
    }
    return { userUsings: imports, userCode: otherLines.join('\n') };
  }

  return { userCode: code };
}

// Extract Java class name (unchanged)
function extractJavaClassName(code) {
  try {
    // Look for class with main method
    let match = code.match(/class\s+(\w+)\s*\{.*public\s+static\s+void\s+main/s);
    if (match) return match[1];

    // Look for any public class
    match = code.match(/public\s+class\s+(\w+)/);
    if (match) return match[1];

    // Look for any class
    match = code.match(/class\s+(\w+)/);
    if (match) return match[1];
  } catch (error) {
    // Silent error handling
  }
  return 'Main';
}

// Run command (for compilation) - NO LOGGING
async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 30000;
    const proc = spawn(cmd, args, { cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      if (!killed) {
        killed = true;
        proc.kill('SIGKILL');
        reject(new Error('Command timeout'));
      }
    }, timeout);

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (!killed) {
        resolve({ exitCode: code, stdout, stderr });
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      if (!killed) {
        reject(error);
      }
    });
  });
}

// Execute program - MINIMAL LOGGING
async function executeProgram(clientId, cmd, options = {}) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const proc = spawn(cmd[0], cmd.slice(1), {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', PYTHONUNBUFFERED: '1' }
    });

    client.process = proc;
    client.isRunning = true;
    client.outputLineCount = 0;
    client.terminationReason = null;

    // Set execution timeout (1 minute)
    const executionTimeout = setTimeout(async () => {
      if (client.isRunning && client.outputLineCount <= SERVER_CONFIG.maxOutputLines) {
        client.isRunning = false;
        client.terminationReason = 'timeout';
        
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        
        await sendMessage(clientId, { 
          type: 'warning', 
          data: '\n[Execution automatically terminated: 1 minute time limit reached]\n' 
        });
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        await cleanupProcess(clientId);
      }
    }, SERVER_CONFIG.executionTimeout);

    // Handle process IO
    handleProcessIO(clientId, proc, executionTimeout);
  } catch (error) {
    await sendMessage(clientId, { type: 'error', message: `Failed to start process: ${error.message}` });
  }
}

// Handle process IO - COMPLETE ERROR HANDLING WITH DISCONNECT
function handleProcessIO(clientId, proc, executionTimeout) {
  const client = clients.get(clientId);
  if (!client) return;

  let hasError = false; // Track if any error occurred
  let errorBuffer = ''; // Accumulate error messages

  // Handle stdout with immediate termination on limit
  proc.stdout.on('data', async (data) => {
    try {
      if (client.outputLineCount > SERVER_CONFIG.maxOutputLines || hasError) {
        return;
      }

      const text = data.toString();
      const lineCount = (text.match(/\n/g) || []).length;
      const newTotal = client.outputLineCount + lineCount;
      
      if (newTotal > SERVER_CONFIG.maxOutputLines) {
        const allowedLines = SERVER_CONFIG.maxOutputLines - client.outputLineCount;
        
        if (allowedLines > 0) {
          const lines = text.split('\n');
          const allowedText = lines.slice(0, allowedLines + 1).join('\n');
          await processOutput(clientId, allowedText, 'output');
        }
        
        client.outputLineCount = SERVER_CONFIG.maxOutputLines + 1;
        client.isRunning = false;
        client.terminationReason = 'output_limit';
        
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        
        await sendMessage(clientId, { 
          type: 'warning', 
          data: '\n[Execution automatically terminated: Output limit exceeded (max 2000 lines)]\n' 
        });
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        
        clearTimeout(executionTimeout);
        await cleanupProcess(clientId);
        return;
      }
      
      client.outputLineCount = newTotal;
      await processOutput(clientId, text, 'output');
      
    } catch (error) {
      // Silent error handling
    }
  });

  // Handle stderr - COMPLETE ERROR DETECTION AND DISCONNECT
  proc.stderr.on('data', async (data) => {
    try {
      if (hasError) return; // Already handling an error
      
      const text = data.toString();
      errorBuffer += text;
      
      // Check for iteration limit message first (not an error)
      if (text.includes('[Execution limit reached:') || text.includes('iterations exceeded')) {
        client.terminationReason = 'iteration_limit';
        await sendMessage(clientId, { type: 'warning', data: text });
        
        if (!proc.killed && client.isRunning) {
          client.isRunning = false;
          proc.kill('SIGKILL');
        }
        
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        clearTimeout(executionTimeout);
        await cleanupProcess(clientId);
        return;
      }
      
      // Comprehensive error patterns for all languages
      const errorPatterns = [
        // Java errors
        /Exception in thread/i,
        /error:/i,
        /\.java:\d+: error:/i,
        /cannot find symbol/i,
        /class, interface, or enum expected/i,
        
        // Python errors
        /Traceback \(most recent call last\):/i,
        /SyntaxError:/i,
        /IndentationError:/i,
        /NameError:/i,
        /TypeError:/i,
        /ValueError:/i,
        /AttributeError:/i,
        /KeyError:/i,
        /IndexError:/i,
        /ZeroDivisionError:/i,
        /ImportError:/i,
        /ModuleNotFoundError:/i,
        
        // C/C++ errors
        /error: /i,
        /fatal error:/i,
        /undefined reference to/i,
        /Segmentation fault/i,
        /core dumped/i,
        /: error:/i,
        
        // C# errors
        /error CS\d+:/i,
        /Unhandled exception/i,
        
        // JavaScript/Node errors
        /SyntaxError:/i,
        /ReferenceError:/i,
        /RangeError:/i,
        
        // General errors
        /panic:/i,
        /FATAL:/i,
        /compilation terminated/i
      ];
      
      const isError = errorPatterns.some(pattern => pattern.test(text));
      
      if (isError) {
        hasError = true;
        client.terminationReason = 'error';
        client.isRunning = false;
        
        // Send the error output
        await sendMessage(clientId, { type: 'error_output', data: text });
        
        // Kill the process immediately
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        
        // Wait a moment for any remaining error output
        setTimeout(async () => {
          // Send error completion and disconnect
          await sendMessage(clientId, { 
            type: 'runtime_error', 
            message: 'Execution failed due to error' 
          });
          await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
          
          clearTimeout(executionTimeout);
          await cleanupProcess(clientId);
          
          // Disconnect the client
          console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} disconnected due to error`);
          await disconnectClient(clientId);
        }, 500); // Wait 500ms for any remaining output
        
        return;
      }
      
      // Check output limit for stderr
      if (client.outputLineCount > SERVER_CONFIG.maxOutputLines) {
        return;
      }
      
      const lineCount = (text.match(/\n/g) || []).length;
      const newTotal = client.outputLineCount + lineCount;
      
      if (newTotal > SERVER_CONFIG.maxOutputLines) {
        const allowedLines = SERVER_CONFIG.maxOutputLines - client.outputLineCount;
        if (allowedLines > 0) {
          const lines = text.split('\n');
          const allowedText = lines.slice(0, allowedLines + 1).join('\n');
          await processOutput(clientId, allowedText, 'error_output');
        }
        
        client.outputLineCount = SERVER_CONFIG.maxOutputLines + 1;
        client.isRunning = false;
        client.terminationReason = 'output_limit';
        
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        
        await sendMessage(clientId, { 
          type: 'warning', 
          data: '\n[Execution automatically terminated: Output limit exceeded (max 2000 lines)]\n' 
        });
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        
        clearTimeout(executionTimeout);
        await cleanupProcess(clientId);
        return;
      }
      
      client.outputLineCount = newTotal;
      await processOutput(clientId, text, 'error_output');
      
    } catch (error) {
      // Silent error handling
    }
  });

  // Handle stdin input from client
  handleInput(clientId, proc);

  // Handle process completion - CHECK EXIT CODE FOR ERRORS
  proc.on('close', async (code) => {
    try {
      clearTimeout(executionTimeout);
      
      if (client.isRunning) {
        client.isRunning = false;
        
        // Check if process exited with error code
        if (code !== 0 && !client.terminationReason) {
          console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} execution failed (exit: ${code})`);
          
          // Send error message
          await sendMessage(clientId, { 
            type: 'runtime_error', 
            message: `Process exited with error code ${code}` 
          });
          await sendMessage(clientId, { type: 'execution_complete', exit_code: code });
          
          await cleanupProcess(clientId);
          
          // Disconnect the client after error
          await disconnectClient(clientId);
          
        } else if (client.terminationReason === 'user_stop') {
          // User stopped - just complete
          await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
          await cleanupProcess(clientId);
          
        } else if (client.terminationReason === 'error') {
          // Error already handled, just cleanup
          await cleanupProcess(clientId);
          
        } else if (!client.terminationReason) {
          // Normal successful completion
          console.log(`✅ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} execution completed (exit: ${code})`);
          await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
          await sendMessage(clientId, { type: 'execution_complete', exit_code: code || 0 });
          await cleanupProcess(clientId);
        }
      }
    } catch (error) {
      // Silent error handling
    }
  });

  proc.on('error', async (error) => {
    try {
      clearTimeout(executionTimeout);
      client.isRunning = false;
      
      await sendMessage(clientId, { 
        type: 'error', 
        message: `Process error: ${error.message}` 
      });
      await sendMessage(clientId, { type: 'execution_complete', exit_code: 1 });
      await cleanupProcess(clientId);
      
      // Disconnect on process error
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} disconnected due to process error`);
      await disconnectClient(clientId);
      
    } catch (err) {
      // Silent error handling
    }
  });
}

// NEW: Function to disconnect client gracefully
async function disconnectClient(clientId) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    // Send disconnect message
    await sendMessage(clientId, { 
      type: 'disconnect', 
      message: 'Connection closed due to execution error' 
    });

    // Wait a moment for message to be sent
    await new Promise(resolve => setTimeout(resolve, 100));

    // Close WebSocket connection
    if (client.websocket && client.websocket.readyState === WebSocket.OPEN) {
      client.websocket.close(1000, 'Execution error');
    }

    // Cleanup client
    await cleanupClient(clientId);
    
  } catch (error) {
    // Silent error handling
  }
}

// Process output - preserve formatting, handle INPUT_MARKER
async function processOutput(clientId, buffer, type) {
  // Check for input marker
  if (buffer.includes(INPUT_MARKER)) {
    const parts = buffer.split(INPUT_MARKER);
    // Send any output before the input marker
    if (parts[0]) {
      await sendMessage(clientId, { type, data: parts[0] });
    }
    // Request input from client
    await sendMessage(clientId, { type: 'input_request' });
    // Send any output after the input marker (if any)
    if (parts.length > 1 && parts[1]) {
      await sendMessage(clientId, { type, data: parts[1] });
    }
  } else {
    // Send the output exactly as received without any line splitting
    await sendMessage(clientId, { type, data: buffer });
  }
}

// Handle input - NO LOGGING
function handleInput(clientId, proc) {
  const processInput = async () => {
    try {
      const client = clients.get(clientId);
      if (!client || !client.isRunning || !proc.stdin || proc.stdin.destroyed) return;

      if (!client.inputQueue.isEmpty()) {
        try {
          const input = client.inputQueue.dequeue() + '\n';
          proc.stdin.write(input);
        } catch (error) {
          // Silent error handling
        }
      }

      // Continue processing input
      if (client.isRunning) {
        setTimeout(processInput, 100);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  processInput();
}

// Stop execution - FIXED TO PREVENT DUPLICATE MESSAGES
async function stopExecution(clientId) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    // If already stopped or stopping, don't process again
    if (!client.isRunning) return;
    
    client.isRunning = false;
    client.terminationReason = 'user_stop'; // Mark as user stop

    if (client.process) {
      try {
        // Try graceful termination first
        if (!client.process.killed) {
          client.process.kill('SIGTERM');
        }

        // Wait for graceful termination
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (client.process && !client.process.killed) {
              client.process.kill('SIGKILL');
            }
            resolve();
          }, 2000);

          if (client.process) {
            client.process.on('close', () => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            clearTimeout(timeout);
            resolve();
          }
        });
      } catch (error) {
        // Silent error handling
      }
    }

    await cleanupProcess(clientId);
  } catch (error) {
    // Silent error handling
  }
}

// Cleanup process - NO LOGGING
async function cleanupProcess(clientId) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    // Clear input queue
    client.inputQueue.clear();

    // Reset client state
    client.process = null;
    client.isRunning = false;
    client.outputLineCount = 0;
    client.terminationReason = null;

    // Clean up temporary directories
    for (const tempDir of client.tempDirs) {
      try {
        if (fsSync.existsSync(tempDir)) {
          await removeDirectory(tempDir);
          tempDirs.delete(tempDir);
        }
      } catch (error) {
        // Silent error handling
      }
    }
    client.tempDirs.clear();
  } catch (error) {
    // Silent error handling
  }
}

// Cleanup client - MINIMAL LOGGING
async function cleanupClient(clientId) {
  try {
    console.log(`🔴 [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} disconnected`);
    await stopExecution(clientId);
    clients.delete(clientId);
  } catch (error) {
    // Silent error handling
  }
}

// Send message - NO LOGGING
async function sendMessage(clientId, message) {
  try {
    const client = clients.get(clientId);
    if (!client) return false;

    const ws = client.websocket;
    if (ws.readyState === WebSocket.OPEN) {
      const msgStr = JSON.stringify(message);
      ws.send(msgStr);
      return true;
    }
  } catch (error) {
    // Silent error handling
  }
  return false;
}

// Cleanup orphaned resources - NO LOGGING
async function cleanupOrphanedResources() {
  try {
    // Clean up temporary directories
    for (const tempDir of tempDirs) {
      try {
        if (fsSync.existsSync(tempDir)) {
          await removeDirectory(tempDir);
          tempDirs.delete(tempDir);
        }
      } catch (error) {
        // Silent cleanup failure
      }
    }

    // Clean up disconnected clients
    for (const [clientId, client] of clients) {
      if (client.websocket.readyState === WebSocket.CLOSED) {
        await cleanupClient(clientId);
      }
    }
  } catch (error) {
    // Silent error handling
  }
}

// Setup cleanup interval
function setupCleanupInterval() {
  cleanupInterval = setInterval(cleanupOrphanedResources, SERVER_CONFIG.cleanupInterval);
}

// Handle connection - MINIMAL LOGGING
async function handleConnection(ws, req) {
  let clientId = null;
  try {
    clientId = generateClientId(ws, req);
    console.log(`🟢 [${new Date().toLocaleTimeString()}] Client ${clientId.split(':')[0]} connected`);

    // Initialize client state
    clients.set(clientId, {
      websocket: ws,
      process: null,
      tempDirs: new Set(),
      inputQueue: new SafeQueue(),
      isRunning: false,
      lastActivity: Date.now(),
      executionCount: 0,
      outputLineCount: 0,
      terminationReason: null
    });

    // Send connection confirmation
    await sendMessage(clientId, {
      type: 'connection_established',
      message: 'Connected to multi-language execution server',
      clientId
    });

    // Set up WebSocket event handlers
    ws.on('message', async (data) => {
      try {
        await handleMessage(clientId, data);
      } catch (error) {
        await sendMessage(clientId, { type: 'error', message: 'Failed to process message' });
      }
    });

    ws.on('close', async (code, reason) => {
      await cleanupClient(clientId);
    });

    ws.on('error', async (error) => {
      await cleanupClient(clientId);
    });

    // Set up heartbeat
    setupHeartbeat(clientId);

  } catch (error) {
    if (clientId) {
      await cleanupClient(clientId);
    }
  }
}

// Graceful shutdown - MINIMAL LOGGING
async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('🛑 Server shutting down...');

  try {
    // Clear cleanup interval
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }

    // Stop accepting new connections
    if (wss) {
      wss.close();
    }

    // Cleanup all clients
    const cleanupPromises = Array.from(clients.keys()).map(clientId => cleanupClient(clientId));
    await Promise.all(cleanupPromises);

    // Cleanup temporary directories
    const tempCleanupPromises = Array.from(tempDirs).map(tempDir => removeDirectory(tempDir));
    await Promise.all(tempCleanupPromises);

    console.log('✅ Server shutdown complete');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }

  process.exit(0);
}

// Handle uncaught exceptions and rejections - MINIMAL LOGGING
function handleUncaughtException(error) {
  console.error('❌ Uncaught Exception:', error);
  if (!isShuttingDown) {
    gracefulShutdown();
  }
}

function handleUnhandledRejection(reason, promise) {
  console.error('❌ Unhandled Rejection:', reason);
}

// Initialize socket server (main export) - CLEAN LOGGING
export function initializeSocketServer(httpServer, javaBin, javacBin) {
  // Store Java paths if provided
  if (javaBin) JAVA_PATH = javaBin;
  if (javacBin) JAVAC_PATH = javacBin;

  console.log('🚀 Multi-language execution server starting...');
  console.log(`☕ Java: ${JAVA_PATH} | Javac: ${JAVAC_PATH}`);
  console.log(`⏱️ Limits: ${SERVER_CONFIG.executionTimeout/1000}s timeout | ${SERVER_CONFIG.maxIterations} iterations | ${SERVER_CONFIG.maxOutputLines} lines`);

  // Reset state if needed
  clients = new Map();
  tempDirs = new Set();
  executionLimiter = new ExecutionLimiter(SERVER_CONFIG.maxConcurrentExecutions);
  cleanupInterval = null;
  isShuttingDown = false;

  // Create WebSocket server attached to the provided HTTP server
  wss = new WebSocketServer({
    server: httpServer,
    perMessageDeflate: false,
    maxPayload: 1024 * 1024 // 1MB max message size
  });

  wss.on('connection', handleConnection);

  wss.on('error', (error) => {
    console.error('❌ WebSocket server error:', error);
  });

  // Setup cleanup interval
  setupCleanupInterval();

  // Handle process termination
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);

  console.log('✅ Server initialized and ready for connections');
  console.log('📋 Languages: Python, JavaScript, C, C++, Java, C#');
}


/* 
// code-runner.js (ES Module) - ENHANCED WITH LIMITS
import WebSocket, { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Input marker for interactive programs
const INPUT_MARKER = 'INPUT';

// Server configuration - UPDATED
const SERVER_CONFIG = {
  maxConcurrentExecutions: 10,
  executionTimeout: 60000, // 60 seconds (1 minute)
  maxIterations: 1000, // Maximum loop iterations
  maxOutputLines: 2000, // Maximum output lines
  maxQueueSize: 100,
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  heartbeatInterval: 30000,
  cleanupInterval: 60000
};

// SafeQueue implementation
class SafeQueue {
  constructor(maxSize = 100) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(item) {
    if (this.queue.length >= this.maxSize) {
      throw new Error('Queue is full');
    }
    this.queue.push(item);
  }

  dequeue() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  size() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }
}

// ExecutionLimiter implementation
class ExecutionLimiter {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.activeCount = 0;
    this.waitingQueue = new SafeQueue();
  }

  async acquire() {
    return new Promise((resolve, reject) => {
      if (this.activeCount < this.maxConcurrent) {
        this.activeCount++;
        resolve();
      } else {
        try {
          this.waitingQueue.enqueue({ resolve, reject });
        } catch (error) {
          reject(new Error('Execution queue is full'));
        }
      }
    });
  }

  release() {
    this.activeCount--;
    if (!this.waitingQueue.isEmpty()) {
      const { resolve } = this.waitingQueue.dequeue();
      this.activeCount++;
      resolve();
    }
  }

  getStats() {
    return {
      active: this.activeCount,
      waiting: this.waitingQueue.size(),
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Module-level state
let clients = new Map();
let tempDirs = new Set();
let executionLimiter = new ExecutionLimiter(SERVER_CONFIG.maxConcurrentExecutions);
let cleanupInterval = null;
let isShuttingDown = false;
let wss = null;
let JAVA_PATH = 'java';
let JAVAC_PATH = 'javac';

// Utility functions

// Remove directory
async function removeDirectory(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.lstat(filePath);
      if (stat.isDirectory()) {
        await removeDirectory(filePath);
      } else {
        await fs.unlink(filePath);
      }
    }
    await fs.rmdir(dirPath);
  } catch (error) {
    // Silent directory removal errors
  }
}

// Generate client ID
function generateClientId(ws, req) {
  const remoteAddress = req.socket.remoteAddress || 'unknown';
  const remotePort = req.socket.remotePort || 0;
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${remoteAddress}:${remotePort}:${timestamp}:${random}`;
}

// Setup heartbeat for a client
function setupHeartbeat(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  const heartbeatInterval = setInterval(async () => {
    try {
      const client = clients.get(clientId);
      if (!client || client.websocket.readyState !== WebSocket.OPEN) {
        clearInterval(heartbeatInterval);
        return;
      }

      // Check for inactive clients
      if (Date.now() - client.lastActivity > SERVER_CONFIG.heartbeatInterval * 3) {
        clearInterval(heartbeatInterval);
        await cleanupClient(clientId);
        return;
      }

      await sendMessage(clientId, { type: 'ping' });
    } catch (error) {
      clearInterval(heartbeatInterval);
      await cleanupClient(clientId);
    }
  }, SERVER_CONFIG.heartbeatInterval);
}

// Handle message
async function handleMessage(clientId, data) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    client.lastActivity = Date.now();

    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      return; // Ignore invalid JSON
    }

    switch (message.type) {
      case 'run_code':
        await runCode(clientId, message.code, message.language || 'python');
        break;
      case 'input_response':
        handleInputResponse(clientId, message.input);
        break;
      case 'stop_execution':
        await stopExecution(clientId);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        // Ignore unknown message types
        break;
    }
  } catch (error) {
    console.error(`Error in handleMessage for ${clientId}:`, error);
  }
}

// Handle input response
function handleInputResponse(clientId, input) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    client.inputQueue.enqueue(input);
  } catch (error) {
    // Queue is full or other error
  }
}

// Run code (main dispatcher)
async function runCode(clientId, code, language = 'python') {
  let executionAcquired = false;
  try {
    const client = clients.get(clientId);
    if (!client) return;

    console.log(`▶️ Running ${language} code for client ${clientId}`);

    // Stop any existing execution
    await stopExecution(clientId);

    if (!code.trim()) {
      await sendMessage(clientId, { type: 'error', message: 'No code provided' });
      return;
    }

    // Check execution limits
    const stats = executionLimiter.getStats();
    if (stats.waiting >= SERVER_CONFIG.maxQueueSize) {
      await sendMessage(clientId, { type: 'error', message: 'Server is overloaded. Please try again later.' });
      return;
    }

    // Acquire execution slot
    await executionLimiter.acquire();
    executionAcquired = true;

    client.executionCount++;
    // Rate limiting per client
    if (client.executionCount > 50) {
      await sendMessage(clientId, { type: 'error', message: 'Rate limit exceeded. Please reconnect.' });
      return;
    }

    // Dispatch to language-specific handlers
    const handlers = {
      'c': runCCode,
      'python': runPythonCode,
      'javascript': runJavaScriptCode,
      'node': runJavaScriptCode,
      'cpp': runCppCode,
      'c++': runCppCode,
      'java': runJavaCode,
      'csharp': runCSharpCode,
      'c#': runCSharpCode,
      'cs': runCSharpCode
    };

    const handler = handlers[language.toLowerCase()];
    if (handler) {
      await handler(clientId, code);
    } else {
      await sendMessage(clientId, { type: 'error', message: `Unsupported language: ${language}` });
    }
  } catch (error) {
    console.error(`Error running code for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `Execution failed: ${error.message}` });
  } finally {
    if (executionAcquired) {
      executionLimiter.release();
    }
  }
}

// Language-specific input wrappers WITH ITERATION LIMITS

function getCInputWrapper() {
  return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>

// Iteration counter for loop limiting
static int __iteration_counter__ = 0;
static const int __max_iterations__ = ${SERVER_CONFIG.maxIterations};

#define CHECK_ITERATION_LIMIT() do { \\
  if (++__iteration_counter__ > __max_iterations__) { \\
    fprintf(stderr, "\\n[Execution limit reached: Maximum %d iterations exceeded]\\n", __max_iterations__); \\
    exit(0); \\
  } \\
} while(0)

char* get_server_input(const char* prompt) {
  if (prompt != NULL && strlen(prompt) > 0) {
    printf("%s", prompt);
    fflush(stdout);
  }
  printf("${INPUT_MARKER}");
  fflush(stdout);
  char* line = malloc(1024);
  if (line == NULL) return NULL;
  if (fgets(line, 1024, stdin) != NULL) {
    size_t len = strlen(line);
    if (len > 0 && line[len-1] == '\\n') line[len-1] = '\\0';
    return line;
  }
  free(line);
  return NULL;
}

#undef scanf
#define scanf custom_scanf
int custom_scanf(const char* format, ...) {
  CHECK_ITERATION_LIMIT();
  va_list args;
  va_start(args, format);
  char* input = get_server_input(NULL);
  if (!input) {
    va_end(args);
    return 0;
  }
  int result = vsscanf(input, format, args);
  free(input);
  va_end(args);
  return result;
}
  `;
}

function getPythonInputWrapper() {
  return `
import sys
import builtins

# Iteration counter for loop limiting
__iteration_counter__ = [0]
__max_iterations__ = ${SERVER_CONFIG.maxIterations}

def __check_iteration_limit__():
    __iteration_counter__[0] += 1
    if __iteration_counter__[0] > __max_iterations__:
        print(f"\\n[Execution limit reached: Maximum {__max_iterations__} iterations exceeded]", file=sys.stderr)
        sys.exit(0)

# Hook into loop operations
def __trace_hook__(frame, event, arg):
    if event == 'line':
        __check_iteration_limit__()
    return __trace_hook__

sys.settrace(__trace_hook__)

original_input = builtins.input
def custom_input(prompt=''):
  try:
    if prompt:
      sys.stdout.write(str(prompt))
      sys.stdout.flush()
    sys.stdout.write('${INPUT_MARKER}')
    sys.stdout.flush()
    line = sys.stdin.readline()
    return line.rstrip('\\n')
  except:
    return ''
builtins.input = custom_input
  `;
}

function getCppInputWrapper() {
  return `
#include <iostream>
#include <string>
#include <sstream>
#include <cstdlib>

// Iteration counter for loop limiting
static int __iteration_counter__ = 0;
static const int __max_iterations__ = ${SERVER_CONFIG.maxIterations};

#define CHECK_ITERATION_LIMIT() do { \\
  if (++__iteration_counter__ > __max_iterations__) { \\
    std::cerr << "\\n[Execution limit reached: Maximum " << __max_iterations__ << " iterations exceeded]\\n"; \\
    std::exit(0); \\
  } \\
} while(0)

std::string get_cpp_input(const std::string& prompt) {
  try {
    if (!prompt.empty()) {
      std::cout << prompt << std::flush;
    }
    std::cout << "${INPUT_MARKER}" << std::flush;
    std::string line;
    std::getline(std::cin, line);
    return line;
  } catch (...) {
    return "";
  }
}

class CustomInputStream {
private:
  std::string current_input;
  std::istringstream stream;
public:
  CustomInputStream& operator>>(int& value) {
    CHECK_ITERATION_LIMIT();
    try {
      current_input = get_cpp_input("");
      stream.clear();
      stream.str(current_input);
      stream >> value;
    } catch (...) {
      value = 0;
    }
    return *this;
  }

  CustomInputStream& operator>>(double& value) {
    CHECK_ITERATION_LIMIT();
    try {
      current_input = get_cpp_input("");
      stream.clear();
      stream.str(current_input);
      stream >> value;
    } catch (...) {
      value = 0.0;
    }
    return *this;
  }

  CustomInputStream& operator>>(std::string& value) {
    CHECK_ITERATION_LIMIT();
    try {
      value = get_cpp_input("");
    } catch (...) {
      value = "";
    }
    return *this;
  }
};

#define cin custom_cin_instance
CustomInputStream custom_cin_instance;
using namespace std;
  `;
}

function getJavaInputWrapper() {
  return `
import java.io.*;
import java.util.*;

class IterationLimiter {
  private static int counter = 0;
  private static final int MAX_ITERATIONS = ${SERVER_CONFIG.maxIterations};
  
  public static void check() {
    if (++counter > MAX_ITERATIONS) {
      System.err.println("\\n[Execution limit reached: Maximum " + MAX_ITERATIONS + " iterations exceeded]");
      System.exit(0);
    }
  }
}

class InputHelper {
  private static BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

  public static String getInput(String prompt) {
    IterationLimiter.check();
    try {
      if (prompt != null && !prompt.isEmpty()) {
        System.out.print(prompt);
        System.out.flush();
      }
      System.out.print("${INPUT_MARKER}");
      System.out.flush();
      String line = reader.readLine();
      return line != null ? line : "";
    } catch (Exception e) {
      return "";
    }
  }

  public static int getInt(String prompt) {
    try {
      return Integer.parseInt(getInput(prompt).trim());
    } catch (Exception e) {
      return 0;
    }
  }

  public static double getDouble(String prompt) {
    try {
      return Double.parseDouble(getInput(prompt).trim());
    } catch (Exception e) {
      return 0.0;
    }
  }
}

class Scanner {
  private boolean closed = false;

  public Scanner(java.io.InputStream source) {
    // Constructor that accepts System.in
  }

  public int nextInt() {
    return InputHelper.getInt("");
  }

  public double nextDouble() {
    return InputHelper.getDouble("");
  }

  public String nextLine() {
    return InputHelper.getInput("");
  }

  public String next() {
    String line = InputHelper.getInput("");
    String[] parts = line.trim().split("\\\\s+");
    return parts.length > 0 ? parts[0] : "";
  }

  public boolean hasNext() {
    return !closed;
  }

  public void close() {
    closed = true;
  }
}
  `;
}

function getCSharpInputWrapper() {
  return `
using System;

public static class IterationLimiter {
  private static int counter = 0;
  private static readonly int MAX_ITERATIONS = ${SERVER_CONFIG.maxIterations};
  
  public static void Check() {
    if (++counter > MAX_ITERATIONS) {
      Console.Error.WriteLine("\\n[Execution limit reached: Maximum " + MAX_ITERATIONS + " iterations exceeded]");
      Environment.Exit(0);
    }
  }
}

public static class InputHelper {
  public static string GetInput(string prompt) {
    IterationLimiter.Check();
    try {
      if (!string.IsNullOrEmpty(prompt)) {
        Console.Write(prompt);
      }
      Console.Write("${INPUT_MARKER}");
      return Console.ReadLine() ?? "";
    } catch {
      return "";
    }
  }

  public static int GetInt(string prompt) {
    try {
      return int.Parse(GetInput(prompt));
    } catch {
      return 0;
    }
  }

  public static double GetDouble(string prompt) {
    try {
      return double.Parse(GetInput(prompt));
    } catch {
      return 0.0;
    }
  }
}
  `;
}

function getJavaScriptInputWrapper() {
  return `
// JavaScript input wrapper placeholder
  `;
}

// Language-specific run functions (existing functions remain the same)
async function runCCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userIncludes, userCode } = extractImportsAndPackages(code, 'c');
    const fullCode = userIncludes.join('\n') + '\n' + getCInputWrapper() + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'c-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const sourceFile = path.join(tempDir, 'main.c');
    const execFile = path.join(tempDir, process.platform === 'win32' ? 'main.exe' : 'main');

    await fs.writeFile(sourceFile, fullCode, 'utf8');

    // Compile
    console.log(`Compiling C code for client ${clientId}...`);
    const compileResult = await runCommand('gcc', [sourceFile, '-o', execFile, '-std=c99', '-lm'], { timeout: 30000, cwd: tempDir });
    if (compileResult.exitCode !== 0) {
      await sendMessage(clientId, { type: 'error_output', data: `C compilation error:\n${compileResult.stderr}` });
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'C compilation successful!\n' });

    await executeProgram(clientId, [execFile], { cwd: tempDir });
  } catch (error) {
    console.error(`C execution error for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `C execution failed: ${error.message}` });
  }
}

async function runPythonCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const fullCode = getPythonInputWrapper() + '\n' + code;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'py-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const scriptFile = path.join(tempDir, 'main.py');
    await fs.writeFile(scriptFile, fullCode, 'utf8');

    console.log(`Executing Python code for client ${clientId}...`);
    await executeProgram(clientId, ['python3', '-u', scriptFile], { cwd: tempDir });
  } catch (error) {
    console.error(`Python execution error for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `Python execution failed: ${error.message}` });
  }
}

async function runJavaScriptCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    let fullCode = code;
    if (code.includes("require('readline')") || code.includes('require("readline")')) {
      fullCode = getJavaScriptInputWrapper() + '\n' + code;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'js-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const scriptFile = path.join(tempDir, 'main.js');
    await fs.writeFile(scriptFile, fullCode, 'utf8');

    console.log(`Executing JavaScript code for client ${clientId}...`);
    await executeProgram(clientId, ['node', scriptFile], { cwd: tempDir });
  } catch (error) {
    console.error(`JavaScript execution error for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `JavaScript execution failed: ${error.message}` });
  }
}

async function runCppCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userIncludes, userCode } = extractImportsAndPackages(code, 'cpp');
    const fullCode = userIncludes.join('\n') + '\n' + getCppInputWrapper() + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cpp-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const sourceFile = path.join(tempDir, 'main.cpp');
    const execFile = path.join(tempDir, process.platform === 'win32' ? 'main.exe' : 'main');

    await fs.writeFile(sourceFile, fullCode, 'utf8');

    // Compile
    console.log(`Compiling C++ code for client ${clientId}...`);
    const compileResult = await runCommand('g++', [sourceFile, '-o', execFile, '-std=c++17', '-lm'], { timeout: 30000, cwd: tempDir });
    if (compileResult.exitCode !== 0) {
      await sendMessage(clientId, { type: 'error_output', data: `C++ compilation error:\n${compileResult.stderr}` });
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'C++ compilation successful!\n' });

    await executeProgram(clientId, [execFile], { cwd: tempDir });
  } catch (error) {
    console.error(`C++ execution error for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `C++ execution failed: ${error.message}` });
  }
}

async function runJavaCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userImports, userCode } = extractImportsAndPackages(code, 'java');
    const className = extractJavaClassName(userCode);
    const wrapperCode = getJavaInputWrapper();
    const fullCode = userImports.join('\n') + '\n' + wrapperCode + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'java-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    const javaFile = path.join(tempDir, `${className}.java`);
    await fs.writeFile(javaFile, fullCode, 'utf8');

    // Compile with custom javac path
    console.log(`Compiling Java code for client ${clientId} using ${JAVAC_PATH}...`);
    const compileResult = await runCommand(JAVAC_PATH, [javaFile], { timeout: 30000, cwd: tempDir });
    if (compileResult.exitCode !== 0) {
      await sendMessage(clientId, { type: 'error_output', data: `Java compilation error:\n${compileResult.stderr}` });
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'Java compilation successful!\n' });

    // Execute with custom java path
    console.log(`Executing Java code for client ${clientId} using ${JAVA_PATH}...`);
    await executeProgram(clientId, [JAVA_PATH, '-cp', tempDir, className], { cwd: tempDir });
  } catch (error) {
    console.error(`Java execution error for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `Java execution failed: ${error.message}` });
  }
}

async function runCSharpCode(clientId, code) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    const { userUsings, userCode } = extractImportsAndPackages(code, 'csharp');
    const wrapperCode = getCSharpInputWrapper();
    const fullCode = userUsings.join('\n') + '\n' + wrapperCode + '\n' + userCode;

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-exec-'));
    tempDirs.add(tempDir);
    client.tempDirs.add(tempDir);

    // Create dotnet project
    console.log(`Creating C# project for client ${clientId}...`);
    await runCommand('dotnet', ['new', 'console', '-n', 'Runner', '--force'], { timeout: 30000, cwd: tempDir });

    const projectDir = path.join(tempDir, 'Runner');
    const programFile = path.join(projectDir, 'Program.cs');
    await fs.writeFile(programFile, fullCode, 'utf8');

    // Build
    console.log(`Building C# code for client ${clientId}...`);
    const buildResult = await runCommand('dotnet', ['build'], { timeout: 30000, cwd: projectDir });
    if (buildResult.exitCode !== 0) {
      await sendMessage(clientId, { type: 'error_output', data: `C# build error:\n${buildResult.stderr}` });
      return;
    }

    await sendMessage(clientId, { type: 'output', data: 'C# compilation successful!\n' });

    await executeProgram(clientId, ['dotnet', 'run', '--no-build'], { cwd: projectDir });
  } catch (error) {
    console.error(`C# execution error for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `C# execution failed: ${error.message}` });
  }
}

// Extract imports and packages
function extractImportsAndPackages(code, language) {
  const lines = code.split('\n');
  const imports = [];
  const otherLines = [];

  if (language === 'java') {
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith('import ') || stripped.startsWith('package ')) {
        if (!stripped.includes('Scanner')) {
          imports.push(line);
        }
      } else {
        otherLines.push(line);
      }
    }
    return { userImports: imports, userCode: otherLines.join('\n') };
  } else if (language === 'c' || language === 'cpp') {
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith('#include') || stripped.startsWith('#define') || stripped.startsWith('#pragma')) {
        imports.push(line);
      } else {
        otherLines.push(line);
      }
    }
    return { userIncludes: imports, userCode: otherLines.join('\n') };
  } else if (language === 'csharp') {
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith('using ')) {
        imports.push(line);
      } else {
        otherLines.push(line);
      }
    }
    return { userUsings: imports, userCode: otherLines.join('\n') };
  }

  return { userCode: code };
}

// Extract Java class name
function extractJavaClassName(code) {
  try {
    // Look for class with main method
    let match = code.match(/class\s+(\w+)\s*\{.*public\s+static\s+void\s+main/s);
    if (match) return match[1];

    // Look for any public class
    match = code.match(/public\s+class\s+(\w+)/);
    if (match) return match[1];

    // Look for any class
    match = code.match(/class\s+(\w+)/);
    if (match) return match[1];
  } catch (error) {
    // Silent error handling
  }
  return 'Main';
}

// Run command (for compilation)
async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 30000;
    console.log(`Running command: ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, { cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      if (!killed) {
        killed = true;
        proc.kill('SIGKILL');
        reject(new Error('Command timeout'));
      }
    }, timeout);

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (!killed) {
        resolve({ exitCode: code, stdout, stderr });
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      if (!killed) {
        reject(error);
      }
    });
  });
}

// Execute program - ENHANCED WITH BETTER TIMEOUT HANDLING
async function executeProgram(clientId, cmd, options = {}) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    console.log(`Starting execution for client ${clientId}: ${cmd.join(' ')}`);
    const proc = spawn(cmd[0], cmd.slice(1), {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', PYTHONUNBUFFERED: '1' }
    });

    client.process = proc;
    client.isRunning = true;
    client.outputLineCount = 0;
    client.terminationReason = null;

    // Set execution timeout (1 minute)
    const executionTimeout = setTimeout(async () => {
      if (client.isRunning && client.outputLineCount <= SERVER_CONFIG.maxOutputLines) {
        console.log(`⏰ Execution time limit reached for client ${clientId}`);
        client.isRunning = false;
        client.terminationReason = 'timeout';
        
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        
        await sendMessage(clientId, { 
          type: 'warning', 
          data: '\n[Execution automatically terminated: 1 minute time limit reached]\n' 
        });
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        await cleanupProcess(clientId);
      }
    }, SERVER_CONFIG.executionTimeout);

    // Handle process IO
    handleProcessIO(clientId, proc, executionTimeout);
  } catch (error) {
    console.error(`Failed to start process for ${clientId}:`, error);
    await sendMessage(clientId, { type: 'error', message: `Failed to start process: ${error.message}` });
  }
}

// Handle process IO - ENHANCED WITH PRECISE OUTPUT LIMITING
function handleProcessIO(clientId, proc, executionTimeout) {
  const client = clients.get(clientId);
  if (!client) return;

  // Handle stdout with immediate termination on limit
  proc.stdout.on('data', async (data) => {
    const text = data.toString();
    console.log(`📤 Stdout from client ${clientId}:`, text);
    
    try {
      // Check if we've already exceeded the limit
      if (client.outputLineCount > SERVER_CONFIG.maxOutputLines) {
        return; // Don't process more output
      }

      // Count lines in this chunk BEFORE processing
      const lineCount = (text.match(/\n/g) || []).length;
      const newTotal = client.outputLineCount + lineCount;
      
      if (newTotal > SERVER_CONFIG.maxOutputLines) {
        console.log(`📊 Output limit will be exceeded for client ${clientId}: ${newTotal} lines`);
        
        // Calculate how many lines we can still show
        const allowedLines = SERVER_CONFIG.maxOutputLines - client.outputLineCount;
        
        if (allowedLines > 0) {
          // Split the text and only send the allowed portion
          const lines = text.split('\n');
          const allowedText = lines.slice(0, allowedLines + 1).join('\n'); // +1 because last line might not have \n
          await processOutput(clientId, allowedText, 'output');
        }
        
        // Update counter and terminate immediately
        client.outputLineCount = SERVER_CONFIG.maxOutputLines + 1; // Mark as exceeded
        client.isRunning = false;
        
        // Kill process immediately
        if (!proc.killed) {
          proc.kill('SIGKILL'); // Use SIGKILL for immediate termination
        }
        
        // Send termination messages
        await sendMessage(clientId, { 
          type: 'warning', 
          data: '\n[Execution automatically terminated: Output limit exceeded (max 2000 lines)]\n' 
        });
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        
        clearTimeout(executionTimeout);
        await cleanupProcess(clientId);
        return;
      }
      
      // Normal processing - update counter and send output
      client.outputLineCount = newTotal;
      await processOutput(clientId, text, 'output');
      
    } catch (error) {
      console.error(`Error processing stdout for ${clientId}:`, error);
    }
  });

  // Handle stderr with same limiting logic
  proc.stderr.on('data', async (data) => {
    const text = data.toString();
    console.log(`📤 Stderr from client ${clientId}:`, text);
    
    try {
      // Check for iteration limit message first
      if (text.includes('[Execution limit reached:') || text.includes('iterations exceeded')) {
        client.terminationReason = 'iteration_limit';
        await sendMessage(clientId, { type: 'warning', data: text });
        
        if (!proc.killed && client.isRunning) {
          client.isRunning = false;
          proc.kill('SIGKILL');
        }
        
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        clearTimeout(executionTimeout);
        await cleanupProcess(clientId);
        return;
      }
      
      // Check output limit for stderr too
      if (client.outputLineCount > SERVER_CONFIG.maxOutputLines) {
        return;
      }
      
      const lineCount = (text.match(/\n/g) || []).length;
      const newTotal = client.outputLineCount + lineCount;
      
      if (newTotal > SERVER_CONFIG.maxOutputLines) {
        const allowedLines = SERVER_CONFIG.maxOutputLines - client.outputLineCount;
        if (allowedLines > 0) {
          const lines = text.split('\n');
          const allowedText = lines.slice(0, allowedLines + 1).join('\n');
          await processOutput(clientId, allowedText, 'error_output');
        }
        
        client.outputLineCount = SERVER_CONFIG.maxOutputLines + 1;
        client.isRunning = false;
        
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        
        await sendMessage(clientId, { 
          type: 'warning', 
          data: '\n[Execution automatically terminated: Output limit exceeded (max 2000 lines)]\n' 
        });
        await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        await sendMessage(clientId, { type: 'execution_complete', exit_code: 0 });
        
        clearTimeout(executionTimeout);
        await cleanupProcess(clientId);
        return;
      }
      
      client.outputLineCount = newTotal;
      await processOutput(clientId, text, 'error_output');
      
    } catch (error) {
      console.error(`Error processing stderr for ${clientId}:`, error);
    }
  });

  // Handle stdin input from client
  handleInput(clientId, proc);

  // Handle process completion
  proc.on('close', async (code) => {
    try {
      clearTimeout(executionTimeout);
      console.log(`✅ Process completed for client ${clientId} with exit code ${code}`);
      if (client.isRunning) {
        client.isRunning = false;
        
        // Only send success message if not already sent due to termination
        if (!client.terminationReason && client.outputLineCount <= SERVER_CONFIG.maxOutputLines) {
          await sendMessage(clientId, { type: 'success', data: '=== Code Execution Successful ===\n' });
        }
        
        await sendMessage(clientId, { type: 'execution_complete', exit_code: code || 0 });
        await cleanupProcess(clientId);
      }
    } catch (error) {
      console.error(`Error on process close for ${clientId}:`, error);
    }
  });

  proc.on('error', async (error) => {
    try {
      clearTimeout(executionTimeout);
      console.error(`❌ Process error for client ${clientId}:`, error);
      client.isRunning = false;
      await sendMessage(clientId, { type: 'error', message: `Process error: ${error.message}` });
      await cleanupProcess(clientId);
    } catch (err) {
      console.error(`Error handling process error for ${clientId}:`, err);
    }
  });
}

// Process output - preserve formatting, handle INPUT_MARKER
async function processOutput(clientId, buffer, type) {
  // Check for input marker
  if (buffer.includes(INPUT_MARKER)) {
    const parts = buffer.split(INPUT_MARKER);
    // Send any output before the input marker
    if (parts[0]) {
      await sendMessage(clientId, { type, data: parts[0] });
    }
    // Request input from client
    console.log(`⌨️ Requesting input from client ${clientId}`);
    await sendMessage(clientId, { type: 'input_request' });
    // Send any output after the input marker (if any)
    if (parts.length > 1 && parts[1]) {
      await sendMessage(clientId, { type, data: parts[1] });
    }
  } else {
    // Send the output exactly as received without any line splitting
    await sendMessage(clientId, { type, data: buffer });
  }
}

// Handle input
function handleInput(clientId, proc) {
  const processInput = async () => {
    try {
      const client = clients.get(clientId);
      if (!client || !client.isRunning || !proc.stdin || proc.stdin.destroyed) return;

      if (!client.inputQueue.isEmpty()) {
        try {
          const input = client.inputQueue.dequeue() + '\n';
          console.log(`⌨️ Sending input to process for client ${clientId}:`, input.trim());
          proc.stdin.write(input);
        } catch (error) {
          console.error(`Error writing input for ${clientId}:`, error);
        }
      }

      // Continue processing input
      if (client.isRunning) {
        setTimeout(processInput, 100);
      }
    } catch (error) {
      console.error(`Error in handleInput for ${clientId}:`, error);
    }
  };

  processInput();
}

// Stop execution
async function stopExecution(clientId) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    console.log(`⏹️ Stopping execution for client ${clientId}`);
    client.isRunning = false;

    if (client.process) {
      try {
        // Try graceful termination first
        if (!client.process.killed) {
          client.process.kill('SIGTERM');
        }

        // Wait for graceful termination
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (!client.process.killed) {
              client.process.kill('SIGKILL');
            }
            resolve();
          }, 2000);

          client.process.on('close', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (error) {
        console.error(`Error killing process for ${clientId}:`, error);
      }
    }

    await cleanupProcess(clientId);
  } catch (error) {
    console.error(`Error in stopExecution for ${clientId}:`, error);
  }
}

// Cleanup process
async function cleanupProcess(clientId) {
  try {
    const client = clients.get(clientId);
    if (!client) return;

    console.log(`🧹 Cleaning up process for client ${clientId}`);

    // Clear input queue
    client.inputQueue.clear();

    // Reset client state
    client.process = null;
    client.isRunning = false;
    client.outputLineCount = 0;

    // Clean up temporary directories
    for (const tempDir of client.tempDirs) {
      try {
        if (fsSync.existsSync(tempDir)) {
          await removeDirectory(tempDir);
          tempDirs.delete(tempDir);
        }
      } catch (error) {
        console.error(`Error removing temp dir ${tempDir}:`, error);
      }
    }
    client.tempDirs.clear();
  } catch (error) {
    console.error(`Error in cleanupProcess for ${clientId}:`, error);
  }
}

// Cleanup client
async function cleanupClient(clientId) {
  try {
    console.log(`🧹 Cleaning up client ${clientId}`);
    await stopExecution(clientId);
    clients.delete(clientId);
  } catch (error) {
    console.error(`Error in cleanupClient for ${clientId}:`, error);
  }
}

// Send message
async function sendMessage(clientId, message) {
  try {
    const client = clients.get(clientId);
    if (!client) return false;

    const ws = client.websocket;
    if (ws.readyState === WebSocket.OPEN) {
      const msgStr = JSON.stringify(message);
      console.log(`📨 Sending message to client ${clientId}:`, msgStr.substring(0, 100));
      ws.send(msgStr);
      return true;
    } else {
      console.warn(`⚠️ Cannot send message to client ${clientId}, WebSocket not open (state: ${ws.readyState})`);
    }
  } catch (error) {
    console.error(`Error sending message to ${clientId}:`, error);
  }
  return false;
}

// Cleanup orphaned resources
async function cleanupOrphanedResources() {
  try {
    // Clean up temporary directories
    for (const tempDir of tempDirs) {
      try {
        if (fsSync.existsSync(tempDir)) {
          await removeDirectory(tempDir);
          tempDirs.delete(tempDir);
        }
      } catch (error) {
        // Silent cleanup failure
      }
    }

    // Clean up disconnected clients
    for (const [clientId, client] of clients) {
      if (client.websocket.readyState === WebSocket.CLOSED) {
        await cleanupClient(clientId);
      }
    }
  } catch (error) {
    console.error('Error in cleanupOrphanedResources:', error);
  }
}

// Setup cleanup interval
function setupCleanupInterval() {
  cleanupInterval = setInterval(cleanupOrphanedResources, SERVER_CONFIG.cleanupInterval);
}

// Handle connection
async function handleConnection(ws, req) {
  let clientId = null;
  try {
    clientId = generateClientId(ws, req);
    console.log(`🟢 Client connected: ${clientId} from ${req.socket.remoteAddress}`);

    // Initialize client state
    clients.set(clientId, {
      websocket: ws,
      process: null,
      tempDirs: new Set(),
      inputQueue: new SafeQueue(),
      isRunning: false,
      lastActivity: Date.now(),
      executionCount: 0,
      outputLineCount: 0 // NEW: Track output lines
    });

    // Send connection confirmation
    await sendMessage(clientId, {
      type: 'connection_established',
      message: 'Connected to multi-language execution server',
      clientId
    });

    // Set up WebSocket event handlers
    ws.on('message', async (data) => {
      console.log(`📨 Message received from ${clientId}:`, data.toString());
      try {
        await handleMessage(clientId, data);
      } catch (error) {
        console.error(`❌ Error processing message from ${clientId}:`, error);
        await sendMessage(clientId, { type: 'error', message: 'Failed to process message' });
      }
    });

    ws.on('close', async (code, reason) => {
      console.log(`🔴 Client disconnected: ${clientId} (code: ${code}, reason: ${reason})`);
      await cleanupClient(clientId);
    });

    ws.on('error', async (error) => {
      console.error(`⚠ WebSocket error for client ${clientId}:`, error);
      await cleanupClient(clientId);
    });

    // Set up heartbeat
    setupHeartbeat(clientId);

  } catch (error) {
    console.error(`❌ Failed to initialize connection for client ${clientId || 'unknown'}:`, error);
    if (clientId) {
      await cleanupClient(clientId);
    }
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('Shutting down server...');

  try {
    // Clear cleanup interval
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }

    // Stop accepting new connections
    if (wss) {
      wss.close();
    }

    // Cleanup all clients
    const cleanupPromises = Array.from(clients.keys()).map(clientId => cleanupClient(clientId));
    await Promise.all(cleanupPromises);

    // Cleanup temporary directories
    const tempCleanupPromises = Array.from(tempDirs).map(tempDir => removeDirectory(tempDir));
    await Promise.all(tempCleanupPromises);

    console.log('Server shutdown complete');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }

  process.exit(0);
}

// Handle uncaught exceptions and rejections
function handleUncaughtException(error) {
  console.error('Uncaught Exception:', error);
  if (!isShuttingDown) {
    gracefulShutdown();
  }
}

function handleUnhandledRejection(reason, promise) {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}

// Initialize socket server (main export)
export function initializeSocketServer(httpServer, javaBin, javacBin) {
  // Store Java paths if provided
  if (javaBin) JAVA_PATH = javaBin;
  if (javacBin) JAVAC_PATH = javacBin;

  console.log(`Java paths configured: JAVA=${JAVA_PATH}, JAVAC=${JAVAC_PATH}`);
  console.log(`⏰ Execution limits: ${SERVER_CONFIG.executionTimeout/1000}s timeout, ${SERVER_CONFIG.maxIterations} max iterations`);

  // Reset state if needed
  clients = new Map();
  tempDirs = new Set();
  executionLimiter = new ExecutionLimiter(SERVER_CONFIG.maxConcurrentExecutions);
  cleanupInterval = null;
  isShuttingDown = false;

  // Create WebSocket server attached to the provided HTTP server
  wss = new WebSocketServer({
    server: httpServer,
    perMessageDeflate: false,
    maxPayload: 1024 * 1024 // 1MB max message size
  });

  wss.on('connection', handleConnection);

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Setup cleanup interval
  setupCleanupInterval();

  // Handle process termination
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);

  console.log('Multi-language execution server initialized with limits');
  console.log('Supported languages: Python, JavaScript, C, C++, Java, C#');
  console.log('Connect from your web interface to start executing code.');
}
*/

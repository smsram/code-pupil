// SSE Manager - Handles all connected students
class SSEManager {
  constructor() {
    this.connections = new Map(); // test_id -> Map(student_id -> response)
  }

  // Add student connection
  addConnection(testId, studentId, res) {
    if (!this.connections.has(testId)) {
      this.connections.set(testId, new Map());
    }
    
    this.connections.get(testId).set(studentId, res);
    console.log(`[SSE] Student ${studentId} connected to test ${testId}`);
    console.log(`[SSE] Total connections for test ${testId}: ${this.connections.get(testId).size}`);
  }

  // Remove student connection
  removeConnection(testId, studentId) {
    if (this.connections.has(testId)) {
      this.connections.get(testId).delete(studentId);
      console.log(`[SSE] Student ${studentId} disconnected from test ${testId}`);
      
      if (this.connections.get(testId).size === 0) {
        this.connections.delete(testId);
      }
    }
  }

  // Broadcast live message to all students in a test
  broadcastLiveMessage(testId, message) {
    if (!this.connections.has(testId)) {
      console.log(`[SSE] No connections for test ${testId}`);
      return 0;
    }

    const testConnections = this.connections.get(testId);
    let sentCount = 0;

    testConnections.forEach((res, studentId) => {
      try {
        res.write(`data: ${JSON.stringify({
          type: 'live',
          message_id: message.message_id,
          message: message.message,
          created_at: message.created_at
        })}\n\n`);
        sentCount++;
      } catch (err) {
        console.error(`[SSE] Failed to send to student ${studentId}:`, err);
        this.removeConnection(testId, studentId);
      }
    });

    console.log(`[SSE] Broadcasted to ${sentCount} students in test ${testId}`);
    return sentCount;
  }

  // Send scheduled message to specific student
  sendScheduledMessage(testId, studentId, message) {
    if (!this.connections.has(testId)) {
      console.log(`[SSE] No connection for test ${testId}`);
      return false;
    }

    const testConnections = this.connections.get(testId);
    const res = testConnections.get(studentId);

    if (!res) {
      console.log(`[SSE] Student ${studentId} not connected`);
      return false;
    }

    try {
      res.write(`data: ${JSON.stringify({
        type: 'scheduled',
        message_id: message.message_id,
        message: message.message,
        time_minutes: message.time_minutes,
        created_at: message.created_at
      })}\n\n`);
      console.log(`[SSE] ✅ Sent scheduled message to student ${studentId}`);
      return true;
    } catch (err) {
      console.error(`[SSE] Failed to send scheduled message:`, err);
      this.removeConnection(testId, studentId);
      return false;
    }
  }

  // Get connection count
  getConnectionCount(testId) {
    return this.connections.has(testId) ? this.connections.get(testId).size : 0;
  }
}

module.exports = new SSEManager();

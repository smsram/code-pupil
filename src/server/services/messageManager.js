// Helper function to get IST timestamp
function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:MM:SS
}

// In-memory message manager for active tests (IST timestamps)
class MessageManager {
  constructor() {
    this.activeTests = new Map(); // test_id -> { liveMessages: [], students: Map() }
  }

  // Initialize test when it starts (no need to load scheduled messages)
  async initTest(testId, db) {
    if (this.activeTests.has(testId)) {
      console.log(`[MESSAGE_MGR] Test ${testId} already initialized`);
      return;
    }

    console.log(`[MESSAGE_MGR] 🚀 Initializing test ${testId}...`);

    this.activeTests.set(testId, {
      liveMessages: [], // Only live messages in memory
      students: new Map() // student_id -> { start_time, delivered: Set(message_ids) }
    });

    console.log(`[MESSAGE_MGR] ✅ Initialized test ${testId}`);
  }

  // Register student when they start the test
  registerStudent(testId, studentId, startTime) {
    if (!this.activeTests.has(testId)) return;

    const test = this.activeTests.get(testId);
    
    if (!test.students.has(studentId)) {
      test.students.set(studentId, {
        start_time: startTime,
        delivered: new Set() // Track delivered message IDs
      });
      
      const istNow = getISTTimestamp();
      console.log(`[MESSAGE_MGR] [${istNow} IST] Student ${studentId} registered for test ${testId}`);
    }
  }

  // Add live message (instant delivery) with IST timestamp
  addLiveMessage(testId, message) {
    if (!this.activeTests.has(testId)) {
      console.log(`[MESSAGE_MGR] Test ${testId} not active, ignoring live message`);
      return;
    }

    const istNow = getISTTimestamp();
    const liveMsg = {
      message_id: Date.now() + Math.random(), // Temporary ID
      message: message,
      created_at: istNow, // IST timestamp
      type: 'live'
    };

    this.activeTests.get(testId).liveMessages.push(liveMsg);
    console.log(`[MESSAGE_MGR] [${istNow} IST] ✅ Added live message to test ${testId}: "${message}"`);
  }

  // Get pending live messages for a student
  getMessagesForStudent(testId, studentId) {
    if (!this.activeTests.has(testId)) {
      return [];
    }

    const test = this.activeTests.get(testId);
    const student = test.students.get(studentId);

    if (!student) {
      return [];
    }

    const messages = [];

    // Get all live messages not yet delivered to this student
    test.liveMessages.forEach(msg => {
      if (!student.delivered.has(msg.message_id)) {
        messages.push(msg);
        student.delivered.add(msg.message_id);
        
        const istNow = getISTTimestamp();
        console.log(`[MESSAGE_MGR] [${istNow} IST] 📨 Delivering live message to student ${studentId}: "${msg.message}"`);
      }
    });

    // Clean up live messages after all students received them
    if (messages.length > 0) {
      this.cleanupLiveMessages(testId);
    }

    return messages;
  }

  // Remove live messages that all students have received
  cleanupLiveMessages(testId) {
    if (!this.activeTests.has(testId)) return;

    const test = this.activeTests.get(testId);
    const allStudents = Array.from(test.students.values());

    test.liveMessages = test.liveMessages.filter(msg => {
      const allDelivered = allStudents.every(student => student.delivered.has(msg.message_id));
      if (allDelivered) {
        const istNow = getISTTimestamp();
        console.log(`[MESSAGE_MGR] [${istNow} IST] 🗑️ Cleaned up live message ${msg.message_id}`);
      }
      return !allDelivered;
    });
  }

  // Clean up test when completed
  cleanupTest(testId) {
    if (this.activeTests.has(testId)) {
      this.activeTests.delete(testId);
      
      const istNow = getISTTimestamp();
      console.log(`[MESSAGE_MGR] [${istNow} IST] 🗑️ Cleaned up test ${testId}`);
    }
  }

  // Get test info (for debugging)
  getTestInfo(testId) {
    if (!this.activeTests.has(testId)) {
      return null;
    }

    const test = this.activeTests.get(testId);
    const istNow = getISTTimestamp();
    
    return {
      test_id: testId,
      active_students: test.students.size,
      pending_messages: test.liveMessages.length,
      checked_at: istNow
    };
  }

  // Get all active tests
  getAllActiveTests() {
    const istNow = getISTTimestamp();
    const activeTests = [];

    this.activeTests.forEach((test, testId) => {
      activeTests.push({
        test_id: testId,
        active_students: test.students.size,
        pending_messages: test.liveMessages.length
      });
    });

    console.log(`[MESSAGE_MGR] [${istNow} IST] Active tests: ${activeTests.length}`);
    return activeTests;
  }
}

module.exports = new MessageManager();

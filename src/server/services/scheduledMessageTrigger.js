const sseManager = require('./sseManager');

class ScheduledMessageTrigger {
  constructor(db) {
    this.db = db;
    this.activeTests = new Map(); // test_id -> interval
  }

  // Start monitoring a test
  async startTest(testId) {
    if (this.activeTests.has(testId)) {
      console.log(`[TRIGGER] Test ${testId} already being monitored`);
      return;
    }

    console.log(`[TRIGGER] 🚀 Starting monitoring for test ${testId}`);

    // Check immediately
    await this.checkScheduledMessages(testId);

    // Then check every 30 seconds
    const interval = setInterval(async () => {
      await this.checkScheduledMessages(testId);
    }, 30000);

    this.activeTests.set(testId, interval);
  }

  // Stop monitoring a test
  stopTest(testId) {
    if (this.activeTests.has(testId)) {
      clearInterval(this.activeTests.get(testId));
      this.activeTests.delete(testId);
      console.log(`[TRIGGER] Stopped monitoring test ${testId}`);
    }
  }

  // Check and send scheduled messages
  async checkScheduledMessages(testId) {
    try {
      console.log(`[TRIGGER] 🔍 Checking scheduled messages for test ${testId}...`);

      // Get all students currently taking this test
      const studentsResult = await this.db.execute({
        sql: `SELECT student_id, start_time 
              FROM TestStudents 
              WHERE test_id = ? AND status = 'in-progress' AND start_time IS NOT NULL`,
        args: [testId]
      });

      if (studentsResult.rows.length === 0) {
        console.log(`[TRIGGER] No active students for test ${testId}`);
        return;
      }

      console.log(`[TRIGGER] Found ${studentsResult.rows.length} active students`);

      for (const student of studentsResult.rows) {
        const startTime = new Date(student.start_time);
        const now = new Date();
        const elapsedMinutes = Math.floor((now - startTime) / 60000);

        console.log(`[TRIGGER] Student ${student.student_id}: ${elapsedMinutes} minutes elapsed`);

        // Get scheduled messages due for this student
        const messagesResult = await this.db.execute({
          sql: `SELECT sm.message_id, sm.message, sm.time_minutes, sm.created_at
                FROM ScheduledMessages sm
                WHERE sm.test_id = ? 
                  AND sm.time_minutes <= ?
                  AND NOT EXISTS (
                    SELECT 1 FROM DeliveredScheduledMessages dsm
                    WHERE dsm.message_id = sm.message_id 
                      AND dsm.student_id = ?
                  )
                ORDER BY sm.time_minutes ASC`,
          args: [testId, elapsedMinutes, student.student_id]
        });

        if (messagesResult.rows.length > 0) {
          console.log(`[TRIGGER] 📨 Found ${messagesResult.rows.length} messages to send to student ${student.student_id}`);
        }

        // Send each message via SSE
        for (const msg of messagesResult.rows) {
          console.log(`[TRIGGER] Sending message ${msg.message_id} (scheduled for ${msg.time_minutes} min): "${msg.message}"`);

          const sent = sseManager.sendScheduledMessage(testId, student.student_id, {
            message_id: Number(msg.message_id),
            message: msg.message,
            time_minutes: msg.time_minutes,
            created_at: msg.created_at
          });

          if (sent) {
            // Mark as delivered
            try {
              await this.db.execute({
                sql: `INSERT INTO DeliveredScheduledMessages (test_id, student_id, message_id, delivered_at)
                      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                args: [testId, student.student_id, msg.message_id]
              });
              console.log(`[TRIGGER] ✅ Delivered and tracked message ${msg.message_id}`);
            } catch (err) {
              console.log(`[TRIGGER] Message ${msg.message_id} already delivered`);
            }
          } else {
            console.log(`[TRIGGER] ❌ Failed to send message ${msg.message_id} - student not connected`);
          }
        }
      }
    } catch (error) {
      console.error(`[TRIGGER] Error checking scheduled messages:`, error);
    }
  }
}

module.exports = ScheduledMessageTrigger;

const express = require("express");
const { createClient } = require("@libsql/client");
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const messageManager = require("../services/messageManager");

const router = express.Router();

// Turso DB config
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper function to get IST timestamp
function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:MM:SS
}

// Generate random 6-character alphanumeric ID (uppercase letters and numbers)
const generateTestId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Check if test ID already exists
const isTestIdUnique = async (testId) => {
  const result = await db.execute({
    sql: "SELECT test_id FROM Tests WHERE test_id = ?",
    args: [testId],
  });
  return result.rows.length === 0;
};

// Generate unique test ID with retry logic
const generateUniqueTestId = async (maxRetries = 10) => {
  for (let i = 0; i < maxRetries; i++) {
    const testId = generateTestId();
    if (await isTestIdUnique(testId)) {
      return testId;
    }
  }
  throw new Error("Unable to generate unique test ID after maximum retries");
};

// GET: Faculty Dashboard Data (FIXED)
router.get("/faculty/:faculty_id/dashboard", async (req, res) => {
  try {
    const { faculty_id } = req.params;

    // Get all tests created by this faculty (using faculty_id, not created_by)
    const allTestsResult = await db.execute({
      sql: `SELECT * FROM Tests WHERE faculty_id = ? AND LOWER(TRIM(status)) = 'published' ORDER BY created_at DESC`,
      args: [faculty_id]
    });

    const allTests = allTestsResult.rows;
    const now = new Date();

    // Calculate test statuses
    let liveTests = [];
    let upcomingTests = 0;
    let completedTests = 0;
    let totalActiveStudents = 0;
    let totalStudents = 0;
    let totalCompletedStudents = 0;

    for (const test of allTests) {
      const startTime = new Date(test.start_time);
      const endTime = new Date(startTime.getTime() + test.duration * 60000);

      // Get batch student count
      const batchStudentsResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM Student 
              WHERE start_year = ? AND branch = ? AND section = ?`,
        args: [test.start_year, test.branch, test.section.toString()]
      });

      const batchStudentCount = Number(batchStudentsResult.rows[0]?.count || 0);

      // Get test statistics
      const testStatsResult = await db.execute({
        sql: `SELECT 
                COUNT(DISTINCT student_id) as registeredStudents,
                COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as activeStudents,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedStudents
              FROM TestStudents
              WHERE test_id = ?`,
        args: [test.test_id]
      });

      const testStats = testStatsResult.rows[0];
      const activeStudents = Number(testStats.activeStudents || 0);
      const completedStudents = Number(testStats.completedStudents || 0);
      const registeredStudents = Number(testStats.registeredStudents || 0);

      if (now >= startTime && now <= endTime) {
        // Live test
        liveTests.push({
          test_id: test.test_id,
          title: test.title,
          language: test.language,
          branch: test.branch,
          section: test.section,
          start_time: test.start_time,
          duration: test.duration,
          activeStudents: activeStudents,
          completedStudents: completedStudents,
          totalStudents: batchStudentCount,
          completionPercentage: batchStudentCount > 0 
            ? Math.round((completedStudents / batchStudentCount) * 100) 
            : 0
        });
        totalActiveStudents += activeStudents;
      } else if (now < startTime) {
        upcomingTests++;
      } else {
        completedTests++;
      }

      totalStudents += batchStudentCount;
      totalCompletedStudents += completedStudents;
    }

    const completionRate = totalStudents > 0 
      ? Math.round((totalCompletedStudents / totalStudents) * 100) 
      : 0;

    // Get recent activity (last 10 submissions/activities)
    const recentActivityResult = await db.execute({
      sql: `SELECT 
              s.first_name,
              s.last_name,
              s.pin,
              ts.test_id,
              t.title as test_title,
              tsub.submitted_at,
              tsub.score,
              ts.similarity,
              ts.errors
            FROM TestSubmissions tsub
            JOIN TestStudents ts ON tsub.test_id = ts.test_id AND tsub.student_id = ts.student_id
            JOIN Student s ON ts.student_id = s.student_id
            JOIN Tests t ON ts.test_id = t.test_id
            WHERE t.faculty_id = ?
            ORDER BY tsub.submitted_at DESC
            LIMIT 10`,
      args: [faculty_id]
    });

    const recentActivity = recentActivityResult.rows.map(row => {
      const similarity = Number(row.similarity || 0);
      const score = row.score !== null ? Number(row.score) : null;
      const errors = Number(row.errors || 0);

      let type, title, description;

      if (similarity > 80) {
        type = 'alert';
        title = `High similarity detected (${similarity}%)`;
        description = `${row.test_title} - ${row.first_name} ${row.last_name} (${row.pin})`;
      } else if (errors > 5) {
        type = 'warning';
        title = `High error rate detected (${errors} errors)`;
        description = `${row.test_title} - ${row.first_name} ${row.last_name}`;
      } else if (score !== null) {
        if (score >= 80) {
          type = 'success';
          title = `${row.first_name} ${row.last_name} scored ${score}%`;
          description = `Test: ${row.test_title}`;
        } else if (score >= 60) {
          type = 'warning';
          title = `${row.first_name} ${row.last_name} scored ${score}%`;
          description = `Test: ${row.test_title}`;
        } else {
          type = 'info';
          title = `${row.first_name} ${row.last_name} completed test`;
          description = `Test: ${row.test_title} | Score: ${score}%`;
        }
      } else {
        type = 'info';
        title = `${row.first_name} ${row.last_name} submitted solution`;
        description = `Test: ${row.test_title} | Score: Pending evaluation`;
      }

      const time = getTimeAgo(new Date(row.submitted_at));

      return { type, title, description, time };
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          liveTests: liveTests.length,
          activeTests: totalActiveStudents,
          upcomingTests,
          completedTests,
          totalStudents,
          completionRate
        },
        liveTests,
        recentActivity
      }
    });

  } catch (error) {
    console.error("Fetch dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// GET: Faculty Notifications
router.get("/:faculty_id/notifications", async (req, res) => {
  try {
    const { faculty_id } = req.params;

    // Get notifications (you can create a Notifications table or generate from activities)
    // For now, generate from recent test activities
    const notifications = [];

    // Get recent high similarity detections
    const similarityAlerts = await db.execute({
      sql: `SELECT 
              t.title,
              s.first_name,
              s.last_name,
              ts.similarity,
              ts.updated_at
            FROM TestStudents ts
            JOIN Tests t ON ts.test_id = t.test_id
            JOIN Student s ON ts.student_id = s.student_id
            WHERE t.faculty_id = ? AND ts.similarity > 80
            ORDER BY ts.updated_at DESC
            LIMIT 5`,
      args: [faculty_id]
    });

    similarityAlerts.rows.forEach((row, index) => {
      notifications.push({
        id: `sim_${index}`,
        type: "alert",
        title: "High Similarity Detected",
        message: `${row.first_name} ${row.last_name} - ${row.title} (${row.similarity}%)`,
        created_at: row.updated_at,
        read: false
      });
    });

    // Get recent submissions
    const recentSubmissions = await db.execute({
      sql: `SELECT 
              t.title,
              s.first_name,
              s.last_name,
              tsub.submitted_at,
              tsub.score
            FROM TestSubmissions tsub
            JOIN Tests t ON tsub.test_id = t.test_id
            JOIN Student s ON tsub.student_id = s.student_id
            WHERE t.faculty_id = ?
            ORDER BY tsub.submitted_at DESC
            LIMIT 5`,
      args: [faculty_id]
    });

    recentSubmissions.rows.forEach((row, index) => {
      notifications.push({
        id: `sub_${index}`,
        type: "info",
        title: "New Submission",
        message: `${row.first_name} ${row.last_name} submitted ${row.title}`,
        created_at: row.submitted_at,
        read: false
      });
    });

    // Sort by date
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json({
      success: true,
      data: notifications.slice(0, 10)
    });

  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// PUT: Mark notification as read
router.put("/notifications/:notification_id/read", async (req, res) => {
  try {
    // In real app, update database
    // For now, just return success
    res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// PUT: Mark all notifications as read
router.put("/:faculty_id/notifications/read-all", async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Helper function to get time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Helper function to get time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// CREATE TEST Route
router.post("/create", async (req, res) => {
  try {
    const {
      facultyId,
      title,
      language,
      startYear,
      branch,
      section,
      description,
      date,
      time,
      duration,
      maxAttempts,
      similarityThreshold,
      fullscreenMode,
      autoSubmit,
      showResults,
      waitUntilEnd,
      allowCopy,
      allowPaste,
      status,
      scheduledMessages,
    } = req.body;

    // Validation
    if (!facultyId) {
      return res.status(401).json({
        success: false,
        message: "Faculty ID is required. Please login again.",
      });
    }

    if (
      !title ||
      !language ||
      !startYear ||
      !branch ||
      !section ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Verify faculty exists
    const facultyCheck = await db.execute({
      sql: "SELECT faculty_id FROM Faculty WHERE faculty_id = ?",
      args: [facultyId],
    });

    if (facultyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    // Generate unique test ID
    const testId = await generateUniqueTestId();

    // Combine date and time for start_time (DATETIME format)
    const startTime = `${date} ${time}`;

    // Validate status
    const validStatuses = ["unpublished", "draft", "published"];
    const testStatus = validStatuses.includes(status) ? status : "unpublished";

    // Insert test into database
    await db.execute({
      sql: `INSERT INTO Tests (
        test_id, faculty_id, title, language, start_year, branch, section,
        description, start_time, duration, max_attempts,
        similarity_threshold, fullscreen_mode, auto_submit, show_results,
        wait_until_end, allow_copy, allow_paste, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        testId,
        facultyId,
        title,
        language,
        startYear,
        branch,
        parseInt(section),
        description || null,
        startTime,
        parseInt(duration),
        parseInt(maxAttempts),
        parseInt(similarityThreshold),
        fullscreenMode ? 1 : 0,
        autoSubmit ? 1 : 0,
        showResults ? 1 : 0,
        waitUntilEnd ? 1 : 0,
        allowCopy ? 1 : 0,
        allowPaste ? 1 : 0,
        testStatus,
      ],
    });

    console.log(`Test ${testId} created successfully`);

    // Insert scheduled messages if provided
    let scheduledCount = 0;
    if (
      scheduledMessages &&
      Array.isArray(scheduledMessages) &&
      scheduledMessages.length > 0
    ) {
      console.log(
        `Processing ${scheduledMessages.length} scheduled messages...`
      );

      for (const msg of scheduledMessages) {
        // Validate message has both time and message text
        if (msg.time && msg.message && msg.message.trim().length > 0) {
          try {
            const timeMinutes = parseInt(msg.time);

            // Validate time is positive
            if (timeMinutes > 0) {
              await db.execute({
                sql: `INSERT INTO ScheduledMessages (test_id, time_minutes, message, created_at)
                      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                args: [testId, timeMinutes, msg.message.trim()],
              });
              scheduledCount++;
              console.log(
                `Added scheduled message: "${msg.message}" at ${timeMinutes} minutes`
              );
            } else {
              console.warn(`Skipped message with invalid time: ${msg.time}`);
            }
          } catch (err) {
            console.error(`Failed to insert scheduled message:`, err);
          }
        } else {
          console.warn(`Skipped invalid scheduled message:`, msg);
        }
      }

      console.log(
        `Successfully added ${scheduledCount} scheduled messages for test ${testId}`
      );
    }

    // Fetch the created test
    const createdTest = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [testId],
    });

    // Fetch scheduled messages to confirm they were saved
    const savedScheduledMessages = await db.execute({
      sql: `SELECT message_id, time_minutes, message FROM ScheduledMessages WHERE test_id = ?`,
      args: [testId],
    });

    console.log(
      `Retrieved ${savedScheduledMessages.rows.length} scheduled messages from database`
    );

    res.status(201).json({
      success: true,
      message:
        testStatus === "published"
          ? `Test created and published successfully! ${
              scheduledCount > 0
                ? `${scheduledCount} scheduled messages added.`
                : ""
            }`
          : testStatus === "draft"
          ? `Test saved as draft successfully! ${
              scheduledCount > 0
                ? `${scheduledCount} scheduled messages added.`
                : ""
            }`
          : `Test created as unpublished successfully! ${
              scheduledCount > 0
                ? `${scheduledCount} scheduled messages added.`
                : ""
            }`,
      data: {
        test_id: testId,
        test: createdTest.rows[0],
        scheduled_messages_count: scheduledCount,
        scheduled_messages: savedScheduledMessages.rows.map((row) => ({
          message_id: Number(row.message_id),
          time_minutes: row.time_minutes,
          message: row.message,
        })),
      },
    });
  } catch (error) {
    console.error("Test creation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during test creation",
      error: error.message,
    });
  }
});

// UPDATE TEST Route
router.put("/:test_id/update", async (req, res) => {
  try {
    const { test_id } = req.params;
    const {
      facultyId,
      title,
      language,
      startYear,
      branch,
      section,
      description,
      date,
      time,
      duration,
      maxAttempts,
      similarityThreshold,
      fullscreenMode,
      autoSubmit,
      showResults,
      waitUntilEnd,
      allowCopy,
      allowPaste,
      status,
      scheduledMessages,
    } = req.body;

    // Validation
    if (!facultyId) {
      return res.status(401).json({
        success: false,
        message: "Faculty ID is required. Please login again.",
      });
    }

    if (!title || !language || !startYear || !branch || !section || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Verify test exists and belongs to faculty
    const testCheck = await db.execute({
      sql: "SELECT test_id, faculty_id FROM Tests WHERE test_id = ?",
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to edit this test",
      });
    }

    // Combine date and time for start_time
    const startTime = `${date} ${time}`;

    // Validate status
    const validStatuses = ["unpublished", "draft", "published"];
    const testStatus = validStatuses.includes(status) ? status : "unpublished";

    // Update test in database
    await db.execute({
      sql: `UPDATE Tests SET
        title = ?,
        language = ?,
        start_year = ?,
        branch = ?,
        section = ?,
        description = ?,
        start_time = ?,
        duration = ?,
        max_attempts = ?,
        similarity_threshold = ?,
        fullscreen_mode = ?,
        auto_submit = ?,
        show_results = ?,
        wait_until_end = ?,
        allow_copy = ?,
        allow_paste = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE test_id = ?`,
      args: [
        title,
        language,
        startYear,
        branch,
        parseInt(section),
        description || null,
        startTime,
        parseInt(duration),
        parseInt(maxAttempts),
        parseInt(similarityThreshold),
        fullscreenMode ? 1 : 0,
        autoSubmit ? 1 : 0,
        showResults ? 1 : 0,
        waitUntilEnd ? 1 : 0,
        allowCopy ? 1 : 0,
        allowPaste ? 1 : 0,
        testStatus,
        test_id,
      ],
    });

    console.log(`Test ${test_id} updated successfully`);

    // Handle scheduled messages
    // First, get existing message IDs
    const existingMessages = await db.execute({
      sql: `SELECT message_id FROM ScheduledMessages WHERE test_id = ?`,
      args: [test_id]
    });

    const existingMessageIds = existingMessages.rows.map(row => row.message_id);

    // Process scheduled messages
    let scheduledCount = 0;
    const updatedMessageIds = [];

    if (scheduledMessages && Array.isArray(scheduledMessages) && scheduledMessages.length > 0) {
      for (const msg of scheduledMessages) {
        if (msg.time_minutes && msg.message && msg.message.trim().length > 0) {
          const timeMinutes = parseInt(msg.time_minutes);

          if (timeMinutes > 0) {
            if (msg.message_id) {
              // Update existing message
              await db.execute({
                sql: `UPDATE ScheduledMessages 
                      SET time_minutes = ?, message = ?
                      WHERE message_id = ? AND test_id = ?`,
                args: [timeMinutes, msg.message.trim(), msg.message_id, test_id]
              });
              updatedMessageIds.push(msg.message_id);
              scheduledCount++;
              console.log(`Updated scheduled message ID: ${msg.message_id}`);
            } else {
              // Insert new message
              const insertResult = await db.execute({
                sql: `INSERT INTO ScheduledMessages (test_id, time_minutes, message, created_at)
                      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                args: [test_id, timeMinutes, msg.message.trim()]
              });
              scheduledCount++;
              console.log(`Added new scheduled message at ${timeMinutes} minutes`);
            }
          }
        }
      }
    }

    // Delete messages that were removed
    const messagesToDelete = existingMessageIds.filter(id => !updatedMessageIds.includes(id));
    
    for (const messageId of messagesToDelete) {
      await db.execute({
        sql: `DELETE FROM ScheduledMessages WHERE message_id = ?`,
        args: [messageId]
      });
      console.log(`Deleted scheduled message ID: ${messageId}`);
    }

    // Fetch updated test
    const updatedTest = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    // Fetch updated scheduled messages
    const savedScheduledMessages = await db.execute({
      sql: `SELECT message_id, time_minutes, message FROM ScheduledMessages WHERE test_id = ? ORDER BY time_minutes ASC`,
      args: [test_id],
    });

    res.status(200).json({
      success: true,
      message: testStatus === "published"
        ? `Test updated and published successfully!`
        : testStatus === "draft"
        ? `Test updated and saved as draft!`
        : `Test updated successfully!`,
      data: {
        test_id: test_id,
        test: updatedTest.rows[0],
        scheduled_messages_count: savedScheduledMessages.rows.length,
        scheduled_messages: savedScheduledMessages.rows.map((row) => ({
          message_id: Number(row.message_id),
          time_minutes: row.time_minutes,
          message: row.message,
        })),
      },
    });
  } catch (error) {
    console.error("Test update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during test update",
      error: error.message,
    });
  }
});

// GET TEST by ID
router.get("/:test_id", async (req, res) => {
  try {
    const { test_id } = req.params;

    const result = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    // Get scheduled messages
    const messages = await db.execute({
      sql: `SELECT * FROM ScheduledMessages WHERE test_id = ? ORDER BY time_minutes ASC`,
      args: [test_id],
    });

    // Get student count
    const test = result.rows[0];
    const studentCountResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM Student 
            WHERE start_year = ? AND branch = ? AND section = ?`,
      args: [test.start_year, test.branch, test.section.toString()],
    });

    res.status(200).json({
      success: true,
      data: {
        test: result.rows[0],
        scheduledMessages: messages.rows,
        totalStudents: studentCountResult.rows[0].total,
      },
    });
  } catch (error) {
    console.error("Fetch test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// UPDATE TEST by ID
router.put("/:test_id", async (req, res) => {
  try {
    const { test_id } = req.params;
    const {
      facultyId,
      title,
      language,
      startYear,
      branch,
      section,
      description,
      date,
      time,
      duration,
      maxAttempts,
      similarityThreshold,
      fullscreenMode,
      autoSubmit,
      showResults,
      waitUntilEnd,
      allowCopy,
      allowPaste,
      status,
      scheduledMessages,
    } = req.body;

    // Verify the test exists and belongs to this faculty
    const testCheck = await db.execute({
      sql: `SELECT test_id, faculty_id FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    // Verify faculty ownership
    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this test",
      });
    }

    // Combine date and time for start_time
    const startTime = `${date} ${time}`;

    // Validate status
    const validStatuses = ["unpublished", "draft", "published"];
    const testStatus = validStatuses.includes(status) ? status : "unpublished";

    // Update test
    await db.execute({
      sql: `UPDATE Tests SET
        title = ?, language = ?, start_year = ?, branch = ?, section = ?,
        description = ?, start_time = ?, duration = ?, max_attempts = ?,
        similarity_threshold = ?, fullscreen_mode = ?, auto_submit = ?,
        show_results = ?, wait_until_end = ?, allow_copy = ?, allow_paste = ?,
        status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE test_id = ?`,
      args: [
        title,
        language,
        startYear,
        branch,
        parseInt(section),
        description || null,
        startTime,
        parseInt(duration),
        parseInt(maxAttempts),
        parseInt(similarityThreshold),
        fullscreenMode ? 1 : 0,
        autoSubmit ? 1 : 0,
        showResults ? 1 : 0,
        waitUntilEnd ? 1 : 0,
        allowCopy ? 1 : 0,
        allowPaste ? 1 : 0,
        testStatus,
        test_id,
      ],
    });

    // Delete existing scheduled messages
    await db.execute({
      sql: `DELETE FROM ScheduledMessages WHERE test_id = ?`,
      args: [test_id],
    });

    // Insert new scheduled messages if provided
    if (
      scheduledMessages &&
      Array.isArray(scheduledMessages) &&
      scheduledMessages.length > 0
    ) {
      for (const msg of scheduledMessages) {
        if (msg.time && msg.message) {
          await db.execute({
            sql: `INSERT INTO ScheduledMessages (test_id, time_minutes, message)
                  VALUES (?, ?, ?)`,
            args: [test_id, parseInt(msg.time), msg.message],
          });
        }
      }
    }

    // Fetch the updated test
    const updatedTest = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    res.status(200).json({
      success: true,
      message: "Test updated successfully",
      data: {
        test: updatedTest.rows[0],
      },
    });
  } catch (error) {
    console.error("Update test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during update",
    });
  }
});

// GET ALL TESTS by Faculty ID with student count (UPDATED)
router.get("/faculty/:faculty_id", async (req, res) => {
  try {
    const { faculty_id } = req.params;

    // Fetch all tests for this faculty
    const testsResult = await db.execute({
      sql: `SELECT * FROM Tests WHERE faculty_id = ? ORDER BY created_at DESC`,
      args: [faculty_id],
    });

    // For each test, get the student count and completed count
    const testsWithCounts = await Promise.all(
      testsResult.rows.map(async (test) => {
        // Count total students matching test criteria
        const studentCountResult = await db.execute({
          sql: `SELECT COUNT(*) as total FROM Student 
                WHERE start_year = ? AND branch = ? AND section = ?`,
          args: [test.start_year, test.branch, test.section.toString()],
        });

        // Count completed students (those who have submitted)
        const completedCountResult = await db.execute({
          sql: `SELECT COUNT(DISTINCT student_id) as completed 
                FROM TestSubmissions 
                WHERE test_id = ?`,
          args: [test.test_id],
        });

        return {
          ...test,
          totalStudents: Number(studentCountResult.rows[0]?.total || 0),
          completedStudents: Number(completedCountResult.rows[0]?.completed || 0),
        };
      })
    );

    res.status(200).json({
      success: true,
      data: testsWithCounts,
    });
  } catch (error) {
    console.error("Fetch tests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// DELETE TEST by ID (UPDATED route path)
router.delete("/:test_id", async (req, res) => {
  try {
    const { test_id } = req.params;
    const { facultyId } = req.body;

    // Verify the test exists and belongs to this faculty
    const testCheck = await db.execute({
      sql: `SELECT test_id, faculty_id FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    // Verify faculty ownership
    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this test",
      });
    }

    // Delete the test (CASCADE will handle related records)
    await db.execute({
      sql: `DELETE FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    console.log(`Test ${test_id} deleted successfully`);

    res.status(200).json({
      success: true,
      message: "Test deleted successfully",
    });
  } catch (error) {
    console.error("Delete test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during deletion",
    });
  }
});

// UNPUBLISH TEST
router.post("/:test_id/unpublish", async (req, res) => {
  try {
    const { test_id } = req.params;
    const { facultyId } = req.body;

    // Verify test belongs to faculty
    const testCheck = await db.execute({
      sql: `SELECT test_id, faculty_id, start_time, duration FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to unpublish this test",
      });
    }

    // Check if test has started (can only unpublish upcoming tests)
    const now = new Date();
    const startTime = new Date(testCheck.rows[0].start_time);
    
    if (now >= startTime) {
      return res.status(400).json({
        success: false,
        message: "Cannot unpublish a test that has already started or completed",
      });
    }

    // Update status to unpublished
    await db.execute({
      sql: `UPDATE Tests SET status = 'unpublished', updated_at = CURRENT_TIMESTAMP WHERE test_id = ?`,
      args: [test_id],
    });

    res.status(200).json({
      success: true,
      message: "Test unpublished successfully",
    });
  } catch (error) {
    console.error("Unpublish test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during unpublish",
    });
  }
});

// DUPLICATE TEST
router.post("/:test_id/duplicate", async (req, res) => {
  try {
    const { test_id } = req.params;
    const { facultyId, asTemplate } = req.body;

    // Verify test belongs to faculty
    const testCheck = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const originalTest = testCheck.rows[0];

    if (originalTest.faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to duplicate this test",
      });
    }

    // Generate new test ID
    const newTestId = await generateUniqueTestId();

    // Set new title
    const newTitle = asTemplate 
      ? `${originalTest.title} (Template)`
      : `${originalTest.title} (Copy)`;

    // Set status
    const newStatus = asTemplate ? 'draft' : 'published';

    // Insert duplicated test
    await db.execute({
      sql: `INSERT INTO Tests (
        test_id, faculty_id, title, language, start_year, branch, section,
        description, start_time, duration, max_attempts,
        similarity_threshold, fullscreen_mode, auto_submit, show_results,
        wait_until_end, allow_copy, allow_paste, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        newTestId,
        facultyId,
        newTitle,
        originalTest.language,
        originalTest.start_year,
        originalTest.branch,
        originalTest.section,
        originalTest.description,
        originalTest.start_time,
        originalTest.duration,
        originalTest.max_attempts,
        originalTest.similarity_threshold,
        originalTest.fullscreen_mode,
        originalTest.auto_submit,
        originalTest.show_results,
        originalTest.wait_until_end,
        originalTest.allow_copy,
        originalTest.allow_paste,
        newStatus,
      ],
    });

    // Copy scheduled messages
    const scheduledMessages = await db.execute({
      sql: `SELECT time_minutes, message FROM ScheduledMessages WHERE test_id = ?`,
      args: [test_id],
    });

    if (scheduledMessages.rows.length > 0) {
      for (const msg of scheduledMessages.rows) {
        await db.execute({
          sql: `INSERT INTO ScheduledMessages (test_id, time_minutes, message, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [newTestId, msg.time_minutes, msg.message],
        });
      }
    }

    console.log(`Test ${test_id} duplicated as ${newTestId} (${asTemplate ? 'template' : 'published'})`);

    res.status(201).json({
      success: true,
      message: asTemplate 
        ? "Test duplicated as template successfully"
        : "Test duplicated and published successfully",
      data: {
        test_id: newTestId,
        original_test_id: test_id,
      },
    });
  } catch (error) {
    console.error("Duplicate test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during duplication",
      error: error.message,
    });
  }
});

// SSE endpoint for real-time student monitoring
router.get("/:test_id/students/stream", async (req, res) => {
  const { test_id } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Function to send student data
  const sendStudentData = async () => {
    try {
      const testCheck = await db.execute({
        sql: `SELECT test_id, start_year, branch, section FROM Tests WHERE test_id = ?`,
        args: [test_id]
      });

      if (testCheck.rows.length === 0) return;

      const test = testCheck.rows[0];

      const studentsResult = await db.execute({
        sql: `SELECT 
          s.student_id,
          s.first_name,
          s.last_name,
          s.email,
          s.pin,
          ts.status,
          ts.progress,
          ts.start_time,
          ts.end_time,
          ts.duration,
          ts.errors,
          ts.wpm,
          ts.similarity,
          ts.last_active
        FROM Student s
        LEFT JOIN TestStudents ts ON s.student_id = ts.student_id AND ts.test_id = ?
        WHERE s.start_year = ? AND s.branch = ? AND s.section = ?
        ORDER BY s.last_name, s.first_name`,
        args: [test_id, test.start_year, test.branch, test.section.toString()]
      });

      const students = studentsResult.rows.map((student) => ({
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        pin: student.pin,
        status: student.status || "not-started",
        progress: student.progress || 0,
        start_time: student.start_time,
        end_time: student.end_time,
        duration: student.duration,
        errors: student.errors || 0,
        wpm: student.wpm || 0,
        similarity: student.similarity || 0,
        last_active: student.last_active,
        score: 0
      }));

      // Get scores
      for (let student of students) {
        const submissionResult = await db.execute({
          sql: `SELECT score FROM TestSubmissions 
                WHERE test_id = ? AND student_id = ? 
                ORDER BY submitted_at DESC LIMIT 1`,
          args: [test_id, student.student_id]
        });

        if (submissionResult.rows.length > 0) {
          student.score = submissionResult.rows[0].score || 0;
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'update', students })}\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch data' })}\n\n`);
    }
  };

  // Send initial data
  await sendStudentData();

  // Send updates every 5 seconds
  const interval = setInterval(async () => {
    await sendStudentData();
  }, 5000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// GET: Test Analytics (FIXED - Average Time & Time Distribution)
router.get("/:test_id/analytics", async (req, res) => {
  try {
    const { test_id } = req.params;

    // Get test details
    const testResult = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id]
    });

    if (testResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    const test = testResult.rows[0];

    // Get total students in the batch
    const totalStudentsResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM Student 
            WHERE start_year = ? AND branch = ? AND section = ?`,
      args: [test.start_year, test.branch, test.section.toString()]
    });

    const totalStudents = Number(totalStudentsResult.rows[0]?.total || 0);

    // Get completion statistics
    const statsResult = await db.execute({
      sql: `SELECT 
              COUNT(*) as registered,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
              SUM(CASE WHEN status = 'completed' THEN errors ELSE 0 END) as totalErrors
            FROM TestStudents
            WHERE test_id = ?`,
      args: [test_id]
    });

    const registered = Number(statsResult.rows[0]?.registered || 0);
    const completed = Number(statsResult.rows[0]?.completed || 0);
    const inProgress = Number(statsResult.rows[0]?.inProgress || 0);
    const notStarted = totalStudents - registered;
    const totalErrors = Number(statsResult.rows[0]?.totalErrors || 0);

    // Calculate average duration ONLY from completed tests with valid duration
    const avgDurationResult = await db.execute({
      sql: `SELECT AVG(duration) as avgDuration, COUNT(*) as validCount
            FROM TestStudents
            WHERE test_id = ? 
            AND status = 'completed' 
            AND duration IS NOT NULL 
            AND duration > 0`,
      args: [test_id]
    });

    const avgDuration = Number(avgDurationResult.rows[0]?.avgDuration || 0);
    const validDurationCount = Number(avgDurationResult.rows[0]?.validCount || 0);

    // Calculate average errors
    const avgErrors = completed > 0 ? totalErrors / completed : 0;

    // Get score statistics
    const scoreResult = await db.execute({
      sql: `SELECT 
              AVG(CASE WHEN score IS NOT NULL THEN score ELSE NULL END) as avgScore,
              MAX(score) as maxScore,
              MIN(CASE WHEN score IS NOT NULL THEN score ELSE NULL END) as minScore,
              COUNT(CASE WHEN score >= 60 THEN 1 END) as passed
            FROM TestSubmissions
            WHERE test_id = ?`,
      args: [test_id]
    });

    const avgScore = Number(scoreResult.rows[0]?.avgScore || 0);
    const maxScore = Number(scoreResult.rows[0]?.maxScore || 0);
    const minScore = completed > 0 ? Number(scoreResult.rows[0]?.minScore || 0) : 0;
    const passed = Number(scoreResult.rows[0]?.passed || 0);
    const passRate = completed > 0 ? Number(((passed / completed) * 100).toFixed(1)) : 0;

    // Score distribution
    const scoreDistResult = await db.execute({
      sql: `SELECT 
              COUNT(CASE WHEN score >= 90 THEN 1 END) as range_90_100,
              COUNT(CASE WHEN score >= 80 AND score < 90 THEN 1 END) as range_80_89,
              COUNT(CASE WHEN score >= 70 AND score < 80 THEN 1 END) as range_70_79,
              COUNT(CASE WHEN score >= 60 AND score < 70 THEN 1 END) as range_60_69,
              COUNT(CASE WHEN score < 60 THEN 1 END) as range_below_60
            FROM TestSubmissions
            WHERE test_id = ? AND score IS NOT NULL`,
      args: [test_id]
    });

    const scoreDistribution = {
      '90-100': Number(scoreDistResult.rows[0]?.range_90_100 || 0),
      '80-89': Number(scoreDistResult.rows[0]?.range_80_89 || 0),
      '70-79': Number(scoreDistResult.rows[0]?.range_70_79 || 0),
      '60-69': Number(scoreDistResult.rows[0]?.range_60_69 || 0),
      'Below 60': Number(scoreDistResult.rows[0]?.range_below_60 || 0)
    };

    // Time distribution (FIXED - only count valid durations)
    const timeDistResult = await db.execute({
      sql: `SELECT 
              COUNT(CASE WHEN duration > 0 AND duration < 10 THEN 1 END) as under_10,
              COUNT(CASE WHEN duration >= 10 AND duration < 20 THEN 1 END) as range_10_20,
              COUNT(CASE WHEN duration >= 20 AND duration < 30 THEN 1 END) as range_20_30,
              COUNT(CASE WHEN duration >= 30 AND duration < 40 THEN 1 END) as range_30_40,
              COUNT(CASE WHEN duration >= 40 THEN 1 END) as over_40
            FROM TestStudents
            WHERE test_id = ? 
            AND status = 'completed' 
            AND duration IS NOT NULL 
            AND duration > 0`,
      args: [test_id]
    });

    const timeDistribution = {
      'Under 10 min': Number(timeDistResult.rows[0]?.under_10 || 0),
      '10-20 min': Number(timeDistResult.rows[0]?.range_10_20 || 0),
      '20-30 min': Number(timeDistResult.rows[0]?.range_20_30 || 0),
      '30-40 min': Number(timeDistResult.rows[0]?.range_30_40 || 0),
      'Over 40 min': Number(timeDistResult.rows[0]?.over_40 || 0)
    };

    // Plagiarism analysis
    const plagiarismResult = await db.execute({
      sql: `SELECT 
              COUNT(CASE WHEN similarity > 80 THEN 1 END) as highSimilarity,
              COUNT(CASE WHEN similarity >= 60 AND similarity <= 80 THEN 1 END) as mediumSimilarity,
              COUNT(CASE WHEN similarity < 60 AND similarity > 0 THEN 1 END) as lowSimilarity
            FROM TestStudents
            WHERE test_id = ? AND status = 'completed'`,
      args: [test_id]
    });

    const highSimilarity = Number(plagiarismResult.rows[0]?.highSimilarity || 0);
    const mediumSimilarity = Number(plagiarismResult.rows[0]?.mediumSimilarity || 0);
    const lowSimilarity = Number(plagiarismResult.rows[0]?.lowSimilarity || 0);

    // Get flagged students
    const flaggedResult = await db.execute({
      sql: `SELECT 
              s.first_name,
              s.last_name,
              s.pin,
              ts.similarity
            FROM TestStudents ts
            JOIN Student s ON ts.student_id = s.student_id
            WHERE ts.test_id = ? AND ts.similarity > 80 AND ts.status = 'completed'
            ORDER BY ts.similarity DESC
            LIMIT 10`,
      args: [test_id]
    });

    const flaggedStudents = flaggedResult.rows.map(row => ({
      name: `${row.first_name} ${row.last_name} (${row.pin})`,
      similarity: Number(row.similarity || 0)
    }));

    console.log(`[ANALYTICS] Test ${test_id}: Avg Duration = ${avgDuration.toFixed(2)} min (from ${validDurationCount} students)`);

    // Build response
    res.status(200).json({
      success: true,
      data: {
        test,
        totalStudents,
        overview: {
          totalStudents,
          completed,
          inProgress,
          notStarted,
          averageScore: Number(avgScore.toFixed(2)),
          averageTime: Number(avgDuration.toFixed(2)),
          passRate,
          highestScore: maxScore,
          lowestScore: minScore
        },
        performance: {
          scoreDistribution,
          timeDistribution
        },
        quality: {
          totalErrors,
          averageErrors: Number(avgErrors.toFixed(1)),
          syntaxErrors: Math.floor(totalErrors * 0.4),
          runtimeErrors: Math.floor(totalErrors * 0.35),
          logicalErrors: Math.floor(totalErrors * 0.25)
        },
        plagiarism: {
          highSimilarity,
          mediumSimilarity,
          lowSimilarity,
          flaggedStudents
        },
        questions: []
      }
    });

  } catch (error) {
    console.error("Fetch analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// GET: Test Statistics
router.get("/:test_id/statistics", async (req, res) => {
  try {
    const { test_id } = req.params;

    // Get test details
    const testResult = await db.execute({
      sql: `SELECT start_year, branch, section FROM Tests WHERE test_id = ?`,
      args: [test_id]
    });

    if (testResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    const test = testResult.rows[0];

    // Get total eligible students
    const totalEligibleResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM Student 
            WHERE start_year = ? AND branch = ? AND section = ?`,
      args: [test.start_year, test.branch, test.section.toString()]
    });

    const totalEligible = Number(totalEligibleResult.rows[0]?.total || 0);

    // Get attended count (students who started the test)
    const attendedResult = await db.execute({
      sql: `SELECT COUNT(DISTINCT student_id) as attended 
            FROM TestStudents 
            WHERE test_id = ? AND status != 'not-started'`,
      args: [test_id]
    });

    const attended = Number(attendedResult.rows[0]?.attended || 0);

    // Get submitted count (students who completed and submitted)
    const submittedResult = await db.execute({
      sql: `SELECT COUNT(DISTINCT student_id) as submitted 
            FROM TestSubmissions 
            WHERE test_id = ?`,
      args: [test_id]
    });

    const submitted = Number(submittedResult.rows[0]?.submitted || 0);

    const notAttended = totalEligible - attended;
    const attendanceRate = totalEligible > 0 ? Number(((attended / totalEligible) * 100).toFixed(1)) : 0;
    const submissionRate = attended > 0 ? Number(((submitted / attended) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalEligible,
        attended,
        submitted,
        notAttended,
        attendanceRate,
        submissionRate
      }
    });

  } catch (error) {
    console.error("Fetch statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// PUBLISH/UNPUBLISH TEST
router.patch("/:test_id/status", async (req, res) => {
  try {
    const { test_id } = req.params;
    const { facultyId, status } = req.body;

    // Validate status
    const validStatuses = ["unpublished", "draft", "published"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be 'unpublished', 'draft', or 'published'",
      });
    }

    // Verify the test exists and belongs to this faculty
    const testCheck = await db.execute({
      sql: `SELECT test_id, faculty_id FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    // Verify faculty ownership
    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this test",
      });
    }

    // Update status
    await db.execute({
      sql: `UPDATE Tests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE test_id = ?`,
      args: [status, test_id],
    });

    res.status(200).json({
      success: true,
      message: `Test ${status} successfully`,
    });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during status update",
    });
  }
});

// Export as CSV (direct stream)
router.get("/:test_id/export/csv", async (req, res) => {
  try {
    const { test_id } = req.params;

    // Get test details
    const testResult = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id]
    });

    if (testResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const test = testResult.rows[0];

    // Get all students with their test data
    const studentsResult = await db.execute({
      sql: `SELECT 
              s.student_id,
              s.first_name,
              s.last_name,
              s.email,
              s.pin,
              ts.status,
              ts.progress,
              ts.start_time,
              ts.end_time,
              ts.duration,
              ts.errors,
              ts.wpm,
              ts.similarity,
              COALESCE(tsub.score, 0) as score,
              tsub.submitted_at
            FROM Student s
            LEFT JOIN TestStudents ts ON s.student_id = ts.student_id AND ts.test_id = ?
            LEFT JOIN TestSubmissions tsub ON s.student_id = tsub.student_id AND tsub.test_id = ?
            WHERE s.start_year = ? AND s.branch = ? AND s.section = ?
            ORDER BY s.last_name, s.first_name`,
      args: [test_id, test_id, test.start_year, test.branch, test.section.toString()]
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${test.title}_export.csv"`);

    // Write CSV header
    const headers = [
      'Student ID', 'First Name', 'Last Name', 'Email', 'PIN',
      'Status', 'Progress (%)', 'Score', 'Duration (min)',
      'Errors', 'WPM', 'Similarity (%)', 'Start Time', 'End Time', 'Submitted At'
    ];
    res.write(headers.join(',') + '\n');

    // Write data rows
    studentsResult.rows.forEach(student => {
      const row = [
        student.student_id,
        student.first_name,
        student.last_name,
        student.email,
        student.pin,
        student.status || 'not-started',
        student.progress || 0,
        student.score || 0,
        student.duration || 0,
        student.errors || 0,
        student.wpm || 0,
        student.similarity || 0,
        student.start_time || 'N/A',
        student.end_time || 'N/A',
        student.submitted_at || 'N/A'
      ];
      res.write(row.join(',') + '\n');
    });

    res.end();

  } catch (error) {
    console.error("CSV export error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Export failed" });
    }
  }
});

// Export as Excel (direct stream)
router.get("/:test_id/export/excel", async (req, res) => {
  try {
    const { test_id } = req.params;

    // Get test details
    const testResult = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id]
    });

    if (testResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const test = testResult.rows[0];

    // Get all students with their test data
    const studentsResult = await db.execute({
      sql: `SELECT 
              s.student_id,
              s.first_name,
              s.last_name,
              s.email,
              s.pin,
              ts.status,
              ts.progress,
              ts.start_time,
              ts.end_time,
              ts.duration,
              ts.errors,
              ts.wpm,
              ts.similarity,
              COALESCE(tsub.score, 0) as score,
              tsub.submitted_at
            FROM Student s
            LEFT JOIN TestStudents ts ON s.student_id = ts.student_id AND ts.test_id = ?
            LEFT JOIN TestSubmissions tsub ON s.student_id = tsub.student_id AND tsub.test_id = ?
            WHERE s.start_year = ? AND s.branch = ? AND s.section = ?
            ORDER BY s.last_name, s.first_name`,
      args: [test_id, test_id, test.start_year, test.branch, test.section.toString()]
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Results');

    // Add title
    worksheet.mergeCells('A1:O1');
    worksheet.getCell('A1').value = `${test.title} - Test Results`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add test info
    worksheet.getCell('A2').value = `Test ID: ${test.test_id}`;
    worksheet.getCell('A3').value = `Duration: ${test.duration} minutes`;
    worksheet.getCell('A4').value = `Batch: ${test.branch} - ${test.section} (${test.start_year})`;
    worksheet.addRow([]);

    // Add headers
    const headerRow = worksheet.addRow([
      'Student ID', 'First Name', 'Last Name', 'Email', 'PIN',
      'Status', 'Progress (%)', 'Score', 'Duration (min)',
      'Errors', 'WPM', 'Similarity (%)', 'Start Time', 'End Time', 'Submitted At'
    ]);

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF06b6d4' }
    };

    // Add data
    studentsResult.rows.forEach(student => {
      const row = worksheet.addRow([
        student.student_id,
        student.first_name,
        student.last_name,
        student.email,
        student.pin,
        student.status || 'not-started',
        student.progress || 0,
        student.score || 0,
        student.duration || 0,
        student.errors || 0,
        student.wpm || 0,
        student.similarity || 0,
        student.start_time || 'N/A',
        student.end_time || 'N/A',
        student.submitted_at || 'N/A'
      ]);

      // Color code by status
      if (student.status === 'completed') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' }
        };
      } else if (student.status === 'in-progress') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3E5F5' }
        };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Set headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${test.title}_export.xlsx"`);

    // Write to response stream
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Excel export error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Export failed" });
    }
  }
});

// Export as PDF (direct stream)
router.get("/:test_id/export/pdf", async (req, res) => {
  try {
    const { test_id } = req.params;

    // Get test details
    const testResult = await db.execute({
      sql: `SELECT * FROM Tests WHERE test_id = ?`,
      args: [test_id]
    });

    if (testResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const test = testResult.rows[0];

    // Get statistics
    const statsResult = await db.execute({
      sql: `SELECT 
              COUNT(*) as total_students
            FROM Student 
            WHERE start_year = ? AND branch = ? AND section = ?`,
      args: [test.start_year, test.branch, test.section.toString()]
    });

    const attendedResult = await db.execute({
      sql: `SELECT 
              COUNT(DISTINCT ts.student_id) as attended,
              COUNT(DISTINCT tsub.student_id) as submitted,
              AVG(tsub.score) as avg_score,
              MAX(tsub.score) as max_score,
              MIN(tsub.score) as min_score
            FROM TestStudents ts
            LEFT JOIN TestSubmissions tsub ON ts.student_id = tsub.student_id AND ts.test_id = ?
            WHERE ts.test_id = ? AND ts.status != 'not-started'`,
      args: [test_id, test_id]
    });

    const stats = {
      total: statsResult.rows[0].total_students,
      attended: attendedResult.rows[0].attended || 0,
      submitted: attendedResult.rows[0].submitted || 0,
      avg_score: attendedResult.rows[0].avg_score || 0,
      max_score: attendedResult.rows[0].max_score || 0,
      min_score: attendedResult.rows[0].min_score || 0
    };

    // Get all students
    const studentsResult = await db.execute({
      sql: `SELECT 
              s.first_name,
              s.last_name,
              s.pin,
              ts.status,
              COALESCE(tsub.score, 0) as score,
              ts.duration,
              ts.errors,
              ts.similarity
            FROM Student s
            LEFT JOIN TestStudents ts ON s.student_id = ts.student_id AND ts.test_id = ?
            LEFT JOIN TestSubmissions tsub ON s.student_id = tsub.student_id AND tsub.test_id = ?
            WHERE s.start_year = ? AND s.branch = ? AND s.section = ?
            ORDER BY s.last_name, s.first_name`,
      args: [test_id, test_id, test.start_year, test.branch, test.section.toString()]
    });

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${test.title}_export.pdf"`);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Title
    doc.fontSize(20).fillColor('#06b6d4').text(test.title, { align: 'center' });
    doc.moveDown();

    // Test Info
    doc.fontSize(12).fillColor('#000000');
    doc.text(`Test ID: ${test.test_id}`);
    doc.text(`Duration: ${test.duration} minutes`);
    doc.text(`Batch: ${test.branch} - ${test.section} (${test.start_year})`);
    doc.text(`Language: ${test.language}`);
    doc.text(`Start Time: ${new Date(test.start_time).toLocaleString()}`);
    doc.moveDown();

    // Statistics
    doc.fontSize(14).fillColor('#06b6d4').text('Statistics', { underline: true });
    doc.fontSize(12).fillColor('#000000');
    doc.text(`Total Students: ${stats.total}`);
    doc.text(`Attended: ${stats.attended} (${((stats.attended / stats.total) * 100).toFixed(1)}%)`);
    doc.text(`Submitted: ${stats.submitted}`);
    doc.text(`Average Score: ${stats.avg_score.toFixed(2)}%`);
    doc.text(`Highest Score: ${stats.max_score}%`);
    doc.text(`Lowest Score: ${stats.min_score}%`);
    doc.moveDown();

    // Student Results Header
    doc.fontSize(14).fillColor('#06b6d4').text('Student Results', { underline: true });
    doc.moveDown(0.5);

    // Table header
    doc.fontSize(10).fillColor('#000000');
    const tableTop = doc.y;
    doc.text('Name', 50, tableTop, { width: 120 });
    doc.text('PIN', 170, tableTop, { width: 80 });
    doc.text('Status', 250, tableTop, { width: 80 });
    doc.text('Score', 330, tableTop, { width: 60 });
    doc.text('Duration', 390, tableTop, { width: 60 });
    doc.text('Errors', 450, tableTop, { width: 50 });
    doc.text('Similarity', 500, tableTop, { width: 60 });
    
    doc.moveTo(50, doc.y + 5).lineTo(560, doc.y + 5).stroke();
    doc.moveDown();

    // Student data
    studentsResult.rows.forEach((student, index) => {
      if (doc.y > 700) {
        doc.addPage();
        doc.fontSize(10);
      }

      const y = doc.y;
      doc.text(`${student.first_name} ${student.last_name}`, 50, y, { width: 120 });
      doc.text(student.pin || 'N/A', 170, y, { width: 80 });
      doc.text(student.status || 'not-started', 250, y, { width: 80 });
      doc.text(`${student.score || 0}%`, 330, y, { width: 60 });
      doc.text(`${student.duration || 0} min`, 390, y, { width: 60 });
      doc.text(`${student.errors || 0}`, 450, y, { width: 50 });
      doc.text(`${student.similarity || 0}%`, 500, y, { width: 60 });
      
      doc.moveDown(0.8);
    });

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated on ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

  } catch (error) {
    console.error("PDF export error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Export failed" });
    }
  }
});

// GET ALL STUDENTS for a specific test with their progress
router.get("/:test_id/students", async (req, res) => {
  try {
    const { test_id } = req.params;

    // Verify test exists
    const testCheck = await db.execute({
      sql: `SELECT test_id, start_year, branch, section FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const test = testCheck.rows[0];

    // Get all students from the test's batch
    const studentsResult = await db.execute({
      sql: `SELECT 
        s.student_id,
        s.first_name,
        s.last_name,
        s.email,
        s.pin,
        s.start_year,
        s.branch,
        s.section,
        ts.status,
        ts.progress,
        ts.start_time,
        ts.end_time,
        ts.duration,
        ts.errors,
        ts.wpm,
        ts.similarity,
        ts.last_active
      FROM Student s
      LEFT JOIN TestStudents ts ON s.student_id = ts.student_id AND ts.test_id = ?
      WHERE s.start_year = ? AND s.branch = ? AND s.section = ?
      ORDER BY s.last_name, s.first_name`,
      args: [test_id, test.start_year, test.branch, test.section.toString()],
    });

    // Format the response
    const students = studentsResult.rows.map((student) => ({
      student_id: student.student_id,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      pin: student.pin,
      status: student.status || "not-started",
      progress: student.progress || 0,
      start_time: student.start_time,
      end_time: student.end_time,
      duration: student.duration,
      errors: student.errors || 0,
      wpm: student.wpm || 0,
      similarity: student.similarity || 0,
      last_active: student.last_active,
      score: 0, // Will be calculated from TestSubmissions if exists
    }));

    // Get scores from submissions
    for (let student of students) {
      const submissionResult = await db.execute({
        sql: `SELECT score FROM TestSubmissions 
              WHERE test_id = ? AND student_id = ? 
              ORDER BY submitted_at DESC LIMIT 1`,
        args: [test_id, student.student_id],
      });

      if (submissionResult.rows.length > 0) {
        student.score = submissionResult.rows[0].score || 0;
      }
    }

    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Fetch students error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// LOCK STUDENT test
router.post("/:test_id/student/:student_id/lock", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { facultyId } = req.body;

    // Verify test belongs to faculty
    const testCheck = await db.execute({
      sql: `SELECT test_id, faculty_id FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to lock this student",
      });
    }

    // Check if student record exists in TestStudents
    const studentCheck = await db.execute({
      sql: `SELECT id, status FROM TestStudents WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    if (studentCheck.rows.length === 0) {
      // Create record if doesn't exist
      await db.execute({
        sql: `INSERT INTO TestStudents (test_id, student_id, status, updated_at)
              VALUES (?, ?, 'locked', CURRENT_TIMESTAMP)`,
        args: [test_id, student_id],
      });
    } else {
      // Update status to locked
      await db.execute({
        sql: `UPDATE TestStudents 
              SET status = 'locked', updated_at = CURRENT_TIMESTAMP
              WHERE test_id = ? AND student_id = ?`,
        args: [test_id, student_id],
      });
    }

    res.status(200).json({
      success: true,
      message: "Student test locked successfully",
    });
  } catch (error) {
    console.error("Lock student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during lock",
    });
  }
});

// UNLOCK STUDENT test
router.post("/:test_id/student/:student_id/unlock", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { facultyId } = req.body;

    // Verify test belongs to faculty
    const testCheck = await db.execute({
      sql: `SELECT test_id, faculty_id FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to unlock this student",
      });
    }

    // Check if student record exists
    const studentCheck = await db.execute({
      sql: `SELECT id, status FROM TestStudents WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student has not started this test",
      });
    }

    // Update status to in-progress if currently locked
    await db.execute({
      sql: `UPDATE TestStudents 
            SET status = 'in-progress', updated_at = CURRENT_TIMESTAMP
            WHERE test_id = ? AND student_id = ? AND status = 'locked'`,
      args: [test_id, student_id],
    });

    res.status(200).json({
      success: true,
      message: "Student test unlocked successfully",
    });
  } catch (error) {
    console.error("Unlock student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during unlock",
    });
  }
});

// POST: Restart student test
router.post("/:test_id/student/:student_id/restart", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { facultyId } = req.body;

    // Verify test belongs to faculty
    const testCheck = await db.execute({
      sql: `SELECT test_id, faculty_id FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    // Reset TestStudents record
    await db.execute({
      sql: `UPDATE TestStudents 
            SET status = 'not-started', 
                progress = 0, 
                start_time = NULL, 
                end_time = NULL, 
                duration = NULL,
                errors = 0,
                wpm = 0,
                similarity = 0,
                attempt = attempt + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    // Clear code snapshots
    await db.execute({
      sql: `DELETE FROM StudentCodeSnapshots WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    // Clear submissions
    await db.execute({
      sql: `DELETE FROM TestSubmissions WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    res.status(200).json({
      success: true,
      message: "Student test restarted successfully",
    });
  } catch (error) {
    console.error("Restart student error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST: Update student score
router.post("/:test_id/student/:student_id/score", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { score, facultyId } = req.body;

    // Validate score
    if (score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: "Score must be between 0 and 100"
      });
    }

    // Verify test belongs to faculty
    const testCheck = await db.execute({
      sql: `SELECT faculty_id FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    if (testCheck.rows[0].faculty_id !== parseInt(facultyId)) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    // Get the latest submission ID
    const latestSubmissionResult = await db.execute({
      sql: `SELECT submission_id 
            FROM TestSubmissions 
            WHERE test_id = ? AND student_id = ? 
            ORDER BY submitted_at DESC 
            LIMIT 1`,
      args: [test_id, student_id]
    });

    if (latestSubmissionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this student"
      });
    }

    const submissionId = latestSubmissionResult.rows[0].submission_id;

    // Update the score using submission_id
    await db.execute({
      sql: `UPDATE TestSubmissions 
            SET score = ? 
            WHERE submission_id = ?`,
      args: [score, submissionId]
    });

    res.status(200).json({
      success: true,
      message: "Score updated successfully"
    });
  } catch (error) {
    console.error("Update score error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
});

// UPDATE STUDENT PROGRESS (for real-time updates from student side)
router.put("/:test_id/student/:student_id/progress", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { progress, errors, wpm, status } = req.body;

    // Check if record exists
    const studentCheck = await db.execute({
      sql: `SELECT id FROM TestStudents WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    if (studentCheck.rows.length === 0) {
      // Create new record
      await db.execute({
        sql: `INSERT INTO TestStudents 
              (test_id, student_id, status, progress, errors, wpm, start_time, last_active, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          test_id,
          student_id,
          status || "in-progress",
          progress || 0,
          errors || 0,
          wpm || 0,
        ],
      });
    } else {
      // Update existing record
      await db.execute({
        sql: `UPDATE TestStudents 
              SET progress = ?, errors = ?, wpm = ?, status = ?, 
                  last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
              WHERE test_id = ? AND student_id = ?`,
        args: [
          progress || 0,
          errors || 0,
          wpm || 0,
          status || "in-progress",
          test_id,
          student_id,
        ],
      });
    }

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
    });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during progress update",
    });
  }
});

// GET SINGLE STUDENT progress for a test
router.get("/:test_id/student/:student_id", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;

    // Get student info
    const studentResult = await db.execute({
      sql: `SELECT 
        s.student_id,
        s.first_name,
        s.last_name,
        s.email,
        s.pin,
        s.start_year,
        s.branch,
        s.section,
        ts.status,
        ts.progress,
        ts.start_time,
        ts.end_time,
        ts.duration,
        ts.errors,
        ts.wpm,
        ts.similarity,
        ts.last_active
      FROM Student s
      LEFT JOIN TestStudents ts ON s.student_id = ts.student_id AND ts.test_id = ?
      WHERE s.student_id = ?`,
      args: [test_id, student_id],
    });

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    // Get code snapshots
    const snapshotsResult = await db.execute({
      sql: `SELECT snapshot_id, code, created_at 
            FROM StudentCodeSnapshots 
            WHERE test_id = ? AND student_id = ? 
            ORDER BY created_at DESC`,
      args: [test_id, student_id],
    });

    // Get submissions
    const submissionsResult = await db.execute({
      sql: `SELECT * FROM TestSubmissions 
            WHERE test_id = ? AND student_id = ? 
            ORDER BY submitted_at DESC`,
      args: [test_id, student_id],
    });

    res.status(200).json({
      success: true,
      data: {
        student: {
          ...student,
          status: student.status || "not-started",
          progress: student.progress || 0,
          errors: student.errors || 0,
          wpm: student.wpm || 0,
          similarity: student.similarity || 0,
        },
        snapshots: snapshotsResult.rows,
        submissions: submissionsResult.rows,
      },
    });
  } catch (error) {
    console.error("Fetch student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// SAVE CODE SNAPSHOT
router.post("/:test_id/student/:student_id/snapshot", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code is required",
      });
    }

    await db.execute({
      sql: `INSERT INTO StudentCodeSnapshots (test_id, student_id, code)
            VALUES (?, ?, ?)`,
      args: [test_id, student_id, code],
    });

    res.status(201).json({
      success: true,
      message: "Code snapshot saved successfully",
    });
  } catch (error) {
    console.error("Save snapshot error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during snapshot save",
    });
  }
});

// GET ALL TESTS for a specific student (Simple - Frontend handles display)
router.get("/student/:student_id/tests", async (req, res) => {
  try {
    const { student_id } = req.params;

    // Get student info
    const studentResult = await db.execute({
      sql: `SELECT student_id, start_year, branch, section FROM Student WHERE student_id = ?`,
      args: [student_id],
    });

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    // Get ONLY published tests
    const testsResult = await db.execute({
      sql: `SELECT * FROM Tests 
            WHERE start_year = ? 
            AND branch = ? 
            AND section = ? 
            AND LOWER(TRIM(status)) = 'published'
            ORDER BY start_time ASC`,
      args: [
        String(student.start_year),
        String(student.branch),
        String(student.section),
      ],
    });

    const now = new Date();

    // For each test, get the student's progress
    const testsWithProgress = await Promise.all(
      testsResult.rows.map(async (test) => {
        // Calculate test status based on time
        const startTime = new Date(test.start_time);
        const endTime = new Date(startTime.getTime() + test.duration * 60000);

        let timeStatus = "upcoming";
        if (now >= startTime && now <= endTime) {
          timeStatus = "live";
        } else if (now > endTime) {
          timeStatus = "completed";
        }

        // Get student's test record
        const progressResult = await db.execute({
          sql: `SELECT * FROM TestStudents 
                WHERE test_id = ? AND student_id = ?`,
          args: [test.test_id, student_id],
        });

        // Get submission if exists
        const submissionResult = await db.execute({
          sql: `SELECT score, similarity, submitted_at, output, executed FROM TestSubmissions 
                WHERE test_id = ? AND student_id = ? 
                ORDER BY submitted_at DESC LIMIT 1`,
          args: [test.test_id, student_id],
        });

        const progress = progressResult.rows[0];
        const submission = submissionResult.rows[0];

        // Determine student's status
        let studentStatus = progress ? progress.status : "not-started";

        return {
          test_id: test.test_id,
          title: test.title,
          language: test.language,
          start_year: test.start_year,
          branch: test.branch,
          section: test.section,
          description: test.description,
          start_time: test.start_time,
          duration: test.duration,
          max_attempts: test.max_attempts,
          similarity_threshold: test.similarity_threshold,
          fullscreen_mode: test.fullscreen_mode,
          auto_submit: test.auto_submit,
          show_results: test.show_results,
          wait_until_end: test.wait_until_end,
          allow_copy: test.allow_copy,
          allow_paste: test.allow_paste,
          status: test.status,
          testStatus: timeStatus,
          studentStatus,
          hasSubmission: submission ? true : false,
          progress: progress ? progress.progress : 0,
          start_time_student: progress ? progress.start_time : null,
          end_time_student: progress ? progress.end_time : null,
          duration_taken: progress ? progress.duration : null,
          score: submission ? submission.score : null,
          similarity: submission ? submission.similarity : null,
          submitted_at: submission ? submission.submitted_at : null,
          output: submission ? submission.output : null,
          executed: submission ? submission.executed : null,
          errors: progress ? progress.errors : 0,
          wpm: progress ? progress.wpm : 0,
          attempt: progress ? progress.attempt : 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: testsWithProgress,
    });
  } catch (error) {
    console.error("Fetch student tests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// POST: Update expired test status
router.post("/:test_id/update-expired", async (req, res) => {
  try {
    const { test_id } = req.params;
    const { studentId } = req.body;

    // Verify test exists and is expired
    const testCheck = await db.execute({
      sql: `SELECT start_time, duration FROM Tests WHERE test_id = ?`,
      args: [test_id]
    });

    if (testCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    const test = testCheck.rows[0];
    const startTime = new Date(test.start_time);
    const endTime = new Date(startTime.getTime() + test.duration * 60000);
    const now = new Date();

    if (now <= endTime) {
      return res.status(400).json({
        success: false,
        message: "Test has not expired yet"
      });
    }

    // Update TestStudents status to 'left'
    await db.execute({
      sql: `UPDATE TestStudents 
            SET status = 'left',
                end_time = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE test_id = ? AND student_id = ? AND status = 'in-progress'`,
      args: [endTime.toISOString(), test_id, studentId]
    });

    res.status(200).json({
      success: true,
      message: "Test status updated to 'left'"
    });
  } catch (error) {
    console.error("Update expired test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// GET STUDENT STATISTICS
router.get("/student/:student_id/stats", async (req, res) => {
  try {
    const { student_id } = req.params;

    // Get student info
    const studentResult = await db.execute({
      sql: `SELECT start_year, branch, section FROM Student WHERE student_id = ?`,
      args: [student_id],
    });

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    // Get all published tests for this batch
    const testsResult = await db.execute({
      sql: `SELECT test_id, start_time, duration FROM Tests 
            WHERE start_year = ? AND branch = ? AND section = ? AND status = 'published'`,
      args: [
        String(student.start_year),
        String(student.branch),
        String(student.section),
      ],
    });

    const now = new Date();
    let upcoming = 0;
    let live = 0;
    let completed = 0;
    let active = 0;

    for (const test of testsResult.rows) {
      const startTime = new Date(test.start_time);
      const endTime = new Date(startTime.getTime() + test.duration * 60000);

      // Check if student has active test
      const progressResult = await db.execute({
        sql: `SELECT status FROM TestStudents 
              WHERE test_id = ? AND student_id = ? AND status = 'in-progress'`,
        args: [test.test_id, student_id],
      });

      if (progressResult.rows.length > 0) {
        active++;
      }

      // Calculate test status
      if (now < startTime) {
        upcoming++;
      } else if (now >= startTime && now <= endTime) {
        live++;
      } else {
        completed++;
      }
    }

    // Calculate average score
    const scoresResult = await db.execute({
      sql: `SELECT AVG(score) as avg_score FROM TestSubmissions 
            WHERE student_id = ? AND score IS NOT NULL`,
      args: [student_id],
    });

    const avgScore = scoresResult.rows[0]?.avg_score || 0;

    res.status(200).json({
      success: true,
      data: {
        upcoming,
        live,
        completed,
        active,
        avgScore: Math.round(avgScore),
      },
    });
  } catch (error) {
    console.error("Fetch student stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Verify Student Route
router.get("/student/verify/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;

    const result = await db.execute({
      sql: `SELECT student_id, first_name, last_name, email, pin, start_year, branch, section 
            FROM Student WHERE student_id = ?`,
      args: [student_id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Initialize test session - handles attempts + MESSAGE MANAGER (IST)
router.post("/:test_id/student/:student_id/init", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;

    const testResult = await db.execute({
      sql: `SELECT max_attempts FROM Tests WHERE test_id = ?`,
      args: [test_id],
    });

    if (testResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const maxAttempts = testResult.rows[0].max_attempts;

    const existingResult = await db.execute({
      sql: `SELECT id, status, attempt FROM TestStudents WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    let currentAttempt = 1;
    let savedCode = null;

    if (existingResult.rows.length > 0) {
      const studentRecord = existingResult.rows[0];

      if (studentRecord.status === "completed") {
        return res.status(403).json({
          success: false,
          message: "Test already completed",
          completed: true,
        });
      }

      if (studentRecord.status === "locked") {
        return res.status(403).json({
          success: false,
          message: "Test is locked due to exceeded attempts",
          locked: true,
          currentAttempt: studentRecord.attempt,
          maxAttempts,
        });
      }

      currentAttempt = (studentRecord.attempt || 0) + 1;

      if (currentAttempt > maxAttempts) {
        const istNow = getISTTimestamp();
        await db.execute({
          sql: `UPDATE TestStudents 
                SET status = 'locked', attempt = ?, updated_at = ? 
                WHERE test_id = ? AND student_id = ?`,
          args: [currentAttempt, istNow, test_id, student_id],
        });

        return res.status(403).json({
          success: false,
          message: `Maximum attempts exceeded (${currentAttempt}/${maxAttempts}). Test is now locked.`,
          locked: true,
          currentAttempt,
          maxAttempts,
        });
      }

      const istNow = getISTTimestamp();
      await db.execute({
        sql: `UPDATE TestStudents 
              SET status = 'in-progress', 
                  attempt = ?, 
                  start_time = COALESCE(start_time, ?),
                  last_active = ?, 
                  updated_at = ?
              WHERE test_id = ? AND student_id = ?`,
        args: [currentAttempt, istNow, istNow, istNow, test_id, student_id],
      });
    } else {
      const istNow = getISTTimestamp();
      await db.execute({
        sql: `INSERT INTO TestStudents 
              (test_id, student_id, status, progress, attempt, start_time, last_active, created_at, updated_at)
              VALUES (?, ?, 'in-progress', 0, 1, ?, ?, ?, ?)`,
        args: [test_id, student_id, istNow, istNow, istNow, istNow],
      });
      currentAttempt = 1;
    }

    const snapshotResult = await db.execute({
      sql: `SELECT code FROM StudentCodeSnapshots WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    if (snapshotResult.rows.length > 0) {
      savedCode = snapshotResult.rows[0].code;
    }

    await messageManager.initTest(test_id, db);

    const studentRecord = await db.execute({
      sql: `SELECT start_time FROM TestStudents WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    if (studentRecord.rows.length > 0 && studentRecord.rows[0].start_time) {
      messageManager.registerStudent(
        test_id,
        student_id,
        studentRecord.rows[0].start_time
      );
    }

    res.status(200).json({
      success: true,
      message: "Test session initialized",
      currentAttempt,
      maxAttempts,
      savedCode,
      isReEntry: existingResult.rows.length > 0 && currentAttempt > 1,
    });
  } catch (error) {
    console.error("Test init error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Auto-save code snapshot - ONLY ONE ROW PER TEST+STUDENT (IST)
router.put("/:test_id/student/:student_id/save-code", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { code } = req.body;

    if (code === undefined || code === null) {
      return res.status(400).json({
        success: false,
        message: "Code is required",
      });
    }

    const istNow = getISTTimestamp();

    // Check if snapshot exists
    const existingSnapshot = await db.execute({
      sql: `SELECT snapshot_id FROM StudentCodeSnapshots WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    if (existingSnapshot.rows.length > 0) {
      // UPDATE existing snapshot (same row)
      await db.execute({
        sql: `UPDATE StudentCodeSnapshots 
              SET code = ?, updated_at = ? 
              WHERE test_id = ? AND student_id = ?`,
        args: [code, istNow, test_id, student_id],
      });
    } else {
      // INSERT new snapshot (first time)
      await db.execute({
        sql: `INSERT INTO StudentCodeSnapshots (test_id, student_id, code, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [test_id, student_id, code, istNow, istNow],
      });
    }

    // Update last_active in TestStudents
    await db.execute({
      sql: `UPDATE TestStudents SET last_active = ?, updated_at = ? WHERE test_id = ? AND student_id = ?`,
      args: [istNow, istNow, test_id, student_id],
    });

    res.status(200).json({
      success: true,
      message: "Code saved successfully",
    });
  } catch (error) {
    console.error("Save code error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Submit test (final submission) (IST)
router.post("/:test_id/student/:student_id/submit", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;
    const { code, output, executed } = req.body;

    // Check if already submitted
    const existingSubmission = await db.execute({
      sql: `SELECT submission_id FROM TestSubmissions WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    if (existingSubmission.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Test already submitted",
      });
    }

    const istNow = getISTTimestamp();

    // Save final code snapshot (if provided)
    if (code !== undefined && code !== null) {
      const existingSnapshot = await db.execute({
        sql: `SELECT snapshot_id FROM StudentCodeSnapshots WHERE test_id = ? AND student_id = ?`,
        args: [test_id, student_id],
      });

      if (existingSnapshot.rows.length > 0) {
        // Update existing
        await db.execute({
          sql: `UPDATE StudentCodeSnapshots 
                SET code = ?, updated_at = ? 
                WHERE test_id = ? AND student_id = ?`,
          args: [code, istNow, test_id, student_id],
        });
      } else {
        // Insert new
        await db.execute({
          sql: `INSERT INTO StudentCodeSnapshots (test_id, student_id, code, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [test_id, student_id, code, istNow, istNow],
        });
      }
    }

    // Create submission (similarity and score left NULL for later processing)
    await db.execute({
      sql: `INSERT INTO TestSubmissions (test_id, student_id, output, executed, submitted_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [test_id, student_id, output || "", executed || 0, istNow],
    });

    // Calculate duration
    const startTimeResult = await db.execute({
      sql: `SELECT start_time, attempt FROM TestStudents WHERE test_id = ? AND student_id = ?`,
      args: [test_id, student_id],
    });

    let duration = 0;
    let currentAttempt = 1;

    if (startTimeResult.rows.length > 0) {
      if (startTimeResult.rows[0].start_time) {
        const startTime = new Date(startTimeResult.rows[0].start_time);
        const endTime = new Date(); // Current time in server timezone
        
        // Convert to IST for accurate duration calculation
        const istEndTime = new Date(endTime.getTime() + (5.5 * 60 * 60 * 1000));
        duration = Math.floor((istEndTime - startTime) / 60000);
      }
      currentAttempt = startTimeResult.rows[0].attempt || 1;
    }

    // Update student status to COMPLETED
    await db.execute({
      sql: `UPDATE TestStudents 
            SET status = 'completed', progress = 100, end_time = ?, 
                duration = ?, updated_at = ?
            WHERE test_id = ? AND student_id = ?`,
      args: [istNow, duration, istNow, test_id, student_id],
    });

    res.status(201).json({
      success: true,
      message: "Test submitted successfully",
      attempt: currentAttempt,
      duration,
      submittedAt: istNow,
    });
  } catch (error) {
    console.error("Submit test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Track activities (tab switching, visibility changes, fullscreen exit)
router.post(
  "/:test_id/student/:student_id/track-activity",
  async (req, res) => {
    try {
      const { test_id, student_id } = req.params;
      const { activity_type } = req.body;

      // Update last_active timestamp
      await db.execute({
        sql: `UPDATE TestStudents SET last_active = CURRENT_TIMESTAMP WHERE test_id = ? AND student_id = ?`,
        args: [test_id, student_id],
      });

      // You can optionally log specific activities to a separate table
      // For now, just acknowledge the tracking

      res.status(200).json({
        success: true,
        message: `Activity tracked: ${activity_type}`,
      });
    } catch (error) {
      console.error("Track activity error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// ==================== MESSAGE ROUTES ====================

// POST: Send live message (faculty during exam)
router.post("/:test_id/live-message", async (req, res) => {
  try {
    const { test_id } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const trimmedMessage = message.trim();

    // Store message in database for history (using created_at, not sent_at)
    await db.execute({
      sql: `INSERT INTO LiveMessages (test_id, message, status, target_student_id, created_at) 
            VALUES (?, ?, 'sent', NULL, CURRENT_TIMESTAMP)`,
      args: [test_id, trimmedMessage]
    });

    // Send live message to students via messageManager
    messageManager.addLiveMessage(test_id, trimmedMessage);

    res.status(201).json({
      success: true,
      message: "Live message sent to all students",
    });
  } catch (error) {
    console.error("Send live message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET: Message history
router.get("/:test_id/message-history", async (req, res) => {
  try {
    const { test_id } = req.params;

    const result = await db.execute({
      sql: `SELECT message, created_at as sent_at 
            FROM LiveMessages 
            WHERE test_id = ? AND status = 'sent'
            ORDER BY created_at DESC 
            LIMIT 50`,
      args: [test_id]
    });

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get message history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load message history",
      data: []
    });
  }
});

// GET: Get scheduled messages for student (on page load)
router.get("/:test_id/scheduled-messages", async (req, res) => {
  try {
    const { test_id } = req.params;

    const result = await db.execute({
      sql: `SELECT message_id, time_minutes, message, created_at
            FROM ScheduledMessages
            WHERE test_id = ?
            ORDER BY time_minutes ASC`,
      args: [test_id],
    });

    const scheduledMessages = result.rows.map((row) => ({
      message_id: Number(row.message_id),
      time_minutes: row.time_minutes,
      message: row.message,
      created_at: row.created_at,
      type: "scheduled",
    }));

    res.status(200).json({
      success: true,
      scheduled_messages: scheduledMessages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// GET: Poll for live messages only
router.get("/:test_id/student/:student_id/messages", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;

    const messages = messageManager.getMessagesForStudent(test_id, student_id);
    const liveMessages = messages.filter((msg) => msg.type === "live");

    res.status(200).json({
      success: true,
      messages: liveMessages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Get student submission details for completed page
router.get("/:test_id/student/:student_id/submission", async (req, res) => {
  try {
    const { test_id, student_id } = req.params;

    // Get submission data
    const submissionResult = await db.execute({
      sql: `SELECT 
              ts.submission_id,
              ts.similarity,
              ts.score,
              ts.output,
              ts.executed,
              ts.submitted_at,
              scs.code,
              tst.attempt,
              tst.duration,
              tst.status
            FROM TestSubmissions ts
            LEFT JOIN StudentCodeSnapshots scs ON scs.test_id = ts.test_id AND scs.student_id = ts.student_id
            LEFT JOIN TestStudents tst ON tst.test_id = ts.test_id AND tst.student_id = ts.student_id
            WHERE ts.test_id = ? AND ts.student_id = ?`,
      args: [test_id, student_id],
    });

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    res.status(200).json({
      success: true,
      data: submissionResult.rows[0],
    });
  } catch (error) {
    console.error("Get submission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;

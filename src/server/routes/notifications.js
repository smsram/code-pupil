const express = require("express");
const { createClient } = require("@libsql/client");
const router = express.Router();

// Turso DB config
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper function to get IST timestamp
function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().replace('T', ' ').substring(0, 19);
}

// GET: Get notifications for user (faculty or student)
// Route: /api/notifications/:user_type/:user_id
router.get("/:user_type/:user_id", async (req, res) => {
  try {
    const { user_type, user_id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    if (!['faculty', 'student'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type. Must be 'faculty' or 'student'"
      });
    }

    // Get notifications
    const notificationsResult = await db.execute({
      sql: `SELECT * FROM Notifications 
            WHERE user_type = ? AND user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
      args: [user_type, user_id, limit]
    });

    // Get unread count
    const unreadCountResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM Notifications 
            WHERE user_type = ? AND user_id = ? AND read = 0`,
      args: [user_type, user_id]
    });

    res.status(200).json({
      success: true,
      data: {
        notifications: notificationsResult.rows,
        unreadCount: Number(unreadCountResult.rows[0]?.count || 0)
      }
    });

  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// POST: Create notification
// Route: /api/notifications
router.post("/", async (req, res) => {
  try {
    const { user_type, user_id, type, title, message, link } = req.body;

    if (!user_type || !user_id || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: user_type, user_id, type, title, message"
      });
    }

    if (!['faculty', 'student'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type. Must be 'faculty' or 'student'"
      });
    }

    if (!['alert', 'info', 'success', 'warning'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification type. Must be 'alert', 'info', 'success', or 'warning'"
      });
    }

    const istNow = getISTTimestamp();

    const result = await db.execute({
      sql: `INSERT INTO Notifications (user_type, user_id, type, title, message, link, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user_type, user_id, type, title, message, link || null, istNow, istNow]
    });

    res.status(201).json({
      success: true,
      message: "Notification created",
      data: {
        notification_id: result.lastInsertRowid
      }
    });

  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// PUT: Mark notification as read
// Route: /api/notifications/:notification_id/read
router.put("/:notification_id/read", async (req, res) => {
  try {
    const { notification_id } = req.params;
    const istNow = getISTTimestamp();

    await db.execute({
      sql: `UPDATE Notifications 
            SET read = 1, updated_at = ? 
            WHERE notification_id = ?`,
      args: [istNow, notification_id]
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });

  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// PUT: Mark all notifications as read for a user
// Route: /api/notifications/:user_type/:user_id/read-all
router.put("/:user_type/:user_id/read-all", async (req, res) => {
  try {
    const { user_type, user_id } = req.params;

    if (!['faculty', 'student'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type"
      });
    }

    const istNow = getISTTimestamp();

    const result = await db.execute({
      sql: `UPDATE Notifications 
            SET read = 1, updated_at = ? 
            WHERE user_type = ? AND user_id = ? AND read = 0`,
      args: [istNow, user_type, user_id]
    });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });

  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// DELETE: Delete a specific notification
// Route: /api/notifications/:notification_id
router.delete("/:notification_id", async (req, res) => {
  try {
    const { notification_id } = req.params;

    await db.execute({
      sql: `DELETE FROM Notifications WHERE notification_id = ?`,
      args: [notification_id]
    });

    res.status(200).json({
      success: true,
      message: "Notification deleted"
    });

  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// DELETE: Clear all read notifications for a user
// Route: /api/notifications/:user_type/:user_id/clear-read
router.delete("/:user_type/:user_id/clear-read", async (req, res) => {
  try {
    const { user_type, user_id } = req.params;

    if (!['faculty', 'student'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type"
      });
    }

    await db.execute({
      sql: `DELETE FROM Notifications 
            WHERE user_type = ? AND user_id = ? AND read = 1`,
      args: [user_type, user_id]
    });

    res.status(200).json({
      success: true,
      message: "Read notifications cleared"
    });

  } catch (error) {
    console.error("Clear read notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;

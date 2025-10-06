const express = require("express");
const router = express.Router();
const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// GET refresh settings
router.get("/refresh/:user_type/:user_id/:page_name", async (req, res) => {
  try {
    const { user_type, user_id, page_name } = req.params;

    const result = await db.execute({
      sql: `SELECT refresh_interval FROM UserRefreshSettings 
            WHERE user_id = ? AND user_type = ? AND page_name = ?`,
      args: [user_id, user_type, page_name]
    });

    const interval = result.rows.length > 0 
      ? result.rows[0].refresh_interval 
      : 5; // Default 5 seconds

    res.status(200).json({
      success: true,
      refresh_interval: interval
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// POST/UPDATE refresh settings
router.post("/refresh/:user_type/:user_id/:page_name", async (req, res) => {
  try {
    const { user_type, user_id, page_name } = req.params;
    const { refresh_interval } = req.body;

    if (!refresh_interval || refresh_interval < 3 || refresh_interval > 60) {
      return res.status(400).json({
        success: false,
        message: "Refresh interval must be between 3 and 60 seconds"
      });
    }

    await db.execute({
      sql: `INSERT INTO UserRefreshSettings (user_id, user_type, page_name, refresh_interval, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, user_type, page_name) 
            DO UPDATE SET refresh_interval = ?, updated_at = CURRENT_TIMESTAMP`,
      args: [user_id, user_type, page_name, refresh_interval, refresh_interval]
    });

    res.status(200).json({
      success: true,
      message: "Refresh interval updated",
      refresh_interval
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

module.exports = router;

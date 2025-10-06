const { Server } = require("socket.io");

let facultyIO = null;

const initializeFacultySocket = (server, db) => {
  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  facultyIO = io;

  // Monitor namespace
  const monitorNamespace = io.of("/test-monitor");

  monitorNamespace.on("connection", (socket) => {
    console.log("✅ Faculty monitor connected:", socket.id);

    socket.on("join-test-monitor", async (testId) => {
      socket.join(`monitor-${testId}`);
      console.log(`📊 Faculty joined monitoring: ${testId}`);

      // Send initial data
      await sendStudentData(testId, socket, db);
    });

    socket.on("disconnect", () => {
      console.log("❌ Faculty monitor disconnected:", socket.id);
    });
  });

  // Send student data
  const sendStudentData = async (testId, socket, db) => {
    try {
      const testCheck = await db.execute({
        sql: `SELECT test_id, start_year, branch, section FROM Tests WHERE test_id = ?`,
        args: [testId],
      });

      if (testCheck.rows.length === 0) {
        socket.emit("error", { message: "Test not found" });
        return;
      }

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
        args: [testId, test.start_year, test.branch, test.section.toString()],
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
        score: 0,
      }));

      // Get scores
      for (let student of students) {
        const submissionResult = await db.execute({
          sql: `SELECT score FROM TestSubmissions 
                WHERE test_id = ? AND student_id = ? 
                ORDER BY submitted_at DESC LIMIT 1`,
          args: [testId, student.student_id],
        });

        if (submissionResult.rows.length > 0) {
          student.score = submissionResult.rows[0].score || 0;
        }
      }

      socket.emit("student-data", students);
      console.log(
        `📤 Sent student data for test ${testId}: ${students.length} students`
      );
    } catch (error) {
      console.error("Error sending student data:", error);
      socket.emit("error", { message: "Failed to fetch student data" });
    }
  };

  return io;
};

// Broadcast update
const broadcastStudentUpdate = async (testId, db) => {
  if (!facultyIO) {
    console.log("⚠️ Faculty IO not initialized");
    return;
  }

  try {
    const testCheck = await db.execute({
      sql: `SELECT test_id, start_year, branch, section FROM Tests WHERE test_id = ?`,
      args: [testId],
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
      args: [testId, test.start_year, test.branch, test.section.toString()],
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
      score: 0,
    }));

    // Get scores
    for (let student of students) {
      const submissionResult = await db.execute({
        sql: `SELECT score FROM TestSubmissions 
              WHERE test_id = ? AND student_id = ? 
              ORDER BY submitted_at DESC LIMIT 1`,
        args: [testId, student.student_id],
      });

      if (submissionResult.rows.length > 0) {
        student.score = submissionResult.rows[0].score || 0;
      }
    }

    facultyIO
      .of("/test-monitor")
      .to(`monitor-${testId}`)
      .emit("student-data", students);
    console.log(`📡 Broadcasted student update for test ${testId}`);
  } catch (error) {
    console.error("Broadcast error:", error);
  }
};

module.exports = { initializeFacultySocket, broadcastStudentUpdate };

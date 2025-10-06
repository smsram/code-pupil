const express = require("express");
const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Turso DB config
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// SIGNUP Route
router.post("/faculty/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, department, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !department) {
      return res.status(400).json({ 
        success: false, 
        message: "All required fields must be provided" 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format" 
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters" 
      });
    }

    // Check if email already exists
    const existingUser = await db.execute({
      sql: "SELECT email FROM Faculty WHERE email = ?",
      args: [email]
    });

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new faculty
    await db.execute({
      sql: `INSERT INTO Faculty (first_name, last_name, email, phone, department, password_hash) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [firstName, lastName, email, phone || null, department, password_hash]
    });

    // Get the newly created faculty
    const newFaculty = await db.execute({
      sql: "SELECT faculty_id, first_name, last_name, email, department FROM Faculty WHERE email = ?",
      args: [email]
    });

    const faculty = newFaculty.rows[0];

    res.status(201).json({
      success: true,
      message: "Faculty account created successfully",
      data: {
        faculty_id: faculty.faculty_id,
        first_name: faculty.first_name,
        last_name: faculty.last_name,
        email: faculty.email,
        department: faculty.department
      }
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration" 
    });
  }
});

// SIGNIN Route
router.post("/faculty/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    // Find faculty by email
    const result = await db.execute({
      sql: `SELECT faculty_id, first_name, last_name, email, department, password_hash 
            FROM Faculty WHERE email = ?`,
      args: [email]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    const faculty = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, faculty.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    // Update last login time
    await db.execute({
      sql: "UPDATE Faculty SET updated_at = CURRENT_TIMESTAMP WHERE faculty_id = ?",
      args: [faculty.faculty_id]
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        faculty_id: faculty.faculty_id,
        first_name: faculty.first_name,
        last_name: faculty.last_name,
        email: faculty.email,
        department: faculty.department
      }
    });

  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login" 
    });
  }
});

// Verify Faculty Route (checks if faculty_id exists)
router.get("/faculty/verify/:faculty_id", async (req, res) => {
  try {
    const { faculty_id } = req.params;

    const result = await db.execute({
      sql: `SELECT faculty_id, first_name, last_name, email, department 
            FROM Faculty WHERE faculty_id = ?`,
      args: [faculty_id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Faculty not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

router.post("/student/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, pin, startYear, section, branch, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !pin || !startYear || !section || !branch || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "All required fields must be provided" 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format" 
      });
    }

    // PIN validation (6-10 alphanumeric characters)
    const pinRegex = /^[A-Z0-9]{6,10}$/i;
    if (!pinRegex.test(pin)) {
      return res.status(400).json({ 
        success: false, 
        message: "PIN must be 6-10 alphanumeric characters" 
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters" 
      });
    }

    // Convert PIN to uppercase for consistency
    const upperPin = pin.toUpperCase();

    // Check if email already exists
    const existingEmail = await db.execute({
      sql: "SELECT email FROM Student WHERE email = ?",
      args: [email]
    });

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }

    // Check if PIN already exists (case-insensitive)
    const existingPin = await db.execute({
      sql: "SELECT pin FROM Student WHERE UPPER(pin) = UPPER(?)",
      args: [upperPin]
    });

    if (existingPin.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "PIN already registered" 
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new student with uppercase PIN
    await db.execute({
      sql: `INSERT INTO Student (email, pin, first_name, last_name, start_year, section, branch, password_hash) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [email, upperPin, firstName, lastName, startYear, section, branch, password_hash]
    });

    // Get the newly created student
    const newStudent = await db.execute({
      sql: "SELECT student_id, first_name, last_name, email, pin, start_year, section, branch FROM Student WHERE email = ?",
      args: [email]
    });

    const student = newStudent.rows[0];

    res.status(201).json({
      success: true,
      message: "Student account created successfully",
      data: {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        pin: student.pin,
        start_year: student.start_year,
        section: student.section,
        branch: student.branch
      }
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration" 
    });
  }
});

// SIGNIN Route
router.post("/student/signin", async (req, res) => {
  try {
    const { pin, password } = req.body;

    // Validation
    if (!pin || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "PIN and password are required" 
      });
    }

    // PIN validation (6-10 alphanumeric characters)
    const pinRegex = /^[A-Z0-9]{6,10}$/i;
    if (!pinRegex.test(pin)) {
      return res.status(400).json({ 
        success: false, 
        message: "PIN must be 6-10 alphanumeric characters" 
      });
    }

    // Convert PIN to uppercase for case-insensitive search
    const upperPin = pin.toUpperCase();

    // Find student by PIN (case-insensitive)
    const result = await db.execute({
      sql: `SELECT student_id, first_name, last_name, email, pin, start_year, section, branch, password_hash 
            FROM Student WHERE UPPER(pin) = UPPER(?)`,
      args: [upperPin]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid PIN or password" 
      });
    }

    const student = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, student.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid PIN or password" 
      });
    }

    // Update last login time
    await db.execute({
      sql: "UPDATE Student SET updated_at = CURRENT_TIMESTAMP WHERE student_id = ?",
      args: [student.student_id]
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        pin: student.pin,
        start_year: student.start_year,
        section: student.section,
        branch: student.branch
      }
    });

  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login" 
    });
  }
});

// Verify Student Route
router.get("/student/verify/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;

    const result = await db.execute({
      sql: `SELECT student_id, first_name, last_name, email, pin, start_year, section, branch 
            FROM Student WHERE student_id = ?`,
      args: [student_id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

module.exports = router;

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "development-only-change-this-secret";
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const USERS_FILE = path.join(DATA_DIR, "users.json");
const EVALUATIONS_FILE = path.join(DATA_DIR, "evaluations.json");
const SUBJECTS_FILE = path.join(DATA_DIR, "subjects.json");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${file}:`, error.message);
    return fallback;
  }
}
function writeJson(file, data) {
  // Write to a temporary file first so an interrupted write does not corrupt the JSON file.
  const tempFile = `${file}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempFile, file);
}
function initializeData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
  if (!fs.existsSync(EVALUATIONS_FILE)) writeJson(EVALUATIONS_FILE, []);
  if (!fs.existsSync(SUBJECTS_FILE)) writeJson(SUBJECTS_FILE, [
    { id: "sub-101", code: "IT 201", title: "Web Systems and Technologies", faculty: "Prof. Maria Santos", section: "BSIT 2A", semester: "1st Semester, AY 2026–2027", units: 3 },
    { id: "sub-102", code: "IT 202", title: "Database Management Systems", faculty: "Mr. John Reyes", section: "BSIT 2A", semester: "1st Semester, AY 2026–2027", units: 3 },
    { id: "sub-103", code: "IT 203", title: "Networking Fundamentals", faculty: "Engr. Angela Cruz", section: "BSIT 2A", semester: "1st Semester, AY 2026–2027", units: 3 },
    { id: "sub-104", code: "GEC 5", title: "Purposive Communication", faculty: "Dr. Roberto Dela Peña", section: "BSIT 2A", semester: "1st Semester, AY 2026–2027", units: 3 }
  ]);
}
initializeData();

// Set CORS_ORIGIN to your deployed Vercel URL. Multiple origins can be comma-separated.
// Vercel preview URLs are allowed when ALLOW_VERCEL_PREVIEWS=true (default).
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",").map(origin => origin.trim()).filter(Boolean);
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS !== "false";
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // curl, health checks, server-to-server
    const allowed = allowedOrigins.includes(origin) ||
      (allowVercelPreviews && /^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(origin));
    if (allowed) return callback(null, true);
    return callback(new Error("This website is not allowed to access the API. Check CORS_ORIGIN."));
  }
}));
app.use(express.json({ limit: "1mb" }));

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Please sign in to continue." });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { return res.status(401).json({ message: "Your session has expired. Please sign in again." }); }
}

app.get("/", (_req, res) => res.json({ name: "BEU–HEU Faculty Evaluation API", status: "ok" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Faculty Evaluation API is running." }));

app.post("/api/auth/register", async (req, res) => {
  const { fullName, studentId, email, password, program, yearLevel, section } = req.body;
  if (![fullName, studentId, email, password, program, yearLevel, section].every(v => String(v || "").trim()))
    return res.status(400).json({ message: "Please complete all registration fields." });
  if (String(password).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
  const users = readJson(USERS_FILE, []);
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase() || u.studentId.toLowerCase() === studentId.toLowerCase()))
    return res.status(409).json({ message: "That email or student ID is already registered." });
  const user = {
    id: `usr-${Date.now()}`, fullName: fullName.trim(), studentId: studentId.trim(),
    email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 10),
    program: program.trim(), yearLevel, section: section.trim(), createdAt: new Date().toISOString()
  };
  users.push(user); writeJson(USERS_FILE, users);
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "12h" });
  res.status(201).json({ token, user: publicUser(user), message: "Account created successfully." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = readJson(USERS_FILE, []).find(u => u.email === String(email || "").toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash)))
    return res.status(401).json({ message: "Incorrect email or password." });
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "12h" });
  res.json({ token, user: publicUser(user), message: "Welcome back." });
});

function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
app.get("/api/auth/me", auth, (req, res) => {
  const user = readJson(USERS_FILE, []).find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: "Account not found." });
  res.json({ user: publicUser(user) });
});

app.get("/api/subjects", auth, (req, res) => {
  const subjects = readJson(SUBJECTS_FILE, []);
  res.json({ semester: subjects[0]?.semester || "Current Semester", subjects });
});

app.get("/api/evaluations/mine", auth, (req, res) => {
  const evaluations = readJson(EVALUATIONS_FILE, []).filter(e => e.studentId === req.user.id);
  res.json({ evaluations });
});

app.post("/api/evaluations", auth, (req, res) => {
  const { subjectId, ratings, comment } = req.body;
  const subjects = readJson(SUBJECTS_FILE, []);
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return res.status(404).json({ message: "Subject not found." });
  const criteria = ["subjectKnowledge", "teachingMethods", "communication", "classroomManagement", "professionalism"];
  if (!ratings || criteria.some(k => !Number.isInteger(ratings[k]) || ratings[k] < 1 || ratings[k] > 5))
    return res.status(400).json({ message: "Please rate all five evaluation criteria." });
  const evaluations = readJson(EVALUATIONS_FILE, []);
  if (evaluations.some(e => e.studentId === req.user.id && e.subjectId === subjectId))
    return res.status(409).json({ message: "You have already submitted an evaluation for this subject." });
  const evaluation = {
    id: `eval-${Date.now()}`, studentId: req.user.id, subjectId,
    subjectCode: subject.code, subjectTitle: subject.title, faculty: subject.faculty,
    ratings, comment: String(comment || "").trim().slice(0, 1000),
    average: Number((criteria.reduce((sum, k) => sum + ratings[k], 0) / criteria.length).toFixed(2)),
    submittedAt: new Date().toISOString()
  };
  evaluations.push(evaluation); writeJson(EVALUATIONS_FILE, evaluations);
  res.status(201).json({ evaluation, message: "Your evaluation has been submitted. Thank you for your feedback." });
});

// Keep CORS errors readable for frontend requests.
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message && err.message.includes("not allowed to access the API"))
    return res.status(403).json({ message: err.message });
  res.status(500).json({ message: "An unexpected server error occurred." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Faculty Evaluation API running on port ${PORT}`);
  console.log(`JSON data directory: ${DATA_DIR}`);
});

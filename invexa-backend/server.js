require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const rateLimit    = require("express-rate-limit");
const { testConnection } = require("./db");
const routes       = require("./routes/index");

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── TRUST PROXY (required on Railway) ───────────────────────────────────────
// Railway sits behind a reverse proxy — this ensures req.ip is correct
app.set("trust proxy", 1);

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
  // Add your Vercel URL here after deploying frontend
  // "https://your-app.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' not allowed.`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── REQUEST LOGGING ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(
    process.env.NODE_ENV === "production"
      ? "combined"   // full logs in production
      : "dev"        // coloured short logs in development
  ));
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
// Global limiter — 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: "Too many requests. Please slow down." },
});
app.use(globalLimiter);

// Stricter limiter for auth routes — 20 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: "Too many login attempts. Please wait 15 minutes." },
});
app.use("/api/auth/login",   authLimiter);
app.use("/api/auth/refresh", authLimiter);

// ─── ROOT ROUTE ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name:        "InvenPro ERP API",
    version:     "1.0.0",
    status:      "running",
    environment: process.env.NODE_ENV || "development",
    docs:        "/api/health",
    timestamp:   new Date().toISOString(),
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use("/api", routes);

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
// Must have 4 parameters for Express to treat it as error middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // CORS errors
  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ success: false, error: err.message });
  }

  // JSON parse errors
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, error: "Invalid JSON in request body." });
  }

  // Payload too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, error: "Request body too large." });
  }

  // Default — log in dev, hide details in production
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === "production"
      ? "An unexpected error occurred. Please try again."
      : err.message,
  });
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received — shutting down gracefully");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
  process.exit(1);
});

// ─── START SERVER ────────────────────────────────────────────────────────────
async function start() {
  console.log("─────────────────────────────────────");
  console.log("  InvenPro ERP Backend");
  console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("─────────────────────────────────────");

  // Test DB before accepting traffic
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error("❌ Cannot start — database connection failed.");
    console.error("   Check DATABASE_URL in your .env file.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   Local:  http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log("─────────────────────────────────────");
  });
}

start();

module.exports = app;

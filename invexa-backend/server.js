require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const rateLimit    = require("express-rate-limit");
const { testConnection } = require("./db");

// Import all modular routers
const mainRoutes        = require("./routes/index");
const fulfillmentRoutes = require("./routes/fulfillment");
const catalogRoutes     = require("./routes/catalog");

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── TRUST PROXY (required on Railway/Vercel) ─────────────────────────────────
// Sits behind a reverse proxy — this ensures req.ip is correct
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
}));

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request logging (disabled in test environments to keep console clean)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});
app.use("/api", apiLimiter);

// ══════════════════════════════════════════════════════════════════════════════
// 🚀 ROUTE MOUNTING (THE MASTER CONNECTION)
// ══════════════════════════════════════════════════════════════════════════════

// 1. Mount the core monolithic routes (Auth, Users, Inventory, Orders, Manufacturing, etc.)
app.use("/api", mainRoutes);

// 2. Mount the Fulfillment expansion (Putaway, Pick/Pack/Ship, Backorders)
app.use("/api", fulfillmentRoutes);

// 3. Mount the Catalog expansion (Variants, Price Lists, Dropshipping)
app.use("/api", catalogRoutes);

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

// 404 Catcher
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: "API route not found." });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({
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
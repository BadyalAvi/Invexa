const jwt = require("jsonwebtoken");
const { db } = require("../db");

// ─── ROLE HIERARCHY ───────────────────────────────────────────────────────────
const ROLE_LEVELS = {
  viewer:  1,
  staff:   2,
  manager: 3,
  admin:   4,
};

// ─── PERMISSIONS MAP ──────────────────────────────────────────────────────────
const PERMISSIONS = {
  // Products
  "products:read":    ["viewer","staff","manager","admin"],
  "products:create":  ["staff","manager","admin"],
  "products:update":  ["staff","manager","admin"],
  "products:delete":  ["manager","admin"],

  // Orders
  "orders:read":      ["viewer","staff","manager","admin"],
  "orders:create":    ["staff","manager","admin"],
  "orders:update":    ["staff","manager","admin"],
  "orders:delete":    ["manager","admin"],

  // Transfers
  "transfers:read":   ["viewer","staff","manager","admin"],
  "transfers:create": ["staff","manager","admin"],

  // Manufacturing
  "manufacturing:read":   ["viewer","staff","manager","admin"],
  "manufacturing:create": ["staff","manager","admin"],
  "manufacturing:update": ["staff","manager","admin"],

  // QC
  "qc:read":    ["viewer","staff","manager","admin"],
  "qc:create":  ["staff","manager","admin"],
  "qc:inspect": ["staff","manager","admin"],

  // Scrap
  "scrap:read":     ["viewer","staff","manager","admin"],
  "scrap:create":   ["staff","manager","admin"],
  "scrap:writeoff": ["manager","admin"],

  // Returns
  "returns:read":    ["viewer","staff","manager","admin"],
  "returns:create":  ["staff","manager","admin"],
  "returns:approve": ["manager","admin"],

  // Vendors
  "vendors:read":   ["viewer","staff","manager","admin"],
  "vendors:create": ["manager","admin"],
  "vendors:update": ["manager","admin"],
  "vendors:delete": ["admin"],

  // Users
  "users:read":   ["manager","admin"],
  "users:create": ["admin"],
  "users:update": ["admin"],
  "users:delete": ["admin"],

  // Reports & audit
  "reports:read":   ["manager","admin"],
  "audit:read":     ["manager","admin"],
  "settings:write": ["admin"],
};

// ─── VERIFY JWT TOKEN ─────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Session expired. Please log in again.",
          code: "TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please log in again.",
      });
    }

    // Fetch fresh user from DB to catch deactivated accounts
    const { rows } = await db.query(
      "SELECT id, name, email, role, warehouse, status FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "User not found.",
      });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Account is inactive. Contact your administrator.",
      });
    }

    // Attach user to request object for use in route handlers
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(500).json({ success: false, error: "Authentication error." });
  }
};

// ─── REQUIRE MINIMUM ROLE ─────────────────────────────────────────────────────
// Usage: router.get("/users", authenticate, requireRole("manager"), handler)
const requireRole = (minRole) => {
  return (req, res, next) => {
    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const required  = ROLE_LEVELS[minRole] || 99;

    if (userLevel < required) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires '${minRole}' role or higher.`,
        yourRole: req.user.role,
      });
    }
    next();
  };
};

// ─── REQUIRE SPECIFIC PERMISSION ─────────────────────────────────────────────
// Usage: router.delete("/products/:id", authenticate, requirePermission("products:delete"), handler)
const requirePermission = (permission) => {
  return (req, res, next) => {
    const allowed = PERMISSIONS[permission] || [];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. You don't have '${permission}' permission.`,
        yourRole: req.user.role,
      });
    }
    next();
  };
};

// ─── WAREHOUSE FILTER ─────────────────────────────────────────────────────────
// Restricts staff/manager to their assigned warehouse only
// Admins can see all warehouses
const warehouseFilter = (req, res, next) => {
  if (req.user.role === "admin") {
    req.warehouseFilter = null; // no filter — see everything
  } else if (req.user.warehouse && req.user.warehouse !== "All") {
    req.warehouseFilter = req.user.warehouse;
  } else {
    req.warehouseFilter = null;
  }
  next();
};

// ─── GENERATE TOKENS ──────────────────────────────────────────────────────────
const generateTokens = (user) => {
  const payload = {
    userId:    user.id,
    email:     user.email,
    role:      user.role,
    warehouse: user.warehouse,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  );

  return { accessToken, refreshToken };
};

// ─── AUDIT LOG HELPER ─────────────────────────────────────────────────────────
// Call this from any route to record an action in the DB audit trail
const logAudit = async (userId, module, action, entity, detail, status = "success") => {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, module, action, entity, detail, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, module, action, entity, detail, status]
    );
  } catch (err) {
    // Never let audit logging break the main flow
    console.error("Audit log error:", err.message);
  }
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  warehouseFilter,
  generateTokens,
  logAudit,
  PERMISSIONS,
  ROLE_LEVELS,
};

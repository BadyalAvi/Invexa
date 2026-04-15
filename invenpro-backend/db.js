const { Pool } = require("pg");
require("dotenv").config();

// ─── CONNECTION POOL ──────────────────────────────────────────────────────────
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required for Supabase
        max: 10,                            // max connections in pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

// ─── LOG CONNECTION EVENTS ────────────────────────────────────────────────────
pool.on("connect", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("✅ New DB client connected");
  }
});

pool.on("error", (err) => {
  console.error("❌ Unexpected DB client error:", err.message);
});

// ─── QUERY HELPER ─────────────────────────────────────────────────────────────
// Usage: const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [id])
const db = {
  query: (text, params) => pool.query(text, params),

  // Get a dedicated client for transactions
  getClient: () => pool.connect(),

  // Run multiple queries in a transaction — auto rollback on error
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};

// ─── TEST CONNECTION ───────────────────────────────────────────────────────────
async function testConnection() {
  try {
    const { rows } = await db.query("SELECT NOW() as time, current_database() as db");
    console.log(`✅ Database connected: ${rows[0].db} at ${rows[0].time}`);
    return true;
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error("   Check your DATABASE_URL in .env");
    return false;
  }
}

// ─── SCHEMA SETUP ─────────────────────────────────────────────────────────────
// Run with: npm run db:setup
// Or: node -e "require('./db').setupSchema()"
async function setupSchema() {
  const fs = require("fs");
  const path = require("path");
  const schemaPath = path.join(__dirname, "schema.sql");

  if (!fs.existsSync(schemaPath)) {
    console.error("❌ schema.sql not found");
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf8");
  try {
    await db.query(sql);
    console.log("✅ Schema applied successfully");
    await seedDefaultData();
  } catch (err) {
    console.error("❌ Schema setup failed:", err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

// ─── SEED DEFAULT DATA ────────────────────────────────────────────────────────
async function seedDefaultData() {
  // Create default admin user (password: Admin@123)
  const bcrypt = require("bcryptjs");
  const { v4: uuidv4 } = require("uuid");
  const hash = await bcrypt.hash("Admin@123", 12);

  await db.query(`
    INSERT INTO users (id, name, email, password_hash, role, warehouse, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (email) DO NOTHING
  `, [uuidv4(), "Admin User", "admin@invenpro.in", hash, "admin", "All", "active"]);

  console.log("✅ Default admin user created: admin@invenpro.in / Admin@123");
  console.log("⚠️  Change the password immediately after first login!");
}

module.exports = { db, testConnection, setupSchema };

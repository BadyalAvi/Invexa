const express = require("express");
const bcrypt  = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { body, param, query, validationResult } = require("express-validator");
const { db } = require("../db");
const {
  authenticate, requireRole, requirePermission,
  warehouseFilter, generateTokens, logAudit,
} = require("../middleware/auth");

const router = express.Router();

// ─── VALIDATION HELPER ────────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success:false, errors: errors.array() });
  }
  next();
};

// ─── SEQUENCE GENERATOR ───────────────────────────────────────────────────────
// Generates sequential numbers like SO-1001, PO-0001, TRF-001 etc.
async function nextSeq(prefix, table, col) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM ${table}`
  );
  const n = parseInt(rows[0].cnt) + 1;
  return `${prefix}-${String(n).padStart(4,"0")}`;
}

// ─── STOCK HELPER ─────────────────────────────────────────────────────────────
// Adjusts stock and records a movement in one transaction
async function adjustStock(client, {
  productId, productName, productCode,
  warehouse, delta, type, reason, reference, userId
}) {
  // Lock row for update
  const { rows } = await client.query(
    `SELECT on_hand, reserved FROM stock_levels
     WHERE product_id=$1 AND warehouse=$2 FOR UPDATE`,
    [productId, warehouse]
  );

  let before = 0;
  if (rows.length === 0) {
    // Create stock level row if missing
    await client.query(
      `INSERT INTO stock_levels (product_id, warehouse, on_hand, reserved)
       VALUES ($1,$2,0,0)`,
      [productId, warehouse]
    );
  } else {
    before = rows[0].on_hand;
  }

  const after = Math.max(0, before + delta);

  await client.query(
    `UPDATE stock_levels SET on_hand=$1, updated_at=NOW()
     WHERE product_id=$2 AND warehouse=$3`,
    [after, productId, warehouse]
  );

  // Record movement
  const movNo = `MOV-${Date.now()}`;
  await client.query(
    `INSERT INTO stock_movements
       (mov_no,product_id,product_name,product_code,type,quantity,before_qty,after_qty,reason,reference,warehouse,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [movNo, productId, productName, productCode,
     type, Math.abs(delta), before, after,
     reason, reference, warehouse, userId]
  );

  return { before, after };
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/login
router.post("/auth/login",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min:1 }),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const { rows } = await db.query(
        "SELECT * FROM users WHERE email=$1 AND status='active'", [email]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success:false, error:"Invalid email or password." });
      }
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ success:false, error:"Invalid email or password." });
      }

      // Update last login
      await db.query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);

      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token
      await db.query(
        `INSERT INTO refresh_tokens (id,user_id,token,expires_at)
         VALUES ($1,$2,$3,NOW() + INTERVAL '30 days')`,
        [uuidv4(), user.id, refreshToken]
      );

      await logAudit(user.id, "Auth", "LOGIN", "User", `${user.name} logged in`, "success");

      res.json({
        success: true,
        data: {
          user: { id:user.id, name:user.name, email:user.email, role:user.role, warehouse:user.warehouse },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      console.error("Login error:", err.message);
      res.status(500).json({ success:false, error:"Login failed." });
    }
  }
);

// POST /api/auth/refresh
router.post("/auth/refresh",
  body("refreshToken").notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      const { rows } = await db.query(
        `SELECT rt.*, u.name, u.email, u.role, u.warehouse, u.status
         FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id
         WHERE rt.token=$1 AND rt.expires_at > NOW()`,
        [refreshToken]
      );
      if (rows.length === 0) {
        return res.status(401).json({ success:false, error:"Invalid or expired refresh token." });
      }
      const user = rows[0];
      if (user.status !== "active") {
        return res.status(403).json({ success:false, error:"Account is inactive." });
      }

      const tokens = generateTokens(user);

      // Rotate refresh token
      await db.query("DELETE FROM refresh_tokens WHERE token=$1", [refreshToken]);
      await db.query(
        `INSERT INTO refresh_tokens (id,user_id,token,expires_at)
         VALUES ($1,$2,$3,NOW() + INTERVAL '30 days')`,
        [uuidv4(), user.user_id, tokens.refreshToken]
      );

      res.json({ success:true, data: tokens });
    } catch (err) {
      res.status(401).json({ success:false, error:"Token refresh failed." });
    }
  }
);

// POST /api/auth/logout
router.post("/auth/logout", authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await db.query("DELETE FROM refresh_tokens WHERE token=$1", [refreshToken]);
    }
    await logAudit(req.user.id, "Auth", "LOGOUT", "User", `${req.user.name} logged out`);
    res.json({ success:true, message:"Logged out successfully." });
  } catch (err) {
    res.status(500).json({ success:false, error:"Logout failed." });
  }
});

// GET /api/auth/me
router.get("/auth/me", authenticate, async (req, res) => {
  res.json({ success:true, data: req.user });
});

// PUT /api/auth/change-password
router.put("/auth/change-password",
  authenticate,
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min:8 }),
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const { rows } = await db.query("SELECT password_hash FROM users WHERE id=$1", [req.user.id]);
      const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match) {
        return res.status(400).json({ success:false, error:"Current password is incorrect." });
      }
      const hash = await bcrypt.hash(newPassword, 12);
      await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user.id]);
      await logAudit(req.user.id, "Auth", "PASSWORD_CHANGE", "User", "Password changed successfully");
      res.json({ success:true, message:"Password changed successfully." });
    } catch (err) {
      res.status(500).json({ success:false, error:"Password change failed." });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// USERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/users", authenticate, requireRole("manager"), async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id,name,email,role,warehouse,status,last_login,created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/users",
  authenticate, requireRole("admin"),
  body("name").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min:8 }),
  body("role").isIn(["admin","manager","staff","viewer"]),
  validate,
  async (req, res) => {
    try {
      const { name, email, password, role, warehouse } = req.body;
      const hash = await bcrypt.hash(password, 12);
      const { rows } = await db.query(
        `INSERT INTO users (id,name,email,password_hash,role,warehouse)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role,warehouse,status`,
        [uuidv4(), name, email, hash, role, warehouse||"All"]
      );
      await logAudit(req.user.id,"Users","ADD","User",`Created user ${name} (${role})`);
      res.status(201).json({ success:true, data:rows[0] });
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ success:false, error:"Email already exists." });
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.put("/users/:id",
  authenticate, requireRole("admin"),
  param("id").isUUID(),
  validate,
  async (req, res) => {
    try {
      const { name, role, warehouse, status } = req.body;
      const { rows } = await db.query(
        `UPDATE users SET name=COALESCE($1,name), role=COALESCE($2,role),
         warehouse=COALESCE($3,warehouse), status=COALESCE($4,status)
         WHERE id=$5 RETURNING id,name,email,role,warehouse,status`,
        [name, role, warehouse, status, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success:false, error:"User not found." });
      await logAudit(req.user.id,"Users","UPDATE","User",`Updated user ${rows[0].name}`);
      res.json({ success:true, data:rows[0] });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.delete("/users/:id", authenticate, requireRole("admin"), param("id").isUUID(), validate,
  async (req, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({ success:false, error:"Cannot delete your own account." });
      }
      await db.query("UPDATE users SET status='inactive' WHERE id=$1", [req.params.id]);
      await logAudit(req.user.id,"Users","DELETE","User","User deactivated");
      res.json({ success:true, message:"User deactivated." });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/products", authenticate, warehouseFilter, async (req, res) => {
  try {
    let q = "SELECT * FROM product_stock_view WHERE 1=1";
    const params = [];
    if (req.warehouseFilter) {
      params.push(req.warehouseFilter);
      q += ` AND warehouse=$${params.length}`;
    }
    if (req.query.category) {
      params.push(req.query.category);
      q += ` AND category=$${params.length}`;
    }
    if (req.query.status) {
      params.push(req.query.status);
      q += ` AND status=$${params.length}`;
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      q += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }
    q += " ORDER BY name ASC";
    const { rows } = await db.query(q, params);
    res.json({ success:true, data:rows, total:rows.length });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.get("/products/:id", authenticate, param("id").isUUID(), validate, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM product_stock_view WHERE id=$1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success:false, error:"Product not found." });
    // Also fetch batches
    const { rows: batches } = await db.query(
      "SELECT * FROM batches WHERE product_id=$1 ORDER BY expiry_date ASC NULLS LAST",
      [req.params.id]
    );
    res.json({ success:true, data:{ ...rows[0], batches } });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/products",
  authenticate, requirePermission("products:create"),
  body("code").trim().notEmpty(),
  body("name").trim().notEmpty(),
  body("category").trim().notEmpty(),
  body("cost").isFloat({ min:0 }),
  body("price").isFloat({ min:0 }),
  validate,
  async (req, res) => {
    try {
      const { code,name,category,unit,cost,price,reorder_pt,max_stock,warehouse,route,valuation } = req.body;
      await db.transaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO products (id,code,name,category,unit,cost,price,reorder_pt,max_stock,warehouse,route,valuation,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          [uuidv4(),code,name,category,unit||"pcs",cost,price,reorder_pt||5,max_stock||100,
           warehouse||"WH/Main",route||"Buy",valuation||"FIFO",req.user.id]
        );
        const prod = rows[0];
        // Create initial stock level
        await client.query(
          `INSERT INTO stock_levels (product_id,warehouse,on_hand,reserved)
           VALUES ($1,$2,$3,0)`,
          [prod.id, prod.warehouse, req.body.initial_stock || 0]
        );
        // Record movement if initial stock > 0
        if ((req.body.initial_stock || 0) > 0) {
          await client.query(
            `INSERT INTO stock_movements
               (mov_no,product_id,product_name,product_code,type,quantity,before_qty,after_qty,reason,reference,warehouse,created_by)
             VALUES ($1,$2,$3,$4,'IN',$5,0,$5,'Initial stock on product creation','INIT',$6,$7)`,
            [`MOV-${Date.now()}`, prod.id, prod.name, prod.code,
             req.body.initial_stock, prod.warehouse, req.user.id]
          );
        }
        await logAudit(req.user.id,"Inventory","ADD","Product",
          `Added ${name} (${code}) — initial stock: ${req.body.initial_stock||0}`);
        res.status(201).json({ success:true, data:prod });
      });
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ success:false, error:"SKU code already exists." });
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.put("/products/:id",
  authenticate, requirePermission("products:update"),
  param("id").isUUID(), validate,
  async (req, res) => {
    try {
      const { name,category,unit,cost,price,reorder_pt,max_stock,route,valuation } = req.body;
      const { rows } = await db.query(
        `UPDATE products SET
           name=COALESCE($1,name), category=COALESCE($2,category),
           unit=COALESCE($3,unit), cost=COALESCE($4,cost),
           price=COALESCE($5,price), reorder_pt=COALESCE($6,reorder_pt),
           max_stock=COALESCE($7,max_stock), route=COALESCE($8,route),
           valuation=COALESCE($9,valuation)
         WHERE id=$10 RETURNING *`,
        [name,category,unit,cost,price,reorder_pt,max_stock,route,valuation,req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success:false, error:"Product not found." });
      await logAudit(req.user.id,"Inventory","UPDATE","Product",`Updated ${rows[0].name}`);
      res.json({ success:true, data:rows[0] });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.delete("/products/:id",
  authenticate, requirePermission("products:delete"),
  param("id").isUUID(), validate,
  async (req, res) => {
    try {
      const { rows } = await db.query(
        "UPDATE products SET active=FALSE WHERE id=$1 RETURNING name,code", [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success:false, error:"Product not found." });
      await logAudit(req.user.id,"Inventory","DELETE","Product",`Archived ${rows[0].name} (${rows[0].code})`);
      res.json({ success:true, message:"Product archived." });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

// Stock adjustment
router.post("/products/:id/adjust",
  authenticate, requireRole("manager"),
  param("id").isUUID(),
  body("physical_qty").isInt({ min:0 }),
  body("reason").trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { physical_qty, reason, warehouse } = req.body;
      const { rows: pRows } = await db.query(
        "SELECT * FROM products WHERE id=$1", [req.params.id]
      );
      if (pRows.length === 0) return res.status(404).json({ success:false, error:"Product not found." });
      const prod = pRows[0];
      const wh = warehouse || prod.warehouse;

      await db.transaction(async (client) => {
        const { rows: sRows } = await client.query(
          "SELECT on_hand FROM stock_levels WHERE product_id=$1 AND warehouse=$2 FOR UPDATE",
          [prod.id, wh]
        );
        const before = sRows.length > 0 ? sRows[0].on_hand : 0;
        const delta  = physical_qty - before;

        await client.query(
          "UPDATE stock_levels SET on_hand=$1, updated_at=NOW() WHERE product_id=$2 AND warehouse=$3",
          [physical_qty, prod.id, wh]
        );

        const movNo = `MOV-${Date.now()}`;
        await client.query(
          `INSERT INTO stock_movements
             (mov_no,product_id,product_name,product_code,type,quantity,before_qty,after_qty,reason,reference,warehouse,created_by)
           VALUES ($1,$2,$3,$4,'ADJUST',$5,$6,$7,$8,'ADJUST',$9,$10)`,
          [movNo,prod.id,prod.name,prod.code,Math.abs(delta),before,physical_qty,reason,wh,req.user.id]
        );
        await logAudit(req.user.id,"Inventory","ADJUST","Stock",
          `${prod.name}: system ${before} → physical ${physical_qty} (${delta>=0?"+":""}${delta}). Reason: ${reason}`,"warning");
      });

      res.json({ success:true, message:"Stock adjusted successfully." });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/orders", authenticate, async (req, res) => {
  try {
    let q = `SELECT o.*, json_agg(json_build_object(
               'id',oi.id,'product_id',oi.product_id,'product_name',oi.product_name,
               'quantity',oi.quantity,'unit_price',oi.unit_price,'total',oi.total
             )) AS items
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id=o.id
             WHERE 1=1`;
    const params = [];
    if (req.query.type) { params.push(req.query.type); q += ` AND o.type=$${params.length}`; }
    if (req.query.status) { params.push(req.query.status); q += ` AND o.status=$${params.length}`; }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      q += ` AND (o.customer ILIKE $${params.length} OR o.order_no ILIKE $${params.length})`;
    }
    q += " GROUP BY o.id ORDER BY o.created_at DESC";
    const { rows } = await db.query(q, params);
    res.json({ success:true, data:rows, total:rows.length });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/orders",
  authenticate, requirePermission("orders:create"),
  body("type").isIn(["sale","purchase"]),
  body("customer").trim().notEmpty(),
  body("items").isArray({ min:1 }),
  body("items.*.product_id").isUUID(),
  body("items.*.quantity").isInt({ min:1 }),
  body("items.*.unit_price").isFloat({ min:0 }),
  validate,
  async (req, res) => {
    try {
      const { type, customer, items, priority, vendor_id, notes } = req.body;

      await db.transaction(async (client) => {
        const orderNo = await nextSeq(type==="sale"?"SO":"PO","orders","order_no");
        const invoiceNo = `INV-${uuidv4().slice(0,8).toUpperCase()}`;
        const deliveryRef = `DLV-${uuidv4().slice(0,8).toUpperCase()}`;

        const { rows: oRows } = await client.query(
          `INSERT INTO orders (id,order_no,type,customer,status,priority,invoice_no,delivery_ref,vendor_id,notes,created_by)
           VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10) RETURNING *`,
          [uuidv4(),orderNo,type,customer,priority||"normal",invoiceNo,deliveryRef,vendor_id||null,notes||null,req.user.id]
        );
        const order = oRows[0];

        for (const item of items) {
          // Validate product exists
          const { rows: pRows } = await client.query(
            "SELECT id,name,code,warehouse FROM products WHERE id=$1 AND active=TRUE FOR UPDATE",
            [item.product_id]
          );
          if (pRows.length === 0) throw new Error(`Product ${item.product_id} not found.`);
          const prod = pRows[0];

          if (type === "sale") {
            // Check available stock
            const { rows: sRows } = await client.query(
              "SELECT on_hand,reserved FROM stock_levels WHERE product_id=$1 AND warehouse=$2 FOR UPDATE",
              [prod.id, prod.warehouse]
            );
            const avail = sRows.length > 0 ? (sRows[0].on_hand - sRows[0].reserved) : 0;
            if (avail < item.quantity) {
              throw new Error(`Insufficient stock for ${prod.name}. Available: ${avail}`);
            }
            // Reserve stock
            await client.query(
              "UPDATE stock_levels SET reserved=reserved+$1, updated_at=NOW() WHERE product_id=$2 AND warehouse=$3",
              [item.quantity, prod.id, prod.warehouse]
            );
          }

          await client.query(
            `INSERT INTO order_items (id,order_id,product_id,product_name,quantity,unit_price)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [uuidv4(),order.id,prod.id,prod.name,item.quantity,item.unit_price]
          );
        }

        await logAudit(req.user.id,"Orders","CREATE",type==="sale"?"Sale Order":"Purchase Order",
          `${orderNo} for ${customer} — ${items.length} item(s)`);

        res.status(201).json({ success:true, data:order });
      });
    } catch (err) {
      if (err.message.includes("Insufficient")) {
        return res.status(400).json({ success:false, error:err.message });
      }
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

// Update order status (ship/receive/cancel)
router.put("/orders/:id/status",
  authenticate, requirePermission("orders:update"),
  param("id").isUUID(),
  body("status").isIn(["in_progress","done","cancel"]),
  validate,
  async (req, res) => {
    try {
      const { status, carrier, tracking_no } = req.body;

      await db.transaction(async (client) => {
        const { rows: oRows } = await client.query(
          `SELECT o.*, json_agg(json_build_object(
             'product_id',oi.product_id,'product_name',oi.product_name,
             'quantity',oi.quantity
           )) AS items
           FROM orders o JOIN order_items oi ON oi.order_id=o.id
           WHERE o.id=$1 GROUP BY o.id FOR UPDATE`,
          [req.params.id]
        );
        if (oRows.length === 0) throw new Error("Order not found.");
        const order = oRows[0];
        if (order.status === "done" || order.status === "cancel") {
          throw new Error(`Order is already ${order.status}.`);
        }

        for (const item of order.items) {
          const { rows: pRows } = await client.query(
            "SELECT id,name,code,warehouse FROM products WHERE id=$1", [item.product_id]
          );
          if (pRows.length === 0) continue;
          const prod = pRows[0];

          if (order.type === "sale" && status === "done") {
            // Deduct stock + release reservation
            await client.query(
              `UPDATE stock_levels SET on_hand=on_hand-$1, reserved=GREATEST(0,reserved-$1), updated_at=NOW()
               WHERE product_id=$2 AND warehouse=$3`,
              [item.quantity, prod.id, prod.warehouse]
            );
            await adjustStock(client, {
              productId:prod.id, productName:prod.name, productCode:prod.code,
              warehouse:prod.warehouse, delta:-item.quantity, type:"OUT",
              reason:`Sale Order ${order.order_no} — shipped to ${order.customer}`,
              reference:order.order_no, userId:req.user.id
            });
          }

          if (order.type === "sale" && status === "cancel") {
            // Release reservation only
            await client.query(
              `UPDATE stock_levels SET reserved=GREATEST(0,reserved-$1), updated_at=NOW()
               WHERE product_id=$2 AND warehouse=$3`,
              [item.quantity, prod.id, prod.warehouse]
            );
          }

          if (order.type === "purchase" && status === "done") {
            // Add received stock
            await adjustStock(client, {
              productId:prod.id, productName:prod.name, productCode:prod.code,
              warehouse:prod.warehouse, delta:item.quantity, type:"IN",
              reason:`Purchase Order ${order.order_no} received from ${order.customer}`,
              reference:order.order_no, userId:req.user.id
            });
          }
        }

        await client.query(
          `UPDATE orders SET status=$1, payment=CASE WHEN $1='done' AND type='sale' THEN 'paid' ELSE payment END,
           delivery_ref=COALESCE($2,delivery_ref), updated_at=NOW() WHERE id=$3`,
          [status, tracking_no||null, req.params.id]
        );

        const action = status==="done"?(order.type==="sale"?"SHIP":"RECEIVE"):"CANCEL";
        await logAudit(req.user.id,"Orders",action,order.type==="sale"?"Sale Order":"Purchase Order",
          `${order.order_no} marked as ${status}`);

        res.json({ success:true, message:`Order ${status} successfully.` });
      });
    } catch (err) {
      res.status(err.message==="Order not found."?404:400).json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// VENDORS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/vendors", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM vendors WHERE active=TRUE ORDER BY name ASC");
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/vendors",
  authenticate, requirePermission("vendors:create"),
  body("name").trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { name,contact_name,email,phone,category,lead_days } = req.body;
      const { rows } = await db.query(
        `INSERT INTO vendors (id,name,contact_name,email,phone,category,lead_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [uuidv4(),name,contact_name||null,email||null,phone||null,category||null,lead_days||7]
      );
      await logAudit(req.user.id,"Vendors","ADD","Vendor",`Added vendor ${name}`);
      res.status(201).json({ success:true, data:rows[0] });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.put("/vendors/:id",
  authenticate, requirePermission("vendors:update"),
  param("id").isUUID(), validate,
  async (req, res) => {
    try {
      const { name,contact_name,email,phone,category,rating,on_time_pct,lead_days,outstanding } = req.body;
      const { rows } = await db.query(
        `UPDATE vendors SET
           name=COALESCE($1,name), contact_name=COALESCE($2,contact_name),
           email=COALESCE($3,email), phone=COALESCE($4,phone),
           category=COALESCE($5,category), rating=COALESCE($6,rating),
           on_time_pct=COALESCE($7,on_time_pct), lead_days=COALESCE($8,lead_days),
           outstanding=COALESCE($9,outstanding)
         WHERE id=$10 RETURNING *`,
        [name,contact_name,email,phone,category,rating,on_time_pct,lead_days,outstanding,req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ success:false, error:"Vendor not found." });
      await logAudit(req.user.id,"Vendors","UPDATE","Vendor",`Updated vendor ${rows[0].name}`);
      res.json({ success:true, data:rows[0] });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.delete("/vendors/:id",
  authenticate, requirePermission("vendors:delete"),
  param("id").isUUID(), validate,
  async (req, res) => {
    try {
      await db.query("UPDATE vendors SET active=FALSE WHERE id=$1", [req.params.id]);
      await logAudit(req.user.id,"Vendors","DELETE","Vendor","Vendor archived");
      res.json({ success:true, message:"Vendor archived." });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/transfers", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM transfers ORDER BY created_at DESC"
    );
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/transfers",
  authenticate, requirePermission("transfers:create"),
  body("product_id").isUUID(),
  body("from_wh").trim().notEmpty(),
  body("to_wh").trim().notEmpty(),
  body("quantity").isInt({ min:1 }),
  validate,
  async (req, res) => {
    try {
      const { product_id, from_wh, to_wh, quantity, high_value } = req.body;
      if (from_wh === to_wh) {
        return res.status(400).json({ success:false, error:"Source and destination cannot be the same." });
      }

      await db.transaction(async (client) => {
        const { rows: pRows } = await client.query(
          "SELECT id,name,code FROM products WHERE id=$1 AND active=TRUE", [product_id]
        );
        if (pRows.length === 0) throw new Error("Product not found.");
        const prod = pRows[0];

        // Check source stock
        const { rows: sRows } = await client.query(
          "SELECT on_hand,reserved FROM stock_levels WHERE product_id=$1 AND warehouse=$2 FOR UPDATE",
          [prod.id, from_wh]
        );
        if (sRows.length === 0) throw new Error(`No stock found in ${from_wh}.`);
        const avail = sRows[0].on_hand - sRows[0].reserved;
        if (avail < quantity) throw new Error(`Only ${avail} units available in ${from_wh}.`);

        // Deduct from source
        await client.query(
          "UPDATE stock_levels SET on_hand=on_hand-$1, updated_at=NOW() WHERE product_id=$2 AND warehouse=$3",
          [quantity, prod.id, from_wh]
        );

        // Add to destination (create if not exists)
        await client.query(
          `INSERT INTO stock_levels (product_id,warehouse,on_hand,reserved)
           VALUES ($1,$2,$3,0) ON CONFLICT (product_id,warehouse)
           DO UPDATE SET on_hand=stock_levels.on_hand+$3, updated_at=NOW()`,
          [prod.id, to_wh, quantity]
        );

        // NFT hash for high-value items
        const nftHash = high_value
          ? `0x${require("crypto").randomBytes(16).toString("hex")}...${require("crypto").randomBytes(4).toString("hex")}`
          : null;

        const transferNo = await nextSeq("TRF","transfers","transfer_no");
        const { rows: tRows } = await client.query(
          `INSERT INTO transfers (id,transfer_no,product_id,product_name,from_wh,to_wh,quantity,status,high_value,nft_hash,verified,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'done',$8,$9,$10,$11) RETURNING *`,
          [uuidv4(),transferNo,prod.id,prod.name,from_wh,to_wh,quantity,!!high_value,nftHash,!!nftHash,req.user.id]
        );

        // Record movements for both warehouses
        const movNoOut = `MOV-${Date.now()}-OUT`;
        const movNoIn  = `MOV-${Date.now()}-IN`;
        await client.query(
          `INSERT INTO stock_movements (mov_no,product_id,product_name,product_code,type,quantity,before_qty,after_qty,reason,reference,warehouse,created_by)
           VALUES ($1,$2,$3,$4,'TRANSFER',$5,$6,$7,$8,$9,$10,$11),
                  ($12,$2,$3,$4,'TRANSFER',$5,$6,$7,$8,$9,$13,$11)`,
          [movNoOut,prod.id,prod.name,prod.code,quantity,sRows[0].on_hand,sRows[0].on_hand-quantity,
           `Transfer ${from_wh}→${to_wh}`,transferNo,from_wh,req.user.id,
           movNoIn,to_wh]
        );

        await logAudit(req.user.id,"Transfers","TRANSFER","Stock Move",
          `${prod.name} × ${quantity}: ${from_wh} → ${to_wh}${nftHash?" (NFT minted)":""}`);

        res.status(201).json({ success:true, data:tRows[0] });
      });
    } catch (err) {
      res.status(err.message.includes("not found")||err.message.includes("available")?400:500)
        .json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// MANUFACTURING ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/manufacturing/work-orders", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM work_orders ORDER BY created_at DESC"
    );
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/manufacturing/work-orders",
  authenticate, requirePermission("manufacturing:create"),
  body("product_id").isUUID(),
  body("bom_id").isUUID(),
  body("quantity").isInt({ min:1 }),
  validate,
  async (req, res) => {
    try {
      const { product_id, bom_id, quantity, worker, start_date, end_date } = req.body;

      await db.transaction(async (client) => {
        // Fetch product
        const { rows: pRows } = await client.query(
          "SELECT * FROM products WHERE id=$1", [product_id]
        );
        if (pRows.length === 0) throw new Error("Product not found.");
        const prod = pRows[0];

        // Fetch BOM and materials
        const { rows: bRows } = await client.query(
          "SELECT * FROM bom WHERE id=$1", [bom_id]
        );
        if (bRows.length === 0) throw new Error("BOM not found.");

        const { rows: materials } = await client.query(
          "SELECT * FROM bom_materials WHERE bom_id=$1", [bom_id]
        );

        // Check & deduct raw materials
        for (const mat of materials) {
          const required = mat.quantity * quantity;
          if (mat.on_hand < required) {
            throw new Error(`Insufficient material: ${mat.name}. Need ${required}, have ${mat.on_hand}.`);
          }
          await client.query(
            "UPDATE bom_materials SET on_hand=on_hand-$1 WHERE id=$2",
            [required, mat.id]
          );
        }

        const woNo = await nextSeq("WO","work_orders","wo_no");
        const { rows: wRows } = await client.query(
          `INSERT INTO work_orders (id,wo_no,product_id,product_name,bom_id,quantity,status,worker,start_date,end_date,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,'planned',$7,$8,$9,$10) RETURNING *`,
          [uuidv4(),woNo,prod.id,prod.name,bom_id,quantity,worker||null,start_date||null,end_date||null,req.user.id]
        );

        await logAudit(req.user.id,"Manufacturing","CREATE","Work Order",
          `${woNo}: ${prod.name} × ${quantity}`);
        res.status(201).json({ success:true, data:wRows[0] });
      });
    } catch (err) {
      res.status(err.message.includes("found")||err.message.includes("Insufficient")?400:500)
        .json({ success:false, error:err.message });
    }
  }
);

router.put("/manufacturing/work-orders/:id/progress",
  authenticate, requirePermission("manufacturing:update"),
  param("id").isUUID(),
  body("progress").isInt({ min:0, max:100 }),
  validate,
  async (req, res) => {
    try {
      const { progress, efficiency, waste_pct } = req.body;
      const isDone = progress >= 100;

      await db.transaction(async (client) => {
        const { rows: wRows } = await client.query(
          "SELECT * FROM work_orders WHERE id=$1 FOR UPDATE", [req.params.id]
        );
        if (wRows.length === 0) throw new Error("Work order not found.");
        const wo = wRows[0];

        await client.query(
          `UPDATE work_orders SET progress=$1, status=$2,
           efficiency=COALESCE($3,efficiency), waste_pct=COALESCE($4,waste_pct),
           updated_at=NOW() WHERE id=$5`,
          [progress, isDone?"done":"in_progress", efficiency||null, waste_pct||null, wo.id]
        );

        // On completion, add finished goods to inventory
        if (isDone && wo.status !== "done") {
          await adjustStock(client, {
            productId:wo.product_id, productName:wo.product_name, productCode:wo.wo_no,
            warehouse:"WH/Main", delta:wo.quantity, type:"IN",
            reason:`WO ${wo.wo_no} completed — finished goods added`,
            reference:wo.wo_no, userId:req.user.id
          });
          await logAudit(req.user.id,"Manufacturing","COMPLETE","Work Order",
            `${wo.wo_no} completed — ${wo.product_name} × ${wo.quantity} added to stock`,
            "success");
        }
      });

      res.json({ success:true, message:"Progress updated." });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.get("/manufacturing/bom", authenticate, async (req, res) => {
  try {
    const { rows: boms } = await db.query("SELECT * FROM bom WHERE status='active' ORDER BY created_at DESC");
    for (const bom of boms) {
      const { rows: mats } = await db.query(
        "SELECT * FROM bom_materials WHERE bom_id=$1", [bom.id]
      );
      bom.materials = mats;
    }
    res.json({ success:true, data:boms });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// QC ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/qc", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM qc_checks ORDER BY created_at DESC");
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/qc/:id/inspect",
  authenticate, requirePermission("qc:inspect"),
  param("id").isUUID(),
  body("passed").isInt({ min:0 }),
  body("failed").isInt({ min:0 }),
  body("inspector").trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { passed, failed, notes, inspector } = req.body;

      await db.transaction(async (client) => {
        const { rows: qRows } = await client.query(
          "SELECT * FROM qc_checks WHERE id=$1 FOR UPDATE", [req.params.id]
        );
        if (qRows.length === 0) throw new Error("QC check not found.");
        const qc = qRows[0];
        if (qc.status !== "pending") throw new Error("QC check already inspected.");
        if (passed + failed !== qc.total_qty) throw new Error(`Passed + Failed must equal total qty (${qc.total_qty}).`);

        const status = failed > 0 ? "failed" : "done";
        await client.query(
          `UPDATE qc_checks SET passed=$1,failed=$2,notes=$3,inspector=$4,status=$5,updated_at=NOW()
           WHERE id=$6`,
          [passed, failed, notes||null, inspector, status, qc.id]
        );

        // Quarantine failed units
        if (failed > 0) {
          await adjustStock(client, {
            productId:qc.product_id, productName:qc.product_name, productCode:qc.qc_no,
            warehouse:"WH/Main", delta:-failed, type:"QUARANTINE",
            reason:`QC ${qc.qc_no}: ${failed} unit(s) failed inspection — quarantined`,
            reference:qc.qc_no, userId:req.user.id
          });
        }

        await logAudit(req.user.id,"QC","INSPECT","QC Check",
          `${qc.qc_no}: ${passed} passed, ${failed} failed${failed>0?` — ${failed} quarantined`:""}`,
          failed>0?"warning":"success");
      });

      res.json({ success:true, message:"Inspection submitted." });
    } catch (err) {
      res.status(err.message.includes("not found")||err.message.includes("already")||err.message.includes("equal")?400:500)
        .json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SCRAP ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/scrap", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM scrap ORDER BY created_at DESC");
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/scrap",
  authenticate, requirePermission("scrap:create"),
  body("product_id").isUUID(),
  body("quantity").isInt({ min:1 }),
  body("reason").trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { product_id, quantity, reason, unit_cost, disposed_by } = req.body;
      const { rows: pRows } = await db.query(
        "SELECT id,name,code FROM products WHERE id=$1", [product_id]
      );
      if (pRows.length === 0) return res.status(404).json({ success:false, error:"Product not found." });
      const prod = pRows[0];
      const scrapNo = await nextSeq("SCR","scrap","scrap_no");
      const { rows } = await db.query(
        `INSERT INTO scrap (id,scrap_no,product_id,product_name,quantity,unit_cost,reason,disposed_by,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [uuidv4(),scrapNo,prod.id,prod.name,quantity,unit_cost||0,reason,disposed_by||null,req.user.id]
      );
      await logAudit(req.user.id,"Scrap","CREATE","Scrap Record",`${scrapNo}: ${prod.name} × ${quantity} — ${reason}`);
      res.status(201).json({ success:true, data:rows[0] });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.put("/scrap/:id/writeoff",
  authenticate, requirePermission("scrap:writeoff"),
  param("id").isUUID(), validate,
  async (req, res) => {
    try {
      await db.transaction(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM scrap WHERE id=$1 FOR UPDATE", [req.params.id]
        );
        if (rows.length === 0) throw new Error("Scrap record not found.");
        if (rows[0].status === "written_off") throw new Error("Already written off.");
        const scrap = rows[0];

        await adjustStock(client, {
          productId:scrap.product_id, productName:scrap.product_name, productCode:scrap.scrap_no,
          warehouse:"WH/Main", delta:-scrap.quantity, type:"SCRAP",
          reason:`Scrap ${scrap.scrap_no} written off — ${scrap.reason}`,
          reference:scrap.scrap_no, userId:req.user.id
        });

        await client.query(
          "UPDATE scrap SET status='written_off', updated_at=NOW() WHERE id=$1", [scrap.id]
        );

        await logAudit(req.user.id,"Scrap","WRITEOFF","Scrap Record",
          `${scrap.scrap_no}: ${scrap.product_name} × ${scrap.quantity} written off. Value lost: ₹${(scrap.unit_cost*scrap.quantity).toLocaleString("en-IN")}`,
          "danger");
      });
      res.json({ success:true, message:"Written off successfully." });
    } catch (err) {
      res.status(400).json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// RETURNS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/returns", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM returns ORDER BY created_at DESC");
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.post("/returns",
  authenticate, requirePermission("returns:create"),
  body("type").isIn(["customer","vendor"]),
  body("product_id").isUUID(),
  body("quantity").isInt({ min:1 }),
  body("reason").trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { type, order_ref, party, product_id, quantity, reason, refund } = req.body;
      const { rows: pRows } = await db.query(
        "SELECT name FROM products WHERE id=$1", [product_id]
      );
      if (pRows.length === 0) return res.status(404).json({ success:false, error:"Product not found." });
      const returnNo = await nextSeq("RET","returns","return_no");
      const { rows } = await db.query(
        `INSERT INTO returns (id,return_no,type,order_ref,party,product_id,product_name,quantity,reason,refund,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [uuidv4(),returnNo,type,order_ref||null,party,product_id,pRows[0].name,quantity,reason,refund||0,req.user.id]
      );
      await logAudit(req.user.id,"Returns","CREATE","Return",`${returnNo}: ${type} return — ${pRows[0].name} × ${quantity}`);
      res.status(201).json({ success:true, data:rows[0] });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

router.put("/returns/:id/approve",
  authenticate, requirePermission("returns:approve"),
  param("id").isUUID(), validate,
  async (req, res) => {
    try {
      await db.transaction(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM returns WHERE id=$1 FOR UPDATE", [req.params.id]
        );
        if (rows.length === 0) throw new Error("Return not found.");
        if (rows[0].status !== "pending") throw new Error("Return already processed.");
        const ret = rows[0];

        // Restore stock
        await adjustStock(client, {
          productId:ret.product_id, productName:ret.product_name, productCode:ret.return_no,
          warehouse:"WH/Main", delta:ret.quantity, type:"RETURN",
          reason:`Return ${ret.return_no} approved — ${ret.reason}`,
          reference:ret.return_no, userId:req.user.id
        });

        await client.query(
          "UPDATE returns SET status='approved', updated_at=NOW() WHERE id=$1", [ret.id]
        );
        await logAudit(req.user.id,"Returns","APPROVE","Return",
          `${ret.return_no} approved — ${ret.product_name} × ${ret.quantity} restored to stock`);
      });
      res.json({ success:true, message:"Return approved. Stock restored." });
    } catch (err) {
      res.status(400).json({ success:false, error:err.message });
    }
  }
);

router.put("/returns/:id/reject",
  authenticate, requirePermission("returns:approve"),
  param("id").isUUID(), validate,
  async (req, res) => {
    try {
      const { rows } = await db.query(
        "UPDATE returns SET status='rejected', updated_at=NOW() WHERE id=$1 AND status='pending' RETURNING *",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(400).json({ success:false, error:"Return not found or already processed." });
      await logAudit(req.user.id,"Returns","REJECT","Return",`${rows[0].return_no} rejected`,"warning");
      res.json({ success:true, message:"Return rejected." });
    } catch (err) {
      res.status(500).json({ success:false, error:err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// STOCK MOVEMENTS & AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════

router.get("/movements", authenticate, requireRole("manager"), async (req, res) => {
  try {
    let q = "SELECT sm.*, u.name AS user_name FROM stock_movements sm LEFT JOIN users u ON u.id=sm.created_by WHERE 1=1";
    const params = [];
    if (req.query.product_id) { params.push(req.query.product_id); q += ` AND sm.product_id=$${params.length}`; }
    if (req.query.type) { params.push(req.query.type); q += ` AND sm.type=$${params.length}`; }
    if (req.query.warehouse) { params.push(req.query.warehouse); q += ` AND sm.warehouse=$${params.length}`; }
    q += " ORDER BY sm.created_at DESC LIMIT 500";
    const { rows } = await db.query(q, params);
    res.json({ success:true, data:rows, total:rows.length });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

router.get("/audit", authenticate, requireRole("manager"), async (req, res) => {
  try {
    let q = `SELECT al.*, u.name AS user_name FROM audit_log al
             LEFT JOIN users u ON u.id=al.user_id WHERE 1=1`;
    const params = [];
    if (req.query.module) { params.push(req.query.module); q += ` AND al.module=$${params.length}`; }
    if (req.query.action) { params.push(req.query.action); q += ` AND al.action=$${params.length}`; }
    if (req.query.user_id) { params.push(req.query.user_id); q += ` AND al.user_id=$${params.length}`; }
    q += " ORDER BY al.created_at DESC LIMIT 500";
    const { rows } = await db.query(q, params);
    res.json({ success:true, data:rows, total:rows.length });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const [products, orders, movements, alerts] = await Promise.all([
      db.query(`SELECT
        COUNT(*) AS total_skus,
        SUM(on_hand * cost) AS total_cost_value,
        SUM(on_hand * price) AS total_retail_value,
        COUNT(*) FILTER (WHERE status='critical') AS critical_count,
        COUNT(*) FILTER (WHERE status='low') AS low_count,
        COUNT(*) FILTER (WHERE status='ok') AS ok_count
      FROM product_stock_view`),

      db.query(`SELECT
        COUNT(*) FILTER (WHERE type='sale'     AND status='pending') AS pending_sales,
        COUNT(*) FILTER (WHERE type='purchase' AND status='pending') AS pending_purchases,
        COUNT(*) FILTER (WHERE status='done')  AS completed,
        SUM(CASE WHEN type='sale' THEN (SELECT SUM(total) FROM order_items WHERE order_id=o.id) ELSE 0 END) AS sales_revenue
      FROM orders o`),

      db.query(`SELECT type, SUM(quantity) AS total
        FROM stock_movements WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY type`),

      db.query(`SELECT code, name, status, on_hand, reorder_pt
        FROM product_stock_view WHERE status != 'ok' ORDER BY on_hand ASC LIMIT 10`),
    ]);

    res.json({
      success: true,
      data: {
        products:  products.rows[0],
        orders:    orders.rows[0],
        movements: movements.rows,
        alerts:    alerts.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════════════════════

router.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ success:true, status:"healthy", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ success:false, status:"unhealthy", error:err.message });
  }
});

module.exports = router;

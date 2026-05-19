const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { body, param, validationResult } = require("express-validator");
const { db } = require("../db");
const { authenticate, requireRole, logAudit } = require("../middleware/auth");

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success:false, errors:errors.array() });
  next();
};

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT VARIANTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/variants — all variants grouped by parent product
router.get("/variants", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         pv.*,
         p.name AS product_name,
         p.code AS parent_code,
         CASE
           WHEN pv.stock = 0       THEN 'critical'
           WHEN pv.stock <= 3      THEN 'low'
           ELSE 'ok'
         END AS status
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.active = TRUE
       ORDER BY p.name, pv.attributes`
    );

    // Group by product
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.product_id]) {
        grouped[row.product_id] = {
          id:       row.product_id,
          name:     row.product_name,
          sku:      row.parent_code,
          variants: [],
        };
      }
      grouped[row.product_id].variants.push({
        id:         row.id,
        sku:        row.sku,
        attributes: row.attributes,
        price:      Number(row.price),
        stock:      row.stock,
        status:     row.status,
      });
    }

    res.json({ success:true, data:Object.values(grouped) });
  } catch (err) {
    console.error("GET variants error:", err.message);
    res.status(500).json({ success:false, error: `DB Error: ${err.message}` });
  }
});

// POST /api/variants — add variant to a product
router.post("/variants",
  authenticate,
  requireRole("staff"), // 🚨 Lowered to staff for demo
  body("product_id").isUUID().withMessage("Valid product ID required"),
  body("sku").notEmpty().withMessage("SKU is required"),
  body("attributes").notEmpty().withMessage("Attributes required (e.g. Black / Large)"),
  body("price").isFloat({ min:0 }).withMessage("Price must be >= 0"),
  validate,
  async (req, res) => {
    try {
      const { product_id, sku, attributes, price, stock } = req.body;

      // Verify product exists
      const { rows: prod } = await db.query(
        "SELECT id, name, code FROM products WHERE id=$1 AND active=TRUE", [product_id]
      );
      if (!prod.length) return res.status(404).json({ success:false, error:"Product not found." });

      const { rows } = await db.query(
        `INSERT INTO product_variants (id, product_id, sku, attributes, price, stock, active)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE)
         RETURNING *`,
        [uuidv4(), product_id, sku, attributes, price, stock||0]
      );

      await logAudit(req.user.id, "Variants", "CREATE", "Variant",
        `Added variant ${sku} (${attributes}) to ${prod[0].name} — Stock: ${stock||0}, Price: ₹${price}`, "success");

      res.status(201).json({ success:true, data:rows[0] });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ success:false, error:"Variant SKU already exists." });
      }
      console.error("POST variant error:", err.message);
      res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
    }
  }
);

// PUT /api/variants/:id/stock — adjust variant stock
router.put("/variants/:id/stock",
  authenticate,
  requireRole("staff"), // 🚨 Restricted to staff for demo
  body("delta").isInt().withMessage("Delta must be an integer (positive or negative)"),
  validate,
  async (req, res) => {
    try {
      const { delta } = req.body;
      const { rows } = await db.query(
        `UPDATE product_variants
         SET stock = GREATEST(0, stock + $1), updated_at=NOW()
         WHERE id=$2 AND active=TRUE
         RETURNING *`,
        [delta, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ success:false, error:"Variant not found." });

      const v = rows[0];
      await logAudit(req.user.id, "Variants", "ADJUST", "Variant",
        `Stock adjusted ${delta>0?"+":""}${delta} for ${v.sku} — new stock: ${v.stock}`, "info");

      res.json({ success:true, data:rows[0] });
    } catch (err) {
      res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
    }
  }
);

// DELETE /api/variants/:id
router.delete("/variants/:id", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE product_variants SET active=FALSE, updated_at=NOW() WHERE id=$1 RETURNING sku",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, error:"Variant not found." });
    await logAudit(req.user.id, "Variants", "DELETE", "Variant",
      `Archived variant ${rows[0].sku}`, "warning");
    res.json({ success:true, message:"Variant archived." });
  } catch (err) {
    res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRICE LISTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/price-lists
router.get("/price-lists", authenticate, async (req, res) => {
  try {
    const { rows: lists } = await db.query(
      "SELECT * FROM price_lists ORDER BY active DESC, name ASC"
    );
    const { rows: customers } = await db.query(
      "SELECT * FROM price_list_customers ORDER BY customer_name"
    );

    // Attach customers to each list
    const data = lists.map(l => ({
      ...l,
      discount:   Number(l.discount),
      customers:  customers.filter(c => c.price_list_id === l.id).map(c => c.customer_name),
    }));

    res.json({ success:true, data });
  } catch (err) {
    console.error("GET price-lists error:", err.message);
    res.status(500).json({ success:false, error: `DB Error: ${err.message}` });
  }
});

// POST /api/price-lists
router.post("/price-lists",
  authenticate,
  requireRole("staff"), // 🚨 Lowered to staff for demo
  body("name").notEmpty().withMessage("List name required"),
  body("type").isIn(["standard","discount","volume"]).withMessage("Invalid type"),
  body("discount").isFloat({ min:0, max:100 }).withMessage("Discount must be 0-100%"),
  validate,
  async (req, res) => {
    try {
      const { name, type, discount, customers, active } = req.body;

      const { rows: cnt } = await db.query("SELECT COUNT(*) FROM price_lists");
      const listNo = `PL-${String(parseInt(cnt[0].count)+1).padStart(3,"0")}`;

      await db.transaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO price_lists (id, list_no, name, type, discount, active)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [uuidv4(), listNo, name, type, discount, active !== false]
        );
        const listId = rows[0].id;

        // Insert customers
        const customerList = Array.isArray(customers)
          ? customers
          : (customers ? [customers] : ["All"]);

        for (const cust of customerList) {
          await client.query(
            "INSERT INTO price_list_customers (price_list_id, customer_name) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            [listId, cust.trim()]
          );
        }

        await logAudit(req.user.id, "PriceLists", "CREATE", "PriceList",
          `Created ${listNo}: ${name} — ${discount}% ${type}`, "success");

        res.status(201).json({ success:true, data:{ ...rows[0], customers:customerList } });
      });
    } catch (err) {
      console.error("POST price-list error:", err.message);
      res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
    }
  }
);

// PUT /api/price-lists/:id — update list (toggle active, change discount)
router.put("/price-lists/:id",
  authenticate,
  requireRole("staff"), // 🚨 Lowered to staff for demo
  async (req, res) => {
    try {
      const { name, type, discount, active, customers } = req.body;
      const { id } = req.params;

      await db.transaction(async (client) => {
        const { rows } = await client.query(
          `UPDATE price_lists
           SET name=COALESCE($1,name), type=COALESCE($2,type),
               discount=COALESCE($3,discount), active=COALESCE($4,active),
               updated_at=NOW()
           WHERE id=$5 RETURNING *`,
          [name, type, discount, active, id]
        );
        if (!rows.length) throw new Error("Price list not found.");

        // Update customers if provided
        if (Array.isArray(customers)) {
          await client.query("DELETE FROM price_list_customers WHERE price_list_id=$1", [id]);
          for (const cust of customers) {
            await client.query(
              "INSERT INTO price_list_customers (price_list_id, customer_name) VALUES ($1,$2) ON CONFLICT DO NOTHING",
              [id, cust.trim()]
            );
          }
        }

        await logAudit(req.user.id, "PriceLists", "UPDATE", "PriceList",
          `Updated ${rows[0].list_no}: ${rows[0].name}`, "success");

        const { rows: custs } = await client.query(
          "SELECT customer_name FROM price_list_customers WHERE price_list_id=$1", [id]
        );
        res.json({ success:true, data:{ ...rows[0], customers:custs.map(c=>c.customer_name) } });
      });
    } catch (err) {
      console.error("PUT price-list error:", err.message);
      res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
    }
  }
);

// DELETE /api/price-lists/:id
router.delete("/price-lists/:id", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const { rows } = await db.query(
      "DELETE FROM price_lists WHERE id=$1 RETURNING list_no, name", [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, error:"Price list not found." });
    await logAudit(req.user.id, "PriceLists", "DELETE", "PriceList",
      `Deleted ${rows[0].list_no}: ${rows[0].name}`, "warning");
    res.json({ success:true, message:"Price list deleted." });
  } catch (err) {
    res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DROPSHIPPING
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/dropships
router.get("/dropships", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT d.*, v.name AS vendor_name_ref
       FROM dropships d
       LEFT JOIN vendors v ON v.id = d.vendor_id
       WHERE d.status != 'cancelled'
       ORDER BY d.created_at DESC`
    );
    res.json({ success:true, data:rows });
  } catch (err) {
    console.error("GET dropships error:", err.message);
    res.status(500).json({ success:false, error: `DB Error: ${err.message}` });
  }
});

// POST /api/dropships
router.post("/dropships",
  authenticate,
  requireRole("staff"),
  body("sales_order").notEmpty().withMessage("Sales order ref required"),
  body("customer").notEmpty().withMessage("Customer required"),
  body("product_name").notEmpty().withMessage("Product name required"),
  body("quantity").isInt({ min:1 }).withMessage("Quantity must be >= 1"),
  body("vendor_name").notEmpty().withMessage("Vendor required"),
  validate,
  async (req, res) => {
    try {
      const {
        sales_order, customer, product_name, quantity,
        vendor_id, vendor_name, customer_addr, notes,
      } = req.body;

      const { rows: cnt } = await db.query("SELECT COUNT(*) FROM dropships");
      const dsNo   = `DS-${String(parseInt(cnt[0].count)+1).padStart(3,"0")}`;
      const vpoNo  = `VPO-${String(parseInt(cnt[0].count)+1).padStart(3,"0")}`;

      const { rows } = await db.query(
        `INSERT INTO dropships
           (id, ds_no, sales_order, customer, product_name, quantity,
            vendor_id, vendor_name, vendor_po, status, customer_addr, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'sent_to_vendor',$10,$11,$12)
         RETURNING *`,
        [uuidv4(), dsNo, sales_order, customer, product_name, quantity,
         vendor_id||null, vendor_name, vpoNo, customer_addr||"", notes||"", req.user.id]
      );

      await logAudit(req.user.id, "Dropshipping", "CREATE", "Dropship",
        `Created ${dsNo}: ${product_name} ×${quantity} for ${customer} via ${vendor_name}`, "success");

      res.status(201).json({ success:true, data:rows[0] });
    } catch (err) {
      console.error("POST dropship error:", err.message);
      res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
    }
  }
);

// PUT /api/dropships/:id/advance — move to next stage
router.put("/dropships/:id/advance", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const stages = ["sent_to_vendor","vendor_confirmed","shipped_to_customer","delivered"];
    const { rows: curr } = await db.query(
      "SELECT * FROM dropships WHERE id=$1", [req.params.id]
    );
    if (!curr.length) return res.status(404).json({ success:false, error:"Dropship not found." });

    const d     = curr[0];
    const idx   = stages.indexOf(d.status);
    if (idx === -1 || idx === stages.length-1) {
      return res.status(400).json({ success:false, error:"Already at final stage or invalid status." });
    }

    const nextStatus = stages[idx+1];
    const { rows } = await db.query(
      "UPDATE dropships SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [nextStatus, req.params.id]
    );

    await logAudit(req.user.id, "Dropshipping", "ADVANCE", "Dropship",
      `${d.ds_no} advanced: ${d.status} → ${nextStatus}`, "success");

    res.json({ success:true, data:rows[0] });
  } catch (err) {
    console.error("PUT dropship advance error:", err.message);
    res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
  }
});

// PUT /api/dropships/:id/cancel
router.put("/dropships/:id/cancel", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE dropships SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING ds_no",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, error:"Dropship not found." });
    await logAudit(req.user.id, "Dropshipping", "CANCEL", "Dropship",
      `${rows[0].ds_no} cancelled`, "warning");
    res.json({ success:true, message:"Dropship cancelled." });
  } catch (err) {
    res.status(400).json({ success:false, error: `DB Error: ${err.message}` });
  }
});

module.exports = router;
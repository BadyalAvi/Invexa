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

// ─── STOCK HELPER (Imported locally for Backorders & Fulfillments) ────────────
async function adjustStock(client, {
  productId, productName, productCode,
  warehouse, delta, type, reason, reference, userId
}) {
  const { rows } = await client.query(
    `SELECT on_hand, reserved FROM stock_levels
     WHERE product_id=$1 AND warehouse=$2 FOR UPDATE`,
    [productId, warehouse]
  );

  let before = 0;
  if (rows.length === 0) {
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

  const ts = Date.now().toString().slice(-8);
  const movNo = `MV-O-${ts}`;
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
// PUTAWAY RULES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/putaway", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM putaway_rules ORDER BY priority ASC, created_at ASC`
    );
    res.json({ success:true, data:rows });
  } catch (err) {
    console.error("GET putaway error:", err.message);
    res.status(500).json({ success:false, error:"Failed to fetch putaway rules." });
  }
});

router.post("/putaway",
  authenticate, requireRole("staff"),
  body("name").trim().notEmpty(),
  body("category_match").trim().notEmpty(),
  body("destination").trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { name, category_match, destination, priority, active } = req.body;
      const { rows } = await db.query(
        `INSERT INTO putaway_rules (id, name, category_match, destination, priority, active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [uuidv4(), name, category_match, destination, priority||10, active!==false, req.user.id]
      );
      await logAudit(req.user.id, "Warehouse", "CREATE", "Putaway Rule", `Rule added: ${name}`, "success");
      res.status(201).json({ success:true, data:rows[0] });
    } catch (err) {
      console.error("POST putaway error:", err.message);
      res.status(400).json({ success:false, error:`DB Error: ${err.message}` });
    }
  }
);

router.put("/putaway/:id/toggle", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE putaway_rules SET active = NOT active, updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, error:"Rule not found" });
    res.json({ success:true, data:rows[0] });
  } catch (err) {
    res.status(400).json({ success:false, error: err.message });
  }
});

router.delete("/putaway/:id", authenticate, requireRole("admin"), async (req, res) => {
  try {
    await db.query("DELETE FROM putaway_rules WHERE id=$1", [req.params.id]);
    res.json({ success:true, message:"Rule deleted." });
  } catch (err) {
    res.status(400).json({ success:false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FULFILLMENTS (Pick → Pack → Ship)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/fulfillments", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM fulfillments ORDER BY created_at DESC");
    res.json({ success:true, data:rows });
  } catch (err) {
    console.error("GET fulfillments error:", err.message);
    res.status(500).json({ success:false, error:"Failed to fetch fulfillments." });
  }
});

router.post("/fulfillments", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const { order_id, order_no, customer } = req.body;
    
    const { rows: items } = await db.query("SELECT * FROM order_items WHERE order_id=$1", [order_id]);
    if (!items.length) return res.status(400).json({ success:false, error:"No items in order." });

    const totalQty = items.reduce((a, b) => a + b.quantity, 0);
    const fNo = `FUL-${Date.now().toString().slice(-6)}`;

    const { rows: fRows } = await db.query(
      `INSERT INTO fulfillments (id, f_no, order_id, order_no, customer, total_qty, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
      [uuidv4(), fNo, order_id, order_no, customer, totalQty, req.user.id]
    );

    await logAudit(req.user.id, "Fulfillment", "CREATE", "Pick Plan", `Plan ${fNo} created for ${order_no}`, "success");
    res.status(201).json({ success:true, data:fRows[0] });
  } catch (err) {
    res.status(400).json({ success:false, error:`DB Error: ${err.message}` });
  }
});

router.put("/fulfillments/:id/step", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const { step, carrier, tracking_no } = req.body;
    
    let queryStr;
    let params;

    // Target the specific column based on which button was clicked
    if (step === "pick_status") {
      queryStr = `UPDATE fulfillments SET pick_status='done', updated_at=NOW() WHERE id=$1 RETURNING *`;
      params = [req.params.id];
    } else if (step === "pack_status") {
      queryStr = `UPDATE fulfillments SET pack_status='done', updated_at=NOW() WHERE id=$1 RETURNING *`;
      params = [req.params.id];
    } else if (step === "ship_status") {
      queryStr = `UPDATE fulfillments SET ship_status='done', carrier=$2, tracking_no=$3, updated_at=NOW() WHERE id=$1 RETURNING *`;
      params = [req.params.id, carrier, tracking_no];
    } else {
      return res.status(400).json({ success:false, error:"Invalid step." });
    }

    const { rows } = await db.query(queryStr, params);
    
    // If it's the final shipping step, deduct the actual stock!
    if (step === "ship_status") {
      const f = rows[0];
      const { rows: items } = await db.query("SELECT * FROM order_items WHERE order_id=$1", [f.order_id]);
      
      await db.transaction(async (client) => {
         for (const item of items) {
            const { rows: pRows } = await client.query("SELECT code, warehouse FROM products WHERE id=$1", [item.product_id]);
            if (!pRows.length) continue;
            
            await adjustStock(client, {
               productId: item.product_id,
               productName: item.product_name,
               productCode: pRows[0].code,
               warehouse: pRows[0].warehouse || "WH/Main",
               delta: -item.quantity,
               type: "OUT",
               reason: `Fulfillment ${f.fulfil_no} shipped to ${f.customer}`,
               reference: f.fulfil_no,
               userId: req.user.id
            });
         }
      });
    }

    await logAudit(req.user.id, "Fulfillment", "ADVANCE", "Shipment", `Moved to ${step}`, "success");
    res.json({ success:true, data:rows[0] });
  } catch (err) {
    res.status(400).json({ success:false, error:`DB Error: ${err.message}` });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BACKORDERS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/backorders", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM backorders ORDER BY created_at DESC");
    res.json({ success:true, data:rows });
  } catch (err) {
    res.status(500).json({ success:false, error:"Failed to fetch backorders." });
  }
});

router.post("/backorders", authenticate, requireRole("staff"), async (req, res) => {
  try {
    const { order_no, customer, product_id, product_name, required_qty, available_qty } = req.body;
    const missing = required_qty - available_qty;
    
    if (missing <= 0) return res.status(400).json({ success:false, error:"Stock is sufficient, backorder not needed." });

    let actualProductId = product_id;
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product_id);
    
    if (!isValidUUID) {
      const { rows: pRows } = await db.query("SELECT id FROM products WHERE name=$1 LIMIT 1", [product_name]);
      if (pRows.length > 0) {
        actualProductId = pRows[0].id;
      } else {
        return res.status(400).json({ success:false, error:"Product not found in live database. Please add it via Inventory first." });
      }
    }

    const boNo = `BO-${Date.now().toString().slice(-6)}`;
    
    const { rows } = await db.query(
      `INSERT INTO backorders (id, bo_no, original_order, customer, product_id, product_name, ordered_qty, delivered_qty, remaining_qty, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10) RETURNING *`,
      [uuidv4(), boNo, order_no, customer, actualProductId, product_name, required_qty, available_qty, missing, req.user.id]
    );

    await logAudit(req.user.id, "Backorders", "CREATE", "Backorder", `${boNo} created for ${missing}x ${product_name}`, "warning");
    res.status(201).json({ success:true, data:rows[0] });
  } catch (err) {
    res.status(400).json({ success:false, error: `Database Error: ${err.message}` });
  }
});

router.put("/backorders/:id/fulfill", authenticate, requireRole("staff"), async (req, res) => {
  const { id } = req.params;
  try {
    await db.transaction(async (client) => {
      const { rows: bRows } = await client.query("SELECT * FROM backorders WHERE id=$1 FOR UPDATE", [id]);
      if (!bRows.length) throw new Error("Backorder not found.");
      const bo = bRows[0];

      if (bo.status === "closed") throw new Error("Already fulfilled.");

      await adjustStock(client, {
        productId: bo.product_id, 
        productName: bo.product_name, 
        productCode: bo.bo_no, 
        warehouse: "WH/Main", 
        delta: -bo.remaining_qty, 
        type: "OUT",
        reason: `Backorder ${bo.bo_no} fulfilled`,
        reference: bo.bo_no, 
        userId: req.user.id
      });

      await client.query(
        `UPDATE backorders
         SET status='closed', delivered_qty=ordered_qty, remaining_qty=0,
             fulfilled_at=NOW(), updated_at=NOW()
         WHERE id=$1`,
        [id]
      );
      
      await logAudit(req.user.id, "Backorders", "FULFILL", "Backorder",
        `${bo.bo_no} fulfilled — ${bo.product_name} ×${bo.remaining_qty} shipped to ${bo.customer}`, "success");
    });

    const { rows } = await db.query("SELECT * FROM backorders WHERE id=$1", [id]);
    res.json({ success:true, data:rows[0] });
  } catch (err) {
    res.status(400).json({ success:false, error: err.message });
  }
});

module.exports = router;
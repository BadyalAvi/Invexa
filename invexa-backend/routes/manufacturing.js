const express = require("express");
const router = express.Router();
const { db } = require("../db");

// ─── GET ALL BOMs ─────────────────────────────────────────────────────────────
router.get("/bom", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM bom ORDER BY created_at DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET ALL WORK ORDERS ──────────────────────────────────────────────────────
router.get("/work-orders", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM work_orders ORDER BY created_at DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── CREATE WORK ORDER ────────────────────────────────────────────────────────
router.post("/work-orders", async (req, res) => {
  const { product_id, product_name, quantity, worker, start_date, end_date } = req.body;

  try {
    // Generate Work Order ID
    const { rows: countRows } = await db.query("SELECT COUNT(*) FROM work_orders");
    const woNo = `WO-${String(parseInt(countRows[0].count) + 1).padStart(3, '0')}`;

    // Insert WO
    const { rows } = await db.query(`
      INSERT INTO work_orders (wo_no, product_id, product_name, quantity, worker, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [woNo, product_id, product_name, quantity, worker, start_date, end_date]);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── UPDATE WO PROGRESS (The ERP Connection!) ─────────────────────────────────
router.put("/work-orders/:id/progress", async (req, res) => {
  const { id } = req.params;
  const { progress, efficiency, waste_pct } = req.body;
  
  const numericProgress = Number(progress);
  const status = numericProgress >= 100 ? "done" : "in_progress";

  try {
    await db.transaction(async (client) => {
      // 1. Get the current Work Order
      const { rows: woRows } = await client.query("SELECT * FROM work_orders WHERE id = $1", [id]);
      if (woRows.length === 0) throw new Error("Work order not found");
      const wo = woRows[0];

      // Prevent duplicate processing if it's already fully manufactured
      if (wo.status === "done" && status === "done") return; 

      // 2. Update the WO progress
      await client.query(`
        UPDATE work_orders 
        SET progress = $1, status = $2, efficiency = $3, waste_pct = $4, updated_at = NOW() 
        WHERE id = $5
      `, [numericProgress, status, efficiency || 0, waste_pct || 0, id]);

      // 3. 🔥 THE ERP CONNECTION: Manufacturing logic
      if (status === "done") {
        
        // A. Add the Finished Good to Stock
        await client.query(`
          UPDATE stock_levels 
          SET on_hand = on_hand + $1, updated_at = NOW()
          WHERE product_id = $2
        `, [wo.quantity, wo.product_id]);

        // Log the IN movement
        await client.query(`
          INSERT INTO stock_movements (product_id, product_name, product_code, type, quantity, before_qty, after_qty, reason, warehouse)
          SELECT p.id, p.name, p.code, 'IN', $1, s.on_hand - $1, s.on_hand, 'Manufactured - ' || $3, s.warehouse
          FROM products p JOIN stock_levels s ON p.id = s.product_id
          WHERE p.id = $2 LIMIT 1
        `, [wo.quantity, wo.product_id, wo.wo_no]);

        // B. Deduct Raw Materials (If this product has a BOM)
        if (wo.bom_id) {
           const { rows: materials } = await client.query("SELECT * FROM bom_materials WHERE bom_id = $1", [wo.bom_id]);
           
           for (const mat of materials) {
              const qtyToDeduct = mat.quantity * wo.quantity;

              // Deduct by name mapping
              await client.query(`
                UPDATE stock_levels 
                SET on_hand = GREATEST(on_hand - $1, 0), updated_at = NOW()
                WHERE product_id = (SELECT id FROM products WHERE name = $2 LIMIT 1)
              `, [qtyToDeduct, mat.name]);
           }
        }
      }
    });

    res.json({ success: true, message: "Progress updated and inventory synced." });
  } catch (error) {
    console.error("Manufacturing update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
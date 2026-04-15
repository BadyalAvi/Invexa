-- ─── InvenPro ERP — Complete PostgreSQL Schema ───────────────────────────────
-- Run this once against your Supabase database
-- Either via: npm run db:setup
-- Or paste directly into: Supabase Dashboard → SQL Editor → Run

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS & AUTH ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin','manager','staff','viewer')),
  warehouse     VARCHAR(50)  NOT NULL DEFAULT 'All',
  status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive')),
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── WAREHOUSES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       VARCHAR(50) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  address    TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO warehouses (code, name) VALUES
  ('WH/Main',   'Main Warehouse'),
  ('WH/North',  'North Warehouse'),
  ('WH/South',  'South Warehouse'),
  ('WH/Export', 'Export Warehouse')
ON CONFLICT (code) DO NOTHING;

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  unit        VARCHAR(20) NOT NULL DEFAULT 'pcs',
  cost        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  price       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  reorder_pt  INTEGER NOT NULL DEFAULT 5 CHECK (reorder_pt >= 0),
  max_stock   INTEGER NOT NULL DEFAULT 100 CHECK (max_stock >= 0),
  warehouse   VARCHAR(50) NOT NULL DEFAULT 'WH/Main',
  route       VARCHAR(20) NOT NULL DEFAULT 'Buy'
              CHECK (route IN ('Buy','Manufacture')),
  valuation   VARCHAR(10) NOT NULL DEFAULT 'FIFO'
              CHECK (valuation IN ('FIFO','LIFO')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock levels per warehouse (one row per product per warehouse)
CREATE TABLE IF NOT EXISTS stock_levels (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse   VARCHAR(50) NOT NULL,
  on_hand     INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved    INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available   INTEGER GENERATED ALWAYS AS (on_hand - reserved) STORED,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, warehouse)
);

-- Batch & serial number tracking
CREATE TABLE IF NOT EXISTS batches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_code  VARCHAR(100) NOT NULL,
  serial_no   VARCHAR(100),
  quantity    INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  warehouse   VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product variants (size/colour/spec)
CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku         VARCHAR(100) NOT NULL UNIQUE,
  attributes  VARCHAR(200) NOT NULL,  -- e.g. "Black / Large"
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VENDORS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(200) NOT NULL,
  contact_name   VARCHAR(100),
  email          VARCHAR(150),
  phone          VARCHAR(30),
  category       VARCHAR(100),
  rating         NUMERIC(2,1) DEFAULT 4.0 CHECK (rating BETWEEN 0 AND 5),
  on_time_pct    INTEGER DEFAULT 90 CHECK (on_time_pct BETWEEN 0 AND 100),
  lead_days      INTEGER DEFAULT 7 CHECK (lead_days >= 0),
  outstanding    NUMERIC(12,2) DEFAULT 0,
  total_orders   INTEGER DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no     VARCHAR(20) NOT NULL UNIQUE,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('sale','purchase')),
  customer     VARCHAR(200) NOT NULL,
  vendor_id    UUID REFERENCES vendors(id),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','in_progress','done','cancel')),
  priority     VARCHAR(10) NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('urgent','high','normal','low')),
  invoice_no   VARCHAR(50),
  payment      VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (payment IN ('paid','pending','none')),
  delivery_ref VARCHAR(50),
  notes        TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order line items (one order can have multiple products)
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total       NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ─── MANUFACTURING ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  cost        NUMERIC(12,2) DEFAULT 0,
  waste_pct   NUMERIC(4,1) DEFAULT 0,
  status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_materials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_id      UUID NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL,
  unit        VARCHAR(20) NOT NULL DEFAULT 'pcs',
  unit_cost   NUMERIC(12,2) DEFAULT 0,
  on_hand     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS work_orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_no        VARCHAR(20) NOT NULL UNIQUE,
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  bom_id       UUID REFERENCES bom(id),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  status       VARCHAR(20) NOT NULL DEFAULT 'planned'
               CHECK (status IN ('planned','in_progress','done','cancelled')),
  progress     INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  efficiency   NUMERIC(4,1) DEFAULT 0,
  waste_pct    NUMERIC(4,1) DEFAULT 0,
  worker       VARCHAR(100),
  start_date   DATE,
  end_date     DATE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRANSFERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_no  VARCHAR(20) NOT NULL UNIQUE,
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  from_wh      VARCHAR(50) NOT NULL,
  to_wh        VARCHAR(50) NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  status       VARCHAR(20) NOT NULL DEFAULT 'done'
               CHECK (status IN ('pending','done','cancelled')),
  high_value   BOOLEAN NOT NULL DEFAULT FALSE,
  nft_hash     TEXT,
  verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── QUALITY CONTROL ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_checks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qc_no        VARCHAR(20) NOT NULL UNIQUE,
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('incoming','outgoing')),
  order_ref    VARCHAR(50),
  total_qty    INTEGER NOT NULL,
  passed       INTEGER NOT NULL DEFAULT 0,
  failed       INTEGER NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','done','failed')),
  inspector    VARCHAR(100),
  notes        TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SCRAP ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrap (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scrap_no     VARCHAR(20) NOT NULL UNIQUE,
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost    NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason       TEXT NOT NULL,
  disposed_by  VARCHAR(100),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','written_off')),
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RETURNS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_no    VARCHAR(20) NOT NULL UNIQUE,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('customer','vendor')),
  order_ref    VARCHAR(50),
  party        VARCHAR(200) NOT NULL,
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  reason       TEXT NOT NULL,
  refund       NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PUTAWAY RULES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS putaway_rules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_no      VARCHAR(20) NOT NULL UNIQUE,
  category     VARCHAR(100),
  product_code VARCHAR(50),
  from_loc     VARCHAR(100) NOT NULL,
  to_loc       VARCHAR(100) NOT NULL,
  description  TEXT,
  priority     INTEGER NOT NULL DEFAULT 3,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FULFILLMENT (PICK → PACK → SHIP) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fulfillments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfil_no    VARCHAR(20) NOT NULL UNIQUE,
  order_id     UUID NOT NULL REFERENCES orders(id),
  order_no     VARCHAR(20) NOT NULL,
  customer     VARCHAR(200) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity     INTEGER NOT NULL,
  pick_status  VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (pick_status IN ('pending','done')),
  pack_status  VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (pack_status IN ('pending','done')),
  ship_status  VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (ship_status IN ('pending','done')),
  carrier      VARCHAR(100),
  tracking_no  VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BACKORDERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backorders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bo_no          VARCHAR(20) NOT NULL UNIQUE,
  original_order VARCHAR(20) NOT NULL,
  customer       VARCHAR(200) NOT NULL,
  product_id     UUID NOT NULL REFERENCES products(id),
  product_name   VARCHAR(200) NOT NULL,
  ordered_qty    INTEGER NOT NULL,
  delivered_qty  INTEGER NOT NULL DEFAULT 0,
  remaining_qty  INTEGER NOT NULL,
  due_date       DATE,
  reason         TEXT,
  status         VARCHAR(10) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRICE LISTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_lists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_no    VARCHAR(20) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  type       VARCHAR(20) NOT NULL DEFAULT 'discount'
             CHECK (type IN ('standard','discount','volume')),
  discount   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_list_customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  customer_name VARCHAR(200) NOT NULL
);

-- ─── DROPSHIPPING ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dropships (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ds_no        VARCHAR(20) NOT NULL UNIQUE,
  sales_order  VARCHAR(50),
  customer     VARCHAR(200) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  vendor_id    UUID REFERENCES vendors(id),
  vendor_name  VARCHAR(200),
  vendor_po    VARCHAR(50),
  status       VARCHAR(30) NOT NULL DEFAULT 'sent_to_vendor'
               CHECK (status IN ('sent_to_vendor','vendor_confirmed','shipped_to_customer','delivered')),
  customer_addr TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── STOCK MOVEMENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mov_no       VARCHAR(20) NOT NULL UNIQUE,
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  type         VARCHAR(20) NOT NULL
               CHECK (type IN ('IN','OUT','TRANSFER','SCRAP','QUARANTINE','ADJUST','RETURN')),
  quantity     INTEGER NOT NULL,
  before_qty   INTEGER NOT NULL,
  after_qty    INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  reference    VARCHAR(50),
  warehouse    VARCHAR(50) NOT NULL,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOG ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  module     VARCHAR(50) NOT NULL,
  action     VARCHAR(50) NOT NULL,
  entity     VARCHAR(100) NOT NULL,
  detail     TEXT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'success'
             CHECK (status IN ('success','warning','danger','info')),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EMAIL NOTIFICATION RULES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger     VARCHAR(100) NOT NULL,
  condition   TEXT NOT NULL,
  recipient   VARCHAR(150) NOT NULL,
  channel     VARCHAR(20) NOT NULL DEFAULT 'email',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sent_notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id     UUID REFERENCES notification_rules(id),
  trigger     VARCHAR(100) NOT NULL,
  recipient   VARCHAR(150) NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'delivered',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default notification rules
INSERT INTO notification_rules (trigger, condition, recipient, channel, active) VALUES
  ('Stock Critical',   'Any product reaches critical stock level',   'admin@invenpro.in', 'email', TRUE),
  ('Stock Low',        'Any product falls below reorder point',       'admin@invenpro.in', 'email', TRUE),
  ('Order Received',   'Purchase order marked as Done',              'admin@invenpro.in', 'email', TRUE),
  ('Order Shipped',    'Sale order marked as Shipped',               'admin@invenpro.in', 'email', TRUE),
  ('QC Failure',       'Any QC check has failed units',              'admin@invenpro.in', 'email', TRUE),
  ('WO Completed',     'Manufacturing work order completed',         'admin@invenpro.in', 'email', TRUE)
ON CONFLICT DO NOTHING;

-- ─── INDEXES FOR PERFORMANCE ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_code        ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_warehouse   ON products(warehouse);
CREATE INDEX IF NOT EXISTS idx_stock_product        ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse      ON stock_levels(warehouse);
CREATE INDEX IF NOT EXISTS idx_orders_type          ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer      ON orders(customer);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_movements_product    ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type       ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created    ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user           ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_module         ON audit_log(module);
CREATE INDEX IF NOT EXISTS idx_audit_created        ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_product      ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry       ON batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_transfers_product    ON transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_qc_product           ON qc_checks(product_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status   ON work_orders(status);

-- ─── AUTO-UPDATE updated_at TRIGGER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','products','orders','work_orders','transfers',
    'qc_checks','scrap','returns','fulfillments','backorders','dropships','vendors'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON %I;
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END;
$$;

-- ─── STOCK STATUS VIEW ────────────────────────────────────────────────────────
-- Convenient view: joins products + stock_levels with computed status
CREATE OR REPLACE VIEW product_stock_view AS
SELECT
  p.id,
  p.code,
  p.name,
  p.category,
  p.unit,
  p.cost,
  p.price,
  p.reorder_pt,
  p.max_stock,
  p.warehouse,
  p.route,
  p.valuation,
  p.active,
  COALESCE(s.on_hand,  0) AS on_hand,
  COALESCE(s.reserved, 0) AS reserved,
  COALESCE(s.available,0) AS available,
  CASE
    WHEN COALESCE(s.on_hand, 0) = 0            THEN 'critical'
    WHEN COALESCE(s.on_hand, 0) <= p.reorder_pt THEN 'low'
    ELSE 'ok'
  END AS status,
  COALESCE(s.on_hand, 0) * p.cost AS stock_value
FROM products p
LEFT JOIN stock_levels s
  ON s.product_id = p.id AND s.warehouse = p.warehouse
WHERE p.active = TRUE;

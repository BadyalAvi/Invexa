import { useState, useMemo } from "react";
import {
  Clock, User, Package, ShoppingCart, ArrowRight, RotateCcw,
  Trash2, CheckCircle2, AlertTriangle, FileText, Download,
  Mail, Bell, Send, Activity, Filter, Search, TrendingUp,
  TrendingDown, Minus, Eye, Printer, X, RefreshCw,
} from "lucide-react";
import { T, MONO, SANS, fmtINR, today } from "./data.js";
import { KPI, PageTitle, Btn, TH, TD, SectionCard, Modal, Badge, AlertBanner } from "./ui.jsx";

// ─── AUDIT TRAIL ──────────────────────────────────────────────────────────────
// Every action in the system should call: addAuditLog(log, setLog, entry)
// This is a pure helper — import and use from any module.
export function addAuditLog(setLog, entry) {
  const record = {
    id:        `LOG-${Date.now()}`,
    ts:        new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }),
    user:      "Admin",
    ...entry,
  };
  setLog(prev => [record, ...prev].slice(0, 500)); // keep last 500
}

// Seed data — realistic past actions
export const initAuditLog = [
  { id:"LOG-001", ts:"03 Apr, 10:14 AM", user:"Admin",    module:"Inventory",  action:"ADD",      entity:"Product",       detail:"Added new product USB-C Hub (ELC-001), qty: 32 units",                     status:"success" },
  { id:"LOG-002", ts:"03 Apr, 10:05 AM", user:"Ravi K.",  module:"Orders",     action:"CREATE",   entity:"Sale Order",    detail:"Created SO-1045 for Jackson Group — USB-C Hub × 10, ₹22,000",              status:"success" },
  { id:"LOG-003", ts:"03 Apr, 09:52 AM", user:"Priya S.", module:"QC",         action:"INSPECT",  entity:"QC Check",      detail:"QC-003: Wireless Mouse — 2 passed, 1 failed. 1 unit quarantined.",          status:"warning" },
  { id:"LOG-004", ts:"02 Apr, 06:30 PM", user:"Admin",    module:"Transfers",  action:"TRANSFER", entity:"Stock Move",    detail:"TRF-003: Office Chair × 3 moved WH/North → WH/Export. NFT minted.",         status:"success" },
  { id:"LOG-005", ts:"02 Apr, 04:15 PM", user:"Admin",    module:"Scrap",      action:"WRITEOFF", entity:"Scrap Record",  detail:"SCR-001: Corner Desk × 1 written off. Value lost: ₹8,200.",                  status:"danger"  },
  { id:"LOG-006", ts:"02 Apr, 02:00 PM", user:"Ravi K.",  module:"Manufacturing",action:"COMPLETE",entity:"Work Order",   detail:"WO-003: Flipover Board × 8 completed. Efficiency: 91%. Added to stock.",     status:"success" },
  { id:"LOG-007", ts:"01 Apr, 11:30 AM", user:"Admin",    module:"Orders",     action:"RECEIVE",  entity:"Purchase Order",detail:"PO-0202: Received Wireless Mouse × 20 from Supplier Beta. Stock updated.",    status:"success" },
  { id:"LOG-008", ts:"01 Apr, 09:14 AM", user:"Admin",    module:"Users",      action:"ADD",      entity:"User",          detail:"Added new user Priya Sharma (staff) — WH/North access.",                     status:"success" },
  { id:"LOG-009", ts:"31 Mar, 05:45 PM", user:"Priya S.", module:"Returns",    action:"APPROVE",  entity:"Return",        detail:"RET-001: Approved return from Agrolait — Corner Desk × 1. Stock restored.",  status:"success" },
  { id:"LOG-010", ts:"31 Mar, 03:20 PM", user:"Admin",    module:"Inventory",  action:"ADJUST",   entity:"Stock",         detail:"Manual adjustment: USB-C Hub (ELC-001) — system: 32, physical: 35. +3 units.",status:"warning" },
  { id:"LOG-011", ts:"30 Mar, 02:00 PM", user:"Ravi K.",  module:"Orders",     action:"SHIP",     entity:"Sale Order",    detail:"SO-1042: Shipped Corner Desk × 2 to Agrolait. Carrier: BlueDart BD123456.",  status:"success" },
  { id:"LOG-012", ts:"29 Mar, 10:00 AM", user:"Admin",    module:"QC",         action:"INSPECT",  entity:"QC Check",      detail:"QC-002: Office Chair × 10 — all passed. No defects found.",                  status:"success" },
];

const ACTION_COLORS = {
  ADD:      { bg:T.greenL, fg:T.green,  border:T.greenB },
  CREATE:   { bg:T.tealL,  fg:T.teal,   border:T.tealM  },
  INSPECT:  { bg:T.blueL,  fg:T.blue,   border:T.blueB  },
  TRANSFER: { bg:T.blueL,  fg:T.blue,   border:T.blueB  },
  WRITEOFF: { bg:T.redL,   fg:T.red,    border:T.redB   },
  COMPLETE: { bg:T.greenL, fg:T.green,  border:T.greenB },
  RECEIVE:  { bg:T.greenL, fg:T.green,  border:T.greenB },
  APPROVE:  { bg:T.greenL, fg:T.green,  border:T.greenB },
  ADJUST:   { bg:T.amberL, fg:T.amber,  border:T.amberB },
  SHIP:     { bg:T.tealL,  fg:T.teal,   border:T.tealM  },
  DELETE:   { bg:T.redL,   fg:T.red,    border:T.redB   },
  LOGIN:    { bg:T.blueL,  fg:T.blue,   border:T.blueB  },
};

const STATUS_DOT = {
  success: T.green,
  warning: T.amber,
  danger:  T.red,
  info:    T.blue,
};

export function AuditTrail({ auditLog }) {
  const [search, setSearch]     = useState("");
  const [moduleF, setModuleF]   = useState("All");
  const [actionF, setActionF]   = useState("All");
  const [userF, setUserF]       = useState("All");
  const [detail, setDetail]     = useState(null);

  const modules = ["All", ...new Set(auditLog.map(l => l.module))];
  const actions = ["All", ...new Set(auditLog.map(l => l.action))];
  const users   = ["All", ...new Set(auditLog.map(l => l.user))];

  const filtered = useMemo(() => auditLog.filter(l =>
    (moduleF === "All" || l.module === moduleF) &&
    (actionF === "All" || l.action === actionF) &&
    (userF   === "All" || l.user   === userF)   &&
    (l.detail.toLowerCase().includes(search.toLowerCase()) ||
     l.entity.toLowerCase().includes(search.toLowerCase()) ||
     l.id.toLowerCase().includes(search.toLowerCase()))
  ), [auditLog, moduleF, actionF, userF, search]);

  const todayCount   = auditLog.filter(l => l.ts.startsWith("03 Apr")).length;
  const warningCount = auditLog.filter(l => l.status === "warning" || l.status === "danger").length;

  return (
    <div>
      <PageTitle
        title="Audit Trail"
        sub="Complete activity log · Every action recorded · Who did what and when"
        actions={<Btn Icon={Download}>Export Log</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Events"    value={auditLog.length}  sub="all time"           Icon={Activity}      />
        <KPI label="Today"           value={todayCount}       sub="actions today"       Icon={Clock}         accent={T.blue}  />
        <KPI label="Warnings"        value={warningCount}     sub="need review"         Icon={AlertTriangle} accent={T.amber} />
        <KPI label="Active Users"    value={users.length - 1} sub="logged actions"      Icon={User}          accent={T.green} />
      </div>

      {/* Filters */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:"6px 6px 0 0", borderBottom:"none", padding:"10px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:T.pageBg, borderRadius:4, padding:"5px 10px", border:`1px solid ${T.bdr}`, flex:1, minWidth:200 }}>
          <Search size={12} color={T.t3}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search actions, entities, details…"
            style={{ border:"none", background:"transparent", outline:"none", fontSize:12, color:T.t1, width:"100%", fontFamily:SANS }}/>
        </div>
        {[["Module", moduleF, setModuleF, modules],["Action", actionF, setActionF, actions],["User", userF, setUserF, users]].map(([lbl, val, set, opts]) => (
          <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:T.t4, fontFamily:SANS }}>{lbl}:</span>
            <select value={val} onChange={e => set(e.target.value)}
              style={{ padding:"4px 8px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1, background:T.surfBg }}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button onClick={() => { setSearch(""); setModuleF("All"); setActionF("All"); setUserF("All"); }}
          style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", border:`1px solid ${T.bdr}`, borderRadius:4, background:T.surfBg, color:T.t3, fontSize:11, cursor:"pointer", fontFamily:SANS }}>
          <X size={11}/> Clear
        </button>
        <span style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginLeft:"auto" }}>{filtered.length} events</span>
      </div>

      {/* Log table */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:"0 0 6px 6px", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
              {["","Log ID","Timestamp","User","Module","Action","Entity","Detail",""].map(h => <TH key={h}>{h}</TH>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => {
              const ac = ACTION_COLORS[log.action] || ACTION_COLORS.ADD;
              return (
                <tr key={i}
                  style={{ borderBottom:`1px solid ${T.bdr2}` }}
                  onMouseEnter={e => e.currentTarget.style.background=T.surfAlt}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <TD>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:STATUS_DOT[log.status]||T.green }}/>
                  </TD>
                  <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11 }}>{log.id}</TD>
                  <TD style={{ fontFamily:MONO, color:T.t3, fontSize:11, whiteSpace:"nowrap" }}>{log.ts}</TD>
                  <TD>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:22, height:22, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:T.teal, flexShrink:0, fontFamily:SANS }}>
                        {log.user.charAt(0)}
                      </div>
                      <span style={{ fontSize:12, color:T.t1, fontFamily:SANS }}>{log.user}</span>
                    </div>
                  </TD>
                  <TD>
                    <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:T.tealL, color:T.teal, border:`1px solid ${T.tealM}`, fontFamily:SANS }}>{log.module}</span>
                  </TD>
                  <TD>
                    <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:600, background:ac.bg, color:ac.fg, border:`1px solid ${ac.border}`, fontFamily:MONO }}>{log.action}</span>
                  </TD>
                  <TD style={{ fontWeight:500, color:T.t1 }}>{log.entity}</TD>
                  <TD style={{ color:T.t2, fontSize:12, maxWidth:300 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:260 }}>{log.detail}</div>
                  </TD>
                  <TD>
                    <button onClick={() => setDetail(log)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:T.teal, padding:3 }}>
                      <Eye size={13}/>
                    </button>
                  </TD>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding:"32px 0", textAlign:"center", color:T.t3, fontFamily:SANS, fontSize:13 }}>No events match the current filters</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ padding:"8px 14px", borderTop:`1px solid ${T.bdr}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>Showing {filtered.length} of {auditLog.length} events · Last 500 kept</span>
          <span style={{ fontSize:11, color:T.teal, fontFamily:SANS }}>Auto-recorded · Cannot be edited</span>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <Modal title={`Event Detail — ${detail.id}`} onClose={() => setDetail(null)} width={520}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              ["Log ID",    detail.id,     MONO],
              ["Timestamp", detail.ts,     MONO],
              ["User",      detail.user,   SANS],
              ["Module",    detail.module, SANS],
              ["Action",    detail.action, MONO],
              ["Entity",    detail.entity, SANS],
              ["Status",    detail.status, SANS],
            ].map(([lbl,val,font]) => (
              <div key={lbl} style={{ display:"flex", gap:16, padding:"8px 0", borderBottom:`1px solid ${T.bdr2}` }}>
                <div style={{ width:90, fontSize:11, color:T.t4, fontFamily:SANS, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", flexShrink:0 }}>{lbl}</div>
                <div style={{ fontSize:13, color:T.t1, fontFamily:font, fontWeight:500 }}>{val}</div>
              </div>
            ))}
            <div style={{ padding:"8px 0" }}>
              <div style={{ fontSize:11, color:T.t4, fontFamily:SANS, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Detail</div>
              <div style={{ fontSize:13, color:T.t1, fontFamily:SANS, lineHeight:1.7, background:T.pageBg, padding:"10px 12px", borderRadius:5, border:`1px solid ${T.bdr}` }}>{detail.detail}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
// Generates a printable HTML page and opens it in a new tab.
// Works without any npm package — uses window.print() via a blob URL.

export function generateInvoicePDF(order) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${order.invoice}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', sans-serif; color: #1A1A18; background:#fff; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:2px solid #0D7377; padding-bottom:20px; }
    .brand { font-size:28px; font-weight:800; color:#0D7377; }
    .brand-sub { font-size:12px; color:#9A9490; margin-top:4px; }
    .inv-meta { text-align:right; }
    .inv-meta h2 { font-size:20px; color:#1A1A18; }
    .inv-meta p { font-size:12px; color:#9A9490; margin-top:4px; }
    .badge { display:inline-block; padding:3px 10px; border-radius:3px; font-size:11px; font-weight:600; background:${order.payment==="paid"?"#EAF5EE":"#FDF3E7"}; color:${order.payment==="paid"?"#2D7D46":"#C8873A"}; margin-top:6px; }
    .section { margin-bottom:24px; }
    .section-title { font-size:11px; color:#9A9490; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px; }
    .bill-to { font-size:15px; font-weight:600; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { background:#F2EFE9; padding:10px 14px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; color:#6E6A66; letter-spacing:0.05em; }
    td { padding:12px 14px; border-bottom:1px solid #EDE9E3; font-size:13px; }
    .total-row { background:#0D7377; color:#fff; }
    .total-row td { font-size:16px; font-weight:700; border:none; }
    .footer { margin-top:40px; padding-top:16px; border-top:1px solid #EDE9E3; font-size:11px; color:#9A9490; text-align:center; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">InvenPro</div>
      <div class="brand-sub">admin@invenpro.in · www.invenpro.in</div>
    </div>
    <div class="inv-meta">
      <h2>${order.invoice}</h2>
      <p>Date: ${order.date}</p>
      <p>Order: ${order.id}</p>
      <span class="badge">${order.payment==="paid"?"✓ PAID":"PAYMENT PENDING"}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To</div>
    <div class="bill-to">${order.customer}</div>
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    <table>
      <thead>
        <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${order.product}</td>
          <td>${order.qty}</td>
          <td>₹${(order.total/order.qty).toLocaleString("en-IN")}</td>
          <td>₹${order.total.toLocaleString("en-IN")}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" style="text-align:right;padding-right:24px;">Total Amount</td>
          <td>₹${order.total.toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="footer">
    Thank you for your business · InvenPro ERP · Generated on ${new Date().toLocaleString("en-IN")}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type:"text/html" });
  const url  = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export function generateStockReport(products) {
  const totalCost   = products.reduce((a,p)=>a+p.onHand*p.cost,0);
  const totalRetail = products.reduce((a,p)=>a+p.onHand*p.price,0);
  const critical    = products.filter(p=>p.status==="critical");
  const low         = products.filter(p=>p.status==="low");

  const rows = products.map(p => `
    <tr>
      <td>${p.code}</td><td>${p.name}</td><td>${p.category}</td>
      <td>${p.warehouse}</td><td>${p.onHand} ${p.unit}</td>
      <td>${p.reserved}</td><td>${p.available}</td>
      <td>₹${p.cost.toLocaleString("en-IN")}</td>
      <td>₹${p.price.toLocaleString("en-IN")}</td>
      <td>₹${(p.onHand*p.cost).toLocaleString("en-IN")}</td>
      <td style="color:${p.status==="ok"?"#2D7D46":p.status==="low"?"#C8873A":"#C0392B"};font-weight:600">${p.status.toUpperCase()}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Stock Valuation Report</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',sans-serif; color:#1A1A18; padding:32px; font-size:13px; }
    h1 { font-size:22px; color:#0D7377; margin-bottom:4px; }
    .sub { color:#9A9490; font-size:12px; margin-bottom:24px; }
    .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
    .kpi { background:#F7F5F1; border-radius:6px; padding:14px; border-top:3px solid #0D7377; }
    .kpi-label { font-size:10px; color:#6E6A66; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; }
    .kpi-value { font-size:20px; font-weight:700; font-family:monospace; }
    table { width:100%; border-collapse:collapse; }
    th { background:#F2EFE9; padding:8px 10px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; color:#6E6A66; letter-spacing:0.05em; }
    td { padding:8px 10px; border-bottom:1px solid #EDE9E3; font-size:12px; }
    tr:hover td { background:#F7F5F1; }
    .footer { margin-top:24px; font-size:11px; color:#9A9490; text-align:center; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <h1>Stock Valuation Report</h1>
  <div class="sub">Generated: ${new Date().toLocaleString("en-IN")} · InvenPro ERP</div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total SKUs</div><div class="kpi-value">${products.length}</div></div>
    <div class="kpi"><div class="kpi-label">Cost Value</div><div class="kpi-value">₹${(totalCost/100000).toFixed(1)}L</div></div>
    <div class="kpi"><div class="kpi-label">Retail Value</div><div class="kpi-value">₹${(totalRetail/100000).toFixed(1)}L</div></div>
    <div class="kpi" style="border-top-color:#C0392B"><div class="kpi-label">Critical Items</div><div class="kpi-value" style="color:#C0392B">${critical.length}</div></div>
  </div>

  <table>
    <thead>
      <tr><th>SKU</th><th>Product</th><th>Category</th><th>Warehouse</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Cost</th><th>Price</th><th>Stock Value</th><th>Status</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">InvenPro ERP · Stock Valuation Report · ${new Date().toLocaleDateString("en-IN")}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type:"text/html" });
  window.open(URL.createObjectURL(blob), "_blank");
}

export function generateSalesReport(orders) {
  const sales = orders.filter(o => o.type === "sale");
  const totalRev = sales.reduce((a,o)=>a+o.total,0);
  const done = sales.filter(o=>o.status==="done");
  const pending = sales.filter(o=>o.status==="pending");

  const rows = sales.map(o => `
    <tr>
      <td style="font-family:monospace;color:#0D7377;font-weight:700">${o.id}</td>
      <td>${o.customer}</td><td>${o.product}</td><td>${o.qty}</td>
      <td style="font-family:monospace;font-weight:700">₹${o.total.toLocaleString("en-IN")}</td>
      <td>${o.date}</td>
      <td style="font-family:monospace">${o.invoice||"—"}</td>
      <td style="color:${o.payment==="paid"?"#2D7D46":"#C8873A"};font-weight:600">${o.payment==="paid"?"Paid":"Pending"}</td>
      <td style="color:${o.status==="done"?"#2D7D46":o.status==="cancel"?"#C0392B":"#C8873A"};font-weight:600">${o.status.toUpperCase()}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Sales Report</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',sans-serif;color:#1A1A18;padding:32px;font-size:13px;}
    h1{font-size:22px;color:#0D7377;margin-bottom:4px;}
    .sub{color:#9A9490;font-size:12px;margin-bottom:24px;}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
    .kpi{background:#F7F5F1;border-radius:6px;padding:14px;border-top:3px solid #0D7377;}
    .kpi-label{font-size:10px;color:#6E6A66;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;}
    .kpi-value{font-size:20px;font-weight:700;font-family:monospace;}
    table{width:100%;border-collapse:collapse;}
    th{background:#F2EFE9;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#6E6A66;letter-spacing:0.05em;}
    td{padding:8px 10px;border-bottom:1px solid #EDE9E3;font-size:12px;}
    .footer{margin-top:24px;font-size:11px;color:#9A9490;text-align:center;}
    @media print{body{padding:16px;}}
  </style>
</head>
<body>
  <h1>Sales Report</h1>
  <div class="sub">Generated: ${new Date().toLocaleString("en-IN")} · InvenPro ERP</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total Orders</div><div class="kpi-value">${sales.length}</div></div>
    <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">₹${(totalRev/100000).toFixed(1)}L</div></div>
    <div class="kpi"><div class="kpi-label">Completed</div><div class="kpi-value" style="color:#2D7D46">${done.length}</div></div>
    <div class="kpi" style="border-top-color:#C8873A"><div class="kpi-label">Pending</div><div class="kpi-value" style="color:#C8873A">${pending.length}</div></div>
  </div>
  <table>
    <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Date</th><th>Invoice</th><th>Payment</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">InvenPro ERP · Sales Report · ${new Date().toLocaleDateString("en-IN")}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type:"text/html" });
  window.open(URL.createObjectURL(blob), "_blank");
}

// PDF Export UI page
export function PDFExport({ products, orders, auditLog }) {
  const reports = [
    {
      id:"stock",
      title:"Stock Valuation Report",
      desc:"All products with on-hand qty, cost value, retail value, warehouse location and stock status.",
      icon:Package,
      color:T.teal,
      action:() => generateStockReport(products),
    },
    {
      id:"sales",
      title:"Sales Report",
      desc:"All sales orders with customer, product, total, payment status and delivery tracking.",
      icon:ShoppingCart,
      color:T.blue,
      action:() => generateSalesReport(orders),
    },
    {
      id:"invoice",
      title:"Invoice (per order)",
      desc:"Generate a professional invoice for any specific order. Select an order below.",
      icon:FileText,
      color:T.green,
      action:null, // handled below
    },
    {
      id:"audit",
      title:"Audit Trail Export",
      desc:"Full activity log with user, action, timestamp and detail. Opens printable view.",
      icon:Activity,
      color:T.amber,
      action:() => {
        const rows = auditLog.map(l => `<tr><td>${l.id}</td><td>${l.ts}</td><td>${l.user}</td><td>${l.module}</td><td>${l.action}</td><td>${l.entity}</td><td>${l.detail}</td></tr>`).join("");
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Audit Trail</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;padding:24px;font-size:12px;}h1{color:#0D7377;margin-bottom:16px;}table{width:100%;border-collapse:collapse;}th{background:#F2EFE9;padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#6E6A66;}td{padding:7px 10px;border-bottom:1px solid #EDE9E3;}@media print{body{padding:12px;}}</style></head><body><h1>Audit Trail — InvenPro ERP</h1><p style="color:#9A9490;margin-bottom:16px">Generated: ${new Date().toLocaleString("en-IN")}</p><table><thead><tr><th>ID</th><th>Timestamp</th><th>User</th><th>Module</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`;
        window.open(URL.createObjectURL(new Blob([html],{type:"text/html"})),"_blank");
      },
    },
  ];

  const [selectedOrder, setSelectedOrder] = useState("");
  const saleOrders = orders.filter(o => o.type === "sale" && o.invoice);

  return (
    <div>
      <PageTitle
        title="PDF Export & Reports"
        sub="Generate printable reports · Opens in new tab · Print or save as PDF"
      />

      <AlertBanner type="info">
        All reports open in a new browser tab and trigger the print dialog automatically. Use your browser's "Save as PDF" option to download.
      </AlertBanner>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, marginBottom:20 }}>
        {reports.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"18px 20px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:8, background:r.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={18} color={r.color}/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.t1, fontFamily:SANS, marginBottom:4 }}>{r.title}</div>
                  <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, lineHeight:1.6 }}>{r.desc}</div>
                </div>
              </div>

              {r.id === "invoice" ? (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <select value={selectedOrder} onChange={e => setSelectedOrder(e.target.value)}
                    style={{ flex:1, padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:MONO, color:T.t1, background:T.surfBg }}>
                    <option value="">Select order…</option>
                    {saleOrders.map(o => <option key={o.id} value={o.id}>{o.id} — {o.customer} — {o.invoice}</option>)}
                  </select>
                  <button
                    onClick={() => {
                      const o = orders.find(x => x.id === selectedOrder);
                      if (o) generateInvoicePDF(o);
                    }}
                    disabled={!selectedOrder}
                    style={{ padding:"7px 14px", background:selectedOrder?T.green:T.bdr, border:"none", borderRadius:4, color:selectedOrder?"#fff":T.t3, fontSize:12, cursor:selectedOrder?"pointer":"not-allowed", fontFamily:SANS, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                    <Printer size={12}/> Print
                  </button>
                </div>
              ) : (
                <button onClick={r.action}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:r.color, border:"none", borderRadius:4, color:"#fff", fontSize:12, cursor:"pointer", fontFamily:SANS, fontWeight:600 }}>
                  <Download size={13}/> Generate & Print
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick stats */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 18px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:12 }}>Report Summary</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            ["Total Products",  products.length,                                          T.teal],
            ["Total Orders",    orders.length,                                            T.blue],
            ["Sales Revenue",   `₹${(orders.filter(o=>o.type==="sale").reduce((a,o)=>a+o.total,0)/100000).toFixed(1)}L`, T.green],
            ["Audit Events",    auditLog.length,                                          T.amber],
          ].map(([lbl,val,color]) => (
            <div key={lbl} style={{ background:T.pageBg, borderRadius:5, padding:"12px 14px", border:`1px solid ${T.bdr}`, borderTop:`3px solid ${color}` }}>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:6 }}>{lbl}</div>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:MONO, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── EMAIL NOTIFICATIONS ──────────────────────────────────────────────────────
const initNotifRules = [
  { id:"NR-001", trigger:"Stock Critical",      condition:"Any product reaches critical stock level", recipient:"admin@invenpro.in", channel:"email", active:true,  lastSent:"03 Apr, 10:14 AM" },
  { id:"NR-002", trigger:"Stock Low",           condition:"Any product falls below reorder point",    recipient:"ravi@invenpro.in",  channel:"email", active:true,  lastSent:"02 Apr, 09:00 AM" },
  { id:"NR-003", trigger:"Order Received",      condition:"Purchase order marked as Done",            recipient:"admin@invenpro.in", channel:"email", active:true,  lastSent:"01 Apr, 11:30 AM" },
  { id:"NR-004", trigger:"Order Shipped",       condition:"Sale order marked as Shipped",             recipient:"admin@invenpro.in", channel:"email", active:true,  lastSent:"31 Mar, 03:20 PM" },
  { id:"NR-005", trigger:"QC Failure",          condition:"Any QC check has failed units",            recipient:"admin@invenpro.in", channel:"email", active:true,  lastSent:"03 Apr, 09:52 AM" },
  { id:"NR-006", trigger:"Return Requested",    condition:"New return created in the system",         recipient:"admin@invenpro.in", channel:"email", active:false, lastSent:"Never"             },
  { id:"NR-007", trigger:"WO Completed",        condition:"Manufacturing work order completed",       recipient:"ravi@invenpro.in",  channel:"email", active:true,  lastSent:"02 Apr, 02:00 PM" },
  { id:"NR-008", trigger:"Transfer Done",       condition:"Stock transfer completed between warehouses",recipient:"admin@invenpro.in",channel:"email", active:false, lastSent:"Never"            },
];

const initSentNotifs = [
  { id:"SN-001", rule:"Stock Critical",   recipient:"admin@invenpro.in", subject:"⚠ Critical Stock Alert — Wireless Mouse (ELC-002)",           ts:"03 Apr, 10:14 AM", status:"delivered" },
  { id:"SN-002", rule:"QC Failure",       recipient:"admin@invenpro.in", subject:"❌ QC Failed — Wireless Mouse: 1 unit quarantined",            ts:"03 Apr, 09:52 AM", status:"delivered" },
  { id:"SN-003", rule:"Stock Low",        recipient:"ravi@invenpro.in",  subject:"⚡ Low Stock Alert — Corner Desk (FCH-001) below reorder pt",  ts:"02 Apr, 09:00 AM", status:"delivered" },
  { id:"SN-004", rule:"Order Received",   recipient:"admin@invenpro.in", subject:"✅ PO-0202 Received — Wireless Mouse × 20 from Supplier Beta", ts:"01 Apr, 11:30 AM", status:"delivered" },
  { id:"SN-005", rule:"Order Shipped",    recipient:"admin@invenpro.in", subject:"📦 SO-1042 Shipped — Corner Desk × 2 to Agrolait",            ts:"31 Mar, 03:20 PM", status:"delivered" },
  { id:"SN-006", rule:"WO Completed",     recipient:"ravi@invenpro.in",  subject:"🏭 WO-003 Complete — Flipover Board × 8 added to stock",       ts:"02 Apr, 02:00 PM", status:"delivered" },
];

export function EmailNotifications() {
  const [rules, setRules]     = useState(initNotifRules);
  const [sent]                = useState(initSentNotifs);
  const [tab, setTab]         = useState("rules");
  const [testModal, setTest]  = useState(null);
  const [testEmail, setEmail] = useState("");
  const [testSent, setTestSent] = useState(false);

  const toggleRule = (id) => setRules(prev => prev.map(r => r.id===id ? {...r,active:!r.active} : r));

  const sendTest = () => {
    setTestSent(true);
    setTimeout(() => { setTest(null); setTestSent(false); setEmail(""); }, 2000);
  };

  return (
    <div>
      <PageTitle
        title="Email Notifications"
        sub="Trigger-based alerts · Configure recipients · View sent history"
        actions={
          <button onClick={() => setTest("new")}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", border:"none", borderRadius:5, background:T.teal, color:"#fff", fontSize:12, cursor:"pointer", fontFamily:SANS, fontWeight:600 }}>
            <Send size={12}/> Send Test Email
          </button>
        }
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active Rules"   value={rules.filter(r=>r.active).length}   sub="auto-sending"     Icon={Bell}          />
        <KPI label="Inactive Rules" value={rules.filter(r=>!r.active).length}  sub="paused"           Icon={Bell}          accent={T.t3}    />
        <KPI label="Emails Sent"    value={sent.length}                         sub="total delivered"  Icon={Mail}          accent={T.green} />
        <KPI label="Recipients"     value={new Set(rules.map(r=>r.recipient)).size} sub="unique emails" Icon={User}         accent={T.blue}  />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${T.bdr}`, marginBottom:0 }}>
        {[["rules","Notification Rules"],["history","Sent History"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:"9px 16px", border:"none", background:"transparent", borderBottom:tab===k?`2px solid ${T.teal}`:"2px solid transparent", color:tab===k?T.teal:T.t3, fontSize:13, fontWeight:tab===k?600:400, cursor:"pointer", fontFamily:SANS, marginBottom:-1 }}>{l}</button>
        ))}
      </div>

      {tab==="rules" && (
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderTop:"none", borderRadius:"0 0 6px 6px" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
              {["Rule ID","Trigger","Condition","Recipient","Channel","Active","Last Sent",""].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {rules.map((r,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, opacity:r.active?1:0.6 }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600 }}>{r.id}</TD>
                  <TD style={{ fontWeight:600, color:T.t1 }}>{r.trigger}</TD>
                  <TD style={{ color:T.t2, fontSize:12 }}>{r.condition}</TD>
                  <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.t3 }}>{r.recipient}</TD>
                  <TD>
                    <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:T.tealL, color:T.teal, fontFamily:SANS }}>
                      {r.channel==="email"?"✉ Email":"📱 SMS"}
                    </span>
                  </TD>
                  <TD>
                    <button onClick={() => toggleRule(r.id)}
                      style={{ width:36, height:20, borderRadius:99, border:"none", background:r.active?T.teal:T.bdr, cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                      <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:r.active?19:3, transition:"left 0.2s" }}/>
                    </button>
                  </TD>
                  <TD style={{ fontFamily:MONO, fontSize:11, color:T.t3 }}>{r.lastSent}</TD>
                  <TD>
                    <button onClick={() => setTest(r)}
                      style={{ fontSize:11, padding:"3px 8px", background:T.blueL, border:`1px solid ${T.blueB}`, borderRadius:3, color:T.blue, cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>
                      Test
                    </button>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==="history" && (
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderTop:"none", borderRadius:"0 0 6px 6px" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
              {["ID","Triggered By","Recipient","Subject","Sent At","Status"].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {sent.map((s,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600 }}>{s.id}</TD>
                  <TD style={{ fontWeight:500, color:T.t1 }}>{s.rule}</TD>
                  <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.t3 }}>{s.recipient}</TD>
                  <TD style={{ fontSize:12, color:T.t2 }}>{s.subject}</TD>
                  <TD style={{ fontFamily:MONO, fontSize:11, color:T.t3, whiteSpace:"nowrap" }}>{s.ts}</TD>
                  <TD>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:3, fontWeight:500, background:T.greenL, color:T.green, border:`1px solid ${T.greenB}`, fontFamily:SANS }}>
                      ✓ {s.status}
                    </span>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Test email modal */}
      {testModal && (
        <Modal title="Send Test Notification" onClose={() => { setTest(null); setTestSent(false); setEmail(""); }} width={420}>
          {testSent ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:14, fontWeight:600, color:T.green, fontFamily:SANS }}>Test email sent!</div>
              <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, marginTop:6 }}>Check your inbox at {testEmail}</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, marginBottom:16, lineHeight:1.6 }}>
                {typeof testModal === "object" && testModal.trigger
                  ? `Sending test for rule: "${testModal.trigger}"`
                  : "Send a test notification to verify your email setup."}
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10.5, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Recipient Email</div>
                <input value={testEmail} onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. admin@invenpro.in"
                  style={{ width:"100%", padding:"8px 10px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:13, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box" }}/>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <Btn onClick={() => { setTest(null); setEmail(""); }}>Cancel</Btn>
                <Btn variant="primary" Icon={Send} onClick={sendTest} disabled={!testEmail}>Send Test</Btn>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── STOCK MOVEMENT REPORT ────────────────────────────────────────────────────
export const initMovements = [
  { id:"MOV-001", ts:"03 Apr, 10:05 AM", product:"USB-C Hub",      code:"ELC-001", type:"OUT",      qty:10, from:32,  to:22,  reason:"Sale Order SO-1045",               ref:"SO-1045",  warehouse:"WH/Main",  user:"Admin"    },
  { id:"MOV-002", ts:"03 Apr, 09:52 AM", product:"Wireless Mouse",  code:"ELC-002", type:"QUARANTINE",qty:1, from:3,   to:2,   reason:"QC Failure — defective unit",      ref:"QC-003",   warehouse:"WH/South", user:"Priya S." },
  { id:"MOV-003", ts:"02 Apr, 06:30 PM", product:"Office Chair",   code:"FCH-004", type:"TRANSFER", qty:3,  from:14,  to:11,  reason:"Transfer WH/Main → WH/North",      ref:"TRF-003",  warehouse:"WH/Main",  user:"Admin"    },
  { id:"MOV-004", ts:"02 Apr, 02:00 PM", product:"Flipover Board",  code:"FCH-003", type:"IN",       qty:8,  from:5,   to:13,  reason:"WO-003 completed — finished goods", ref:"WO-003",   warehouse:"WH/North", user:"Ravi K."  },
  { id:"MOV-005", ts:"02 Apr, 04:15 PM", product:"Corner Desk",    code:"FCH-001", type:"SCRAP",    qty:1,  from:4,   to:3,   reason:"SCR-001 written off — damaged",     ref:"SCR-001",  warehouse:"WH/Main",  user:"Admin"    },
  { id:"MOV-006", ts:"01 Apr, 11:30 AM", product:"Wireless Mouse",  code:"ELC-002", type:"IN",       qty:20, from:3,   to:23,  reason:"PO-0202 received from Supplier Beta",ref:"PO-0202", warehouse:"WH/South", user:"Admin"    },
  { id:"MOV-007", ts:"01 Apr, 10:00 AM", product:"Corner Desk",    code:"FCH-001", type:"OUT",      qty:2,  from:6,   to:4,   reason:"Sale Order SO-1042 — shipped",      ref:"SO-1042",  warehouse:"WH/Main",  user:"Admin"    },
  { id:"MOV-008", ts:"31 Mar, 05:45 PM", product:"Corner Desk",    code:"FCH-001", type:"IN",       qty:1,  from:5,   to:6,   reason:"RET-001 — customer return approved", ref:"RET-001",  warehouse:"WH/Main",  user:"Priya S." },
  { id:"MOV-009", ts:"31 Mar, 03:20 PM", product:"Large Desk",     code:"FCH-002", type:"OUT",      qty:1,  from:2,   to:1,   reason:"Sale Order SO-1044 — shipped",      ref:"SO-1044",  warehouse:"WH/Main",  user:"Admin"    },
  { id:"MOV-010", ts:"30 Mar, 10:00 AM", product:"USB-C Hub",      code:"ELC-001", type:"ADJUST",   qty:3,  from:29,  to:32,  reason:"Stock adjustment — found in transit bin",ref:"ADJ-001",warehouse:"WH/Main",user:"Admin"   },
  { id:"MOV-011", ts:"29 Mar, 02:00 PM", product:"Office Chair",   code:"FCH-004", type:"IN",       qty:10, from:4,   to:14,  reason:"PO-0203 received from Supplier Gamma",ref:"PO-0203", warehouse:"WH/Main",  user:"Admin"    },
  { id:"MOV-012", ts:"28 Mar, 02:00 PM", product:"Corner Desk",    code:"FCH-001", type:"TRANSFER", qty:2,  from:8,   to:6,   reason:"TRF-001: WH/Main → WH/North",      ref:"TRF-001",  warehouse:"WH/Main",  user:"Admin"    },
];

const MOV_TYPE = {
  IN:         { label:"IN",         bg:T.greenL,  fg:T.green,  border:T.greenB, Icon:TrendingUp   },
  OUT:        { label:"OUT",        bg:T.redL,    fg:T.red,    border:T.redB,   Icon:TrendingDown  },
  TRANSFER:   { label:"TRANSFER",   bg:T.blueL,   fg:T.blue,   border:T.blueB,  Icon:ArrowRight    },
  SCRAP:      { label:"SCRAP",      bg:T.redL,    fg:T.red,    border:T.redB,   Icon:Trash2        },
  QUARANTINE: { label:"QUARANTINE", bg:T.amberL,  fg:T.amber,  border:T.amberB, Icon:AlertTriangle },
  ADJUST:     { label:"ADJUST",     bg:T.amberL,  fg:T.amber,  border:T.amberB, Icon:RefreshCw     },
  RETURN:     { label:"RETURN",     bg:T.greenL,  fg:T.green,  border:T.greenB, Icon:RotateCcw     },
};

export function StockMovementReport({ movements = initMovements }) {
  const [search, setSearch]   = useState("");
  const [typeF, setTypeF]     = useState("All");
  const [whF, setWhF]         = useState("All");
  const [codeF, setCodeF]     = useState("");

  const types = ["All", ...new Set(movements.map(m => m.type))];
  const warehouses = ["All", ...new Set(movements.map(m => m.warehouse))];

  const filtered = useMemo(() => movements.filter(m =>
    (typeF === "All" || m.type === typeF) &&
    (whF   === "All" || m.warehouse === whF) &&
    (codeF === "" || m.code.toLowerCase().includes(codeF.toLowerCase()) || m.product.toLowerCase().includes(codeF.toLowerCase())) &&
    (search === "" || m.reason.toLowerCase().includes(search.toLowerCase()) || m.ref.toLowerCase().includes(search.toLowerCase()))
  ), [movements, typeF, whF, codeF, search]);

  const totalIn   = filtered.filter(m=>m.type==="IN").reduce((a,m)=>a+m.qty,0);
  const totalOut  = filtered.filter(m=>m.type==="OUT").reduce((a,m)=>a+m.qty,0);
  const totalScrap= filtered.filter(m=>m.type==="SCRAP"||m.type==="QUARANTINE").reduce((a,m)=>a+m.qty,0);

  const exportMovements = () => {
    const rows = filtered.map(m=>`<tr><td>${m.id}</td><td>${m.ts}</td><td>${m.code}</td><td>${m.product}</td><td>${m.type}</td><td>${m.qty}</td><td>${m.from}</td><td>${m.to}</td><td>${m.reason}</td><td>${m.ref}</td><td>${m.warehouse}</td><td>${m.user}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Stock Movement Report</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;padding:24px;font-size:12px;}h1{color:#0D7377;margin-bottom:4px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th{background:#F2EFE9;padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#6E6A66;}td{padding:7px 10px;border-bottom:1px solid #EDE9E3;}@media print{body{padding:12px;}}</style></head><body><h1>Stock Movement Report</h1><p style="color:#9A9490;margin-bottom:4px">Generated: ${new Date().toLocaleString("en-IN")} · InvenPro ERP</p><p style="color:#9A9490">Showing ${filtered.length} movements</p><table><thead><tr><th>ID</th><th>Timestamp</th><th>SKU</th><th>Product</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Reason</th><th>Reference</th><th>Warehouse</th><th>User</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`;
    window.open(URL.createObjectURL(new Blob([html],{type:"text/html"})),"_blank");
  };

  return (
    <div>
      <PageTitle
        title="Stock Movement Report"
        sub="Every stock change recorded · IN · OUT · TRANSFER · SCRAP · ADJUST · RETURN"
        actions={<>
          <Btn Icon={Download} onClick={exportMovements}>Export PDF</Btn>
        </>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Movements" value={filtered.length}  sub="events shown"       Icon={Activity}     />
        <KPI label="Stock In"        value={`+${totalIn}`}   sub="units received"      Icon={TrendingUp}   accent={T.green} />
        <KPI label="Stock Out"       value={`-${totalOut}`}  sub="units dispatched"    Icon={TrendingDown} accent={T.red}   />
        <KPI label="Lost / Scrapped" value={totalScrap}      sub="units removed"       Icon={Trash2}       accent={T.amber} />
      </div>

      {/* Filters */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:"6px 6px 0 0", borderBottom:"none", padding:"10px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:T.pageBg, borderRadius:4, padding:"5px 10px", border:`1px solid ${T.bdr}` }}>
          <Search size={11} color={T.t3}/>
          <input value={codeF} onChange={e=>setCodeF(e.target.value)} placeholder="SKU or product…"
            style={{ border:"none", background:"transparent", outline:"none", fontSize:12, color:T.t1, width:130, fontFamily:MONO }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:T.pageBg, borderRadius:4, padding:"5px 10px", border:`1px solid ${T.bdr}` }}>
          <Search size={11} color={T.t3}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Reason or reference…"
            style={{ border:"none", background:"transparent", outline:"none", fontSize:12, color:T.t1, width:150, fontFamily:SANS }}/>
        </div>
        {[["Type",typeF,setTypeF,types],["Warehouse",whF,setWhF,warehouses]].map(([lbl,val,set,opts])=>(
          <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:T.t4, fontFamily:SANS }}>{lbl}:</span>
            <select value={val} onChange={e=>set(e.target.value)}
              style={{ padding:"4px 8px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1, background:T.surfBg }}>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button onClick={() => { setSearch(""); setTypeF("All"); setWhF("All"); setCodeF(""); }}
          style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", border:`1px solid ${T.bdr}`, borderRadius:4, background:T.surfBg, color:T.t3, fontSize:11, cursor:"pointer", fontFamily:SANS }}>
          <X size={11}/> Clear
        </button>
        <span style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginLeft:"auto" }}>{filtered.length} movements</span>
      </div>

      {/* Table */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:"0 0 6px 6px", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
              {["Mov ID","Timestamp","SKU","Product","Type","Qty","Before","After","Δ","Reason","Reference","Warehouse","User"].map(h=><TH key={h}>{h}</TH>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m,i) => {
              const cfg = MOV_TYPE[m.type] || MOV_TYPE.ADJUST;
              const Icon = cfg.Icon;
              const delta = m.to - m.from;
              return (
                <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11 }}>{m.id}</TD>
                  <TD style={{ fontFamily:MONO, color:T.t3, fontSize:11, whiteSpace:"nowrap" }}>{m.ts}</TD>
                  <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11.5 }}>{m.code}</TD>
                  <TD style={{ fontWeight:500, color:T.t1 }}>{m.product}</TD>
                  <TD>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:600, background:cfg.bg, color:cfg.fg, border:`1px solid ${cfg.border}`, fontFamily:MONO }}>
                      <Icon size={9}/>{cfg.label}
                    </span>
                  </TD>
                  <TD style={{ fontFamily:MONO, fontWeight:700, color:T.t1 }}>{m.qty}</TD>
                  <TD style={{ fontFamily:MONO, color:T.t3 }}>{m.from}</TD>
                  <TD style={{ fontFamily:MONO, fontWeight:600, color:T.t1 }}>{m.to}</TD>
                  <TD style={{ fontFamily:MONO, fontWeight:800, color:delta>0?T.green:delta<0?T.red:T.t3 }}>
                    {delta>0?"+":""}{delta}
                  </TD>
                  <TD style={{ fontSize:12, color:T.t2, maxWidth:200 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>{m.reason}</div>
                  </TD>
                  <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.teal }}>{m.ref}</TD>
                  <TD style={{ fontSize:12, color:T.t3 }}>{m.warehouse}</TD>
                  <TD style={{ fontSize:12, color:T.t2 }}>{m.user}</TD>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={13} style={{ padding:"32px 0", textAlign:"center", color:T.t3, fontFamily:SANS, fontSize:13 }}>No movements match the current filters</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ padding:"8px 14px", borderTop:`1px solid ${T.bdr}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{filtered.length} of {movements.length} movements</span>
          <span style={{ fontSize:11, color:T.teal, fontFamily:SANS, cursor:"pointer" }} onClick={exportMovements}>Export as PDF →</span>
        </div>
      </div>
    </div>
  );
}

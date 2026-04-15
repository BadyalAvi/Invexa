import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  LayoutGrid, Package, ShoppingCart, Factory, BarChart2,
  Bot, Bell, Search, Warehouse, AlertTriangle, Truck,
  DollarSign, Menu, Users, ArrowRight, Cloud, Camera,
  MessageSquare, Shield, Trash2, MapPin, Send, RefreshCw,
  RotateCcw, Calendar, Layers, Tag, PackageOpen, Link,
  CheckCircle2, Clock, XCircle, Activity, FileText, Mail,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { T, MONO, SANS, initProducts, initOrders, initTransfers, revData, weatherData, fmtINR, fmtK } from "./data.js";
import { KPI, Badge } from "./ui.jsx";
import { Inventory, Orders, Manufacturing, Transfers, Vendors, UsersRoles } from "./modules.jsx";
import {
  QualityControl, ScrapManagement, PutawayRules, PickPackShip,
  Backorders, Returns, ExpiryTracking, ProductVariants,
  PriceLists, Dropshipping,
} from "./highpriority.jsx";
import { Analytics, NLPCommand, WeatherEngine, CVAudit, AIAssistant } from "./features.jsx";
import {
  AuditTrail, PDFExport, EmailNotifications, StockMovementReport,
  initAuditLog, initMovements, addAuditLog,
} from "./tier1.jsx";

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const catData = [
  { name:"Furniture",   value:24, color:T.teal  },
  { name:"Electronics", value:35, color:T.amber },
  { name:"Stationery",  value:87, color:T.green },
];

const aiTips = [
  { color:T.red,   bg:T.redL,   icon:"⚠", title:"Stock-out Risk",        body:"Wireless Mouse (ELC-002) depletes in ~3 days. Reorder 30 units from Supplier Beta." },
  { color:T.green, bg:T.greenL, icon:"↑", title:"Demand Spike Detected", body:"USB-C Hub demand up 42% this week. Increase stock by 25 units." },
  { color:T.teal,  bg:T.tealL,  icon:"→", title:"Reorder Suggestion",    body:"Office Chair should be reordered in 7 days — 15 units from Supplier Gamma." },
  { color:T.amber, bg:T.amberL, icon:"◉", title:"Slow-Moving Stock",     body:"Notebook A5 — no sales in 14 days. Consider a 10% promotional offer." },
];

function Dashboard({ products, orders, setPage }) {
  const totalVal  = products.reduce((a, p) => a + p.onHand * p.cost, 0);
  const pendSales = orders.filter(o => o.type === "sale"     && o.status === "pending").length;
  const pendPurch = orders.filter(o => o.type === "purchase" && o.status === "pending").length;
  const alerts    = products.filter(p => p.status !== "ok").length;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:20, paddingBottom:14, borderBottom:`1px solid ${T.bdr}` }}>
        <div>
          <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:T.t1, fontFamily:SANS, letterSpacing:"-0.3px" }}>Dashboard</h1>
          <p style={{ margin:"3px 0 0", fontSize:12, color:T.t3, fontFamily:SANS }}>
            Live overview · {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})} · All warehouses
          </p>
        </div>
        {weatherData.forecast[0].rain > 70 && (
          <button onClick={() => setPage("weather")} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:T.blueL, border:`1px solid ${T.blueB}`, borderRadius:5, fontSize:12, color:T.blue, fontFamily:SANS, cursor:"pointer" }}>
            🌧 Heavy rain forecast · Check Weather Engine →
          </button>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <KPI label="Stock Value"    value={fmtK(totalVal)} sub={`${products.length} SKUs`}  delta="+8.2%"  up    Icon={Warehouse}     />
        <KPI label="Pending Sales"  value={pendSales}      sub="need dispatch"              delta="+3"     up={false} Icon={ShoppingCart} accent={T.blue}  />
        <KPI label="Pending Inward" value={pendPurch}      sub="purchase orders"            delta="-1"     up    Icon={Truck}          accent={T.green} />
        <KPI label="Stock Alerts"   value={alerts}         sub="low / critical"             delta="urgent" up={false} Icon={AlertTriangle} accent={T.red}   />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2.2fr 1fr", gap:14, marginBottom:20 }}>
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>Revenue · Cost · Profit</div>
              <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginTop:2 }}>Jan – Jun 2026 · ₹000s</div>
            </div>
            <div style={{ display:"flex", gap:14 }}>
              {[[T.teal,"Revenue"],[T.red,"Cost"],[T.green,"Profit"]].map(([c,l]) => (
                <span key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.t4, fontFamily:SANS }}>
                  <span style={{ width:10, height:3, background:c, display:"inline-block", borderRadius:2 }}/>{l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={revData}>
              <defs>
                <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={T.teal}  stopOpacity={0.12}/>
                  <stop offset="100%" stopColor={T.teal}  stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={T.green} stopOpacity={0.12}/>
                  <stop offset="100%" stopColor={T.green} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={T.bdr2} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:T.t3, fontFamily:SANS }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => "₹"+v+"k"} tick={{ fontSize:10, fill:T.t3, fontFamily:MONO }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v,n) => ["₹"+v+"k", n]} contentStyle={{ fontSize:12, border:`1px solid ${T.bdr}`, borderRadius:5, boxShadow:"none", fontFamily:SANS }}/>
              <Area type="monotone" dataKey="revenue" stroke={T.teal}  fill="url(#gT)" strokeWidth={2}/>
              <Area type="monotone" dataKey="profit"  stroke={T.green} fill="url(#gG)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:4 }}>Stock by Category</div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginBottom:10 }}>Units on hand</div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={4}>
                {catData.map((d,i) => <Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip contentStyle={{ fontSize:12, fontFamily:SANS, border:`1px solid ${T.bdr}`, borderRadius:5, boxShadow:"none" }}/>
            </PieChart>
          </ResponsiveContainer>
          {catData.map(d => (
            <div key={d.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, marginTop:6 }}>
              <span style={{ display:"flex", alignItems:"center", gap:6, color:T.t2, fontFamily:SANS }}>
                <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:"inline-block" }}/>{d.name}
              </span>
              <span style={{ fontFamily:MONO, fontWeight:600, color:T.t1 }}>{d.value} units</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:14 }}>
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
          <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>Recent Orders</span>
            <button onClick={() => setPage("orders")} style={{ fontSize:11, color:T.teal, fontWeight:500, cursor:"pointer", fontFamily:SANS, background:"none", border:"none" }}>View all →</button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
                {["Order","Customer","Total","Status"].map(h => (
                  <th key={h} style={{ padding:"8px 13px", textAlign:"left", fontWeight:600, color:T.t4, fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.06em", background:"#F2EFE9", fontFamily:SANS }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0,6).map((o,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                  onMouseEnter={e => e.currentTarget.style.background=T.surfAlt}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"9px 13px", fontFamily:MONO, color:T.teal, fontWeight:700, fontSize:13 }}>{o.id}</td>
                  <td style={{ padding:"9px 13px", fontSize:13, color:T.t1, fontFamily:SANS }}>{o.customer}</td>
                  <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:600, color:T.t1, fontSize:13 }}>{fmtINR(o.total)}</td>
                  <td style={{ padding:"9px 13px" }}><Badge status={o.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
          <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`, display:"flex", alignItems:"center", gap:8 }}>
            <Bot size={13} color={T.teal}/>
            <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>AI Insights</span>
            <span style={{ fontSize:9, padding:"1px 6px", borderRadius:3, background:T.tealL, color:T.teal, fontWeight:700, letterSpacing:"0.06em", fontFamily:SANS }}>LIVE</span>
          </div>
          <div style={{ padding:12, display:"flex", flexDirection:"column", gap:8 }}>
            {aiTips.map((tip,i) => (
              <div key={i} style={{ background:tip.bg, borderRadius:5, padding:"10px 12px", borderLeft:`3px solid ${tip.color}` }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:2 }}>{tip.icon} {tip.title}</div>
                <div style={{ fontSize:11, color:T.t2, fontFamily:SANS, lineHeight:1.5 }}>{tip.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id:"dashboard",    label:"Dashboard",        Icon:LayoutGrid,   group:"ops" },
  { id:"inventory",    label:"Inventory",         Icon:Package,      group:"ops" },
  { id:"orders",       label:"Orders",            Icon:ShoppingCart, group:"ops" },
  { id:"manufacturing",label:"Manufacturing",     Icon:Factory,      group:"ops" },
  { id:"transfers",    label:"Transfers",         Icon:ArrowRight,   group:"ops" },
  { id:"vendors",      label:"Vendors",           Icon:Truck,        group:"ops" },
  { id:"users",        label:"Users & Roles",     Icon:Users,        group:"ops" },
  { id:"qc",           label:"Quality Control",   Icon:Shield,       group:"wh"  },
  { id:"scrap",        label:"Scrap / Damaged",   Icon:Trash2,       group:"wh"  },
  { id:"putaway",      label:"Putaway Rules",     Icon:MapPin,       group:"wh"  },
  { id:"fulfillment",  label:"Pick→Pack→Ship",    Icon:Send,         group:"wh"  },
  { id:"backorders",   label:"Backorders",        Icon:RefreshCw,    group:"wh"  },
  { id:"returns",      label:"Returns",           Icon:RotateCcw,    group:"wh"  },
  { id:"expiry",       label:"Expiry / FEFO",     Icon:Calendar,     group:"wh"  },
  { id:"variants",     label:"Variants",          Icon:Layers,       group:"wh"  },
  { id:"pricelists",   label:"Price Lists",       Icon:Tag,          group:"wh"  },
  { id:"dropship",     label:"Dropshipping",      Icon:PackageOpen,  group:"wh"  },
  { id:"analytics",    label:"Analytics",         Icon:BarChart2,    group:"intel"},
  { id:"nlp",          label:"NLP Command",       Icon:MessageSquare,group:"intel"},
  { id:"weather",      label:"Context Engine",    Icon:Cloud,        group:"intel"},
  { id:"cvaudit",      label:"CV Audit",          Icon:Camera,       group:"intel"},
  { id:"ai",           label:"AI Assistant",      Icon:Bot,          group:"intel"},
  { id:"audit",        label:"Audit Trail",       Icon:Activity,     group:"reports"},
  { id:"movements",    label:"Stock Movements",   Icon:TrendingUp,   group:"reports"},
  { id:"pdfexport",    label:"PDF & Reports",     Icon:FileText,     group:"reports"},
  { id:"notifications",label:"Email Alerts",      Icon:Mail,         group:"reports"},
];

const GROUPS = [
  { id:"ops",     label:"Operations"   },
  { id:"wh",      label:"Warehouse"    },
  { id:"intel",   label:"Intelligence" },
  { id:"reports", label:"Reports"      },
];

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,      setPage]      = useState("dashboard");
  const [open,      setOpen]      = useState(true);
  const [products,  setProducts]  = useState(initProducts);
  const [orders,    setOrders]    = useState(initOrders);
  const [transfers, setTransfers] = useState(initTransfers);
  const [auditLog,  setAuditLog]  = useState(initAuditLog);
  const [movements]               = useState(initMovements);
  const [gSearch,   setGSearch]   = useState("");
  const [notifs,    setNotifs]    = useState(false);

  const alerts = products.filter(p => p.status !== "ok").length;

  // Wrapped setters that also write to audit log
  const setProductsLogged = (updater) => {
    setProducts(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  };

  const setOrdersLogged = (updater) => {
    setOrders(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  };

  const notifList = [
    { text:"Wireless Mouse stock is critically low",   time:"2m ago",  color:T.red   },
    { text:"PO-0201 from Supplier Alpha is pending",   time:"15m ago", color:T.amber },
    { text:"Work Order WO-001 is 65% complete",        time:"1h ago",  color:T.blue  },
    { text:"USB-C Hub demand spike detected",           time:"2h ago",  color:T.green },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", background:T.pageBg, fontFamily:SANS, overflow:"hidden" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:open?220:48, minWidth:open?220:48, background:T.sideNav, display:"flex", flexDirection:"column", transition:"width 0.2s ease", overflow:"hidden", flexShrink:0 }}>

        <div style={{ padding:"12px 11px", display:"flex", alignItems:"center", gap:9, borderBottom:`1px solid ${T.sideNavB}` }}>
          <div style={{ width:26, height:26, borderRadius:4, background:T.teal, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Package size={13} color="#fff"/>
          </div>
          {open && <span style={{ color:"#F0EDE8", fontWeight:700, fontSize:13, letterSpacing:"-0.2px", whiteSpace:"nowrap", fontFamily:SANS }}>InvenPro</span>}
        </div>

        <nav style={{ flex:1, padding:"6px", overflowY:"auto", display:"flex", flexDirection:"column" }}>
          {GROUPS.map(grp => (
            <div key={grp.id} style={{ marginBottom:6 }}>
              {open && (
                <div style={{ padding:"8px 10px 3px", fontSize:9.5, fontWeight:700, color:"#3d5166", textTransform:"uppercase", letterSpacing:"0.09em", fontFamily:SANS, whiteSpace:"nowrap" }}>
                  {grp.label}
                </div>
              )}
              {SECTIONS.filter(s => s.group === grp.id).map(({ id, label, Icon }) => {
                const active = page === id;
                return (
                  <button key={id} onClick={() => setPage(id)} style={{
                    display:"flex", alignItems:"center", gap:9,
                    padding: open ? "7px 10px" : "8px",
                    justifyContent: open ? "flex-start" : "center",
                    borderRadius:4, border:"none", cursor:"pointer",
                    background: active ? T.teal : "transparent",
                    color: active ? "#fff" : "#78716c",
                    fontSize:12.5, fontWeight: active ? 600 : 400,
                    whiteSpace:"nowrap", fontFamily:SANS, width:"100%",
                    transition:"background 0.12s, color 0.12s",
                  }}
                  onMouseEnter={e => { if(!active){ e.currentTarget.style.background=T.sideNavB; e.currentTarget.style.color="#D6D0C8"; }}}
                  onMouseLeave={e => { if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#78716c"; }}}
                  >
                    <Icon size={14} style={{ flexShrink:0 }}/>
                    {open && label}
                    {id==="inventory" && alerts>0 && open && (
                      <span style={{ marginLeft:"auto", fontSize:9, padding:"1px 5px", background:"#C0392B33", color:"#F08080", borderRadius:3, fontWeight:700, fontFamily:MONO }}>{alerts}</span>
                    )}
                    {id==="audit" && open && (
                      <span style={{ marginLeft:"auto", fontSize:8, padding:"1px 5px", background:"#0D737733", color:"#A8D5D6", borderRadius:3, fontWeight:700, fontFamily:SANS }}>NEW</span>
                    )}
                    {(id==="nlp"||id==="weather"||id==="cvaudit") && open && (
                      <span style={{ marginLeft:"auto", fontSize:8, padding:"1px 5px", background:"#C8873A33", color:"#F0C896", borderRadius:3, fontWeight:700, fontFamily:SANS }}>AI</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding:"10px 11px", borderTop:`1px solid ${T.sideNavB}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:"50%", background:T.teal, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700, flexShrink:0 }}>A</div>
            {open && (
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#D6D0C8", fontFamily:SANS }}>Admin</div>
                <div style={{ fontSize:10, color:"#57534e", fontFamily:SANS }}>admin@invenpro.in</div>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => setOpen(o => !o)} style={{ padding:"9px 11px", border:"none", background:"transparent", color:"#4A4845", cursor:"pointer", display:"flex", justifyContent: open ? "flex-end" : "center", borderTop:`1px solid ${T.sideNavB}` }}>
          <Menu size={13}/>
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Topbar */}
        <header style={{ background:T.surfBg, borderBottom:`1px solid ${T.bdr}`, padding:"0 18px", height:42, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:2, overflow:"hidden" }}>
            {SECTIONS.filter(s => s.group==="ops").map(s => (
              <button key={s.id} onClick={() => setPage(s.id)} style={{ padding:"4px 9px", border:"none", borderRadius:4, background:page===s.id?T.tealL:"transparent", color:page===s.id?T.teal:T.t4, fontSize:12, fontWeight:page===s.id?600:400, cursor:"pointer", fontFamily:SANS, whiteSpace:"nowrap" }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:T.pageBg, borderRadius:4, padding:"4px 10px", border:`1px solid ${T.bdr}` }}>
              <Search size={11} color={T.t3}/>
              <input value={gSearch} onChange={e => setGSearch(e.target.value)}
                placeholder="Global search…"
                style={{ border:"none", background:"transparent", outline:"none", fontSize:12, color:T.t1, width:130, fontFamily:SANS }}/>
            </div>

            <div style={{ position:"relative" }}>
              <button onClick={() => setNotifs(n => !n)} style={{ position:"relative", background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:4, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                <Bell size={13} color={T.t2}/>
                {alerts > 0 && <span style={{ position:"absolute", top:4, right:4, width:6, height:6, background:T.red, borderRadius:"50%", border:"1.5px solid #fff" }}/>}
              </button>

              {notifs && (
                <div style={{ position:"absolute", right:0, top:36, width:290, background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, boxShadow:"0 4px 20px rgba(0,0,0,0.12)", zIndex:999 }}>
                  <div style={{ padding:"10px 14px", borderBottom:`1px solid ${T.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS }}>Notifications</span>
                    <button onClick={() => setPage("notifications")} style={{ fontSize:11, color:T.teal, background:"none", border:"none", cursor:"pointer", fontFamily:SANS }}>Manage →</button>
                  </div>
                  {notifList.map((n,i) => (
                    <div key={i} style={{ padding:"10px 14px", borderBottom:i<notifList.length-1?`1px solid ${T.bdr2}`:"none", display:"flex", gap:10, alignItems:"flex-start" }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:n.color, marginTop:5, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:12, color:T.t1, fontFamily:SANS }}>{n.text}</div>
                        <div style={{ fontSize:10, color:T.t3, fontFamily:MONO, marginTop:2 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding:"8px 14px", borderTop:`1px solid ${T.bdr}` }}>
                    <button onClick={() => { setPage("audit"); setNotifs(false); }} style={{ fontSize:11, color:T.teal, background:"none", border:"none", cursor:"pointer", fontFamily:SANS }}>
                      View full audit trail →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ width:26, height:26, borderRadius:"50%", background:T.teal, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700 }}>A</div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex:1, overflowY:"auto", padding:"20px 22px" }} onClick={() => notifs && setNotifs(false)}>
          {page==="dashboard"    && <Dashboard     products={products} orders={orders} setPage={setPage}/>}
          {page==="inventory"    && <Inventory     products={products} setProducts={setProductsLogged}/>}
          {page==="orders"       && <Orders        orders={orders} setOrders={setOrdersLogged} products={products} setProducts={setProductsLogged}/>}
          {page==="manufacturing"&& <Manufacturing products={products} setProducts={setProductsLogged}/>}
          {page==="transfers"    && <Transfers     transfers={transfers} setTransfers={setTransfers} products={products} setProducts={setProductsLogged}/>}
          {page==="vendors"      && <Vendors/>}
          {page==="users"        && <UsersRoles/>}
          {page==="qc"           && <QualityControl   products={products} setProducts={setProductsLogged}/>}
          {page==="scrap"        && <ScrapManagement  products={products} setProducts={setProductsLogged}/>}
          {page==="putaway"      && <PutawayRules/>}
          {page==="fulfillment"  && <PickPackShip/>}
          {page==="backorders"   && <Backorders    products={products} setProducts={setProductsLogged}/>}
          {page==="returns"      && <Returns       products={products} setProducts={setProductsLogged}/>}
          {page==="expiry"       && <ExpiryTracking/>}
          {page==="variants"     && <ProductVariants/>}
          {page==="pricelists"   && <PriceLists/>}
          {page==="dropship"     && <Dropshipping/>}
          {page==="analytics"    && <Analytics     products={products} orders={orders}/>}
          {page==="nlp"          && <NLPCommand    products={products} orders={orders}/>}
          {page==="weather"      && <WeatherEngine products={products}/>}
          {page==="cvaudit"      && <CVAudit       products={products}/>}
          {page==="ai"           && <AIAssistant   products={products} orders={orders}/>}
          {page==="audit"        && <AuditTrail    auditLog={auditLog}/>}
          {page==="movements"    && <StockMovementReport movements={movements}/>}
          {page==="pdfexport"    && <PDFExport     products={products} orders={orders} auditLog={auditLog}/>}
          {page==="notifications"&& <EmailNotifications/>}
        </main>
      </div>
    </div>
  );
}

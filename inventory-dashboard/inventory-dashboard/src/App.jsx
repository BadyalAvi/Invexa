import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  LayoutGrid, Package, ShoppingCart, Factory, BarChart2,
  Bot, Bell, Search, Warehouse, AlertTriangle, Truck,
  Menu, Users, ArrowRight, Cloud, Camera, MessageSquare,
  Shield, Trash2, MapPin, Send, RefreshCw, RotateCcw,
  Calendar, Layers, Tag, PackageOpen, Activity, FileText,
  Mail, TrendingUp, LogOut, ChevronDown, User, Wifi, WifiOff,
} from "lucide-react";
import {
  T, MONO, SANS, weatherData, fmtINR, fmtK, revData as fallbackRevData
} from "./data.js";
import { KPI, Badge } from "./ui.jsx";
import { Inventory, Orders, Manufacturing, Transfers, Vendors, UsersRoles } from "./modules.jsx";
import {
  QualityControl, ScrapManagement, PutawayRules, PickPackShip,
  Backorders, Returns, ExpiryTracking, ProductVariants,
  PriceLists, Dropshipping,
} from "./highpriority.jsx";
import { Analytics, NLPCommand, WeatherEngine, CVAudit, AIAssistant } from "./features.jsx";
import { AuditTrail, PDFExport, EmailNotifications, StockMovementReport } from "./tier1.jsx";
import LoginPage from "./LoginPage.jsx";
import { authAPI } from "./api.js";
import { useApp } from "./hooks/useApp.js";

// ─── DASHBOARD (100% LIVE DATA) ───────────────────────────────────────────────
function Dashboard({ products, orders, dashStats, setPage }) {
  const isLive = !!dashStats;

  // 1. LIVE KPIs
  const totalVal  = dashStats?.products?.total_cost_value ?? products.reduce((a,p) => a + (p.onHand||0) * (p.cost||0), 0);
  const totalSKUs = dashStats?.products?.total_skus ?? products.length;
  const pendSales = dashStats?.orders?.pending_sales ?? orders.filter(o => o.type==="sale" && o.status==="pending").length;
  const pendPurch = dashStats?.orders?.pending_purchases ?? orders.filter(o => o.type==="purchase" && o.status==="pending").length;
  const alerts    = dashStats
                    ? (Number(dashStats.products?.critical_count||0) + Number(dashStats.products?.low_count||0))
                    : products.filter(p => p.status !== "ok").length;

  // 2. LIVE P&L AREA CHART: Calculated strictly from real orders
  const liveRevData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return d.toLocaleString("en-IN", { month: "short" });
    });

    let hasRealData = false;
    const computedData = months.map(month => {
      const monthOrders = orders.filter(o => o.status === "done" && typeof o.date === "string" && o.date.includes(month));
      const revenue = monthOrders.filter(o => o.type === "sale").reduce((sum, o) => sum + (o.total || 0), 0) / 1000;
      const cost    = monthOrders.filter(o => o.type === "purchase").reduce((sum, o) => sum + (o.total || 0), 0) / 1000;
      if (revenue > 0 || cost > 0) hasRealData = true;
      return { month, revenue: Math.round(revenue), cost: Math.round(cost), profit: Math.round(revenue - cost) };
    });
    
    return hasRealData ? computedData : fallbackRevData; 
  }, [orders]);

  // 3. LIVE PIE CHART: Calculated strictly from live inventory categories
  const pieColors = [T.teal, T.amber, T.blue, T.green, T.red, T.purple];
  const pieData = useMemo(() => {
    if (products.length === 0) return [{ name: "No Data", value: 1, color: T.t3 }];
    const cats = {};
    products.forEach(p => {
      const c = p.category || "Uncategorized";
      cats[c] = (cats[c] || 0) + (p.onHand || 0);
    });
    return Object.entries(cats)
      .filter(([_, val]) => val > 0)
      .map(([name, value], i) => ({ name, value, color: pieColors[i % pieColors.length] }))
      .sort((a,b) => b.value - a.value);
  }, [products]);

  // 4. LIVE SYSTEM ALERTS: Read directly from products and orders states
  const dynamicTips = useMemo(() => {
    const critical = products.filter(p => p.status === "critical");
    const low = products.filter(p => p.status === "low");
    const tips = [];
    critical.slice(0,2).forEach(p => tips.push({ color:T.red, bg:T.redL, icon:"⚠", title:"Critical Stock-out Risk", body:`${p.name} (${p.code}) has 0 stock available. Reorder immediately.` }));
    low.slice(0,2).forEach(p => tips.push({ color:T.amber, bg:T.amberL, icon:"◉", title:"Low Stock Alert", body:`${p.name} drops below minimum. ${p.onHand} units left.` }));
    if (pendSales > 5) tips.push({ color:T.blue, bg:T.blueL, icon:"📦", title:"Fulfillment Backlog", body:`You have ${pendSales} pending sales orders awaiting dispatch.` });
    return tips;
  }, [products, pendSales]);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:20, paddingBottom:14, borderBottom:`1px solid ${T.bdr}` }}>
        <div>
          <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:T.t1, fontFamily:SANS, letterSpacing:"-0.3px" }}>Dashboard</h1>
          <p style={{ margin:"3px 0 0", fontSize:12, color:T.t3, fontFamily:SANS, display:"flex", alignItems:"center" }}>
            Live overview · {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})} · All warehouses
            {isLive ? (
              <span style={{ display:"flex", alignItems:"center", gap:4, color:T.green, fontWeight:600, marginLeft:12, background:T.greenL, padding:"1px 6px", borderRadius:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:T.green, display:"inline-block" }}></span> Database Connected
              </span>
            ) : (
              <span style={{ display:"flex", alignItems:"center", gap:4, color:T.amber, fontWeight:600, marginLeft:12, background:T.amberL, padding:"1px 6px", borderRadius:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:T.amber, display:"inline-block" }}></span> Offline Mode
              </span>
            )}
          </p>
        </div>
        {weatherData.forecast[0].rain > 70 && (
          <button onClick={() => setPage("weather")} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:T.blueL, border:`1px solid ${T.blueB}`, borderRadius:5, fontSize:12, color:T.blue, fontFamily:SANS, cursor:"pointer" }}>
            🌧 Heavy rain forecast · Check Weather Engine →
          </button>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <KPI label="Stock Value"    value={fmtK(totalVal)}  sub={`${totalSKUs} SKUs`}    delta="Live"  up    Icon={Warehouse}     />
        <KPI label="Pending Sales"  value={pendSales}        sub="need dispatch"          delta="Live"     up={false} Icon={ShoppingCart} accent={T.blue}  />
        <KPI label="Pending Inward" value={pendPurch}        sub="purchase orders"        delta="Live"     up    Icon={Truck}          accent={T.green} />
        <KPI label="Stock Alerts"   value={alerts}           sub="low / critical"         delta="urgent" up={false} Icon={AlertTriangle} accent={T.red}   />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2.2fr 1fr", gap:14, marginBottom:20 }}>
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>Revenue · Cost · Profit</div>
              <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginTop:2 }}>Last 6 Months · ₹000s</div>
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
            {/* THIS IS THE FIX: Using liveRevData instead of revData */}
            <AreaChart data={liveRevData}>
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
              <Tooltip formatter={(v,n) => ["₹"+v+"k",n]} contentStyle={{ fontSize:12, border:`1px solid ${T.bdr}`, borderRadius:5, boxShadow:"none", fontFamily:SANS }}/>
              <Area type="monotone" dataKey="revenue" stroke={T.teal}  fill="url(#gT)" strokeWidth={2}/>
              <Area type="monotone" dataKey="profit"  stroke={T.green} fill="url(#gG)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:4 }}>Stock by Category</div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginBottom:10 }}>Total units on hand</div>
          <ResponsiveContainer width="100%" height={150}>
            {/* THIS IS THE FIX: Using dynamic pieData */}
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={4}>
                {pieData.map((d,i) => <Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip contentStyle={{ fontSize:12, fontFamily:SANS, border:`1px solid ${T.bdr}`, borderRadius:5, boxShadow:"none" }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ maxHeight:70, overflowY:"auto", paddingRight:4 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, marginTop:6 }}>
                <span style={{ display:"flex", alignItems:"center", gap:6, color:T.t2, fontFamily:SANS }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:"inline-block" }}/>{d.name}
                </span>
                <span style={{ fontFamily:MONO, fontWeight:600, color:T.t1 }}>{d.value}</span>
              </div>
            ))}
          </div>
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
              {orders.length === 0 && <tr><td colSpan={4} style={{ padding:20, textAlign:"center", color:T.t3, fontSize:12, fontFamily:SANS }}>No orders found.</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
          <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`, display:"flex", alignItems:"center", gap:8 }}>
            <Bot size={13} color={T.teal}/>
            <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>System Alerts</span>
          </div>
          <div style={{ padding:12, display:"flex", flexDirection:"column", gap:8 }}>
            {/* THIS IS THE FIX: Using dynamicTips generated from live database products */}
            {dynamicTips.map((tip,i) => (
              <div key={i} style={{ background:tip.bg, borderRadius:5, padding:"10px 12px", borderLeft:`3px solid ${tip.color}` }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:2 }}>{tip.icon} {tip.title}</div>
                <div style={{ fontSize:11, color:T.t2, fontFamily:SANS, lineHeight:1.5 }}>{tip.body}</div>
              </div>
            ))}
            {dynamicTips.length === 0 && (
              <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, textAlign:"center", padding:"20px 0" }}>
                All inventory levels look great! No critical alerts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id:"dashboard",    label:"Dashboard",        Icon:LayoutGrid,   group:"ops"     },
  { id:"inventory",    label:"Inventory",         Icon:Package,      group:"ops"     },
  { id:"orders",       label:"Orders",            Icon:ShoppingCart, group:"ops"     },
  { id:"manufacturing",label:"Manufacturing",     Icon:Factory,      group:"ops"     },
  { id:"transfers",    label:"Transfers",         Icon:ArrowRight,   group:"ops"     },
  { id:"vendors",      label:"Vendors",           Icon:Truck,        group:"ops"     },
  { id:"users",        label:"Users & Roles",     Icon:Users,        group:"ops"     },
  { id:"qc",           label:"Quality Control",   Icon:Shield,       group:"wh"      },
  { id:"scrap",        label:"Scrap / Damaged",   Icon:Trash2,       group:"wh"      },
  { id:"putaway",      label:"Putaway Rules",     Icon:MapPin,       group:"wh"      },
  { id:"fulfillment",  label:"Pick→Pack→Ship",    Icon:Send,         group:"wh"      },
  { id:"backorders",   label:"Backorders",        Icon:RefreshCw,    group:"wh"      },
  { id:"returns",      label:"Returns",           Icon:RotateCcw,    group:"wh"      },
  { id:"expiry",       label:"Expiry / FEFO",     Icon:Calendar,     group:"wh"      },
  { id:"variants",     label:"Variants",          Icon:Layers,       group:"wh"      },
  { id:"pricelists",   label:"Price Lists",       Icon:Tag,          group:"wh"      },
  { id:"dropship",     label:"Dropshipping",      Icon:PackageOpen,  group:"wh"      },
  { id:"analytics",    label:"Analytics",         Icon:BarChart2,    group:"intel"   },
  { id:"nlp",          label:"NLP Command",       Icon:MessageSquare,group:"intel"   },
  { id:"weather",      label:"Context Engine",    Icon:Cloud,        group:"intel"   },
  { id:"cvaudit",      label:"CV Audit",          Icon:Camera,       group:"intel"   },
  { id:"ai",           label:"AI Assistant",      Icon:Bot,          group:"intel"   },
  { id:"audit",        label:"Audit Trail",       Icon:Activity,     group:"reports" },
  { id:"movements",    label:"Stock Movements",   Icon:TrendingUp,   group:"reports" },
  { id:"pdfexport",    label:"PDF & Reports",     Icon:FileText,     group:"reports" },
  { id:"notifications",label:"Email Alerts",      Icon:Mail,         group:"reports" },
];

const GROUPS = [
  { id:"ops",     label:"Operations"   },
  { id:"wh",      label:"Warehouse"    },
  { id:"intel",   label:"Intelligence" },
  { id:"reports", label:"Reports"      },
];

const ROLE_COLORS = {
  admin:   { bg:"#FCECEA", fg:"#C0392B" },
  manager: { bg:"#FDF3E7", fg:"#C8873A" },
  staff:   { bg:"#E8F5F5", fg:"#0D7377" },
  viewer:  { bg:"#F2EFE9", fg:"#6E6A66" },
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,      setUser]      = useState(() => authAPI.currentUser());
  const [authReady, setAuthReady] = useState(false);
  const [page,      setPage]      = useState("dashboard");
  const [sideOpen,  setSideOpen]  = useState(true);
  const [gSearch,   setGSearch]   = useState("");
  const [notifs,    setNotifs]    = useState(false);
  const [userMenu,  setUserMenu]  = useState(false);

  // ── Detect reset-password link: ?view=reset&token=xxx ────────────────────────
  const [initView, setInitView] = useState("login");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view   = params.get("view");
    if (view === "reset" && params.get("token")) {
      setInitView("reset");
    }
  }, []);

  // ── All data + API via single hook ────────────────────────────────────────────
  const {
    products, setProducts,
    orders,   setOrders,
    transfers, setTransfers,
    vendors,  setVendors,
    auditLog, movements, dashStats,
    isLoading, isFullyOnline,
    refreshAll,
    addProduct, updateProduct, deleteProduct, adjustStock,
    createOrder, changeStatus,
    createTransfer,
    addVendor, updateVendor, deleteVendor,
  } = useApp();

  // ── Auth check on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    const stored = authAPI.currentUser();
    setUser(stored && authAPI.isLoggedIn() ? stored : null);
    setAuthReady(true);
  }, []);

  const handleLogin  = (u) => {
    setUser(u);
    setPage("dashboard");
    // Clean up URL if we came from reset link
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    setUser(null);
    setUserMenu(false);
    setPage("dashboard");
  };

  // ── Loading splash ────────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:T.sideNav, fontFamily:SANS }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:40, height:40, border:`3px solid #1E2D3D`, borderTop:`3px solid ${T.teal}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }}/>
          <div style={{ color:"#78716c", fontSize:13 }}>Loading InvenPro…</div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Show login/register/reset if not authenticated ─────────────────────────────
  if (!user) {
    return <LoginPage onLogin={handleLogin} initialView={initView}/>;
  }

  const alerts  = products.filter(p => p.status !== "ok").length;
  const roleCfg = ROLE_COLORS[user.role] || ROLE_COLORS.viewer;

  const notifList = [
    { text:"Wireless Mouse stock is critically low",  time:"2m ago",  color:T.red   },
    { text:"PO-0201 from Supplier Alpha is pending",  time:"15m ago", color:T.amber },
    { text:"Work Order WO-001 is 65% complete",       time:"1h ago",  color:T.blue  },
    { text:"USB-C Hub demand spike detected",          time:"2h ago",  color:T.green },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", background:T.pageBg, fontFamily:SANS, overflow:"hidden" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:sideOpen?220:48, minWidth:sideOpen?220:48, background:T.sideNav, display:"flex", flexDirection:"column", transition:"width 0.2s", overflow:"hidden", flexShrink:0 }}>

        {/* Logo */}
        <div style={{ padding:"12px 11px", display:"flex", alignItems:"center", gap:9, borderBottom:`1px solid ${T.sideNavB}` }}>
          <div style={{ width:26, height:26, borderRadius:4, background:T.teal, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Package size={13} color="#fff"/>
          </div>
          {sideOpen && <span style={{ color:"#F0EDE8", fontWeight:700, fontSize:13, letterSpacing:"-0.2px", whiteSpace:"nowrap", fontFamily:SANS }}>InvenPro</span>}
          {sideOpen && (
            <div style={{ marginLeft:"auto" }}>
              {isFullyOnline
                ? <Wifi size={10} color={T.green}/>
                : <WifiOff size={10} color="#57534e"/>}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"6px", overflowY:"auto", display:"flex", flexDirection:"column" }}>
          {GROUPS.map(grp => (
            <div key={grp.id} style={{ marginBottom:6 }}>
              {sideOpen && (
                <div style={{ padding:"8px 10px 3px", fontSize:9.5, fontWeight:700, color:"#3d5166", textTransform:"uppercase", letterSpacing:"0.09em", fontFamily:SANS, whiteSpace:"nowrap" }}>
                  {grp.label}
                </div>
              )}
              {SECTIONS.filter(s => s.group===grp.id).map(({ id, label, Icon }) => {
                const active = page === id;
                return (
                  <button key={id} onClick={() => setPage(id)} style={{
                    display:"flex", alignItems:"center", gap:9,
                    padding: sideOpen ? "7px 10px" : "8px",
                    justifyContent: sideOpen ? "flex-start" : "center",
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
                    {sideOpen && label}
                    {id==="inventory" && alerts>0 && sideOpen && (
                      <span style={{ marginLeft:"auto", fontSize:9, padding:"1px 5px", background:"#C0392B33", color:"#F08080", borderRadius:3, fontWeight:700, fontFamily:MONO }}>{alerts}</span>
                    )}
                    {id==="audit" && sideOpen && (
                      <span style={{ marginLeft:"auto", fontSize:8, padding:"1px 5px", background:"#0D737733", color:"#A8D5D6", borderRadius:3, fontWeight:700, fontFamily:SANS }}>LIVE</span>
                    )}
                    {(id==="nlp"||id==="weather"||id==="cvaudit"||id==="ai") && sideOpen && (
                      <span style={{ marginLeft:"auto", fontSize:8, padding:"1px 5px", background:"#C8873A33", color:"#F0C896", borderRadius:3, fontWeight:700, fontFamily:SANS }}>AI</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div style={{ borderTop:`1px solid ${T.sideNavB}`, position:"relative" }}>
          <button onClick={() => setUserMenu(u => !u)}
            style={{ width:"100%", padding:"10px 11px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:"50%", background:T.teal, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700, flexShrink:0 }}>
              {user.name?.charAt(0)||"A"}
            </div>
            {sideOpen && (
              <>
                <div style={{ flex:1, textAlign:"left" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#D6D0C8", fontFamily:SANS, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:120 }}>{user.name}</div>
                  <span style={{ fontSize:9, padding:"1px 5px", borderRadius:2, background:roleCfg.bg, color:roleCfg.fg, fontWeight:600, fontFamily:SANS }}>{user.role}</span>
                </div>
                <ChevronDown size={12} color="#57534e" style={{ transform:userMenu?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
              </>
            )}
          </button>

          {userMenu && sideOpen && (
            <div style={{ position:"absolute", bottom:"100%", left:0, right:0, background:"#1E2D3D", border:`1px solid ${T.sideNavB}`, borderRadius:6, padding:"6px", margin:"0 6px 4px", boxShadow:"0 -4px 16px rgba(0,0,0,0.3)", zIndex:999 }}>
              <div style={{ padding:"8px 10px", borderBottom:"1px solid #2A3D52", marginBottom:6 }}>
                <div style={{ fontSize:12, color:"#D6D0C8", fontFamily:SANS, fontWeight:600 }}>{user.name}</div>
                <div style={{ fontSize:11, color:"#57534e", fontFamily:MONO, marginTop:2 }}>{user.email}</div>
                <div style={{ fontSize:11, color:"#57534e", fontFamily:SANS, marginTop:2 }}>Warehouse: {user.warehouse||"All"}</div>
                <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:5 }}>
                  {isFullyOnline
                    ? <><Wifi size={10} color={T.green}/><span style={{ fontSize:10, color:T.green, fontFamily:SANS }}>Backend connected</span></>
                    : <><WifiOff size={10} color="#57534e"/><span style={{ fontSize:10, color:"#57534e", fontFamily:SANS }}>Offline mode</span></>}
                </div>
              </div>
              <button onClick={() => { setPage("users"); setUserMenu(false); }}
                style={{ width:"100%", padding:"7px 10px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, borderRadius:4, color:"#9A9490", fontSize:12, fontFamily:SANS }}
                onMouseEnter={e => e.currentTarget.style.background="#2A3D52"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                <User size={13}/> Profile & Settings
              </button>
              <button onClick={() => { refreshAll(); setUserMenu(false); }}
                style={{ width:"100%", padding:"7px 10px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, borderRadius:4, color:"#9A9490", fontSize:12, fontFamily:SANS }}
                onMouseEnter={e => e.currentTarget.style.background="#2A3D52"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                <RefreshCw size={13}/> Refresh All Data
              </button>
              <button onClick={handleLogout}
                style={{ width:"100%", padding:"7px 10px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, borderRadius:4, color:"#F08080", fontSize:12, fontFamily:SANS }}
                onMouseEnter={e => e.currentTarget.style.background="#2A3D52"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                <LogOut size={13}/> Sign Out
              </button>
            </div>
          )}
        </div>

        <button onClick={() => setSideOpen(o => !o)} style={{ padding:"9px 11px", border:"none", background:"transparent", color:"#4A4845", cursor:"pointer", display:"flex", justifyContent:sideOpen?"flex-end":"center", borderTop:`1px solid ${T.sideNavB}` }}>
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
            {/* API status pill */}
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:99, background:isFullyOnline?T.greenL:T.surfAlt, border:`1px solid ${isFullyOnline?T.greenB:T.bdr}` }}>
              {isFullyOnline
                ? <><Wifi size={10} color={T.green}/><span style={{ fontSize:10, color:T.green, fontFamily:SANS, fontWeight:600 }}>Live</span></>
                : <><WifiOff size={10} color={T.t3}/><span style={{ fontSize:10, color:T.t3, fontFamily:SANS }}>Offline</span></>}
            </div>

            {/* Refresh */}
            <button onClick={refreshAll} title="Refresh all data"
              style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:4, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center", color:T.t3 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.teal; e.currentTarget.style.color=T.teal; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr;  e.currentTarget.style.color=T.t3;  }}>
              <RefreshCw size={12}/>
            </button>

            {/* Search */}
            <div style={{ display:"flex", alignItems:"center", gap:6, background:T.pageBg, borderRadius:4, padding:"4px 10px", border:`1px solid ${T.bdr}` }}>
              <Search size={11} color={T.t3}/>
              <input value={gSearch} onChange={e => setGSearch(e.target.value)}
                placeholder="Global search…"
                style={{ border:"none", background:"transparent", outline:"none", fontSize:12, color:T.t1, width:130, fontFamily:SANS }}/>
            </div>

            {/* Notifications */}
            <div style={{ position:"relative" }}>
              <button onClick={() => { setNotifs(n => !n); setUserMenu(false); }}
                style={{ position:"relative", background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:4, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center" }}>
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

            {/* Avatar + role + logout */}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:T.teal, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700 }}>
                {user.name?.charAt(0)||"A"}
              </div>
              <div style={{ display:"flex", flexDirection:"column" }}>
                <span style={{ fontSize:11, fontWeight:600, color:T.t1, fontFamily:SANS, lineHeight:1.2 }}>{user.name}</span>
                <span style={{ fontSize:9, padding:"1px 5px", borderRadius:2, background:roleCfg.bg, color:roleCfg.fg, fontWeight:600, fontFamily:SANS }}>{user.role}</span>
              </div>
              <button onClick={handleLogout} title="Sign out"
                style={{ background:"none", border:`1px solid ${T.bdr}`, borderRadius:4, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center", color:T.t3 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.red; e.currentTarget.style.color=T.red; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.t3; }}>
                <LogOut size={12}/>
              </button>
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}
          onClick={() => { notifs && setNotifs(false); userMenu && setUserMenu(false); }}>

          {isLoading && (
            <div style={{ height:2, background:T.teal, marginBottom:16, borderRadius:99, animation:"pulse 1.5s ease-in-out infinite", opacity:0.7 }}/>
          )}

          {page==="dashboard"    && <Dashboard      products={products} orders={orders} dashStats={dashStats} setPage={setPage}/>}
          {page==="inventory"    && <Inventory      products={products} setProducts={setProducts} onAdd={addProduct} onDelete={deleteProduct} onUpdate={updateProduct}/>}
          {page==="orders"       && <Orders         orders={orders} setOrders={setOrders} products={products} setProducts={setProducts} onCreateOrder={createOrder} onChangeStatus={changeStatus}/>}
          {page==="manufacturing"&& <Manufacturing  products={products} setProducts={setProducts}/>}
          {page==="transfers"    && <Transfers      transfers={transfers} setTransfers={setTransfers} products={products} setProducts={setProducts} onCreateTransfer={createTransfer}/>}
          {page==="vendors"      && <Vendors        vendors={vendors} setVendors={setVendors} onAdd={addVendor} onUpdate={updateVendor} onDelete={deleteVendor}/>}
          {page==="users"        && <UsersRoles/>}
          {page==="qc"           && <QualityControl   products={products} setProducts={setProducts}/>}
          {page==="scrap"        && <ScrapManagement  products={products} setProducts={setProducts}/>}
          {page==="putaway"      && <PutawayRules/>}
          {page==="fulfillment"  && <PickPackShip/>}
          {page==="backorders"   && <Backorders     products={products} setProducts={setProducts}/>}
          {page==="returns"      && <Returns        products={products} setProducts={setProducts}/>}
          {page==="expiry"       && <ExpiryTracking/>}
          {page==="variants"     && <ProductVariants/>}
          {page==="pricelists"   && <PriceLists products={products}/>}
          {page==="dropship"     && <Dropshipping/>}
          {page==="analytics"    && <Analytics      products={products} orders={orders}/>}
          {page==="nlp"          && <NLPCommand     products={products} orders={orders}/>}
          {page==="weather"      && <WeatherEngine  products={products}/>}
          {page==="cvaudit"      && <CVAudit        products={products}/>}
          {page==="ai"           && <AIAssistant    products={products} orders={orders}/>}
          {page==="audit"        && <AuditTrail     auditLog={auditLog}/>}
          {page==="movements"    && <StockMovementReport movements={movements}/>}
          {page==="pdfexport"    && <PDFExport      products={products} orders={orders} auditLog={auditLog}/>}
          {page==="notifications"&& <EmailNotifications/>}
        </main>
      </div>

      <style>{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
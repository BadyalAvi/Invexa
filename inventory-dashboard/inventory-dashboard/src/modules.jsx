import { useState, useMemo } from "react";
import {
  Package, ShoppingCart, Factory, Truck, ArrowRight,
  Plus, Download, Trash2, X, Edit, Eye,
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity,
  DollarSign, Users, Warehouse, Star, Shield,
  Layers, RefreshCw, Send, RotateCcw, Link, MapPin,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { T, MONO, SANS, SC, PRI, WAREHOUSES, fmtINR, fmtK, uid, today, initBOMs, initWorkOrders, initVendors, initUsers, blockchainLog } from "./data.js";
import { Badge, PriBadge, KPI, PageTitle, Btn, TH, TD, SectionCard, Modal, Field, Input, Select, FormGrid, AlertBanner } from "./ui.jsx";

// ─── computeStatus: recalculate low/critical after stock changes ───────────────
export function computeStatus(p) {
  if (p.onHand <= 0)           return "critical";
  if (p.onHand <= p.reorder)   return "low";
  return "ok";
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────
export function Inventory({ products, setProducts }) {
  const [search, setSearch]   = useState("");
  const [cat, setCat]         = useState("All");
  const [wh, setWh]           = useState("All");
  const [sel, setSel]         = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [detailP, setDetailP] = useState(null);
  const [np, setNp] = useState({
    code:"", name:"", category:"Furniture", onHand:0, cost:0,
    price:0, reorder:5, max:20, unit:"pcs",
    warehouse:"WH/Main", route:"Buy", valuation:"FIFO",
  });

  const cats = ["All", ...new Set(products.map(p => p.category))];

  const filtered = useMemo(() => products.filter(p =>
    (cat === "All" || p.category === cat) &&
    (wh  === "All" || p.warehouse === wh)  &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.code.toLowerCase().includes(search.toLowerCase()))
  ), [products, cat, wh, search]);

  const totalCost   = products.reduce((a, p) => a + p.onHand * p.cost, 0);
  const totalRetail = products.reduce((a, p) => a + p.onHand * p.price, 0);

  const addProduct = () => {
    if (!np.code || !np.name) return;
    const reserved  = 0;
    const available = np.onHand;
    const status    = computeStatus({ onHand:np.onHand, reorder:np.reorder });
    setProducts(prev => [...prev, {
      ...np, id:Date.now(), reserved, available, status,
      batches:[{ id:`B${uid()}`, qty:np.onHand, exp:"Dec 2027", serial:null }],
    }]);
    setAddOpen(false);
    setNp({ code:"", name:"", category:"Furniture", onHand:0, cost:0, price:0, reorder:5, max:20, unit:"pcs", warehouse:"WH/Main", route:"Buy", valuation:"FIFO" });
  };

  const deleteProduct = id => setProducts(prev => prev.filter(p => p.id !== id));
  const toggleSel = id => setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div>
      <PageTitle
        title="Inventory & Stock"
        sub={`${products.length} SKUs · Cost value: ${fmtINR(totalCost)} · Retail value: ${fmtINR(totalRetail)}`}
        actions={<>
          <Btn Icon={Download}>Export CSV</Btn>
          <Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Add Product</Btn>
        </>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total SKUs"    value={products.length}                                   sub="products"         Icon={Package}       />
        <KPI label="Stock Value"   value={fmtK(totalCost)}                                   sub="at cost"          Icon={DollarSign}    />
        <KPI label="Retail Value"  value={fmtK(totalRetail)}                                 sub="at sell price"    Icon={DollarSign}    accent={T.green} />
        <KPI label="Low Stock"     value={products.filter(p=>p.status==="low").length}       sub="reorder soon"     Icon={AlertTriangle} accent={T.amber} />
        <KPI label="Critical"      value={products.filter(p=>p.status==="critical").length}  sub="order now"        Icon={XCircle}       accent={T.red}   />
      </div>

      {/* Warehouse filter */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {["All", ...WAREHOUSES].map(w => (
          <button key={w} onClick={() => setWh(w)} style={{
            padding:"4px 11px", border:`1px solid ${wh===w?T.teal:T.bdr}`,
            borderRadius:4, background:wh===w?T.teal:T.surfBg,
            color:wh===w?"#fff":T.t2, fontSize:11.5,
            cursor:"pointer", fontFamily:SANS, fontWeight:wh===w?600:400,
          }}>
            <MapPin size={10} style={{ marginRight:4, verticalAlign:"middle" }}/>{w}
          </button>
        ))}
      </div>

      {/* Search + category bar */}
      <div style={{
        background:T.surfBg, border:`1px solid ${T.bdr}`,
        borderRadius:"6px 6px 0 0", borderBottom:"none",
        padding:"9px 13px", display:"flex", alignItems:"center", gap:10,
      }}>
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          background:T.pageBg, borderRadius:4, padding:"5px 10px",
          border:`1px solid ${T.bdr}`, flex:1, maxWidth:300,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            style={{ border:"none", background:"transparent", outline:"none", fontSize:12, color:T.t1, width:"100%", fontFamily:SANS }}/>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding:"4px 10px", border:`1px solid ${cat===c?T.teal:T.bdr}`,
              borderRadius:4, background:cat===c?T.teal:T.surfBg,
              color:cat===c?"#fff":T.t2, fontSize:11.5,
              cursor:"pointer", fontFamily:SANS, fontWeight:cat===c?600:400,
            }}>{c}</button>
          ))}
        </div>
        {sel.length > 0 && (
          <span style={{ fontSize:12, color:T.teal, fontWeight:600, fontFamily:SANS, marginLeft:"auto" }}>
            {sel.length} selected
          </span>
        )}
      </div>

      {/* Add form */}
      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderTop:"none", padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontWeight:600, fontSize:13, color:T.t1, fontFamily:SANS }}>Add New Product</span>
            <button onClick={() => setAddOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3 }}><X size={15}/></button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:9 }}>
            {[
              ["SKU Code","code","text"], ["Name","name","text"],
              ["Category","category","text"], ["Unit","unit","text"],
              ["On Hand","onHand","number"], ["Cost ₹","cost","number"],
              ["Price ₹","price","number"], ["Reorder Pt.","reorder","number"],
              ["Max Stock","max","number"],
            ].map(([lbl,k,tp]) => (
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={np[k]}
                  onChange={e => setNp(p => ({ ...p, [k]: tp==="number"?Number(e.target.value):e.target.value }))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:tp==="number"?MONO:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Valuation</div>
              <select value={np.valuation} onChange={e => setNp(p=>({...p,valuation:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1, background:T.surfBg }}>
                <option>FIFO</option><option>LIFO</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Warehouse</div>
              <select value={np.warehouse} onChange={e => setNp(p=>({...p,warehouse:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1, background:T.surfBg }}>
                {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Route</div>
              <select value={np.route} onChange={e => setNp(p=>({...p,route:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1, background:T.surfBg }}>
                <option>Buy</option><option>Manufacture</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={addProduct} disabled={!np.code||!np.name}>Save Product</Btn>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:"0 0 6px 6px", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
              <th style={{ padding:"8px 13px", background:"#F2EFE9", width:36 }}>
                <input type="checkbox" onChange={e => setSel(e.target.checked ? filtered.map(p=>p.id) : [])}/>
              </th>
              {["SKU","Product","Category","Warehouse","On Hand","Reserved","Available","Val.","Cost","Price","Reorder","Route","Status",""].map(h => <TH key={h}>{h}</TH>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}
                style={{ borderBottom:`1px solid ${T.bdr2}`, background:sel.includes(p.id)?T.tealL:"transparent", transition:"background 0.1s" }}
                onMouseEnter={e => { if(!sel.includes(p.id)) e.currentTarget.style.background=T.surfAlt; }}
                onMouseLeave={e => { if(!sel.includes(p.id)) e.currentTarget.style.background="transparent"; }}
              >
                <TD><input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggleSel(p.id)}/></TD>
                <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.teal, fontWeight:600 }}>{p.code}</TD>
                <TD>
                  <button onClick={() => setDetailP(p)}
                    style={{ fontWeight:600, color:T.t1, background:"none", border:"none", cursor:"pointer", fontFamily:SANS, fontSize:13, padding:0, textAlign:"left" }}>
                    {p.name}
                  </button>
                </TD>
                <TD><span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, background:T.surfAlt, color:T.t4, border:`1px solid ${T.bdr}`, fontFamily:SANS }}>{p.category}</span></TD>
                <TD style={{ fontSize:11, color:T.t3 }}>{p.warehouse}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700, color:p.onHand<=p.reorder?T.red:T.t1 }}>{p.onHand} {p.unit}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3 }}>{p.reserved}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:600, color:p.available===0?T.red:T.green }}>{p.available}</TD>
                <TD>
                  <span style={{ fontSize:10, padding:"2px 6px", borderRadius:3, background:p.valuation==="FIFO"?T.blueL:T.purpleL, color:p.valuation==="FIFO"?T.blue:T.purple, border:`1px solid ${p.valuation==="FIFO"?T.blueB:T.purpleB}`, fontFamily:MONO, fontWeight:600 }}>{p.valuation}</span>
                </TD>
                <TD style={{ fontFamily:MONO }}>{fmtINR(p.cost)}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:600, color:T.t1 }}>{fmtINR(p.price)}</TD>
                <TD style={{ fontFamily:MONO, color:p.onHand<=p.reorder?T.red:T.t3 }}>{p.reorder}</TD>
                <TD>
                  <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:p.route==="Buy"?T.greenL:T.amberL, color:p.route==="Buy"?T.green:T.amber, border:`1px solid ${p.route==="Buy"?T.greenB:T.amberB}`, fontFamily:SANS }}>{p.route}</span>
                </TD>
                <TD><Badge status={p.status}/></TD>
                <TD>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => setDetailP(p)} style={{ background:"none", border:"none", cursor:"pointer", color:T.teal, padding:3 }}><Eye size={13}/></button>
                    <button onClick={() => deleteProduct(p.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, padding:3 }}><Trash2 size={13}/></button>
                  </div>
                </TD>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={15} style={{ padding:"32px 0", textAlign:"center", color:T.t3, fontFamily:SANS, fontSize:13 }}>No products found</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ padding:"8px 14px", borderTop:`1px solid ${T.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{filtered.length} of {products.length} products</span>
        </div>
      </div>

      {/* Detail Modal */}
      {detailP && (
        <Modal title={`${detailP.name} — ${detailP.code}`} onClose={() => setDetailP(null)} width={580}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              ["SKU",        detailP.code,                                           MONO],
              ["Category",   detailP.category,                                       SANS],
              ["Warehouse",  detailP.warehouse,                                      SANS],
              ["On Hand",    `${detailP.onHand} ${detailP.unit}`,                   MONO],
              ["Reserved",   `${detailP.reserved} ${detailP.unit}`,                 MONO],
              ["Available",  `${detailP.available} ${detailP.unit}`,                MONO],
              ["Valuation",  detailP.valuation,                                      MONO],
              ["Cost Price", fmtINR(detailP.cost),                                  MONO],
              ["Sell Price", fmtINR(detailP.price),                                 MONO],
              ["Margin",     `${((detailP.price-detailP.cost)/detailP.price*100).toFixed(1)}%`, MONO],
              ["Route",      detailP.route,                                          SANS],
              ["Status",     detailP.status,                                         SANS],
            ].map(([lbl,val]) => (
              <div key={lbl} style={{ padding:"10px 12px", background:T.pageBg, borderRadius:5, border:`1px solid ${T.bdr}` }}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:4 }}>{lbl}</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.t1, fontFamily:MONO }}>{val}</div>
              </div>
            ))}
          </div>
          {detailP.batches?.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:8 }}>Batch & Serial Tracking</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead><tr style={{ background:T.surfAlt, borderBottom:`1px solid ${T.bdr}` }}>
                  {["Batch ID","Qty","Expiry","Serial #"].map(h => (
                    <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontFamily:SANS, fontSize:10.5, color:T.t4, fontWeight:600, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {detailP.batches.map((b,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}>
                      <td style={{ padding:"7px 10px", fontFamily:MONO, color:T.teal, fontWeight:600 }}>{b.id}</td>
                      <td style={{ padding:"7px 10px", fontFamily:MONO }}>{b.qty}</td>
                      <td style={{ padding:"7px 10px", fontFamily:SANS, color:T.t3 }}>{b.exp}</td>
                      <td style={{ padding:"7px 10px", fontFamily:MONO, color:T.t3 }}>{b.serial || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export function Orders({ orders, setOrders, products, setProducts }) {
  const [tab, setTab]         = useState("all");
  const [search, setSearch]   = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [invModal, setInvModal] = useState(null);
  const [no, setNo] = useState({ type:"sale", customer:"", productCode:"", qty:1, status:"pending", priority:"normal" });
  const [err, setErr] = useState("");

  const filtered = orders
    .filter(o => tab==="all" || o.type===(tab==="sales"?"sale":"purchase"))
    .filter(o => o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()));

  const addOrder = () => {
    setErr("");
    const prod = products.find(p => p.code === no.productCode);
    if (!prod) { setErr("Product SKU not found. Check the code."); return; }
    if (no.type === "sale" && prod.available < no.qty) {
      setErr(`Not enough stock. Available: ${prod.available} ${prod.unit}`); return;
    }
    const total = no.type === "sale" ? prod.price * no.qty : prod.cost * no.qty;
    const pfx   = no.type === "sale" ? "SO" : "PO";
    const newId = `${pfx}-${String(orders.filter(o=>o.type===no.type).length+1043).padStart(4,"0")}`;

    // For sales: reserve stock immediately
    if (no.type === "sale") {
      setProducts(prev => prev.map(p => {
        if (p.code !== no.productCode) return p;
        const newReserved  = p.reserved + no.qty;
        const newAvailable = p.onHand - newReserved;
        return { ...p, reserved:newReserved, available:Math.max(0,newAvailable), status:computeStatus({...p, onHand:p.onHand}) };
      }));
    }

    setOrders(prev => [...prev, {
      ...no, id:newId, product:prod.name, total,
      date:today(), invoice:`INV-${uid()}`, payment:"pending", delivery:`DLV-${uid()}`,
    }]);
    setAddOpen(false);
    setNo({ type:"sale", customer:"", productCode:"", qty:1, status:"pending", priority:"normal" });
  };

  // Mark sale as done → reduce actual stock. Mark purchase as done → add stock.
  const changeStatus = (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const prod = products.find(p => p.name === order.product);

    setOrders(prev => prev.map(o => o.id===orderId ? {...o, status:newStatus, payment:newStatus==="done"?"paid":o.payment} : o));

    if (prod) {
      setProducts(prev => prev.map(p => {
        if (p.name !== order.product) return p;
        let updated = { ...p };
        if (order.type === "sale" && newStatus === "done") {
          // Deduct from onHand, release reservation
          updated.onHand    = Math.max(0, p.onHand - order.qty);
          updated.reserved  = Math.max(0, p.reserved - order.qty);
          updated.available = Math.max(0, updated.onHand - updated.reserved);
        }
        if (order.type === "sale" && newStatus === "cancel") {
          // Release reservation
          updated.reserved  = Math.max(0, p.reserved - order.qty);
          updated.available = Math.max(0, p.onHand - updated.reserved);
        }
        if (order.type === "purchase" && newStatus === "done") {
          // Add received stock
          updated.onHand    = p.onHand + order.qty;
          updated.available = updated.onHand - p.reserved;
        }
        updated.status = computeStatus(updated);
        return updated;
      }));
    }
  };

  const stages = ["pending","in_progress","done","cancel"];
  const saleTotal  = orders.filter(o=>o.type==="sale").reduce((a,o)=>a+o.total,0);
  const purchTotal = orders.filter(o=>o.type==="purchase").reduce((a,o)=>a+o.total,0);

  return (
    <div>
      <PageTitle
        title="Orders"
        sub="Sales & purchase orders · Invoices · Payment tracking"
        actions={<>
          <Btn Icon={Download}>Export</Btn>
          <Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>New Order</Btn>
        </>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Sales Revenue"   value={fmtK(saleTotal)}  sub={`${orders.filter(o=>o.type==="sale").length} orders`}     Icon={ShoppingCart} />
        <KPI label="Purchase Spend"  value={fmtK(purchTotal)} sub={`${orders.filter(o=>o.type==="purchase").length} orders`}  Icon={Truck}        accent={T.blue}  />
        <KPI label="Pending"         value={orders.filter(o=>o.status==="pending").length}                                     sub="awaiting action" Icon={Clock}   accent={T.amber} />
        <KPI label="Completed"       value={orders.filter(o=>o.status==="done").length}                                        sub="this period"     Icon={CheckCircle2} accent={T.green} />
      </div>

      {/* Kanban */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:12 }}>Order Pipeline</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {stages.map(stage => {
            const cfg = SC[stage];
            const stOrd = orders.filter(o => o.status === stage);
            return (
              <div key={stage} style={{ background:cfg.bg, borderRadius:5, padding:10, border:`1px solid ${cfg.br}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:10.5, fontWeight:700, color:cfg.fg, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{cfg.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, background:T.surfBg, color:cfg.fg, padding:"1px 7px", borderRadius:3, border:`1px solid ${cfg.br}`, fontFamily:MONO }}>{stOrd.length}</span>
                </div>
                {stOrd.slice(0,3).map(o => (
                  <div key={o.id} style={{ background:T.surfBg, borderRadius:4, padding:"8px 10px", marginBottom:5, border:`1px solid ${T.bdr}` }}>
                    <div style={{ fontFamily:MONO, fontSize:11.5, fontWeight:700, color:T.teal, marginBottom:2 }}>{o.id}</div>
                    <div style={{ fontSize:12, color:T.t2, fontFamily:SANS, marginBottom:4 }}>{o.customer}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontFamily:MONO, fontWeight:700, color:T.t1, fontSize:12 }}>{fmtINR(o.total)}</span>
                      <PriBadge priority={o.priority}/>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:T.surfBg, borderRadius:"6px 6px 0 0", border:`1px solid ${T.bdr}`, borderBottom:"none", display:"flex", alignItems:"center", paddingLeft:14 }}>
        {[["all","All"],["sales","Sales"],["purchases","Purchases"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding:"9px 13px", border:"none", background:"transparent",
            borderBottom:tab===k?`2px solid ${T.teal}`:"2px solid transparent",
            color:tab===k?T.teal:T.t3, fontSize:12.5, fontWeight:tab===k?600:400,
            cursor:"pointer", fontFamily:SANS, marginBottom:-1,
          }}>{l}</button>
        ))}
        <div style={{ marginLeft:"auto", padding:"6px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:T.pageBg, borderRadius:4, padding:"4px 10px", border:`1px solid ${T.bdr}` }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ border:"none", background:"transparent", outline:"none", fontSize:12, color:T.t1, width:130, fontFamily:SANS }}/>
          </div>
        </div>
      </div>

      {/* Add form */}
      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderTop:"none", padding:14 }}>
          {err && <AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Type</div>
              <select value={no.type} onChange={e => setNo(p=>({...p,type:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                <option value="sale">Sale</option>
                <option value="purchase">Purchase</option>
              </select>
            </div>
            {[
              ["Customer / Vendor","customer","text"],
              ["Product SKU","productCode","text"],
              ["Quantity","qty","number"],
            ].map(([lbl,k,tp]) => (
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={no[k]}
                  onChange={e => setNo(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:tp==="number"?MONO:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Priority</div>
              <select value={no.priority} onChange={e => setNo(p=>({...p,priority:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                {["urgent","high","normal","low"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop:8, fontSize:11, color:T.t3, fontFamily:SANS }}>
            💡 For sales: stock is reserved immediately. For purchases: stock is added when marked Done.
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => { setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={addOrder}>Create Order</Btn>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:"0 0 6px 6px", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["Order ID","Type","Customer","Product","Qty","Total","Invoice","Payment","Priority","Date","Status","Actions"].map(h => <TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {filtered.map((o,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                onMouseEnter={e => e.currentTarget.style.background=T.surfAlt}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:700 }}>{o.id}</TD>
                <TD>
                  <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:o.type==="sale"?T.tealL:T.blueL, color:o.type==="sale"?T.teal:T.blue, border:`1px solid ${o.type==="sale"?T.tealM:T.blueB}`, fontFamily:SANS }}>
                    {o.type==="sale"?"Sale":"Purchase"}
                  </span>
                </TD>
                <TD style={{ fontWeight:500, color:T.t1 }}>{o.customer}</TD>
                <TD>{o.product}</TD>
                <TD style={{ fontFamily:MONO }}>{o.qty}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700, color:T.t1 }}>{fmtINR(o.total)}</TD>
                <TD>
                  {o.invoice ? (
                    <button onClick={() => setInvModal(o)}
                      style={{ fontSize:11, color:T.teal, background:"none", border:"none", cursor:"pointer", fontFamily:MONO }}>
                      {o.invoice}
                    </button>
                  ) : <span style={{ color:T.t3 }}>—</span>}
                </TD>
                <TD>
                  <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:o.payment==="paid"?T.greenL:T.amberL, color:o.payment==="paid"?T.green:T.amber, fontFamily:SANS }}>
                    {o.payment==="paid"?"✓ Paid":"Pending"}
                  </span>
                </TD>
                <TD><PriBadge priority={o.priority}/></TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{o.date}</TD>
                <TD><Badge status={o.status}/></TD>
                <TD>
                  {o.status === "pending" && (
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={() => changeStatus(o.id,"done")}
                        style={{ fontSize:10, padding:"2px 7px", background:T.green, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>
                        {o.type==="sale"?"Ship":"Receive"}
                      </button>
                      <button onClick={() => changeStatus(o.id,"cancel")}
                        style={{ fontSize:10, padding:"2px 7px", background:T.surfAlt, border:`1px solid ${T.bdr}`, borderRadius:3, color:T.t3, cursor:"pointer", fontFamily:SANS }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding:"8px 14px", borderTop:`1px solid ${T.bdr}` }}>
          <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{filtered.length} orders</span>
        </div>
      </div>

      {/* Invoice Modal */}
      {invModal && (
        <Modal title={`Invoice — ${invModal.invoice}`} onClose={() => setInvModal(null)} width={500}>
          <div style={{ background:T.pageBg, borderRadius:6, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:T.teal, fontFamily:SANS }}>InvenPro</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>admin@invenpro.in</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1, fontFamily:MONO }}>{invModal.invoice}</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>Date: {invModal.date}</div>
                <Badge status={invModal.payment==="paid"?"done":"pending"}/>
              </div>
            </div>
            <div style={{ borderTop:`1px solid ${T.bdr}`, paddingTop:12, marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.t4, fontFamily:SANS, marginBottom:4 }}>BILL TO</div>
              <div style={{ fontSize:14, fontWeight:600, color:T.t1, fontFamily:SANS }}>{invModal.customer}</div>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:T.surfAlt, borderBottom:`1px solid ${T.bdr}` }}>
                {["Description","Qty","Unit Price","Total"].map(h => (
                  <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontFamily:SANS, fontSize:10.5, color:T.t4, fontWeight:600, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr>
                  <td style={{ padding:"8px 10px", fontFamily:SANS, color:T.t1 }}>{invModal.product}</td>
                  <td style={{ padding:"8px 10px", fontFamily:MONO }}>{invModal.qty}</td>
                  <td style={{ padding:"8px 10px", fontFamily:MONO }}>{fmtINR(invModal.total/invModal.qty)}</td>
                  <td style={{ padding:"8px 10px", fontFamily:MONO, fontWeight:700 }}>{fmtINR(invModal.total)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
              <div style={{ background:T.teal, color:"#fff", borderRadius:5, padding:"10px 16px", textAlign:"right" }}>
                <div style={{ fontSize:11, fontFamily:SANS, opacity:0.8 }}>Total Amount</div>
                <div style={{ fontSize:20, fontWeight:800, fontFamily:MONO }}>{fmtINR(invModal.total)}</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, justifyContent:"flex-end", marginTop:12 }}>
            <Btn Icon={Download}>Download PDF</Btn>
            <Btn Icon={Send} variant="primary">Send to Customer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MANUFACTURING ─────────────────────────────────────────────────────────────
export function Manufacturing({ products, setProducts }) {
  const [boms, setBoms]       = useState(initBOMs);
  const [workOrders, setWOs]  = useState(initWorkOrders);
  const [addWOOpen, setAddWO] = useState(false);
  const [nwo, setNwo]         = useState({ product:"", code:"", qty:1, worker:"", start:today(), end:"" });
  const [err, setErr]         = useState("");

  const startWO = () => {
    setErr("");
    const bom = boms.find(b => b.code === nwo.code);
    if (!bom) { setErr("No BOM found for this SKU. Create a BOM first."); return; }

    // Check raw material availability
    const missing = bom.materials.filter(m => m.onHand < m.qty * nwo.qty);
    if (missing.length > 0) {
      setErr(`Insufficient materials: ${missing.map(m=>`${m.name} (need ${m.qty*nwo.qty}, have ${m.onHand})`).join(", ")}`);
      return;
    }

    // Deduct raw materials from BOM
    setBoms(prev => prev.map(b => b.code !== nwo.code ? b : {
      ...b, materials: b.materials.map(m => ({ ...m, onHand: m.onHand - m.qty * nwo.qty }))
    }));

    setWOs(prev => [...prev, {
      ...nwo, id:`WO-${String(prev.length+1).padStart(3,"0")}`,
      status:"planned", progress:0, efficiency:0, waste:0,
    }]);
    setAddWO(false);
    setNwo({ product:"", code:"", qty:1, worker:"", start:today(), end:"" });
  };

  const completeWO = (woId) => {
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) return;
    // Add finished goods to inventory
    setProducts(prev => prev.map(p => {
      if (p.code !== wo.code) return p;
      const newOnHand = p.onHand + wo.qty;
      return { ...p, onHand:newOnHand, available:newOnHand-p.reserved, status:computeStatus({...p,onHand:newOnHand}) };
    }));
    setWOs(prev => prev.map(w => w.id===woId ? {...w, status:"done", progress:100, efficiency:91} : w));
  };

  const updateProgress = (woId, progress) => {
    setWOs(prev => prev.map(w => w.id===woId ? {
      ...w, progress:Number(progress),
      status: Number(progress)>=100?"done":"in_progress",
    } : w));
    if (Number(progress) >= 100) completeWO(woId);
  };

  return (
    <div>
      <PageTitle
        title="Manufacturing"
        sub="Work orders · Bill of materials · Progress tracking · Efficiency"
        actions={<Btn Icon={Plus} variant="primary" onClick={() => setAddWO(true)}>New Work Order</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active WOs"     value={workOrders.filter(w=>w.status==="in_progress").length} sub="in production"  Icon={Activity}     />
        <KPI label="Planned"        value={workOrders.filter(w=>w.status==="planned").length}     sub="scheduled"      Icon={Clock}        accent={T.amber} />
        <KPI label="Completed"      value={workOrders.filter(w=>w.status==="done").length}        sub="this month"     Icon={CheckCircle2} accent={T.green} />
        <KPI label="BOMs"           value={boms.length}                                           sub="active recipes" Icon={Layers}       accent={T.blue}  />
      </div>

      {addWOOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          {err && <AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9 }}>
            {[["Product Name","product","text"],["Product SKU","code","text"],["Quantity","qty","number"],["Worker","worker","text"],["Start Date","start","text"],["End Date","end","text"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nwo[k]} onChange={e=>setNwo(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
          </div>
          <div style={{ marginTop:8, fontSize:11, color:T.t3, fontFamily:SANS }}>
            💡 Raw materials will be deducted from BOM stock. Finished goods are added when WO is completed.
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => { setAddWO(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={startWO}>Start Work Order</Btn>
          </div>
        </div>
      )}

      <SectionCard title="Work Orders" action={<span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>Update progress → auto-completes at 100%</span>}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["WO #","Product","SKU","Qty","Worker","Start","End","Progress","Efficiency","Waste","Status",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {workOrders.map((w,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:700 }}>{w.id}</TD>
                <TD style={{ fontWeight:600, color:T.t1 }}>{w.product}</TD>
                <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.teal }}>{w.code}</TD>
                <TD style={{ fontFamily:MONO }}>{w.qty}</TD>
                <TD>{w.worker||"—"}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{w.start}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{w.end||"—"}</TD>
                <TD style={{ minWidth:160 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {w.status !== "done" ? (
                      <input type="range" min={0} max={100} value={w.progress}
                        onChange={e => updateProgress(w.id, e.target.value)}
                        style={{ flex:1 }}/>
                    ) : (
                      <div style={{ flex:1, height:5, background:T.greenL, borderRadius:99 }}>
                        <div style={{ width:"100%", height:"100%", background:T.green, borderRadius:99 }}/>
                      </div>
                    )}
                    <span style={{ fontFamily:MONO, fontSize:11, fontWeight:600, color:T.t2, minWidth:32 }}>{w.progress}%</span>
                  </div>
                </TD>
                <TD style={{ fontFamily:MONO, color:w.efficiency>=90?T.green:w.efficiency>=75?T.amber:T.red, fontWeight:600 }}>
                  {w.efficiency>0?`${w.efficiency}%`:"—"}
                </TD>
                <TD style={{ fontFamily:MONO, color:w.waste>1?T.red:T.t3 }}>{w.waste>0?`${w.waste}%`:"—"}</TD>
                <TD><Badge status={w.status}/></TD>
                <TD>
                  {w.status==="planned" && (
                    <button onClick={() => setWOs(prev=>prev.map(x=>x.id===w.id?{...x,status:"in_progress"}:x))}
                      style={{ fontSize:11, padding:"3px 9px", background:T.blue, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>
                      Start
                    </button>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <div style={{ marginTop:16, fontSize:12, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:10 }}>Bill of Materials</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {boms.map(bom => (
          <div key={bom.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
            <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:T.t1, fontFamily:SANS }}>{bom.product}</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:MONO, marginTop:2 }}>[{bom.code}] · {bom.qty} pcs · {fmtINR(bom.cost)} · Waste: {bom.waste}%</div>
              </div>
              <Badge status={bom.status}/>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
                {["Material","Req. Qty","Unit","Cost","In Stock"].map(h=>(
                  <th key={h} style={{ padding:"6px 10px", textAlign:"left", background:"#F2EFE9", fontFamily:SANS, fontSize:10.5, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {bom.materials.map((m,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}>
                    <td style={{ padding:"7px 10px", fontWeight:500, color:T.t1, fontFamily:SANS, fontSize:12 }}>{m.name}</td>
                    <td style={{ padding:"7px 10px", fontFamily:MONO, fontSize:12 }}>{m.qty}</td>
                    <td style={{ padding:"7px 10px", color:T.t3, fontFamily:SANS, fontSize:12 }}>{m.unit}</td>
                    <td style={{ padding:"7px 10px", fontFamily:MONO, fontWeight:600, color:T.teal, fontSize:12 }}>{fmtINR(m.cost)}</td>
                    <td style={{ padding:"7px 10px", fontSize:12 }}>
                      <span style={{ fontFamily:MONO, fontWeight:700, color:m.onHand>=m.qty?T.green:T.red }}>{m.onHand}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TRANSFERS ─────────────────────────────────────────────────────────────────
export function Transfers({ transfers, setTransfers, products, setProducts }) {
  const [addOpen, setAddOpen] = useState(false);
  const [err, setErr]         = useState("");
  const [nt, setNt] = useState({ from:"WH/Main", to:"WH/North", productCode:"", qty:1, highValue:false });

  const mintNFT = () => `0x${Array.from({length:8},()=>Math.floor(Math.random()*16).toString(16)).join("")}...${Array.from({length:4},()=>Math.floor(Math.random()*16).toString(16)).join("")}`;

  const createTransfer = () => {
    setErr("");
    if (nt.from === nt.to) { setErr("Source and destination warehouse cannot be the same."); return; }
    const prod = products.find(p => p.code === nt.productCode && p.warehouse === nt.from);
    if (!prod) { setErr(`Product ${nt.productCode} not found in ${nt.from}`); return; }
    if (prod.available < nt.qty) { setErr(`Only ${prod.available} units available in ${nt.from}`); return; }

    // Move stock: reduce from source, add to destination
    setProducts(prev => {
      const updated = [...prev];
      // Deduct from source
      const srcIdx = updated.findIndex(p => p.code===nt.productCode && p.warehouse===nt.from);
      if (srcIdx >= 0) {
        updated[srcIdx] = {
          ...updated[srcIdx],
          onHand:    updated[srcIdx].onHand - nt.qty,
          available: updated[srcIdx].available - nt.qty,
          status:    computeStatus({ ...updated[srcIdx], onHand: updated[srcIdx].onHand - nt.qty }),
        };
      }
      // Check if dest warehouse entry exists
      const dstIdx = updated.findIndex(p => p.code===nt.productCode && p.warehouse===nt.to);
      if (dstIdx >= 0) {
        updated[dstIdx] = {
          ...updated[dstIdx],
          onHand:    updated[dstIdx].onHand + nt.qty,
          available: updated[dstIdx].available + nt.qty,
          status:    computeStatus({ ...updated[dstIdx], onHand: updated[dstIdx].onHand + nt.qty }),
        };
      } else {
        // Create new entry in destination warehouse
        updated.push({ ...prod, id:Date.now(), warehouse:nt.to, onHand:nt.qty, reserved:0, available:nt.qty, status:computeStatus({...prod,onHand:nt.qty}) });
      }
      return updated;
    });

    const nft = nt.highValue ? mintNFT() : null;
    setTransfers(prev => [...prev, {
      ...nt, id:`TRF-${String(prev.length+1).padStart(3,"0")}`,
      product:prod.name, status:"done", date:today(), nft, verified:!!nft,
    }]);
    setAddOpen(false);
    setNt({ from:"WH/Main", to:"WH/North", productCode:"", qty:1, highValue:false });
  };

  return (
    <div>
      <PageTitle
        title="Stock Transfers"
        sub="Move stock between warehouses · Real inventory movement · Blockchain for high-value items"
        actions={<Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>New Transfer</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Transfers"     value={transfers.length}                           sub="all time"      Icon={ArrowRight} />
        <KPI label="Blockchain Verified" value={transfers.filter(t=>t.verified).length}    sub="NFT receipts"  Icon={Shield}     accent={T.purple} />
        <KPI label="This Month"          value={transfers.filter(t=>t.status==="done").length} sub="completed"  Icon={CheckCircle2} accent={T.green} />
      </div>

      {/* Blockchain ledger */}
      <div style={{ background:T.sideNav, borderRadius:6, padding:16, marginBottom:16, border:`1px solid ${T.sideNavB}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <Link size={14} color={T.purple}/>
          <span style={{ fontSize:13, fontWeight:600, color:"#F0EDE8", fontFamily:SANS }}>Blockchain Ledger</span>
          <span style={{ fontSize:9, padding:"1px 6px", borderRadius:3, background:"#6D28D933", color:"#C4B5FD", fontWeight:700, letterSpacing:"0.06em", fontFamily:SANS }}>IMMUTABLE</span>
        </div>
        {blockchainLog.map((b,i) => (
          <div key={i} style={{ background:"#1E2D3D", borderRadius:5, padding:"10px 12px", marginBottom:6, border:"1px solid #2A3D52" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontFamily:MONO, fontSize:11, color:"#A8D5D6", marginBottom:3 }}>{b.hash}</div>
                <div style={{ fontSize:12, color:"#D6D0C8", fontFamily:SANS }}>{b.event} · {b.product}</div>
                <div style={{ fontSize:11, color:"#57534e", fontFamily:MONO, marginTop:2 }}>Serial: {b.serial} · {b.ts}</div>
              </div>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:3, background:"#2D7D4633", color:"#9ED4B0", fontWeight:600, fontFamily:SANS }}>✓ Verified</span>
            </div>
          </div>
        ))}
      </div>

      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          {err && <AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9 }}>
            {[["From Warehouse","from",[...WAREHOUSES]],["To Warehouse","to",[...WAREHOUSES]]].map(([lbl,k,opts])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <select value={nt[k]} onChange={e=>setNt(p=>({...p,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Product SKU</div>
              <input value={nt.productCode} onChange={e=>setNt(p=>({...p,productCode:e.target.value}))}
                placeholder="e.g. FCH-001"
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Quantity</div>
              <input type="number" min={1} value={nt.qty} onChange={e=>setNt(p=>({...p,qty:Number(e.target.value)}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, fontSize:12, color:T.t1, fontFamily:SANS, cursor:"pointer" }}>
            <input type="checkbox" checked={nt.highValue} onChange={e=>setNt(p=>({...p,highValue:e.target.checked}))}/>
            <Shield size={13} color={T.purple}/>
            High-value item — mint NFT receipt on blockchain
          </label>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={()=>{ setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="primary" Icon={ArrowRight} onClick={createTransfer}>Create Transfer</Btn>
          </div>
        </div>
      )}

      <SectionCard title="Transfer History">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["ID","From","To","Product","Qty","NFT Receipt","Date","Status"].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {transfers.map((t,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:700 }}>{t.id}</TD>
                <TD>{t.from}</TD>
                <TD>{t.to}</TD>
                <TD style={{ fontWeight:500, color:T.t1 }}>{t.product}</TD>
                <TD style={{ fontFamily:MONO }}>{t.qty}</TD>
                <TD>
                  {t.nft ? (
                    <span style={{ fontFamily:MONO, fontSize:10, color:T.purple, background:T.purpleL, padding:"2px 7px", borderRadius:3, border:`1px solid ${T.purpleB}` }}>{t.nft}</span>
                  ) : <span style={{ color:T.t3, fontFamily:SANS, fontSize:11 }}>—</span>}
                </TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{t.date}</TD>
                <TD><Badge status={t.verified?"verified":"done"}/></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── VENDORS ───────────────────────────────────────────────────────────────────
export function Vendors() {
  const [vendors, setVendors] = useState(initVendors);
  const [addOpen, setAddOpen] = useState(false);
  const [nv, setNv] = useState({ name:"", contact:"", email:"", phone:"", category:"Furniture", rating:4.0, onTime:90, totalOrders:0, outstanding:0 });

  return (
    <div>
      <PageTitle
        title="Vendor Management"
        sub="Supplier profiles · Performance ratings · Payment tracking"
        actions={<Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Add Vendor</Btn>}
      />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Vendors"  value={vendors.length}                                                         sub="active suppliers" Icon={Users}      />
        <KPI label="Outstanding"    value={fmtK(vendors.reduce((a,v)=>a+v.outstanding,0))}                         sub="pending payments" Icon={DollarSign} accent={T.amber} />
        <KPI label="Avg On-Time"    value={`${Math.round(vendors.reduce((a,v)=>a+v.onTime,0)/vendors.length)}%`}   sub="delivery rate"    Icon={Truck}      accent={T.green} />
        <KPI label="Avg Rating"     value={`${(vendors.reduce((a,v)=>a+v.rating,0)/vendors.length).toFixed(1)}★`}  sub="satisfaction"     Icon={Star}       accent={T.amber} />
      </div>

      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9 }}>
            {[["Company Name","name","text"],["Contact","contact","text"],["Email","email","text"],["Phone","phone","text"],["Category","category","text"],["Rating (0-5)","rating","number"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nv[k]} onChange={e=>setNv(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={() => { setVendors(p=>[...p,{...nv,id:Date.now()}]); setAddOpen(false); }}>Save Vendor</Btn>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
        {vendors.map(v => (
          <div key={v.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:T.t1, fontFamily:SANS }}>{v.name}</div>
                <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, marginTop:2 }}>{v.contact} · {v.email}</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{v.phone}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:800, color:T.amber, fontFamily:MONO }}>{v.rating.toFixed(1)}★</div>
                <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:T.tealL, color:T.teal, border:`1px solid ${T.tealM}`, fontFamily:SANS }}>{v.category}</span>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[["On-Time",`${v.onTime}%`,v.onTime>=90?T.green:v.onTime>=75?T.amber:T.red],["Orders",v.totalOrders,T.teal],["Outstanding",fmtINR(v.outstanding),v.outstanding>50000?T.red:T.t1]].map(([lbl,val,color])=>(
                <div key={lbl} style={{ background:T.pageBg, borderRadius:4, padding:"8px 10px", border:`1px solid ${T.bdr}` }}>
                  <div style={{ fontSize:10, color:T.t4, fontFamily:SANS, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{lbl}</div>
                  <div style={{ fontSize:14, fontWeight:700, fontFamily:MONO, color }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:11, color:T.t3, fontFamily:SANS }}>
                <span>On-time performance</span><span>{v.onTime}%</span>
              </div>
              <div style={{ height:5, background:T.surfAlt, borderRadius:99 }}>
                <div style={{ width:`${v.onTime}%`, height:"100%", background:v.onTime>=90?T.green:v.onTime>=75?T.amber:T.red, borderRadius:99 }}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── USERS & ROLES ─────────────────────────────────────────────────────────────
export function UsersRoles() {
  const [users, setUsers] = useState(initUsers);
  const [addOpen, setAddOpen] = useState(false);
  const [nu, setNu] = useState({ name:"", email:"", role:"staff", warehouse:"WH/Main", status:"active" });

  const roleCfg = {
    admin:   { bg:T.redL,    fg:T.red,    label:"Admin"   },
    manager: { bg:T.amberL,  fg:T.amber,  label:"Manager" },
    staff:   { bg:T.tealL,   fg:T.teal,   label:"Staff"   },
    viewer:  { bg:T.surfAlt, fg:T.t4,     label:"Viewer"  },
  };

  const permissions = {
    admin:   ["View","Add","Edit","Delete","Export","Manage Users","All Warehouses"],
    manager: ["View","Add","Edit","Export","Assigned Warehouse"],
    staff:   ["View","Add","Assigned Warehouse"],
    viewer:  ["View Only"],
  };

  return (
    <div>
      <PageTitle
        title="Users & Roles"
        sub="Role-based access control · Warehouse assignments"
        actions={<Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Add User</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        {["admin","manager","staff","viewer"].map(role => {
          const cfg = roleCfg[role];
          return (
            <div key={role} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px", borderTop:`3px solid ${cfg.fg}` }}>
              <div style={{ fontSize:11, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:8 }}>{cfg.label}s</div>
              <div style={{ fontSize:24, fontWeight:800, fontFamily:MONO, color:cfg.fg, marginBottom:6 }}>{users.filter(u=>u.role===role).length}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {permissions[role].map(p => (
                  <div key={p} style={{ fontSize:10.5, color:T.t3, fontFamily:SANS, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ color:cfg.fg }}>✓</span>{p}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9 }}>
            {[["Full Name","name","text"],["Email","email","text"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nu[k]} onChange={e=>setNu(p=>({...p,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Role</div>
              <select value={nu.role} onChange={e=>setNu(p=>({...p,role:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                {["admin","manager","staff","viewer"].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Warehouse</div>
              <select value={nu.warehouse} onChange={e=>setNu(p=>({...p,warehouse:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                {["All",...WAREHOUSES].map(w=><option key={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={() => { setUsers(p=>[...p,{...nu,id:Date.now(),lastLogin:"Never"}]); setAddOpen(false); }}>Create User</Btn>
          </div>
        </div>
      )}

      <SectionCard title="All Users">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["Name","Email","Role","Warehouse","Last Login","Status",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {users.map(u => {
              const cfg = roleCfg[u.role];
              return (
                <tr key={u.id} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <TD style={{ fontWeight:600, color:T.t1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:cfg.fg, fontFamily:SANS, flexShrink:0 }}>
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                    </div>
                  </TD>
                  <TD style={{ color:T.t3, fontFamily:MONO, fontSize:12 }}>{u.email}</TD>
                  <TD><span style={{ fontSize:11, padding:"2px 8px", borderRadius:3, fontWeight:600, background:cfg.bg, color:cfg.fg, fontFamily:SANS }}>{cfg.label}</span></TD>
                  <TD style={{ fontSize:12, color:T.t3 }}>{u.warehouse}</TD>
                  <TD style={{ fontFamily:MONO, fontSize:11, color:T.t3 }}>{u.lastLogin}</TD>
                  <TD>
                    <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:u.status==="active"?T.greenL:T.redL, color:u.status==="active"?T.green:T.red, fontFamily:SANS }}>
                      {u.status==="active"?"● Active":"○ Inactive"}
                    </span>
                  </TD>
                  <TD>
                    <button onClick={() => setUsers(p=>p.filter(x=>x.id!==u.id))}
                      style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, padding:3 }}>
                      <Trash2 size={12}/>
                    </button>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

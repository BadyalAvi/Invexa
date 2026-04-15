import { useState, useMemo } from "react";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity,
  Plus, Trash2, X, ArrowRight, ChevronRight,
  Shield, RotateCcw, MapPin, Tag, Layers,
  DollarSign, Users, Star, Send, PackageOpen,
} from "lucide-react";
import { T, MONO, SANS, WAREHOUSES, fmtINR, uid, today } from "./data.js";
import { Badge, KPI, PageTitle, Btn, TH, TD, SectionCard, Modal, AlertBanner, ProgressBar } from "./ui.jsx";
import { computeStatus } from "./modules.jsx";

// ─── 1. QUALITY CONTROL ───────────────────────────────────────────────────────
const initQCChecks = [
  { id:"QC-001", product:"Corner Desk",    code:"FCH-001", type:"incoming", order:"PO-0202", totalQty:5,  passed:4, failed:1, status:"done",    date:"01 Apr", inspector:"Ravi K.",  notes:"1 unit has scratched surface" },
  { id:"QC-002", product:"Office Chair",   code:"FCH-004", type:"incoming", order:"PO-0203", totalQty:10, passed:10,failed:0, status:"done",    date:"02 Apr", inspector:"Priya S.", notes:"All pass" },
  { id:"QC-003", product:"Wireless Mouse", code:"ELC-002", type:"outgoing", order:"SO-1045", totalQty:3,  passed:0, failed:0, status:"pending", date:"03 Apr", inspector:"",         notes:"" },
  { id:"QC-004", product:"USB-C Hub",      code:"ELC-001", type:"incoming", order:"PO-0201", totalQty:20, passed:0, failed:0, status:"pending", date:"03 Apr", inspector:"",         notes:"" },
];

export function QualityControl({ products, setProducts }) {
  const [checks, setChecks]       = useState(initQCChecks);
  const [activeCheck, setActive]  = useState(null);
  const [passed, setPassed]       = useState(0);
  const [failed, setFailed]       = useState(0);
  const [notes, setNotes]         = useState("");
  const [inspector, setInspector] = useState("");

  const submitQC = (check) => {
    const totalInspected = passed + failed;
    if (totalInspected !== check.totalQty) return;

    setChecks(prev => prev.map(c => c.id !== check.id ? c : {
      ...c, passed, failed, notes, inspector,
      status: failed > 0 ? "failed" : "done",
    }));

    // If QC fails, quarantine the failed units (reduce available)
    if (failed > 0 && check.type === "incoming") {
      setProducts(prev => prev.map(p => {
        if (p.code !== check.code) return p;
        const newAvailable = Math.max(0, p.available - failed);
        return { ...p, available: newAvailable, status: computeStatus({ ...p, onHand: p.onHand }) };
      }));
    }

    setActive(null);
    setPassed(0); setFailed(0); setNotes(""); setInspector("");
  };

  const openInspect = (check) => {
    setActive(check);
    setPassed(check.totalQty);
    setFailed(0);
  };

  const totalFailed   = checks.reduce((a, c) => a + c.failed, 0);
  const totalInspected = checks.filter(c => c.status === "done" || c.status === "failed").length;
  const passRate = totalInspected > 0
    ? Math.round(checks.filter(c => c.status === "done").length / totalInspected * 100) : 100;

  return (
    <div>
      <PageTitle
        title="Quality Control"
        sub="Inspect incoming & outgoing items · Pass/fail · Quarantine failed stock"
        actions={<Btn Icon={Plus} variant="primary">New QC Check</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Pass Rate"     value={`${passRate}%`}                                           sub="quality score"      Icon={CheckCircle2} accent={T.green}  />
        <KPI label="Pending"       value={checks.filter(c=>c.status==="pending").length}            sub="awaiting inspection" Icon={Clock}        accent={T.amber}  />
        <KPI label="Failed Units"  value={totalFailed}                                              sub="quarantined"         Icon={XCircle}      accent={T.red}    />
        <KPI label="Inspected"     value={totalInspected}                                           sub="this month"          Icon={Shield}       />
      </div>

      {totalFailed > 0 && (
        <AlertBanner type="error">
          {totalFailed} units in quarantine — available stock has been reduced. Review and dispose or return to vendor.
        </AlertBanner>
      )}

      <SectionCard title="QC Checks">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["QC ID","Product","Type","Order","Total","Passed","Failed","Inspector","Date","Status",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {checks.map((c,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, background:c.status==="failed"?T.redL+"44":"transparent" }}
                onMouseEnter={e=>{ if(c.status!=="failed")e.currentTarget.style.background=T.surfAlt; }}
                onMouseLeave={e=>{ if(c.status!=="failed")e.currentTarget.style.background="transparent"; }}>
                <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:700 }}>{c.id}</TD>
                <TD style={{ fontWeight:600, color:T.t1 }}>{c.product}</TD>
                <TD>
                  <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:c.type==="incoming"?T.blueL:T.amberL, color:c.type==="incoming"?T.blue:T.amber, border:`1px solid ${c.type==="incoming"?T.blueB:T.amberB}`, fontFamily:SANS }}>
                    {c.type==="incoming"?"↓ Incoming":"↑ Outgoing"}
                  </span>
                </TD>
                <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.teal }}>{c.order}</TD>
                <TD style={{ fontFamily:MONO }}>{c.totalQty}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700, color:c.passed>0?T.green:T.t3 }}>{c.passed}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700, color:c.failed>0?T.red:T.t3 }}>{c.failed}</TD>
                <TD style={{ color:T.t3 }}>{c.inspector||"—"}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{c.date}</TD>
                <TD><Badge status={c.status==="failed"?"critical":c.status}/></TD>
                <TD>
                  {c.status==="pending" && (
                    <button onClick={() => openInspect(c)}
                      style={{ fontSize:11, padding:"3px 9px", background:T.teal, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>
                      Inspect
                    </button>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {activeCheck && (
        <Modal title={`Inspect — ${activeCheck.product} · ${activeCheck.totalQty} units`} onClose={() => setActive(null)} width={480}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ background:T.greenL, border:`1px solid ${T.greenB}`, borderRadius:6, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:11, color:T.green, fontFamily:SANS, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Units Passed</div>
              <input type="number" value={passed} min={0} max={activeCheck.totalQty}
                onChange={e => { const v=Math.min(Number(e.target.value),activeCheck.totalQty); setPassed(v); setFailed(activeCheck.totalQty-v); }}
                style={{ fontSize:28, fontWeight:800, fontFamily:MONO, color:T.green, border:"none", background:"transparent", textAlign:"center", width:"100%", outline:"none" }}/>
            </div>
            <div style={{ background:T.redL, border:`1px solid ${T.redB}`, borderRadius:6, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:11, color:T.red, fontFamily:SANS, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Units Failed</div>
              <input type="number" value={failed} min={0} max={activeCheck.totalQty}
                onChange={e => { const v=Math.min(Number(e.target.value),activeCheck.totalQty); setFailed(v); setPassed(activeCheck.totalQty-v); }}
                style={{ fontSize:28, fontWeight:800, fontFamily:MONO, color:T.red, border:"none", background:"transparent", textAlign:"center", width:"100%", outline:"none" }}/>
            </div>
          </div>
          {[["Inspector Name","text",inspector,setInspector],["Notes / Defect Description","text",notes,setNotes]].map(([lbl,tp,val,set])=>(
            <div key={lbl} style={{ marginBottom:10 }}>
              <div style={{ fontSize:10.5, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
              <input type={tp} value={val} onChange={e=>set(e.target.value)}
                style={{ width:"100%", padding:"7px 10px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:13, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box" }}/>
            </div>
          ))}
          {failed > 0 && (
            <AlertBanner type="warning">{failed} unit(s) will be quarantined — available stock will be reduced by {failed}.</AlertBanner>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn onClick={() => setActive(null)}>Cancel</Btn>
            <Btn variant="primary" Icon={CheckCircle2} onClick={() => submitQC(activeCheck)} disabled={passed+failed!==activeCheck.totalQty}>
              Submit Inspection
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── 2. SCRAP MANAGEMENT ──────────────────────────────────────────────────────
const initScrap = [
  { id:"SCR-001", product:"Corner Desk",  code:"FCH-001", qty:1, reason:"Surface damage during transit", unitCost:8200,  date:"28 Mar", by:"Ravi K.",  status:"written_off" },
  { id:"SCR-002", product:"USB-C Hub",    code:"ELC-001", qty:3, reason:"Defective ports — failed QC",   unitCost:1200,  date:"01 Apr", by:"Admin",    status:"pending"     },
  { id:"SCR-003", product:"Notebook A5",  code:"STN-001", qty:10,reason:"Water damage in warehouse",     unitCost:120,   date:"02 Apr", by:"",         status:"pending"     },
];

export function ScrapManagement({ products, setProducts }) {
  const [scraps, setScraps] = useState(initScrap);
  const [addOpen, setAddOpen] = useState(false);
  const [ns, setNs] = useState({ product:"", code:"", qty:1, reason:"", unitCost:0, by:"Admin" });
  const [err, setErr] = useState("");

  const addScrap = () => {
    setErr("");
    const prod = products.find(p => p.code === ns.code);
    if (!prod) { setErr("SKU not found in inventory."); return; }
    if (prod.onHand < ns.qty) { setErr(`Only ${prod.onHand} units on hand.`); return; }

    setScraps(prev => [...prev, {
      ...ns, id:`SCR-${String(prev.length+1).padStart(3,"0")}`,
      date:today(), status:"pending",
      product: prod.name,
      unitCost: ns.unitCost || prod.cost,
    }]);
    setAddOpen(false);
    setNs({ product:"", code:"", qty:1, reason:"", unitCost:0, by:"Admin" });
  };

  const writeOff = (scrapId) => {
    const scrap = scraps.find(s => s.id === scrapId);
    if (!scrap) return;
    // Reduce stock permanently
    setProducts(prev => prev.map(p => {
      if (p.code !== scrap.code) return p;
      const newOnHand = Math.max(0, p.onHand - scrap.qty);
      const newAvail  = Math.max(0, p.available - scrap.qty);
      return { ...p, onHand:newOnHand, available:newAvail, status:computeStatus({...p,onHand:newOnHand}) };
    }));
    setScraps(prev => prev.map(s => s.id===scrapId ? {...s,status:"written_off"} : s));
  };

  const totalWrittenOff = scraps.filter(s=>s.status==="written_off").reduce((a,s)=>a+s.unitCost*s.qty,0);
  const pendingValue    = scraps.filter(s=>s.status==="pending").reduce((a,s)=>a+s.unitCost*s.qty,0);

  return (
    <div>
      <PageTitle
        title="Scrap & Damaged Goods"
        sub="Log defective items · Write off stock value · Dispose permanently"
        actions={<Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Log Scrap</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Scrapped" value={scraps.reduce((a,s)=>a+s.qty,0)}               sub="units disposed"   Icon={Trash2}        accent={T.red}   />
        <KPI label="Written Off"    value={fmtINR(totalWrittenOff)}                        sub="value removed"    Icon={DollarSign}    accent={T.red}   />
        <KPI label="Pending Review" value={scraps.filter(s=>s.status==="pending").length}  sub="need write-off"   Icon={Clock}         accent={T.amber} />
        <KPI label="At Risk Value"  value={fmtINR(pendingValue)}                           sub="pending write-off" Icon={AlertTriangle} accent={T.amber} />
      </div>

      {addOpen && (
        <div style={{ background:T.redL, border:`1px solid ${T.redB}`, borderRadius:6, padding:14, marginBottom:14 }}>
          {err && <AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            {[["Product SKU","code","text"],["Quantity","qty","number"],["Unit Cost ₹","unitCost","number"],["Disposed By","by","text"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={ns[k]} onChange={e=>setNs(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:tp==="number"?MONO:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
            <div style={{ gridColumn:"1 / -1" }}>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Reason</div>
              <input value={ns.reason} onChange={e=>setNs(p=>({...p,reason:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
          </div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginTop:8 }}>
            ⚠ Stock is only removed when you click "Write Off". Until then it remains in the pending state.
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => { setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="danger" Icon={Trash2} onClick={addScrap}>Log Scrap</Btn>
          </div>
        </div>
      )}

      <SectionCard title="Scrap Register">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["Scrap ID","Product","SKU","Qty","Reason","Value","By","Date","Status",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {scraps.map((s,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD style={{ fontFamily:MONO, color:T.red, fontWeight:700 }}>{s.id}</TD>
                <TD style={{ fontWeight:600, color:T.t1 }}>{s.product}</TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontSize:11.5 }}>{s.code}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700, color:T.red }}>{s.qty}</TD>
                <TD style={{ color:T.t2, fontSize:12 }}>{s.reason}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700, color:T.red }}>{fmtINR(s.unitCost*s.qty)}</TD>
                <TD style={{ color:T.t3 }}>{s.by||"—"}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{s.date}</TD>
                <TD>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:3, fontWeight:500, background:s.status==="written_off"?T.redL:T.amberL, color:s.status==="written_off"?T.red:T.amber, border:`1px solid ${s.status==="written_off"?T.redB:T.amberB}`, fontFamily:SANS }}>
                    {s.status==="written_off"?"Written Off":"Pending"}
                  </span>
                </TD>
                <TD>
                  {s.status==="pending" && (
                    <button onClick={() => writeOff(s.id)}
                      style={{ fontSize:11, padding:"3px 9px", background:T.red, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>
                      Write Off
                    </button>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 3. PUTAWAY RULES ─────────────────────────────────────────────────────────
const initPutaway = [
  { id:"PUT-001", category:"Electronics", productCode:"",      from:"WH/Main/Receiving", to:"WH/Main/Shelf-B", condition:"All electronics",      priority:1, active:true  },
  { id:"PUT-002", category:"Furniture",   productCode:"",      from:"WH/Main/Receiving", to:"WH/North/Rack-1", condition:"All furniture",         priority:2, active:true  },
  { id:"PUT-003", category:"",            productCode:"FCH-001",from:"WH/Main/Receiving", to:"WH/Main/Shelf-A", condition:"Corner Desk specific",  priority:1, active:true  },
  { id:"PUT-004", category:"Stationery",  productCode:"",      from:"WH/Main/Receiving", to:"WH/Main/Shelf-A", condition:"All stationery",         priority:3, active:false },
];

export function PutawayRules() {
  const [rules, setRules] = useState(initPutaway);
  const [addOpen, setAddOpen] = useState(false);
  const [nr, setNr] = useState({ category:"", productCode:"", from:"WH/Main/Receiving", to:"WH/Main/Shelf-A", condition:"", priority:3 });

  const addRule = () => {
    setRules(prev => [...prev, { ...nr, id:`PUT-${String(prev.length+1).padStart(3,"0")}`, active:true }]);
    setAddOpen(false);
    setNr({ category:"", productCode:"", from:"WH/Main/Receiving", to:"WH/Main/Shelf-A", condition:"", priority:3 });
  };

  const toggleActive = (id) => setRules(prev => prev.map(r => r.id===id ? {...r,active:!r.active} : r));

  return (
    <div>
      <PageTitle
        title="Putaway Rules"
        sub="Auto-assign received products to correct storage locations"
        actions={<Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Add Rule</Btn>}
      />

      <AlertBanner type="info">
        When products arrive at the receiving dock, putaway rules automatically route them to the correct bin/shelf. Rules are applied by priority order — lower number = higher priority. SKU-specific rules override category rules.
      </AlertBanner>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active Rules"   value={rules.filter(r=>r.active).length}   sub="currently applied"  Icon={MapPin}       />
        <KPI label="SKU-Specific"   value={rules.filter(r=>r.productCode).length} sub="product overrides" Icon={CheckCircle2} accent={T.green} />
        <KPI label="Category Rules" value={rules.filter(r=>r.category&&!r.productCode).length} sub="broad rules"  Icon={Layers}       accent={T.blue}  />
      </div>

      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            {[["Category (or leave blank)","category","text"],["Product SKU (optional override)","productCode","text"],
              ["From Location","from","text"],["To Location (bin/shelf)","to","text"],
              ["Rule Description","condition","text"],["Priority (1=highest)","priority","number"],
            ].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nr[k]} onChange={e=>setNr(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={addRule}>Save Rule</Btn>
          </div>
        </div>
      )}

      <SectionCard title="Putaway Rules — sorted by priority">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["Priority","Rule ID","Category","SKU","From","→ To","Description","Active",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {[...rules].sort((a,b)=>a.priority-b.priority).map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, opacity:r.active?1:0.5 }}
                onMouseEnter={e=>{ if(r.active)e.currentTarget.style.background=T.surfAlt; }}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:MONO, fontSize:11, fontWeight:700, color:T.teal }}>{r.priority}</div>
                </TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:700 }}>{r.id}</TD>
                <TD style={{ fontWeight:500, color:T.t1 }}>{r.category||<span style={{color:T.t3}}>Any</span>}</TD>
                <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.teal }}>{r.productCode||<span style={{color:T.t3,fontFamily:SANS}}>All</span>}</TD>
                <TD style={{ color:T.t3, fontSize:12 }}>{r.from}</TD>
                <TD><span style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:T.teal, display:"flex", alignItems:"center", gap:4 }}><ArrowRight size={11}/>{r.to}</span></TD>
                <TD style={{ color:T.t3, fontSize:12 }}>{r.condition}</TD>
                <TD>
                  <button onClick={() => toggleActive(r.id)}
                    style={{ width:36, height:20, borderRadius:99, border:"none", background:r.active?T.teal:T.bdr, cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:r.active?19:3, transition:"left 0.2s" }}/>
                  </button>
                </TD>
                <TD>
                  <button onClick={() => setRules(prev=>prev.filter(x=>x.id!==r.id))}
                    style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, padding:3 }}>
                    <Trash2 size={12}/>
                  </button>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 4. PICK → PACK → SHIP ────────────────────────────────────────────────────
const initFulfillments = [
  { id:"FLF-001", order:"SO-1042", customer:"Agrolait",      product:"Corner Desk",    qty:2, pickStatus:"done",    packStatus:"done",    shipStatus:"done",    carrier:"BlueDart",  tracking:"BD123456" },
  { id:"FLF-002", order:"SO-1043", customer:"Deco Addict",   product:"Office Chair",   qty:5, pickStatus:"done",    packStatus:"done",    shipStatus:"pending", carrier:"",          tracking:"" },
  { id:"FLF-003", order:"SO-1044", customer:"Ready Mat",     product:"Large Desk",     qty:1, pickStatus:"done",    packStatus:"pending", shipStatus:"pending", carrier:"",          tracking:"" },
  { id:"FLF-004", order:"SO-1045", customer:"Jackson Group", product:"USB-C Hub",      qty:10,pickStatus:"pending", packStatus:"pending", shipStatus:"pending", carrier:"",          tracking:"" },
];

const CARRIERS = ["BlueDart","Delhivery","DTDC","FedEx","India Post","Ekart"];

export function PickPackShip() {
  const [items, setItems]     = useState(initFulfillments);
  const [shipModal, setShipModal] = useState(null);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  const stepOrder = ["pickStatus","packStatus","shipStatus"];

  const nextStep = (id) => {
    setItems(prev => prev.map(f => {
      if (f.id !== id) return f;
      const currentStep = stepOrder.find(s => f[s] === "pending");
      if (!currentStep) return f;
      if (currentStep === "shipStatus") { setShipModal(f); return f; }
      return { ...f, [currentStep]:"done" };
    }));
  };

  const confirmShip = (id) => {
    if (!carrier || !tracking) return;
    setItems(prev => prev.map(f => f.id===id ? {...f, shipStatus:"done", carrier, tracking} : f));
    setShipModal(null); setCarrier(""); setTracking("");
  };

  const getProgress = (f) => stepOrder.filter(s => f[s]==="done").length;

  return (
    <div>
      <PageTitle
        title="Pick → Pack → Ship"
        sub="3-step order fulfillment · Real-time status · Carrier assignment"
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        {[["Pending Pick",items.filter(f=>f.pickStatus==="pending").length,T.amber],
          ["Pending Pack",items.filter(f=>f.pickStatus==="done"&&f.packStatus==="pending").length,T.blue],
          ["Pending Ship",items.filter(f=>f.packStatus==="done"&&f.shipStatus==="pending").length,T.teal],
          ["Shipped",     items.filter(f=>f.shipStatus==="done").length,T.green],
        ].map(([lbl,val,ac])=>(
          <div key={lbl} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px", borderTop:`3px solid ${ac}` }}>
            <div style={{ fontSize:11, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:8 }}>{lbl}</div>
            <div style={{ fontSize:28, fontWeight:800, fontFamily:MONO, color:ac }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {items.map(f => {
          const progress = getProgress(f);
          const currentStep = stepOrder.find(s => f[s]==="pending");
          return (
            <div key={f.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:T.teal }}>{f.id}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>{f.customer}</span>
                  <span style={{ fontSize:12, color:T.t3, fontFamily:SANS }}>{f.product} × {f.qty}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {f.tracking && (
                    <span style={{ fontFamily:MONO, fontSize:11, color:T.teal, background:T.tealL, padding:"2px 8px", borderRadius:3, border:`1px solid ${T.tealM}` }}>
                      {f.carrier}: {f.tracking}
                    </span>
                  )}
                  <div style={{ width:80 }}>
                    <ProgressBar pct={progress/3*100} color={progress===3?T.green:T.teal}/>
                    <div style={{ fontSize:10, color:T.t3, fontFamily:SANS, marginTop:2, textAlign:"right" }}>{progress}/3 steps</div>
                  </div>
                  {currentStep && (
                    <button onClick={() => nextStep(f.id)}
                      style={{ fontSize:12, padding:"5px 12px", background:T.teal, border:"none", borderRadius:4, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:600 }}>
                      {currentStep==="pickStatus"?"Mark Picked":currentStep==="packStatus"?"Mark Packed":"Ship Now →"}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display:"flex", gap:0 }}>
                {[["Pick","pickStatus","Pick items from shelf"],["Pack","packStatus","Pack & label"],["Ship","shipStatus","Hand to carrier"]].map(([lbl,key,desc],idx)=>(
                  <div key={key} style={{ display:"flex", alignItems:"center", flex:1 }}>
                    <div style={{ flex:1, padding:"9px 12px", borderRadius:4, textAlign:"center", background:f[key]==="done"?T.greenL:T.surfAlt, border:`1px solid ${f[key]==="done"?T.greenB:T.bdr}` }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginBottom:2 }}>
                        {f[key]==="done"?<CheckCircle2 size={12} color={T.green}/>:<Clock size={12} color={T.t3}/>}
                        <span style={{ fontSize:11, fontWeight:f[key]==="done"?700:400, color:f[key]==="done"?T.green:T.t3, fontFamily:SANS }}>{lbl}</span>
                      </div>
                      <div style={{ fontSize:10, color:T.t3, fontFamily:SANS }}>{desc}</div>
                    </div>
                    {idx < 2 && <ChevronRight size={14} color={getProgress(f)>idx?T.teal:T.bdr} style={{ flexShrink:0 }}/>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {shipModal && (
        <Modal title={`Ship Order — ${shipModal.id}`} onClose={() => setShipModal(null)} width={400}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10.5, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Carrier</div>
            <select value={carrier} onChange={e=>setCarrier(e.target.value)}
              style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:13, fontFamily:SANS, color:T.t1 }}>
              <option value="">Select carrier…</option>
              {CARRIERS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10.5, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Tracking Number</div>
            <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="e.g. BD123456789"
              style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:13, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn onClick={() => setShipModal(null)}>Cancel</Btn>
            <Btn variant="primary" Icon={Send} onClick={() => confirmShip(shipModal.id)} disabled={!carrier||!tracking}>Confirm Shipment</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── 5. BACKORDERS ────────────────────────────────────────────────────────────
const initBackorders = [
  { id:"BO-001", originalOrder:"SO-1043", customer:"Deco Addict",   product:"Office Chair", orderedQty:5, deliveredQty:3, remainingQty:2, status:"open",   dueDate:"10 Apr", reason:"Insufficient stock" },
  { id:"BO-002", originalOrder:"SO-1045", customer:"Jackson Group", product:"USB-C Hub",    orderedQty:10,deliveredQty:7, remainingQty:3, status:"open",   dueDate:"08 Apr", reason:"Partial shipment" },
  { id:"BO-003", originalOrder:"SO-1044", customer:"Ready Mat",     product:"Large Desk",   orderedQty:3, deliveredQty:3, remainingQty:0, status:"closed", dueDate:"05 Apr", reason:"Fulfilled" },
];

export function Backorders({ products, setProducts }) {
  const [backorders, setBackorders] = useState(initBackorders);

  const fulfillBackorder = (id) => {
    const bo = backorders.find(b => b.id === id);
    if (!bo) return;
    const prod = products.find(p => p.name === bo.product);
    if (prod && prod.available < bo.remainingQty) return;

    // Deduct remaining qty from stock
    if (prod) {
      setProducts(prev => prev.map(p => {
        if (p.name !== bo.product) return p;
        const newOnHand = Math.max(0, p.onHand - bo.remainingQty);
        const newAvail  = Math.max(0, p.available - bo.remainingQty);
        return { ...p, onHand:newOnHand, available:newAvail, status:computeStatus({...p,onHand:newOnHand}) };
      }));
    }
    setBackorders(prev => prev.map(b => b.id===id ? {...b,status:"closed",remainingQty:0,deliveredQty:b.orderedQty} : b));
  };

  return (
    <div>
      <PageTitle title="Backorder Management" sub="Partial deliveries · Remaining quantities · Fulfillment tracking" actions={<Btn Icon={RefreshCw}>Sync Orders</Btn>}/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Open Backorders"  value={backorders.filter(b=>b.status==="open").length}                              sub="pending fulfillment" Icon={Clock}       accent={T.amber} />
        <KPI label="Units Remaining"  value={backorders.filter(b=>b.status==="open").reduce((a,b)=>a+b.remainingQty,0)} sub="to be shipped"       Icon={PackageOpen} accent={T.red}   />
        <KPI label="Fulfilled"        value={backorders.filter(b=>b.status==="closed").length}                            sub="completed"           Icon={CheckCircle2} accent={T.green} />
      </div>

      {backorders.some(b=>b.status==="open") && (
        <AlertBanner type="warning">
          {backorders.filter(b=>b.status==="open").length} open backorders — customers are waiting for partial deliveries to complete.
        </AlertBanner>
      )}

      <SectionCard title="All Backorders">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["BO #","Order","Customer","Product","Ordered","Delivered","Remaining","Due","Reason","Status",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {backorders.map((b,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD style={{ fontFamily:MONO, color:T.amber, fontWeight:700 }}>{b.id}</TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontSize:11.5 }}>{b.originalOrder}</TD>
                <TD style={{ fontWeight:600, color:T.t1 }}>{b.customer}</TD>
                <TD>{b.product}</TD>
                <TD style={{ fontFamily:MONO }}>{b.orderedQty}</TD>
                <TD style={{ fontFamily:MONO, color:T.green, fontWeight:600 }}>{b.deliveredQty}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:800, color:b.remainingQty>0?T.red:T.green }}>{b.remainingQty}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{b.dueDate}</TD>
                <TD style={{ color:T.t3, fontSize:12 }}>{b.reason}</TD>
                <TD><Badge status={b.status==="open"?"pending":"done"}/></TD>
                <TD>
                  {b.status==="open" && (
                    <button onClick={() => fulfillBackorder(b.id)}
                      style={{ fontSize:11, padding:"3px 9px", background:T.green, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>
                      Fulfill
                    </button>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 6. RETURNS ───────────────────────────────────────────────────────────────
const initReturns = [
  { id:"RET-001", type:"customer", order:"SO-1042", party:"Agrolait",       product:"Corner Desk",  code:"FCH-001", qty:1, reason:"Damaged on delivery",refund:12000, status:"approved", date:"03 Apr" },
  { id:"RET-002", type:"customer", order:"SO-1043", party:"Deco Addict",    product:"Office Chair", code:"FCH-004", qty:1, reason:"Wrong item received", refund:14000, status:"pending",  date:"03 Apr" },
  { id:"RET-003", type:"vendor",   order:"PO-0201", party:"Supplier Alpha", product:"Large Desk",   code:"FCH-002", qty:2, reason:"Quality failure QC",  refund:22000, status:"pending",  date:"02 Apr" },
];

export function Returns({ products, setProducts }) {
  const [returns, setReturns] = useState(initReturns);
  const [addOpen, setAddOpen] = useState(false);
  const [nr, setNr] = useState({ type:"customer", order:"", party:"", product:"", code:"", qty:1, reason:"", refund:0 });
  const [err, setErr] = useState("");

  const approveReturn = (id) => {
    const ret = returns.find(r => r.id === id);
    if (!ret) return;
    // Restore stock when return is approved
    setProducts(prev => prev.map(p => {
      if (p.code !== ret.code) return p;
      const newOnHand = p.onHand + ret.qty;
      const newAvail  = p.available + ret.qty;
      return { ...p, onHand:newOnHand, available:newAvail, status:computeStatus({...p,onHand:newOnHand}) };
    }));
    setReturns(prev => prev.map(r => r.id===id ? {...r,status:"approved"} : r));
  };

  const addReturn = () => {
    setErr("");
    if (!nr.code) { setErr("Product SKU is required."); return; }
    setReturns(prev => [...prev, {
      ...nr, id:`RET-${String(prev.length+1).padStart(3,"0")}`,
      status:"pending", date:today(),
    }]);
    setAddOpen(false);
    setNr({ type:"customer",order:"",party:"",product:"",code:"",qty:1,reason:"",refund:0 });
  };

  return (
    <div>
      <PageTitle title="Returns & Reverse Logistics" sub="Customer & vendor returns · Approve to restore stock · Refund tracking" actions={<Btn Icon={Plus} variant="primary" onClick={()=>setAddOpen(true)}>New Return</Btn>}/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Returns"   value={returns.length}                                          sub="all time"      Icon={RotateCcw}    />
        <KPI label="Pending"         value={returns.filter(r=>r.status==="pending").length}          sub="need review"   Icon={Clock}        accent={T.amber} />
        <KPI label="Refund Value"    value={fmtINR(returns.reduce((a,r)=>a+r.refund,0))}            sub="total refunds" Icon={DollarSign}   accent={T.red}   />
        <KPI label="Approved"        value={returns.filter(r=>r.status==="approved").length}         sub="stock restored" Icon={CheckCircle2} accent={T.green} />
      </div>

      <AlertBanner type="info">
        Approving a return restores stock to inventory. Rejecting a return keeps stock unchanged.
      </AlertBanner>

      {addOpen && (
        <div style={{ background:T.amberL, border:`1px solid ${T.amberB}`, borderRadius:6, padding:14, marginBottom:14 }}>
          {err && <AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Return Type</div>
              <select value={nr.type} onChange={e=>setNr(p=>({...p,type:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                <option value="customer">Customer Return</option>
                <option value="vendor">Vendor Return</option>
              </select>
            </div>
            {[["Order Ref","order","text"],["Customer / Vendor","party","text"],
              ["Product Name","product","text"],["Product SKU","code","text"],
              ["Qty","qty","number"],["Refund ₹","refund","number"],
            ].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nr[k]} onChange={e=>setNr(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:tp==="number"?MONO:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
            <div style={{ gridColumn:"1 / -1" }}>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Reason</div>
              <input value={nr.reason} onChange={e=>setNr(p=>({...p,reason:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => { setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="primary" Icon={RotateCcw} onClick={addReturn}>Create Return</Btn>
          </div>
        </div>
      )}

      <SectionCard title="Return Register">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["Return ID","Type","Order","Party","Product","SKU","Qty","Reason","Refund","Date","Status",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {returns.map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD style={{ fontFamily:MONO, color:T.amber, fontWeight:700 }}>{r.id}</TD>
                <TD><span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:r.type==="customer"?T.tealL:T.purpleL, color:r.type==="customer"?T.teal:T.purple, fontFamily:SANS }}>{r.type==="customer"?"Customer":"Vendor"}</span></TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontSize:11.5 }}>{r.order}</TD>
                <TD style={{ fontWeight:600, color:T.t1 }}>{r.party}</TD>
                <TD>{r.product}</TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontSize:11.5 }}>{r.code}</TD>
                <TD style={{ fontFamily:MONO }}>{r.qty}</TD>
                <TD style={{ color:T.t3, fontSize:12 }}>{r.reason}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700, color:T.red }}>{fmtINR(r.refund)}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{r.date}</TD>
                <TD><Badge status={r.status==="approved"?"done":r.status==="rejected"?"cancel":"pending"}/></TD>
                <TD>
                  {r.status==="pending" && (
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={() => approveReturn(r.id)}
                        style={{ fontSize:11, padding:"3px 8px", background:T.green, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>Approve</button>
                      <button onClick={() => setReturns(prev=>prev.map(x=>x.id===r.id?{...x,status:"rejected"}:x))}
                        style={{ fontSize:11, padding:"3px 8px", background:T.red, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>Reject</button>
                    </div>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 7. EXPIRY / FEFO ─────────────────────────────────────────────────────────
const initExpiry = [
  { id:1, code:"FCH-003", name:"Flipover Board",    batch:"B2024-03", qty:5,  expiry:"2026-06-30", daysLeft:83,  location:"WH/North" },
  { id:2, code:"STN-002", name:"Whiteboard Marker", batch:"B2024-08", qty:7,  expiry:"2026-08-15", daysLeft:128, location:"WH/Main"  },
  { id:3, code:"ELC-002", name:"Wireless Mouse",    batch:"B2024-06", qty:3,  expiry:"2026-09-30", daysLeft:174, location:"WH/South" },
  { id:4, code:"FCH-001", name:"Corner Desk",       batch:"B2024-01", qty:4,  expiry:"2026-12-31", daysLeft:266, location:"WH/Main"  },
  { id:5, code:"ELC-001", name:"USB-C Hub",         batch:"B2024-05", qty:32, expiry:"2027-01-15", daysLeft:281, location:"WH/Main"  },
  { id:6, code:"STN-001", name:"Notebook A5",       batch:"B2024-07", qty:80, expiry:"2027-12-31", daysLeft:635, location:"WH/Main"  },
];

export function ExpiryTracking() {
  const sorted   = [...initExpiry].sort((a,b) => a.daysLeft - b.daysLeft);
  const critical = sorted.filter(i => i.daysLeft <= 90);
  const warning  = sorted.filter(i => i.daysLeft > 90 && i.daysLeft <= 180);
  const safe     = sorted.filter(i => i.daysLeft > 180);
  const getColor = d => d<=90?T.red:d<=180?T.amber:T.green;
  const getLabel = d => d<=90?"Expiring Soon":d<=180?"Watch":"Safe";

  return (
    <div>
      <PageTitle title="Expiry Date Tracking (FEFO)" sub="First-Expired-First-Out · Batch expiry monitoring · Auto pick-order"/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Expiring ≤90 days"  value={critical.length} sub="act now"      Icon={AlertTriangle} accent={T.red}   />
        <KPI label="Expiring ≤180 days" value={warning.length}  sub="watch closely" Icon={Clock}         accent={T.amber} />
        <KPI label="Safe"               value={safe.length}     sub=">6 months"     Icon={CheckCircle2}  accent={T.green} />
        <KPI label="FEFO Rule"          value="Active"          sub="oldest picked first" Icon={RotateCcw}  />
      </div>

      {critical.length > 0 && (
        <AlertBanner type="error">
          {critical.length} batch(es) expire within 90 days. FEFO rule ensures these are picked first for all outbound orders. Consider discounting to clear stock.
        </AlertBanner>
      )}

      <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:"11px 14px", marginBottom:16, display:"flex", gap:8, alignItems:"center" }}>
        <RotateCcw size={14} color={T.teal}/>
        <div style={{ fontSize:12, color:T.t2, fontFamily:SANS }}>
          <strong style={{ color:T.teal }}>FEFO Active:</strong> When picking items for any order, the system selects the batch with the earliest expiry date first, minimising waste.
        </div>
      </div>

      <SectionCard title="Batch Expiry Register — sorted by earliest expiry (FEFO pick order)">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["FEFO #","SKU","Product","Batch","Location","Qty","Expiry Date","Days Left","Status"].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {sorted.map((item,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, background:item.daysLeft<=90?"#FCECEA33":"transparent" }}
                onMouseEnter={e=>{ if(item.daysLeft>90)e.currentTarget.style.background=T.surfAlt; }}
                onMouseLeave={e=>{ if(item.daysLeft>90)e.currentTarget.style.background="transparent"; }}>
                <TD>
                  <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, background:i===0?T.sideNav:T.surfAlt, color:i===0?"#F0EDE8":T.t3, padding:"2px 8px", borderRadius:3, display:"inline-block" }}>
                    #{i+1}{i===0?" ← First":""}
                  </div>
                </TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11.5 }}>{item.code}</TD>
                <TD style={{ fontWeight:600, color:T.t1 }}>{item.name}</TD>
                <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.t3 }}>{item.batch}</TD>
                <TD style={{ fontSize:12, color:T.t3 }}>{item.location}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:700 }}>{item.qty}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:600, color:getColor(item.daysLeft) }}>{item.expiry}</TD>
                <TD><span style={{ fontFamily:MONO, fontWeight:800, fontSize:14, color:getColor(item.daysLeft) }}>{item.daysLeft}d</span></TD>
                <TD><span style={{ fontSize:11, padding:"2px 8px", borderRadius:3, fontWeight:500, background:getColor(item.daysLeft)+"22", color:getColor(item.daysLeft), fontFamily:SANS }}>{getLabel(item.daysLeft)}</span></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 8. PRODUCT VARIANTS ──────────────────────────────────────────────────────
const initVariants = [
  { id:1, name:"Office Chair", sku:"FCH-004", variants:[
    { id:"FCH-004-BK-S", attrs:"Black / Small",  price:12000, stock:4,  status:"ok"       },
    { id:"FCH-004-BK-M", attrs:"Black / Medium", price:12000, stock:8,  status:"ok"       },
    { id:"FCH-004-BK-L", attrs:"Black / Large",  price:13000, stock:2,  status:"low"      },
    { id:"FCH-004-WH-M", attrs:"White / Medium", price:13500, stock:0,  status:"critical" },
    { id:"FCH-004-RD-L", attrs:"Red / Large",    price:14000, stock:6,  status:"ok"       },
  ]},
  { id:2, name:"USB-C Hub", sku:"ELC-001", variants:[
    { id:"ELC-001-4P",  attrs:"4 Ports",  price:1800, stock:12, status:"ok"  },
    { id:"ELC-001-7P",  attrs:"7 Ports",  price:2200, stock:15, status:"ok"  },
    { id:"ELC-001-10P", attrs:"10 Ports", price:2800, stock:5,  status:"low" },
  ]},
];

export function ProductVariants() {
  const [products, setProducts] = useState(initVariants);
  const [expanded, setExpanded] = useState([1]);

  const toggleExpand = id => setExpanded(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);

  const updateStock = (prodId, varId, delta) => {
    setProducts(prev => prev.map(p => p.id!==prodId ? p : {
      ...p,
      variants: p.variants.map(v => {
        if (v.id !== varId) return v;
        const newStock = Math.max(0, v.stock + delta);
        const status   = newStock===0?"critical":newStock<=3?"low":"ok";
        return { ...v, stock:newStock, status };
      }),
    }));
  };

  return (
    <div>
      <PageTitle title="Product Variants" sub="Size / colour / spec variants under one parent SKU" actions={<Btn Icon={Plus} variant="primary">Add Variant Product</Btn>}/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Variant Products" value={products.length}                                                       sub="parent SKUs"  Icon={Layers}  />
        <KPI label="Total Variants"   value={products.reduce((a,p)=>a+p.variants.length,0)}                         sub="child SKUs"   Icon={PackageOpen} accent={T.blue}  />
        <KPI label="Out of Stock"     value={products.reduce((a,p)=>a+p.variants.filter(v=>v.stock===0).length,0)}  sub="variant SKUs" Icon={XCircle} accent={T.red}   />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {products.map(prod => (
          <div key={prod.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
            <button onClick={() => toggleExpand(prod.id)}
              style={{ width:"100%", padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer", borderBottom:expanded.includes(prod.id)?`1px solid ${T.bdr}`:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:14, fontWeight:700, color:T.t1, fontFamily:SANS }}>{prod.name}</span>
                <span style={{ fontFamily:MONO, fontSize:11.5, color:T.teal, background:T.tealL, padding:"2px 8px", borderRadius:3 }}>{prod.sku}</span>
                <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{prod.variants.length} variants · {prod.variants.reduce((a,v)=>a+v.stock,0)} total units</span>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {prod.variants.some(v=>v.status==="critical") && <span style={{ fontSize:11, color:T.red, fontFamily:SANS }}>⚠ OOS variants</span>}
                <ChevronRight size={14} color={T.t3} style={{ transform:expanded.includes(prod.id)?"rotate(90deg)":"none", transition:"transform 0.2s" }}/>
              </div>
            </button>
            {expanded.includes(prod.id) && (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
                  {["Variant SKU","Attributes","Price","Stock","Status","Adjust"].map(h=><TH key={h}>{h}</TH>)}
                </tr></thead>
                <tbody>
                  {prod.variants.map((v,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, background:v.stock===0?T.redL+"55":"transparent" }}>
                      <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11.5 }}>{v.id}</TD>
                      <TD style={{ fontWeight:500, color:T.t1 }}>{v.attrs}</TD>
                      <TD style={{ fontFamily:MONO, fontWeight:700 }}>{fmtINR(v.price)}</TD>
                      <TD style={{ fontFamily:MONO, fontWeight:700, color:v.stock===0?T.red:v.stock<=3?T.amber:T.t1 }}>{v.stock}</TD>
                      <TD><Badge status={v.status}/></TD>
                      <TD>
                        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                          <button onClick={() => updateStock(prod.id, v.id, -1)}
                            style={{ width:22, height:22, border:`1px solid ${T.bdr}`, borderRadius:3, background:T.surfBg, cursor:"pointer", fontFamily:MONO, fontSize:14, color:T.red }}>-</button>
                          <button onClick={() => updateStock(prod.id, v.id, +1)}
                            style={{ width:22, height:22, border:`1px solid ${T.bdr}`, borderRadius:3, background:T.surfBg, cursor:"pointer", fontFamily:MONO, fontSize:14, color:T.green }}>+</button>
                        </div>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 9. PRICE LISTS ───────────────────────────────────────────────────────────
const initPriceLists = [
  { id:"PL-001", name:"Retail Standard",  type:"standard", discount:0,  customers:["All"],                       active:true  },
  { id:"PL-002", name:"Wholesale 10%",    type:"discount", discount:10, customers:["Agrolait","Ready Mat"],       active:true  },
  { id:"PL-003", name:"VIP 20%",          type:"discount", discount:20, customers:["Deco Addict"],                active:true  },
  { id:"PL-004", name:"Bulk Order 15%",   type:"volume",   discount:15, customers:["Jackson Group"],              active:true  },
  { id:"PL-005", name:"Seasonal Sale 5%", type:"discount", discount:5,  customers:["All"],                       active:false },
];

const priceListProducts = [
  { name:"Corner Desk",    base:12000 },
  { name:"Office Chair",   base:14000 },
  { name:"USB-C Hub",      base:2200  },
  { name:"Notebook A5",    base:250   },
  { name:"Smart Speaker",  base:5500  },
];

export function PriceLists() {
  const [lists, setLists]     = useState(initPriceLists);
  const [selected, setSelected] = useState(initPriceLists[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [nl, setNl] = useState({ name:"", type:"discount", discount:5, customers:"All", active:true });

  const addList = () => {
    const newList = { ...nl, id:`PL-${String(lists.length+1).padStart(3,"0")}`, customers:nl.customers.split(",").map(s=>s.trim()) };
    setLists(prev => [...prev, newList]);
    setAddOpen(false);
    setNl({ name:"", type:"discount", discount:5, customers:"All", active:true });
  };

  return (
    <div>
      <PageTitle title="Price Lists" sub="Customer-specific pricing · Volume discounts · Seasonal offers" actions={<Btn Icon={Plus} variant="primary" onClick={()=>setAddOpen(true)}>New Price List</Btn>}/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active Lists"   value={lists.filter(l=>l.active).length}              sub="in use"          Icon={Tag}  />
        <KPI label="Max Discount"   value={`${Math.max(...lists.map(l=>l.discount))}%`}   sub="highest tier"    Icon={Star} accent={T.amber} />
        <KPI label="VIP Customers"  value={lists.filter(l=>l.discount>=15).reduce((a,l)=>a+l.customers.filter(c=>c!=="All").length,0)} sub="on special pricing" Icon={Users} accent={T.teal} />
      </div>

      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9 }}>
            {[["List Name","name","text"],["Discount %","discount","number"],["Customers (comma-sep)","customers","text"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nl[k]} onChange={e=>setNl(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Type</div>
              <select value={nl.type} onChange={e=>setNl(p=>({...p,type:e.target.value}))}
                style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                <option value="standard">Standard</option><option value="discount">Discount</option><option value="volume">Volume</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={addList}>Save Price List</Btn>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"240px 1fr", gap:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {lists.map(l => (
            <button key={l.id} onClick={() => setSelected(l)}
              style={{ padding:"10px 12px", background:selected.id===l.id?T.tealL:T.surfBg, border:`1px solid ${selected.id===l.id?T.teal:T.bdr}`, borderRadius:5, cursor:"pointer", textAlign:"left", opacity:l.active?1:0.5 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:3 }}>{l.name}</div>
              <div style={{ display:"flex", gap:6 }}>
                <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, fontFamily:SANS, background:l.type==="standard"?T.surfAlt:l.type==="volume"?T.blueL:T.amberL, color:l.type==="standard"?T.t4:l.type==="volume"?T.blue:T.amber, fontWeight:500 }}>{l.type}</span>
                {l.discount > 0 && <span style={{ fontSize:10, color:T.green, fontFamily:MONO, fontWeight:700 }}>-{l.discount}%</span>}
                {!l.active && <span style={{ fontSize:10, color:T.t3, fontFamily:SANS }}>inactive</span>}
              </div>
            </button>
          ))}
        </div>

        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:T.t1, fontFamily:SANS }}>{selected.name}</div>
              <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, marginTop:2 }}>Applies to: {selected.customers.join(", ")}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:28, fontWeight:800, fontFamily:MONO, color:selected.discount>0?T.green:T.t3 }}>
                {selected.discount>0?`-${selected.discount}%`:"Standard"}
              </div>
            </div>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
              {["Product","Base Price","Discount","Final Price","Saving"].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {priceListProducts.map((p,i) => {
                const disc  = selected.discount / 100;
                const final = Math.round(p.base * (1 - disc));
                const saving = p.base - final;
                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}>
                    <TD style={{ fontWeight:600, color:T.t1 }}>{p.name}</TD>
                    <TD style={{ fontFamily:MONO }}>{fmtINR(p.base)}</TD>
                    <TD style={{ fontFamily:MONO, color:selected.discount>0?T.red:T.t3 }}>{selected.discount>0?`-${selected.discount}%`:"—"}</TD>
                    <TD style={{ fontFamily:MONO, fontWeight:700, color:T.t1 }}>{fmtINR(final)}</TD>
                    <TD style={{ fontFamily:MONO, color:saving>0?T.green:T.t3, fontWeight:600 }}>{saving>0?fmtINR(saving):"—"}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 10. DROPSHIPPING ────────────────────────────────────────────────────────
const initDropships = [
  { id:"DS-001", salesOrder:"SO-1046", customer:"Lumber Inc",    product:"Flipover Board", qty:3, vendor:"Supplier Alpha", vendorPO:"VPO-001", status:"vendor_confirmed",    date:"30 Mar", customerAddr:"Mumbai, MH" },
  { id:"DS-002", salesOrder:"SO-1045", customer:"Jackson Group", product:"USB-C Hub",      qty:5, vendor:"Supplier Beta",  vendorPO:"VPO-002", status:"shipped_to_customer", date:"31 Mar", customerAddr:"Delhi, DL"  },
];

const DS_STAGES = [
  { key:"sent_to_vendor",       label:"PO Sent"       },
  { key:"vendor_confirmed",     label:"Vendor OK"     },
  { key:"shipped_to_customer",  label:"Shipped Direct"},
  { key:"delivered",            label:"Delivered"     },
];

export function Dropshipping() {
  const [dropships, setDropships] = useState(initDropships);
  const [addOpen, setAddOpen]     = useState(false);
  const [nd, setNd] = useState({ salesOrder:"", customer:"", product:"", qty:1, vendor:"", customerAddr:"" });
  const [err, setErr] = useState("");

  const addDropship = () => {
    setErr("");
    if (!nd.customer || !nd.product || !nd.vendor) { setErr("Customer, product, and vendor are required."); return; }
    setDropships(prev => [...prev, {
      ...nd,
      id:`DS-${String(prev.length+1).padStart(3,"0")}`,
      vendorPO:`VPO-${String(prev.length+1).padStart(3,"0")}`,
      status:"sent_to_vendor",
      date:today(),
    }]);
    setAddOpen(false);
    setNd({ salesOrder:"", customer:"", product:"", qty:1, vendor:"", customerAddr:"" });
  };

  const advanceStatus = (id) => {
    const order = DS_STAGES.map(s => s.key);
    setDropships(prev => prev.map(d => {
      if (d.id !== id) return d;
      const idx = order.indexOf(d.status);
      return idx < order.length - 1 ? { ...d, status:order[idx+1] } : d;
    }));
  };

  return (
    <div>
      <PageTitle title="Dropshipping" sub="Vendor ships directly to customer · No warehouse handling · Full status tracking" actions={<Btn Icon={Plus} variant="primary" onClick={()=>setAddOpen(true)}>New Dropship</Btn>}/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active"      value={dropships.filter(d=>d.status!=="delivered").length} sub="in progress"    Icon={Send}         />
        <KPI label="With Vendor" value={dropships.filter(d=>["sent_to_vendor","vendor_confirmed"].includes(d.status)).length} sub="awaiting dispatch" Icon={Clock} accent={T.amber} />
        <KPI label="En Route"    value={dropships.filter(d=>d.status==="shipped_to_customer").length} sub="to customer"   Icon={Truck}        accent={T.blue}  />
        <KPI label="Delivered"   value={dropships.filter(d=>d.status==="delivered").length} sub="completed"      Icon={CheckCircle2} accent={T.green} />
      </div>

      <AlertBanner type="info">
        In dropshipping, stock never enters your warehouse. The vendor ships directly to the customer address. No inventory impact — only tracking.
      </AlertBanner>

      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          {err && <AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            {[["Sales Order Ref","salesOrder","text"],["Customer Name","customer","text"],
              ["Product","product","text"],["Qty","qty","number"],
              ["Vendor / Supplier","vendor","text"],["Customer Address","customerAddr","text"],
            ].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nd[k]} onChange={e=>setNd(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => { setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="primary" Icon={Truck} onClick={addDropship}>Create Dropship</Btn>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {dropships.map(d => {
          const stageIdx = DS_STAGES.findIndex(s => s.key === d.status);
          return (
            <div key={d.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontFamily:MONO, fontWeight:700, color:T.teal }}>{d.id}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>{d.customer}</span>
                  <span style={{ fontSize:12, color:T.t3, fontFamily:SANS }}>{d.product} × {d.qty}</span>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>via <strong>{d.vendor}</strong> · <span style={{ fontFamily:MONO }}>{d.vendorPO}</span></span>
                  <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{d.customerAddr}</span>
                  {d.status !== "delivered" && (
                    <button onClick={() => advanceStatus(d.id)}
                      style={{ fontSize:11, padding:"4px 12px", background:T.teal, border:"none", borderRadius:4, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:600 }}>
                      Advance →
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                {DS_STAGES.map((stage,idx) => (
                  <div key={stage.key} style={{ display:"flex", alignItems:"center", flex:1 }}>
                    <div style={{ flex:1, padding:"8px 10px", borderRadius:4, textAlign:"center", background:idx<=stageIdx?T.tealL:T.surfAlt, border:`1px solid ${idx<=stageIdx?T.tealM:T.bdr}` }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                        {idx<stageIdx?<CheckCircle2 size={11} color={T.green}/>:idx===stageIdx?<Activity size={11} color={T.teal}/>:<Clock size={11} color={T.t3}/>}
                        <span style={{ fontSize:10.5, fontWeight:idx<=stageIdx?700:400, color:idx<=stageIdx?T.teal:T.t3, fontFamily:SANS }}>{stage.label}</span>
                      </div>
                    </div>
                    {idx < DS_STAGES.length-1 && <ArrowRight size={11} color={idx<stageIdx?T.teal:T.bdr} style={{ flexShrink:0 }}/>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// named export for RefreshCw used in Backorders
import { RefreshCw } from "lucide-react";

import { useState } from "react";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity,
  Plus, Trash2, X, ArrowRight, ChevronRight,
  Shield, RotateCcw, MapPin, Tag, Layers,
  DollarSign, Users, Star, Send, PackageOpen, Truck,
  RefreshCw
} from "lucide-react";
import { T, MONO, SANS, WAREHOUSES, fmtINR, today } from "./data.js";
import { Badge, KPI, PageTitle, Btn, TH, TD, SectionCard, Modal, AlertBanner, ProgressBar } from "./ui.jsx";
import { computeStatus } from "./modules.jsx";
import { useHighPriority } from "./hooks/useHighPriority.js";

// ─── 1. QUALITY CONTROL ───────────────────────────────────────────────────────
export function QualityControl({ products, setProducts }) {
  const { qcChecks, submitInspection, qcOnline } = useHighPriority();
  const [activeCheck, setActive]  = useState(null);
  const [passed,      setPassed]  = useState(0);
  const [failed,      setFailed]  = useState(0);
  const [notes,       setNotes]   = useState("");
  const [inspector,   setInspector] = useState("");
  const [err,         setErr]     = useState("");

  const openInspect = (check) => {
    setActive(check);
    setPassed(check.totalQty);
    setFailed(0);
    setErr("");
  };

  const handleSubmit = async () => {
    setErr("");
    if (passed + failed !== activeCheck.totalQty) {
      setErr(`Passed + Failed must equal total qty (${activeCheck.totalQty})`);
      return;
    }
    const result = await submitInspection(
      activeCheck.id,
      activeCheck._uuid,
      { passed, failed, notes, inspector },
      () => {
        if (failed > 0 && activeCheck.type === "incoming") {
          setProducts(prev => prev.map(p => {
            if (p.code !== activeCheck.code) return p;
            const newAvail = Math.max(0, p.available - failed);
            return { ...p, available:newAvail, status:computeStatus({...p}) };
          }));
        }
        setActive(null);
        setPassed(0); setFailed(0); setNotes(""); setInspector("");
      }
    );
    if (!result.ok) setErr(result.error || "Submission failed.");
  };

  const totalFailed    = (qcChecks || []).reduce((a,c) => a + c.failed, 0);
  const totalInspected = (qcChecks || []).filter(c => c.status==="done" || c.status==="failed").length;
  const passRate       = totalInspected > 0
    ? Math.round((qcChecks || []).filter(c=>c.status==="done").length / totalInspected * 100) : 100;

  return (
    <div>
      <PageTitle
        title="Quality Control"
        sub={`Inspect incoming & outgoing items · Pass/fail · Quarantine failed stock${qcOnline?" · 🟢 Live":"  · 🟡 Offline"}`}
        actions={<Btn Icon={Plus} variant="primary">New QC Check</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Pass Rate"    value={`${passRate}%`}                                          sub="quality score"       Icon={CheckCircle2} accent={T.green} />
        <KPI label="Pending"      value={(qcChecks || []).filter(c=>c.status==="pending").length} sub="awaiting inspection"  Icon={Clock}        accent={T.amber} />
        <KPI label="Failed Units" value={totalFailed}                                             sub="quarantined"          Icon={XCircle}      accent={T.red}   />
        <KPI label="Inspected"    value={totalInspected}                                          sub="this month"           Icon={Shield}       />
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
            {(qcChecks || []).map((c,i) => (
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
          {err && <AlertBanner type="error">{err}</AlertBanner>}
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
            <Btn variant="primary" Icon={CheckCircle2} onClick={handleSubmit} disabled={passed+failed!==activeCheck.totalQty}>
              Submit Inspection
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── 2. SCRAP MANAGEMENT ──────────────────────────────────────────────────────
export function ScrapManagement({ products, setProducts }) {
  const { scraps, addScrap, writeOff, scrapOnline } = useHighPriority();
  const [addOpen, setAddOpen] = useState(false);
  const [ns, setNs] = useState({ code:"", qty:1, reason:"", unitCost:0, by:"Admin" });
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    const result = await addScrap(ns, products);
    if (!result.ok) { setErr(result.error); return; }
    setAddOpen(false);
    setNs({ code:"", qty:1, reason:"", unitCost:0, by:"Admin" });
  };

  const handleWriteOff = async (scrap) => {
    const result = await writeOff(scrap.id, scrap._uuid);
    if (result.ok) {
      setProducts(prev => prev.map(p => {
        if (p.code !== scrap.code) return p;
        const newOnHand = Math.max(0, p.onHand - scrap.qty);
        const newAvail  = Math.max(0, p.available - scrap.qty);
        return { ...p, onHand:newOnHand, available:newAvail, status:computeStatus({...p,onHand:newOnHand}) };
      }));
    }
  };

  const totalWrittenOff = (scraps || []).filter(s=>s.status==="written_off").reduce((a,s)=>a+s.unitCost*s.qty,0);
  const pendingValue    = (scraps || []).filter(s=>s.status==="pending").reduce((a,s)=>a+s.unitCost*s.qty,0);

  return (
    <div>
      <PageTitle
        title="Scrap & Damaged Goods"
        sub={`Log defective items · Write off stock value · Dispose permanently${scrapOnline?" · 🟢 Live":" · 🟡 Offline"}`}
        actions={<Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Log Scrap</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Scrapped" value={(scraps || []).reduce((a,s)=>a+s.qty,0)}              sub="units disposed"    Icon={Trash2}        accent={T.red}   />
        <KPI label="Written Off"    value={fmtINR(totalWrittenOff)}                       sub="value removed"     Icon={DollarSign}    accent={T.red}   />
        <KPI label="Pending Review" value={(scraps || []).filter(s=>s.status==="pending").length} sub="need write-off"    Icon={Clock}         accent={T.amber} />
        <KPI label="At Risk Value"  value={fmtINR(pendingValue)}                          sub="pending write-off" Icon={AlertTriangle} accent={T.amber} />
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
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => { setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="danger" Icon={Trash2} onClick={handleAdd}>Log Scrap</Btn>
          </div>
        </div>
      )}

      <SectionCard title="Scrap Register">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["Scrap ID","Product","SKU","Qty","Reason","Value","By","Date","Status",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {(scraps || []).map((s,i) => (
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
                    <button onClick={() => handleWriteOff(s)}
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
export function PutawayRules() {
  const { putawayRules, addPutawayRule, togglePutawayRule, deletePutawayRule, putawayOnline } = useHighPriority();
  const [addOpen, setAddOpen] = useState(false);
  const [err,     setErr]     = useState("");
  const [saving,  setSaving]  = useState(false);
  const [nr, setNr] = useState({ category:"", productCode:"", from:"WH/Main/Receiving", to:"WH/Main/Shelf-A", condition:"", priority:3 });

  const addRule = async () => {
    setErr("");
    if (!nr.to.trim()) { setErr("Destination location is required."); return; }
    setSaving(true);
    const result = await addPutawayRule(nr);
    setSaving(false);
    if (!result.ok) { setErr(result.error || "Failed to save rule."); return; }
    setAddOpen(false);
    setNr({ category:"", productCode:"", from:"WH/Main/Receiving", to:"WH/Main/Shelf-A", condition:"", priority:3 });
  };

  const toggleActive = async (id) => { await togglePutawayRule(id); };
  const rules = putawayRules || [];

  return (
    <div>
      <PageTitle title="Putaway Rules" sub="Auto-assign received products to correct storage locations" actions={<Btn Icon={Plus} variant="primary" onClick={()=>setAddOpen(true)}>Add Rule</Btn>}/>
      <AlertBanner type="info">Putaway rules automatically route received products to the correct bin/shelf. Lower priority number = higher priority. SKU-specific rules override category rules.</AlertBanner>
      {err && <AlertBanner type="error">{err}</AlertBanner>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active Rules"   value={rules.filter(r=>r.active).length}                          sub="currently applied"  Icon={MapPin}       />
        <KPI label="SKU-Specific"   value={rules.filter(r=>r.productCode).length}                     sub="product overrides"  Icon={CheckCircle2} accent={T.green} />
        <KPI label="Category Rules" value={rules.filter(r=>r.category&&!r.productCode).length}        sub="broad rules"        Icon={Layers}       accent={T.blue}  />
      </div>
      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            {[["Category","category","text"],["Product SKU","productCode","text"],["From","from","text"],["To","to","text"],["Description","condition","text"],["Priority","priority","number"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nr[k]} onChange={e=>setNr(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={()=>setAddOpen(false)}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={addRule} disabled={saving}>{saving?"Saving…":"Save Rule"}</Btn>
          </div>
        </div>
      )}
      <SectionCard title={`Putaway Rules — sorted by priority${putawayOnline?" · 🟢 Live":" · 🟡 Offline"}`}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
            {["Priority","Rule ID","Category","SKU","From","→ To","Description","Active",""].map(h=><TH key={h}>{h}</TH>)}
          </tr></thead>
          <tbody>
            {[...rules].sort((a,b)=>a.priority-b.priority).map((r,i)=>(
              <tr key={r.id||i} style={{ borderBottom:`1px solid ${T.bdr2}`, opacity:r.active?1:0.5 }}>
                <TD><div style={{ width:24, height:24, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:MONO, fontSize:11, fontWeight:700, color:T.teal }}>{r.priority}</div></TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:700 }}>{r.ruleNo||r.id}</TD>
                <TD>{r.category||<span style={{color:T.t3}}>Any</span>}</TD>
                <TD style={{ fontFamily:MONO, fontSize:11.5, color:T.teal }}>{r.productCode||<span style={{color:T.t3,fontFamily:SANS}}>All</span>}</TD>
                <TD style={{ color:T.t3, fontSize:12 }}>{r.from}</TD>
                <TD><span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600, color:T.teal }}><ArrowRight size={11}/>{r.to}</span></TD>
                <TD style={{ color:T.t3, fontSize:12 }}>{r.condition}</TD>
                <TD>
                  <button onClick={()=>toggleActive(r.id)} style={{ width:36, height:20, borderRadius:99, border:"none", background:r.active?T.teal:T.bdr, cursor:"pointer", position:"relative" }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:r.active?19:3, transition:"left 0.2s" }}/>
                  </button>
                </TD>
                <TD><button onClick={()=>deletePutawayRule(r.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3 }}><Trash2 size={12}/></button></TD>
              </tr>
            ))}
            {rules.length===0&&<tr><td colSpan={9} style={{ padding:"24px", textAlign:"center", color:T.t3, fontFamily:SANS, fontSize:13 }}>No putaway rules yet — add your first rule above.</td></tr>}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 4. PICK → PACK → SHIP ────────────────────────────────────────────────────
const CARRIERS = ["BlueDart","Delhivery","DTDC","FedEx","India Post","Ekart"];

export function PickPackShip() {
  const { fulfillments, advanceFulfillmentStep, fulfilOnline } = useHighPriority();
  const [shipModal, setShipModal] = useState(null);
  const [carrier,   setCarrier]   = useState("");
  const [tracking,  setTracking]  = useState("");
  const [err,       setErr]       = useState("");

  // Map the live database payload into safe UI format
  const items = (fulfillments || []).map(f => ({
    id:         f.id,
    fulfilNo:   f.fulfilNo || f.fulfil_no,
    order:      f.order    || f.order_no,
    customer:   f.customer,
    product:    f.product  || f.product_name,
    qty:        f.qty      || f.quantity,
    pickStatus: f.pickStatus || f.pick_status || "pending",
    packStatus: f.packStatus || f.pack_status || "pending",
    shipStatus: f.shipStatus || f.ship_status || "pending",
    carrier:    f.carrier  || "",
    tracking:   f.tracking || f.tracking_no || "",
  }));

  const stepOrder = ["pickStatus","packStatus","shipStatus"];
  const getProgress = (f) => stepOrder.filter(s=>f[s]==="done").length;
  const DB_STEP = { pickStatus:"pick_status", packStatus:"pack_status", shipStatus:"ship_status" };

  const nextStep = async (id) => {
    setErr("");
    const f = items.find(x=>x.id===id);
    if (!f) return;
    const cur = stepOrder.find(s=>f[s]==="pending");
    if (!cur) return;
    if (cur==="shipStatus") { setShipModal(f); return; }
    
    // Call API with correct database column string
    const result = await advanceFulfillmentStep(id, DB_STEP[cur]);
    if (!result.ok) setErr(result.error || "Failed to advance step.");
  };

  const confirmShip = async (id) => {
    if (!carrier||!tracking) { setErr("Carrier and tracking number are required."); return; }
    setErr("");
    const result = await advanceFulfillmentStep(id, "ship_status", carrier, tracking);
    if (!result.ok) { setErr(result.error || "Failed to ship."); return; }
    setShipModal(null); setCarrier(""); setTracking("");
  };

  return (
    <div>
      <PageTitle title="Pick → Pack → Ship" sub={`3-step order fulfillment · Real-time status · Carrier assignment${fulfilOnline?" · 🟢 Live":" · 🟡 Offline"}`}/>
      {err && <AlertBanner type="error">{err}</AlertBanner>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        {[["Pending Pick",items.filter(f=>f.pickStatus==="pending").length,T.amber],["Pending Pack",items.filter(f=>f.pickStatus==="done"&&f.packStatus==="pending").length,T.blue],["Pending Ship",items.filter(f=>f.packStatus==="done"&&f.shipStatus==="pending").length,T.teal],["Shipped",items.filter(f=>f.shipStatus==="done").length,T.green]].map(([lbl,val,ac])=>(
          <div key={lbl} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px", borderTop:`3px solid ${ac}` }}>
            <div style={{ fontSize:11, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:8 }}>{lbl}</div>
            <div style={{ fontSize:28, fontWeight:800, fontFamily:MONO, color:ac }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {items.map(f=>{
          const progress=getProgress(f); const cur=stepOrder.find(s=>f[s]==="pending");
          return (
            <div key={f.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:T.teal }}>{f.fulfilNo||f.id}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>{f.customer}</span>
                  <span style={{ fontSize:12, color:T.t3, fontFamily:SANS }}>{f.product||f.product_name} × {f.qty||f.quantity}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {f.tracking&&<span style={{ fontFamily:MONO, fontSize:11, color:T.teal, background:T.tealL, padding:"2px 8px", borderRadius:3, border:`1px solid ${T.tealM}` }}>{f.carrier}: {f.tracking}</span>}
                  <div style={{ width:80 }}><ProgressBar pct={progress/3*100} color={progress===3?T.green:T.teal}/><div style={{ fontSize:10, color:T.t3, fontFamily:SANS, marginTop:2, textAlign:"right" }}>{progress}/3</div></div>
                  {cur&&<button onClick={()=>nextStep(f.id)} style={{ fontSize:12, padding:"5px 12px", background:T.teal, border:"none", borderRadius:4, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:600 }}>{cur==="pickStatus"?"Mark Picked":cur==="packStatus"?"Mark Packed":"Ship Now →"}</button>}
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
                    {idx<2&&<ChevronRight size={14} color={getProgress(f)>idx?T.teal:T.bdr} style={{ flexShrink:0 }}/>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div style={{ padding:"30px 0", textAlign:"center", color:T.t3, fontFamily:SANS, fontSize:13 }}>
            No fulfillment tickets pending. Create a Sale Order to auto-generate one here.
          </div>
        )}
      </div>
      {shipModal&&(
        <Modal title={`Ship Order — ${shipModal.fulfilNo||shipModal.id}`} onClose={()=>setShipModal(null)} width={400}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10.5, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Carrier</div>
            <select value={carrier} onChange={e=>setCarrier(e.target.value)} style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:13, fontFamily:SANS, color:T.t1 }}>
              <option value="">Select carrier…</option>{CARRIERS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10.5, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Tracking Number</div>
            <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="e.g. BD123456789" style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:13, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn onClick={()=>setShipModal(null)}>Cancel</Btn>
            <Btn variant="primary" Icon={Send} onClick={()=>confirmShip(shipModal.id)} disabled={!carrier||!tracking}>Confirm Shipment →</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── 5. BACKORDERS ────────────────────────────────────────────────────────────
export function Backorders({ products, setProducts }) {
  const { backorders, fulfillBackorder: _fulfill, createBackorder, boOnline } = useHighPriority();
  const [addOpen, setAddOpen] = useState(false);
  const [err, setErr] = useState("");
  const [nbo, setNbo] = useState({ order_no: "", customer: "", productCode: "", required_qty: 1, available_qty: 0 });

  const handleCreate = async () => {
    setErr("");
    if (!nbo.order_no || !nbo.customer || !nbo.productCode) {
      setErr("Please fill in Order Ref, Customer, and SKU.");
      return;
    }

    const prod = products.find(p => p.code === nbo.productCode);
    if (!prod) { 
      setErr("Product SKU not found in inventory."); 
      return; 
    }

    if (nbo.required_qty <= nbo.available_qty) {
      setErr("Required quantity must be greater than available quantity to create a backorder.");
      return;
    }

    const result = await createBackorder({
      order_no: nbo.order_no,
      customer: nbo.customer,
      product_id: prod._uuid || prod.id,
      product_name: prod.name,
      required_qty: Number(nbo.required_qty),
      available_qty: Number(nbo.available_qty)
    });

    if (!result.ok) { 
      setErr(result.error || "Failed to create backorder."); 
      return; 
    }
    
    setAddOpen(false);
    setNbo({ order_no: "", customer: "", productCode: "", required_qty: 1, available_qty: 0 });
  };

  const handleFulfill = async (id) => {
    setErr("");
    const bo = (backorders || []).find(b=>b.id===id);
    if (!bo) return;
    const prod = products.find(p=>p.name===bo.product||p.code===bo.productCode);
    if (prod && prod.available < (bo.remainingQty || bo.remaining_qty || 0)) {
      setErr(`Insufficient stock for ${bo.product}. Available: ${prod?.available||0}, Need: ${bo.remainingQty || bo.remaining_qty}`);
      return;
    }
    const result = await _fulfill(id);
    if (!result.ok) { setErr(result.error || "Failed to fulfill backorder."); return; }
    if (prod) {
      setProducts(prev=>prev.map(p=>{
        if (p.name!==bo.product&&p.code!==bo.productCode) return p;
        const remaining = bo.remainingQty || bo.remaining_qty || 0;
        const newOnHand=Math.max(0,p.onHand-remaining);
        return {...p,onHand:newOnHand,available:Math.max(0,newOnHand-p.reserved),status:computeStatus({...p,onHand:newOnHand})};
      }));
    }
  };

  return (
    <div>
      <PageTitle 
        title="Backorder Management" 
        sub={`Partial deliveries · Remaining quantities${boOnline?" · 🟢 Live":" · 🟡 Offline"}`} 
        actions={
          <>
            <Btn Icon={RefreshCw}>Sync Orders</Btn>
            <Btn Icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>New Backorder</Btn>
          </>
        }
      />
      {err && <AlertBanner type="error">{err}</AlertBanner>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Open Backorders" value={(backorders || []).filter(b=>b.status==="open").length}                             sub="pending fulfillment" Icon={Clock}        accent={T.amber} />
        <KPI label="Units Remaining" value={(backorders || []).filter(b=>b.status==="open").reduce((a,b)=>a+(b.remainingQty||b.remaining_qty||0),0)} sub="to be shipped"       Icon={PackageOpen}  accent={T.red}   />
        <KPI label="Fulfilled"       value={(backorders || []).filter(b=>b.status==="closed").length}                           sub="completed"           Icon={CheckCircle2} accent={T.green} />
      </div>
      {(backorders || []).some(b=>b.status==="open")&&<AlertBanner type="warning">{(backorders || []).filter(b=>b.status==="open").length} open backorders — customers are waiting for partial deliveries.</AlertBanner>}
      
      {addOpen && (
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:9 }}>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Order Ref</div>
              <input value={nbo.order_no} onChange={e=>setNbo(p=>({...p,order_no:e.target.value}))} placeholder="e.g. SO-1050" style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Customer Name</div>
              <input value={nbo.customer} onChange={e=>setNbo(p=>({...p,customer:e.target.value}))} placeholder="e.g. TechCorp" style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Product SKU</div>
              <input value={nbo.productCode} onChange={e=>setNbo(p=>({...p,productCode:e.target.value}))} placeholder="e.g. FCH-001" style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Required Qty</div>
              <input type="number" min={1} value={nbo.required_qty} onChange={e=>setNbo(p=>({...p,required_qty:Number(e.target.value)}))} style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Available Qty</div>
              <input type="number" min={0} value={nbo.available_qty} onChange={e=>setNbo(p=>({...p,available_qty:Number(e.target.value)}))} style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:MONO, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={() => { setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={handleCreate}>Save Backorder</Btn>
          </div>
        </div>
      )}

      <SectionCard title="All Backorders">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>{["BO #","Order","Customer","Product","Ordered","Delivered","Remaining","Due","Reason","Status",""].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {(backorders || []).map((b,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }} onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD style={{ fontFamily:MONO, color:T.amber, fontWeight:700 }}>{b.boNo||b.bo_no||b.id}</TD>
                <TD style={{ fontFamily:MONO, color:T.teal, fontSize:11.5 }}>{b.originalOrder||b.order_no||b.original_order}</TD>
                <TD style={{ fontWeight:600, color:T.t1 }}>{b.customer}</TD>
                <TD>{b.product || b.product_name}</TD>
                <TD style={{ fontFamily:MONO }}>{b.orderedQty||b.ordered_qty}</TD>
                <TD style={{ fontFamily:MONO, color:T.green, fontWeight:600 }}>{b.deliveredQty||b.delivered_qty}</TD>
                <TD style={{ fontFamily:MONO, fontWeight:800, color:(b.remainingQty||b.remaining_qty||0)>0?T.red:T.green }}>{b.remainingQty||b.remaining_qty||0}</TD>
                <TD style={{ fontFamily:MONO, color:T.t3, fontSize:12 }}>{b.dueDate||b.due_date||"—"}</TD>
                <TD style={{ color:T.t3, fontSize:12 }}>{b.reason||"—"}</TD>
                <TD><Badge status={b.status==="open"?"pending":"done"}/></TD>
                <TD>{b.status==="open"&&<button onClick={()=>handleFulfill(b.id)} style={{ fontSize:11, padding:"3px 9px", background:T.green, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>Fulfill</button>}</TD>
              </tr>
            ))}
            {(backorders || []).length === 0 && (
              <tr><td colSpan={11} style={{ padding:"30px 0", textAlign:"center", color:T.t3, fontFamily:SANS, fontSize:13 }}>No backorders found.</td></tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 6. RETURNS ───────────────────────────────────────────────────────────────
export function Returns({ products, setProducts }) {
  const { returns, addReturn, approveReturn, rejectReturn, retOnline } = useHighPriority();
  const [addOpen, setAddOpen] = useState(false);
  const [nr, setNr] = useState({ type:"customer", order:"", party:"", product:"", code:"", qty:1, reason:"", refund:0 });
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    const result = await addReturn(nr, products);
    if (!result.ok) { setErr(result.error); return; }
    setAddOpen(false);
    setNr({ type:"customer", order:"", party:"", product:"", code:"", qty:1, reason:"", refund:0 });
  };

  const handleApprove = async (ret) => {
    const result = await approveReturn(ret.id, ret._uuid);
    if (result.ok) {
      setProducts(prev => prev.map(p => {
        if (p.code !== ret.code) return p;
        const newOnHand = p.onHand + ret.qty;
        return { ...p, onHand:newOnHand, available:p.available+ret.qty, status:computeStatus({...p,onHand:newOnHand}) };
      }));
    }
  };

  const handleReject = (ret) => rejectReturn(ret.id, ret._uuid);

  return (
    <div>
      <PageTitle title="Returns & Reverse Logistics" sub={`Customer & vendor returns · Approve to restore stock${retOnline?" · 🟢 Live":" · 🟡 Offline"}`} actions={<Btn Icon={Plus} variant="primary" onClick={()=>setAddOpen(true)}>New Return</Btn>}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Total Returns" value={(returns || []).length}                                       sub="all time"       Icon={RotateCcw}    />
        <KPI label="Pending"       value={(returns || []).filter(r=>r.status==="pending").length}       sub="need review"    Icon={Clock}        accent={T.amber} />
        <KPI label="Refund Value"  value={fmtINR((returns || []).reduce((a,r)=>a+r.refund,0))}         sub="total refunds"  Icon={DollarSign}   accent={T.red}   />
        <KPI label="Approved"      value={(returns || []).filter(r=>r.status==="approved").length}      sub="stock restored" Icon={CheckCircle2} accent={T.green} />
      </div>
      <AlertBanner type="info">Approving a return restores stock to inventory. Rejecting keeps stock unchanged.</AlertBanner>

      {addOpen && (
        <div style={{ background:T.amberL, border:`1px solid ${T.amberB}`, borderRadius:6, padding:14, marginBottom:14 }}>
          {err && <AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            <div>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Return Type</div>
              <select value={nr.type} onChange={e=>setNr(p=>({...p,type:e.target.value}))} style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                <option value="customer">Customer Return</option>
                <option value="vendor">Vendor Return</option>
              </select>
            </div>
            {[["Order Ref","order","text"],["Customer / Vendor","party","text"],["Product SKU","code","text"],["Qty","qty","number"],["Refund ₹","refund","number"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nr[k]} onChange={e=>setNr(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:tp==="number"?MONO:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>Reason</div>
              <input value={nr.reason} onChange={e=>setNr(p=>({...p,reason:e.target.value}))} style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={()=>{ setAddOpen(false); setErr(""); }}>Cancel</Btn>
            <Btn variant="primary" Icon={RotateCcw} onClick={handleAdd}>Create Return</Btn>
          </div>
        </div>
      )}

      <SectionCard title="Return Register">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>{["Return ID","Type","Order","Party","Product","SKU","Qty","Reason","Refund","Date","Status",""].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {(returns || []).map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }} onMouseEnter={e=>e.currentTarget.style.background=T.surfAlt} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
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
                  {r.status==="pending"&&(
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={()=>handleApprove(r)} style={{ fontSize:11, padding:"3px 8px", background:T.green, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>Approve</button>
                      <button onClick={()=>handleReject(r)}  style={{ fontSize:11, padding:"3px 8px", background:T.red,   border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>Reject</button>
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
export function ExpiryTracking() {
  const { batches, fefoOnline } = useHighPriority();

  const mappedBatches = (batches || []).map(b => ({
    id: b.id,
    code: b.code,
    name: b.name,
    batch: b.batch,
    qty: b.qty,
    expiry: b.expiry_date ? new Date(b.expiry_date).toISOString().split('T')[0] : "N/A",
    daysLeft: Number(b.days_left || 0),
    location: b.location || "WH/Main",
  }));

  const sorted   = [...mappedBatches].sort((a,b)=>a.daysLeft-b.daysLeft);
  const critical = sorted.filter(i=>i.daysLeft<=90);
  const warning  = sorted.filter(i=>i.daysLeft>90&&i.daysLeft<=180);
  const safe     = sorted.filter(i=>i.daysLeft>180);
  
  const getColor = d=>d<=90?T.red:d<=180?T.amber:T.green;
  const getLabel = d=>d<=90?"Expiring Soon":d<=180?"Watch":"Safe";
  
  return (
    <div>
      <PageTitle title="Expiry Date Tracking (FEFO)" sub={`First-Expired-First-Out · Batch expiry monitoring · Auto pick-order${fefoOnline ? " · 🟢 Live" : " · 🟡 Offline"}`}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Expiring ≤90 days"  value={critical.length} sub="act now"            Icon={AlertTriangle} accent={T.red}   />
        <KPI label="Expiring ≤180 days" value={warning.length}  sub="watch closely"      Icon={Clock}         accent={T.amber} />
        <KPI label="Safe"               value={safe.length}     sub=">6 months left"     Icon={CheckCircle2}  accent={T.green} />
        <KPI label="FEFO Rule"          value="Active"          sub="oldest picked first" Icon={RotateCcw}    />
      </div>
      {critical.length>0&&<AlertBanner type="error">{critical.length} batch(es) expire within 90 days. FEFO rule ensures these are picked first for all outbound orders.</AlertBanner>}
      <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:"11px 14px", marginBottom:16, display:"flex", gap:8, alignItems:"center" }}>
        <RotateCcw size={14} color={T.teal}/>
        <div style={{ fontSize:12, color:T.t2, fontFamily:SANS }}><strong style={{ color:T.teal }}>FEFO Active:</strong> System selects the batch with the earliest expiry date first when picking items for orders.</div>
      </div>
      <SectionCard title="Batch Expiry Register — FEFO pick order">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>{["FEFO #","SKU","Product","Batch","Location","Qty","Expiry Date","Days Left","Status"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {sorted.map((item,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, background:item.daysLeft<=90?"#FCECEA33":"transparent" }}>
                <TD><div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, background:i===0?T.sideNav:T.surfAlt, color:i===0?"#F0EDE8":T.t3, padding:"2px 8px", borderRadius:3, display:"inline-block" }}>#{i+1}{i===0?" ← First":""}</div></TD>
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
            {sorted.length === 0 && (
              <tr><td colSpan={9} style={{ padding:"30px 0", textAlign:"center", color:T.t3, fontFamily:SANS, fontSize:13 }}>No expiry batches found in live database.</td></tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── 8. PRODUCT VARIANTS ──────────────────────────────────────────────────────
export function ProductVariants() {
  const { variantGroups, adjustVariantStock, removeVariant, variantsOnline } = useHighPriority();
  const [expanded, setExpanded] = useState([]);
  const [err,      setErr]      = useState("");

  const toggleExpand = id => setExpanded(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const updateStock = async (varId, delta) => {
    setErr("");
    const result = await adjustVariantStock(varId, delta);
    if (!result.ok) setErr(result.error || "Failed to adjust stock.");
  };

  const varProducts = variantGroups || [];
  return (
    <div>
      <PageTitle title="Product Variants" sub={`Size / colour / spec variants under one parent SKU${variantsOnline?" · 🟢 Live":" · 🟡 Offline"}`} actions={<Btn Icon={Plus} variant="primary">Add Variant Product</Btn>}/>
      {err && <AlertBanner type="error">{err}</AlertBanner>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Variant Products" value={varProducts.length}                                                           sub="parent SKUs"  Icon={Layers}      />
        <KPI label="Total Variants"   value={varProducts.reduce((a,p)=>a+p.variants.length,0)}                             sub="child SKUs"   Icon={PackageOpen} accent={T.blue} />
        <KPI label="Out of Stock"     value={varProducts.reduce((a,p)=>a+p.variants.filter(v=>v.stock===0).length,0)}      sub="variant SKUs" Icon={XCircle}     accent={T.red}  />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {varProducts.map(prod=>(
          <div key={prod.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
            <button onClick={()=>toggleExpand(prod.id)} style={{ width:"100%", padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer", borderBottom:expanded.includes(prod.id)?`1px solid ${T.bdr}`:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:14, fontWeight:700, color:T.t1, fontFamily:SANS }}>{prod.name}</span>
                <span style={{ fontFamily:MONO, fontSize:11.5, color:T.teal, background:T.tealL, padding:"2px 8px", borderRadius:3 }}>{prod.sku}</span>
                <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{prod.variants.length} variants · {prod.variants.reduce((a,v)=>a+v.stock,0)} units</span>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {prod.variants.some(v=>v.status==="critical")&&<span style={{ fontSize:11, color:T.red, fontFamily:SANS }}>⚠ OOS</span>}
                <ChevronRight size={14} color={T.t3} style={{ transform:expanded.includes(prod.id)?"rotate(90deg)":"none", transition:"transform 0.2s" }}/>
              </div>
            </button>
            {expanded.includes(prod.id)&&(
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>{["Variant SKU","Attributes","Price","Stock","Status","Adjust"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                <tbody>
                  {prod.variants.map((v,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, background:v.stock===0?T.redL+"55":"transparent" }}>
                      <TD style={{ fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11.5 }}>{v.id}</TD>
                      <TD style={{ fontWeight:500, color:T.t1 }}>{v.attributes||v.attrs}</TD>
                      <TD style={{ fontFamily:MONO, fontWeight:700 }}>{fmtINR(v.price)}</TD>
                      <TD style={{ fontFamily:MONO, fontWeight:700, color:v.stock===0?T.red:v.stock<=3?T.amber:T.t1 }}>{v.stock}</TD>
                      <TD><Badge status={v.status}/></TD>
                      <TD>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>updateStock(prod.id,v.id,-1)} style={{ width:22, height:22, border:`1px solid ${T.bdr}`, borderRadius:3, background:T.surfBg, cursor:"pointer", fontFamily:MONO, fontSize:14, color:T.red }}>-</button>
                          <button onClick={()=>updateStock(prod.id,v.id,+1)} style={{ width:22, height:22, border:`1px solid ${T.bdr}`, borderRadius:3, background:T.surfBg, cursor:"pointer", fontFamily:MONO, fontSize:14, color:T.green }}>+</button>
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
export function PriceLists({ products = [] }) {
  const { priceLists, createPriceList, updatePriceList, deletePriceList, plOnline } = useHighPriority();
  const [selected, setSelected] = useState(null);
  const [addOpen,  setAddOpen]  = useState(false);
  const [err,      setErr]      = useState("");
  const [saving,   setSaving]   = useState(false);
  const [nl, setNl] = useState({ name:"", type:"discount", discount:5, customers:"All", active:true });

  const lists = priceLists || [];
  const activeSelected = selected || lists[0] || null;

  const addList = async () => {
    setErr("");
    if (!nl.name.trim()) { setErr("List name is required."); return; }
    setSaving(true);
    const result = await createPriceList({
      ...nl,
      customers: nl.customers.split(",").map(s=>s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!result.ok) { setErr(result.error || "Failed to create price list."); return; }
    setAddOpen(false);
    setNl({ name:"", type:"discount", discount:5, customers:"All", active:true });
  };
  return (
    <div>
      <PageTitle title="Price Lists" sub={`Customer-specific pricing · Volume discounts · Seasonal offers${plOnline?" · 🟢 Live":" · 🟡 Offline"}`} actions={<Btn Icon={Plus} variant="primary" onClick={()=>setAddOpen(true)}>New Price List</Btn>}/>
      {err && <AlertBanner type="error">{err}</AlertBanner>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active Lists"  value={lists.filter(l=>l.active).length}                                                                                        sub="in use"           Icon={Tag}  />
        <KPI label="Max Discount"  value={`${Math.max(0, ...lists.map(l=>l.discount))}%`}                                                                             sub="highest tier"     Icon={Star} accent={T.amber} />
        <KPI label="VIP Customers" value={lists.filter(l=>l.discount>=15).reduce((a,l)=>a+l.customers.filter(c=>c!=="All").length,0)}                             sub="on special pricing" Icon={Users} accent={T.teal} />
      </div>
      {addOpen&&(
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
              <select value={nl.type} onChange={e=>setNl(p=>({...p,type:e.target.value}))} style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, color:T.t1 }}>
                <option value="standard">Standard</option><option value="discount">Discount</option><option value="volume">Volume</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={()=>setAddOpen(false)}>Cancel</Btn>
            <Btn variant="primary" Icon={Plus} onClick={addList} disabled={saving}>{saving?"Saving…":"Save"}</Btn>
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"240px 1fr", gap:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {lists.map(l=>(
            <button key={l.id} onClick={()=>setSelected(l)} style={{ padding:"10px 12px", background:selected?.id===l.id?T.tealL:T.surfBg, border:`1px solid ${selected?.id===l.id?T.teal:T.bdr}`, borderRadius:5, cursor:"pointer", textAlign:"left", opacity:l.active?1:0.5 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:3 }}>{l.name}</div>
              <div style={{ display:"flex", gap:6 }}>
                <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, background:l.type==="standard"?T.surfAlt:l.type==="volume"?T.blueL:T.amberL, color:l.type==="standard"?T.t4:l.type==="volume"?T.blue:T.amber, fontFamily:SANS, fontWeight:500 }}>{l.type}</span>
                {l.discount>0&&<span style={{ fontSize:10, color:T.green, fontFamily:MONO, fontWeight:700 }}>-{l.discount}%</span>}
              </div>
            </button>
          ))}
        </div>
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.t1, fontFamily:SANS, marginBottom:4 }}>{activeSelected?.name||"Select a list"}</div>
          <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, marginBottom:14 }}>Applies to: {(activeSelected?.customers||[]).join(", ")}</div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>{["Product","Base Price","Discount","Final Price","Saving"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {products.map((p,i)=>{
                const disc=activeSelected?.discount||0; 
                const basePrice=p.price||0; 
                const final=Math.round(basePrice*(1-disc/100)); 
                const saving=basePrice-final;
                return(
                  <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}>
                    <TD style={{ fontWeight:600, color:T.t1 }}>{p.name}</TD>
                    <TD style={{ fontFamily:MONO }}>{fmtINR(basePrice)}</TD>
                    <TD style={{ fontFamily:MONO, color:disc>0?T.red:T.t3 }}>{disc>0?`-${disc}%`:"—"}</TD>
                    <TD style={{ fontFamily:MONO, fontWeight:700 }}>{fmtINR(final)}</TD>
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

// ─── 10. DROPSHIPPING ─────────────────────────────────────────────────────────
const DS_STAGES = [
  { key:"sent_to_vendor",      label:"PO Sent"        },
  { key:"vendor_confirmed",    label:"Vendor OK"      },
  { key:"shipped_to_customer", label:"Shipped Direct" },
  { key:"delivered",           label:"Delivered"      },
];

export function Dropshipping() {
  const { dropships, createDropship, advanceDropship, cancelDropship, dsOnline } = useHighPriority();
  const [addOpen, setAddOpen] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [nd, setNd] = useState({ salesOrder:"", customer:"", product:"", qty:1, vendor:"", customerAddr:"" });
  const [err, setErr] = useState("");

  const addDropship = async () => {
    if (!nd.customer||!nd.product||!nd.vendor) { setErr("Customer, product, and vendor are required."); return; }
    setErr(""); setSaving(true);
    const result = await createDropship({
      sales_order:   nd.salesOrder,
      customer:      nd.customer,
      product_name:  nd.product,
      quantity:      nd.qty,
      vendor_name:   nd.vendor,
      customer_addr: nd.customerAddr,
    });
    setSaving(false);
    if (!result.ok) { setErr(result.error || "Failed to create dropship."); return; }
    setAddOpen(false);
    setNd({ salesOrder:"", customer:"", product:"", qty:1, vendor:"", customerAddr:"" });
  };

  const advanceStatus = async (id) => {
    setErr("");
    const result = await advanceDropship(id);
    if (!result.ok) setErr(result.error || "Failed to advance status.");
  };
  return (
    <div>
      <PageTitle title="Dropshipping" sub={`Vendor ships directly to customer · No warehouse handling${dsOnline?" · 🟢 Live":" · 🟡 Offline"}`} actions={<Btn Icon={Plus} variant="primary" onClick={()=>setAddOpen(true)}>New Dropship</Btn>}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Active"      value={(dropships || []).filter(d=>d.status!=="delivered").length}                                         sub="in progress"       Icon={Send}         />
        <KPI label="With Vendor" value={(dropships || []).filter(d=>["sent_to_vendor","vendor_confirmed"].includes(d.status)).length}       sub="awaiting dispatch" Icon={Clock}        accent={T.amber} />
        <KPI label="En Route"    value={(dropships || []).filter(d=>d.status==="shipped_to_customer").length}                               sub="to customer"       Icon={Truck}        accent={T.blue}  />
        <KPI label="Delivered"   value={(dropships || []).filter(d=>d.status==="delivered").length}                                         sub="completed"         Icon={CheckCircle2} accent={T.green} />
      </div>
      <AlertBanner type="info">In dropshipping, stock never enters your warehouse. The vendor ships directly to the customer. No inventory impact — only tracking.</AlertBanner>
      {addOpen&&(
        <div style={{ background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:6, padding:14, marginBottom:14 }}>
          {err&&<AlertBanner type="error">{err}</AlertBanner>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
            {[["Sales Order Ref","salesOrder","text"],["Customer Name","customer","text"],["Product","product","text"],["Qty","qty","number"],["Vendor","vendor","text"],["Customer Address","customerAddr","text"]].map(([lbl,k,tp])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{lbl}</div>
                <input type={tp} value={nd[k]} onChange={e=>setNd(p=>({...p,[k]:tp==="number"?Number(e.target.value):e.target.value}))}
                  style={{ width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12, fontFamily:SANS, outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:7, marginTop:12, justifyContent:"flex-end" }}>
            <Btn onClick={()=>{setAddOpen(false);setErr("");}}>Cancel</Btn>
            <Btn variant="primary" Icon={Truck} onClick={addDropship} disabled={saving}>{saving?"Saving…":"Create Dropship"}</Btn>
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {(dropships || []).map(d=>{
          const stageIdx=DS_STAGES.findIndex(s=>s.key===d.status);
          return (
            <div key={d.id} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontFamily:MONO, fontWeight:700, color:T.teal }}>{d.dsNo||d.id}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>{d.customer}</span>
                  <span style={{ fontSize:12, color:T.t3, fontFamily:SANS }}>{d.product} × {d.qty}</span>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>via <strong>{d.vendor||d.vendor_name}</strong> · <span style={{ fontFamily:MONO }}>{d.vendorPO||d.vendor_po}</span></span>
                  {d.status!=="delivered"&&d.status!=="cancelled"&&<button onClick={()=>advanceStatus(d.id)} style={{ fontSize:11, padding:"4px 12px", background:T.teal, border:"none", borderRadius:4, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:600 }}>Advance →</button>}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                {DS_STAGES.map((stage,idx)=>(
                  <div key={stage.key} style={{ display:"flex", alignItems:"center", flex:1 }}>
                    <div style={{ flex:1, padding:"8px 10px", borderRadius:4, textAlign:"center", background:idx<=stageIdx?T.tealL:T.surfAlt, border:`1px solid ${idx<=stageIdx?T.tealM:T.bdr}` }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                        {idx<stageIdx?<CheckCircle2 size={11} color={T.green}/>:idx===stageIdx?<Activity size={11} color={T.teal}/>:<Clock size={11} color={T.t3}/>}
                        <span style={{ fontSize:10.5, fontWeight:idx<=stageIdx?700:400, color:idx<=stageIdx?T.teal:T.t3, fontFamily:SANS }}>{stage.label}</span>
                      </div>
                    </div>
                    {idx<DS_STAGES.length-1&&<ArrowRight size={11} color={idx<stageIdx?T.teal:T.bdr} style={{ flexShrink:0 }}/>}
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
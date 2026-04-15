import { useState, useRef } from "react";
import {
  Bot, ArrowRight, Activity, AlertTriangle, TrendingUp,
  Target, DollarSign, RotateCcw, Download, FileText,
  Camera, CheckCircle2, Package, Search,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { T, MONO, SANS, fmtINR, fmtK, revData, weatherData } from "./data.js";
import { KPI, PageTitle, Btn, SectionCard, ProgressBar } from "./ui.jsx";

const catData = [
  { name:"Furniture",   value:24, color:T.teal  },
  { name:"Electronics", value:35, color:T.amber },
  { name:"Stationery",  value:87, color:T.green },
];

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export function Analytics({ products, orders }) {
  const top5 = [...products].sort((a,b) => (b.onHand*b.price) - (a.onHand*a.price)).slice(0,5);
  const totalRev  = revData.reduce((a,d) => a + d.revenue, 0);
  const totalProf = revData.reduce((a,d) => a + d.profit,  0);
  const healthScore = Math.round(
    (products.filter(p => p.status==="ok").length / products.length) * 60 +
    (orders.filter(o => o.status==="done").length / Math.max(orders.length,1)) * 40
  );
  const scoreColor = healthScore >= 75 ? T.green : healthScore >= 50 ? T.amber : T.red;

  return (
    <div>
      <PageTitle title="Analytics & Reports" sub="P&L · Inventory health · Forecasts · Business intelligence"
        actions={<>
          <Btn Icon={Download}>Export PDF</Btn>
          <Btn Icon={FileText} variant="primary">Generate Report</Btn>
        </>}
      />

      {/* Health score */}
      <div style={{ background:T.sideNav, borderRadius:6, padding:"18px 24px", marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between", border:`1px solid ${T.sideNavB}` }}>
        <div>
          <div style={{ fontSize:11, color:"#78716c", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:SANS, marginBottom:8 }}>Business Health Score</div>
          <div style={{ fontSize:44, fontWeight:800, color:"#FAFAF8", fontFamily:MONO, letterSpacing:"-2px", lineHeight:1 }}>
            {healthScore}<span style={{ fontSize:18, fontWeight:400, color:"#57534e" }}>/100</span>
          </div>
          <div style={{ fontSize:13, color:"#9A9490", fontFamily:SANS, marginTop:6 }}>
            {healthScore>=75?"Excellent — operations running smoothly":healthScore>=50?"Good — a few areas need attention":"Action needed — check stock alerts"}
          </div>
        </div>
        <div style={{ position:"relative", width:110, height:110 }}>
          <svg viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="#292524" strokeWidth="9"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke={scoreColor} strokeWidth="9"
              strokeDasharray={`${2*Math.PI*46*healthScore/100} ${2*Math.PI*46}`}
              strokeLinecap="round" transform="rotate(-90 55 55)"/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"#FAFAF8", fontFamily:MONO }}>{healthScore}%</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Gross Revenue"  value={fmtK(totalRev*1000)}  sub="Jan–Jun 2026"  delta="+18%" up Icon={TrendingUp}  />
        <KPI label="Total Profit"   value={fmtK(totalProf*1000)} sub="after COGS"    delta="+22%" up Icon={DollarSign}  accent={T.green} />
        <KPI label="Profit Margin"  value="33.4%"                sub="avg this year" delta="+2.1%" up Icon={Target}     accent={T.blue}  />
        <KPI label="Inventory Turn" value="4.2×"                 sub="per year"      delta="+0.4×" up Icon={RotateCcw}  accent={T.amber} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14, marginBottom:14 }}>
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:2 }}>Monthly P&L</div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginBottom:14 }}>Revenue · Cost · Profit — Jan to Jun</div>
          <div style={{ display:"flex", gap:14, marginBottom:10 }}>
            {[[T.teal,"Revenue"],[T.bdr,"Cost"],[T.green,"Profit"]].map(([c,l])=>(
              <span key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.t4, fontFamily:SANS }}>
                <span style={{ width:10, height:3, background:c, display:"inline-block", borderRadius:2 }}/>{l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={revData} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="4 4" stroke={T.bdr2} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:T.t3, fontFamily:SANS }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>"₹"+v+"k"} tick={{ fontSize:10, fill:T.t3, fontFamily:MONO }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v,n)=>["₹"+v+"k",n]} contentStyle={{ fontSize:12, border:`1px solid ${T.bdr}`, borderRadius:5, boxShadow:"none", fontFamily:SANS }}/>
              <Bar dataKey="revenue" fill={T.teal}  radius={[3,3,0,0]}/>
              <Bar dataKey="cost"    fill={T.bdr}   radius={[3,3,0,0]}/>
              <Bar dataKey="profit"  fill={T.green} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:2 }}>Top Products by Value</div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginBottom:16 }}>Retail stock on hand</div>
          {top5.map((p,i) => {
            const val = p.onHand * p.price;
            const max = top5[0].onHand * top5[0].price || 1;
            const pct = Math.round((val/max)*100);
            const bars = [T.teal,T.amber,T.green,T.blue,T.t3];
            return (
              <div key={p.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12, fontFamily:SANS }}>
                  <span style={{ color:T.t1, fontWeight:500 }}>{p.name}</span>
                  <span style={{ fontFamily:MONO, fontWeight:700, color:T.t1 }}>{fmtINR(val)}</span>
                </div>
                <ProgressBar pct={pct} color={bars[i]}/>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>AI Sales Forecast</div>
          <span style={{ fontSize:9, padding:"1px 6px", borderRadius:3, background:T.tealL, color:T.teal, fontWeight:700, letterSpacing:"0.06em", fontFamily:SANS }}>AI PREDICTED</span>
        </div>
        <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginBottom:14 }}>Jul–Sep 2026 predicted from historical trend · * = forecast</div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={[...revData,
            {month:"Jul*",revenue:1420,profit:500},{month:"Aug*",revenue:1380,profit:490},{month:"Sep*",revenue:1510,profit:540},
          ]}>
            <CartesianGrid strokeDasharray="4 4" stroke={T.bdr2} vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize:11, fill:T.t3, fontFamily:SANS }} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>"₹"+v+"k"} tick={{ fontSize:10, fill:T.t3, fontFamily:MONO }} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v,n)=>["₹"+v+"k",n]} contentStyle={{ fontSize:12, border:`1px solid ${T.bdr}`, borderRadius:5, boxShadow:"none", fontFamily:SANS }}/>
            <Line type="monotone" dataKey="revenue" stroke={T.teal}  strokeWidth={2} dot={{ r:3, fill:T.teal }}/>
            <Line type="monotone" dataKey="profit"  stroke={T.green} strokeWidth={2} dot={{ r:3, fill:T.green }} strokeDasharray="5 3"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── NLP COMMAND ──────────────────────────────────────────────────────────────
export function NLPCommand({ products, orders }) {
  const [query, setQuery]   = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const suggestions = [
    "What's my most profitable item that's running low?",
    "Show me all critical stock items",
    "Which high-priority orders are pending?",
    "What's the total value of Electronics inventory?",
    "Which products should I reorder this week?",
    "Show me dead stock",
    "What's my best performing category?",
  ];

  const processQuery = (q) => {
    const ql = q.toLowerCase();
    setLoading(true);
    setTimeout(() => {
      let res = null;
      if (ql.includes("profitable") && (ql.includes("low")||ql.includes("running"))) {
        const items = products.filter(p=>p.status!=="ok").map(p=>({...p,margin:((p.price-p.cost)/p.price*100).toFixed(1),profitPerUnit:p.price-p.cost})).sort((a,b)=>b.profitPerUnit-a.profitPerUnit);
        const best = items[0];
        res = { type:"product_insight", headline:`${best?.name} — highest-margin low-stock item`, summary:`Margin: ${best?.margin}% · ₹${best?.profitPerUnit?.toLocaleString()} profit/unit · Only ${best?.onHand} units left`, data:items.slice(0,5), action:{ label:"Create Reorder PO", sku:best?.code } };
      } else if (ql.includes("critical")) {
        const items = products.filter(p=>p.status==="critical").map(p=>({...p,margin:((p.price-p.cost)/p.price*100).toFixed(1)}));
        res = { type:"list", headline:`${items.length} critical stock items`, summary:"These products have zero or near-zero available stock", data:items };
      } else if (ql.includes("pending") || (ql.includes("high") && ql.includes("order"))) {
        const items = orders.filter(o=>o.status==="pending"&&(o.priority==="high"||o.priority==="urgent"));
        res = { type:"orders", headline:`${items.length} high-priority pending orders`, summary:"These require immediate action", data:items };
      } else if (ql.includes("electronic")) {
        const items = products.filter(p=>p.category==="Electronics");
        const val = items.reduce((a,p)=>a+p.onHand*p.cost,0);
        res = { type:"summary", headline:`Electronics inventory: ${fmtINR(val)}`, summary:`${items.length} SKUs tracked`, data:items };
      } else if (ql.includes("reorder")) {
        const items = products.filter(p=>p.status!=="ok");
        res = { type:"reorder", headline:`${items.length} products need reordering`, summary:`Estimated cost: ${fmtINR(items.reduce((a,p)=>a+(p.max-p.onHand)*p.cost,0))}`, data:items };
      } else if (ql.includes("dead")) {
        const items = products.filter(p=>p.onHand>=p.reorder*2&&p.status==="ok");
        res = { type:"list", headline:`${items.length} potential dead stock items`, summary:"High stock relative to reorder point — low velocity", data:items };
      } else if (ql.includes("category")) {
        const cats = [...new Set(products.map(p=>p.category))].map(cat=>{
          const its=products.filter(p=>p.category===cat);
          return { name:cat, value:its.reduce((a,p)=>a+p.onHand*p.price,0), count:its.length };
        }).sort((a,b)=>b.value-a.value);
        res = { type:"categories", headline:`${cats[0]?.name} is your top category`, summary:`Retail value: ${fmtINR(cats[0]?.value)} across ${cats[0]?.count} SKUs`, data:cats };
      } else {
        res = { type:"help", headline:"Try one of the suggested queries below", summary:"I can query your live inventory and order data", data:[] };
      }
      setResult(res);
      setHistory(h => [{ q, res }, ...h.slice(0,4)]);
      setLoading(false);
    }, 500);
  };

  const run = () => { if (query.trim()) processQuery(query); };

  return (
    <div>
      <PageTitle title="Natural Language Command" sub="Ask questions in plain English — answers from your live data"/>

      <div style={{ background:T.surfBg, border:`2px solid ${T.teal}`, borderRadius:8, padding:"14px 18px", marginBottom:18 }}>
        <div style={{ fontSize:11, color:T.teal, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:SANS, marginBottom:10 }}>⚡ Ask anything about your inventory</div>
        <div style={{ display:"flex", gap:10 }}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()}
            placeholder="Search: most profitable item running low, critical stock, pending orders"
            style={{ flex:1, padding:"10px 14px", border:`1px solid ${T.bdr}`, borderRadius:5, fontSize:14, fontFamily:SANS, outline:"none", color:T.t1, background:T.pageBg }}/>
          <button onClick={run} style={{ padding:"10px 20px", background:T.teal, border:"none", borderRadius:5, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, display:"flex", alignItems:"center", gap:6 }}>
            <Search size={14}/> Search
          </button>
        </div>
        <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
          {suggestions.slice(0,4).map(s=>(
            <button key={s} onClick={()=>{ setQuery(s); processQuery(s); }}
              style={{ fontSize:11, padding:"4px 10px", borderRadius:99, border:`1px solid ${T.bdr}`, background:T.surfBg, color:T.t4, cursor:"pointer", fontFamily:SANS }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign:"center", padding:"30px 0", color:T.t3, fontFamily:SANS, fontSize:13 }}>Analyzing your data…</div>}

      {result && !loading && (
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px", marginBottom:18 }}>
          <div style={{ fontSize:16, fontWeight:700, color:T.t1, fontFamily:SANS, marginBottom:4 }}>{result.headline}</div>
          <div style={{ fontSize:12, color:T.t3, fontFamily:SANS, marginBottom:14 }}>{result.summary}</div>

          {(result.type==="list"||result.type==="reorder"||result.type==="summary"||result.type==="product_insight") && result.data.length > 0 && (
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12 }}>
              <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
                {["SKU","Product","Category","On Hand","Margin %","Profit/Unit","Status"].map(h=>(
                  <th key={h} style={{ padding:"8px 13px", textAlign:"left", fontWeight:600, color:T.t4, fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.06em", background:"#F2EFE9", fontFamily:SANS }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {result.data.map((p,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11.5 }}>{p.code}</td>
                    <td style={{ padding:"9px 13px", fontWeight:600, color:T.t1, fontFamily:SANS }}>{p.name}</td>
                    <td style={{ padding:"9px 13px", color:T.t2, fontFamily:SANS }}>{p.category}</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:700, color:p.onHand<=p.reorder?T.red:T.t1 }}>{p.onHand}</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, color:T.green, fontWeight:600 }}>{p.margin||((p.price-p.cost)/p.price*100).toFixed(1)}%</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:600 }}>{fmtINR(p.price-p.cost)}</td>
                    <td style={{ padding:"9px 13px" }}>
                      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:3, fontWeight:500, background:p.status==="ok"?T.greenL:p.status==="low"?T.amberL:T.redL, color:p.status==="ok"?T.green:p.status==="low"?T.amber:T.red, fontFamily:SANS }}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {result.type==="orders" && result.data.length > 0 && (
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12 }}>
              <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
                {["Order","Customer","Product","Total","Priority"].map(h=>(
                  <th key={h} style={{ padding:"8px 13px", textAlign:"left", fontWeight:600, color:T.t4, fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.06em", background:"#F2EFE9", fontFamily:SANS }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {result.data.map((o,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, color:T.teal, fontWeight:700 }}>{o.id}</td>
                    <td style={{ padding:"9px 13px", fontWeight:600, color:T.t1, fontFamily:SANS }}>{o.customer}</td>
                    <td style={{ padding:"9px 13px", color:T.t2, fontFamily:SANS }}>{o.product}</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:700 }}>{fmtINR(o.total)}</td>
                    <td style={{ padding:"9px 13px" }}><span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:o.priority==="urgent"?T.redL:T.amberL, color:o.priority==="urgent"?T.red:T.amber, fontFamily:SANS }}>{o.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {result.type==="categories" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {result.data.map((c,i)=>(
                <div key={c.name} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:100, fontSize:12, fontFamily:SANS, color:T.t1, fontWeight:500 }}>{c.name}</div>
                  <div style={{ flex:1, height:6, background:T.surfAlt, borderRadius:99 }}>
                    <div style={{ width:`${(c.value/(result.data[0].value||1))*100}%`, height:"100%", background:[T.teal,T.amber,T.green][i]||T.t3, borderRadius:99 }}/>
                  </div>
                  <div style={{ fontFamily:MONO, fontWeight:700, color:T.t1, fontSize:12, width:100, textAlign:"right" }}>{fmtINR(c.value)}</div>
                </div>
              ))}
            </div>
          )}

          {result.action && (
            <button style={{ marginTop:12, padding:"8px 16px", background:T.teal, border:"none", borderRadius:5, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, display:"inline-flex", alignItems:"center", gap:6 }}>
              <ArrowRight size={13}/>{result.action.label}
            </button>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:10 }}>Recent Queries</div>
          {history.map((h,i) => (
            <button key={i} onClick={() => { setQuery(h.q); setResult(h.res); }}
              style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", marginBottom:6, background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:5, fontSize:12, color:T.t2, cursor:"pointer", fontFamily:SANS }}>
              "{h.q}"
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WEATHER CONTEXT ENGINE ───────────────────────────────────────────────────
export function WeatherEngine({ products }) {
  const [dismissed, setDismissed] = useState([]);
  const urgencyColor = { high:T.red, medium:T.amber, low:T.blue };

  return (
    <div>
      <PageTitle title="External Context Engine" sub="Weather API signals → automated inventory recommendations"/>

      <div style={{ background:T.sideNav, borderRadius:6, padding:"18px 22px", marginBottom:18, border:`1px solid ${T.sideNavB}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, color:"#78716c", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:SANS, marginBottom:6 }}>Live Weather — {weatherData.city}</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:14 }}>
              <div style={{ fontSize:48, lineHeight:1 }}>🌧</div>
              <div>
                <div style={{ fontSize:36, fontWeight:800, color:"#FAFAF8", fontFamily:MONO, letterSpacing:"-1px" }}>{weatherData.temp}°C</div>
                <div style={{ fontSize:14, color:"#9A9490", fontFamily:SANS }}>{weatherData.condition}</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {weatherData.forecast.map((f,i) => (
              <div key={i} style={{ background:"#1E2D3D", borderRadius:6, padding:"10px 12px", textAlign:"center", border:"1px solid #2A3D52", minWidth:68 }}>
                <div style={{ fontSize:11, color:"#78716c", fontFamily:SANS, marginBottom:4 }}>{f.day}</div>
                <div style={{ fontSize:20, marginBottom:4 }}>{f.icon}</div>
                <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:f.rain>80?T.red:f.rain>50?T.amber:"#9A9490" }}>{f.rain}%</div>
                <div style={{ fontSize:10, color:"#57534e", fontFamily:SANS, marginTop:2 }}>{f.condition}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
        <Bot size={14} color={T.teal}/> AI-Generated Stock Recommendations
        <span style={{ fontSize:9, padding:"1px 6px", borderRadius:3, background:T.tealL, color:T.teal, fontWeight:700, letterSpacing:"0.06em", fontFamily:SANS }}>AUTO-GENERATED</span>
      </div>

      {weatherData.alerts.filter((_,i) => !dismissed.includes(i)).map((a,i) => (
        <div key={i} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px", marginBottom:10, borderLeft:`4px solid ${urgencyColor[a.urgency]||T.teal}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:T.teal }}>{a.sku}</span>
                <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>{a.name}</span>
                <span style={{ fontSize:10, padding:"1px 7px", borderRadius:3, fontWeight:600, background:urgencyColor[a.urgency]+"22", color:urgencyColor[a.urgency], fontFamily:SANS, textTransform:"uppercase", letterSpacing:"0.05em" }}>{a.urgency}</span>
              </div>
              <div style={{ fontSize:12, color:T.t2, fontFamily:SANS, marginBottom:6 }}>🌧 {a.reason}</div>
              <div style={{ fontSize:12, fontWeight:600, color:T.teal, fontFamily:SANS }}>→ {a.action}</div>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0, marginLeft:12 }}>
              <button style={{ padding:"5px 12px", background:T.teal, border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer", fontFamily:SANS, fontWeight:600 }}>Apply</button>
              <button onClick={() => setDismissed(d=>[...d,i])}
                style={{ padding:"5px 10px", background:T.surfAlt, border:`1px solid ${T.bdr}`, borderRadius:4, color:T.t3, fontSize:11, cursor:"pointer", fontFamily:SANS }}>Dismiss</button>
            </div>
          </div>
        </div>
      ))}

      <SectionCard title="Weather-Adjusted Demand Forecast per SKU">
        <div style={{ padding:14 }}>
          {products.slice(0,6).map((p,i) => {
            const boost      = weatherData.forecast[0].rain > 70 && p.category==="Electronics" ? 1.25 : 1.0;
            const baseline   = Math.max(1, Math.round(p.onHand * 0.4));
            const adjusted   = Math.round(baseline * boost);
            const daysLeft   = Math.round(p.onHand / adjusted);
            return (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"9px 0", borderBottom:i<5?`1px solid ${T.bdr2}`:"none" }}>
                <div style={{ width:90, fontFamily:MONO, fontSize:11, color:T.teal, fontWeight:600 }}>{p.code}</div>
                <div style={{ width:150, fontSize:12, color:T.t1, fontFamily:SANS, fontWeight:500 }}>{p.name}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:11, color:T.t3, fontFamily:SANS }}>
                    <span>Demand/week</span>
                    <span style={{ fontFamily:MONO, color:boost>1?T.amber:T.t2, fontWeight:600 }}>{adjusted} units{boost>1?" (+weather)":""}</span>
                  </div>
                  <ProgressBar pct={Math.min(100,(p.onHand/Math.max(p.max,1))*100)} color={daysLeft<7?T.red:daysLeft<14?T.amber:T.green}/>
                </div>
                <div style={{ width:70, textAlign:"right" }}>
                  <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:daysLeft<7?T.red:daysLeft<14?T.amber:T.green }}>{daysLeft}d</div>
                  <div style={{ fontSize:10, color:T.t3, fontFamily:SANS }}>until empty</div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── CV AUDIT ─────────────────────────────────────────────────────────────────
export function CVAudit({ products }) {
  const [scanning,  setScanning]  = useState(false);
  const [scanned,   setScanned]   = useState(false);
  const [results,   setResults]   = useState([]);
  const [progress,  setProgress]  = useState(0);

  const startScan = () => {
    setScanning(true); setScanned(false); setProgress(0); setResults([]);
    let p = 0;
    const interval = setInterval(() => {
      p += 7;
      setProgress(Math.min(p,100));
      if (p >= 100) {
        clearInterval(interval);
        const detected = products.slice(0,6).map(prod => ({
          ...prod,
          detected: Math.max(0, prod.onHand + Math.floor(Math.random()*5) - 2),
          confidence: (88 + Math.random()*10).toFixed(1),
        }));
        setResults(detected);
        setScanning(false); setScanned(true);
      }
    }, 120);
  };

  const discrepancies = results.filter(r => r.detected !== r.onHand);

  return (
    <div>
      <PageTitle title="Computer Vision Audit" sub="AI shelf scanning · YOLOv8 detection · Instant stock verification"/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <div style={{ background:T.sideNav, borderRadius:8, padding:20, border:`1px solid ${T.sideNavB}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:280 }}>
          {!scanning && !scanned && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
              <div style={{ fontSize:14, fontWeight:600, color:"#F0EDE8", fontFamily:SANS, marginBottom:6 }}>Shelf Camera Ready</div>
              <div style={{ fontSize:12, color:"#78716c", fontFamily:SANS, marginBottom:20 }}>Point camera at shelf · AI counts items automatically</div>
              <button onClick={startScan} style={{ padding:"10px 24px", background:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, display:"flex", alignItems:"center", gap:8, margin:"0 auto" }}>
                <Camera size={16}/> Start AI Scan
              </button>
            </div>
          )}
          {scanning && (
            <div style={{ textAlign:"center", width:"100%" }}>
              <div style={{ position:"relative", width:240, height:180, margin:"0 auto 16px", background:"#1E2D3D", borderRadius:6, overflow:"hidden", border:`2px solid ${T.teal}` }}>
                <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(13,115,119,0.08) 30px,rgba(13,115,119,0.08) 31px)" }}/>
                <div style={{ position:"absolute", left:0, right:0, height:2, background:T.teal, opacity:0.8, top:`${progress}%`, transition:"top 0.12s" }}/>
                {progress > 30 && <div style={{ position:"absolute", left:20, top:20, width:60, height:80, border:"2px solid #22C55E", borderRadius:3 }}><div style={{ position:"absolute", top:-18, left:0, fontSize:9, background:"#22C55E", color:"#fff", padding:"1px 4px", borderRadius:2, fontFamily:MONO }}>DESK 97%</div></div>}
                {progress > 55 && <div style={{ position:"absolute", left:100, top:40, width:50, height:60, border:"2px solid #22C55E", borderRadius:3 }}><div style={{ position:"absolute", top:-18, left:0, fontSize:9, background:"#22C55E", color:"#fff", padding:"1px 4px", borderRadius:2, fontFamily:MONO }}>CHAIR 93%</div></div>}
                {progress > 75 && <div style={{ position:"absolute", left:165, top:30, width:55, height:70, border:"2px solid #F59E0B", borderRadius:3 }}><div style={{ position:"absolute", top:-18, left:0, fontSize:9, background:"#F59E0B", color:"#fff", padding:"1px 4px", borderRadius:2, fontFamily:MONO }}>HUB 89%</div></div>}
                <div style={{ position:"absolute", bottom:8, left:8, fontSize:9, color:T.teal, fontFamily:MONO }}>YOLOv8 · LIVE</div>
              </div>
              <div style={{ fontSize:13, color:"#9A9490", fontFamily:SANS, marginBottom:10 }}>Detecting objects… {progress}%</div>
              <ProgressBar pct={progress} color={T.teal}/>
            </div>
          )}
          {scanned && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
              <div style={{ fontSize:14, fontWeight:600, color:"#F0EDE8", fontFamily:SANS, marginBottom:4 }}>Scan Complete</div>
              <div style={{ fontSize:12, color:"#78716c", fontFamily:SANS, marginBottom:16 }}>{results.length} products · {discrepancies.length} discrepancies</div>
              <button onClick={startScan} style={{ padding:"7px 16px", background:"transparent", border:`1px solid ${T.teal}`, borderRadius:5, color:T.teal, fontSize:12, cursor:"pointer", fontFamily:SANS }}>Scan Again</button>
            </div>
          )}
        </div>

        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:8, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:14 }}>How it works</div>
          {[["1","Point camera at shelf","Any standard webcam or mobile device"],["2","YOLOv8 detects items","Pre-trained model identifies and counts each product"],["3","Compare with ERP","Detected counts vs system records — instant audit"],["4","Review discrepancies","Flag mismatches, update stock with one click"]].map(([n,title,desc])=>(
            <div key={n} style={{ display:"flex", gap:12, marginBottom:14 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.teal, flexShrink:0, fontFamily:MONO }}>{n}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS }}>{title}</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginTop:2 }}>{desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:8, padding:10, background:T.tealL, borderRadius:5, border:`1px solid ${T.tealM}`, fontSize:11, color:T.teal, fontFamily:SANS }}>
            💡 No barcode scanning needed — AI counts from visual appearance alone
          </div>
        </div>
      </div>

      {scanned && results.length > 0 && (
        <SectionCard title={`Audit Results — ${discrepancies.length} discrepancies found`}
          action={<span style={{ fontSize:11, fontWeight:600, color:discrepancies.length>0?T.red:T.green, fontFamily:SANS }}>{discrepancies.length>0?"⚠ Review required":"✓ All counts match"}</span>}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
              {["SKU","Product","System Count","CV Detected","Confidence","Variance","Action"].map(h=><th key={h} style={{ padding:"8px 13px", textAlign:"left", fontWeight:600, color:T.t4, fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.06em", background:"#F2EFE9", fontFamily:SANS }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {results.map((r,i) => {
                const diff = r.detected - r.onHand;
                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, background:diff!==0?T.redL+"66":"transparent" }}>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11.5 }}>{r.code}</td>
                    <td style={{ padding:"9px 13px", fontWeight:600, color:T.t1, fontFamily:SANS }}>{r.name}</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:700 }}>{r.onHand}</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:700, color:diff!==0?T.red:T.green }}>{r.detected}</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, color:T.t3 }}>{r.confidence}%</td>
                    <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:800, color:diff>0?T.green:diff<0?T.red:T.t3 }}>{diff===0?"—":diff>0?"+"+diff:diff}</td>
                    <td style={{ padding:"9px 13px" }}>
                      {diff!==0 ? (
                        <button style={{ fontSize:11, padding:"3px 9px", background:T.teal, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>Update Stock</button>
                      ) : <span style={{ fontSize:11, color:T.green, fontFamily:SANS }}>✓ OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
export function AIAssistant({ products, orders }) {
  const [msgs, setMsgs]     = useState([{ role:"ai", text:"Hello! I'm your InvenPro AI. Ask me about stock levels, reorder needs, sales performance, or anything about your business." }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);

  const lowStock   = products.filter(p => p.status !== "ok");
  const totalVal   = products.reduce((a,p) => a + p.onHand * p.cost, 0);
  const pendOrders = orders.filter(o => o.status === "pending");

  const respond = (q) => {
    const ql = q.toLowerCase();
    if (ql.includes("restock")||ql.includes("reorder"))
      return `Based on current stock, here's what needs restocking:\n\n${lowStock.map(p=>`• ${p.name} (${p.code})\n  On hand: ${p.onHand} ${p.unit} | Reorder pt: ${p.reorder}\n  → Order ${p.max-p.onHand} units · Cost: ${fmtINR((p.max-p.onHand)*p.cost)}`).join("\n\n")}\n\nTotal reorder cost: ${fmtINR(lowStock.reduce((a,p)=>a+(p.max-p.onHand)*p.cost,0))}`;
    if (ql.includes("stock")||ql.includes("inventory"))
      return `Inventory snapshot:\n\n• Total SKUs: ${products.length}\n• Value at cost: ${fmtINR(totalVal)}\n• Low stock: ${lowStock.filter(p=>p.status==="low").length} items\n• Critical: ${products.filter(p=>p.status==="critical").length} items\n\nMost urgent: ${lowStock[0]?.name || "None"} — only ${lowStock[0]?.onHand || 0} units left.`;
    if (ql.includes("sale")||ql.includes("order"))
      return `Sales summary:\n\n• Total orders: ${orders.length}\n• Pending: ${pendOrders.length}\n• Completed: ${orders.filter(o=>o.status==="done").length}\n• Cancelled: ${orders.filter(o=>o.status==="cancel").length}\n• Revenue: ${fmtINR(orders.filter(o=>o.type==="sale").reduce((a,o)=>a+o.total,0))}`;
    if (ql.includes("profit")||ql.includes("margin"))
      return "Profit analysis:\n\n• Gross margin: ~33.4% (up 2.1% from last quarter)\n• Best margin category: Electronics\n• Lowest margin: Stationery\n\n→ Recommendation: Increase Electronics stock — highest ROI per unit invested.";
    if (ql.includes("health")||ql.includes("business"))
      return `Business health:\n\n✅ ${products.filter(p=>p.status==="ok").length}/${products.length} products at healthy stock levels\n⚠️ ${pendOrders.length} orders pending action\n✅ Revenue growing +18% year-on-year\n\n→ Priority action: Restock ${lowStock.length} low/critical items immediately.`;
    return `I can help you with:\n\n• "Which products need restocking?"\n• "Show me inventory summary"\n• "How are sales doing?"\n• "Business health check"\n• "Profit margin analysis"\n\nType any of these to get a real-time answer from your live data.`;
  };

  const send = () => {
    if (!input.trim()) return;
    setMsgs(p => [...p, { role:"user", text:input }]);
    const q = input; setInput(""); setLoading(true);
    setTimeout(() => { setMsgs(p => [...p, { role:"ai", text:respond(q) }]); setLoading(false); }, 700);
  };

  const chips = ["Which products need restocking?","Inventory summary","How are sales doing?","Business health check"];
  const aiTips = [
    { color:T.red,   title:"Stock-out Risk",       body:"Wireless Mouse (ELC-002) will deplete in ~3 days. Reorder 30 units." },
    { color:T.green, title:"Demand Spike",          body:"USB-C Hub demand up 42% this week — consider restocking." },
    { color:T.teal,  title:"Reorder Window",        body:"Office Chair (FCH-004) should be reordered within 7 days." },
  ];

  return (
    <div>
      <PageTitle title="AI Assistant" sub="Powered by your live data · Ask anything"/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:14 }}>
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, display:"flex", flexDirection:"column", height:580 }}>
          <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center" }}><Bot size={14} color={T.teal}/></div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>InvenPro AI</div>
              <div style={{ fontSize:11, color:T.green, fontFamily:SANS }}>● Online · Reading live data</div>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:10 }}>
            {msgs.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                {m.role==="ai" && <div style={{ width:22, height:22, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", marginRight:7, flexShrink:0, marginTop:3 }}><Bot size={11} color={T.teal}/></div>}
                <div style={{ maxWidth:"76%", padding:"9px 13px", fontSize:12.5, background:m.role==="user"?T.teal:T.pageBg, color:m.role==="user"?"#fff":T.t1, lineHeight:1.65, whiteSpace:"pre-line", fontFamily:SANS, borderRadius:m.role==="user"?"8px 8px 2px 8px":"8px 8px 8px 2px", border:`1px solid ${m.role==="user"?T.teal:T.bdr}` }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center" }}><Bot size={11} color={T.teal}/></div>
                <div style={{ background:T.pageBg, borderRadius:8, padding:"9px 13px", fontSize:12, color:T.t3, fontFamily:SANS, border:`1px solid ${T.bdr}` }}>Thinking…</div>
              </div>
            )}
          </div>
          <div style={{ padding:"7px 12px", borderTop:`1px solid ${T.bdr}`, display:"flex", gap:5, flexWrap:"wrap" }}>
            {chips.map(c => <button key={c} onClick={() => setInput(c)} style={{ fontSize:11, padding:"3px 9px", borderRadius:3, border:`1px solid ${T.bdr}`, background:T.surfBg, color:T.t4, cursor:"pointer", fontFamily:SANS }}>{c}</button>)}
          </div>
          <div style={{ padding:"10px 14px", borderTop:`1px solid ${T.bdr}`, display:"flex", gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder="Ask about inventory, orders, stock…"
              style={{ flex:1, padding:"7px 11px", border:`1px solid ${T.bdr}`, borderRadius:4, fontSize:12.5, fontFamily:SANS, outline:"none", color:T.t1, background:T.pageBg }}/>
            <button onClick={send} style={{ padding:"7px 16px", border:"none", borderRadius:4, background:T.teal, color:"#fff", fontSize:12, cursor:"pointer", fontWeight:600, fontFamily:SANS, display:"flex", alignItems:"center", gap:5 }}>
              Send <ArrowRight size={12}/>
            </button>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"13px 14px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <Activity size={12} color={T.teal}/> Live Snapshot
            </div>
            {[["Total SKUs",products.length,false],["Stock Value",fmtK(totalVal),false],["Pending Orders",pendOrders.length,false],["Alerts",lowStock.length,true],["Total Orders",orders.length,false]].map(([lbl,val,warn])=>(
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, marginBottom:8 }}>
                <span style={{ color:T.t3, fontFamily:SANS }}>{lbl}</span>
                <span style={{ fontFamily:MONO, fontWeight:700, color:warn?T.red:T.t1 }}>{warn?"⚠ ":""}{val}</span>
              </div>
            ))}
          </div>
          {aiTips.map((tip,i) => (
            <div key={i} style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"11px 13px", borderLeft:`3px solid ${tip.color}` }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:4 }}>{tip.title}</div>
              <p style={{ margin:0, fontSize:11, color:T.t2, fontFamily:SANS, lineHeight:1.5 }}>{tip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

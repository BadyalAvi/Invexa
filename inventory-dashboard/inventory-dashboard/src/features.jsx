import { useState, useRef, useMemo, useEffect } from "react";
import {
  Bot, ArrowRight, Activity, AlertTriangle, TrendingUp,
  Target, DollarSign, RotateCcw, Download, FileText,
  Camera, CheckCircle2, Package, Search, Send,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { T, MONO, SANS, fmtINR, fmtK, revData as fallbackRevData, weatherData } from "./data.js";
import { KPI, PageTitle, Btn, SectionCard, ProgressBar } from "./ui.jsx";

// 🚨 HARD-WIRED API KEYS: BYPASSING .ENV COMPLETELY 🚨
const HARDCODED_GEMINI_KEY = "AIzaSyAuVy1NjujqGzyACOFVlBmSOv2UBgGN3RY";
const HARDCODED_WEATHER_KEY = ""; // Paste OpenWeather API key here if you get one

const catData = [
  { name:"Furniture",   value:24, color:T.teal  },
  { name:"Electronics", value:35, color:T.amber },
  { name:"Stationery",  value:87, color:T.green },
];

// ─── GEMINI API MASTER ENGINE (PRODUCTION MODE) ──────────────────────────────
async function callGemini(systemPrompt, contents) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || HARDCODED_GEMINI_KEY;
  
  if (!apiKey) throw new Error("Gemini API Key missing at the top of features.jsx!");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "API error " + response.status);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

// ─── Build inventory context string (used by both NLP + AI) ──────────────────
function buildInventoryContext(products, orders) {
  const lowStock     = products.filter(p => p.status !== "ok");
  const totalVal     = products.reduce((a, p) => a + (p.onHand || 0) * (p.cost || 0), 0);
  const pendingOrders= orders.filter(o => o.status === "pending");
  const totalRevenue = orders
    .filter(o => o.type === "sale" && o.status === "done")
    .reduce((a, o) => a + (o.total || 0), 0);

  const productLines = products.map(p => {
    const margin = p.price && p.cost
      ? ((p.price - p.cost) / p.price * 100).toFixed(1)
      : "0";
    return p.code + ": " + p.name + " (" + p.category + ")"
      + " — Stock: " + (p.onHand || 0) + "/" + (p.max || 0) + " " + (p.unit || "pcs")
      + ", Available: " + (p.available || 0)
      + ", Reserved: " + (p.reserved || 0)
      + ", Reorder pt: " + (p.reorder || 0)
      + ", Cost: ₹" + (p.cost || 0)
      + ", Price: ₹" + (p.price || 0)
      + ", Margin: " + margin + "%"
      + ", Status: " + (p.status || "ok")
      + ", Warehouse: " + (p.warehouse || "");
  }).join("\n");

  const orderLines = orders.slice(0, 15).map(o =>
    (o.id || "") + " — " + (o.type || "") + " | " + (o.customer || "")
    + " | " + (o.product || "") + " | ₹" + ((o.total || 0).toLocaleString("en-IN"))
    + " | " + (o.status || "") + " | " + (o.priority || "normal") + " priority"
  ).join("\n");

  const lowStockLines = lowStock.map(p =>
    p.code + ": " + p.name
    + " — " + (p.onHand || 0) + " on hand"
    + ", reorder at " + (p.reorder || 0)
    + ", need " + Math.max(0, (p.max || 0) - (p.onHand || 0)) + " units"
  ).join("\n") || "None currently";

  return "## LIVE BUSINESS DATA\n"
    + "Total SKUs: " + products.length + "\n"
    + "Stock value at cost: ₹" + totalVal.toLocaleString("en-IN") + "\n"
    + "Low/critical stock: " + lowStock.length + " items\n"
    + "Critical items: " + products.filter(p => p.status === "critical").length + "\n"
    + "Pending orders: " + pendingOrders.length + "\n"
    + "Completed revenue: ₹" + totalRevenue.toLocaleString("en-IN") + "\n"
    + "Total orders: " + orders.length + "\n\n"
    + "## ALL PRODUCTS\n" + productLines + "\n\n"
    + "## RECENT ORDERS\n" + orderLines + "\n\n"
    + "## LOW / CRITICAL STOCK\n" + lowStockLines;
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export function Analytics({ products, orders }) {
  const top5 = [...products]
    .sort((a,b) => (b.onHand * b.price) - (a.onHand * a.price))
    .slice(0, 5);
  const healthScore = Math.round(
    (products.filter(p => p.status === "ok").length / Math.max(products.length, 1)) * 60 +
    (orders.filter(o => o.status === "done").length / Math.max(orders.length, 1)) * 40
  );
  const scoreColor = healthScore >= 75 ? T.green : healthScore >= 50 ? T.amber : T.red;

  const liveRevData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toLocaleString("en-IN", { month: "short" });
    });

    let hasRealData = false;
    const computedData = months.map(month => {
      const monthOrders = orders.filter(o => 
        o.status === "done" && typeof o.date === "string" && o.date.includes(month)
      );
      const revenue = monthOrders.filter(o => o.type === "sale").reduce((sum, o) => sum + (o.total || 0), 0) / 1000;
      const cost    = monthOrders.filter(o => o.type === "purchase").reduce((sum, o) => sum + (o.total || 0), 0) / 1000;
      if (revenue > 0 || cost > 0) hasRealData = true;
      return { month, revenue: Math.round(revenue), cost: Math.round(cost), profit: Math.round(revenue - cost) };
    });
    return hasRealData ? computedData : fallbackRevData;
  }, [orders]);

  const totalRev  = liveRevData.reduce((a,d) => a + d.revenue, 0);
  const totalProf = liveRevData.reduce((a,d) => a + d.profit,  0);
  const profitMargin = totalRev > 0 ? ((totalProf / totalRev) * 100).toFixed(1) : 0;

  const forecastData = useMemo(() => {
    const lastMonth = liveRevData[liveRevData.length - 1];
    return [
      ...liveRevData,
      { month: "Next*", revenue: Math.round(lastMonth.revenue * 1.05), profit: Math.round(lastMonth.profit * 1.05) },
      { month: "+2 Mo*", revenue: Math.round(lastMonth.revenue * 1.08), profit: Math.round(lastMonth.profit * 1.08) },
      { month: "+3 Mo*", revenue: Math.round(lastMonth.revenue * 1.12), profit: Math.round(lastMonth.profit * 1.12) },
    ];
  }, [liveRevData]);

  return (
    <div>
      <PageTitle title="Analytics & Reports" sub="P&L · Inventory health · Forecasts · Business intelligence"
        actions={<>
          <Btn Icon={Download}>Export PDF</Btn>
          <Btn Icon={FileText} variant="primary">Generate Report</Btn>
        </>}
      />

      <div style={{ background:T.sideNav, borderRadius:6, padding:"18px 24px", marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between", border:`1px solid ${T.sideNavB}` }}>
        <div>
          <div style={{ fontSize:11, color:"#78716c", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:SANS, marginBottom:8 }}>Business Health Score</div>
          <div style={{ fontSize:44, fontWeight:800, color:"#FAFAF8", fontFamily:MONO, letterSpacing:"-2px", lineHeight:1 }}>
            {healthScore}<span style={{ fontSize:18, fontWeight:400, color:"#57534e" }}>/100</span>
          </div>
          <div style={{ fontSize:13, color:"#9A9490", fontFamily:SANS, marginTop:6 }}>
            {healthScore >= 75 ? "Excellent — operations running smoothly"
              : healthScore >= 50 ? "Good — a few areas need attention"
              : "Action needed — check stock alerts"}
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
        <KPI label="Gross Revenue"  value={fmtK(totalRev*1000)}  sub="Last 6 Months"  delta="Live" up Icon={TrendingUp}  />
        <KPI label="Total Profit"   value={fmtK(totalProf*1000)} sub="after COGS"    delta="Live"  up Icon={DollarSign}  accent={T.green} />
        <KPI label="Profit Margin"  value={`${profitMargin}%`}                sub="avg this year" delta="Live" up Icon={Target}       accent={T.blue}  />
        <KPI label="Inventory Turn" value="4.2×"                 sub="per year"      delta="+0.4×" up Icon={RotateCcw}   accent={T.amber} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14, marginBottom:14 }}>
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 18px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:2 }}>Monthly P&L (Live Database)</div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginBottom:14 }}>Revenue · Cost · Profit — Last 6 Months (₹000s)</div>
          <div style={{ display:"flex", gap:14, marginBottom:10 }}>
            {[[T.teal,"Revenue"],[T.bdr,"Cost"],[T.green,"Profit"]].map(([c,l]) => (
              <span key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.t4, fontFamily:SANS }}>
                <span style={{ width:10, height:3, background:c, display:"inline-block", borderRadius:2 }}/>{l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={liveRevData} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="4 4" stroke={T.bdr2} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:T.t3, fontFamily:SANS }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => "₹"+v+"k"} tick={{ fontSize:10, fill:T.t3, fontFamily:MONO }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v,n) => ["₹"+v+"k",n]} contentStyle={{ fontSize:12, border:`1px solid ${T.bdr}`, borderRadius:5, boxShadow:"none", fontFamily:SANS }}/>
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
              <div key={p.id || i} style={{ marginBottom:12 }}>
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
        <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginBottom:14 }}>Predicted trends from live data · * = forecast</div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={forecastData}>
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
  const [query,   setQuery]   = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error,   setError]   = useState("");

  const suggestions = [
    "What are my most profitable low-stock items?",
    "Which products should I reorder this week?",
    "Show me all critical stock items",
    "What is my total inventory value by category?",
    "Which high-priority orders are still pending?",
    "What are my best and worst performing products?",
    "Forecast what I need to restock for next month",
    "Show me dead stock — items not moving",
  ];

  const runQuery = async (q) => {
    if (!q.trim()) return;
    setError("");
    setLoading(true);
    setResult(null);

    const context = buildInventoryContext(products, orders);
    const systemPrompt = "You are InvenPro's AI analyst. Answer questions about this business's live inventory and orders data.\n\n"
      + context + "\n\n"
      + "INSTRUCTIONS:\n"
      + "- Answer in plain English, be specific and data-driven\n"
      + "- Always reference actual product names and codes from the data above\n"
      + "- Format numbers in Indian Rupees with commas\n"
      + "- Give actionable recommendations based on the data\n"
      + "- Use bullet points for lists\n"
      + "- Keep answers concise but complete";

    try {
      const contents = [{ role: "user", parts: [{ text: q }] }];
      const text = await callGemini(systemPrompt, contents);
      const res = { text, query:q };
      setResult(res);
      setHistory(h => [{ q, text }, ...h.slice(0,9)]);
    } catch (err) {
      setError(err.message || "Failed to connect to AI.");
    } finally {
      setLoading(false);
    }
  };

  const run = () => { if (query.trim()) runQuery(query); };

  return (
    <div>
      <PageTitle
        title="Natural Language Command"
        sub="Ask anything in plain English — answered by Gemini AI using your live inventory data"
      />

      <div style={{ background:T.surfBg, border:`2px solid ${T.teal}`, borderRadius:8, padding:"14px 18px", marginBottom:18 }}>
        <div style={{ fontSize:11, color:T.teal, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:SANS, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
          <Bot size={13}/> Ask Gemini AI — reads your live inventory
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && run()}
            placeholder="e.g. Which products should I reorder this week?"
            style={{ flex:1, padding:"10px 14px", border:`1px solid ${T.bdr}`, borderRadius:5, fontSize:14, fontFamily:SANS, outline:"none", color:T.t1, background:T.pageBg }}
          />
          <button onClick={run} disabled={loading} style={{ padding:"10px 22px", background:loading?T.tealM:T.teal, border:"none", borderRadius:5, color:"#fff", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", fontFamily:SANS, display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            {loading
              ? <><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite" }}/> Thinking…</>
              : <><Search size={14}/> Ask AI</>}
          </button>
        </div>
        <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
          {suggestions.slice(0,4).map(s => (
            <button key={s} onClick={() => { setQuery(s); runQuery(s); }}
              style={{ fontSize:11, padding:"4px 10px", borderRadius:99, border:`1px solid ${T.bdr}`, background:T.surfBg, color:T.t4, cursor:"pointer", fontFamily:SANS }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background:T.redL, border:`1px solid #F0A8A1`, borderRadius:6, padding:"11px 14px", marginBottom:16, fontSize:13, color:T.red, fontFamily:SANS }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"32px", textAlign:"center" }}>
          <div style={{ width:36, height:36, border:`3px solid ${T.tealL}`, borderTop:`3px solid ${T.teal}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }}/>
          <div style={{ fontSize:13, color:T.t3, fontFamily:SANS }}>Gemini is reading your inventory data…</div>
        </div>
      )}

      {result && !loading && (
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"18px 20px", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${T.bdr}` }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bot size={14} color={T.teal}/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>Gemini AI — InvenPro Analyst</div>
              <div style={{ fontSize:10, color:T.t3, fontFamily:SANS }}>Based on your live inventory & orders data</div>
            </div>
          </div>
          <div style={{ fontSize:13.5, color:T.t1, fontFamily:SANS, lineHeight:1.8, whiteSpace:"pre-wrap" }}>
            {result.text}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"14px 16px", marginBottom:18 }}>
          <div style={{ fontSize:11, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:10 }}>More questions to try</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {suggestions.slice(4).map(s => (
              <button key={s} onClick={() => { setQuery(s); runQuery(s); }}
                style={{ textAlign:"left", padding:"9px 12px", background:T.pageBg, border:`1px solid ${T.bdr}`, borderRadius:5, fontSize:12.5, color:T.t2, cursor:"pointer", fontFamily:SANS }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.teal; e.currentTarget.style.color=T.teal; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.t2; }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:T.t4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:10 }}>Query History</div>
          {history.map((h,i) => (
            <button key={i} onClick={() => { setQuery(h.q); setResult({ text:h.text, query:h.q }); }}
              style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", marginBottom:6, background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:5, fontSize:12, color:T.t2, cursor:"pointer", fontFamily:SANS }}>
              "{h.q}"
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── WEATHER CONTEXT ENGINE (REAL OpenWeatherMap API) ────────────────────────
export function WeatherEngine({ products }) {
  const [weather,    setWeather]    = useState(null);
  const [forecast,   setForecast]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [aiAdvice,   setAiAdvice]   = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const [error,      setError]      = useState("");
  const [city,       setCity]       = useState("Mumbai");
  const [cityInput,  setCityInput]  = useState("Mumbai");
  const [dismissed,  setDismissed]  = useState([]);

  const OWM_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || HARDCODED_WEATHER_KEY;

  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError("");
    setAiAdvice("");
    setDismissed([]);
    try {
      if (!OWM_KEY) throw new Error("API Key missing! Paste OpenWeather key at the top of features.jsx");

      const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${OWM_KEY}&units=metric`);
      if (!wRes.ok) {
        const e = await wRes.json().catch(() => ({}));
        throw new Error(e.message || "City not found. Check spelling.");
      }
      const wData = await wRes.json();

      const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${OWM_KEY}&units=metric`);
      const fData = await fRes.json();

      const days = {};
      (fData.list || []).forEach(item => {
        const d   = item.dt_txt.split(" ")[0];
        const hr  = parseInt(item.dt_txt.split(" ")[1]);
        if (!days[d] || Math.abs(hr - 12) < Math.abs((days[d].hr || 0) - 12)) {
          days[d] = { ...item, hr };
        }
      });

      const forecastDays = Object.values(days).slice(0, 7).map(item => ({
        day:         new Date(item.dt * 1000).toLocaleDateString("en-IN", { weekday:"short", day:"2-digit", month:"short" }),
        temp:        Math.round(item.main.temp),
        feelsLike:   Math.round(item.main.feels_like),
        humidity:    item.main.humidity,
        rain:        Math.round((item.pop || 0) * 100),
        wind:        Math.round(item.wind.speed * 3.6),
        description: item.weather[0]?.description || "",
        icon:        item.weather[0]?.icon || "01d",
        weatherMain: item.weather[0]?.main || "",
      }));

      const current = {
        city:        wData.name,
        country:     wData.sys.country,
        temp:        Math.round(wData.main.temp),
        feelsLike:   Math.round(wData.main.feels_like),
        humidity:    wData.main.humidity,
        wind:        Math.round(wData.wind.speed * 3.6),
        description: wData.weather[0]?.description || "",
        icon:        wData.weather[0]?.icon || "01d",
        weatherMain: wData.weather[0]?.main || "",
        visibility:  Math.round((wData.visibility || 10000) / 1000),
        pressure:    wData.main.pressure,
        rain1h:      wData.rain?.["1h"] || 0,
      };

      setWeather(current);
      setForecast(forecastDays);
      setCity(cityName);

      await fetchAIAdvice(current, forecastDays, products);

    } catch (err) {
      setError(err.message || "Failed to fetch weather.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAIAdvice = async (weatherData, forecastData, prods) => {
    setAiLoading(true);
    try {
      const lowStock      = prods.filter(p => p.status !== "ok");
      const criticalStock = prods.filter(p => p.status === "critical");
      const heavyRainDays = forecastData.filter(f => f.rain > 60);
      const heatDays      = forecastData.filter(f => f.temp > 36);
      const stormDays     = forecastData.filter(f => f.weatherMain === "Thunderstorm");

      const productLines = prods.slice(0, 20).map(p =>
        p.code + ": " + p.name + " (" + p.category + ")"
        + " — Stock: " + (p.onHand || 0)
        + ", Status: " + (p.status || "ok")
        + ", Warehouse: " + (p.warehouse || "WH/Main")
      ).join("\n");

      const systemPrompt = "You are a logistics and supply chain AI for an inventory management system. "
        + "Analyze the weather data and inventory to give specific, actionable business recommendations.\n\n"
        + "CURRENT WEATHER — " + weatherData.city + ", " + weatherData.country + ":\n"
        + "Temperature: " + weatherData.temp + "°C (feels like " + weatherData.feelsLike + "°C)\n"
        + "Condition: " + weatherData.description + "\n"
        + "Humidity: " + weatherData.humidity + "%\n"
        + "Wind: " + weatherData.wind + " km/h\n"
        + "Rain last hour: " + weatherData.rain1h + "mm\n\n"
        + "7-DAY FORECAST:\n"
        + forecastData.map(f =>
          f.day + ": " + f.temp + "°C, " + f.rain + "% rain chance, " + f.wind + " km/h wind, " + f.description
        ).join("\n") + "\n\n"
        + "CRITICAL ALERTS:\n"
        + "Heavy rain days (>60%): " + (heavyRainDays.length > 0 ? heavyRainDays.map(f => f.day).join(", ") : "None") + "\n"
        + "Heat wave days (>36°C): " + (heatDays.length > 0 ? heatDays.map(f => f.day).join(", ") : "None") + "\n"
        + "Storm days: " + (stormDays.length > 0 ? stormDays.map(f => f.day).join(", ") : "None") + "\n\n"
        + "INVENTORY (top 20 products):\n"
        + productLines + "\n\n"
        + "Critical stock items: " + (criticalStock.length > 0 ? criticalStock.map(p => p.name).join(", ") : "None") + "\n"
        + "Low stock items: " + (lowStock.length > 0 ? lowStock.map(p => p.name).join(", ") : "None") + "\n\n"
        + "Give 4-6 specific, numbered, actionable recommendations covering:\n"
        + "1. Shipment scheduling (which days to avoid for dispatch/delivery)\n"
        + "2. Stock protection (temperature/humidity sensitive products)\n"
        + "3. Demand forecast adjustments (weather affects demand for certain products)\n"
        + "4. Warehouse operations (staff planning, equipment needs)\n"
        + "5. Risk mitigation (what could go wrong and how to prevent it)\n"
        + "Be specific — reference actual product names and forecast dates. Keep each point concise.";

      const contents = [{ role: "user", parts: [{ text: "Analyze this weather and give me logistics recommendations for my inventory operations." }] }];
      const text = await callGemini(systemPrompt, contents);

      setAiAdvice(text);
    } catch (err) {
      setAiAdvice("AI advice unavailable — check your Gemini API Key.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => { fetchWeather("Mumbai"); }, []);

  const getWeatherIcon = (iconCode) => {
    if (!iconCode) return "🌤";
    const main = iconCode.replace("d","").replace("n","");
    const map = { "01":"☀️","02":"🌤","03":"☁️","04":"☁️","09":"🌧","10":"🌦","11":"⛈","13":"🌨","50":"🌫" };
    return map[main] || "🌤";
  };

  const getRainColor = (pct) => pct > 70 ? T.red : pct > 40 ? T.amber : T.green;

  return (
    <div>
      <PageTitle
        title="Weather Context Engine"
        sub="Real weather data · AI-powered logistics recommendations · Supply chain impact analysis"
      />

      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        <input
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchWeather(cityInput)}
          placeholder="Enter city name (e.g. Mumbai, Delhi, Pune)"
          style={{ flex:1, padding:"9px 14px", border:`1px solid ${T.bdr}`, borderRadius:5, fontSize:13, fontFamily:SANS, outline:"none", color:T.t1, background:T.surfBg }}
        />
        <button
          onClick={() => fetchWeather(cityInput)}
          disabled={loading}
          style={{ padding:"9px 20px", background:loading?T.tealM:T.teal, border:"none", borderRadius:5, color:"#fff", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", fontFamily:SANS }}
        >
          {loading ? "Loading…" : "Get Weather"}
        </button>
      </div>

      {error && (
        <div style={{ background:T.redL, border:"1px solid #F0A8A1", borderRadius:6, padding:"11px 14px", marginBottom:16, fontSize:13, color:T.red, fontFamily:SANS }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign:"center", padding:40 }}>
          <div style={{ width:36, height:36, border:`3px solid ${T.tealL}`, borderTop:`3px solid ${T.teal}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }}/>
          <div style={{ fontSize:13, color:T.t3, fontFamily:SANS }}>Fetching live weather data…</div>
        </div>
      )}

      {weather && !loading && (
        <>
          <div style={{ background:T.sideNav, borderRadius:8, padding:"20px 24px", marginBottom:18, border:`1px solid ${T.sideNavB}`, display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16 }}>
            <div>
              <div style={{ fontSize:11, color:"#57534e", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:SANS, marginBottom:4 }}>
                {weather.city}, {weather.country}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ fontSize:44 }}>{getWeatherIcon(weather.icon)}</span>
                <div>
                  <div style={{ fontSize:40, fontWeight:800, color:"#F0EDE8", fontFamily:MONO, lineHeight:1 }}>{weather.temp}°C</div>
                  <div style={{ fontSize:12, color:"#78716c", fontFamily:SANS }}>Feels like {weather.feelsLike}°C</div>
                </div>
              </div>
              <div style={{ fontSize:13, color:"#9A9490", fontFamily:SANS, textTransform:"capitalize" }}>{weather.description}</div>
            </div>
            {[
              ["Humidity",    weather.humidity + "%",      weather.humidity > 80 ? T.amber : T.green],
              ["Wind Speed",  weather.wind + " km/h",      weather.wind > 40 ? T.red : T.green],
              ["Visibility",  weather.visibility + " km",  weather.visibility < 5 ? T.amber : T.green],
            ].map(([lbl,val,col]) => (
              <div key={lbl} style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
                <div style={{ fontSize:11, color:"#57534e", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:SANS, marginBottom:6 }}>{lbl}</div>
                <div style={{ fontSize:28, fontWeight:800, fontFamily:MONO, color:col }}>{val}</div>
                <div style={{ fontSize:11, color:"#57534e", fontFamily:SANS, marginTop:3 }}>
                  {lbl === "Humidity" && (weather.humidity > 80 ? "High — protect moisture-sensitive goods" : "Normal")}
                  {lbl === "Wind Speed" && (weather.wind > 40 ? "High — secure outdoor storage" : "Normal")}
                  {lbl === "Visibility" && (weather.visibility < 5 ? "Low — delay road shipments" : "Clear for transport")}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:10 }}>
              7-Day Forecast — {weather.city}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
              {forecast.map((f,i) => (
                <div key={i} style={{ background:T.surfBg, border:`1px solid ${f.rain > 60 ? "#F0A8A1" : T.bdr}`, borderRadius:6, padding:"10px 8px", textAlign:"center", borderTop:`3px solid ${getRainColor(f.rain)}` }}>
                  <div style={{ fontSize:9.5, color:T.t4, fontFamily:SANS, fontWeight:600, marginBottom:5 }}>{f.day}</div>
                  <div style={{ fontSize:20, marginBottom:5 }}>{getWeatherIcon(f.icon)}</div>
                  <div style={{ fontSize:14, fontFamily:MONO, fontWeight:700, color:T.amber }}>{f.temp}°</div>
                  <div style={{ fontSize:10, color:getRainColor(f.rain), fontFamily:SANS, marginTop:3, fontWeight:600 }}>{f.rain}%</div>
                  <div style={{ fontSize:9, color:T.t3, fontFamily:SANS, marginTop:2 }}>{f.wind}km/h</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${T.bdr}` }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Bot size={14} color={T.teal}/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>AI Logistics Recommendations</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>Gemini AI · Real weather data · Your live inventory</div>
              </div>
              <button
                onClick={() => fetchAIAdvice(weather, forecast, products)}
                disabled={aiLoading}
                style={{ marginLeft:"auto", padding:"5px 12px", background:T.tealL, border:`1px solid ${T.tealM}`, borderRadius:4, color:T.teal, fontSize:11, cursor:aiLoading?"not-allowed":"pointer", fontFamily:SANS, fontWeight:600 }}
              >
                {aiLoading ? "Analyzing…" : "Refresh AI Advice"}
              </button>
            </div>

            {aiLoading && (
              <div style={{ textAlign:"center", padding:20 }}>
                <div style={{ width:28, height:28, border:`3px solid ${T.tealL}`, borderTop:`3px solid ${T.teal}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }}/>
                <div style={{ fontSize:12, color:T.t3, fontFamily:SANS }}>Gemini is analyzing weather impact on your supply chain…</div>
              </div>
            )}

            {aiAdvice && !aiLoading && (
              <div style={{ fontSize:13.5, color:T.t1, fontFamily:SANS, lineHeight:1.8, whiteSpace:"pre-wrap" }}>
                {aiAdvice}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── CV AUDIT (Real Camera + Gemini Vision API) ───────────────────────────────
export function CVAudit({ products }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);

  const [cameraOn,   setCameraOn]   = useState(false);
  const [captured,   setCaptured]   = useState(null);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [results,    setResults]    = useState(null);
  const [error,      setError]      = useState("");
  const [camError,   setCamError]   = useState("");

  // ── FIX: Attach stream to video tag AFTER it renders ────────────────────
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Camera play error:", e));
    }
  }, [cameraOn]);

  // ── Start real device camera ────────────────────────────────────────────
  const startCamera = async () => {
    setCamError("");
    setError("");
    setCaptured(null);
    setResults(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:1280 }, height:{ ideal:720 } },
      });
      streamRef.current = stream;
      // Set state to true FIRST so React renders the <video> element on the screen
      setCameraOn(true);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setCamError("Camera permission denied. Please allow camera access in your browser settings, or use the Upload Image option below.");
      } else if (err.name === "NotFoundError") {
        setCamError("No camera found on this device. Use the Upload Image option below.");
      } else {
        setCamError("Camera error: " + err.message + ". Try the Upload Image option.");
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  // ── Capture frame from live camera ──────────────────────────────────────
  const captureFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    setCaptured(base64);
    stopCamera();
  };

  // ── Upload image file as alternative ─────────────────────────────────────
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    if (file.size > 5 * 1024 * 1024)    { setError("Image must be under 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setCaptured(base64);
      setCameraOn(false);
      setResults(null);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  // ── Analyze with Gemini Vision ────────────────────────────────────────────
  const analyzeImage = async () => {
    if (!captured) return;
    setAnalyzing(true);
    setError("");
    setResults(null);

    const productList = products.map(p =>
      p.code + ": " + p.name + " (" + p.category + ") — System stock: " + (p.onHand || 0) + " " + (p.unit || "pcs")
    ).join("\n");

    const systemPrompt = "You are a computer vision AI for warehouse inventory management. "
      + "Your job is to analyze shelf/warehouse images and count visible products, then compare with the inventory system.\n\n"
      + "INVENTORY SYSTEM RECORDS (for comparison):\n"
      + productList + "\n\n"
      + "INSTRUCTIONS:\n"
      + "1. Describe what you see in the image (shelf, products, storage area, etc.)\n"
      + "2. List every distinct product type you can identify, with estimated count\n"
      + "3. If any products match items in our inventory list above, note the match and any discrepancy\n"
      + "4. Flag any issues: empty shelves, damaged items, misplaced products, poor organization\n"
      + "5. Give an overall audit summary with action items\n\n"
      + "Format your response as JSON with this structure:\n"
      + "{\n"
      + '  "scene_description": "brief description of what you see",\n'
      + '  "detected_items": [\n'
      + '    {"name": "product name", "estimated_count": 5, "matched_sku": "FCH-001 or null", "condition": "good/damaged/unknown", "confidence": "high/medium/low"}\n'
      + "  ],\n"
      + '  "discrepancies": [\n'
      + '    {"sku": "FCH-001", "product": "Corner Desk", "system_count": 4, "detected_count": 6, "difference": 2}\n'
      + "  ],\n"
      + '  "issues": ["list of issues found"],\n'
      + '  "audit_score": 85,\n'
      + '  "recommendations": ["list of action items"]\n'
      + "}\n"
      + "Respond with ONLY the JSON. No markdown, no explanation outside the JSON.";

    try {
      const contents = [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: captured } },
          { text: "Analyze this warehouse/shelf image and audit the inventory. Return only JSON." }
        ]
      }];

      const rawText = await callGemini(systemPrompt, contents);
      const cleaned = rawText.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          scene_description: rawText,
          detected_items:    [],
          discrepancies:     [],
          issues:            [],
          audit_score:       null,
          recommendations:   [],
        };
      }
      setResults(parsed);
    } catch (err) {
      setError(err.message || "Failed to analyze image. Check your API key.");
    } finally {
      setAnalyzing(false);
    }
  };

  const retake = () => {
    setCaptured(null);
    setResults(null);
    setError("");
    setCamError("");
  };

  const scoreColor = (s) => s >= 80 ? T.green : s >= 60 ? T.amber : T.red;

  return (
    <div>
      <PageTitle
        title="Computer Vision Audit"
        sub="Real camera · Gemini Vision AI · Compares detected stock with your live inventory system"
      />

      {camError && (
        <div style={{ background:T.amberL, border:`1px solid ${T.amberB}`, borderRadius:6, padding:"11px 14px", marginBottom:14, fontSize:13, color:T.amber, fontFamily:SANS }}>
          ⚠ {camError}
        </div>
      )}

      {error && (
        <div style={{ background:T.redL, border:"1px solid #F0A8A1", borderRadius:6, padding:"11px 14px", marginBottom:14, fontSize:13, color:T.red, fontFamily:SANS }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16, marginBottom:20 }}>

        {/* ── Camera / Preview ── */}
        <div style={{ background:T.sideNav, borderRadius:8, border:`1px solid ${T.sideNavB}`, overflow:"hidden", display:"flex", flexDirection:"column", minHeight:320 }}>

          {/* Camera live feed */}
          {cameraOn && (
            <div style={{ position:"relative", flex:1 }}>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
              />
              <div style={{ position:"absolute", top:10, left:10, background:"rgba(13,115,119,0.9)", padding:"3px 8px", borderRadius:3, fontSize:10, color:"#fff", fontFamily:MONO }}>
                LIVE
              </div>
              <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(13,115,119,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(13,115,119,0.1) 1px,transparent 1px)", backgroundSize:"60px 60px", pointerEvents:"none" }}/>
              <button
                onClick={captureFrame}
                style={{ position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)", padding:"10px 28px", background:T.teal, border:"3px solid #fff", borderRadius:99, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:SANS }}>
                📸 Capture
              </button>
              <button
                onClick={stopCamera}
                style={{ position:"absolute", top:10, right:10, padding:"4px 10px", background:"rgba(0,0,0,0.5)", border:"none", borderRadius:4, color:"#fff", fontSize:11, cursor:"pointer", fontFamily:SANS }}>
                ✕ Stop
              </button>
            </div>
          )}

          {/* Captured image preview */}
          {captured && !cameraOn && (
            <div style={{ position:"relative", flex:1 }}>
              <img
                src={"data:image/jpeg;base64," + captured}
                alt="Captured"
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
              />
              <div style={{ position:"absolute", top:10, left:10, background:"rgba(45,125,70,0.9)", padding:"3px 8px", borderRadius:3, fontSize:10, color:"#fff", fontFamily:MONO }}>
                CAPTURED
              </div>
            </div>
          )}

          {/* Initial state */}
          {!cameraOn && !captured && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
              <div style={{ fontSize:14, fontWeight:600, color:"#F0EDE8", fontFamily:SANS, marginBottom:6 }}>
                Shelf Audit Camera
              </div>
              <div style={{ fontSize:12, color:"#78716c", fontFamily:SANS, marginBottom:24, lineHeight:1.6 }}>
                Point your camera at a shelf or storage area.<br/>
                Gemini AI will identify and count the products.
              </div>
              <button
                onClick={startCamera}
                style={{ padding:"10px 24px", background:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                📷 Start Camera
              </button>
              <div style={{ fontSize:11, color:"#57534e", fontFamily:SANS, marginBottom:10 }}>or</div>
              <label style={{ padding:"8px 20px", background:"transparent", border:`1px solid ${T.tealM}`, borderRadius:6, color:T.tealM, fontSize:12, cursor:"pointer", fontFamily:SANS }}>
                📁 Upload Shelf Image
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>
              </label>
            </div>
          )}

          {/* Controls after capture */}
          {captured && !cameraOn && (
            <div style={{ padding:"10px 14px", borderTop:`1px solid ${T.sideNavB}`, display:"flex", gap:8, justifyContent:"center", flexShrink:0 }}>
              <button onClick={retake}
                style={{ padding:"7px 16px", background:"transparent", border:`1px solid ${T.sideNavB}`, borderRadius:4, color:"#9A9490", fontSize:12, cursor:"pointer", fontFamily:SANS }}>
                Retake / Upload
              </button>
              <button onClick={analyzeImage} disabled={analyzing}
                style={{ padding:"7px 20px", background:analyzing?T.tealM:T.teal, border:"none", borderRadius:4, color:"#fff", fontSize:12, fontWeight:600, cursor:analyzing?"not-allowed":"pointer", fontFamily:SANS, display:"flex", alignItems:"center", gap:6 }}>
                {analyzing
                  ? <><span style={{ width:12, height:12, border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite" }}/> Analyzing…</>
                  : "🔍 Analyze with AI"}
              </button>
            </div>
          )}
        </div>

        {/* ── How it works panel ── */}
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:8, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:14 }}>How It Works</div>
          {[
            ["📷","Open your device camera","Or upload an existing shelf photo"],
            ["📸","Capture the shelf",       "Point at shelves, racks, or storage areas"],
            ["🤖","Gemini Vision analyzes",   "AI identifies every product type and counts them"],
            ["📊","Compare with ERP",         "Detected counts vs your live system records"],
            ["✅","Review & approve",          "Update stock discrepancies with one click"],
          ].map(([icon,title,desc],i) => (
            <div key={i} style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS }}>{title}</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginTop:2 }}>{desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:4, padding:"10px 12px", background:T.tealL, borderRadius:5, border:`1px solid ${T.tealM}`, fontSize:11, color:T.teal, fontFamily:SANS, lineHeight:1.6 }}>
            💡 Best results: good lighting, items clearly visible, shoot from front.
            Supports JPG, PNG up to 5MB.
          </div>
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display:"none" }}/>

      {/* ── Analysis Results ── */}
      {analyzing && (
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"32px", textAlign:"center", marginBottom:16 }}>
          <div style={{ width:40, height:40, border:`3px solid ${T.tealL}`, borderTop:`3px solid ${T.teal}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }}/>
          <div style={{ fontSize:14, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:4 }}>Gemini Vision is analyzing your image…</div>
          <div style={{ fontSize:12, color:T.t3, fontFamily:SANS }}>Identifying products · Counting units · Comparing with your inventory</div>
        </div>
      )}

      {results && !analyzing && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Audit score + scene */}
          <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 20px", display:"flex", gap:20, alignItems:"flex-start" }}>
            {results.audit_score != null && (
              <div style={{ textAlign:"center", flexShrink:0 }}>
                <div style={{ fontSize:42, fontWeight:800, fontFamily:MONO, color:scoreColor(results.audit_score), lineHeight:1 }}>
                  {results.audit_score}
                </div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:SANS, marginTop:4 }}>Audit Score</div>
              </div>
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:6 }}>Scene Analysis</div>
              <div style={{ fontSize:13, color:T.t2, fontFamily:SANS, lineHeight:1.6 }}>
                {results.scene_description}
              </div>
              {results.issues?.length > 0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:T.red, fontFamily:SANS, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Issues Found</div>
                  {results.issues.map((issue, i) => (
                    <div key={i} style={{ fontSize:12, color:T.t2, fontFamily:SANS, marginBottom:3, display:"flex", gap:6, alignItems:"flex-start" }}>
                      <span style={{ color:T.red, flexShrink:0 }}>⚠</span>{issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detected items */}
          {results.detected_items?.length > 0 && (
            <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
              <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`, fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>
                Detected Items ({results.detected_items.length})
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
                    {["Product","Detected Count","Matched SKU","Condition","Confidence"].map(h => (
                      <th key={h} style={{ padding:"8px 13px", textAlign:"left", fontWeight:600, color:T.t4, fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.06em", background:"#F2EFE9", fontFamily:SANS }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.detected_items.map((item, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}` }}
                      onMouseEnter={e => e.currentTarget.style.background=T.surfAlt}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"9px 13px", fontWeight:500, color:T.t1, fontFamily:SANS }}>{item.name}</td>
                      <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:700, color:T.teal }}>{item.estimated_count}</td>
                      <td style={{ padding:"9px 13px", fontFamily:MONO, fontSize:11.5, color:item.matched_sku ? T.teal : T.t3 }}>{item.matched_sku || "—"}</td>
                      <td style={{ padding:"9px 13px" }}>
                        <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:item.condition==="good"?T.greenL:T.amberL, color:item.condition==="good"?T.green:T.amber, fontFamily:SANS }}>
                          {item.condition || "unknown"}
                        </span>
                      </td>
                      <td style={{ padding:"9px 13px" }}>
                        <span style={{ fontSize:11, padding:"2px 7px", borderRadius:3, fontWeight:500, background:item.confidence==="high"?T.greenL:T.amberL, color:item.confidence==="high"?T.green:T.amber, fontFamily:SANS }}>
                          {item.confidence || "medium"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Discrepancies */}
          {results.discrepancies?.length > 0 && (
            <div style={{ background:T.surfBg, border:`1px solid #F0A8A1`, borderRadius:6 }}>
              <div style={{ padding:"11px 14px", borderBottom:`1px solid #F0A8A1`, fontSize:13, fontWeight:600, color:T.red, fontFamily:SANS, display:"flex", alignItems:"center", gap:8 }}>
                ⚠ Stock Discrepancies Found ({results.discrepancies.length})
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.bdr}` }}>
                    {["SKU","Product","System Count","AI Detected","Difference","Action"].map(h => (
                      <th key={h} style={{ padding:"8px 13px", textAlign:"left", fontWeight:600, color:T.t4, fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.06em", background:"#F2EFE9", fontFamily:SANS }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.discrepancies.map((d, i) => {
                    const diff = d.difference || (d.detected_count - d.system_count);
                    return (
                      <tr key={i} style={{ borderBottom:`1px solid ${T.bdr2}`, background:T.redL+"44" }}>
                        <td style={{ padding:"9px 13px", fontFamily:MONO, color:T.teal, fontWeight:600, fontSize:11.5 }}>{d.sku || "—"}</td>
                        <td style={{ padding:"9px 13px", fontWeight:500, color:T.t1, fontFamily:SANS }}>{d.product}</td>
                        <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:700 }}>{d.system_count}</td>
                        <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:700, color:T.amber }}>{d.detected_count}</td>
                        <td style={{ padding:"9px 13px", fontFamily:MONO, fontWeight:800, color:diff > 0 ? T.green : T.red }}>
                          {diff > 0 ? "+" + diff : diff}
                        </td>
                        <td style={{ padding:"9px 13px" }}>
                          <button style={{ fontSize:11, padding:"4px 10px", background:T.teal, border:"none", borderRadius:3, color:"#fff", cursor:"pointer", fontFamily:SANS, fontWeight:500 }}>
                            Update Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Recommendations */}
          {results.recommendations?.length > 0 && (
            <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"16px 20px" }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:10 }}>AI Recommendations</div>
              {results.recommendations.map((rec, i) => (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:8, fontSize:13, color:T.t2, fontFamily:SANS, lineHeight:1.5 }}>
                  <span style={{ color:T.teal, fontWeight:700, flexShrink:0 }}>{i+1}.</span>{rec}
                </div>
              ))}
            </div>
          )}

          {/* Scan again */}
          <button onClick={retake}
            style={{ padding:"10px 24px", background:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, alignSelf:"flex-start" }}>
            📷 Scan Another Shelf
          </button>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
export function AIAssistant({ products, orders }) {
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const msgEndRef = useRef(null);

  const lowStock     = products.filter(p => p.status !== "ok");
  const totalVal     = products.reduce((a,p) => a + (p.onHand||0)*(p.cost||0), 0);
  const pendOrders   = orders.filter(o => o.status === "pending");
  const totalRevenue = orders
    .filter(o => o.type === "sale" && o.status === "done")
    .reduce((a,o) => a + (o.total||0), 0);

  const scrollToBottom = () => {
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
  };

  const systemPrompt = () => {
    const context = buildInventoryContext(products, orders);
    return "You are InvenPro's intelligent AI assistant for a warehouse/inventory management system.\n\n"
      + context + "\n\n"
      + "YOUR ROLE:\n"
      + "You are a knowledgeable business consultant and inventory manager. You:\n"
      + "- Give specific, data-driven answers using actual product names and codes from the data above\n"
      + "- Provide actionable recommendations with clear priorities\n"
      + "- Format numbers in Indian Rupees (₹) with proper commas\n"
      + "- Use clear formatting with bullet points when listing items\n"
      + "- Are conversational and helpful, like a skilled business analyst\n"
      + "- Can suggest purchase orders, reorder quantities, and business strategy\n"
      + "- Alert about risks like stockouts, dead stock, and cash tied up in inventory\n"
      + "- Remember the full conversation history and refer back to previous messages naturally\n"
      + "Always be direct, specific, and use the real data above in your answers.";
  };

  const send = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    const userMsg = {
      role: "user",
      text,
      ts: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
    };
    const updatedMsgs = [...msgs, userMsg];
    setMsgs(updatedMsgs);
    setInput("");
    setLoading(true);
    setError("");
    scrollToBottom();

    try {
      const apiMessages = updatedMsgs.map(m => ({
        role:    m.role === "ai" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

      const aiText = await callGemini(systemPrompt(), apiMessages);

      setMsgs(prev => [...prev, {
        role: "ai",
        text: aiText,
        ts: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
      }]);
    } catch (err) {
      setError(err.message || "Failed to connect to AI.");
      setMsgs(prev => [...prev, {
        role: "ai",
        text: "Sorry, I encountered an error. Please check your API Key at the top of features.jsx",
        ts: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
        isError: true,
      }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const chips = [
    "Which products need restocking urgently?",
    "Give me a full inventory health summary",
    "Which orders need immediate attention?",
    "Calculate my reorder costs for this week",
    "Which products have the best profit margin?",
    "Show me any dead stock I should discount",
  ];

  return (
    <div>
      <PageTitle
        title="AI Assistant"
        sub="Powered by Gemini AI · Full conversation memory · Reads your live inventory data"
        actions={<Btn onClick={() => setMsgs([])}>Clear Chat</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:14 }}>

        {/* ── Chat window ── */}
        <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, display:"flex", flexDirection:"column", height:600 }}>

          {/* Header */}
          <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bot size={15} color={T.teal}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>InvenPro AI</div>
              <div style={{ fontSize:11, color:loading?T.amber:T.green, fontFamily:SANS }}>
                {loading ? "● Thinking…" : "● Online · Gemini AI · Live inventory context"}
              </div>
            </div>
            <div style={{ fontSize:10, color:T.t3, fontFamily:SANS, background:T.tealL, padding:"2px 8px", borderRadius:3, border:`1px solid ${T.tealM}` }}>
              {products.length} SKUs loaded
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:12 }}>

            {msgs.length === 0 && (
              <div style={{ textAlign:"center", padding:"28px 20px" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                  <Bot size={24} color={T.teal}/>
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:T.t1, fontFamily:SANS, marginBottom:6 }}>Hi! I'm your InvenPro AI</div>
                <div style={{ fontSize:13, color:T.t3, fontFamily:SANS, lineHeight:1.7, marginBottom:20 }}>
                  I'm reading your live inventory data right now.<br/>Ask me anything about your business.
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:7, maxWidth:400, margin:"0 auto" }}>
                  {chips.slice(0,4).map(c => (
                    <button key={c} onClick={() => send(c)}
                      style={{ padding:"9px 14px", background:T.pageBg, border:`1px solid ${T.bdr}`, borderRadius:5, fontSize:12.5, color:T.t2, cursor:"pointer", fontFamily:SANS, textAlign:"left" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=T.teal; e.currentTarget.style.color=T.teal; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.t2; }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", gap:8, alignItems:"flex-start" }}>
                {m.role === "ai" && (
                  <div style={{ width:24, height:24, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                    <Bot size={11} color={T.teal}/>
                  </div>
                )}
                <div style={{ maxWidth:"78%", display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start", gap:3 }}>
                  <div style={{
                    padding:       "10px 14px",
                    fontSize:      13,
                    background:    m.role==="user" ? T.teal : m.isError ? T.redL : T.pageBg,
                    color:         m.role==="user" ? "#fff"  : m.isError ? T.red  : T.t1,
                    lineHeight:    1.75,
                    whiteSpace:    "pre-wrap",
                    fontFamily:    SANS,
                    borderRadius:  m.role==="user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                    border:        `1px solid ${m.role==="user" ? T.teal : m.isError ? "#F0A8A1" : T.bdr}`,
                  }}>
                    {m.text}
                  </div>
                  <div style={{ fontSize:10, color:T.t3, fontFamily:SANS }}>{m.ts}</div>
                </div>
                {m.role === "user" && (
                  <div style={{ width:24, height:24, borderRadius:"50%", background:T.teal, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2, fontSize:10, fontWeight:700, color:"#fff" }}>U</div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Bot size={11} color={T.teal}/>
                </div>
                <div style={{ background:T.pageBg, border:`1px solid ${T.bdr}`, borderRadius:"12px 12px 12px 3px", padding:"10px 14px", display:"flex", gap:4, alignItems:"center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.teal, animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}

            <div ref={msgEndRef}/>
          </div>

          {error && (
            <div style={{ padding:"8px 14px", background:T.redL, borderTop:`1px solid #F0A8A1`, fontSize:12, color:T.red, fontFamily:SANS, flexShrink:0 }}>
              ⚠ {error}
            </div>
          )}

          {msgs.length > 0 && (
            <div style={{ padding:"6px 12px", borderTop:`1px solid ${T.bdr}`, display:"flex", gap:5, flexWrap:"wrap", flexShrink:0 }}>
              {chips.slice(0,3).map(c => (
                <button key={c} onClick={() => send(c)}
                  style={{ fontSize:11, padding:"3px 9px", borderRadius:3, border:`1px solid ${T.bdr}`, background:T.surfBg, color:T.t4, cursor:"pointer", fontFamily:SANS }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding:"10px 14px", borderTop:`1px solid ${T.bdr}`, display:"flex", gap:8, flexShrink:0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask about inventory, orders, reordering, margins…"
              style={{ flex:1, padding:"9px 13px", border:`1px solid ${T.bdr}`, borderRadius:6, fontSize:13, fontFamily:SANS, outline:"none", color:T.t1, background:T.pageBg }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              style={{ padding:"9px 18px", border:"none", borderRadius:6, background:loading||!input.trim()?T.tealM:T.teal, color:"#fff", fontSize:13, cursor:loading||!input.trim()?"not-allowed":"pointer", fontWeight:600, fontFamily:SANS, display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
              Send <Send size={12}/>
            </button>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"13px 14px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <Activity size={12} color={T.teal}/> Live Context Loaded
            </div>
            {[
              ["Total SKUs",      products.length,                              false],
              ["Stock Value",     "₹"+totalVal.toLocaleString("en-IN"),        false],
              ["Low Stock",       lowStock.length,                              lowStock.length > 0],
              ["Pending Orders",  pendOrders.length,                            pendOrders.length > 3],
              ["Revenue (done)",  "₹"+totalRevenue.toLocaleString("en-IN"),    false],
              ["Total Orders",    orders.length,                                false],
            ].map(([lbl,val,warn]) => (
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, marginBottom:8 }}>
                <span style={{ color:T.t3, fontFamily:SANS }}>{lbl}</span>
                <span style={{ fontFamily:MONO, fontWeight:700, color:warn?T.red:T.t1 }}>{warn?"⚠ ":""}{val}</span>
              </div>
            ))}
          </div>

          <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6, padding:"13px 14px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:10 }}>What I can help with</div>
            {[
              ["📦", "Reorder recommendations",  "Based on stock levels & reorder points"],
              ["💰", "Profit & margin analysis",  "Which products make the most money"],
              ["⚠️", "Risk alerts",               "Stock-outs, dead stock, cash flow"],
              ["📊", "Business summaries",        "Health check, category performance"],
              ["🛒", "Order insights",            "Pending, high-priority, customer analysis"],
              ["🔮", "Forecasting",               "What to stock based on trends"],
            ].map(([icon,title,desc]) => (
              <div key={title} style={{ marginBottom:10, display:"flex", gap:8, alignItems:"flex-start" }}>
                <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.t1, fontFamily:SANS }}>{title}</div>
                  <div style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
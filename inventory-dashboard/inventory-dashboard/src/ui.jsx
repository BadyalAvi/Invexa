import { T, MONO, SANS, SC, PRI } from "./data.js";
import { CheckCircle2, Clock, XCircle, Activity, AlertTriangle } from "lucide-react";

export function Badge({ status }) {
  const c = SC[status] || SC.pending;
  const I = c.Icon;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontSize:11, padding:"2px 8px", borderRadius:3, fontWeight:500,
      background:c.bg, color:c.fg, border:`1px solid ${c.br}`,
      fontFamily:SANS,
    }}>
      <I size={10}/>{c.label}
    </span>
  );
}

export function PriBadge({ priority }) {
  const p = PRI[priority] || PRI.normal;
  return (
    <span style={{
      fontSize:11, padding:"2px 7px", borderRadius:3,
      fontWeight:500, background:p.bg, color:p.fg, fontFamily:SANS,
    }}>{p.label}</span>
  );
}

export function KPI({ label, value, sub, delta, up, Icon, accent }) {
  const ac = accent || T.teal;
  return (
    <div style={{
      background:T.surfBg, border:`1px solid ${T.bdr}`,
      borderRadius:6, padding:"14px 16px", borderTop:`3px solid ${ac}`,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <span style={{ fontSize:11, color:T.t4, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{label}</span>
        <Icon size={14} color={ac} style={{ opacity:0.7 }}/>
      </div>
      <div style={{ fontSize:22, fontWeight:700, color:T.t1, fontFamily:MONO, letterSpacing:"-0.5px", marginBottom:5 }}>{value}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>{sub}</span>
        {delta && (
          <span style={{ fontSize:11, fontWeight:600, fontFamily:MONO, color:up?T.green:T.red }}>
            {up?"↑":"↓"}{delta}
          </span>
        )}
      </div>
    </div>
  );
}

export function PageTitle({ title, sub, actions }) {
  return (
    <div style={{
      display:"flex", alignItems:"flex-end", justifyContent:"space-between",
      marginBottom:20, paddingBottom:14, borderBottom:`1px solid ${T.bdr}`,
    }}>
      <div>
        <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:T.t1, fontFamily:SANS, letterSpacing:"-0.3px" }}>{title}</h1>
        {sub && <p style={{ margin:"3px 0 0", fontSize:12, color:T.t3, fontFamily:SANS }}>{sub}</p>}
      </div>
      {actions && <div style={{ display:"flex", gap:7 }}>{actions}</div>}
    </div>
  );
}

export function Btn({ children, variant="ghost", onClick, Icon: Ic, disabled=false }) {
  const isPrimary = variant === "primary";
  const isDanger  = variant === "danger";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"flex", alignItems:"center", gap:5,
      padding: isPrimary ? "7px 14px" : "6px 12px",
      border:`1px solid ${isPrimary ? T.teal : isDanger ? T.red : T.bdr}`,
      borderRadius:5,
      background: isPrimary ? T.teal : isDanger ? T.redL : T.surfBg,
      color: isPrimary ? "#fff" : isDanger ? T.red : T.t2,
      fontSize:12, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily:SANS, fontWeight: isPrimary ? 600 : 400,
      opacity: disabled ? 0.5 : 1,
    }}>
      {Ic && <Ic size={12}/>}{children}
    </button>
  );
}

export function TH({ children }) {
  return (
    <th style={{
      padding:"8px 13px", textAlign:"left", fontWeight:600,
      color:T.t4, fontSize:10.5, textTransform:"uppercase",
      letterSpacing:"0.06em", background:"#F2EFE9",
      whiteSpace:"nowrap", fontFamily:SANS,
    }}>
      {children}
    </th>
  );
}

export function TD({ children, style={} }) {
  return (
    <td style={{ padding:"9px 13px", fontSize:13, color:T.t2, fontFamily:SANS, ...style }}>
      {children}
    </td>
  );
}

export function SectionCard({ title, children, action }) {
  return (
    <div style={{ background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
      <div style={{
        padding:"11px 14px", borderBottom:`1px solid ${T.bdr}`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{ fontSize:13, fontWeight:600, color:T.t1, fontFamily:SANS }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, width=540 }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(20,32,46,0.55)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000,
    }}>
      <div style={{
        background:T.surfBg, borderRadius:8, width, maxWidth:"95vw",
        maxHeight:"90vh", overflowY:"auto", border:`1px solid ${T.bdr}`,
        boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          padding:"13px 16px", borderBottom:`1px solid ${T.bdr}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span style={{ fontSize:14, fontWeight:700, color:T.t1, fontFamily:SANS }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, fontSize:20, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:16 }}>{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ pct, color }) {
  return (
    <div style={{ height:5, background:T.surfAlt, borderRadius:99, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,Math.max(0,pct))}%`, height:"100%", background:color||T.teal, borderRadius:99, transition:"width 0.3s" }}/>
    </div>
  );
}

export function FormGrid({ cols=3, children }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:10, marginBottom:12 }}>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:10, color:T.t4, fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS }}>{label}</div>
      {children}
    </div>
  );
}

export function Input({ value, onChange, type="text", placeholder="", style={} }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`,
        borderRadius:4, fontSize:12.5, fontFamily: type==="number" ? MONO : SANS,
        outline:"none", color:T.t1, boxSizing:"border-box", background:T.surfBg,
        ...style,
      }}/>
  );
}

export function Select({ value, onChange, options=[] }) {
  return (
    <select value={value} onChange={onChange}
      style={{
        width:"100%", padding:"6px 9px", border:`1px solid ${T.bdr}`,
        borderRadius:4, fontSize:12.5, fontFamily:SANS, color:T.t1,
        background:T.surfBg, outline:"none",
      }}>
      {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  );
}

export function AlertBanner({ type="warning", children }) {
  const colors = {
    warning: { bg:T.amberL, border:T.amberB, text:T.amber, Icon:AlertTriangle },
    error:   { bg:T.redL,   border:T.redB,   text:T.red,   Icon:XCircle      },
    success: { bg:T.greenL, border:T.greenB, text:T.green, Icon:CheckCircle2 },
    info:    { bg:T.blueL,  border:T.blueB,  text:T.blue,  Icon:Activity     },
  };
  const c = colors[type] || colors.warning;
  const I = c.Icon;
  return (
    <div style={{
      background:c.bg, border:`1px solid ${c.border}`, borderRadius:6,
      padding:"11px 14px", marginBottom:14,
      display:"flex", gap:8, alignItems:"flex-start",
    }}>
      <I size={14} color={c.text} style={{ flexShrink:0, marginTop:1 }}/>
      <div style={{ fontSize:12, color:c.text, fontFamily:SANS, lineHeight:1.6 }}>{children}</div>
    </div>
  );
}

import { useState } from "react";
import {
  Package, Eye, EyeOff, AlertCircle, Loader,
  CheckCircle, ArrowLeft, Shield, Lock, Mail,
  User, Building, Warehouse,
} from "lucide-react";
import { authAPI } from "./api.js";

const T = {
  teal:"#0D7377", tealL:"#E8F5F5", tealM:"#A8D5D6",
  amber:"#C8873A", amberL:"#FDF3E7",
  red:"#C0392B", redL:"#FCECEA",
  green:"#2D7D46", greenL:"#EAF5EE", greenB:"#9ED4B0",
  blue:"#2563A8", blueL:"#EAF0FA",
  t1:"#1A1A18", t2:"#4A4845", t3:"#9A9490", t4:"#6E6A66",
  bdr:"#E2DDD6", pageBg:"#F7F5F1", surfBg:"#FFFFFF",
  sideNav:"#14202E", sideNavB:"#1E2D3D",
};
const SANS = "'Outfit','Trebuchet MS',sans-serif";
const MONO = "'DM Mono','Courier New',monospace";

// ─── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label:"8+ characters",  pass: password.length >= 8        },
    { label:"Uppercase",       pass: /[A-Z]/.test(password)      },
    { label:"Number",          pass: /[0-9]/.test(password)      },
    { label:"Special char",    pass: /[^A-Za-z0-9]/.test(password)},
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ["", T.red, T.amber, T.amber, T.green];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:"flex", gap:4, marginBottom:5 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:99, background:i<=score?colors[score]:T.bdr, transition:"background 0.2s" }}/>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:10 }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize:10, color:c.pass?T.green:T.t3, fontFamily:SANS, display:"flex", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:10 }}>{c.pass?"✓":"○"}</span>{c.label}
            </span>
          ))}
        </div>
        <span style={{ fontSize:10, fontWeight:700, color:colors[score]||T.t3, fontFamily:SANS }}>{labels[score]||""}</span>
      </div>
    </div>
  );
}

// ─── Input component ───────────────────────────────────────────────────────────
function Field({ label, error, icon: Icon, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:SANS, marginBottom:6 }}>
        {label}
      </label>
      <div style={{ position:"relative" }}>
        {Icon && <Icon size={14} color={T.t3} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>}
        {children}
      </div>
      {error && <div style={{ fontSize:11, color:T.red, fontFamily:SANS, marginTop:4, display:"flex", alignItems:"center", gap:4 }}><AlertCircle size={11}/>{error}</div>}
    </div>
  );
}

function TextInput({ value, onChange, type="text", placeholder, icon, error, autoFocus, autoComplete, rightEl }) {
  const hasIcon = !!icon;
  return (
    <div style={{ position:"relative" }}>
      {icon && <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", zIndex:1 }}>{icon}</div>}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} autoFocus={autoFocus} autoComplete={autoComplete}
        style={{
          width:"100%", padding:`11px ${rightEl?44:14}px 11px ${hasIcon?38:14}px`,
          border:`1.5px solid ${error?T.red:T.bdr}`,
          borderRadius:6, fontSize:13.5, fontFamily:SANS,
          outline:"none", color:T.t1, background:T.surfBg,
          boxSizing:"border-box", transition:"border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor=T.teal}
        onBlur={e  => e.target.style.borderColor=error?T.red:T.bdr}
      />
      {rightEl && <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)" }}>{rightEl}</div>}
    </div>
  );
}

// ─── Alert banner ──────────────────────────────────────────────────────────────
function Alert({ type="error", children }) {
  const cfg = {
    error:   { bg:T.redL,   border:"#F0A8A1", color:T.red,   Icon:AlertCircle  },
    success: { bg:T.greenL, border:T.greenB,  color:T.green, Icon:CheckCircle  },
    info:    { bg:T.blueL,  border:"#9BBDE8", color:T.blue,  Icon:Shield        },
  }[type];
  const I = cfg.Icon;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:6, padding:"11px 14px", marginBottom:18 }}>
      <I size={15} color={cfg.color} style={{ flexShrink:0, marginTop:1 }}/>
      <span style={{ fontSize:13, color:cfg.color, fontFamily:SANS, lineHeight:1.5 }}>{children}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin, initialView = "login" }) {
  const [view, setView] = useState(initialView);

  return (
    <div style={{ minHeight:"100vh", background:T.sideNav, display:"flex", fontFamily:SANS, overflow:"hidden", position:"relative" }}>
      {/* Background dot pattern */}
      <div style={{ position:"absolute", inset:0, opacity:0.04, backgroundImage:`radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`, backgroundSize:"32px 32px" }}/>

      {/* Left branding panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-start", padding:"60px 80px", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:60 }}>
          <div style={{ width:48, height:48, borderRadius:10, background:T.teal, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Package size={24} color="#fff"/>
          </div>
          <span style={{ color:"#F0EDE8", fontWeight:800, fontSize:22, letterSpacing:"-0.5px" }}>InvenPro</span>
        </div>

        <h1 style={{ margin:"0 0 16px", fontSize:42, fontWeight:800, color:"#F0EDE8", letterSpacing:"-1px", lineHeight:1.15, maxWidth:420 }}>
          Your complete<br/>
          <span style={{ color:T.teal }}>business ERP</span><br/>
          in one place.
        </h1>
        <p style={{ margin:"0 0 60px", fontSize:16, color:"#78716c", lineHeight:1.7, maxWidth:360 }}>
          Inventory · Orders · Manufacturing · Transfers ·
          Quality Control · Analytics · AI Assistant
        </p>

        <div style={{ display:"flex", gap:40 }}>
          {[["22+","Modules"],["Real-time","Stock sync"],["bcrypt","Password hash"],["JWT+Refresh","Token rotation"],["RBAC","Role access"]].map(([val,lbl])=>(
            <div key={lbl}>
              <div style={{ fontSize:18, fontWeight:800, color:T.teal, fontFamily:MONO, letterSpacing:"-0.5px" }}>{val}</div>
              <div style={{ fontSize:11, color:"#57534e", marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Security badges */}
        <div style={{ marginTop:48, display:"flex", gap:12 }}>
          {[["🔐","bcrypt Password Hashing"],["🔑","JWT + Refresh Tokens"],["🛡","Role-Based Access Control"],["⚡","Rate Limited API"]].map(([icon,label])=>(
            <div key={label} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:"#1E2D3D", borderRadius:5, border:"1px solid #2A3D52" }}>
              <span style={{ fontSize:12 }}>{icon}</span>
              <span style={{ fontSize:11, color:"#9A9490" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ width:500, background:T.pageBg, display:"flex", flexDirection:"column", justifyContent:"center", padding:"48px", position:"relative", zIndex:1, overflowY:"auto" }}>
        {view==="login"   && <LoginForm   onLogin={onLogin} switchTo={setView}/>}
        {view==="register"&& <RegisterForm onLogin={onLogin} switchTo={setView}/>}
        {view==="forgot"  && <ForgotForm  switchTo={setView}/>}
        {view==="reset"   && <ResetForm   switchTo={setView}/>}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── LOGIN FORM ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin, switchTo }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [errs,     setErrs]     = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim())                    e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = "Enter a valid email";
    if (!password)                         e.password = "Password is required";
    else if (password.length < 6)          e.password = "At least 6 characters";
    setErrs(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await authAPI.login(email.trim().toLowerCase(), password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const m = { admin:"admin@invenpro.in", manager:"ravi@invenpro.in", staff:"priya@invenpro.in" };
    setEmail(m[role]); setPassword("Admin@123"); setError(""); setErrs({});
  };

  return (
    <>
      <div style={{ marginBottom:32 }}>
        <h2 style={{ margin:"0 0 6px", fontSize:24, fontWeight:700, color:T.t1, letterSpacing:"-0.4px" }}>Sign in to InvenPro</h2>
        <p style={{ margin:0, fontSize:13, color:T.t3 }}>Enter your credentials to access your dashboard</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={submit} noValidate>
        <Field label="Email Address" error={errs.email} icon={Mail}>
          <TextInput value={email} onChange={e=>{setEmail(e.target.value);setErrs(p=>({...p,email:""}))}}
            type="email" placeholder="you@company.com" autoFocus autoComplete="email"
            icon={<Mail size={14} color={T.t3}/>} error={errs.email}/>
        </Field>
        <Field label="Password" error={errs.password}>
          <TextInput value={password} onChange={e=>{setPassword(e.target.value);setErrs(p=>({...p,password:""}))}}
            type={showPw?"text":"password"} placeholder="Enter your password" autoComplete="current-password"
            icon={<Lock size={14} color={T.t3}/>} error={errs.password}
            rightEl={
              <button type="button" onClick={()=>setShowPw(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, display:"flex" }}>
                {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            }/>
        </Field>

        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20, marginTop:-8 }}>
          <button type="button" onClick={()=>switchTo("forgot")}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:T.teal, fontFamily:SANS }}>
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", background:loading?T.tealM:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading?<><Loader size={16} style={{ animation:"spin 1s linear infinite" }}/>Signing in…</>:"Sign In →"}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display:"flex", alignItems:"center", gap:12, margin:"24px 0" }}>
        <div style={{ flex:1, height:1, background:T.bdr }}/>
        <span style={{ fontSize:11, color:T.t3, fontFamily:SANS }}>or</span>
        <div style={{ flex:1, height:1, background:T.bdr }}/>
      </div>

      {/* Register CTA */}
      <button onClick={()=>switchTo("register")} style={{ width:"100%", padding:"13px", background:T.surfBg, border:`1.5px solid ${T.bdr}`, borderRadius:6, color:T.t1, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:SANS }}>
        Create new account →
      </button>

      {/* Demo accounts */}
      <div style={{ marginTop:24, padding:"14px 16px", background:T.surfBg, border:`1px solid ${T.bdr}`, borderRadius:6 }}>
        <div style={{ fontSize:10.5, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Demo Accounts — click to fill</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {[{role:"admin",label:"Admin",email:"admin@invenpro.in",badge:T.red,badgeBg:T.redL},{role:"manager",label:"Manager",email:"ravi@invenpro.in",badge:T.amber,badgeBg:T.amberL},{role:"staff",label:"Staff",email:"priya@invenpro.in",badge:T.teal,badgeBg:T.tealL}].map(item=>(
            <button key={item.role} type="button" onClick={()=>fillDemo(item.role)}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 10px", background:T.pageBg, border:`1px solid ${T.bdr}`, borderRadius:4, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.teal}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.bdr}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:10, padding:"2px 7px", borderRadius:3, fontWeight:700, background:item.badgeBg, color:item.badge }}>{item.label}</span>
                <span style={{ fontSize:12, color:T.t3, fontFamily:MONO }}>{item.email}</span>
              </div>
              <span style={{ fontSize:11, color:T.teal }}>Fill →</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop:8, fontSize:11, color:T.t3, textAlign:"center" }}>
          All demo passwords: <span style={{ fontFamily:MONO, color:T.t1, fontWeight:600 }}>Admin@123</span>
        </div>
      </div>

      <div style={{ marginTop:24, fontSize:11, color:T.t3, textAlign:"center", lineHeight:1.6 }}>
        InvenPro ERP · React + Node.js + PostgreSQL<br/>
        <span style={{ color:T.teal }}>🔐 bcrypt · JWT · RBAC · Rate Limited</span>
      </div>
    </>
  );
}

// ─── REGISTER FORM ────────────────────────────────────────────────────────────
function RegisterForm({ onLogin, switchTo }) {
  const [form, setForm]   = useState({ name:"", email:"", password:"", confirm:"", role:"staff", warehouse:"WH/Main", company:"" });
  const [showPw,  setShowPw]  = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);
  const [errs,    setErrs]    = useState({});

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setErrs(p=>({...p,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                       e.name     = "Full name is required";
    if (!form.email.trim())                      e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))  e.email    = "Enter a valid email";
    if (!form.password)                          e.password = "Password is required";
    else if (form.password.length < 8)           e.password = "Minimum 8 characters";
    else if (!/[A-Z]/.test(form.password))       e.password = "Must contain uppercase letter";
    else if (!/[0-9]/.test(form.password))       e.password = "Must contain a number";
    if (form.password !== form.confirm)          e.confirm  = "Passwords do not match";
    setErrs(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.register({
        name:      form.name.trim(),
        email:     form.email.trim().toLowerCase(),
        password:  form.password,
        role:      form.role,
        warehouse: form.warehouse,
        company:   form.company,
      });
      setSuccess(true);
      // Auto login after 2 seconds
      setTimeout(async () => {
        try {
          const data = await authAPI.login(form.email.trim().toLowerCase(), form.password);
          onLogin(data.user);
        } catch {}
      }, 2000);
    } catch (err) {
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:T.greenL, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <CheckCircle size={32} color={T.green}/>
        </div>
        <h2 style={{ fontSize:22, fontWeight:700, color:T.t1, marginBottom:8 }}>Account Created!</h2>
        <p style={{ fontSize:13, color:T.t3, marginBottom:16 }}>Welcome to InvenPro, {form.name.split(" ")[0]}!</p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, color:T.teal, fontSize:13 }}>
          <Loader size={16} style={{ animation:"spin 1s linear infinite" }}/> Signing you in…
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
        <button onClick={()=>switchTo("login")} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, display:"flex", padding:0 }}>
          <ArrowLeft size={18}/>
        </button>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:T.t1, letterSpacing:"-0.4px" }}>Create Account</h2>
          <p style={{ margin:0, fontSize:13, color:T.t3 }}>Join InvenPro — free to get started</p>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Alert type="info">
        New accounts are created with <strong>{form.role}</strong> role. An admin can upgrade your access after registration.
      </Alert>

      <form onSubmit={submit} noValidate>
        {/* Name + Company */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Full Name" error={errs.name}>
            <TextInput value={form.name} onChange={e=>set("name",e.target.value)}
              placeholder="Ravi Kumar" autoFocus
              icon={<User size={14} color={T.t3}/>} error={errs.name}/>
          </Field>
          <Field label="Company (optional)">
            <TextInput value={form.company} onChange={e=>set("company",e.target.value)}
              placeholder="Acme Corp"
              icon={<Building size={14} color={T.t3}/>}/>
          </Field>
        </div>

        {/* Email */}
        <Field label="Email Address" error={errs.email}>
          <TextInput value={form.email} onChange={e=>set("email",e.target.value)}
            type="email" placeholder="you@company.com" autoComplete="email"
            icon={<Mail size={14} color={T.t3}/>} error={errs.email}/>
        </Field>

        {/* Password */}
        <Field label="Password" error={errs.password}>
          <TextInput value={form.password} onChange={e=>set("password",e.target.value)}
            type={showPw?"text":"password"} placeholder="Create a strong password"
            icon={<Lock size={14} color={T.t3}/>} error={errs.password}
            rightEl={<button type="button" onClick={()=>setShowPw(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, display:"flex" }}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>}/>
          <PasswordStrength password={form.password}/>
        </Field>

        {/* Confirm password */}
        <Field label="Confirm Password" error={errs.confirm}>
          <TextInput value={form.confirm} onChange={e=>set("confirm",e.target.value)}
            type={showCon?"text":"password"} placeholder="Repeat your password"
            icon={<Lock size={14} color={T.t3}/>} error={errs.confirm}
            rightEl={<button type="button" onClick={()=>setShowCon(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, display:"flex" }}>{showCon?<EyeOff size={16}/>:<Eye size={16}/>}</button>}/>
        </Field>

        {/* Role + Warehouse */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Role</div>
            <select value={form.role} onChange={e=>set("role",e.target.value)}
              style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:6, fontSize:13.5, fontFamily:SANS, color:T.t1, background:T.surfBg, outline:"none" }}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
            </select>
            <div style={{ fontSize:10.5, color:T.t3, marginTop:4 }}>Admin can upgrade later</div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
              <Warehouse size={12}/> Warehouse
            </div>
            <select value={form.warehouse} onChange={e=>set("warehouse",e.target.value)}
              style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:6, fontSize:13.5, fontFamily:SANS, color:T.t1, background:T.surfBg, outline:"none" }}>
              {["WH/Main","WH/North","WH/South","WH/Export","All"].map(w=><option key={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {/* Terms */}
        <div style={{ margin:"16px 0", display:"flex", alignItems:"flex-start", gap:10 }}>
          <input type="checkbox" required style={{ marginTop:2, flexShrink:0 }}/>
          <span style={{ fontSize:12, color:T.t2, lineHeight:1.5 }}>
            I agree to the <span style={{ color:T.teal, cursor:"pointer" }}>Terms of Service</span> and <span style={{ color:T.teal, cursor:"pointer" }}>Privacy Policy</span>. My password will be hashed with bcrypt before storage.
          </span>
        </div>

        <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", background:loading?T.tealM:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading?<><Loader size={16} style={{ animation:"spin 1s linear infinite" }}/>Creating account…</>:"Create Account →"}
        </button>
      </form>

      <div style={{ marginTop:20, textAlign:"center", fontSize:13, color:T.t3 }}>
        Already have an account?{" "}
        <button onClick={()=>switchTo("login")} style={{ background:"none", border:"none", cursor:"pointer", color:T.teal, fontWeight:600, fontSize:13, fontFamily:SANS }}>Sign in</button>
      </div>
    </>
  );
}

// ─── FORGOT PASSWORD FORM ─────────────────────────────────────────────────────
function ForgotForm({ switchTo }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const submit = async (ev) => {
    ev.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
        <button onClick={()=>switchTo("login")} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, display:"flex", padding:0 }}>
          <ArrowLeft size={18}/>
        </button>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:T.t1, letterSpacing:"-0.4px" }}>Reset Password</h2>
          <p style={{ margin:0, fontSize:13, color:T.t3 }}>We'll send a reset link to your email</p>
        </div>
      </div>

      {sent ? (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:T.tealL, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
            <Mail size={28} color={T.teal}/>
          </div>
          <h3 style={{ fontSize:18, fontWeight:700, color:T.t1, marginBottom:8 }}>Check your inbox</h3>
          <p style={{ fontSize:13, color:T.t3, lineHeight:1.7, marginBottom:24 }}>
            If <strong style={{ color:T.t1 }}>{email}</strong> is registered, you'll receive a password reset link within 2 minutes.
          </p>
          <div style={{ padding:"12px 16px", background:T.tealL, borderRadius:6, border:`1px solid ${T.tealM}`, fontSize:12, color:T.teal, marginBottom:24 }}>
            💡 Check your spam folder if you don't see it. The link expires in 1 hour.
          </div>
          <button onClick={()=>switchTo("login")} style={{ background:"none", border:"none", cursor:"pointer", color:T.teal, fontWeight:600, fontSize:13, fontFamily:SANS }}>
            ← Back to sign in
          </button>
        </div>
      ) : (
        <>
          {error && <Alert type="error">{error}</Alert>}
          <Alert type="info">Enter the email address associated with your account. We'll email you a secure link to reset your password.</Alert>
          <form onSubmit={submit} noValidate>
            <Field label="Email Address">
              <TextInput value={email} onChange={e=>setEmail(e.target.value)}
                type="email" placeholder="you@company.com" autoFocus
                icon={<Mail size={14} color={T.t3}/>}/>
            </Field>
            <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", background:loading?T.tealM:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading?<><Loader size={16} style={{ animation:"spin 1s linear infinite" }}/>Sending…</>:"Send Reset Link →"}
            </button>
          </form>
          <div style={{ marginTop:20, textAlign:"center" }}>
            <button onClick={()=>switchTo("login")} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, fontSize:12, fontFamily:SANS }}>
              ← Back to sign in
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ─── RESET PASSWORD FORM (used when user clicks email link) ───────────────────
// In a real app, the token comes from the URL ?token=xxx
// For now this is the UI — backend handles verification
function ResetForm({ switchTo }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const submit = async (ev) => {
    ev.preventDefault();
    if (password.length < 8)      { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)     { setError("Passwords do not match."); return; }
    if (!token)                    { setError("Invalid reset link. Please request a new one."); return; }
    setLoading(true); setError("");
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:T.greenL, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <CheckCircle size={32} color={T.green}/>
        </div>
        <h3 style={{ fontSize:20, fontWeight:700, color:T.t1, marginBottom:8 }}>Password Updated!</h3>
        <p style={{ fontSize:13, color:T.t3, marginBottom:24 }}>Your password has been reset successfully.</p>
        <button onClick={()=>switchTo("login")} style={{ padding:"11px 28px", background:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:SANS }}>
          Sign In →
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom:28 }}>
        <h2 style={{ margin:"0 0 6px", fontSize:22, fontWeight:700, color:T.t1, letterSpacing:"-0.4px" }}>Set New Password</h2>
        <p style={{ margin:0, fontSize:13, color:T.t3 }}>Choose a strong password for your account</p>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {!token && <Alert type="error">No reset token found. Please use the link from your email.</Alert>}
      <form onSubmit={submit} noValidate>
        <Field label="New Password">
          <TextInput value={password} onChange={e=>setPassword(e.target.value)}
            type={showPw?"text":"password"} placeholder="New strong password" autoFocus
            icon={<Lock size={14} color={T.t3}/>}
            rightEl={<button type="button" onClick={()=>setShowPw(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, display:"flex" }}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>}/>
          <PasswordStrength password={password}/>
        </Field>
        <Field label="Confirm New Password">
          <TextInput value={confirm} onChange={e=>setConfirm(e.target.value)}
            type="password" placeholder="Repeat new password"
            icon={<Lock size={14} color={T.t3}/>}/>
        </Field>
        <button type="submit" disabled={loading||!token} style={{ width:"100%", padding:"13px", background:loading||!token?T.tealM:T.teal, border:"none", borderRadius:6, color:"#fff", fontSize:14, fontWeight:700, cursor:loading||!token?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading?<><Loader size={16} style={{ animation:"spin 1s linear infinite" }}/>Updating…</>:"Update Password →"}
        </button>
      </form>
      <div style={{ marginTop:20, textAlign:"center" }}>
        <button onClick={()=>switchTo("forgot")} style={{ background:"none", border:"none", cursor:"pointer", color:T.t3, fontSize:12, fontFamily:SANS }}>
          Request a new reset link
        </button>
      </div>
    </>
  );
}

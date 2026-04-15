// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
export const T = {
  pageBg:"#F7F5F1", surfBg:"#FFFFFF", surfAlt:"#F2EFE9",
  sideNav:"#14202E", sideNavB:"#1E2D3D",
  teal:"#0D7377", tealL:"#E8F5F5", tealM:"#A8D5D6",
  amber:"#C8873A", amberL:"#FDF3E7", amberB:"#F0C896",
  green:"#2D7D46", greenL:"#EAF5EE", greenB:"#9ED4B0",
  red:"#C0392B",   redL:"#FCECEA",   redB:"#F0A8A1",
  blue:"#2563A8",  blueL:"#EAF0FA",  blueB:"#9BBDE8",
  purple:"#6D28D9",purpleL:"#F5F3FF",purpleB:"#C4B5FD",
  t1:"#1A1A18", t2:"#4A4845", t3:"#9A9490", t4:"#6E6A66",
  bdr:"#E2DDD6", bdr2:"#EDE9E3",
};
export const MONO = "'DM Mono','Courier New',monospace";
export const SANS = "'Outfit','Trebuchet MS',sans-serif";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const fmtINR = v => "₹" + Number(v).toLocaleString("en-IN");
export const fmtK   = v => v >= 100000 ? "₹"+(v/100000).toFixed(1)+"L" : "₹"+(v/1000).toFixed(0)+"k";
export const uid    = () => Math.random().toString(36).slice(2,9).toUpperCase();
export const today  = () => new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

// ─── STATUS / PRIORITY MAPS ───────────────────────────────────────────────────
import { CheckCircle2, Clock, XCircle, Activity, AlertTriangle } from "lucide-react";
export const SC = {
  done:        { label:"Done",        Icon:CheckCircle2, bg:T.greenL,  fg:T.green,  br:T.greenB },
  pending:     { label:"Pending",     Icon:Clock,        bg:T.amberL,  fg:T.amber,  br:T.amberB },
  cancel:      { label:"Cancelled",   Icon:XCircle,      bg:T.redL,    fg:T.red,    br:T.redB   },
  in_progress: { label:"In Progress", Icon:Activity,     bg:T.blueL,   fg:T.blue,   br:T.blueB  },
  planned:     { label:"Planned",     Icon:Clock,        bg:T.amberL,  fg:T.amber,  br:T.amberB },
  active:      { label:"Active",      Icon:CheckCircle2, bg:T.greenL,  fg:T.green,  br:T.greenB },
  ok:          { label:"OK",          Icon:CheckCircle2, bg:T.greenL,  fg:T.green,  br:T.greenB },
  low:         { label:"Low",         Icon:AlertTriangle,bg:T.amberL,  fg:T.amber,  br:T.amberB },
  critical:    { label:"Critical",    Icon:XCircle,      bg:T.redL,    fg:T.red,    br:T.redB   },
  transferred: { label:"Transferred", Icon:CheckCircle2, bg:T.blueL,   fg:T.blue,   br:T.blueB  },
  verified:    { label:"Verified",    Icon:CheckCircle2, bg:T.purpleL, fg:T.purple, br:T.purpleB},
};
export const PRI = {
  urgent:{ fg:"#8B1A1A", bg:"#FCECEA", label:"Urgent" },
  high:  { fg:T.amber,   bg:T.amberL,  label:"High"   },
  normal:{ fg:T.t4,      bg:T.surfAlt, label:"Normal" },
  low:   { fg:T.t3,      bg:T.surfAlt, label:"Low"    },
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
export const WAREHOUSES = ["WH/Main","WH/North","WH/South","WH/Export"];
export const LOCATIONS  = ["WH/Main/Shelf-A","WH/Main/Shelf-B","WH/North/Rack-1","WH/South/Floor","WH/Export/Gate"];

export const initProducts = [
  { id:1,  code:"FCH-001", name:"Corner Desk",       category:"Furniture",   onHand:4,  reserved:1, available:3,  cost:8200,  price:12000, reorder:5,  max:20,  unit:"pcs", location:"WH/Main",       warehouse:"WH/Main",  route:"Buy",         status:"low",      batches:[{id:"B2024-01",qty:4,exp:"Dec 2026",serial:"SN-CD-001"}], valuation:"FIFO" },
  { id:2,  code:"FCH-002", name:"Large Desk",        category:"Furniture",   onHand:1,  reserved:1, available:0,  cost:11000, price:16000, reorder:3,  max:15,  unit:"pcs", location:"WH/Main",       warehouse:"WH/Main",  route:"Buy",         status:"critical", batches:[{id:"B2024-02",qty:1,exp:"Dec 2026",serial:"SN-LD-001"}], valuation:"FIFO" },
  { id:3,  code:"FCH-003", name:"Flipover Board",    category:"Furniture",   onHand:5,  reserved:2, available:3,  cost:3200,  price:5000,  reorder:4,  max:20,  unit:"pcs", location:"WH/North",      warehouse:"WH/North", route:"Manufacture", status:"critical", batches:[{id:"B2024-03",qty:5,exp:"Jun 2027",serial:"SN-FB-001"}], valuation:"LIFO" },
  { id:4,  code:"FCH-004", name:"Office Chair",      category:"Furniture",   onHand:14, reserved:3, available:11, cost:9500,  price:14000, reorder:5,  max:30,  unit:"pcs", location:"WH/Main",       warehouse:"WH/Main",  route:"Buy",         status:"ok",       batches:[{id:"B2024-04",qty:14,exp:"Mar 2028",serial:"SN-OC-001"}],valuation:"FIFO" },
  { id:5,  code:"ELC-001", name:"USB-C Hub",         category:"Electronics", onHand:32, reserved:5, available:27, cost:1200,  price:2200,  reorder:10, max:60,  unit:"pcs", location:"WH/Main",       warehouse:"WH/Main",  route:"Buy",         status:"ok",       batches:[{id:"B2024-05",qty:32,exp:"Jan 2027",serial:"SN-UH-001"}], valuation:"FIFO" },
  { id:6,  code:"ELC-002", name:"Wireless Mouse",    category:"Electronics", onHand:3,  reserved:2, available:1,  cost:800,   price:1400,  reorder:8,  max:40,  unit:"pcs", location:"WH/South",      warehouse:"WH/South", route:"Buy",         status:"critical", batches:[{id:"B2024-06",qty:3,exp:"Sep 2026",serial:"SN-WM-001"}],  valuation:"FIFO" },
  { id:7,  code:"STN-001", name:"Notebook A5",       category:"Stationery",  onHand:80, reserved:10,available:70, cost:120,   price:250,   reorder:20, max:200, unit:"pcs", location:"WH/Main",       warehouse:"WH/Main",  route:"Buy",         status:"ok",       batches:[{id:"B2024-07",qty:80,exp:"Dec 2027",serial:null}],         valuation:"FIFO" },
  { id:8,  code:"STN-002", name:"Whiteboard Marker", category:"Stationery",  onHand:7,  reserved:0, available:7,  cost:50,    price:120,   reorder:15, max:100, unit:"box", location:"WH/Main",       warehouse:"WH/Main",  route:"Buy",         status:"low",      batches:[{id:"B2024-08",qty:7,exp:"Aug 2026",serial:null}],          valuation:"FIFO" },
  { id:9,  code:"ELC-003", name:"Smart Speaker",     category:"Electronics", onHand:18, reserved:4, available:14, cost:3500,  price:5500,  reorder:6,  max:40,  unit:"pcs", location:"WH/Export",     warehouse:"WH/Export",route:"Buy",         status:"ok",       batches:[{id:"B2024-09",qty:18,exp:"Feb 2027",serial:"SN-SS-001"}],  valuation:"FIFO" },
  { id:10, code:"FCH-005", name:"Standing Desk",     category:"Furniture",   onHand:2,  reserved:0, available:2,  cost:18000, price:26000, reorder:3,  max:12,  unit:"pcs", location:"WH/North",      warehouse:"WH/North", route:"Buy",         status:"low",      batches:[{id:"B2024-10",qty:2,exp:"Dec 2028",serial:"SN-SD-001"}],   valuation:"FIFO" },
];

export const initVendors = [
  { id:1, name:"Supplier Alpha",  contact:"Rajesh Mehta",   email:"rajesh@alpha.in",   phone:"98001-11111", category:"Furniture",   rating:4.5, onTime:92, totalOrders:34, outstanding:55000  },
  { id:2, name:"Supplier Beta",   contact:"Priya Sharma",   email:"priya@beta.in",     phone:"98002-22222", category:"Electronics", rating:4.8, onTime:97, totalOrders:58, outstanding:16000  },
  { id:3, name:"Supplier Gamma",  contact:"Anil Kumar",     email:"anil@gamma.in",     phone:"98003-33333", category:"Furniture",   rating:4.1, onTime:85, totalOrders:21, outstanding:95000  },
  { id:4, name:"QuickParts Co",   contact:"Sunita Rao",     email:"sunita@qp.in",      phone:"98004-44444", category:"Stationery",  rating:4.6, onTime:94, totalOrders:47, outstanding:8200   },
  { id:5, name:"TechSource Ltd",  contact:"Deepak Nair",    email:"deepak@tech.in",    phone:"98005-55555", category:"Electronics", rating:4.3, onTime:88, totalOrders:29, outstanding:42000  },
];

export const initOrders = [
  { id:"SO-1042", type:"sale",     customer:"Agrolait",        product:"Corner Desk",    qty:2, total:24000, status:"done",    date:"01 Apr", priority:"normal", invoice:"INV-042", payment:"paid",    delivery:"DLV-042" },
  { id:"SO-1043", type:"sale",     customer:"Deco Addict",     product:"Office Chair",   qty:5, total:70000, status:"pending", date:"01 Apr", priority:"high",   invoice:"INV-043", payment:"pending", delivery:"DLV-043" },
  { id:"SO-1044", type:"sale",     customer:"Ready Mat",       product:"Large Desk",     qty:1, total:16000, status:"done",    date:"31 Mar", priority:"normal", invoice:"INV-044", payment:"paid",    delivery:"DLV-044" },
  { id:"SO-1045", type:"sale",     customer:"Jackson Group",   product:"USB-C Hub",      qty:10,total:22000, status:"pending", date:"31 Mar", priority:"urgent", invoice:"INV-045", payment:"pending", delivery:"DLV-045" },
  { id:"SO-1046", type:"sale",     customer:"Lumber Inc",      product:"Flipover Board", qty:3, total:15000, status:"cancel",  date:"30 Mar", priority:"low",    invoice:null,      payment:"none",    delivery:null      },
  { id:"PO-0201", type:"purchase", customer:"Supplier Alpha",  product:"Large Desk",     qty:5, total:55000, status:"pending", date:"02 Apr", priority:"high",   invoice:"PINV-01", payment:"pending", delivery:"PDLV-01" },
  { id:"PO-0202", type:"purchase", customer:"Supplier Beta",   product:"Wireless Mouse", qty:20,total:16000, status:"done",    date:"01 Apr", priority:"normal", invoice:"PINV-02", payment:"paid",    delivery:"PDLV-02" },
  { id:"PO-0203", type:"purchase", customer:"Supplier Gamma",  product:"Office Chair",   qty:10,total:95000, status:"pending", date:"29 Mar", priority:"high",   invoice:"PINV-03", payment:"pending", delivery:"PDLV-03" },
];

export const initTransfers = [
  { id:"TRF-001", from:"WH/Main",  to:"WH/North", product:"Corner Desk",  qty:2, status:"done",    date:"28 Mar", nft:"0xA3F...7c2E", verified:true  },
  { id:"TRF-002", from:"WH/South", to:"WH/Main",  product:"USB-C Hub",    qty:10,status:"pending", date:"01 Apr", nft:null,           verified:false },
  { id:"TRF-003", from:"WH/North", to:"WH/Export",product:"Office Chair", qty:3, status:"done",    date:"02 Apr", nft:"0xB9D...1a4F", verified:true  },
];

export const initBOMs = [
  { id:1, product:"Flipover Board", code:"FCH-003", qty:10, cost:28000, status:"active", waste:2.5,
    materials:[
      { name:"Steel Frame",      qty:10, unit:"pcs", cost:800,  onHand:25 },
      { name:"Whiteboard Sheet", qty:10, unit:"pcs", cost:1200, onHand:18 },
      { name:"Plastic Clips",    qty:40, unit:"pcs", cost:80,   onHand:200},
      { name:"Rubber Feet",      qty:40, unit:"pcs", cost:50,   onHand:180},
    ]},
  { id:2, product:"Corner Desk", code:"FCH-001", qty:5, cost:38000, status:"active", waste:1.8,
    materials:[
      { name:"Wooden Board",  qty:15, unit:"pcs", cost:1500, onHand:40 },
      { name:"Metal Legs",    qty:20, unit:"pcs", cost:600,  onHand:60 },
      { name:"Screws Set",    qty:10, unit:"box", cost:200,  onHand:30 },
      { name:"Lacquer",       qty:5,  unit:"ltr", cost:400,  onHand:12 },
    ]},
];

export const initWorkOrders = [
  { id:"WO-001", product:"Flipover Board", code:"FCH-003", qty:10, status:"in_progress", start:"01 Apr", end:"05 Apr", progress:65, worker:"Ravi K.",  efficiency:87, waste:0.8 },
  { id:"WO-002", product:"Corner Desk",    code:"FCH-001", qty:5,  status:"planned",     start:"06 Apr", end:"10 Apr", progress:0,  worker:"Priya S.", efficiency:0,  waste:0   },
  { id:"WO-003", product:"Flipover Board", code:"FCH-003", qty:8,  status:"done",        start:"20 Mar", end:"28 Mar", progress:100,worker:"Ravi K.",  efficiency:91, waste:0.6 },
];

export const initUsers = [
  { id:1, name:"Admin User",   email:"admin@invenpro.in",   role:"admin",   warehouse:"All",       status:"active", lastLogin:"Today 9:14 AM"    },
  { id:2, name:"Ravi Kumar",   email:"ravi@invenpro.in",    role:"manager", warehouse:"WH/Main",   status:"active", lastLogin:"Today 8:52 AM"    },
  { id:3, name:"Priya Sharma", email:"priya@invenpro.in",   role:"staff",   warehouse:"WH/North",  status:"active", lastLogin:"Yesterday 6:30 PM"},
  { id:4, name:"Anil Gupta",   email:"anil@invenpro.in",    role:"staff",   warehouse:"WH/South",  status:"inactive",lastLogin:"3 Apr"           },
  { id:5, name:"Sunita Rao",   email:"sunita@invenpro.in",  role:"viewer",  warehouse:"WH/Export", status:"active", lastLogin:"Today 10:05 AM"   },
];

export const revData = [
  { month:"Jan", revenue:820,  cost:560,  profit:260 },
  { month:"Feb", revenue:950,  cost:640,  profit:310 },
  { month:"Mar", revenue:1100, cost:720,  profit:380 },
  { month:"Apr", revenue:1245, cost:810,  profit:435 },
  { month:"May", revenue:1080, cost:700,  profit:380 },
  { month:"Jun", revenue:1310, cost:850,  profit:460 },
];

export const weatherData = {
  city:"Mumbai", condition:"Heavy Rain", temp:24,
  forecast:[
    { day:"Today",    icon:"🌧",  rain:92, condition:"Heavy Rain"   },
    { day:"Tomorrow", icon:"🌧",  rain:88, condition:"Heavy Rain"   },
    { day:"Wed",      icon:"⛈",  rain:95, condition:"Thunderstorm" },
    { day:"Thu",      icon:"🌦",  rain:60, condition:"Light Rain"   },
    { day:"Fri",      icon:"🌤",  rain:20, condition:"Partly Cloudy"},
  ],
  alerts:[
    { sku:"ELC-003", name:"Smart Speaker",  reason:"Rain forecast 5 days — indoor sales spike expected", action:"Increase stock by 20 units", urgency:"high"   },
    { sku:"FCH-005", name:"Standing Desk",  reason:"WFH demand rises during monsoon season",             action:"Reorder 8 units from Supplier Alpha", urgency:"medium" },
    { sku:"STN-001", name:"Notebook A5",    reason:"School reopening delayed — reduce procurement",      action:"Hold reorder for 2 weeks",   urgency:"low"    },
  ],
};

export const blockchainLog = [
  { hash:"0xA3F9c2E1b7D4...7c2E", product:"Corner Desk",  serial:"SN-CD-001", event:"Transfer WH/Main→WH/North", ts:"28 Mar 14:32", verified:true  },
  { hash:"0xB9D1a4F3c8E2...1a4F", product:"Office Chair", serial:"SN-OC-001", event:"Transfer WH/North→WH/Export",ts:"02 Apr 09:15", verified:true  },
  { hash:"0xC2E8b1D5a3F9...8b1D", product:"USB-C Hub",    serial:"SN-UH-001", event:"Sale SO-1044",               ts:"31 Mar 11:20", verified:true  },
];

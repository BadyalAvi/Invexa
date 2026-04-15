import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp,
  AlertTriangle, Bell, Search, Menu, X, ChevronUp, ChevronDown
} from "lucide-react";

const salesData = [
  { month: "Jan", sales: 82000, purchases: 60000 },
  { month: "Feb", sales: 95000, purchases: 72000 },
  { month: "Mar", sales: 110000, purchases: 88000 },
  { month: "Apr", sales: 124500, purchases: 95000 },
  { month: "May", sales: 108000, purchases: 84000 },
  { month: "Jun", sales: 131000, purchases: 102000 },
];

const categoryData = [
  { name: "Electronics", value: 40 },
  { name: "Clothing",    value: 25 },
  { name: "Food",        value: 20 },
  { name: "Other",       value: 15 },
];

const COLORS = ["#378ADD", "#1D9E75", "#BA7517", "#D4537E"];

const recentOrders = [
  { id: "#1042", product: "Blue T-Shirt",  qty: 12, status: "Delivered" },
  { id: "#1043", product: "Phone Case",    qty: 5,  status: "Pending"   },
  { id: "#1044", product: "Rice 5kg",      qty: 50, status: "Delivered" },
  { id: "#1045", product: "Headphones",    qty: 3,  status: "Pending"   },
  { id: "#1046", product: "Jeans (M)",     qty: 8,  status: "Cancelled" },
];

const lowStockItems = [
  { product: "USB Cable",   category: "Electronics", stock: 4,  status: "Critical" },
  { product: "Black Socks", category: "Clothing",    stock: 7,  status: "Low"      },
  { product: "Olive Oil",   category: "Food",        stock: 9,  status: "Low"      },
  { product: "Earphones",   category: "Electronics", stock: 3,  status: "Critical" },
  { product: "Notebook A5", category: "Stationery",  stock: 11, status: "Low"      },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Package,         label: "Products"  },
  { icon: ShoppingCart,    label: "Orders"    },
  { icon: TrendingUp,      label: "Analytics" },
  { icon: AlertTriangle,   label: "Alerts"    },
];

const statusStyle = {
  Delivered: "bg-green-100 text-green-800",
  Pending:   "bg-amber-100 text-amber-800",
  Cancelled: "bg-red-100   text-red-800",
  Critical:  "bg-red-100   text-red-800",
  Low:       "bg-amber-100 text-amber-800",
};

const formatINR = (v) => "₹" + (v / 1000).toFixed(0) + "k";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage]   = useState("Dashboard");

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Sidebar ── */}
      <aside
        className={`${sidebarOpen ? "w-56" : "w-16"} transition-all duration-300
          flex flex-col bg-slate-900 text-white shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Package size={16} />
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm tracking-wide">InvenPro</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setActivePage(label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                transition-colors duration-150
                ${activePage === label
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center py-4 border-t border-slate-700
            text-slate-400 hover:text-white transition-colors"
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4
          bg-white border-b border-gray-200 shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">April 2026 — live overview</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                placeholder="Search…"
                className="bg-transparent text-sm outline-none text-gray-700 w-40
                  placeholder-gray-400"
              />
            </div>
            {/* Bell */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
              <Bell size={18} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
            </button>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center
              justify-center text-white text-xs font-semibold">
              A
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total inventory value", value: "₹4,82,300", change: "+8.2%",  up: true  },
              { label: "Sales this month",       value: "₹1,24,500", change: "+12.4%", up: true  },
              { label: "Pending orders",         value: "38",        change: "+3",     up: false },
              { label: "Low stock alerts",       value: "6",         change: "Urgent", up: false },
            ].map(({ label, value, change, up }) => (
              <div key={label}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm
                  transition-shadow">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
                <div className={`flex items-center gap-1 mt-1 text-xs font-medium
                  ${up ? "text-green-700" : "text-red-600"}`}>
                  {up ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                  {change}
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900">Monthly sales &amp; purchases</p>
              <p className="text-xs text-gray-400 mb-4">Jan – Jun 2026</p>
              <div className="flex gap-4 mb-3">
                {[["#378ADD","Sales"],["#1D9E75","Purchases"]].map(([c,l])=>(
                  <span key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:c}}/>
                    {l}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={formatINR} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v) => "₹" + v.toLocaleString()} />
                  <Bar dataKey="sales"     fill="#378ADD" radius={[4,4,0,0]}/>
                  <Bar dataKey="purchases" fill="#1D9E75" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900">Inventory by category</p>
              <p className="text-xs text-gray-400 mb-4">Current stock split</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50}
                    outerRadius={80} dataKey="value" paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => v + "%"} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <span className="w-2 h-2 rounded-sm inline-block"
                        style={{background: COLORS[i]}}/>
                      {d.name}
                    </span>
                    <span className="font-medium text-gray-700">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Recent orders</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    {["Order ID","Product","Qty","Status"].map(h=>(
                      <th key={h} className="text-left pb-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-indigo-600 font-medium">{o.id}</td>
                      <td className="py-2.5 text-gray-700">{o.product}</td>
                      <td className="py-2.5 text-gray-500">{o.qty}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${statusStyle[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Low Stock */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Low stock alerts</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    {["Product","Category","Stock","Status"].map(h=>(
                      <th key={h} className="text-left pb-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map(item => (
                    <tr key={item.product} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-gray-700 font-medium">{item.product}</td>
                      <td className="py-2.5 text-gray-400">{item.category}</td>
                      <td className="py-2.5 text-gray-700">{item.stock}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${statusStyle[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

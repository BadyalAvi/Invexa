import { useState, useEffect, useCallback } from "react";
import { useProducts } from "./useProducts.js";
import { useOrders }   from "./useOrders.js";
import {
  transfersAPI, vendorsAPI, reportsAPI,
  productsAPI, ordersAPI,
} from "../api.js";
import { initTransfers, initVendors } from "../data.js";
import { initAuditLog, initMovements } from "../tier1.jsx";

export function useApp() {

  // ── Core hooks ────────────────────────────────────────────────────────────────
  const {
    products, setProducts,
    loading:  productsLoading,
    apiOnline,
    fetchProducts,
    addProduct:    _addProduct,
    updateProduct: _updateProduct,
    deleteProduct: _deleteProduct,
    adjustStock:   _adjustStock,
  } = useProducts();

  // ✅ FIX APPLIED HERE: Passing the 'products' array into useOrders
  const {
    orders, setOrders,
    loading:   ordersLoading,
    fetchOrders,
    createOrder:  _createOrder,
    changeStatus: _changeStatus,
  } = useOrders(products); 

  // ── Transfers ─────────────────────────────────────────────────────────────────
  const [transfers,  setTransfers]  = useState(initTransfers);
  const [xferOnline, setXferOnline] = useState(false);

  const fetchTransfers = useCallback(async () => {
    try {
      const res = await transfersAPI.getAll();
      if (res?.data) {
        setTransfers(res.data.map(t => ({
          id:       t.transfer_no || t.id,
          _uuid:    t.id,
          from:     t.from_wh,
          to:       t.to_wh,
          product:  t.product_name,
          qty:      t.quantity,
          status:   t.status,
          date:     t.created_at
                      ? new Date(t.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})
                      : "",
          nft:      t.nft_hash || null,
          verified: t.verified || false,
        })));
        setXferOnline(true);
      }
    } catch { setXferOnline(false); }
  }, []);

  // ── Vendors ───────────────────────────────────────────────────────────────────
  const [vendors,    setVendors]    = useState(initVendors || []);
  const [vendOnline, setVendOnline] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await vendorsAPI.getAll();
      if (res?.data) {
        setVendors(res.data.map(v => ({
          id:          v.id,
          name:        v.name,
          contact:     v.contact_name || "",
          email:       v.email || "",
          phone:       v.phone || "",
          category:    v.category || "",
          rating:      Number(v.rating) || 4.0,
          onTime:      Number(v.on_time_pct) || 90,
          leadDays:    Number(v.lead_days) || 7,
          outstanding: Number(v.outstanding) || 0,
          totalOrders: Number(v.total_orders) || 0,
        })));
        setVendOnline(true);
      }
    } catch { setVendOnline(false); }
  }, []);

  // ── Reports ───────────────────────────────────────────────────────────────────
  const [auditLog,      setAuditLog]  = useState(initAuditLog);
  const [movements,     setMovements] = useState(initMovements);
  const [dashStats,     setDashStats] = useState(null);
  const [reportsOnline, setReportsOnline] = useState(false);

  const fetchAuditLog = useCallback(async () => {
    try {
      const res = await reportsAPI.getAuditLog();
      if (res?.data?.length > 0) {
        setAuditLog(res.data.map(l => ({
          id:     l.id,
          ts:     l.created_at
                    ? new Date(l.created_at).toLocaleString("en-IN",{
                        day:"2-digit",month:"short",year:"numeric",
                        hour:"2-digit",minute:"2-digit",
                      })
                    : "",
          user:   l.user_name || "System",
          module: l.module,
          action: l.action,
          entity: l.entity,
          detail: l.detail,
          status: l.status,
        })));
        setReportsOnline(true);
      }
    } catch { setReportsOnline(false); }
  }, []);

  const fetchMovements = useCallback(async () => {
    try {
      const res = await reportsAPI.getMovements();
      if (res?.data?.length > 0) {
        setMovements(res.data.map(m => ({
          id:        m.mov_no || m.id,
          ts:        m.created_at
                       ? new Date(m.created_at).toLocaleString("en-IN",{
                           day:"2-digit",month:"short",
                           hour:"2-digit",minute:"2-digit",
                         })
                       : "",
          product:   m.product_name,
          code:      m.product_code,
          type:      m.type,
          qty:       m.quantity,
          from:      m.before_qty,
          to:        m.after_qty,
          reason:    m.reason,
          ref:       m.reference || "",
          warehouse: m.warehouse,
          user:      m.user_name || "System",
        })));
      }
    } catch {}
  }, []);

  const fetchDashStats = useCallback(async () => {
    try {
      const res = await reportsAPI.getDashboard();
      if (res?.data) setDashStats(res.data);
    } catch {}
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTransfers();
    fetchVendors();
    fetchAuditLog();
    fetchMovements();
    fetchDashStats();
  }, []); // eslint-disable-line

  // ── Refresh all ───────────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchProducts(),
      fetchOrders(),
      fetchTransfers(),
      fetchAuditLog(),
      fetchMovements(),
      fetchDashStats(),
    ]);
  }, [fetchProducts, fetchOrders, fetchTransfers, fetchAuditLog, fetchMovements, fetchDashStats]);

  // ══════════════════════════════════════════════════════════════════════════════
  // API FUNCTIONS — these are passed as props to every module
  // Each one hits the real backend AND updates local state
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Products ──────────────────────────────────────────────────────────────────
  const addProduct = useCallback(async (data) => {
    // 1. Create the product in the catalog
    const result = await _addProduct(data);
    
    // 2. Automatically inject stock into the warehouse if provided!
    if (result.ok && apiOnline) {
      const initialQty = Number(data.initial_stock || data.onHand || 0);
      
      if (initialQty > 0) {
        // Use the UUID returned from the database
        const newId = result.data?.id || result.data?._uuid;
        if (newId) {
          await _adjustStock(newId, initialQty, "Initial Inventory Setup", data.warehouse || "WH/Main");
          // Refresh products one more time so the UI shows the new stock level
          await fetchProducts(); 
        }
      }
    }
    
    return result;
  }, [_addProduct, _adjustStock, apiOnline, fetchProducts]);

  const updateProduct = useCallback(async (id, data) => {
    return await _updateProduct(id, data);
  }, [_updateProduct]);

  const deleteProduct = useCallback(async (id) => {
    return await _deleteProduct(id);
  }, [_deleteProduct]);

  const adjustStock = useCallback(async (id, qty, reason, warehouse) => {
    return await _adjustStock(id, qty, reason, warehouse);
  }, [_adjustStock]);

  // ── Orders ────────────────────────────────────────────────────────────────────
  const createOrder = useCallback(async (data) => {
    const result = await _createOrder(data, products);
    if (result.ok) {
      // Refresh both products (stock changed) and orders after creation
      await Promise.all([fetchProducts(), fetchOrders()]);
    }
    return result;
  }, [_createOrder, products, fetchProducts, fetchOrders]);

  const changeStatus = useCallback(async (orderId, newStatus, extra = {}) => {
    const result = await _changeStatus(orderId, newStatus, extra);
    if (result.ok) {
      // Refresh products because stock levels changed
      await Promise.all([fetchProducts(), fetchOrders()]);
    }
    return result;
  }, [_changeStatus, fetchProducts, fetchOrders]);

  // ── Transfers ─────────────────────────────────────────────────────────────────
  const createTransfer = useCallback(async (data) => {
    if (!xferOnline) {
      // Offline fallback
      const prod = products.find(p => p.code === data.productCode);
      if (!prod) return { ok:false, error:"Product not found." };
      if (prod.available < data.qty) return { ok:false, error:`Only ${prod.available} available.` };
      const nft = data.highValue ? `0x${Math.random().toString(16).slice(2,10)}...${Math.random().toString(16).slice(2,6)}` : null;
      const newT = {
        id:`TRF-${String(transfers.length+1).padStart(3,"0")}`,
        from:data.from, to:data.to, product:prod.name, qty:data.qty,
        status:"done", date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
        nft, verified:!!nft,
      };
      setTransfers(prev => [...prev, newT]);
      setProducts(prev => prev.map(p => {
        if (p.code !== data.productCode) return p;
        return { ...p, onHand:p.onHand-data.qty, available:p.available-data.qty };
      }));
      return { ok:true, data:newT };
    }
    try {
      const prod = products.find(p => p.code === data.productCode);
      if (!prod) return { ok:false, error:"Product not found." };
      const res = await transfersAPI.create({
        product_id: prod._uuid || prod.id,
        from_wh:    data.from,
        to_wh:      data.to,
        quantity:   data.qty,
        high_value: data.highValue || false,
      });
      await Promise.all([fetchTransfers(), fetchProducts()]);
      return { ok:true, data:res.data };
    } catch (err) {
      return { ok:false, error:err.message };
    }
  }, [xferOnline, transfers, products, setProducts, fetchTransfers, fetchProducts]);

  // ── Vendors ───────────────────────────────────────────────────────────────────
  const addVendor = useCallback(async (data) => {
    if (!vendOnline) {
      setVendors(prev => [...prev, { ...data, id:Date.now() }]);
      return { ok:true };
    }
    try {
      await vendorsAPI.create(data);
      await fetchVendors();
      return { ok:true };
    } catch (err) {
      return { ok:false, error:err.message };
    }
  }, [vendOnline, fetchVendors]);

  const updateVendor = useCallback(async (id, data) => {
    if (!vendOnline) {
      setVendors(prev => prev.map(v => v.id===id?{...v,...data}:v));
      return { ok:true };
    }
    try {
      await vendorsAPI.update(id, data);
      await fetchVendors();
      return { ok:true };
    } catch (err) {
      return { ok:false, error:err.message };
    }
  }, [vendOnline, fetchVendors]);

  const deleteVendor = useCallback(async (id) => {
    if (!vendOnline) {
      setVendors(prev => prev.filter(v => v.id!==id));
      return { ok:true };
    }
    try {
      await vendorsAPI.archive(id);
      setVendors(prev => prev.filter(v => v.id!==id));
      return { ok:true };
    } catch (err) {
      return { ok:false, error:err.message };
    }
  }, [vendOnline]);

  const isFullyOnline = apiOnline && xferOnline;
  const isLoading     = productsLoading || ordersLoading;

  return {
    // State
    products, setProducts,
    orders,   setOrders,
    transfers, setTransfers,
    vendors,  setVendors,
    auditLog, movements, dashStats,

    // API functions — modules MUST use these, not setProducts/setOrders directly
    addProduct, updateProduct, deleteProduct, adjustStock,
    createOrder, changeStatus,
    createTransfer,
    addVendor, updateVendor, deleteVendor,

    // Status
    isLoading, isFullyOnline, apiOnline,

    // Refresh
    refreshAll,
    fetchProducts,
    fetchOrders,
  };
}
import { useState, useEffect, useCallback, useRef } from "react";
import { ordersAPI } from "../api.js";
import { initOrders } from "../data.js";

// ─── normalise — maps backend response to frontend shape ──────────────────────
function normalise(o) {
  // Calculate total from items if present
  const items = o.items?.filter(Boolean) || [];
  const total = items.reduce((a, i) => a + Number(i.total || i.unit_price * i.quantity || 0), 0) || Number(o.total) || 0;

  // Use first item's product name for display (legacy single-product view)
  const firstItem  = items[0];
  const product    = firstItem?.product_name || o.product || "";
  const qty        = firstItem?.quantity     || o.qty     || 0;

  return {
    id:         o.order_no   || o.id,
    _uuid:      o.id,                  // keep real UUID for API calls
    type:       o.type,
    customer:   o.customer,
    product,
    qty,
    total,
    status:     o.status,
    priority:   o.priority   || "normal",
    invoice:    o.invoice_no || o.invoice || null,
    payment:    o.payment    || "pending",
    delivery:   o.delivery_ref || o.delivery || null,
    date:       o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN",{ day:"2-digit", month:"short" }) : o.date || "",
    items,
    _raw: o,
  };
}

// ✅ IMPORTANT: Make sure useApp.js calls this as: useOrders(products)
export function useOrders(products = []) {
  const [ordersRaw, setOrdersRaw] = useState(initOrders || []);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [apiOnline, setApiOnline] = useState(false);

  // ── Safely track state for interceptors without causing infinite loops ─────
  const ordersRef = useRef(ordersRaw);
  useEffect(() => { ordersRef.current = ordersRaw; }, [ordersRaw]);

  const productsRef = useRef(products);
  useEffect(() => { productsRef.current = products; }, [products]);

  // ── Fetch all from backend ──────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ordersAPI.getAll();
      if (res && res.data) {
        setOrdersRaw(res.data.map(normalise));
        setApiOnline(true);
      }
      setError(null);
    } catch (err) {
      setApiOnline(false);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Helper: Find full product object to grab price/cost ────────────────────
  const getProduct = (identifier) => {
    if (!identifier) return null;
    
    // Make the search case-insensitive and remove accidental spaces
    const search = String(identifier).trim().toLowerCase();

    return productsRef.current.find(prod => 
      String(prod.id).trim().toLowerCase() === search || 
      String(prod.code).trim().toLowerCase() === search || 
      String(prod.name).trim().toLowerCase() === search
    );
  };

  // ── Explicit CRUD Functions (UI Buttons) ────────────────────────────────────
  const createOrder = useCallback(async (data) => {
    const identifier = data.productCode || data.product || data.product_id;
    const matchedProduct = getProduct(identifier);
    
    // Auto-calculate pricing based on sale vs purchase
    const orderType = data.type || "sale";
    const qty = Number(data.qty) || 1;
    let unitPrice = 0;
    
    if (matchedProduct) {
      unitPrice = orderType.toLowerCase() === "purchase" ? Number(matchedProduct.cost) : Number(matchedProduct.price);
    }
    
    // Use explicit total if provided by UI, otherwise auto-calculate
    const finalUnitPrice = data.total ? Number(data.total) / qty : unitPrice;
    const finalTotal = data.total ? Number(data.total) : (unitPrice * qty);

    if (!apiOnline) {
      const newOrder = { ...data, id: `ORD-${Date.now()}`, _uuid: null, total: finalTotal, items: data.items || [] };
      setOrdersRaw(prev => [...prev, newOrder]);
      return { ok: true, data: newOrder };
    }

    if (!matchedProduct) {
      alert(`⚠️ ERROR: Cannot save order to database! The product "${identifier}" does not exist in your Inventory.`);
      return { ok: false };
    }

    try {
      const res = await ordersAPI.create({
        type: orderType,
        customer: data.customer || "Walk-in Customer",
        priority: data.priority || "normal",
        status: data.status || "pending",
        items: [{
          product_id: matchedProduct._uuid || matchedProduct.id,
          quantity: qty,
          unit_price: finalUnitPrice,
        }],
      });
      await fetchOrders();
      return { ok: true, data: res.data };
    } catch (err) {
      alert("⚠️ SERVER ERROR: " + err.message);
      return { ok: false, error: err.message };
    }
  }, [apiOnline, fetchOrders]);

  const changeStatus = useCallback(async (orderId, newStatus, extra) => {
    const order = ordersRaw.find(o => o.id === orderId || o._uuid === orderId);
    if (!order) return { ok: false, error: "Order not found." };

    if (!apiOnline) {
      setOrdersRaw(prev => prev.map(o => (o.id === orderId || o._uuid === orderId) ? { ...o, status: newStatus } : o));
      return { ok: true };
    }

    try {
      await ordersAPI.updateStatus(order._uuid || orderId, newStatus, extra);
      await fetchOrders();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [apiOnline, fetchOrders, ordersRaw]);

  // ── Smart Interceptor (Catches Array Mutations) ─────────────────────────────
  const setOrders = useCallback((updater) => {
    const prev = ordersRef.current;
    const nextState = typeof updater === "function" ? updater(prev) : updater;

    if (apiOnline && Array.isArray(nextState)) {
      
      // 1. Handle Additions
      if (nextState.length > prev.length) {
        const addedItems = nextState.filter(n => !prev.some(p => p.id === n.id));
        addedItems.forEach(item => {
          if (!item._uuid) {
            const identifier = item.productCode || item.product || item.product_id;
            const matchedProduct = getProduct(identifier);
            
            if (!matchedProduct) {
              alert(`⚠️ SYSTEM BLOCKED SAVE: Could not find "${identifier}" in the inventory database.`);
              return; 
            }

            const orderType = item.type || "sale";
            const qty = Number(item.qty) || 1;
            const autoUnitPrice = orderType.toLowerCase() === "purchase" ? Number(matchedProduct.cost) : Number(matchedProduct.price);
            const finalUnitPrice = item.total ? (Number(item.total) / qty) : autoUnitPrice;

            ordersAPI.create({
              type: orderType, 
              customer: item.customer || "Walk-in Customer",
              priority: item.priority || "normal",
              status: item.status || "pending",
              items: [{
                product_id: matchedProduct._uuid || matchedProduct.id,
                quantity: qty,
                unit_price: finalUnitPrice,
              }],
            }).then(() => fetchOrders()).catch(e => alert("⚠️ SERVER REJECTED ORDER: " + e.message));
          }
        });
      }

      // 2. Handle Status Updates
      if (nextState.length === prev.length) {
        nextState.forEach(nextItem => {
          const prevItem = prev.find(p => p.id === nextItem.id);
          if (prevItem && prevItem.status !== nextItem.status && nextItem._uuid) {
            ordersAPI.updateStatus(nextItem._uuid, nextItem.status).then(() => fetchOrders());
          }
        });
      }
    }
    
    // Safely update React state
    setOrdersRaw(nextState);
  }, [apiOnline, fetchOrders]);

  return { 
    orders: ordersRaw, 
    setOrders, 
    loading, 
    error, 
    apiOnline, 
    fetchOrders, 
    createOrder, 
    changeStatus 
  };
}
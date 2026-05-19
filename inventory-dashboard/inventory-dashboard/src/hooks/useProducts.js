import { useState, useEffect, useCallback, useRef } from "react";
import { productsAPI } from "../api.js";
import { initProducts } from "../data.js";

// ─── computeStatus — mirrors backend logic ────────────────────────────────────
export function computeStatus(p) {
  const onHand = p.on_hand ?? p.onHand ?? 0;
  const reorder = p.reorder_pt ?? p.reorder ?? 5;
  if (onHand <= 0)       return "critical";
  if (onHand <= reorder) return "low";
  return "ok";
}

// ─── normalise — maps backend snake_case to frontend camelCase ────────────────
function normalise(p) {
  return {
    id:        p.id,
    _uuid:     p.id,           // Added to keep track of real DB UUID
    code:      p.code,
    name:      p.name,
    category:  p.category,
    unit:      p.unit       || "pcs",
    cost:      Number(p.cost)  || 0,
    price:     Number(p.price) || 0,
    onHand:    p.on_hand    ?? p.onHand    ?? 0,
    reserved:  p.reserved   ?? 0,
    available: p.available  ?? (p.on_hand - p.reserved) ?? 0,
    reorder:   p.reorder_pt ?? p.reorder   ?? 5,
    max:       p.max_stock  ?? p.max       ?? 100,
    warehouse: p.warehouse  || "WH/Main",
    route:     p.route      || "Buy",
    valuation: p.valuation  || "FIFO",
    status:    p.status     || computeStatus(p),
    batches:   p.batches    || [],
    // keep originals too so nothing breaks
    on_hand:   p.on_hand    ?? p.onHand    ?? 0,
    reorder_pt:p.reorder_pt ?? p.reorder   ?? 5,
    max_stock: p.max_stock  ?? p.max       ?? 100,
  };
}

export function useProducts() {
  const [products,  setProductsRaw] = useState(initProducts); 
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState(null);
  const [apiOnline, setApiOnline]   = useState(false);

  // ✅ Use a ref to track current state safely without causing infinite re-renders
  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // ── Fetch all from backend ──────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getAll();
      
      // ✅ Removed length > 0 trap so empty databases connect properly
      if (res && res.data) {
        setProductsRaw(res.data.map(normalise));
        setApiOnline(true);
      }
      setError(null);
    } catch (err) {
      console.warn("Products API offline, using local data:", err.message);
      setApiOnline(false);
      setError(null); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Add product ─────────────────────────────────────────────────────────────
  const addProduct = useCallback(async (data) => {
    if (!apiOnline) {
      const p = {
        ...data,
        id:        Date.now(),
        onHand:    data.initial_stock || 0,
        reserved:  0,
        available: data.initial_stock || 0,
        status:    computeStatus({ onHand: data.initial_stock||0, reorder: data.reorder_pt||5 }),
        batches:   [],
      };
      setProductsRaw(prev => [...prev, p]);
      return { ok:true, data:p };
    }
    try {
      const res = await productsAPI.create(data);
      await fetchProducts(); 
      return { ok:true, data:res.data };
    } catch (err) {
      return { ok:false, error: err.message };
    }
  }, [apiOnline, fetchProducts]);

  // ── Update product ──────────────────────────────────────────────────────────
  const updateProduct = useCallback(async (id, data) => {
    if (!apiOnline) {
      setProductsRaw(prev => prev.map(p =>
        (p.id === id) ? { ...p, ...data, status:computeStatus({...p,...data}) } : p
      ));
      return { ok:true };
    }
    try {
      await productsAPI.update(id, data);
      await fetchProducts();
      return { ok:true };
    } catch (err) {
      return { ok:false, error:err.message };
    }
  }, [apiOnline, fetchProducts]);

  // ── Delete product ──────────────────────────────────────────────────────────
  const deleteProduct = useCallback(async (id) => {
    if (!apiOnline) {
      setProductsRaw(prev => prev.filter(p => p.id !== id));
      return { ok:true };
    }
    try {
      await productsAPI.archive(id);
      setProductsRaw(prev => prev.filter(p => p.id !== id));
      return { ok:true };
    } catch (err) {
      return { ok:false, error:err.message };
    }
  }, [apiOnline]);

  // ── Adjust stock (cycle count / manual correction) ──────────────────────────
  const adjustStock = useCallback(async (id, physicalQty, reason, warehouse) => {
    if (!apiOnline) {
      setProductsRaw(prev => prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, onHand:physicalQty, available:physicalQty - p.reserved };
        return { ...updated, status:computeStatus(updated) };
      }));
      return { ok:true };
    }
    try {
      await productsAPI.adjustStock(id, physicalQty, reason, warehouse);
      await fetchProducts();
      return { ok:true };
    } catch (err) {
      return { ok:false, error:err.message };
    }
  }, [apiOnline, fetchProducts]);

  // ── Smart Interceptor: Catches local array mutations from UI ────────────────
  const setProducts = useCallback((updater) => {
    const prev = productsRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    const nextState = next.map(p => ({ ...p, status: computeStatus(p) }));
    
    if (apiOnline && Array.isArray(nextState)) {
      
      // Handle Additions (UI pushed a new product directly to array)
      if (nextState.length > prev.length) {
        const addedItems = nextState.filter(n => !prev.some(p => p.id === n.id));
        addedItems.forEach(item => {
          if (!item._uuid) { 
            productsAPI.create({
              code:       item.code,
              name:       item.name,
              category:   item.category,
              warehouse:  item.warehouse || "WH/Main",
              on_hand:    item.onHand || item.on_hand || 0,
              cost:       item.cost || 0,
              price:      item.price || 0,
              reorder_pt: item.reorder || item.reorder_pt || 5,
              max:        item.max || item.max_stock || 100,
              unit:       item.unit || "pcs",
              route:      item.route || "Buy",
              valuation:  item.valuation || "FIFO",
            }).then(() => fetchProducts()).catch(e => console.error("Sync Create Error:", e));
          }
        });
      }
      
      // Handle Deletions (UI filtered a product out of the array)
      if (nextState.length < prev.length) {
        const removedItems = prev.filter(p => !nextState.some(n => n.id === p.id));
        removedItems.forEach(item => {
          if (item._uuid && productsAPI.archive) {
            productsAPI.archive(item._uuid)
              .then(() => fetchProducts())
              .catch(e => console.error("Sync Delete Error:", e));
          }
        });
      }
    }
    
    // Safely update React state memory
    setProductsRaw(nextState);
  }, [apiOnline, fetchProducts]);

  return {
    products,
    setProducts,      
    loading,
    error,
    apiOnline,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
  };
}
// ─── InvenPro API Client ──────────────────────────────────────────────────────
// Place this file in: inventory-dashboard/src/api.js
// Every module imports from here instead of hardcoding fetch() calls

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── TOKEN MANAGEMENT ─────────────────────────────────────────────────────────
const Auth = {
  getToken:        ()      => localStorage.getItem("invenpro_token"),
  getRefreshToken: ()      => localStorage.getItem("invenpro_refresh"),
  setTokens: (access, refresh) => {
    localStorage.setItem("invenpro_token",   access);
    localStorage.setItem("invenpro_refresh", refresh);
  },
  clearTokens: () => {
    localStorage.removeItem("invenpro_token");
    localStorage.removeItem("invenpro_refresh");
    localStorage.removeItem("invenpro_user");
  },
  setUser: (user) => localStorage.setItem("invenpro_user", JSON.stringify(user)),
  getUser: ()     => {
    try { return JSON.parse(localStorage.getItem("invenpro_user")); }
    catch { return null; }
  },
};

// ─── BASE FETCH ───────────────────────────────────────────────────────────────
let isRefreshing    = false;
let refreshQueue    = []; // queue requests while token is refreshing

async function request(path, options = {}) {
  const token = Auth.getToken();

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  let res = await fetch(`${BASE_URL}${path}`, config);

  // ── Auto token refresh on 401 ──────────────────────────────────────────────
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));

    if (body.code === "TOKEN_EXPIRED") {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, path, options });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = Auth.getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token.");

        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) throw new Error("Refresh failed.");

        const { data } = await refreshRes.json();
        Auth.setTokens(data.accessToken, data.refreshToken);

        // Retry all queued requests
        refreshQueue.forEach(({ resolve, reject, path: p, options: o }) => {
          request(p, o).then(resolve).catch(reject);
        });
        refreshQueue = [];

        // Retry the original request with new token
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        res = await fetch(`${BASE_URL}${path}`, config);
      } catch {
        Auth.clearTokens();
        refreshQueue.forEach(({ reject }) => reject(new Error("Session expired.")));
        refreshQueue   = [];
        window.location.href = "/login";
        return;
      } finally {
        isRefreshing = false;
      }
    }
  }

  // ── Parse response ─────────────────────────────────────────────────────────
  const data = await res.json().catch(() => ({ success: false, error: "Invalid server response." }));

  if (!res.ok) {
    const err    = new Error(data.error || `Request failed: ${res.status}`);
    err.status   = res.status;
    err.response = data;
    throw err;
  }

  return data;
}

// Convenience methods
const get    = (path, params)  => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`${path}${qs}`);
};
const post   = (path, body)    => request(path, { method:"POST",   body: JSON.stringify(body) });
const put    = (path, body)    => request(path, { method:"PUT",    body: JSON.stringify(body) });
const del    = (path)          => request(path, { method:"DELETE" });

// ══════════════════════════════════════════════════════════════════════════════
// AUTH API
// ══════════════════════════════════════════════════════════════════════════════
export const authAPI = {
  login: async (email, password) => {
    const data = await post("/auth/login", { email, password });
    Auth.setTokens(data.data.accessToken, data.data.refreshToken);
    Auth.setUser(data.data.user);
    return data.data;
  },

  logout: async () => {
    try {
      await post("/auth/logout", { refreshToken: Auth.getRefreshToken() });
    } finally {
      Auth.clearTokens();
    }
  },

  me: () => get("/auth/me"),

  changePassword: (currentPassword, newPassword) =>
    put("/auth/change-password", { currentPassword, newPassword }),

  // Get current user from localStorage (no network call)
  currentUser: () => Auth.getUser(),
  isLoggedIn:  () => !!Auth.getToken(),
};

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS API
// ══════════════════════════════════════════════════════════════════════════════
export const productsAPI = {
  getAll: (filters = {}) => get("/products", filters),
  // filters: { category, warehouse, status, search }

  getOne: (id) => get(`/products/${id}`),

  create: (data) => post("/products", data),
  // data: { code, name, category, unit, cost, price, reorder_pt,
  //         max_stock, warehouse, route, valuation, initial_stock }

  update: (id, data) => put(`/products/${id}`, data),

  archive: (id) => del(`/products/${id}`),

  adjustStock: (id, physical_qty, reason, warehouse) =>
    post(`/products/${id}/adjust`, { physical_qty, reason, warehouse }),
};

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS API
// ══════════════════════════════════════════════════════════════════════════════
export const ordersAPI = {
  getAll: (filters = {}) => get("/orders", filters),
  // filters: { type, status, search }

  create: (data) => post("/orders", data),
  // data: { type, customer, items:[{product_id, quantity, unit_price}],
  //         priority, vendor_id, notes }

  updateStatus: (id, status, extra = {}) =>
    put(`/orders/${id}/status`, { status, ...extra }),
  // extra: { carrier, tracking_no } for shipments

  ship:    (id, carrier, tracking_no) =>
    put(`/orders/${id}/status`, { status:"done", carrier, tracking_no }),

  receive: (id) =>
    put(`/orders/${id}/status`, { status:"done" }),

  cancel:  (id) =>
    put(`/orders/${id}/status`, { status:"cancel" }),
};

// ══════════════════════════════════════════════════════════════════════════════
// VENDORS API
// ══════════════════════════════════════════════════════════════════════════════
export const vendorsAPI = {
  getAll:  ()       => get("/vendors"),
  create:  (data)   => post("/vendors", data),
  update:  (id, data) => put(`/vendors/${id}`, data),
  archive: (id)     => del(`/vendors/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFERS API
// ══════════════════════════════════════════════════════════════════════════════
export const transfersAPI = {
  getAll: () => get("/transfers"),

  create: (data) => post("/transfers", data),
  // data: { product_id, from_wh, to_wh, quantity, high_value }
};

// ══════════════════════════════════════════════════════════════════════════════
// MANUFACTURING API
// ══════════════════════════════════════════════════════════════════════════════
export const manufacturingAPI = {
  getWorkOrders: ()     => get("/manufacturing/work-orders"),
  getBOMs:       ()     => get("/manufacturing/bom"),

  createWorkOrder: (data) => post("/manufacturing/work-orders", data),
  // data: { product_id, bom_id, quantity, worker, start_date, end_date }

  updateProgress: (id, progress, efficiency, waste_pct) =>
    put(`/manufacturing/work-orders/${id}/progress`, { progress, efficiency, waste_pct }),
};

// ══════════════════════════════════════════════════════════════════════════════
// QC API
// ══════════════════════════════════════════════════════════════════════════════
export const qcAPI = {
  getAll: () => get("/qc"),

  inspect: (id, data) => post(`/qc/${id}/inspect`, data),
  // data: { passed, failed, inspector, notes }
};

// ══════════════════════════════════════════════════════════════════════════════
// SCRAP API
// ══════════════════════════════════════════════════════════════════════════════
export const scrapAPI = {
  getAll:   ()       => get("/scrap"),
  create:   (data)   => post("/scrap", data),
  // data: { product_id, quantity, reason, unit_cost, disposed_by }
  writeOff: (id)     => put(`/scrap/${id}/writeoff`, {}),
};

// ══════════════════════════════════════════════════════════════════════════════
// RETURNS API
// ══════════════════════════════════════════════════════════════════════════════
export const returnsAPI = {
  getAll:  ()       => get("/returns"),
  create:  (data)   => post("/returns", data),
  // data: { type, order_ref, party, product_id, quantity, reason, refund }
  approve: (id)     => put(`/returns/${id}/approve`, {}),
  reject:  (id)     => put(`/returns/${id}/reject`,  {}),
};

// ══════════════════════════════════════════════════════════════════════════════
// USERS API
// ══════════════════════════════════════════════════════════════════════════════
export const usersAPI = {
  getAll:  ()         => get("/users"),
  create:  (data)     => post("/users", data),
  // data: { name, email, password, role, warehouse }
  update:  (id, data) => put(`/users/${id}`, data),
  remove:  (id)       => del(`/users/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS API
// ══════════════════════════════════════════════════════════════════════════════
export const reportsAPI = {
  getMovements: (filters = {}) => get("/movements", filters),
  // filters: { product_id, type, warehouse }

  getAuditLog:  (filters = {}) => get("/audit", filters),
  // filters: { module, action, user_id }

  getDashboard: () => get("/dashboard"),
};

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER FOR UI
// ══════════════════════════════════════════════════════════════════════════════
// Wrap any API call with this to get a clean error message for toasts/banners
export async function apiCall(fn, onSuccess, onError) {
  try {
    const result = await fn();
    if (onSuccess) onSuccess(result);
    return { ok: true, data: result };
  } catch (err) {
    const message = err.message || "Something went wrong.";
    if (onError) onError(message);
    return { ok: false, error: message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════════════════════
export const healthAPI = {
  check: () => get("/health"),
};

// Default export with everything
export default {
  auth:          authAPI,
  products:      productsAPI,
  orders:        ordersAPI,
  vendors:       vendorsAPI,
  transfers:     transfersAPI,
  manufacturing: manufacturingAPI,
  qc:            qcAPI,
  scrap:         scrapAPI,
  returns:       returnsAPI,
  users:         usersAPI,
  reports:       reportsAPI,
  health:        healthAPI,
  call:          apiCall,
};

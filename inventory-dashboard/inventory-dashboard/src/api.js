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

        refreshQueue.forEach(({ resolve, reject, path: p, options: o }) => {
          request(p, o).then(resolve).catch(reject);
        });
        refreshQueue = [];

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

  const data = await res.json().catch(() => ({ success: false, error: "Invalid server response." }));

  if (!res.ok) {
    const err    = new Error(data.error || `Request failed: ${res.status}`);
    err.status   = res.status;
    err.response = data;
    throw err;
  }

  return data;
}

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
  register: async ({ name, email, password, role, warehouse, company }) => {
    const data = await post("/auth/register", { name, email, password, role, warehouse, company });
    Auth.setTokens(data.data.accessToken, data.data.refreshToken);
    Auth.setUser(data.data.user);
    return data.data;
  },
  logout: async () => {
    try { await post("/auth/logout", { refreshToken: Auth.getRefreshToken() }); } 
    finally { Auth.clearTokens(); }
  },
  forgotPassword: async (email) => post("/auth/forgot-password", { email }),
  resetPassword: async (token, password) => post("/auth/reset-password", { token, password }),
  me:             () => get("/auth/me"),
  changePassword: (currentPassword, newPassword) => put("/auth/change-password", { currentPassword, newPassword }),
  currentUser: () => Auth.getUser(),
  isLoggedIn:  () => !!Auth.getToken(),
};

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS API
// ══════════════════════════════════════════════════════════════════════════════
export const productsAPI = {
  getAll: (filters = {}) => get("/products", filters),
  getOne: (id) => get(`/products/${id}`),
  create: (data) => post("/products", data),
  update: (id, data) => put(`/products/${id}`, data),
  archive: (id) => del(`/products/${id}`),
  adjustStock: (id, physical_qty, reason, warehouse) => post(`/products/${id}/adjust`, { physical_qty, reason, warehouse }),
};

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS API
// ══════════════════════════════════════════════════════════════════════════════
export const ordersAPI = {
  getAll: (filters = {}) => get("/orders", filters),
  create: (data) => post("/orders", data),
  updateStatus: (id, status, extra = {}) => put(`/orders/${id}/status`, { status, ...extra }),
  ship:    (id, carrier, tracking_no) => put(`/orders/${id}/status`, { status:"done", carrier, tracking_no }),
  receive: (id) => put(`/orders/${id}/status`, { status:"done" }),
  cancel:  (id) => put(`/orders/${id}/status`, { status:"cancel" }),
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
};

// ══════════════════════════════════════════════════════════════════════════════
// MANUFACTURING API
// ══════════════════════════════════════════════════════════════════════════════
export const manufacturingAPI = {
  getWorkOrders: ()     => get("/manufacturing/work-orders"),
  getBOMs:       ()     => get("/manufacturing/bom"),
  createWorkOrder: (data) => post("/manufacturing/work-orders", data),
  updateProgress: (id, progress, efficiency, waste_pct) => put(`/manufacturing/work-orders/${id}/progress`, { progress, efficiency, waste_pct }),
};

// ══════════════════════════════════════════════════════════════════════════════
// QC API
// ══════════════════════════════════════════════════════════════════════════════
export const qcAPI = {
  getAll: () => get("/qc"),
  inspect: (id, data) => post(`/qc/${id}/inspect`, data),
};

// ══════════════════════════════════════════════════════════════════════════════
// SCRAP API
// ══════════════════════════════════════════════════════════════════════════════
export const scrapAPI = {
  getAll:   ()       => get("/scrap"),
  create:   (data)   => post("/scrap", data),
  writeOff: (id)     => put(`/scrap/${id}/writeoff`, {}),
};

// ══════════════════════════════════════════════════════════════════════════════
// RETURNS API
// ══════════════════════════════════════════════════════════════════════════════
export const returnsAPI = {
  getAll:  ()       => get("/returns"),
  create:  (data)   => post("/returns", data),
  approve: (id)     => put(`/returns/${id}/approve`, {}),
  reject:  (id)     => put(`/returns/${id}/reject`,  {}),
};

// ══════════════════════════════════════════════════════════════════════════════
// USERS API
// ══════════════════════════════════════════════════════════════════════════════
export const usersAPI = {
  getAll:  ()         => get("/users"),
  create:  (data)     => post("/users", data),
  update:  (id, data) => put(`/users/${id}`, data),
  remove:  (id)       => del(`/users/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS API
// ══════════════════════════════════════════════════════════════════════════════
export const reportsAPI = {
  getMovements: (filters = {}) => get("/movements", filters),
  getAuditLog:  (filters = {}) => get("/audit", filters),
  getDashboard: () => get("/dashboard"),
};

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER FOR UI
// ══════════════════════════════════════════════════════════════════════════════
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

export const healthAPI = {
  check: () => get("/health"),
};

export const putawayAPI = {
  getAll:       ()         => get("/putaway"),
  create:       (data)     => post("/putaway", data),
  toggle:       (id)       => put(`/putaway/${id}/toggle`, {}),
  remove:       (id)       => del(`/putaway/${id}`),
};

// ── Fulfillments (Pick → Pack → Ship) ────────────────────────────────────────
export const fulfillmentsAPI = {
  // 🔥 ADDED INTERCEPTOR: Let's see exactly what the backend sends us!
  getAll: async () => {
    const res = await get("/fulfillments");
    console.log("📦 Live DB Fulfillments payload:", res);
    return res;
  },
  create:       (data)                       => post("/fulfillments", data),
  advanceStep:  (id, step, carrier, tracking)=> put(`/fulfillments/${id}/step`, { step, carrier, tracking_no:tracking }),
};

export const backordersAPI = {
  getAll:   ()       => get("/backorders"),
  create:   (data)   => post("/backorders", data),
  fulfill:  (id)     => put(`/backorders/${id}/fulfill`, {}),
};

export const variantsAPI = {
  getAll:       ()             => get("/variants"),
  create:       (data)         => post("/variants", data),
  adjustStock:  (id, delta)    => put(`/variants/${id}/stock`, { delta }),
  remove:       (id)           => del(`/variants/${id}`),
};

export const priceListsAPI = {
  getAll:   ()         => get("/price-lists"),
  create:   (data)     => post("/price-lists", data),
  update:   (id, data) => put(`/price-lists/${id}`, data),
  remove:   (id)       => del(`/price-lists/${id}`),
};

export const dropshipsAPI = {
  getAll:   ()     => get("/dropships"),
  create:   (data) => post("/dropships", data),
  advance:  (id)   => put(`/dropships/${id}/advance`, {}),
  cancel:   (id)   => put(`/dropships/${id}/cancel`, {}),
};

export const batchesAPI = {
  getAll: () => get("/batches"),
};

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
  putaway:       putawayAPI,
  fulfillments:  fulfillmentsAPI,
  backorders:    backordersAPI,
  variants:      variantsAPI,
  priceLists:    priceListsAPI,
  dropships:     dropshipsAPI,
  batches:       batchesAPI,
  call:          apiCall,
};
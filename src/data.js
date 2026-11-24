import config from "./config";
import { t, currencyAfter } from "./text";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, addDoc, setDoc, doc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

export const DEMO = !config.firebase.apiKey;
// Shop details: defaults from config.js, overridden by what the admin saved in Settings.
export const shop = { ...config.shop };
const app = DEMO ? null : initializeApp(config.firebase);
const db = DEMO ? null : getFirestore(app);
const auth = DEMO ? null : getAuth(app);

/* ---------- helpers ---------- */
export const getSizes = (p) => (p.sizes && p.sizes.length ? p.sizes : [{ label: p.unit || "kg", price: p.price }]);
export const sizePrice = (p, s) => Math.round(s.price - (s.price * (p.discountPercent || 0)) / 100);
export const finalPrice = (p) => Math.min(...getSizes(p).map((s) => sizePrice(p, s))); // sab se kam price
export const isOffer = (p) => (p.discountPercent || 0) > 0;
export const isNew = (p) => Date.now() - (p.createdAt || 0) <= config.home.newProductDays * 864e5;
export const money = (n) => (currencyAfter ? `${Number(n).toLocaleString("en-US")} ${config.shop.currency}` : `${config.shop.currency} ${Number(n).toLocaleString("en-US")}`);

/* ---------- demo storage (browser) ---------- */
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("demo_" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("demo_" + k, JSON.stringify(v)); },
};
const day = 864e5;
function seed() {
  if (ls.get("seeded_v2", false)) return;
  ls.set("categories", [
    { id: "nuts", name: "Nuts", order: 1, isVisible: true },
    { id: "dried", name: "Dried Fruits", order: 2, isVisible: true },
    { id: "seeds", name: "Seeds", order: 3, isVisible: true },
  ]);
  const mk = (id, name, categoryId, [a, b, c], d, pop, ago) => ({ id, name, categoryId, price: a, sizes: [{ label: "250g", price: a }, { label: "500g", price: b }, { label: "1kg", price: c }], discountPercent: d, isPopular: pop, isVisible: true, imageUrl: "", description: "", createdAt: Date.now() - ago * day });
  ls.set("products", [
    mk("p1", "Almonds", "nuts", [650, 1250, 2400], 0, true, 90),
    mk("p2", "Cashews", "nuts", [850, 1650, 3200], 15, true, 60),
    mk("p3", "Pistachios", "nuts", [1100, 2150, 4200], 0, true, 5),
    mk("p4", "Walnuts", "nuts", [500, 950, 1800], 20, false, 2),
    mk("p5", "Dates", "dried", [250, 470, 900], 0, true, 40),
    mk("p6", "Dried Apricots", "dried", [380, 720, 1400], 10, false, 1),
    mk("p7", "Chia Seeds", "seeds", [330, 620, 1200], 0, false, 70),
  ]);
  ls.set("orders", []);
  ls.set("seeded_v2", true);
}
if (DEMO) seed();
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
const withTimeout = (p, ms = 20000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/* ---------- generic CRUD ---------- */
async function list(name, onlyVisible) {
  if (DEMO) { const all = ls.get(name, []); return onlyVisible ? all.filter((x) => x.isVisible) : all; }
  const ref = collection(db, name);
  const snap = await getDocs(onlyVisible ? query(ref, where("isVisible", "==", true)) : ref);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function save(name, obj) {
  const { id, ...data } = obj;
  const docId = id || newId();
  if (DEMO) {
    const all = ls.get(name, []);
    const i = all.findIndex((x) => x.id === docId);
    if (i >= 0) all[i] = { ...obj, id: docId }; else all.push({ ...obj, id: docId });
    ls.set(name, all);
    return docId;
  }
  // JSON round-trip removes undefined values, which Firestore refuses to save.
  await withTimeout(setDoc(doc(db, name, docId), JSON.parse(JSON.stringify(data))));
  return docId;
}
async function remove(name, id) {
  if (DEMO) { ls.set(name, ls.get(name, []).filter((x) => x.id !== id)); return; }
  await withTimeout(deleteDoc(doc(db, name, id)));
}

export const listCategories = async (all) => (await list("categories", !all)).sort((a, b) => (a.order || 0) - (b.order || 0));
export const saveCategory = (c) => save("categories", c);
export const deleteCategory = (id) => remove("categories", id);
export const listProducts = async (all) => (await list("products", !all)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
export const saveProduct = (p) => save("products", p);
export const deleteProduct = (id) => remove("products", id);

/* ---------- orders ---------- */
export const makeOrderNo = () => "DF-" + (Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4)).toUpperCase();
// `draft` keeps the same id and order number if the customer retries after a failure, so no duplicate order is made.
export async function createOrder(order, draft = {}) {
  draft.id = draft.id || newId();
  draft.orderNo = draft.orderNo || makeOrderNo();
  const data = { ...order, orderNo: draft.orderNo, status: "new", createdAt: Date.now() };
  await save("orders", { ...data, id: draft.id });
  return { id: draft.id, ...data };
}
export const listOrders = async () => (await list("orders", false)).sort((a, b) => b.createdAt - a.createdAt);
export const updateOrder = (o) => save("orders", o);
export function watchOrders(cb, onErr) {
  if (DEMO) { const f = () => cb(ls.get("orders", []).sort((a, b) => b.createdAt - a.createdAt)); f(); const t = setInterval(f, 3000); return () => clearInterval(t); }
  return onSnapshot(collection(db, "orders"), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)), () => onErr && onErr());
}

/* ---------- auth ---------- */
export const isAdminEmail = (e) => DEMO || !!e && config.admin.emails.map((x) => x.toLowerCase()).includes(e.toLowerCase());
export async function login(email, password) {
  if (DEMO) {
    if (password !== "admin123") throw new Error("Demo mode: use the password admin123.");
    ls.set("user", { email }); return;
  }
  await signInWithEmailAndPassword(auth, email, password);
}
export async function logout() { if (DEMO) { localStorage.removeItem("demo_user"); return; } await signOut(auth); }
export function onAuth(cb) {
  if (DEMO) { cb(ls.get("user", null)); return () => {}; }
  return onAuthStateChanged(auth, (u) => cb(u ? { email: u.email } : null));
}

/* ---------- images ---------- */
// Phone photos are often 5-10 MB. Shrink them first so the upload is much faster.
async function shrink(file, max = 1400, quality = 0.85) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 300000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", quality));
    return blob && blob.size < file.size ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}
export async function uploadImage(original) {
  const { cloudName, uploadPreset } = config.cloudinary;
  const file = await shrink(original);
  if (cloudName && uploadPreset) {
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", uploadPreset);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 60000);
    try {
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd, signal: ctl.signal });
      const j = await r.json();
      if (!j.secure_url) throw new Error("Image upload failed. Check the Cloudinary settings.");
      return j.secure_url;
    } catch (e) {
      if (e.name === "AbortError") throw new Error("The upload took too long. Check your internet and try again.");
      throw e;
    } finally { clearTimeout(timer); }
  }
  if (!DEMO) throw new Error("Cloudinary is not set up. Add cloudName and uploadPreset in config.js, or paste an image URL.");
  if (file.size > 250000) throw new Error("In demo mode, use an image smaller than 250KB.");
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

/* ---------- email (EmailJS, bina library ke) ---------- */
export async function emailOwner(order) {
  const { serviceId, templateId, publicKey } = config.emailjs;
  if (!serviceId || !templateId || !publicKey) { console.warn("EmailJS: serviceId, templateId or publicKey is empty in config.js, so no email was sent."); return false; }
  if (!shop.email) { console.warn("EmailJS: the shop email is empty, so there is nobody to send to."); return false; }
  try {
    const items = order.items.map((i) => `${i.name} (${i.size}) x ${i.qty} = ${money(i.price * i.qty)}`).join("  |  ");
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: serviceId, template_id: templateId, user_id: publicKey, template_params: {
        shop_name: shop.name, to_email: shop.email, order_no: order.orderNo,
        customer_name: order.name, customer_phone: order.phone, customer_address: order.address,
        note: order.note || "-", items, total: money(order.total) } }),
    });
    if (!r.ok) console.warn("EmailJS error:", r.status, await r.text());
    return r.ok;
  } catch (e) { console.warn("EmailJS request failed:", e); return false; }
}
export function whatsappLink(order) {
  const lines = order.items.map((i) => `- ${i.name} (${i.size}) x ${i.qty}`).join("\n");
  const text = `${t.wa.newOrder} ${order.orderNo}\n${t.wa.name}: ${order.name}\n${t.wa.phone}: ${order.phone}\n${t.wa.address}: ${order.address}\n${lines}\n${t.wa.total}: ${money(order.total)}`;
  return `https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(text)}`;
}

/* ---------- settings (editable from the admin panel) ---------- */
export async function getSettings() {
  const def = { sizes: config.shop.sizes };
  try {
    if (DEMO) return { ...def, ...ls.get("settings", {}) };
    const s = await getDoc(doc(db, "settings", "shop"));
    return { ...def, ...(s.exists() ? s.data() : {}) };
  } catch { return def; }
}
export async function saveSettings(obj) {
  if (DEMO) { ls.set("settings", { ...ls.get("settings", {}), ...obj }); return; }
  await setDoc(doc(db, "settings", "shop"), obj, { merge: true });
}
export async function loadShop() {
  const { sizes, ...saved } = await getSettings();
  Object.assign(shop, saved);
  return shop;
}

// True only when a real WhatsApp number is set (a placeholder like 923000000000 counts as not set).
export const whatsappReady = () => /^\d{10,15}$/.test(shop.whatsapp) && !/0{7,}$/.test(shop.whatsapp);

/* ---------- stock ---------- */
// A weight is available if it is ticked "In stock" and its stock number (if any) is above 0.
export const isAvail = (s) => s.inStock !== false && (s.stock == null || s.stock > 0);

// Change an order's status and keep the stock numbers in step:
// Confirmed/Delivered deduct the ordered quantities once; New/Cancelled give them back.
// Returns a list of warnings (for example when there was not enough stock).
async function readOrder(id) {
  try {
    if (DEMO) return ls.get("orders", []).find((o) => o.id === id) || null;
    const s = await getDoc(doc(db, "orders", id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  } catch { return null; }
}
export async function applyOrderStatus(shown, status) {
  const warnings = [];
  const order = (await readOrder(shown.id)) || shown; // always use the latest saved order, not a stale copy
  const wantApplied = status === "confirmed" || status === "delivered";
  const wasApplied = !!order.stockApplied;
  let stockApplied = wasApplied;
  if (wantApplied !== wasApplied) {
    const products = await listProducts(true);
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const changed = new Set();
    for (const item of order.items) {
      const p = byId[item.id];
      const s = p && p.sizes && p.sizes.find((x) => x.label === item.size);
      if (!s || s.stock == null) continue; // product removed, or stock not counted for this weight
      if (wantApplied) {
        if (s.stock < item.qty) warnings.push(`${item.name} (${item.size}): only ${s.stock} in stock but ${item.qty} ordered. Stock set to 0.`);
        s.stock = Math.max(0, s.stock - item.qty);
      } else {
        s.stock += item.qty;
      }
      changed.add(p.id);
    }
    for (const id of changed) await saveProduct(byId[id]);
    stockApplied = wantApplied;
  }
  await updateOrder({ ...order, status, stockApplied });
  return warnings;
}

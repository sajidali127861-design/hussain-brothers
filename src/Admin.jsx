import React, { useEffect, useRef, useState } from "react";
import config from "./config";
import { DEMO, login, logout, onAuth, isAdminEmail, listCategories, saveCategory, deleteCategory, listProducts, saveProduct, deleteProduct,
  watchOrders, applyOrderStatus, uploadImage, shop, getSettings, saveSettings, newId, getSizes, sizePrice, money } from "./data";
import { Loader, Spinner, SmartImg } from "./ui";

const slowMsg = "Saving is taking too long. Check your internet and try again.";
const failMsg = "Could not save. Check your internet, and that you are logged in with the admin email, then try again.";
const errText = (x) => (x && x.message === "timeout" ? slowMsg : failMsg);

export function Admin() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuth((u) => setUser(u || null)), []);
  if (user === undefined) return <Loader />;
  if (!user) return <Login />;
  if (!isAdminEmail(user.email)) return (<section className="panel"><h1 className="pg">Access denied</h1><p>{user.email} is not an admin email. Add it to admin.emails in src/config.js (and in the Firestore rules), then reload.</p><button className="btn" onClick={logout}>Log out</button></section>);
  return <Panel />;
}

function Login() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setErr("");
    try { await login(email.trim(), pw); if (DEMO) location.reload(); } catch (x) { setErr(DEMO ? x.message : "Wrong email or password."); }
    setBusy(false);
  }
  return (
    <form className="panel narrow" onSubmit={go}>
      <h1 className="pg">Admin login</h1>
      {DEMO && <p className="note">Demo mode: use any email and the password <b>admin123</b>. For a real login, add your Firebase keys in config.js.</p>}
      <label>Email<input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
      <label>Password<input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
      {err && <p className="note err" role="alert">{err}</p>}
      <button className="btn big" disabled={busy}>{busy ? <><Spinner small /> Please wait...</> : "Login"}</button>
    </form>
  );
}

function Panel() {
  const dbMode = shop.orderMode === "database";
  const [tab, setTab] = useState("products");
  const [orders, setOrders] = useState(null);
  const [ordersErr, setOrdersErr] = useState(false);
  useEffect(() => {
    if (!dbMode) { setOrders(null); return; }
    const u = watchOrders((o) => { setOrders(o); setOrdersErr(false); }, () => { setOrders([]); setOrdersErr(true); });
    return () => typeof u === "function" && u();
  }, [dbMode]);
  const tabs = [dbMode && ["orders", "Orders"], ["products", "Products"], ["categories", "Categories"], ["settings", "Settings"]].filter(Boolean);
  const cur = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];
  const fresh = (orders || []).filter((o) => o.status === "new").length;
  return (
    <>
      <div className="adm-h"><h1 className="pg">Admin panel</h1><button className="btn ghost" onClick={() => { logout().then(() => DEMO && location.reload()); }}>Log out</button></div>
      <div className="chips" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={cur === k} className={"chip" + (cur === k ? " on" : "")} onClick={() => setTab(k)}>
            {l}{k === "orders" && fresh > 0 && <span className="badge">{fresh}</span>}
          </button>
        ))}
      </div>
      {cur === "orders" && <Orders orders={orders} failed={ordersErr} />}
      {cur === "products" && <ProductsAdmin />}
      {cur === "categories" && <CategoriesAdmin />}
      {cur === "settings" && <SettingsAdmin />}
    </>
  );
}

const STATUS = [["new", "New"], ["confirmed", "Confirmed"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]];
function Orders({ orders, failed }) {
  const [busy, setBusy] = useState("");
  if (orders === null) return <Loader />;
  if (failed) return <p className="note err">Could not load orders. Check your internet and that you are logged in with the admin email.</p>;
  if (!orders.length) return <p className="note">No orders yet.</p>;
  async function change(o, value) {
    setBusy(o.id);
    try { const w = await applyOrderStatus(o, value); if (w.length) alert(w.join("\n")); }
    catch { alert("Could not update the order. Check your internet and try again."); }
    finally { setBusy(""); }
  }
  return (
    <>
      <p className="muted">Stock numbers go down when you set an order to Confirmed or Delivered, and come back if you set it to Cancelled or New.</p>
      {orders.map((o) => (
        <article className="panel" key={o.id}>
          <div className="row"><strong>{o.orderNo}</strong>
            <select className="field sm" value={o.status} disabled={busy === o.id} aria-label="Order status" onChange={(e) => change(o, e.target.value)}>
              {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>{busy === o.id && <Spinner small />}</div>
          <p className="muted">{new Date(o.createdAt).toLocaleString()}{o.stockApplied ? " · Stock deducted" : ""}</p>
          <p><b>{o.name}</b> · <a href={"tel:" + o.phone}>{o.phone}</a><br />{o.address}{o.note ? <><br />Note: {o.note}</> : null}</p>
          <ul>{o.items.map((i, k) => <li key={k}>{i.name} ({i.size}) x {i.qty} = {money(i.price * i.qty)}</li>)}</ul>
          <p><strong>Total: {money(o.total)}</strong> <span className="muted">(check the total yourself before confirming)</span></p>
        </article>
      ))}
    </>
  );
}

function CategoriesAdmin() {
  const [list, setList] = useState(null); const [name, setName] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => listCategories(true).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || newId();
  async function run(fn) { setBusy(true); setMsg(""); try { await fn(); await load(); } catch (x) { setMsg(errText(x)); } finally { setBusy(false); } }
  const add = (e) => { e.preventDefault(); if (!name.trim() || busy) return; run(async () => { await saveCategory({ id: slug(name), name: name.trim(), order: (list || []).length + 1, isVisible: true }); setName(""); }); };
  const upd = (c, patch) => run(() => saveCategory({ ...c, ...patch }));
  const del = (c) => { if (confirm(`Delete the category "${c.name}"? Its products will no longer show on the website.`)) run(() => deleteCategory(c.id)); };
  return (
    <>
      <form className="panel row" onSubmit={add}><input className="field grow" placeholder="New category name" aria-label="Category name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn" disabled={busy}>{busy ? <Spinner small /> : "Add"}</button></form>
      {msg && <p className="note err" role="alert">{msg}</p>}
      {list === null ? <Loader /> : list.map((c) => (
        <div className="panel row" key={c.id}>
          <strong className="grow">{c.name}</strong>
          <label className="check"><input type="checkbox" checked={!!c.isVisible} disabled={busy} onChange={(e) => upd(c, { isVisible: e.target.checked })} /> Visible</label>
          <input className="field sm num" type="number" aria-label="Sort order" value={c.order || 0} disabled={busy} onChange={(e) => upd(c, { order: Number(e.target.value) })} />
          <button className="btn danger" disabled={busy} onClick={() => del(c)}>Delete</button>
        </div>
      ))}
    </>
  );
}

function SettingsAdmin() {
  const [f, setF] = useState(null); const [msg, setMsg] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { getSettings().then((s) => setF({ name: shop.name, phone: shop.phone, whatsapp: shop.whatsapp, email: shop.email, address: shop.address, hours: shop.hours, orderMode: shop.orderMode === "database" ? "database" : "whatsapp", sizes: s.sizes.join(", ") })); }, []);
  if (!f) return <Loader />;
  const up = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMsg(""); };
  const sizes = [...new Set(f.sizes.split(",").map((x) => x.trim()).filter(Boolean))];
  const bad = (m) => { setOk(false); setMsg(m); };
  async function save(e) {
    e.preventDefault(); if (busy) return;
    let wa = f.whatsapp.replace(/\D/g, "");
    if (wa.startsWith("0")) wa = config.shop.countryCode + wa.slice(1);
    if (f.name.trim().length < 2) return bad("Enter the shop name.");
    if (f.address.trim().length < 5) return bad("Enter the address.");
    if (wa.length < 10 || wa.length > 15) return bad("Enter a valid WhatsApp number, like 0300 1234567.");
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return bad("Enter a valid email.");
    if (!sizes.length || sizes.length > 8 || sizes.some((x) => x.length > 12)) return bad("Use 1 to 8 weights, and keep each one short (like 250g).");
    const data = { name: f.name.trim(), phone: f.phone.trim(), whatsapp: wa, email: f.email.trim(), address: f.address.trim(), hours: f.hours.trim(), orderMode: f.orderMode, sizes };
    setBusy(true); setMsg("");
    try {
      await saveSettings(data);
      const { sizes: _s, ...rest } = data; Object.assign(shop, rest);
      setF({ ...f, whatsapp: wa }); dispatchEvent(new Event("shop-updated"));
      setOk(true); setMsg("Saved. The website now uses the new details.");
    } catch (x) { bad(errText(x)); } finally { setBusy(false); }
  }
  return (
    <form className="panel" onSubmit={save}>
      <h2>How do you take orders?</h2>
      <fieldset className="modes">
        <legend className="sr">Order mode</legend>
        <label className="mode"><input type="radio" name="om" checked={f.orderMode === "whatsapp"} onChange={() => { setF({ ...f, orderMode: "whatsapp" }); setMsg(""); }} />
          <span><b>WhatsApp only (recommended)</b><br /><span className="muted">The customer sends the order on WhatsApp. Nothing is saved on the website, no emails are sent, and stock numbers do not change by themselves. You confirm the order on WhatsApp, so you never confirm something you cannot deliver.</span></span></label>
        <label className="mode"><input type="radio" name="om" checked={f.orderMode === "database"} onChange={() => { setF({ ...f, orderMode: "database" }); setMsg(""); }} />
          <span><b>Save in database + WhatsApp</b><br /><span className="muted">Orders are saved and appear in the Orders tab, you get an email, and stock goes down when you set an order to Confirmed. The customer can also confirm on WhatsApp.</span></span></label>
      </fieldset>

      <h2 style={{ marginTop: 20 }}>Shop details</h2>
      <label>Shop name<input className="field" value={f.name} onChange={up("name")} /></label>
      <label>Phone number (shown on the website)<input className="field" type="tel" inputMode="tel" value={f.phone} onChange={up("phone")} /></label>
      <label>WhatsApp number (orders arrive here)<input className="field" type="tel" inputMode="tel" value={f.whatsapp} onChange={up("whatsapp")} /></label>
      <p className="muted">If you type 0300 1234567, the country code is added for you. After saving it shows as {config.shop.countryCode}...</p>
      <label>Email for new orders (used in database mode)<input className="field" type="email" inputMode="email" value={f.email} onChange={up("email")} /></label>
      <label>Address<textarea className="field" rows="2" value={f.address} onChange={up("address")} /></label>
      <label>Opening hours<input className="field" value={f.hours} onChange={up("hours")} /></label>

      <h2 style={{ marginTop: 20 }}>Starting weights</h2>
      <p className="muted">These weights appear in the form when you add a new product. You can change, remove or add weights for each product.</p>
      <label>Weights (separated by commas)<input className="field" value={f.sizes} onChange={up("sizes")} /></label>
      <div className="chips" aria-label="Preview">{sizes.map((x) => <span className="chip" key={x}>{x}</span>)}</div>
      {msg && <p className={"note" + (ok ? "" : " err")} role="status">{msg}</p>}
      <button className="btn big" disabled={busy}>{busy ? <><Spinner small /> Saving...</> : "Save"}</button>
    </form>
  );
}

const toRows = (p, sizes) => (p ? getSizes(p).map((x) => ({ label: x.label, price: String(x.price), stock: x.stock == null ? "" : String(x.stock), inStock: x.inStock !== false })) : sizes.map((l) => ({ label: l, price: "", stock: "", inStock: true })));
const blank = (sizes) => ({ name: "", categoryId: "", sizes: toRows(null, sizes), discountPercent: 0, imageUrl: "", description: "", isPopular: false, isVisible: true });

function ProductsAdmin() {
  const [cats, setCats] = useState([]); const [list, setList] = useState(null); const [form, setForm] = useState(null); const [msg, setMsg] = useState("");
  const [sizes, setSizes] = useState(config.shop.sizes);
  const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false);
  const session = useRef(0);       // changes whenever the form is opened/closed, so a late image upload cannot reopen a broken form
  const idDraft = useRef(null);    // same id on retry, so a retry never makes a duplicate product
  const load = () => { listCategories(true).then(setCats).catch(() => {}); listProducts(true).then(setList).catch(() => setList([])); getSettings().then((s) => setSizes(s.sizes)); };
  useEffect(load, []);
  const open = (f) => { session.current++; idDraft.current = null; setMsg(""); setUploading(false); setForm(f); };
  const close = () => { session.current++; idDraft.current = null; setMsg(""); setUploading(false); setForm(null); };
  const set = (k, v) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const setRow = (i, k, v) => setForm((f) => (f ? { ...f, sizes: f.sizes.map((r, j) => (j === i ? { ...r, [k]: v } : r)) } : f));
  const addRow = () => setForm((f) => (f ? { ...f, sizes: [...f.sizes, { label: "", price: "", stock: "", inStock: true }] } : f));
  const delRow = (i) => setForm((f) => (f ? { ...f, sizes: f.sizes.filter((_, j) => j !== i) } : f));

  async function pick(e) {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    const mine = session.current;
    setUploading(true); setMsg("");
    try { const url = await uploadImage(file); if (mine === session.current) { set("imageUrl", url); setMsg("Image uploaded."); } }
    catch (x) { if (mine === session.current) setMsg(x.message || "Image upload failed."); }
    finally { if (mine === session.current) setUploading(false); }
  }
  const sizesArr = (f) => f.sizes.filter((r) => r.label.trim() && Number(r.price) > 0).map((r) => ({ label: r.label.trim(), price: Number(r.price), stock: r.stock === "" || r.stock == null || isNaN(Number(r.stock)) ? null : Math.max(0, Math.floor(Number(r.stock))), inStock: r.inStock !== false }));

  async function submit(e) {
    e.preventDefault();
    if (saving || uploading) return;
    const sz = sizesArr(form), d = Number(form.discountPercent || 0);
    if (!form.name.trim() || !form.categoryId) return setMsg("Name and category are required.");
    if (!sz.length) return setMsg("Add at least one weight or unit with its price.");
    if (new Set(sz.map((x) => x.label.toLowerCase())).size !== sz.length) return setMsg("The same weight is entered twice.");
    if (d < 0 || d > 100) return setMsg("Discount must be between 0 and 100.");
    setSaving(true); setMsg("");
    try {
      const { sizes: _s, unit: _u, ...rest } = form;
      const id = form.id || (idDraft.current = idDraft.current || newId());
      await saveProduct({ ...rest, id, name: form.name.trim(), imageUrl: form.imageUrl || "", sizes: sz, price: Math.min(...sz.map((s) => s.price)), discountPercent: d, createdAt: form.createdAt || Date.now() });
      close(); load();
    } catch (x) { setMsg(errText(x)); }
    finally { setSaving(false); }
  }
  async function del(p) {
    if (!confirm(`Delete "${p.name}" permanently? To just hide it, untick Visible instead.`)) return;
    try { await deleteProduct(p.id); load(); } catch (x) { alert(errText(x)); }
  }
  async function toggle(p) { try { await saveProduct({ ...p, isVisible: !p.isVisible }); load(); } catch (x) { alert(errText(x)); } }

  if (form) {
    const d = Number(form.discountPercent) || 0;
    const ok = !saving && !uploading;
    return (
      <form className="panel" onSubmit={submit}>
        <h2>{form.id ? "Edit product" : "New product"}</h2>
        <label>Name<input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label>Category
          <select className="field" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Choose</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        {!cats.length && <p className="note err">Add a category in the Categories tab first.</p>}
        <p className="muted" style={{ marginBottom: 0 }}>Enter this product's weights and prices. Each product can have different weights (like 250g, 1kg, 1 dozen, 1 box). Type a Stock number to count how many you have, or leave it empty if you do not count stock.{shop.orderMode !== "database" && " In WhatsApp-only mode the stock number does not go down by itself, so change it by hand when you sell."}</p>
        <datalist id="sizeList">{[...new Set([...sizes, "1 piece", "1 dozen", "1 box"])].map((x) => <option key={x} value={x} />)}</datalist>
        {form.sizes.map((r, i) => (
          <div className="row size-row" key={i}>
            <label className="grow">Weight or unit<input className="field" list="sizeList" value={r.label} onChange={(e) => setRow(i, "label", e.target.value)} placeholder="e.g. 500g" /></label>
            <label className="grow">Price<input className="field" type="number" inputMode="numeric" min="1" value={r.price} onChange={(e) => setRow(i, "price", e.target.value)} /></label>
            <label className="grow">Stock (optional)<input className="field" type="number" inputMode="numeric" min="0" value={r.stock ?? ""} onChange={(e) => setRow(i, "stock", e.target.value)} /></label>
            <label className="check"><input type="checkbox" checked={r.inStock !== false} onChange={(e) => setRow(i, "inStock", e.target.checked)} /> In stock</label>
            <button type="button" className="btn danger" aria-label={`Remove ${r.label || "this"} weight`} onClick={() => delRow(i)}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn ghost gap" onClick={addRow}>Add another weight</button>
        <label>Discount % (applies to all weights)<input className="field" type="number" inputMode="numeric" min="0" max="100" value={form.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} /></label>
        {d > 0 && sizesArr(form).length > 0 && <p className="note">Final prices: {sizesArr(form).map((s) => `${s.label} = ${money(sizePrice({ discountPercent: d }, s))}`).join(", ")}</p>}

        <label>Image
          <input className="field" type="file" accept="image/*" onChange={pick} disabled={uploading} />
        </label>
        <div className="upbox" role="status" aria-live="polite">
          {uploading ? <><Spinner /><span>Uploading image... this can take a few seconds. Please wait before saving.</span></>
            : form.imageUrl ? <><div className="thumb"><SmartImg src={form.imageUrl} alt="Preview" fallback={<span className="muted">Image could not be shown</span>} /></div><button type="button" className="btn ghost" onClick={() => set("imageUrl", "")}>Remove image</button></>
            : <span className="muted">No image yet. Choose a photo above, or paste an image URL below.</span>}
        </div>
        <label>or paste an image URL<input className="field" value={form.imageUrl.startsWith("data:") ? "(uploaded image)" : form.imageUrl} disabled={form.imageUrl.startsWith("data:")} onChange={(e) => set("imageUrl", e.target.value)} /></label>
        <label>Description (optional)<input className="field" value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={form.isPopular} onChange={(e) => set("isPopular", e.target.checked)} /> Show in the Popular section</label>
        <label className="check"><input type="checkbox" checked={form.isVisible} onChange={(e) => set("isVisible", e.target.checked)} /> Show on the website (Visible)</label>
        {msg && <p className={"note" + (/uploaded\.$/.test(msg) ? "" : " err")} role="status">{msg}</p>}
        <div className="row gap"><button className="btn" disabled={!ok}>{saving ? <><Spinner small /> Saving...</> : uploading ? "Uploading image..." : "Save"}</button><button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
      </form>
    );
  }
  return (
    <>
      <button className="btn big" onClick={() => open({ ...blank(sizes), categoryId: cats[0]?.id || "" })}>Add new product</button>
      {list === null ? <Loader /> : !list.length ? <p className="note">No products yet. Add your first product.</p> : list.map((p) => (
        <div className="panel row" key={p.id}>
          <div className="grow"><strong>{p.name}</strong><div className="muted">{getSizes(p).map((s) => `${s.label}: ${money(sizePrice(p, s))}${s.inStock === false || s.stock === 0 ? " (out of stock)" : s.stock != null ? ` (stock ${s.stock})` : ""}`).join(" · ")}{p.discountPercent > 0 ? ` (${p.discountPercent}% off)` : ""}{!p.isVisible ? " · Hidden" : ""}</div></div>
          <button className="btn ghost" onClick={() => toggle(p)}>{p.isVisible ? "Hide" : "Show"}</button>
          <button className="btn ghost" onClick={() => open({ ...p, imageUrl: p.imageUrl || "", description: p.description || "", sizes: toRows(p, sizes) })}>Edit</button>
          <button className="btn danger" onClick={() => del(p)}>Delete</button>
        </div>
      ))}
    </>
  );
}

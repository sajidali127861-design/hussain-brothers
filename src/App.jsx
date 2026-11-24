import React, { createContext, useContext, useEffect, useState } from "react";
import config from "./config";
import { getMode, applyTheme } from "./theme";
import { Home, Products } from "./Shop";
import { Cart } from "./Cart";
import { t, dir, lang } from "./text";
import { ErrorBoundary } from "./ui";
import { Admin } from "./Admin";
import { sizePrice, shop, loadShop, whatsappReady } from "./data";

/* ---------- cart ---------- */
const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);
function CartProvider({ children }) {
  const [items, setItems] = useState(() => { try { return (JSON.parse(localStorage.getItem("shop_cart")) || []).filter((i) => i.key); } catch { return []; } });
  useEffect(() => { try { localStorage.setItem("shop_cart", JSON.stringify(items)); } catch {} }, [items]);
  const add = (p, size) => {
    const key = p.id + "|" + size.label;
    const max = size.stock == null ? null : size.stock;
    const cur = items.find((i) => i.key === key)?.qty || 0;
    if (max != null && cur >= max) return false;
    setItems((l) => {
      const f = l.find((i) => i.key === key);
      return f ? l.map((i) => (i.key === key ? { ...i, qty: i.qty + 1, max } : i)) : [...l, { key, id: p.id, name: p.name, size: size.label, imageUrl: p.imageUrl, price: sizePrice(p, size), qty: 1, max }];
    });
    return true;
  };
  const setQty = (key, qty) => setItems((l) => (qty <= 0 ? l.filter((i) => i.key !== key) : l.map((i) => (i.key === key ? { ...i, qty: i.max != null ? Math.min(qty, i.max) : qty } : i))));
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  return <CartCtx.Provider value={{ items, add, setQty, clear, count, total }}>{children}</CartCtx.Provider>;
}

/* ---------- tiny hash router ---------- */
function useRoute() {
  const get = () => location.hash.replace(/^#/, "") || "/";
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => { setR(get()); window.scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return r;
}

function Shell() {
  const route = useRoute();
  const { count } = useCart();
  const [mode, setMode] = useState(getMode);
  useEffect(() => { applyTheme(mode); }, [mode]);
  const [loaded, setLoaded] = useState(false);
  const [, bump] = useState(0);
  useEffect(() => {
    const refresh = () => { document.title = shop.name; bump((n) => n + 1); };
    loadShop().finally(() => { setLoaded(true); refresh(); });
    addEventListener("shop-updated", refresh);
    return () => removeEventListener("shop-updated", refresh);
  }, []);
  const [path, qs] = route.split("?");
  const isAdmin = path.startsWith("/admin");
  // Customer pages Urdu (RTL), admin panel left-to-right
  useEffect(() => { document.documentElement.dir = isAdmin ? "ltr" : dir; document.documentElement.lang = isAdmin ? "en" : lang; }, [isAdmin]);
  const nav = [["/", t.nav.home], ["/products", t.nav.products], ["/cart", `${t.nav.cart} (${count})`]];

  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <a className="brand" href="#/">{loaded ? shop.name : "\u00a0"}</a>
          <nav className="nav" aria-label="Main">
            {nav.map(([to, label]) => <a key={to} href={"#" + to} className={path === to ? "on" : ""}>{label}</a>)}
          </nav>
          <button className="icon" onClick={() => setMode(mode === "dark" ? "light" : "dark")} aria-label={t.mode.aria}>{mode === "dark" ? t.mode.toLight : t.mode.toDark}</button>
        </div>
      </header>
      <main className="wrap">
        {path === "/" && <Home />}
        {path === "/products" && <Products params={new URLSearchParams(qs || "")} />}
        {path === "/cart" && <Cart />}
        {isAdmin && <Admin />}
      </main>
      <footer className="foot">
        <div className="wrap">
          <strong>{loaded ? shop.name : "\u00a0"}</strong>
          {loaded && <><span>{shop.address}</span>
          <span>{shop.phone} · {shop.hours}</span></>}
          {whatsappReady() && <a href={`https://wa.me/${shop.whatsapp}`} target="_blank" rel="noreferrer">{t.footer.whatsapp}</a>}
          {!isAdmin && <a href="#/admin" className="quiet">{t.footer.admin}</a>}
        </div>
      </footer>
    </>
  );
}
export default function App() { return <ErrorBoundary><CartProvider><Shell /></CartProvider></ErrorBoundary>; }

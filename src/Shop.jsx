import React, { useEffect, useState } from "react";
import config from "./config";
import { listCategories, listProducts, getSizes, sizePrice, isAvail, isOffer, isNew, money } from "./data";
import { useCart } from "./App";
import { t } from "./text";
import { SkeletonGrid, SmartImg } from "./ui";

export function useCatalog() {
  const [state, set] = useState({ loading: true, cats: [], products: [], error: "" });
  useEffect(() => {
    Promise.all([listCategories(false), listProducts(false)])
      .then(([cats, products]) => {
        const ok = new Set(cats.map((c) => c.id)); // products of a hidden category are hidden too
        set({ loading: false, cats, products: products.filter((p) => ok.has(p.categoryId)), error: "" });
      })
      .catch(() => set({ loading: false, cats: [], products: [], error: t.common.loadError }));
  }, []);
  return state;
}

export function ProductCard({ p }) {
  const { add } = useCart();
  const sizes = getSizes(p);
  const inStock = isAvail;
  const [si, setSi] = useState(() => Math.max(sizes.findIndex(inStock), 0));
  const allOut = !sizes.some(inStock);
  const [note, setNote] = useState("");
  const size = sizes[si] || sizes[0];
  const price = sizePrice(p, size);
  return (
    <article className="card">
      <div className="pic">
        {p.imageUrl ? <SmartImg src={p.imageUrl} alt={p.name} fallback={<span className="ph" aria-hidden="true">{(p.name || "?").charAt(0)}</span>} /> : <span className="ph" aria-hidden="true">{(p.name || "?").charAt(0)}</span>}
        {isOffer(p) && <span className="tag offer">{t.shop.off(p.discountPercent)}</span>}
        {allOut ? <span className="tag out">{t.shop.soldTag}</span> : !isOffer(p) && isNew(p) && <span className="tag">{t.shop.fresh}</span>}
      </div>
      <div className="body">
        <h3>{p.name}</h3>
        {sizes.length > 1 && (
          <div className="sizes" role="radiogroup" aria-label={t.shop.pickSize}>
            {sizes.map((s, k) => (
              <button key={s.label} type="button" role="radio" aria-checked={k === si} aria-label={inStock(s) ? s.label : t.shop.outAria(s.label)} disabled={!inStock(s)} className={"size" + (k === si ? " on" : "") + (inStock(s) ? "" : " off")} onClick={() => setSi(k)}>{s.label}</button>
            ))}
          </div>
        )}
        {size.stock != null && size.stock > 0 && size.stock <= 5 && <small className="low">{t.shop.left(size.stock)}</small>}
        <div className="price">
          <strong>{money(price)}</strong>
          {isOffer(p) && <s>{money(size.price)}</s>}
          {sizes.length === 1 && <small>/ {size.label}</small>}
        </div>
        <button className="btn" disabled={!inStock(size)} onClick={() => { setNote(add(p, size) ? "added" : "max"); setTimeout(() => setNote(""), 1500); }}>
          {!inStock(size) ? t.shop.soldOut : note === "added" ? t.shop.added : note === "max" ? t.shop.maxInCart(size.stock) : t.shop.add}
        </button>
      </div>
    </article>
  );
}

function Section({ title, items, more }) {
  if (!items.length) return null;
  return (
    <section className="sec">
      <div className="sec-h"><h2>{title}</h2>{more && <a href={more}>{t.common.seeAll}</a>}</div>
      <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}

export function Home() {
  const { loading, cats, products, error } = useCatalog();
  const lim = config.home.sectionLimit;
  const hero = config.home.heroImage ? { backgroundImage: `linear-gradient(#0008,#0008), url(${config.home.heroImage})` } : {};
  return (
    <>
      <section className="hero" style={hero}>
        <h1>{config.home.heroTitle}</h1>
        <p>{config.home.heroText}</p>
        <a className="btn big" href="#/products">{t.home.cta}</a>
      </section>
      {loading && <SkeletonGrid />}
      {error && <p className="note err">{error}</p>}
      {!loading && !error && !products.length && <p className="note">{t.home.empty}</p>}
      {cats.length > 0 && (
        <section className="sec">
          <div className="sec-h"><h2>{t.home.categories}</h2></div>
          <div className="chips">{cats.map((c) => <a key={c.id} className="chip" href={"#/products?cat=" + c.id}>{c.name}</a>)}</div>
        </section>
      )}
      <Section title={t.home.popular} items={products.filter((p) => p.isPopular).slice(0, lim)} more="#/products" />
      <Section title={t.home.fresh} items={products.filter(isNew).slice(0, lim)} more="#/products" />
      <Section title={t.home.offers} items={products.filter(isOffer).slice(0, lim)} more="#/products" />
    </>
  );
}

export function Products({ params }) {
  const { loading, cats, products, error } = useCatalog();
  const cat = params.get("cat") || "";
  const [q, setQ] = useState("");
  const shown = products.filter((p) => (!cat || p.categoryId === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1 className="pg">{t.shop.title}</h1>
      <input className="field search" type="search" placeholder={t.shop.search} aria-label={t.shop.search} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        <a className={"chip" + (!cat ? " on" : "")} href="#/products">{t.shop.all}</a>
        {cats.map((c) => <a key={c.id} className={"chip" + (cat === c.id ? " on" : "")} href={"#/products?cat=" + c.id}>{c.name}</a>)}
      </div>
      {loading && <SkeletonGrid />}
      {error && <p className="note err">{error}</p>}
      {!loading && !error && !shown.length && <p className="note">{t.shop.none}</p>}
      <div className="grid">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </>
  );
}

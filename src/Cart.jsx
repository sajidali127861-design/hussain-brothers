import React, { useRef, useState } from "react";
import { useCart } from "./App";
import { t } from "./text";
import { shop, createOrder, makeOrderNo, emailOwner, whatsappLink, whatsappReady, money } from "./data";
import { Spinner } from "./ui";

export function Cart() {
  const { items, setQty, clear, total } = useCart();
  const [f, setF] = useState({ name: "", phone: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const draft = useRef({}); // keeps the same order number if the customer retries
  const waMode = shop.orderMode !== "database";
  const waOk = whatsappReady();
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function validate() {
    const digits = f.phone.replace(/\D/g, "");
    if (f.name.trim().length < 2) return setErr(t.cart.errName), null;
    if (digits.length < 10 || digits.length > 14) return setErr(t.cart.errPhone), null;
    if (f.address.trim().length < 8) return setErr(t.cart.errAddress), null;
    return digits;
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const digits = validate();
    if (digits == null) return;
    setErr("");
    const base = { name: f.name.trim(), phone: digits, address: f.address.trim(), note: f.note.trim(), items, total };

    if (waMode) {
      // WhatsApp-only: nothing is saved. The owner confirms the order on WhatsApp.
      if (!waOk) return setErr(t.cart.waNotReady);
      draft.current.orderNo = draft.current.orderNo || makeOrderNo();
      const order = { ...base, orderNo: draft.current.orderNo };
      window.open(whatsappLink(order), "_blank", "noopener"); // opened straight from the click so it is not blocked
      setDone({ order, mode: "whatsapp" });
      return;
    }

    setBusy(true);
    try {
      // 1) Save the order first. If this fails, nothing else happens.
      const order = await createOrder(base, draft.current);
      clear(); draft.current = {}; setDone({ order, mode: "database" });
      // 2) Then email the owner. If the email fails, the order is still saved.
      emailOwner(order);
    } catch (x) {
      setErr(x && x.message === "timeout" ? t.cart.errSlow : t.cart.errSave);
    } finally { setBusy(false); }
  }

  if (done && done.mode === "database") {
    return (
      <section className="panel center">
        <h1 className="pg">{t.cart.doneTitle}</h1>
        <p>{t.cart.doneNo}</p>
        <p className="big-no">{done.order.orderNo}</p>
        <p>{t.cart.doneNote}</p>
        {whatsappReady() && <>
          <a className="btn big" href={whatsappLink(done.order)} target="_blank" rel="noreferrer">{t.cart.confirmWa}</a>
          <p className="muted">{t.cart.waOptional}</p>
        </>}
        <a className="btn ghost" href="#/products">{t.cart.more2}</a>
      </section>
    );
  }
  if (done) {
    return (
      <section className="panel center">
        <h1 className="pg">{t.cart.sentTitle}</h1>
        <p>{t.cart.sentCode}</p>
        <p className="big-no">{done.order.orderNo}</p>
        <p>{t.cart.sentText}</p>
        <a className="btn big" href={whatsappLink(done.order)} target="_blank" rel="noreferrer">{t.cart.openWa}</a>
        <button className="btn ghost" onClick={() => setDone(null)}>{t.cart.backToCart}</button>
        <button className="btn ghost" onClick={() => { clear(); draft.current = {}; location.hash = "#/products"; }}>{t.cart.more2}</button>
      </section>
    );
  }
  if (!items.length) return (<><h1 className="pg">{t.cart.title}</h1><p className="note">{t.cart.empty} <a href="#/products">{t.cart.browse}</a></p></>);

  return (
    <>
      <h1 className="pg">{t.cart.title}</h1>
      <div className="two">
        <section className="panel">
          {items.map((i) => (
            <div className="line" key={i.key}>
              <div className="grow"><strong>{i.name} ({i.size})</strong><div className="muted">{money(i.price)}{i.max != null && i.qty >= i.max ? ` · ${t.cart.maxNote(i.max)}` : ""}</div></div>
              <div className="qty">
                <button className="sq" aria-label={t.cart.less} onClick={() => setQty(i.key, i.qty - 1)}>-</button>
                <span aria-live="polite">{i.qty}</span>
                <button className="sq" aria-label={t.cart.more} disabled={i.max != null && i.qty >= i.max} onClick={() => setQty(i.key, i.qty + 1)}>+</button>
              </div>
              <strong className="sum">{money(i.price * i.qty)}</strong>
            </div>
          ))}
          <div className="line total"><span>{t.cart.total}</span><strong>{money(total)}</strong></div>
        </section>
        <form className="panel" onSubmit={submit} noValidate>
          <h2>{t.cart.delivery}</h2>
          <label>{t.cart.name}<input className="field" value={f.name} onChange={up("name")} autoComplete="name" /></label>
          <label>{t.cart.phone}<input className="field" type="tel" inputMode="tel" value={f.phone} onChange={up("phone")} autoComplete="tel" /></label>
          <label>{t.cart.address}<textarea className="field" rows="3" value={f.address} onChange={up("address")} autoComplete="street-address" /></label>
          <label>{t.cart.note}<input className="field" value={f.note} onChange={up("note")} /></label>
          {waMode && !waOk && <p className="note err" role="alert">{t.cart.waNotReady}</p>}
          {err && <p className="note err" role="alert">{err}</p>}
          <button className="btn big" disabled={busy || (waMode && !waOk)}>
            {busy ? <><Spinner small /> {t.cart.busy}</> : waMode ? t.cart.sendWa : t.cart.order}
          </button>
          {waMode && <p className="muted small">{t.cart.waNote}</p>}
        </form>
      </div>
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { t } from "./text";

export const Spinner = ({ small }) => <span className={"spin" + (small ? " sm" : "")} aria-hidden="true" />;

export function Loader({ label = t.common.loading }) {
  return <div className="loader" role="status" aria-live="polite"><Spinner /><span className="sr">{label}</span></div>;
}

export function SkeletonGrid({ n = 4 }) {
  return (
    <div className="grid" aria-busy="true" role="status">
      <span className="sr">{t.common.loading}</span>
      {Array.from({ length: n }, (_, i) => (
        <div className="card" key={i} aria-hidden="true">
          <div className="pic skel" />
          <div className="body"><div className="skel sk-line" /><div className="skel sk-line short" /><div className="skel sk-btn" /></div>
        </div>
      ))}
    </div>
  );
}

// An image that shows a shimmer until it has loaded, and a fallback if it fails.
export function SmartImg({ src, alt, fallback = null }) {
  const [state, setState] = useState("loading");
  const ref = useRef(null);
  useEffect(() => { setState("loading"); const el = ref.current; if (el && el.complete && el.naturalWidth > 0) setState("ok"); }, [src]);
  if (state === "error") return fallback;
  return (
    <span className="simg">
      {state === "loading" && <span className="skel fill" aria-hidden="true" />}
      <img ref={ref} src={src} alt={alt} loading="lazy" onLoad={() => setState("ok")} onError={() => setState("error")} style={{ opacity: state === "ok" ? 1 : 0 }} />
    </span>
  );
}

// Shows a friendly message instead of a blank screen if something unexpected breaks.
export class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="wrap"><section className="panel center">
        <h1 className="pg">{t.common.errorTitle}</h1>
        <p>{t.common.errorText}</p>
        <button className="btn big" onClick={() => location.reload()}>{t.common.reload}</button>
      </section></div>
    );
  }
}

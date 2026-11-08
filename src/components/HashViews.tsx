"use client";
import { useEffect, useState, type ReactNode } from "react";

/** Shows one of several views based on location.hash. All stay mounted so state survives. */
export function HashViews({ views }: { views: Record<string, ReactNode> }) {
  const first = Object.keys(views)[0];
  const [current, setCurrent] = useState(first);
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace(/^#/, "");
      setCurrent(h in views ? h : first);
      window.scrollTo({ top: 0 });
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [views, first]);
  return (
    <>
      {Object.entries(views).map(([id, node]) => (
        <div key={id} hidden={id !== current}>
          {node}
        </div>
      ))}
    </>
  );
}

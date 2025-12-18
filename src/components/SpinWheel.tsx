import { useMemo, useRef, useState } from "react";

type SpinWheelProps = {
  items: string[];
  size?: number;
  spinDuration?: number;
  onSelect?: (item: string, index: number) => void;
  persistKey?: string;
  showLegend?: boolean;
  legendPosition?: "right" | "top";
};

export default function SpinWheel({ items, size = 320, spinDuration = 2500, onSelect, persistKey = "spinwheel:enabled", showLegend = true, legendPosition = "right" }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const selectedRef = useRef<number | null>(null);
  const activeItems = useMemo(() => items.filter((t) => (enabledMap[t] ?? true)), [items, enabledMap]);
  const angle = useMemo(() => (activeItems.length > 0 ? 360 / activeItems.length : 0), [activeItems.length]);
  const sectorBackground = useMemo(() => {
    if (!activeItems.length || angle === 0) return "";
    const colors = [
      "rgba(255,240,240,0.85)",
      "rgba(240,255,240,0.85)",
      "rgba(240,244,255,0.85)",
      "rgba(255,249,230,0.85)",
    ];
    const m = activeItems.length;
    const seq: string[] = new Array(m);
    for (let i = 0; i < m; i++) seq[i] = colors[i % 4];
    if (m > 1 && m % 4 === 1) {
      const first = seq[0];
      const prev = seq[m - 2];
      const alt = colors.find((c) => c !== first && c !== prev);
      if (alt) seq[m - 1] = alt;
    }
    const parts: string[] = [];
    for (let i = 0; i < m; i++) {
      const start = i * angle;
      const end = (i + 1) * angle;
      parts.push(`${seq[i]} ${start}deg ${end}deg`);
    }
    return `conic-gradient(${parts.join(", ")})`;
  }, [activeItems.length, angle]);

  const activeIndexMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (let i = 0; i < activeItems.length; i++) m[activeItems[i]] = i;
    return m;
  }, [activeItems]);

  function loadPersist() {
    try {
      const raw = localStorage.getItem(persistKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as Record<string, boolean> | null;
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  function savePersist(map: Record<string, boolean>) {
    try {
      localStorage.setItem(persistKey, JSON.stringify(map));
    } catch {}
  }

  function initEnabled() {
    const persisted = loadPersist();
    if (persisted) {
      const next: Record<string, boolean> = {};
      for (const t of items) next[t] = persisted[t] ?? true;
      setEnabledMap(next);
    } else {
      const next: Record<string, boolean> = {};
      for (const t of items) next[t] = true;
      setEnabledMap(next);
    }
  }

  function ensureSyncWithItems() {
    setEnabledMap((prev) => {
      const next: Record<string, boolean> = {};
      for (const t of items) next[t] = prev[t] ?? true;
      return next;
    });
  }

  function toggleItem(t: string) {
    if (spinning) return;
    setEnabledMap((prev) => {
      const next = { ...prev, [t]: !(prev[t] ?? true) };
      savePersist(next);
      return next;
    });
  }

  if (Object.keys(enabledMap).length === 0 && items.length) initEnabled();
  if (Object.keys(enabledMap).length && items.some((t) => enabledMap[t] === undefined)) ensureSyncWithItems();

  function spin() {
    if (!activeItems.length || spinning) return;
    const targetIndex = Math.floor(Math.random() * activeItems.length);
    selectedRef.current = targetIndex;
    const base = ((rotation % 360) + 360) % 360;
    const spins = 6;
    const targetAngle = -(targetIndex + 0.5) * angle;
    const delta = targetAngle - base;
    const finalRotation = rotation + spins * 360 + delta;
    setSpinning(true);
    setRotation(finalRotation);
  }

  function handleTransitionEnd() {
    if (!spinning) return;
    setSpinning(false);
    const idx = selectedRef.current;
    if (idx == null) return;
    const name = activeItems[idx];
    setSelectedName(name);
    onSelect?.(name, idx);
  }

  const radius = size / 2 - 20;
  const itemSize = 28;
  const tickInset = 0;
  const edgeMargin = 2;
  const labelRadius = Math.max(24, Math.round(radius - (itemSize / 2 + tickInset + edgeMargin)));
  const pointerLen = Math.max(24, radius - 8);

  return (
    <div className="wheel-root">
      <div className={`wheel-layout ${showLegend && legendPosition === "top" ? "wheel-layout-column" : ""}`}>
        {showLegend && legendPosition === "top" && (
          <div className="wheel-legend wheel-legend-top">
            {items.map((t, i) => {
              const activeIdx = activeIndexMap[t];
              const included = enabledMap[t] ?? true;
              return (
                <div key={i} className={`legend-row ${selectedName === t ? "legend-row-active" : ""}`}>
                  <input
                    type="checkbox"
                    className="legend-checkbox"
                    checked={included}
                    onChange={() => toggleItem(t)}
                    disabled={spinning}
                  />
                  <span className={`legend-no ${included ? "" : "legend-no-disabled"}`}>{included && activeIdx !== undefined ? activeIdx + 1 : "-"}</span>
                  <span className="legend-name">{t}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="wheel-area" style={{ width: size, height: size }}>
          <div
            className="wheel"
            style={{
              width: size,
              height: size,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${spinDuration}ms cubic-bezier(0.2, 0.7, 0, 1)` : "none",
              background: sectorBackground
                ? `${sectorBackground}, radial-gradient(circle at 50% 50%, rgba(255,255,255,0.28) 0%, rgba(250,250,250,0.16) 50%, rgba(244,244,244,0.08) 100%)`
                : `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.28) 0%, rgba(250,250,250,0.16) 50%, rgba(244,244,244,0.08) 100%)`,
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            <div className="wheel-inner">
              {activeItems.map((t, i) => (
                <div
                  key={i}
                  className={`wheel-item ${selectedName === t ? "wheel-item-active" : ""}`}
                  style={{ transform: `rotate(${i * angle + angle / 2}deg) translateY(-${labelRadius}px) rotate(${-(i * angle + angle / 2)}deg)` }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            
          </div>
          <div
            className="wheel-pointer-center"
            style={{ height: pointerLen, top: `calc(50% - ${pointerLen}px)` }}
          >
            <div className="wheel-pointer-head" />
          </div>
        </div>
        {showLegend && legendPosition === "right" && (
          <div className="wheel-legend">
            {items.map((t, i) => {
              const activeIdx = activeIndexMap[t];
              const included = enabledMap[t] ?? true;
              return (
                <div key={i} className={`legend-row ${selectedName === t ? "legend-row-active" : ""}`}>
                  <input
                    type="checkbox"
                    className="legend-checkbox"
                    checked={included}
                    onChange={() => toggleItem(t)}
                    disabled={spinning}
                  />
                  <span className={`legend-no ${included ? "" : "legend-no-disabled"}`}>{included && activeIdx !== undefined ? activeIdx + 1 : "-"}</span>
                  <span className="legend-name">{t}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button className="spin-btn" onClick={spin} disabled={spinning || items.length === 0}>开始</button>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import gsap from "gsap";
import "./DepthCarousel.css";

export interface DepthCarouselItem {
  image?: string;
  alt?: string;
}

export interface DepthCarouselProps {
  items?: (string | DepthCarouselItem)[];
  renderCard?: (index: number, isActive: boolean) => ReactNode;
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tint?: string;
  depth?: number;
  spread?: number;
  tilt?: number;
  tiltDirection?: "left" | "right";
  perspective?: number;
  visibleCards?: number;
  falloff?: number;
  blur?: number;
  duration?: number;
  ease?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  onChange?: (
    index: number,
    item: DepthCarouselItem | string | undefined,
  ) => void;
  className?: string;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);
const normalizeItem = (it: string | DepthCarouselItem): DepthCarouselItem =>
  typeof it === "string" ? { image: it, alt: "" } : it;

const DEFAULT_ITEMS: DepthCarouselItem[] = [
  { image: "https://picsum.photos/seed/depth1/800/1000", alt: "Slide 1" },
  { image: "https://picsum.photos/seed/depth2/800/1000", alt: "Slide 2" },
  { image: "https://picsum.photos/seed/depth3/800/1000", alt: "Slide 3" },
  { image: "https://picsum.photos/seed/depth4/800/1000", alt: "Slide 4" },
  { image: "https://picsum.photos/seed/depth5/800/1000", alt: "Slide 5" },
  { image: "https://picsum.photos/seed/depth6/800/1000", alt: "Slide 6" },
];

interface Cfg {
  count: number;
  depth: number;
  spread: number;
  tilt: number;
  tiltDirection: string;
  visibleCards: number;
  falloff: number;
  blur: number;
  duration: number;
  ease: string;
  loop: boolean;
  cardWidth: number;
  autoplayDelay: number;
}

const DepthCarousel = ({
  items = DEFAULT_ITEMS,
  renderCard,
  cardWidth = 300,
  cardHeight = 380,
  radius = 18,
  tint = "#05060a",
  depth = 220,
  spread = 90,
  tilt = 22,
  tiltDirection = "right",
  perspective = 1400,
  visibleCards = 4,
  falloff = 0.2,
  blur = 6,
  duration = 700,
  ease = "power3.out",
  autoplay = false,
  autoplayDelay = 3200,
  loop = true,
  showControls = true,
  showIndicators = true,
  onChange,
  className = "",
}: DepthCarouselProps) => {
  const data = useMemo(
    () => (Array.isArray(items) ? items : []).map(normalizeItem),
    [items],
  );
  const count = renderCard
    ? Array.isArray(items)
      ? items.length
      : 0
    : data.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const posRef = useRef(0);
  const focusRef = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const scaleRef = useRef(1);
  const cfgRef = useRef<Cfg>({} as Cfg);
  const onChangeRef = useRef(onChange);
  const dragRef = useRef<{
    x: number;
    startPos: number;
    lastX: number;
    lastT: number;
    v: number;
    moved: boolean;
    id: number;
  } | null>(null);
  const wheelTimerRef = useRef<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const reducedRef = useRef(false);

  const [active, setActive] = useState(0);
  onChangeRef.current = onChange;
  cfgRef.current = {
    count,
    depth,
    spread,
    tilt,
    tiltDirection,
    visibleCards,
    falloff,
    blur,
    duration,
    ease,
    loop,
    cardWidth,
    autoplayDelay,
  };

  const layout = useCallback((pos: number) => {
    const cfg = cfgRef.current;
    const n = cfg.count;
    if (!n) return;
    const dir = cfg.tiltDirection === "left" ? -1 : 1;
    const sc = scaleRef.current;

    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      let d = i - pos;
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }
      const az = Math.abs(d);
      const shown = az <= cfg.visibleCards + 0.6;

      // Skip off-screen cards completely to save GPU & CPU cycles
      if (!shown) {
        if (el.style.opacity !== "0") {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          el.style.visibility = "hidden";
        }
        continue;
      }

      el.style.visibility = "visible";
      // Smooth cosine depth arc without the harsh V-ridge at center
      const depthArc =
        az <= 1 ? 1 - Math.cos(az * Math.PI * 0.5) : 1 + (az - 1) * 0.95;
      const tz = -cfg.depth * depthArc;
      const tx = d * cfg.spread;
      const ry =
        dir *
        cfg.tilt *
        Math.sin(Math.min(az, 1) * (Math.PI * 0.5)) *
        (d >= 0 ? 1 : -1);
      const cardScale = sc * Math.max(0.8, 1 - az * 0.05);
      const opacity =
        az <= 0.05
          ? 1
          : Math.max(0, 1 - Math.pow(az / (cfg.visibleCards + 0.5), 2) * 0.32);
      const zi = Math.round(2000 - az * 50);

      el.style.transform = `translate3d(-50%,-50%,0) scale(${cardScale.toFixed(4)}) translateX(${tx.toFixed(1)}px) translateZ(${tz.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(zi);
      el.style.pointerEvents = opacity > 0.05 ? "auto" : "none";
      const ov = overlayRefs.current[i];
      if (ov) {
        ov.style.opacity = clamp(az * cfg.falloff * 0.85, 0, 0.86).toFixed(3);
      }
    }
  }, []);

  const notify = useCallback(
    (idx: number) => {
      setActive(idx);
      onChangeRef.current?.(idx, data[idx]);
    },
    [data],
  );

  const tweenTo = useCallback(
    (target: number, animate: boolean) => {
      tweenRef.current?.kill();
      const cfg = cfgRef.current;
      const proxy = { p: posRef.current };
      const delta = Math.abs(target - posRef.current);
      const dur =
        animate && !reducedRef.current
          ? Math.max(
              0.42,
              Math.min(0.85, (cfg.duration / 1000) * (0.65 + delta * 0.35)),
            )
          : 0;
      tweenRef.current = gsap.to(proxy, {
        p: target,
        duration: dur,
        ease: cfg.ease || "power2.out",
        onUpdate: () => {
          posRef.current = proxy.p;
          layout(proxy.p);
          const n = cfg.count;
          if (n > 0) {
            const currentIdx = cfg.loop
              ? ((Math.round(proxy.p) % n) + n) % n
              : clamp(Math.round(proxy.p), 0, n - 1);
            if (currentIdx !== focusRef.current) {
              focusRef.current = currentIdx;
              notify(currentIdx);
            }
          }
        },
        onComplete: () => {
          const n = cfg.count;
          if (n > 0) posRef.current = ((posRef.current % n) + n) % n;
          layout(posRef.current);
          if (n > 0) {
            const finalIdx = cfg.loop
              ? ((Math.round(posRef.current) % n) + n) % n
              : clamp(Math.round(posRef.current), 0, n - 1);
            if (finalIdx !== focusRef.current) {
              focusRef.current = finalIdx;
              notify(finalIdx);
            }
          }
        },
      });
    },
    [layout, notify],
  );

  const setFocus = useCallback(
    (rawIndex: number, animate = true) => {
      const cfg = cfgRef.current;
      const n = cfg.count;
      if (!n) return;
      const idx = cfg.loop
        ? ((rawIndex % n) + n) % n
        : clamp(rawIndex, 0, n - 1);
      let delta = idx - posRef.current;
      if (cfg.loop && n > 1) {
        delta = ((delta % n) + n) % n;
        if (delta > n / 2) delta -= n;
      }
      tweenTo(posRef.current + delta, animate);
      if (idx !== focusRef.current) {
        focusRef.current = idx;
        notify(idx);
      }
    },
    [tweenTo, notify],
  );

  const navigateBy = useCallback(
    (step: number) => setFocus(focusRef.current + step, true),
    [setFocus],
  );

  // ResizeObserver for scaling
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame: number;
    const ro = new ResizeObserver((entries) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const entry = entries[0];
        if (!entry) return;
        const w = entry.contentRect.width;
        const cfg = cfgRef.current;
        const needed = cfg.cardWidth + Math.abs(cfg.spread) * 2 + 60;
        scaleRef.current = clamp(w / needed, 0.4, 1);
        layout(posRef.current);
      });
    });
    ro.observe(root);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [layout]);

  // Wheel
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const cfg = cfgRef.current;
      const n = cfg.count;
      if (n < 2) return;
      e.preventDefault();
      tweenRef.current?.kill();
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = e.deltaMode === 1 ? raw * 18 : raw;
      const step = clamp(delta / (cfg.cardWidth * 1.2), -0.35, 0.35);
      posRef.current += step;
      layout(posRef.current);

      if (n > 0) {
        const currentIdx = cfg.loop
          ? ((Math.round(posRef.current) % n) + n) % n
          : clamp(Math.round(posRef.current), 0, n - 1);
        if (currentIdx !== focusRef.current) {
          focusRef.current = currentIdx;
          notify(currentIdx);
        }
      }

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(
        () => setFocus(Math.round(posRef.current), true),
        100,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [layout, setFocus, notify]);

  // Pointer drag
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (cfgRef.current.count < 2) return;
    tweenRef.current?.kill();
    dragRef.current = {
      x: e.clientX,
      startPos: posRef.current,
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
      moved: false,
      id: e.pointerId,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cfg = cfgRef.current;
      const stepPx = Math.max(cfg.cardWidth * 0.45 * scaleRef.current, 100);
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) {
        drag.moved = true;
        rootRef.current?.setPointerCapture(drag.id);
      }
      if (!drag.moved) return;
      const now = performance.now();
      const dt = Math.max(now - drag.lastT, 1);
      const instantV = (e.clientX - drag.lastX) / dt;
      drag.v = drag.v * 0.6 + instantV * 0.4;
      drag.lastX = e.clientX;
      drag.lastT = now;
      posRef.current = drag.startPos - dx / stepPx;
      layout(posRef.current);

      const n = cfg.count;
      if (n > 0) {
        const currentIdx = cfg.loop
          ? ((Math.round(posRef.current) % n) + n) % n
          : clamp(Math.round(posRef.current), 0, n - 1);
        if (currentIdx !== focusRef.current) {
          focusRef.current = currentIdx;
          notify(currentIdx);
        }
      }
    },
    [layout, notify],
  );

  const onPointerEnd = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;
    const flickThreshold = 0.35;
    let target: number;
    if (Math.abs(drag.v) > flickThreshold) {
      const dir = drag.v > 0 ? -1 : 1;
      target = Math.round(posRef.current + dir * 0.6);
    } else {
      target = Math.round(posRef.current);
    }
    setFocus(target, true);
  }, [setFocus]);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateBy(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateBy(1);
      }
    },
    [navigateBy],
  );

  const onCardClick = useCallback(
    (index: number) => {
      if (dragRef.current?.moved) return;
      setFocus(index, true);
    },
    [setFocus],
  );

  // Autoplay
  useEffect(() => {
    if (!autoplay || count < 2) return;
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedRef.current) return;
    const root = rootRef.current;
    let hovered = false,
      focused = false;
    const stop = () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    };
    const start = () => {
      stop();
      autoTimerRef.current = window.setInterval(
        () => {
          if (!hovered && !focused) navigateBy(1);
        },
        Math.max(cfgRef.current.autoplayDelay, 600),
      );
    };
    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    const onFocusIn = () => {
      focused = true;
    };
    const onFocusOut = () => {
      focused = false;
    };
    root?.addEventListener("mouseenter", onEnter);
    root?.addEventListener("mouseleave", onLeave);
    root?.addEventListener("focusin", onFocusIn);
    root?.addEventListener("focusout", onFocusOut);
    start();
    return () => {
      stop();
      root?.removeEventListener("mouseenter", onEnter);
      root?.removeEventListener("mouseleave", onLeave);
      root?.removeEventListener("focusin", onFocusIn);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [autoplay, autoplayDelay, count, navigateBy]);

  // Layout on prop changes
  useEffect(() => {
    layout(posRef.current);
  }, [
    layout,
    depth,
    spread,
    tilt,
    tiltDirection,
    visibleCards,
    falloff,
    blur,
    cardWidth,
    cardHeight,
    radius,
    count,
  ]);

  // Cleanup
  useEffect(
    () => () => {
      tweenRef.current?.kill();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    },
    [],
  );

  return (
    <div
      ref={rootRef}
      className={`depth-carousel ${className}`.trim()}
      style={{ "--dc-perspective": `${perspective}px` } as CSSProperties}
      role="group"
      aria-roledescription="carousel"
      aria-label="Job opportunities"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <div className="depth-carousel__stage">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="depth-carousel__card"
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: radius,
              background: "transparent",
            }}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={active !== i}
            onClick={() => onCardClick(i)}
          >
            {renderCard ? (
              renderCard(i, active === i)
            ) : data[i]?.image ? (
              <>
                <img
                  className="depth-carousel__img"
                  src={data[i].image}
                  alt={data[i].alt ?? ""}
                  draggable={false}
                />
                <span
                  className="depth-carousel__tint"
                  ref={(el) => {
                    overlayRefs.current[i] = el;
                  }}
                  style={{ background: tint }}
                />
              </>
            ) : null}
          </div>
        ))}
      </div>

      {showControls && count > 1 && (
        <>
          <button
            type="button"
            className="depth-carousel__arrow depth-carousel__arrow--prev"
            aria-label="Previous slide"
            onClick={() => navigateBy(-1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="depth-carousel__arrow depth-carousel__arrow--next"
            aria-label="Next slide"
            onClick={() => navigateBy(1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      {showIndicators && count > 1 && (
        <div
          className="depth-carousel__dots"
          role="tablist"
          aria-label="Slides"
        >
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Go to slide ${i + 1}`}
              className={`depth-carousel__dot${active === i ? " is-active" : ""}`}
              onClick={() => setFocus(i, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DepthCarousel;
import { useEffect, useRef } from "react";
import { useMotionValue, animate } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

// Bottom-nav tabs aren't a navigation "stack" — there's nothing meaningful to
// swipe back to from them, so the gesture only activates on drilled-down screens.
const ROOT_PATHS = ["/home", "/expenses", "/goals", "/ai"];

const EDGE_ZONE = 28; // px from the screen's right edge (RTL "start") a swipe must begin in
const COMMIT_DISTANCE = 90; // px dragged left before the swipe commits to navigating back
const COMMIT_VELOCITY = 0.5; // px/ms — a fast flick commits even if short

interface TrackingState {
  startX: number;
  startY: number;
  startTime: number;
  active: boolean;
  lastDx: number;
}

export function useSwipeBack<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const x = useMotionValue(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const el = ref.current;
    if (!el || ROOT_PATHS.includes(location.pathname)) return;

    let tracking: TrackingState | null = null;

    function onTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-swipe-ignore]")) return;
      const t = e.touches[0];
      if (t.clientX < window.innerWidth - EDGE_ZONE) return;
      tracking = { startX: t.clientX, startY: t.clientY, startTime: Date.now(), active: false, lastDx: 0 };
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - tracking.startX;
      const dy = t.clientY - tracking.startY;
      if (!tracking.active) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx) || dx > 0) {
          tracking = null;
          return;
        }
        tracking.active = true;
      }
      tracking.lastDx = dx;
      x.set(Math.max(dx, -window.innerWidth));
    }

    function onTouchEnd() {
      if (!tracking || !tracking.active) {
        tracking = null;
        return;
      }
      const elapsed = Date.now() - tracking.startTime;
      const distance = -tracking.lastDx;
      const velocity = distance / Math.max(elapsed, 1);
      if (distance > COMMIT_DISTANCE || velocity > COMMIT_VELOCITY) {
        animate(x, -window.innerWidth, { duration: 0.18, ease: "easeIn" }).then(() => {
          navigate(-1);
          x.set(0);
        });
      } else {
        animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
      }
      tracking = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [navigate, location.pathname, x]);

  return { ref, x };
}

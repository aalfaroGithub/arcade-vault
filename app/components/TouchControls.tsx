"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { TOUCH_CONFIG } from "../data/touchControls";

const REPEAT_MS = 120;

function subscribeToTouch() {
  return () => {};
}

function getTouchSnapshot() {
  return (
    window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window
  );
}

function getTouchServerSnapshot() {
  return false;
}

const ARROW_CODE: Record<"up" | "down" | "left" | "right", string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

const ARROW_PATH: Record<"up" | "down" | "left" | "right", string> = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
};

const ARROW_AREA: Record<"up" | "down" | "left" | "right", string> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
};

/**
 * Los listeners táctiles sintéticos de React (onTouchStart/onTouchEnd) se
 * registran como passive en el root, así que e.preventDefault() dentro de
 * ellos no funciona y genera un warning en consola. Se usan listeners
 * nativos con { passive: false } para poder bloquear el scroll/zoom.
 */
function useTouchButton(
  code: string,
  repeat: boolean,
  preventDefault: boolean,
) {
  const ref = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const dispatch = (type: "keydown" | "keyup") => {
      window.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
    };

    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const onStart = (e: TouchEvent) => {
      if (preventDefault) e.preventDefault();
      dispatch("keydown");
      if (repeat) {
        clear();
        intervalRef.current = setInterval(() => dispatch("keydown"), REPEAT_MS);
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (preventDefault) e.preventDefault();
      clear();
      dispatch("keyup");
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onEnd, { passive: false });
    el.addEventListener("contextmenu", onContextMenu);

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("contextmenu", onContextMenu);
      clear();
    };
  }, [code, repeat, preventDefault]);

  return ref;
}

function DpadButton({
  dir,
  repeat,
}: {
  dir: "up" | "down" | "left" | "right";
  repeat: boolean;
}) {
  const ref = useTouchButton(ARROW_CODE[dir], repeat, true);
  return (
    <button
      ref={ref}
      type="button"
      className="touch-dbtn"
      style={{ gridArea: ARROW_AREA[dir] }}
      aria-label={dir}
    >
      <svg className="touch-dbtn-arrow" viewBox="0 0 24 24" aria-hidden>
        <path d={ARROW_PATH[dir]} fill="currentColor" />
      </svg>
    </button>
  );
}

function ActionButton({
  code,
  label,
  className,
}: {
  code: string;
  label: string;
  className: string;
}) {
  const ref = useTouchButton(code, true, true);
  return (
    <button ref={ref} type="button" className={className} aria-label={label}>
      <span className="touch-abtn-ring" aria-hidden />
      <span className="touch-abtn-letter">{label}</span>
    </button>
  );
}

export default function TouchControls({ gameId }: { gameId: string }) {
  const config = TOUCH_CONFIG[gameId];
  const isTouch = useSyncExternalStore(
    subscribeToTouch,
    getTouchSnapshot,
    getTouchServerSnapshot,
  );

  if (!config || !isTouch) return null;

  const dpadRepeat = config.dpadRepeat ?? true;
  const arrows = (
    Object.keys(config.dpad) as (keyof typeof config.dpad)[]
  ).filter((dir) => config.dpad[dir]);

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {arrows.map((dir) => (
          <DpadButton key={dir} dir={dir} repeat={dpadRepeat} />
        ))}
        <div className="touch-dpad-hub" aria-hidden>
          <span className="touch-dpad-hub-gem" />
        </div>
      </div>
      {(config.buttonA || config.buttonB) && (
        <div className="touch-actions">
          {config.buttonB && (
            <ActionButton
              code={config.buttonB.code}
              label={config.buttonB.label}
              className="touch-abtn magenta"
            />
          )}
          {config.buttonA && (
            <ActionButton
              code={config.buttonA.code}
              label={config.buttonA.label}
              className="touch-abtn yellow"
            />
          )}
        </div>
      )}
    </div>
  );
}

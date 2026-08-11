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

export default function TouchControls({ gameId }: { gameId: string }) {
  const config = TOUCH_CONFIG[gameId];
  const isTouch = useSyncExternalStore(
    subscribeToTouch,
    getTouchSnapshot,
    getTouchServerSnapshot,
  );
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>(
    {},
  );

  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, []);

  if (!config || !isTouch) return null;

  const press = (code: string) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code }));
    if (intervalsRef.current[code]) clearInterval(intervalsRef.current[code]);
    intervalsRef.current[code] = setInterval(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code }));
    }, REPEAT_MS);
  };

  const release = (code: string) => {
    if (intervalsRef.current[code]) {
      clearInterval(intervalsRef.current[code]);
      delete intervalsRef.current[code];
    }
    window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code }));
  };

  const arrows = (
    Object.keys(config.dpad) as (keyof typeof config.dpad)[]
  ).filter((dir) => config.dpad[dir]);

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {arrows.map((dir) => (
          <button
            key={dir}
            type="button"
            className="touch-dbtn"
            style={{ gridArea: ARROW_AREA[dir] }}
            onTouchStart={(e) => {
              e.preventDefault();
              press(ARROW_CODE[dir]);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              release(ARROW_CODE[dir]);
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              release(ARROW_CODE[dir]);
            }}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={dir}
          >
            <svg className="touch-dbtn-arrow" viewBox="0 0 24 24" aria-hidden>
              <path d={ARROW_PATH[dir]} fill="currentColor" />
            </svg>
          </button>
        ))}
        <div className="touch-dpad-hub" aria-hidden>
          <span className="touch-dpad-hub-gem" />
        </div>
      </div>
      {(config.buttonA || config.buttonB) && (
        <div className="touch-actions">
          {config.buttonB && (
            <button
              type="button"
              className="touch-abtn magenta"
              onTouchStart={(e) => {
                e.preventDefault();
                press(config.buttonB!.code);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                release(config.buttonB!.code);
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                release(config.buttonB!.code);
              }}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={config.buttonB.label}
            >
              <span className="touch-abtn-ring" aria-hidden />
              <span className="touch-abtn-letter">{config.buttonB.label}</span>
            </button>
          )}
          {config.buttonA && (
            <button
              type="button"
              className="touch-abtn yellow"
              onTouchStart={(e) => {
                e.preventDefault();
                press(config.buttonA!.code);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                release(config.buttonA!.code);
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                release(config.buttonA!.code);
              }}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={config.buttonA.label}
            >
              <span className="touch-abtn-ring" aria-hidden />
              <span className="touch-abtn-letter">{config.buttonA.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

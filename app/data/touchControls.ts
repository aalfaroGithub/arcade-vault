export interface TouchButtonConfig {
  code: string; // KeyboardEvent.code a despachar, p. ej. "Space", "ArrowUp"
  label: string; // texto corto del botón, p. ej. "DISPARO", "ROTAR", "CAER"
}

export interface TouchConfig {
  dpad: {
    up?: boolean;
    down?: boolean;
    left?: boolean;
    right?: boolean;
  };
  buttonA?: TouchButtonConfig;
  buttonB?: TouchButtonConfig;
}

export const TOUCH_CONFIG: Record<string, TouchConfig> = {
  asteroids: {
    dpad: { up: true, left: true, right: true },
    buttonA: { code: "Space", label: "DISPARO" },
  },
  caida: {
    dpad: { up: true, down: true, left: true, right: true },
    buttonA: { code: "ArrowUp", label: "ROTAR" },
    buttonB: { code: "Space", label: "CAER" },
  },
  "bloque-buster": {
    dpad: { left: true, right: true },
  },
  serpentina: {
    dpad: { up: true, down: true, left: true, right: true },
  },
};

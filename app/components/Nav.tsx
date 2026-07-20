"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

export interface AvUser {
  name: string;
}

const USER_KEY = "av_user";
const USER_CHANGE_EVENT = "av-user-change";

export function readAvUser(): AvUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function writeAvUser(user: AvUser | null) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
  window.dispatchEvent(new Event(USER_CHANGE_EVENT));
}

function subscribeToAvUser(callback: () => void) {
  window.addEventListener(USER_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(USER_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getAvUserSnapshot() {
  return localStorage.getItem(USER_KEY);
}

function getAvUserServerSnapshot() {
  return null;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rawUser = useSyncExternalStore(
    subscribeToAvUser,
    getAvUserSnapshot,
    getAvUserServerSnapshot,
  );
  const user = useMemo<AvUser | null>(() => {
    try {
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  }, [rawUser]);

  const isActive = (name: "biblioteca" | "salon" | "auth") => {
    if (name === "biblioteca") {
      return pathname === "/" || pathname.startsWith("/game");
    }
    if (name === "salon") return pathname.startsWith("/hall-of-fame");
    if (name === "auth") return pathname.startsWith("/auth");
    return false;
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleSignOut = () => writeAvUser(null);

  return (
    <>
      <nav className="av-nav">
        <div className="logo" onClick={() => go("/")}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </div>
        <div className="links">
          <Link href="/" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link
            href="/hall-of-fame"
            className={isActive("salon") ? "active" : ""}
          >
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <button className="btn auth-btn" onClick={() => go("/auth")}>
            Iniciar Sesión
          </button>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isActive("biblioteca") ? "active" : ""} onClick={() => setOpen(false)}>
          Biblioteca
        </Link>
        <Link
          href="/hall-of-fame"
          className={isActive("salon") ? "active" : ""}
          onClick={() => setOpen(false)}
        >
          Salón de la Fama
        </Link>
        <Link
          href="/auth"
          className={isActive("auth") ? "active" : ""}
          onClick={() => setOpen(false)}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}

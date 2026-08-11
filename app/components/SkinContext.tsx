"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_SKIN, type SkinId } from "../data/skins";

const SKIN_KEY = "av_skin";
const SKIN_CHANGE_EVENT = "av-skin-change";

function isSkinId(value: string | null): value is SkinId {
  return value === "clasico" || value === "neon" || value === "retro";
}

export function readAvSkin(): SkinId {
  const raw = localStorage.getItem(SKIN_KEY);
  return isSkinId(raw) ? raw : DEFAULT_SKIN;
}

export function writeAvSkin(skin: SkinId) {
  localStorage.setItem(SKIN_KEY, skin);
  document.documentElement.dataset.skin = skin;
  window.dispatchEvent(new Event(SKIN_CHANGE_EVENT));
}

function subscribeToAvSkin(callback: () => void) {
  window.addEventListener(SKIN_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SKIN_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getAvSkinSnapshot() {
  return localStorage.getItem(SKIN_KEY);
}

function getAvSkinServerSnapshot() {
  return null;
}

export function useAvSkin(): SkinId {
  const rawSkin = useSyncExternalStore(
    subscribeToAvSkin,
    getAvSkinSnapshot,
    getAvSkinServerSnapshot,
  );
  return useMemo<SkinId>(
    () => (isSkinId(rawSkin) ? rawSkin : DEFAULT_SKIN),
    [rawSkin],
  );
}

/** Siembra data-skin desde localStorage en el primer render del cliente,
 * antes de que React pinte nada, para evitar el flash de skin por defecto. */
export default function SkinBootstrap() {
  return (
    <script
       
      dangerouslySetInnerHTML={{
        __html: `try{var s=localStorage.getItem("${SKIN_KEY}");if(s==="neon"||s==="retro"||s==="clasico"){document.documentElement.dataset.skin=s;}}catch(e){}`,
      }}
    />
  );
}

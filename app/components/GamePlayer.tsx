"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Game } from "../data/games";
import { insertScore } from "@/lib/supabase/queries";
import { readAvUser } from "./Nav";
import Asteroids, { type AsteroidsHandle } from "./games/Asteroids";

const SCORES_KEY = "av_scores";

export default function GamePlayer({ game }: { game: Game }) {
  const isAsteroids = game.id === "asteroids";
  const asteroidsRef = useRef<AsteroidsHandle>(null);
  const [resetKey, setResetKey] = useState(0);

  const [simScore, setSimScore] = useState(0);
  const [asteroidsState, setAsteroidsState] = useState({
    score: 0,
    lives: 3,
    level: 1,
  });

  const score = isAsteroids ? asteroidsState.score : simScore;
  const lives = isAsteroids ? asteroidsState.lives : 3;
  const level = isAsteroids
    ? asteroidsState.level
    : Math.floor(simScore / 2500) + 1;

  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(() => readAvUser()?.name ?? "INVITADO");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isAsteroids || over || paused) return;
    const t = setInterval(
      () => setSimScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isAsteroids, over, paused]);

  const togglePause = () => {
    if (isAsteroids) {
      if (paused) asteroidsRef.current?.resume();
      else asteroidsRef.current?.pause();
    }
    setPaused((p) => !p);
  };

  const endGame = () => {
    if (isAsteroids) asteroidsRef.current?.forceGameOver();
    setOver(true);
  };

  const restart = () => {
    if (isAsteroids) {
      setResetKey((k) => k + 1);
      setAsteroidsState({ score: 0, lives: 3, level: 1 });
    } else {
      setSimScore(0);
    }
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  const saveScore = () => {
    if (isAsteroids) {
      insertScore(game.id, name, score).catch(() => {
        // fallo de red/Supabase; se ignora en este MVP
      });
      setSaved(true);
      return;
    }
    try {
      const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      all.push({ game: game.id, score, name, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {
      // localStorage no disponible; se ignora en este MVP visual
    }
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/game/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <Asteroids
              key={resetKey}
              ref={asteroidsRef}
              onStateChange={setAsteroidsState}
              onGameOver={(finalScore) => {
                setAsteroidsState((s) => ({ ...s, score: finalScore }));
                setOver(true);
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={saveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

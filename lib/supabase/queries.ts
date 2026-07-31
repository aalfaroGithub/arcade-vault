import { createClient } from "./client";
import type { ScoreRow } from "./types";

export async function insertScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, name, score });

  if (error) {
    throw error;
  }
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPlayerBest(
  gameId: string,
  name: string,
): Promise<ScoreRow | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .eq("name", name)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getGameStats(
  gameId: string,
): Promise<{ plays: number; best: number }> {
  const supabase = createClient();

  const [{ count, error: countError }, { data: topScore, error: bestError }] =
    await Promise.all([
      supabase
        .from("scores")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId),
      supabase
        .from("scores")
        .select("score")
        .eq("game_id", gameId)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (countError) {
    throw countError;
  }
  if (bestError) {
    throw bestError;
  }

  return { plays: count ?? 0, best: topScore?.score ?? 0 };
}

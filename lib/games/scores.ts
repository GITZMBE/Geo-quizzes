export async function submitScore(gameSlug: string, mode: string, value: number) {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameSlug, mode, value }),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit score: ${res.status}`);
  }
  return res.json();
}

export function formatScoreValue(type: "POINTS" | "TIME_MS", value: number) {
  if (type === "POINTS") return value.toLocaleString();

  const totalMs = value;
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = Math.floor(totalMs % 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

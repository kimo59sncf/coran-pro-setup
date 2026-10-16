import { createFileRoute } from "@tanstack/react-router";
import { NATIVE_ORIGINS } from "@/lib/audio-cors";

const MAX = 4 * 1024 * 1024;

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  if (!(NATIVE_ORIGINS as readonly string[]).includes(origin)) return { Vary: "Origin" };
  return { Vary: "Origin", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}

// Speech-to-text relay for the recitation coach. Audio is forwarded, never stored.
export const Route = createFileRoute("/api/public/recite-transcribe")({
  server: { handlers: {
    OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: cors(request) }),
    POST: async ({ request }) => {
      const h = cors(request);
      const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json" } });
      const len = Number(request.headers.get("content-length") ?? 0);
      if (len > MAX) return json({ error: "Audio trop long" }, 413);
      const key = process.env.LOVABLE_API_KEY;
      if (!key) return json({ error: "Service non configuré" }, 500);
      const form = await request.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File) || !file.size || file.size > MAX || !file.type.startsWith("audio/")) return json({ error: "Audio invalide" }, 400);
      const up = new FormData();
      up.append("model", "openai/gpt-transcribe");
      up.append("file", file, file.name || "recitation.wav");
      up.append("response_format", "json");
      up.append("language", "ar");
      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: up, signal: request.signal });
      const text = await res.text();
      if (!res.ok) {
        console.error("transcribe failed", res.status, text);
        let message = `Erreur ${res.status}`;
        try { message = JSON.parse(text).error?.message ?? JSON.parse(text).message ?? message; } catch { /* raw */ }
        return json({ error: message, status: res.status }, res.status);
      }
      try { return json({ text: JSON.parse(text).text ?? "" }, 200); } catch { return json({ text }, 200); }
    },
  } },
});

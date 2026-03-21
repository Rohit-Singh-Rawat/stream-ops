export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type Cue = {
  start: number;
  end: number;
  image: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export function parseVtt(vtt: string, baseUrl: string): Cue[] {
  const lines = vtt.split("\n").map((l) => l.trim()).filter(Boolean);
  const cues: Cue[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "WEBVTT") continue;

    if (lines[i].includes("-->")) {
      const [startStr, endStr] = lines[i].split(" --> ");
      const imageLine = lines[i + 1];

      const match = imageLine?.match(/(.*)#xywh=(\d+),(\d+),(\d+),(\d+)/);
      if (!match) continue;

      let imageUrl = match[1];

      // Automatically resolves relative paths (sprite.jpg), absolute paths (/videos/...), 
      // or full URLs perfectly against the VTT's location.
      try {
        imageUrl = new URL(imageUrl, baseUrl).href;
      } catch (e) {
        // Fallback if URL parsing fails for some reason
      }

      cues.push({
        start: parseTimestamp(startStr),
        end: parseTimestamp(endStr),
        image: imageUrl,
        x: Number(match[2]),
        y: Number(match[3]),
        w: Number(match[4]),
        h: Number(match[5]),
      });
    }
  }

  return cues;
}

function parseTimestamp(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return Number(hh) * 3600 + Number(mm) * 60 + parseFloat(ss);
  } else if (parts.length === 2) {
    const [mm, ss] = parts;
    return Number(mm) * 60 + parseFloat(ss);
  }
  return 0;
}

export function sanitizeFtsQuery(query: string): string {
  const cleaned = query.replace(/[^\p{L}\p{N}_\s]/gu, " ").trim();
  if (!cleaned) return "";
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.map((token) => `"${token}"*`).join(" ");
}

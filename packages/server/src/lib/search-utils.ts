// @unit journals.server.fts-query
// @summary Sanitize the FTS5 query
// @returns A prefix-matched MATCH expression, or an empty string
// @details Strips every character that is not a letter, number, underscore, or
// | space, then wraps each token as a quoted prefix term, so punctuation in a
// | pasted error message cannot break the FTS5 syntax.
export function sanitizeFtsQuery(query: string): string {
  const cleaned = query.replace(/[^\p{L}\p{N}_\s]/gu, " ").trim();
  if (!cleaned) return "";
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.map((token) => `"${token}"*`).join(" ");
}

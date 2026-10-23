/**
 * Extracts line-based context preview around matched words/patterns.
 * Supports multiple distinct matching clusters with context lines around each.
 */
export function extractContextWindow(
  content: string,
  query: string,
  contextLines = 2,
  maxClusters = 3,
): string {
  const lines = content.split("\n");
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ""))
    .filter((w) => w.length > 1);

  if (words.length === 0 || lines.length <= 5) {
    return lines.slice(0, 7).join("\n");
  }

  // Find all lines that match any search term
  const matchLineIndices: number[] = [];
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (words.some((w) => lower.includes(w))) {
      matchLineIndices.push(idx);
    }
  });

  if (matchLineIndices.length === 0) {
    return lines.slice(0, 5).join("\n");
  }

  // Group nearby matching lines into clusters
  const clusters: Array<{ start: number; end: number }> = [];
  for (const matchIdx of matchLineIndices) {
    const start = Math.max(0, matchIdx - contextLines);
    const end = Math.min(lines.length - 1, matchIdx + contextLines);

    const prevCluster = clusters[clusters.length - 1];
    if (prevCluster && start <= prevCluster.end + 1) {
      prevCluster.end = Math.max(prevCluster.end, end);
    } else {
      if (clusters.length >= maxClusters) break;
      clusters.push({ start, end });
    }
  }

  const sections: string[] = [];
  for (const cluster of clusters) {
    const clusterLines = lines.slice(cluster.start, cluster.end + 1).map((line, i) => {
      const lineNum = cluster.start + i + 1;
      const isMatch = matchLineIndices.includes(cluster.start + i);
      const prefix = isMatch ? ">" : " ";
      return `${prefix} ${String(lineNum).padStart(3, " ")} | ${line}`;
    });

    const header = cluster.start > 0 ? `... (${cluster.start} lines above) ...\n` : "";
    const footer =
      cluster.end < lines.length - 1
        ? `\n... (${lines.length - 1 - cluster.end} lines below) ...`
        : "";
    sections.push(header + clusterLines.join("\n") + footer);
  }

  return sections.join("\n---\n");
}

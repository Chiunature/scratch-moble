export function buildLocalPartCandidates(id: string, roots: string[]): string[] {
  const normalized = id.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();

  const relativePaths =
    lower.endsWith('.dat') || lower.endsWith('.ldr')
      ? [
          `parts/${lower}`,
          `p/${lower}`,
          `ldraw_parts/${lower}`,
          `ldraw_unofficial/${lower}`,
          lower,
        ]
      : [lower];

  const candidates: string[] = [];
  for (const root of roots) {
    const base = root.endsWith('/') ? root.slice(0, -1) : root;
    for (const relative of relativePaths) {
      candidates.push(`${base}/${relative}`);
    }
  }

  return candidates;
}

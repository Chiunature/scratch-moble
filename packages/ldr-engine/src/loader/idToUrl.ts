export type LdrPartResolver = {
  resolvePart: (id: string) => string[];
  resolveTexture: (name: string) => string;
};

export function createRemotePartResolver(partsBaseUrl: string): LdrPartResolver {
  const base = partsBaseUrl.endsWith('/') ? partsBaseUrl : `${partsBaseUrl}/`;
  const unofficialBase = base.replace(/\/official\/?$/, '/unofficial/');

  return {
    resolvePart(id: string) {
      const normalized = id.replace(/\\/g, '/');
      const lower = normalized.toLowerCase();

      if (!lower.endsWith('.dat') && !lower.endsWith('.ldr')) {
        return [`${base}${lower}`];
      }

      const candidates = [
        `${base}parts/${lower}`,
        `${base}p/${lower}`,
        `${base}${lower}`,
        `${base}models/${lower}`,
      ];

      if (unofficialBase !== base) {
        candidates.push(
          `${unofficialBase}parts/${lower}`,
          `${unofficialBase}p/${lower}`,
        );
      }

      return candidates;
    },
    resolveTexture(name: string) {
      return `${base}textures/${name.toLowerCase()}`;
    },
  };
}

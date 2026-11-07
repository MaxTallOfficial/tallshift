/** Next and Vite consume the same authored sources; ?raw is delivery data, never executed. */
export default {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typescript: { tsconfigPath: 'tsconfig.next.json' },
  webpack(config) {
    const raw = /(?:\?|&)raw(?:&|$)/;
    // Exclude source payloads from Next's JS/CSS loaders before asset/source handles them.
    const excludeRaw = rules => {
      for (const rule of rules) {
        if (!rule || typeof rule !== 'object') continue;
        if (rule.oneOf) excludeRaw(rule.oneOf);
        if (rule.rules) excludeRaw(rule.rules);
        if (rule.test && !rule.oneOf && !rule.rules) {
          const previous = rule.resourceQuery;
          rule.resourceQuery = previous ? { and: [previous, { not: [raw] }] } : { not: [raw] };
        }
      }
    };
    excludeRaw(config.module.rules);
    config.module.rules.push({ resourceQuery: raw, type: 'asset/source' });
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), clipboard-read=()' },
    ] }];
  },
};

/** Numeric foundations for the System specimen and its JSON handoff. */
export const typographyScale = Object.freeze({
  display: Object.freeze({ desktopSize: 48, mobileSize: 32, weight: 550, lineHeight: 1.2, trackingEm: -0.025, viTrackingEm: 0 }),
  h1: Object.freeze({ desktopSize: 40, mobileSize: 30, weight: 550, lineHeight: 1.2, trackingEm: -0.02, viTrackingEm: 0 }),
  h2: Object.freeze({ desktopSize: 28, mobileSize: 24, weight: 550, lineHeight: 1.3, trackingEm: -0.015, viTrackingEm: 0 }),
  h3: Object.freeze({ desktopSize: 20, mobileSize: 18, weight: 600, lineHeight: 1.4, trackingEm: -0.005, viTrackingEm: 0 }),
  body: Object.freeze({ desktopSize: 16, mobileSize: 16, weight: 400, lineHeight: 1.65, trackingEm: 0, viTrackingEm: 0 }),
  ui: Object.freeze({ desktopSize: 14, mobileSize: 14, weight: 600, lineHeight: 1.5, trackingEm: 0, viTrackingEm: 0 }),
  meta: Object.freeze({ desktopSize: 12, mobileSize: 12, weight: 400, lineHeight: 1.5, trackingEm: 0, viTrackingEm: 0 }),
});

export type TypographyRole = keyof typeof typographyScale;

export const spacingScale = Object.freeze([4, 8, 12, 16, 24, 32, 48, 64] as const);

export const layoutScale = Object.freeze({
  maxContentWidth: 1240,
  desktop: Object.freeze({ referenceWidth: 1440, minViewportWidth: 1024, columns: 12, minimumMargin: 32, gutter: 32 }),
  tablet: Object.freeze({ referenceWidth: 768, minViewportWidth: 768, columns: 8, minimumMargin: 24, gutter: 24 }),
  mobile: Object.freeze({ referenceWidth: 320, minViewportWidth: 0, columns: 4, minimumMargin: 16, gutter: 16 }),
});

export const radiusScale = Object.freeze({
  compact: 4,
  control: 8,
  card: 12,
  panel: 16,
});

export const systemScale = Object.freeze({
  fontFamily: 'Manrope',
  typographyMobileMaxWidth: 767,
  typography: typographyScale,
  spacing: spacingScale,
  layout: layoutScale,
  radius: radiusScale,
});

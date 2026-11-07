function luminance(hex: string): number {
  const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

/** Preserve the approved dark text where it passes; arbitrary accents need true white/black fallbacks. */
export function pressButtonTextColor(background: string): string {
  if (!/^#[\da-f]{6}$/i.test(background)) throw new TypeError('Button accent must be #RRGGBB');
  const backgroundLuminance = luminance(background);
  const ratio = (foreground: string) => {
    const foregroundLuminance = luminance(foreground);
    return (Math.max(backgroundLuminance, foregroundLuminance) + .05) / (Math.min(backgroundLuminance, foregroundLuminance) + .05);
  };
  if (ratio('#101713') >= 4.5) return '#101713';
  if (ratio('#FFFFFF') >= 4.5) return '#FFFFFF';
  return '#000000';
}

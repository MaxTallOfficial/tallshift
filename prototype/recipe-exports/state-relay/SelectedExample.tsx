'use client';

import { StateRelayDemo } from './Example';

const selectedConfig = {
  locale: 'en',
  motion: 'subtle',
  accent: '#3569ed',
  duration: 120,
} as const;

export default function SelectedExample() {
  return <StateRelayDemo {...selectedConfig} />;
}

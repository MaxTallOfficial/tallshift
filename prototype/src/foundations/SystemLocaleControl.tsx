import { SystemSegmentedControl } from './SystemSegmentedControl';
export type SystemLocale = 'en' | 'ru' | 'vi';
export interface SystemLocaleControlProps { locale: SystemLocale; onChange: (locale: SystemLocale) => void; label?: string; disabled?: boolean }
const labels = { en: 'Interface language', ru: 'Язык интерфейса', vi: 'Ngôn ngữ giao diện' };
export function SystemLocaleControl({ locale, onChange, label = labels[locale], disabled }: SystemLocaleControlProps) {
  return <SystemSegmentedControl label={label} value={locale} onChange={onChange} disabled={disabled} options={[
    { value: 'en', label: 'EN', ariaLabel: 'English', lang: 'en' }, { value: 'ru', label: 'RU', ariaLabel: 'Русский', lang: 'ru' }, { value: 'vi', label: 'VI', ariaLabel: 'Tiếng Việt', lang: 'vi' },
  ]} />;
}

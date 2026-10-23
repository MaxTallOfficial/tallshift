import { useId } from 'react';
import { words, type Locale } from '../study/copy';
import './typography-specimen.css';

export type TypographySpecimenProps = { locale: Locale };

const labels = {
  en: {
    title: 'Typography',
    intro: 'Manrope is selected for English, Russian and Vietnamese. See how the same type sizes work in all three languages.',
    selected: 'Manrope · selected',
    heading: 'Heading · 48 → 32 / 1.2 · 550',
    body: 'Body · 15 / 1.7 · 400',
    button: 'Button label · 14 / 600',
    characters: 'Characters & currencies',
  },
  ru: {
    title: 'Типографика',
    intro: 'Manrope выбран для английского, русского и вьетнамского. Здесь можно проверить одинаковые размеры текста на всех трёх языках.',
    selected: 'Manrope · выбран',
    heading: 'Заголовок · 48 → 32 / 1.2 · 550',
    body: 'Основной текст · 15 / 1.7 · 400',
    button: 'Подпись кнопки · 14 / 600',
    characters: 'Символы и валюты',
  },
  vi: {
    title: 'Kiểu chữ',
    intro: 'Đã chọn Manrope cho tiếng Anh, tiếng Nga và tiếng Việt. Xem cùng một cỡ chữ hiển thị trên cả ba ngôn ngữ.',
    selected: 'Manrope · đã chọn',
    heading: 'Tiêu đề · 48 → 32 / 1.2 · 550',
    body: 'Nội dung · 15 / 1.7 · 400',
    button: 'Nhãn nút · 14 / 600',
    characters: 'Ký tự và tiền tệ',
  },
};

const specimens = [
  { locale: 'en', name: 'English', code: 'EN', characters: 'Aa Bb Gg Rr · fi fl · 0 O · 1 l I' },
  { locale: 'ru', name: 'Русский', code: 'RU', characters: 'Аа Бб Дд Жж Лл Яя · ё й · 0 О о' },
  { locale: 'vi', name: 'Tiếng Việt', code: 'VI', characters: 'ă â đ ê ô ơ ư · ắ ằ ậ ễ ộ ợ ự ỹ' },
] as const;

export function TypographySpecimen({ locale }: TypographySpecimenProps) {
  const id = useId();
  const t = labels[locale];

  return <section className="fts-typography" aria-labelledby={`${id}-title`}>
    <header className="fts-intro">
      <div className="fts-title-row">
        <h2 id={`${id}-title`}>{t.title}</h2>
        <span className="fts-approved">{t.selected}</span>
      </div>
      <p>{t.intro}</p>
    </header>
    <div className="fts-options">
      {specimens.map(specimen => {
        const copy = words[specimen.locale];
        const specimenId = `${id}-${specimen.locale}`;
        return <article
          className="fts-option"
          data-font="Manrope"
          lang={specimen.locale}
          aria-labelledby={`${specimenId}-name`}
          key={specimen.locale}
        >
          <header className="fts-option-heading">
            <h3 id={`${specimenId}-name`}>{specimen.name}</h3>
            <span className="fts-language-code" aria-hidden="true">{specimen.code}</span>
          </header>
          <div className="fts-heading-sample">
            <p className="fts-sample-label" lang={locale}>{t.heading}</p>
            <p className="fts-headline" data-font="Manrope">
              <span>{copy.title}</span><span>{copy.second}</span>
            </p>
          </div>
          <div className="fts-body-sample">
            <p className="fts-sample-label" lang={locale}>{t.body}</p>
            <p className="fts-body">{copy.lead}</p>
          </div>
          <div className="fts-control-sample">
            <p className="fts-sample-label" lang={locale}>{t.button}</p>
            <span className="fts-button-preview">{copy.copyCode}</span>
          </div>
          <div className="fts-characters">
            <p className="fts-sample-label" lang={locale}>{t.characters}</p>
            <p>{specimen.characters}</p>
            <p className="fts-currencies">₫ $ € ₽ · 0123456789</p>
          </div>
        </article>;
      })}
    </div>
  </section>;
}

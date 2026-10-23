import { useId, type CSSProperties } from 'react';
import './system-segmented-control.css';

export interface SystemSegmentedOption<Value extends string = string> {
  value: Value;
  label: string;
  ariaLabel?: string;
  lang?: string;
  disabled?: boolean;
}

export interface SystemSegmentedControlProps<Value extends string = string> {
  label: string;
  value: Value;
  options: readonly SystemSegmentedOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

/** Single setting selection, using native radio semantics and keyboard behaviour. */
export function SystemSegmentedControl<Value extends string>({
  label, value, options, onChange, disabled = false, orientation = 'horizontal',
}: SystemSegmentedControlProps<Value>) {
  const id = useId();
  return <fieldset
    className="system-segmented"
    role="radiogroup"
    aria-labelledby={`${id}-label`}
    aria-orientation={orientation}
    aria-disabled={disabled || options.length === 0 || undefined}
    disabled={disabled || options.length === 0}
    data-orientation={orientation}
    style={{ '--system-segmented-count': Math.max(1, options.length) } as CSSProperties}
  >
    <legend id={`${id}-label`} className="system-segmented-label">{label}</legend>
    <div className="system-segmented-options">
      {options.map((option, index) => <label className="system-segmented-option" key={option.value} lang={option.lang}>
        <input
          type="radio"
          id={`${id}-${index}`}
          name={`${id}-choice`}
          value={option.value}
          aria-label={option.ariaLabel}
          checked={value === option.value}
          disabled={disabled || option.disabled}
          onChange={event => { if (event.target.checked) onChange(option.value); }}
        />
        <span className="system-segmented-choice">{option.label}</span>
      </label>)}
    </div>
  </fieldset>;
}

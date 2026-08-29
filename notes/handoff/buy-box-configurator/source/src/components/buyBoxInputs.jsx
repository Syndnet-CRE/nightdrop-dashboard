// Shared themed numeric inputs for the Buy Box Wizard.
// Used by BuyBoxPage23 (profile + owner) and BuyBoxPage5 (location).
// Visual styling lives in src/styles/buy-box-wizard-pages.css (.bb-input-shell, .bb-range).

import { useState } from 'react';
import { formatNumber, parseNumber } from '../lib/numberFormat';

/**
 * NumberField — themed numeric input.
 *
 * Shows raw digits while focused, formats (commas, etc.) on blur.
 * Form state always holds the raw digit string — payload serialization unchanged.
 *
 * kind: 'int' | 'money' | 'year' | 'decimal'
 */
export function NumberField({ value, onChange, kind = 'int', label, unit, placeholder = '' }) {
  const [focused, setFocused] = useState(false);
  const display = focused ? (value ?? '') : formatNumber(value, kind);
  const inputMode = kind === 'decimal' ? 'decimal' : 'numeric';
  return (
    <div className="bb-input-shell">
      {label && <span className="bb-input-label">{label}</span>}
      <input
        type="text"
        inputMode={inputMode}
        value={display}
        placeholder={placeholder}
        onChange={e => onChange(parseNumber(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {unit && <span className="bb-input-unit">{unit}</span>}
    </div>
  );
}

export function RangeInputs({ minV, maxV, onMin, onMax, unit, kind = 'int' }) {
  return (
    <div className="bb-range">
      <NumberField label="Min" value={minV} onChange={onMin} kind={kind} unit={unit} />
      <span className="bb-range-dash">—</span>
      <NumberField label="Max" value={maxV} onChange={onMax} kind={kind} unit={unit} />
    </div>
  );
}

export function SingleInput({ value, onChange, unit, kind = 'int', placeholder = '' }) {
  return <NumberField value={value} onChange={onChange} kind={kind} unit={unit} placeholder={placeholder} />;
}

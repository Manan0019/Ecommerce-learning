import UiIcon from '../common/UiIcon';
import TextField from './TextField';

/** One consistent quantity control for storefront product and cart views. */
export default function QuantityStepper({ value, onChange, min = 1, max = 99, disabled = false,
  id, label = 'Quantity', editable = false, compact = false, onMinDecrement, increaseDisabled = false }) {
  const minimum = Number.isFinite(min) ? min : 1;
  const maximum = Math.max(minimum, Number.isFinite(max) ? max : 99);
  const atMinimum = value <= minimum;
  const atMaximum = value >= maximum;
  return <div className={`nx-ui-quantity-stepper${compact ? ' nx-ui-quantity-stepper--compact' : ''}`}
    role="group" aria-label={label}>
    <button type="button" className="nx-ui-quantity-action" aria-label={`Decrease ${label.toLowerCase()}`}
      disabled={disabled || (atMinimum && !onMinDecrement)}
      onClick={() => atMinimum ? onMinDecrement?.() : onChange(Math.max(minimum, value - 1))}>
      <span aria-hidden="true" className="nx-ui-quantity-minus">−</span>
    </button>
    {editable
      ? <TextField id={id} type="number" min={minimum} max={maximum} step="1" inputMode="numeric"
          aria-label={label} className="nx-ui-quantity-value nx-ui-quantity-input" disabled={disabled}
          value={value} onChange={event => {
            const next = Number(event.target.value);
            if (event.target.value !== '' && Number.isInteger(next) && next >= minimum && next <= maximum) onChange(next);
          }}/>
      : <output className="nx-ui-quantity-value" aria-live="polite" aria-label={`${label}: ${value}`}>{value}</output>}
    <button type="button" className="nx-ui-quantity-action" aria-label={`Increase ${label.toLowerCase()}`}
      disabled={disabled || increaseDisabled || atMaximum} onClick={() => onChange(Math.min(maximum, value + 1))}>
      <UiIcon name="plus" size={16}/>
    </button>
  </div>;
}

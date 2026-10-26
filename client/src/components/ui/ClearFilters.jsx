import Button from './Button';
import UiIcon from '../common/UiIcon';
import { beginFilterScrollPreservation } from '../../services/filterScrollProtection';

/** Reset without replacing the focused button mid-click or forcing scroll-to-top.
 * Result lists may resize asynchronously; the shared scroll guard handles that.
 */
function clearWithoutScroll(button, onClear) {
  beginFilterScrollPreservation();
  const toolbar = button.closest('.nx32-active-filters,.catalogue-results-bar,.nx69-category-toolbar,.nx77-table-toolbar,.nx-cod-toolbar,.nx69-product-filters,.nx69-promotion-toolbar,.nx60-orders-toolbar') || button.parentElement;
  const stableFocus = toolbar?.querySelector('input:not([type="hidden"]),select');
  if (stableFocus instanceof HTMLElement && stableFocus !== button) stableFocus.focus({ preventScroll: true });
  else button.blur();
  onClear();
}

/** Hidden until a search or filter differs from its default. */
export default function ClearFilters({ active, onClear, label = 'Reset filters', className = '', disabled = false }) {
  if (!active) return null;
  return <Button type="button" variant="outline" aria-label={label} title={label} disabled={disabled}
    className={`nx-ui-clear-filters ${className}`.trim()} onClick={event => {
      event.preventDefault();
      clearWithoutScroll(event.currentTarget, onClear);
    }}>
    <UiIcon name="refresh-cw" size={16}/><span>Reset filters</span>
  </Button>;
}

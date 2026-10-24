import Button from './Button';

export default function Tabs({ label, className = '', children, onKeyDown, ...props }) {
  function navigate(event) {
    onKeyDown?.(event);
    if(event.defaultPrevented || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=[...event.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)')];
    const current=tabs.indexOf(document.activeElement);
    if(current<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next]?.focus();tabs[next]?.click();
  }
  return <div role="tablist" aria-label={label} className={`nx-ui-tabs ${className}`.trim()} onKeyDown={navigate} {...props}>{children}</div>;
}
export function Tab({ selected, ...props }) {
  const active=selected ?? props['aria-selected'];
  return <Button type="button" variant="ghost" role="tab" tabIndex={active?0:-1} aria-selected={active} {...props}/>;
}

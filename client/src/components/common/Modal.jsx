import UiIcon from "./UiIcon";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { guardNumberKey, guardNumericPaste, guardNumericBeforeInput, showInvalidField, clearValidField } from "../admin/formValidation";

/** Accessible, focused dialog. Save/cancel actions belong to the dialog's content. */
export default function Modal({ title, subtitle, children, onClose, size = "wide", closeDisabled = false }) {
  const headingId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(closeDisabled);
  useEffect(() => { onCloseRef.current = onClose; disabledRef.current = closeDisabled; }, [onClose, closeDisabled]);
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKeyDown(event) {
      if ([...document.querySelectorAll(".nx-modal")].at(-1) !== panelRef.current) return;
      if (event.key === "Escape" && !disabledRef.current) { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== "Tab" || !panelRef.current) return;
      const elements = [...panelRef.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.getClientRects().length > 0);
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);
  return createPortal(
    <div className="nx-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !closeDisabled) onClose(); }}>
      <section className={`nx-modal nx-modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={headingId} ref={panelRef}
        onKeyDownCapture={guardNumberKey} onPasteCapture={guardNumericPaste} onBeforeInputCapture={guardNumericBeforeInput}
        onInvalidCapture={showInvalidField} onInputCapture={clearValidField}>
        <header className="nx-modal-header">
          <div><h2 id={headingId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button ref={closeRef} type="button" className="nx-icon-button" aria-label="Close dialog" disabled={closeDisabled} onClick={onClose}><UiIcon name="x" size={18} /></button>
        </header>
        <div className="nx-modal-body">{children}</div>
      </section>
    </div>, document.body);
}

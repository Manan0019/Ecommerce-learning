/** Notify the route-wide unsaved-changes guard ONLY after a confirmed save.
 * Reuse from every admin form; never call in a validation or request-error path.
 */
export function markChangesSaved() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('nexora:changes-saved'));
}

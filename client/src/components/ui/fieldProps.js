export function fieldDescription(id, help, error, describedBy) {
  return [describedBy, help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}

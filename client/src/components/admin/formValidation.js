// Native form validation with consistent admin visuals. Numeric fields do not accept e, E, + or -.
export function guardNumberKey(event) {
  const target = event.target;
  if (target?.tagName !== "INPUT" || target.type !== "number") return;
  if (["e", "E", "+", "-"].includes(event.key) ||
      (event.key === "." && String(target.step || "1") === "1")) event.preventDefault();
}
export function showInvalidField(event) {
  const element = event.target;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(element?.tagName)) {
    element.dataset.invalid = "true";
    element.setAttribute("aria-invalid", "true");
  }
}
export function clearValidField(event) {
  const element = event.target;
  if (element?.validity?.valid) {
    delete element.dataset.invalid;
    element.removeAttribute("aria-invalid");
  }
}

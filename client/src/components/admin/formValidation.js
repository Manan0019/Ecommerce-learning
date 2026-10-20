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


// Enforce the same numeric grammar for typed, pasted and dropped values.
// Product titles, brands and SKUs deliberately remain alphanumeric (e.g. "iPhone 17").
export function guardNumericPaste(event) {
  const element = event.target;
  if (element?.tagName !== "INPUT" || element.type !== "number") return;
  const incoming = event.clipboardData?.getData("text") || "";
  if (!incoming) return;
  const step = element.step || "1";
  const grammar = step === "1" ? /^\d+$/ : /^(?:\d+)(?:\.\d+)?$/;
  if (!grammar.test(incoming.trim())) event.preventDefault();
}
export function guardNumericBeforeInput(event) {
  const element = event.target;
  if (element?.tagName !== "INPUT" || element.type !== "number") return;
  const value = event.data;
  if (!value || event.nativeEvent?.isComposing) return;
  const grammar = element.step === "1" || (!element.step || element.step === "") ? /^[0-9]+$/ : /^[0-9.]+$/;
  if (!grammar.test(value)) event.preventDefault();
}

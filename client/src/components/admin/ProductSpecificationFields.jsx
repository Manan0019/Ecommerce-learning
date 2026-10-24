import { Checkbox, FormField, Select, TextField } from "../ui/index";

function SpecificationInput({ field, value, onChange, disabled }) {
  const id = `specification-${field.key}`;
  if (field.type === "boolean") {
    return <FormField inline className="admin-boolean-field" htmlFor={id}>
      <Checkbox id={id} type="checkbox" checked={value === true} disabled={disabled}
        onChange={(event) => onChange(field.key, event.target.checked)} />
      <span>{field.label}</span>
    </FormField>;
  }

  if (field.type === "multiSelect") {
    return <FormField htmlFor={id}>{field.label}{field.unit ? ` (${field.unit})` : ""}
      <Select id={id} multiple value={Array.isArray(value) ? value : []} disabled={disabled}
        onChange={(event) => onChange(field.key,
          [...event.target.selectedOptions].map((option) => option.value))}>
        {field.options.map((option) => <option value={option} key={option}>{option}</option>)}
      </Select>
      <small>Hold Ctrl or Command to select multiple values.</small>
    </FormField>;
  }

  if (field.type === "select") {
    return <FormField htmlFor={id}>{field.label}
      <Select id={id} value={value ?? ""} disabled={disabled}
        onChange={(event) => onChange(field.key, event.target.value)}>
        <option value="">Select {field.label.toLowerCase()}</option>
        {field.options.map((option) => <option value={option} key={option}>{option}</option>)}
      </Select>
    </FormField>;
  }

  return <FormField htmlFor={id}>{field.label}{field.unit ? ` (${field.unit})` : ""}
    <TextField id={id} type={field.type === "number" ? "number" : "text"}
      value={value ?? ""} disabled={disabled}
      min={field.min} max={field.max} step={field.type === "number" ? "any" : undefined}
      maxLength={field.maxLength}
      onChange={(event) => onChange(field.key, event.target.value)} />
  </FormField>;
}

export default function ProductSpecificationFields({ definition, specifications, onChange, loading }) {
  if (loading) return <div className="admin-empty compact">Loading specification fields…</div>;
  if (!definition) return <p className="admin-spec-hint">Select a category to add validated technical specifications.</p>;

  return <section className="admin-specifications">
    <div className="admin-panel-heading">
      <div><h2>{definition.label} specifications</h2><p>Fields are selected from this product’s category and subcategory. Only completed fields are saved.</p></div>
    </div>
    {definition.groups.map((group) => <fieldset key={group.label}>
      <legend>{group.label}</legend>
      <div className="admin-spec-grid">
        {group.fields.map((field) => <SpecificationInput key={field.key} field={field}
          value={specifications[field.key]} onChange={onChange} disabled={loading} />)}
      </div>
    </fieldset>)}
  </section>;
}

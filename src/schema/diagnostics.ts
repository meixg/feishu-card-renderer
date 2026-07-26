export type ProtocolPath = `$${string}`;

export type DiagnosticClassification = "fatal" | "recoverable";

export type DiagnosticSeverity = "error" | "warning";

export type CardDiagnosticCode =
  | "invalid_root"
  | "invalid_schema"
  | "invalid_structure"
  | "update_multi_must_be_true"
  | "header_title_required"
  | "invalid_enum"
  | "unknown_tag"
  | "component_limit"
  | "container_depth"
  | "invalid_element_id"
  | "duplicate_element_id"
  | "form_name_required"
  | "duplicate_form_name"
  | "form_field_name_required"
  | "duplicate_form_field_name"
  | "root_only_component"
  | "forbidden_child"
  | "form_only_component"
  | "select_img_multi_requires_form"
  | "form_submit_required"
  | "form_chart_forbidden";

export type CardDiagnostic = {
  code: CardDiagnosticCode;
  classification: DiagnosticClassification;
  severity: DiagnosticSeverity;
  path: ProtocolPath;
  message: string;
};

export type ValidationResult<T> = {
  valid: boolean;
  fatal: boolean;
  card: T | null;
  diagnostics: CardDiagnostic[];
};

export function childPath(
  path: ProtocolPath,
  key: string | number,
): ProtocolPath {
  return typeof key === "number" ? `${path}[${key}]` : `${path}.${key}`;
}

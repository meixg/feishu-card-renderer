/*
 * Immutable review registry for every choice selector owned by the pre-#84
 * shared stylesheet. This is intentionally independent from the JSON
 * inventory so deleting or reclassifying a manifest entry cannot self-approve.
 */
export const EXPECTED_LEGACY_CHOICE_SELECTORS = Object.freeze({
  moved: Object.freeze([
    ".fcr-choice-chip",
    ".fcr-choice-chip button",
    ".fcr-choice-chip button:focus-visible",
    ".fcr-choice-chip-count",
    ".fcr-choice-chip>span",
    ".fcr-choice-chips",
    ".fcr-choice-control",
    ".fcr-choice-control:focus-within",
    ".fcr-choice-field>.fcr-ui-field-description",
    ".fcr-choice-field>.fcr-ui-field-error",
    ".fcr-choice-field>:is(.fcr-ui-label, .fcr-ui-field-label)",
    ".fcr-choice-field[data-invalid] .fcr-choice-control",
    ".fcr-choice-indicator",
    ".fcr-choice-list",
    ".fcr-choice-open",
    ".fcr-choice-open:focus-visible",
    ".fcr-choice-option",
    ".fcr-choice-option[data-disabled]",
    ".fcr-choice-option[data-highlighted]",
    ".fcr-choice-placeholder",
    ".fcr-choice-search",
    ".fcr-choice-search:focus-visible",
    ".fcr-choice-status",
    ".fcr-choice-value",
    ".fcr-ui-field.fcr-choice-field",
  ]),
  removed: Object.freeze([
    ".fcr-choice-control:has(button:disabled)",
    ".fcr-choice-done",
    ".fcr-choice-done:focus-visible",
    ".fcr-choice-field[data-invalid] .fcr-choice-trigger",
    ".fcr-choice-option[data-selected]",
    ".fcr-choice-popup",
    ".fcr-choice-positioner",
    ".fcr-choice-trigger",
    ".fcr-choice-trigger:disabled",
    ".fcr-choice-trigger:focus-visible",
  ]),
});

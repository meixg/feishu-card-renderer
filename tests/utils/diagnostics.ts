export type DiagnosticLike = {
  code: string;
  path?: string;
};

export function expectDiagnostic(
  diagnostics: readonly DiagnosticLike[],
  expected: DiagnosticLike,
): void {
  expect(diagnostics).toContainEqual(expect.objectContaining(expected));
}

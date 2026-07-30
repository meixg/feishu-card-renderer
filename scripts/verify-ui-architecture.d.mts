export function verifyUiArchitecture(): Promise<string[]>;
export function verifyUiProvenance(options?: {
  manifestRoot?: string;
  localRoot?: string;
}): Promise<string[]>;

export type ProvenanceVerificationInput = {
  document: unknown;
  integrity: string;
  packageName: string;
  repository: string;
  version: string;
};

export type VerifyBundle = (
  bundle: unknown,
  options: {
    certificateIssuer: string;
    certificateIdentityURI: string;
  },
) => Promise<void>;

export function verifiedProvenanceSource(
  input: ProvenanceVerificationInput,
  verifyBundle?: VerifyBundle,
): Promise<string>;

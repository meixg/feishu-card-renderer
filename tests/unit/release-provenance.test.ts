import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  verifiedProvenanceSource,
  type ProvenanceVerificationInput,
} from "../../scripts/release-provenance.mjs";

const packageName = "feishu-card-renderer";
const version = "0.1.0";
const repository = "meixg/feishu-card-renderer";
const sourceCommit = "fcaeab078b52b7eb7d928e1ea099d7b6ca37ba9e";
const tarball = Buffer.from("published tarball");
const sha512 = createHash("sha512").update(tarball).digest();
const integrity = `sha512-${sha512.toString("base64")}`;

type MutableStatement = {
  _type: string;
  subject: Array<{
    name: string;
    digest: { sha512: string };
  }>;
  predicateType: string;
  predicate: {
    buildDefinition: {
      buildType: string;
      externalParameters: {
        workflow: {
          ref: string;
          repository: string;
          path: string;
        };
      };
      resolvedDependencies: Array<{
        uri: string;
        digest: { gitCommit: string };
      }>;
    };
    runDetails: {
      builder: { id: string };
      metadata: { invocationId: string };
    };
  };
};

function provenanceDocument(
  mutation: (statement: MutableStatement) => void = () => {},
) {
  const statement: MutableStatement = {
    _type: "https://in-toto.io/Statement/v1",
    subject: [{
      name: `pkg:npm/${packageName}@${version}`,
      digest: { sha512: sha512.toString("hex") },
    }],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType: "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            ref: "refs/heads/main",
            repository: `https://github.com/${repository}`,
            path: ".github/workflows/release.yml",
          },
        },
        resolvedDependencies: [{
          uri: `git+https://github.com/${repository}@refs/heads/main`,
          digest: { gitCommit: sourceCommit },
        }],
      },
      runDetails: {
        builder: {
          id: "https://github.com/actions/runner/github-hosted",
        },
        metadata: {
          invocationId: `https://github.com/${repository}/actions/runs/30601685297/attempts/1`,
        },
      },
    },
  };
  mutation(statement);
  return {
    attestations: [{
      predicateType: "https://slsa.dev/provenance/v1",
      bundle: {
        mediaType: "application/vnd.dev.sigstore.bundle.v0.3+json",
        dsseEnvelope: {
          payload: Buffer.from(JSON.stringify(statement)).toString("base64"),
          payloadType: "application/vnd.in-toto+json",
          signatures: [{ sig: "test", keyid: "" }],
        },
      },
    }],
  };
}

function verificationInput(
  document = provenanceDocument(),
): ProvenanceVerificationInput {
  return {
    document,
    integrity,
    packageName,
    repository,
    version,
  };
}

describe("release provenance", () => {
  it("verifies the trusted workflow identity before accepting its source commit", async () => {
    const verifyBundle = vi.fn().mockResolvedValue(undefined);

    await expect(verifiedProvenanceSource(
      verificationInput(),
      verifyBundle,
    )).resolves.toBe(sourceCommit);
    expect(verifyBundle).toHaveBeenCalledWith(
      expect.any(Object),
      {
        certificateIdentityURI:
          "^https://github\\.com/meixg/feishu-card-renderer/"
          + "\\.github/workflows/release\\.yml@refs/heads/main$",
        certificateIssuer: "https://token.actions.githubusercontent.com",
      },
    );
  });

  it.each([
    [
      "package subject",
      (statement: MutableStatement) => {
        statement.subject[0].name = "pkg:npm/other-package@0.1.0";
      },
    ],
    [
      "tarball digest",
      (statement: MutableStatement) => {
        statement.subject[0].digest.sha512 = "0".repeat(128);
      },
    ],
    [
      "repository",
      (statement: MutableStatement) => {
        statement.predicate.buildDefinition.externalParameters.workflow.repository =
          "https://github.com/attacker/repository";
      },
    ],
    [
      "workflow path",
      (statement: MutableStatement) => {
        statement.predicate.buildDefinition.externalParameters.workflow.path =
          ".github/workflows/other.yml";
      },
    ],
    [
      "source ref",
      (statement: MutableStatement) => {
        statement.predicate.buildDefinition.externalParameters.workflow.ref =
          "refs/heads/other";
      },
    ],
    [
      "source commit",
      (statement: MutableStatement) => {
        statement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit =
          "not-a-commit";
      },
    ],
  ])("rejects a provenance bundle with the wrong %s", async (_label, mutation) => {
    const verifyBundle = vi.fn().mockResolvedValue(undefined);

    await expect(verifiedProvenanceSource(
      verificationInput(provenanceDocument(mutation)),
      verifyBundle,
    )).rejects.toThrow("npm provenance does not match the release source contract");
  });

  it("rejects an invalid Sigstore bundle before reading its statement", async () => {
    const verifyBundle = vi.fn().mockRejectedValue(new Error("invalid signature"));

    await expect(verifiedProvenanceSource(
      verificationInput(),
      verifyBundle,
    )).rejects.toThrow("npm provenance signature verification failed");
  });
});

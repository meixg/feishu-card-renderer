import { verify } from "sigstore";

const SLSA_PROVENANCE = "https://slsa.dev/provenance/v1";
const IN_TOTO_STATEMENT = "https://in-toto.io/Statement/v1";
const GITHUB_ACTIONS_BUILD =
  "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1";
const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_HOSTED_RUNNER = "https://github.com/actions/runner/github-hosted";
const RELEASE_WORKFLOW = ".github/workflows/release.yml";
const RELEASE_REF = "refs/heads/main";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function contractError() {
  return new Error("npm provenance does not match the release source contract");
}

function statementFromBundle(bundle) {
  const payload = bundle?.dsseEnvelope?.payload;
  if (typeof payload !== "string" || payload.length > 1024 * 1024) {
    throw contractError();
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    throw contractError();
  }
}

function integrityDigest(integrity) {
  if (
    typeof integrity !== "string"
    || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(integrity)
  ) {
    throw contractError();
  }
  const digest = Buffer.from(integrity.slice("sha512-".length), "base64");
  if (digest.length !== 64) throw contractError();
  return digest.toString("hex");
}

export async function verifiedProvenanceSource(
  {
    document,
    integrity,
    packageName,
    repository,
    version,
  },
  verifyBundle = verify,
) {
  const attestations = document?.attestations;
  const provenance = Array.isArray(attestations)
    ? attestations.filter(({ predicateType }) => predicateType === SLSA_PROVENANCE)
    : [];
  if (provenance.length !== 1 || !provenance[0]?.bundle) {
    throw contractError();
  }

  const workflowIdentity =
    `https://github.com/${repository}/${RELEASE_WORKFLOW}@${RELEASE_REF}`;
  try {
    await verifyBundle(provenance[0].bundle, {
      certificateIssuer: GITHUB_OIDC_ISSUER,
      certificateIdentityURI: `^${escapeRegExp(workflowIdentity)}$`,
    });
  } catch {
    throw new Error("npm provenance signature verification failed");
  }

  const statement = statementFromBundle(provenance[0].bundle);
  const subject = statement?.subject;
  const build = statement?.predicate?.buildDefinition;
  const workflow = build?.externalParameters?.workflow;
  const dependencies = build?.resolvedDependencies;
  const runDetails = statement?.predicate?.runDetails;
  const expectedRepository = `https://github.com/${repository}`;
  const expectedSource = `git+${expectedRepository}@${RELEASE_REF}`;
  const source = Array.isArray(dependencies)
    ? dependencies.filter(({ uri }) => uri === expectedSource)
    : [];
  const sourceCommit = source[0]?.digest?.gitCommit;

  if (
    statement?._type !== IN_TOTO_STATEMENT
    || statement?.predicateType !== SLSA_PROVENANCE
    || !Array.isArray(subject)
    || subject.length !== 1
    || subject[0]?.name !== `pkg:npm/${packageName}@${version}`
    || subject[0]?.digest?.sha512 !== integrityDigest(integrity)
    || build?.buildType !== GITHUB_ACTIONS_BUILD
    || workflow?.repository !== expectedRepository
    || workflow?.path !== RELEASE_WORKFLOW
    || workflow?.ref !== RELEASE_REF
    || source.length !== 1
    || !/^[0-9a-f]{40}$/u.test(sourceCommit)
    || runDetails?.builder?.id !== GITHUB_HOSTED_RUNNER
    || !new RegExp(
      `^${escapeRegExp(expectedRepository)}/actions/runs/\\d+/attempts/\\d+$`,
      "u",
    ).test(runDetails?.metadata?.invocationId)
  ) {
    throw contractError();
  }

  return sourceCommit;
}

import { describe, expect, it, vi } from "vitest";
import { assessReleaseImpact } from "../../scripts/release-impact-check.mjs";

const validChangeset = `---
"feishu-card-renderer": patch
---

修复消费者使用窄屏卡片时的布局问题，无需修改配置。
`;

type ChangedFile = { filename: string; status: string };
type LabelEvent = {
  event: string;
  label: { name: string };
  actor?: { login: string };
};
type GitHubSetup = {
  files?: ChangedFile[];
  events?: LabelEvent[];
  permission?: string;
  contents?: Record<string, string | undefined>;
};

function pullRequestEvent(overrides: Record<string, unknown> = {}) {
  return {
    pull_request: {
      number: 48,
      base: { ref: "main" },
      head: {
        ref: "feature",
        sha: "head-sha",
        repo: { full_name: "outside/fork" },
      },
      user: { login: "contributor" },
      ...overrides,
    },
  };
}

function githubAdapter({
  files = [],
  events = [],
  permission = "write",
  contents = {},
}: GitHubSetup = {}) {
  return {
    listPullRequestFiles: vi.fn(async (_number: number, page: number) => page === 1 ? files : []),
    listLabelEvents: vi.fn(async (_number: number, page: number) => page === 1 ? events : []),
    getActorPermission: vi.fn(async () => permission),
    readFileAtRef: vi.fn(async (_repo: string, path: string) => contents[path]),
  };
}

describe("release impact orchestration", () => {
  it("discovers every changed Changeset document at the head SHA and validates its content", async () => {
    const github = githubAdapter({
      contents: {
        ".changeset/first.md": validChangeset,
        ".changeset/second.md": validChangeset.replace("patch", "minor"),
      },
    });
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      filename: `docs/file-${index}.md`,
      status: "modified",
    }));
    github.listPullRequestFiles.mockImplementation(async (_number, page) => page === 1
      ? firstPage
      : [
        { filename: ".changeset/README.md", status: "modified" },
        { filename: ".changeset/removed.md", status: "removed" },
        { filename: ".changeset/first.md", status: "added" },
        { filename: ".changeset/second.md", status: "modified" },
      ]);

    await expect(assessReleaseImpact({
      event: pullRequestEvent(),
      github,
    })).resolves.toEqual({ ok: true, code: "changeset" });
    expect(github.readFileAtRef.mock.calls).toEqual([
      ["outside/fork", ".changeset/first.md", "head-sha"],
      ["outside/fork", ".changeset/second.md", "head-sha"],
    ]);
    expect(github.listPullRequestFiles.mock.calls.map((call) => call[1])).toEqual([1, 2]);
  });

  it("fails the Changeset mode when any candidate document is invalid", async () => {
    const github = githubAdapter({
      files: [{ filename: ".changeset/bad.md", status: "added" }],
      contents: { ".changeset/bad.md": "not a changeset" },
    });

    await expect(assessReleaseImpact({
      event: pullRequestEvent(),
      github,
    })).resolves.toMatchObject({
      ok: false,
      code: "invalid-changeset",
      path: ".changeset/bad.md",
    });
  });

  it("orders all label-event pages and authorizes only the final active label actor", async () => {
    const firstPage = Array.from({ length: 100 }, () => ({
      event: "labeled",
      label: { name: "unrelated" },
    }));
    const github = githubAdapter({ permission: "maintain" });
    github.listLabelEvents.mockImplementation(async (_number, page) => {
      if (page === 1) return firstPage;
      if (page === 2) {
        return [
          { event: "labeled", label: { name: "release:skip" }, actor: { login: "old" } },
          { event: "unlabeled", label: { name: "release:skip" }, actor: { login: "old" } },
          { event: "labeled", label: { name: "release:skip" }, actor: { login: "maintainer" } },
        ];
      }
      return [];
    });

    await expect(assessReleaseImpact({
      event: pullRequestEvent(),
      github,
    })).resolves.toEqual({ ok: true, code: "authorized-skip" });
    expect(github.listLabelEvents.mock.calls.map((call) => call[1])).toEqual([1, 2]);
    expect(github.getActorPermission).toHaveBeenCalledWith("maintainer");
  });

  it("rejects a skip label whose audited actor lacks maintainer permission", async () => {
    const github = githubAdapter({
      events: [{
        event: "labeled",
        label: { name: "release:skip" },
        actor: { login: "writer" },
      }],
      permission: "write",
    });

    await expect(assessReleaseImpact({
      event: pullRequestEvent(),
      github,
    })).resolves.toEqual({ ok: false, code: "unauthorized-skip" });
  });

  it("derives the Release PR exception from the event and does not query PR data", async () => {
    const github = githubAdapter();
    await expect(assessReleaseImpact({
      event: pullRequestEvent({
        head: {
          ref: "changeset-release/main",
          sha: "release-sha",
          repo: { full_name: "meixg/feishu-card-renderer" },
        },
        user: { login: "github-actions[bot]" },
      }),
      github,
    })).resolves.toEqual({ ok: true, code: "release-pr-exempt" });
    expect(github.listPullRequestFiles).not.toHaveBeenCalled();
    expect(github.listLabelEvents).not.toHaveBeenCalled();
  });

  it.each<[string, (github: ReturnType<typeof githubAdapter>) => void]>([
    ["changed-files API failure", (github) => github.listPullRequestFiles.mockRejectedValue(new Error("files failed"))],
    ["label-events API failure", (github) => github.listLabelEvents.mockRejectedValue(new Error("events failed"))],
    ["head content API failure", (github) => {
      github.listPullRequestFiles.mockResolvedValue([
        { filename: ".changeset/good.md", status: "added" },
      ]);
      github.readFileAtRef.mockRejectedValue(new Error("contents failed"));
    }],
    ["permission API failure", (github) => {
      github.listLabelEvents.mockResolvedValue([{
        event: "labeled",
        label: { name: "release:skip" },
        actor: { login: "maintainer" },
      }]);
      github.getActorPermission.mockRejectedValue(new Error("permission failed"));
    }],
  ])("fails closed on %s", async (_name, arrange) => {
    const github = githubAdapter();
    arrange(github);
    await expect(assessReleaseImpact({
      event: pullRequestEvent(),
      github,
    })).rejects.toThrow();
  });

  it("fails closed when event identity or API data is missing", async () => {
    await expect(assessReleaseImpact({
      event: {},
      github: githubAdapter(),
    })).rejects.toThrow("缺少或包含非法");

    const github = githubAdapter();
    github.listPullRequestFiles.mockImplementation(async () => undefined as unknown as ChangedFile[]);
    await expect(assessReleaseImpact({
      event: pullRequestEvent(),
      github,
    })).rejects.toThrow("无效的分页数据");
  });

  it.each([
    ["missing", { ref: "feature", sha: "head-sha" }],
    ["URL-like", {
      ref: "feature",
      sha: "head-sha",
      repo: { full_name: "https://github.com/outside/fork" },
    }],
    ["extra path", {
      ref: "feature",
      sha: "head-sha",
      repo: { full_name: "outside/fork/contents" },
    }],
  ])("fails closed on %s head repository identity", async (_name, head) => {
    await expect(assessReleaseImpact({
      event: pullRequestEvent({ head }),
      github: githubAdapter(),
    })).rejects.toThrow("缺少或包含非法");
  });

  it.each<[string, GitHubSetup, boolean, string]>([
    ["有效 Changeset", {
      files: [{ filename: ".changeset/good.md", status: "added" }],
      contents: { ".changeset/good.md": validChangeset },
    }, true, "changeset"],
    ["有效 skip", {
      events: [{ event: "labeled", label: { name: "release:skip" }, actor: { login: "owner" } }],
      permission: "admin",
    }, true, "authorized-skip"],
    ["两者皆无", {}, false, "missing-release-impact"],
    ["两者并存", {
      files: [{ filename: ".changeset/good.md", status: "added" }],
      contents: { ".changeset/good.md": validChangeset },
      events: [{ event: "labeled", label: { name: "release:skip" }, actor: { login: "owner" } }],
      permission: "admin",
    }, false, "changeset-and-skip"],
    ["未授权 skip", {
      events: [{ event: "labeled", label: { name: "release:skip" }, actor: { login: "writer" } }],
      permission: "write",
    }, false, "unauthorized-skip"],
    ["Changesets Release PR", {}, true, "release-pr-exempt"],
  ])("%s produces the end-to-end policy result", async (name, setup, ok, code) => {
    const event = name === "Changesets Release PR"
      ? pullRequestEvent({
        head: {
          ref: "changeset-release/main",
          sha: "release-sha",
          repo: { full_name: "meixg/feishu-card-renderer" },
        },
        user: { login: "github-actions[bot]" },
      })
      : pullRequestEvent();
    await expect(assessReleaseImpact({
      event,
      github: githubAdapter(setup),
    })).resolves.toMatchObject({ ok, code });
  });
});

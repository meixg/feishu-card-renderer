import { readFile } from "node:fs/promises";
import { assessReleaseImpact } from "./release-impact-check.mjs";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));

async function githubJson(path) {
  const response = await fetch(`${process.env.GITHUB_API_URL}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} 返回 ${response.status}。`);
  }
  return response.json();
}

function repositoryPath(fullName) {
  if (typeof fullName !== "string") {
    throw new Error("GitHub repository full_name 非法。");
  }
  const segments = fullName.split("/");
  if (
    segments.length !== 2
    || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(segments[0])
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u.test(segments[1])
  ) {
    throw new Error("GitHub repository full_name 非法。");
  }
  return `/repos/${segments.map(encodeURIComponent).join("/")}`;
}

const baseRepositoryPath = repositoryPath(process.env.GITHUB_REPOSITORY);
const github = {
  listPullRequestFiles(number, page, perPage) {
    return githubJson(`${baseRepositoryPath}/pulls/${number}/files?per_page=${perPage}&page=${page}`);
  },
  listLabelEvents(number, page, perPage) {
    return githubJson(`${baseRepositoryPath}/issues/${number}/events?per_page=${perPage}&page=${page}`);
  },
  async getActorPermission(login) {
    const result = await githubJson(
      `${baseRepositoryPath}/collaborators/${encodeURIComponent(login)}/permission`,
    );
    return result.permission;
  },
  async readFileAtRef(headRepo, path, headSha) {
    const headRepositoryPath = repositoryPath(headRepo);
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const result = await githubJson(
      `${headRepositoryPath}/contents/${encodedPath}?ref=${encodeURIComponent(headSha)}`,
    );
    if (result.type !== "file" || result.encoding !== "base64" || typeof result.content !== "string") {
      throw new Error(`GitHub API 未返回 ${path} 的 base64 文件内容。`);
    }
    return Buffer.from(result.content.replace(/\s/gu, ""), "base64").toString("utf8");
  },
};

const result = await assessReleaseImpact({ event, github });
if (!result.ok) {
  throw new Error(`发布影响声明不符合策略：${result.code}${result.path ? ` (${result.path})` : ""}`);
}
console.log(`发布影响声明通过：${result.code}`);

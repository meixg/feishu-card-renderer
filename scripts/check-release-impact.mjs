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

const repositoryPath = `/repos/${process.env.GITHUB_REPOSITORY}`;
const github = {
  listPullRequestFiles(number, page, perPage) {
    return githubJson(`${repositoryPath}/pulls/${number}/files?per_page=${perPage}&page=${page}`);
  },
  listLabelEvents(number, page, perPage) {
    return githubJson(`${repositoryPath}/issues/${number}/events?per_page=${perPage}&page=${page}`);
  },
  async getActorPermission(login) {
    const result = await githubJson(
      `${repositoryPath}/collaborators/${encodeURIComponent(login)}/permission`,
    );
    return result.permission;
  },
  async readFileAtRef(path, ref) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const result = await githubJson(
      `${repositoryPath}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
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

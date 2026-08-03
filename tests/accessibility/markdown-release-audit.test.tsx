import { render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";
import {
  adversarialMarkdownFixtures,
  markdownReleaseFixtures,
} from "../../src/fixtures/renderer-cards";

it("exposes every supported Markdown structure through an accessible public seam", async () => {
  const { container } = render(
    <CardRenderer card={markdownReleaseFixtures.complete} />,
  );

  expect(within(container).getAllByRole("heading").length).toBeGreaterThan(1);
  expect(container.querySelector("ul, ol")).not.toBeNull();
  expect(container.querySelector("blockquote")).not.toBeNull();
  expect(within(container).getByRole("table")).toBeVisible();
  expect(container.querySelectorAll("code").length).toBeGreaterThan(1);
  expect(within(container).getByRole("link", { name: "安全链接" })).toBeVisible();
  expect(container.querySelector('[data-fcr-font-color="grey"]'))
    .toHaveTextContent("协议颜色扩展");
  expect(within(container).getByRole("img", {
    name: "未完成，只读任务",
  })).toBeVisible();
  expect(within(container).getByRole("img", {
    name: "已完成，只读任务",
  })).toBeVisible();
  expect(container.querySelector("input, button")).toBeNull();
  expect((await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  })).violations).toEqual([]);
});

it("announces bounded truncation without hiding the safe prefix", async () => {
  const { container } = render(
    <CardRenderer card={adversarialMarkdownFixtures.longInput} />,
  );
  expect(within(container).getByRole("heading", {
    name: "Safe prefix",
  })).toBeVisible();
  expect(within(container).getByRole("note", {
    name: "Markdown 内容已截断",
  })).toBeVisible();
  expect((await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  })).violations).toEqual([]);
});

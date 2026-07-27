import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, expect, it } from "vitest";

import { CardRenderer } from "../../src";

afterEach(cleanup);

const axeOptions = {
  rules: { "color-contrast": { enabled: false } },
};

it("keeps the open confirm Alert Dialog accessible", async () => {
  const { container } = render(<CardRenderer onAction={() => {}} card={{
    schema: "2.0",
    body: {
      elements: [{
        tag: "button",
        text: { tag: "plain_text", content: "打开确认" },
        confirm: {
          title: { tag: "plain_text", content: "确认操作" },
          text: { tag: "plain_text", content: "继续吗？" },
        },
        behaviors: [{ type: "callback", value: "confirm" }],
      }],
    },
  }} />);

  fireEvent.click(screen.getByRole("button", { name: "打开确认" }));
  expect(screen.getByRole("alertdialog", { name: "确认操作" }))
    .toBeInTheDocument();
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});

it("keeps the open overflow Dropdown Menu accessible", async () => {
  const { container } = render(<CardRenderer onAction={() => {}} card={{
    schema: "2.0",
    body: {
      elements: [{
        tag: "overflow",
        options: [
          {
            text: { tag: "plain_text", content: "可用项" },
            value: "enabled",
          },
          {
            text: { tag: "plain_text", content: "禁用项" },
            value: "disabled",
            disabled: true,
          },
        ],
      }],
    },
  }} />);

  fireEvent.keyDown(screen.getByRole("button", { name: "更多操作" }), {
    key: "ArrowDown",
  });
  expect(await screen.findByRole("menu", { name: "更多操作" }))
    .toBeInTheDocument();
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});

it("keeps the open image Dialog and its navigation accessible", async () => {
  const { container } = render(<CardRenderer
    resolveImage={(key) => `https://cdn.example.com/${key}.png`}
    card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "img_combination",
          img_list: [
            { img_key: "one", alt: { tag: "plain_text", content: "一" } },
            { img_key: "two", alt: { tag: "plain_text", content: "二" } },
          ],
        }],
      },
    }}
  />);
  await act(async () => {});

  fireEvent.click(screen.getByRole("button", { name: "打开图片组预览" }));
  expect(screen.getByRole("dialog", { name: "一" })).toBeInTheDocument();
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});

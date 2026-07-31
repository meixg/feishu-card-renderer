## Problem Statement

飞书卡片 JSON 2.0 Web 渲染器已经解析 `vertical_spacing`，但当正文或纵向容器没有显式声明该字段时，布局最终得到零间距。展示元素、表单与交互控件组合后会彼此粘连，尤其是 Markdown 后接 Form、以及 Form 内连续排列 Input、Select 和 Button 的场景，无法形成稳定、可读的卡片原生排版。

使用者需要一个对任意组件组合都可预测的默认节奏，同时保持协议显式 spacing、margin、嵌套容器、表单行为、安全降级、主题和设备模式的既有语义。

## Solution

引入由父容器拥有的“元素流”间距语义。`body`、`column`、`form`、`interactive_container` 与 `collapsible_panel` 的纵向兄弟协议组件，在未声明或错误声明 `vertical_spacing` 时统一使用 `medium`（8px）；显式合法值继续生效，合法 `0px` 可以关闭父级间距。

间距只存在于相邻兄弟之间，不作用于容器边缘，也不跨嵌套元素流重复计算。顶层或容器内部 header、控件内部 label/control/feedback、overlay 与横向排列不参与该纵向元素流。每个 `CardElement` 在父元素流中恰好提供一个布局参与节点，避免组件内部 DOM 或 portal 意外增加间距。

## User Stories

1. As a card reader, I want adjacent body elements to have a consistent default gap, so that card content is easy to scan.
2. As a Workspace user, I want the introductory Markdown and the following Form to be visually separated, so that explanatory content is distinct from data-entry controls.
3. As a form user, I want Input, Select, and Submit controls to have consistent vertical spacing, so that the form does not look crowded.
4. As a card author, I want omitted `vertical_spacing` to produce a useful default, so that I do not need to repeat layout boilerplate in every container.
5. As a card author, I want `small`, `medium`, `large`, `extra_large`, and valid pixel spacing to remain authoritative, so that explicit protocol layout is preserved.
6. As a card author, I want `0px` to disable parent-owned spacing, so that deliberately compact compositions remain possible.
7. As a card author, I want an invalid spacing declaration to produce a recoverable diagnostic and a readable fallback, so that a typo does not make content stick together.
8. As a renderer integrator, I want the same card to use the same default spacing on PC and mobile, so that protocol content layout remains predictable across devices.
9. As a renderer integrator, I want the same default spacing in light and dark modes, so that theme selection changes color rather than geometry.
10. As a renderer integrator, I want no new global spacing prop or host CSS override, so that identical card JSON does not render with host-dependent content rhythm.
11. As a nested-card author, I want each nested element flow to manage only its own siblings, so that entering a Form or another container does not double the gap at the parent-child boundary.
12. As a card author, I want body padding to remain responsible for the body edge, so that the first and last elements do not receive accidental outer gaps.
13. As a card author, I want header-to-body separation to remain owned by header/body styling, so that the top-level header is not confused with `body.elements`.
14. As a collapsible-panel author, I want panel header/content separation to remain owned by the panel, so that element-flow spacing applies only among panel elements.
15. As a form user, I want field labels, controls, hints, and validation feedback to retain their component-owned spacing, so that parent flow rules do not distort interaction views.
16. As a form user, I want required errors to expand a field without changing the gap to the next protocol component, so that validation does not cause additional layout jumps.
17. As a card author, I want existing supported element margins to add to the parent gap, so that per-element offsets remain meaningful.
18. As a card author, I want `margin: 0` to mean no extra element offset rather than cancellation of the parent gap, so that spacing responsibilities stay distinct.
19. As a renderer maintainer, I want unknown or invalid component placeholders to participate in spacing, so that recoverable errors preserve a stable layout.
20. As a renderer maintainer, I want spacing to be counted by protocol components rather than incidental DOM children, so that fragments, feedback, and portals cannot create phantom gaps.
21. As a renderer maintainer, I want registered components to expose one in-flow layout participant without a universal wrapper, so that flex weights, semantic HTML, widths, and event bubbling are not changed globally.
22. As a renderer maintainer, I want spacing defaults resolved during normalization, so that all rendering paths consume the same canonical semantics.
23. As a renderer maintainer, I want the input JSON to remain deeply unchanged, so that normalization never mutates host-owned data.
24. As a form integrator, I want spacing changes not to alter required validation, form scope, callback values, or submit count, so that layout work does not regress behavior.
25. As an accessibility user, I want labels, required semantics, errors, and keyboard submission to remain correct, so that visual spacing does not reduce usability.
26. As a release reviewer, I want a single realistic Workspace fixture shared across behavior, accessibility, and visual checks, so that the accepted composition remains protected from regression.
27. As a release reviewer, I want initial-state visual evidence for light/dark and PC/mobile, so that the new rhythm is visible across supported presentation modes.

## Implementation Decisions

- Parent-owned element flow is the canonical model. Do not implement a matrix keyed by the preceding and following component tags.
- The default element-flow spacing is `medium`, mapped to 8px.
- Missing and invalid `vertical_spacing` normalize to `medium`. Invalid values continue to emit the repository's recoverable style diagnostic. A valid `0px` remains distinct and resolves to zero.
- Normalization is the single source of default spacing semantics; view components consume the normalized value and do not invent independent defaults.
- The default applies to vertical `elements` collections owned by body, column, form, interactive container, and collapsible panel.
- A container explicitly using horizontal direction continues to use its horizontal-spacing semantics. The vertical default does not create a horizontal gap, and `column_set.columns` is outside this feature.
- Gap applies only between adjacent siblings. Before the first child and after the last child, padding and component-specific layout remain authoritative.
- Nested element flows are independent. For the canonical fixture, Markdown-to-Form receives the body gap, while Form-to-first-Input receives no additional leading gap; Input-to-Select and Select-to-Button each receive the Form gap.
- Top-level header, collapsible-panel header, field label/control/feedback, and overlay content are not element-flow siblings.
- Existing supported protocol `margin` remains an element-owned extra offset and combines additively with the parent gap. This feature does not broaden margin support to every tag.
- Unknown and recoverably invalid component placeholders remain normal layout participants.
- Each protocol `CardElement` must correspond to one node in the parent document flow. Registered renderers own that single in-flow root; dialogs, menus, confirmations, and other portals do not occupy an additional flow position.
- Do not introduce a generic wrapper around every rendered component. Such a wrapper would risk changing column flex behavior, semantic HTML, width stretching, and interaction bubbling.
- Do not add a `CardRenderer` prop or host CSS variable for overriding the 8px default.
- PC/mobile and light/dark render the same element-flow geometry.
- The canonical Workspace JSON is stored verbatim as a test-only JSON fixture. Tests pass `onAction`; the phrase “display-only in Workspace” is fixture content, not a request to disable renderer interactions.
- Input immutability remains part of the public contract: normalization and all rendering/interacting steps operate on copies and never append spacing fields to the caller's object.
- Update the protocol-facing type/schema coverage needed for every affected container field, including collapsible-panel vertical spacing, and keep validation, normalization, fixtures, compatibility evidence, and documentation synchronized.

## Testing Decisions

- Tests observe external behavior at two already-public seams: `normalizeCard(card)` for canonical protocol semantics and `CardRenderer` for rendered layout, interaction, accessibility, and diagnostics. Private spacing helpers and internal component implementation are not direct test seams.
- The canonical Workspace JSON is shared unchanged by normalization, component, accessibility, and visual tests. Boundary cases use small purpose-built cards rather than mutating the canonical fixture.
- Normalization tests cover omitted spacing, every supported spacing enum, valid pixels, explicit `0px`, invalid/over-range values, recoverable diagnostics, body and all affected containers, vertical versus horizontal direction, and deep input immutability.
- Renderer tests observe computed layout at the public rendered-card seam for body, column, form, interactive container, and collapsible panel. They cover empty flows, single-child flows, multiple siblings, nested flows, and unknown placeholders.
- The canonical fixture must demonstrate an 8px body gap between Markdown and Form, and 8px Form gaps between Input, Select, and Button, without a duplicated leading gap before Input.
- Existing supported margins are tested additively with the parent gap, including `margin: 0` and positive/negative allowed values where applicable.
- Horizontal containers and column sets are regression-tested to prove that the vertical default does not introduce a horizontal gap.
- The canonical form test uses one renderer instance with `onAction`. An empty submission displays required errors and emits no action. After filling Input and selecting Option A or B, submission emits exactly one callback, preserves the fixture callback value, and carries `{ note, choice }` in `formValue`.
- Validation feedback appearing and disappearing may change a field's height but must leave the parent element-flow gap at 8px.
- Accessibility tests verify label/control association, required semantics, error relationships, keyboard submission, and the absence of wrapper-induced semantic regressions.
- Initial-state visual checks cover light/dark and PC/mobile using `width_mode: "fill"`. Invalid-state geometry is covered by component/accessibility assertions rather than multiplying visual snapshots.
- Existing container, renderer, form-control, accessibility, and visual tests are the prior art; extend those public-boundary patterns rather than creating tests around internal helpers.
- Completion requires type checking, lint, unit tests, component tests, accessibility tests, affected visual tests, renderer build, and site build. Expected visual snapshot changes must be reviewed as the intended result of the new default rhythm.

## Out of Scope

- A preceding-tag/following-tag spacing matrix or content-aware spacing heuristics.
- Full protocol `margin` support for tags that do not currently render margin.
- A universal `ComponentRenderer` wrapper or broad DOM restructuring.
- New host theme tokens, CSS custom properties, or renderer props for default flow spacing.
- Changes to horizontal-spacing defaults or column-set behavior.
- Changes to field-internal shadcn spacing, label placement, feedback styling, overlay layout, header padding, body padding, or collapsible header/content padding.
- JSON 1.0 compatibility or legacy `action` modules.
- Changes to form validation, callback schemas, Workspace business behavior, or actual external callback delivery.
- Visual replication of a specific Feishu client version.

## Further Notes

- This spec follows the accepted decision “由父容器拥有元素流间距” and uses the glossary terms “元素流”, “默认元素流间距”, and “布局参与节点”.
- Official spacing remains untrusted protocol input and must continue through the existing enum/pixel safety policy.
- The canonical acceptance fixture is the following JSON and must be preserved without semantic edits:

```json
{
  "body": {
    "elements": [
      {
        "tag": "markdown",
        "content": "Form controls are display-only in Workspace."
      },
      {
        "tag": "form",
        "name": "fixture_form",
        "elements": [
          {
            "tag": "input",
            "name": "note",
            "label": {
              "tag": "plain_text",
              "content": "Fixture note"
            },
            "required": true,
            "placeholder": {
              "tag": "plain_text",
              "content": "Enter test text"
            },
            "label_position": "top"
          },
          {
            "tag": "select_static",
            "name": "choice",
            "type": "default",
            "width": "fill",
            "options": [
              {
                "text": {
                  "tag": "plain_text",
                  "content": "Option A"
                },
                "value": "a"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "Option B"
                },
                "value": "b"
              }
            ],
            "required": true,
            "placeholder": {
              "tag": "plain_text",
              "content": "Fixture choice"
            }
          },
          {
            "tag": "button",
            "name": "submit_btn",
            "text": {
              "tag": "plain_text",
              "content": "Submit fixture"
            },
            "type": "primary",
            "behaviors": [
              {
                "type": "callback",
                "value": {
                  "intent": "fixture_submit",
                  "source": "workspace-card-fixture",
                  "version": 1,
                  "ackSnapshot": {
                    "title": "Workspace Form Fixture",
                    "actionLabel": "Submit fixture",
                    "fieldLabels": {
                      "note": "Fixture note",
                      "choice": "Fixture choice"
                    },
                    "bodyMarkdown": "Form controls are display-only in Workspace.",
                    "optionLabels": {
                      "choice": {
                        "a": "Option A",
                        "b": "Option B"
                      }
                    }
                  },
                  "commandTemplate": "WORKSPACE_CARD_FIXTURE_FORM note={{note}} choice={{choice}}"
                }
              }
            ],
            "form_action_type": "submit"
          }
        ]
      }
    ]
  },
  "config": {
    "width_mode": "fill"
  },
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "Workspace Form Fixture"
    },
    "template": "blue"
  },
  "schema": "2.0"
}
```

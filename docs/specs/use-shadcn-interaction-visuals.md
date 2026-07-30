# 交互视图采用 shadcn/ui 默认视觉

## Problem Statement

当前渲染器已经使用 Base UI 提供 Select、Combobox、Drawer、Dialog、Menu 等交互基础，但多个交互视图仍直接组合 headless primitive，并由 renderer 自行定义颜色、边框、圆角、阴影、尺寸、图标和状态外观。结果是控件虽然具备 Base UI 的键盘、焦点和 ARIA 行为，视觉却继续形成一套不完整的飞书风格仿制；不同交互控件之间也容易出现密度、图标和状态反馈不一致。

使用者需要的是飞书 JSON 2.0 的功能对齐，而不是飞书客户端的像素级视觉复刻。交互视图应采用一套成熟、一致、可维护的默认视觉，同时保持协议内容布局、公共 renderer interface、表单状态和 `CardAction` 契约不变。

## Solution

以固定版本的 shadcn/ui `base-nova` 生成源码作为交互视图的默认视觉事实来源。飞书 JSON 2.0 继续定义值、表单、动作、上下文约束和协议视觉语义；shadcn/ui 提供控件结构、默认尺寸、variant、图标、状态视觉和可访问交互机制。

所有标准交互控件改用官方 Base UI 版 shadcn wrapper。复合交互通过这些 wrapper 组合，例如使用 Select 处理少量静态单选，使用 Combobox 处理搜索与多选，使用 Drawer 处理移动端选择。renderer 只保留卡片宽度、内容溢出、portal、z-index、移动设备和打包所需的交互集成布局，不再绘制第二套控件主题。

协议内容布局继续保持宿主无关。主题按卡片显式选择 light 或 dark，默认 token 来自 shadcn `base-nova`，公开定制仍只通过稳定的 `--fcr-*` 宿主主题变量完成。迁移不提供旧飞书风格交互主题开关。

## User Stories

1. As a renderer consumer, I want interactive controls to use a consistent shadcn/ui visual language, so that cards look coherent without imitating a particular Feishu client release.
2. As a renderer consumer, I want the same JSON 2.0 input to preserve its values and actions after the visual migration, so that adopting the new release does not change business behavior.
3. As a host application developer, I want the public `CardRenderer` interface to remain independent of shadcn and Base UI types, so that my application is not coupled to the renderer's internal UI stack.
4. As a host application developer, I want styles to ship precompiled with the renderer, so that I do not need to install shadcn, run its CLI, or configure Tailwind.
5. As a host application developer, I want all renderer theme CSS to remain scoped to each card, so that it does not reset or restyle the surrounding application.
6. As a host application developer, I want to keep using documented `--fcr-*` variables for branding, so that a shadcn source upgrade does not break my theme integration.
7. As a host application developer, I want light and dark modes to be selected per card, so that cards with different color schemes can coexist on one page.
8. As a host application developer, I want portaled content to inherit the originating card's color scheme, so that menus, dialogs and drawers do not render with the host page's theme by mistake.
9. As a card author, I want `select_static` to use a standard Select when its option set is small, so that simple choices remain direct and keyboard accessible.
10. As a card author, I want larger static selects to remain searchable, so that visual standardization does not make long option lists harder to use.
11. As a card author, I want person selects to remain searchable and resource-aware, so that loading, resolved and failed person options retain clear behavior.
12. As a card author, I want multi-select fields to use shadcn Combobox chips, so that selected values are recognizable, removable and visually consistent.
13. As a mobile card user, I want choice fields to open in a shadcn Drawer, so that searching and selecting remain usable above the virtual keyboard.
14. As a mobile card user, I want a single selection to close its Drawer immediately, so that the existing interaction remains efficient.
15. As a mobile card user, I want a multi-select Drawer to stay open until I choose Done, so that I can make several selections in one interaction.
16. As a keyboard user, I want Select, Combobox, Menu, Dialog, Drawer, Calendar, Checkbox, RadioGroup and Collapsible interactions to retain standard keyboard behavior, so that the visual migration does not reduce accessibility.
17. As a screen-reader user, I want required, invalid, disabled, selected, expanded and modal states to remain correctly announced, so that state is not conveyed only by shadcn styling.
18. As a motion-sensitive user, I want nonessential shadcn animations disabled under reduced-motion preferences, so that the new visual layer remains comfortable.
19. As a card author, I want primary, secondary and dangerous action meanings mapped to appropriate shadcn variants, so that important protocol visual semantics remain visible.
20. As a card author, I want custom Feishu colors to stop redesigning standard controls, so that interactive controls keep a coherent shadcn theme.
21. As a card author, I want `select_img` images and labels to retain their protocol layout while selection controls use shadcn RadioGroup or Checkbox visuals, so that content and interaction responsibilities stay clear.
22. As a card author, I want `checker` to use a standard shadcn Checkbox and Label, so that it matches the rest of the form controls.
23. As a card author, I want collapsible content to preserve its protocol layout while its trigger uses shadcn interaction visuals, so that visual migration does not alter card structure.
24. As a card author, I want interactive containers to keep their content layout without receiving an arbitrary shadcn Card shell, so that clickability does not change protocol presentation.
25. As a user, I want generic control icons such as chevrons, checks, close, search, calendar and overflow to use Lucide, so that they have stable proportions across fonts and platforms.
26. As a localized user, I want placeholders, empty states, search prompts, confirmations and accessible labels to follow the renderer locale, so that adopting shadcn does not introduce English example copy.
27. As a user of a 400px card, I want controls and popups to stay within the card or viewport without being manually compressed, so that shadcn's standard sizing remains usable on narrow surfaces.
28. As a user with long option labels, I want wrapping, truncation and scrolling to prevent overflow, so that content remains operable without changing the component theme.
29. As a maintainer, I want protocol views to depend on one internal UI module rather than Base UI primitives directly, so that shadcn visual upgrades remain localized.
30. As a maintainer, I want direct Base UI imports outside the internal UI module rejected automatically, so that a second custom visual layer does not reappear.
31. As a maintainer, I want the shadcn source snapshot and upgrade process recorded, so that upstream changes are reviewed rather than silently overwriting renderer adaptations.
32. As a maintainer, I want visual regression tests to target the renderer's verified shadcn snapshot rather than Feishu screenshots, so that failures reflect the adopted design system.
33. As a maintainer, I want the migration implemented in reviewable stages but released as one coherent change, so that consumers never receive a half-migrated interaction theme.
34. As a package consumer, I want tree-shaken Lucide imports and verified bundle output, so that consistent icons do not introduce unnecessary package weight.
35. As a package consumer, I want SSR and hydration of closed overlays to remain stable, so that the visual migration works in server-rendered React hosts.
36. As a security-conscious integrator, I want card JSON to remain unable to inject CSS, classes, URLs or executable content through the new UI layer, so that shadcn adoption does not weaken input boundaries.

## Implementation Decisions

- ADR-0001 is the governing architectural decision.
- The migration changes only the interaction view. Protocol content layout, schema, normalization, diagnostics, form state and standardized `CardAction` output remain owned by the renderer.
- The internal UI module is the single seam between protocol views and Base UI. Protocol views consume renderer-owned values and events and must not import Base UI primitives, types, providers, DOM state hooks or styling attributes directly.
- Standard shadcn wrappers are generated from the Base UI `base-nova` source family and retained as editable internal source. Select, Combobox, Drawer, Button, Input, Textarea, Checkbox, RadioGroup, Menu, Dialog, AlertDialog, Popover, Calendar, Collapsible and Pagination use these wrappers rather than bespoke visual structures.
- The repository records a fixed, verified shadcn source snapshot. Upstream shadcn changes are adopted through an explicit regeneration-and-review change, never by automatic overwrite.
- shadcn default component structure, variants, standard sizes, colors, border radii, shadows, focus states and state visuals are authoritative. Existing hand-written Feishu-like interaction styles are removed rather than layered underneath.
- Custom interaction CSS is limited to interaction integration layout: width, max-width, max-height, overflow, wrapping, truncation, portal stacking, collision constraints, virtual-keyboard handling and responsive placement. It must not introduce a second color, border, radius, shadow, typography, focus or selected-state design.
- shadcn standard size variants take precedence over the existing compact 34px control density. A smaller control may be selected only when it is an official shadcn size variant appropriate to the context.
- Select remains the primitive for non-searchable single choice. Static single selects with fewer than eight options use Select; static single selects with eight or more options and all person selects use searchable Combobox.
- Multi-select fields use the official shadcn Combobox multiple/chips composition. Existing opaque option tokens continue to protect string, number, boolean and object protocol values; form state and actions expose protocol values, not internal tokens.
- Mobile choice fields use the official Base UI-backed shadcn Drawer. The existing single-select close behavior, multi-select Done behavior, virtual-keyboard accommodation and per-card portal ownership remain intact.
- Generic interaction icons use named Lucide imports with shadcn default dimensions and accessible decorative treatment. Protocol-specified business icons continue through the renderer icon adapter.
- Protocol visual semantics are mapped to the closest shadcn variant. Dangerous actions use a destructive treatment; primary actions use the default primary treatment; secondary actions use an appropriate secondary or outline treatment. Required, invalid, disabled and selected states remain visually and semantically observable.
- Protocol custom colors do not restyle standard interaction controls. They continue to apply only where protocol content layout explicitly supports them or degrade according to the existing validation policy.
- Composite protocol elements retain content ownership in the renderer. Their actionable surfaces and state indicators use shadcn controls without forcing unrelated shadcn shells onto protocol content.
- Every card owns a scoped shadcn light or dark theme selected by the existing `colorScheme` input. Global `.dark`, host theme state and implicit system preference are not read by the renderer. The card portal host is inside the same scoped theme.
- Documented `--fcr-*` host theme variables remain the sole public theming interface. Their defaults are updated to the adopted shadcn theme and internally mapped to scoped shadcn tokens. Raw shadcn tokens and Base UI state attributes remain private.
- System copy remains renderer-owned and locale-aware. shadcn example strings are not copied into wrappers.
- shadcn source and required styles are compiled inside the package and continue to ship as one explicitly imported stylesheet. Consumers do not configure Tailwind or shadcn.
- The migration is developed in stages: theme and wrapper foundation; basic form controls; choice fields; overlays and calendar; remaining interactive views; legacy visual CSS removal and documentation. These stages are delivered as one release without a legacy theme switch.
- The public renderer props, schema entry point and package exports do not gain shadcn-specific configuration or types.
- The implementation must preserve untrusted-input protections, URL allowlists, sanitized rich text, stable keys, recursion limits and adapter ownership.
- README, compatibility documentation, release notes and a changeset are updated to state that interaction visuals now follow the pinned shadcn snapshot and no longer target Feishu client appearance.

## Testing Decisions

- The highest test seam is the public renderer interaction: render protocol JSON through the renderer, interact through accessible roles and user-observable controls, then assert visible state, focus and standardized `CardAction` output.
- The internal UI module is the only lower seam that receives focused tests. These tests cover wrapper composition contracts that cannot be observed economically through every protocol element, such as prop/ref forwarding, portal ownership, variant selection and theme scoping.
- Tests must not assert Base UI internal DOM structure, undocumented data attributes or incidental Tailwind class ordering. Generated wrapper provenance may be checked separately from behavioral tests.
- Existing schema and normalization unit tests remain unchanged unless the migration exposes a real protocol defect; no schema relaxation is permitted for visual convenience.
- Existing form interaction tests are prior art for opaque option values, initial state, required validation, submit, reset, disabled behavior, confirm behavior and action payloads.
- Existing Select/Combobox/Drawer component tests are prior art for the eight-option threshold, search filtering, multiple selection, chips, mobile completion, person resource states, SSR and hydration.
- Existing overlay interaction tests are prior art for per-card portal hosts, event boundaries, focus return, Esc dismissal and nested modal behavior.
- Existing accessibility projects verify keyboard operation, accessible names, ARIA state, focus management and automated axe results for every migrated control family.
- Add an architecture check that fails when code outside the internal UI module imports `@base-ui/react`.
- Add tests that protocol visual semantics select the expected public shadcn variants without asserting private primitive state.
- Add tests that system copy comes from the renderer locale and wrappers do not introduce fixed shadcn example text.
- Add tests that light and dark cards can coexist and that each card's portaled content uses its own scoped theme.
- Add tests for 400px, 600px and fill widths, including long labels, chip overflow, popup collision and scroll containment.
- Visual regression covers light/dark, PC/mobile and compact/default/fill card matrices. Baselines represent this repository's pinned shadcn snapshot and are not compared to Feishu client screenshots or the mutable shadcn website.
- Reduced-motion coverage verifies that nonessential overlay and state animations are disabled.
- Build and package verification confirms a single distributable stylesheet, no unresolved source aliases, no bundled React/ReactDOM, tree-shaken Lucide imports and acceptable JS/CSS gzip change.
- The full typecheck, lint, unit, component, accessibility, visual, build and site-build suites must pass before completion.

## Out of Scope

- Pixel-level reproduction of any Feishu or Lark desktop, mobile or web client.
- Replacing protocol content layout, card header, Markdown, tables, images, columns or other display elements with generic shadcn page layouts.
- Exposing shadcn components, Base UI primitives, internal providers, raw theme tokens or wrapper types as public package APIs.
- Adding a legacy Feishu-style interaction theme, theme selector prop or dual visual implementation.
- Automatically tracking or overwriting source from future shadcn releases.
- Replacing the renderer form state with React Hook Form, Zod or another form framework.
- Adding remote person search, directory access, image upload, authentication, message delivery or callback execution.
- Changing the eight-option search threshold, option limit, protocol nesting rules or standardized action contract except where an independently verified protocol defect requires a separate change.
- Allowing card JSON to supply arbitrary CSS, Tailwind classes, HTML or JavaScript.
- Making the renderer inherit the host page's global `.dark` state or system theme without an explicit per-card `colorScheme`.

## Further Notes

- This specification supersedes the earlier visual direction of “Feishu semantics and density plus shadcn interaction feel” for interaction controls only. The previous Base UI migration remains valuable for behavior, accessibility and portal infrastructure.
- Base UI is headless and ships no CSS. The visible result must therefore come from the pinned shadcn wrapper and theme source, not from importing `@base-ui/react` alone.
- Relevant official references:
  - https://ui.shadcn.com/docs/components/base/select
  - https://ui.shadcn.com/docs/components/base/drawer
  - https://ui.shadcn.com/docs/components/base/combobox
  - https://base-ui.com/react/overview/about
  - https://base-ui.com/react/handbook/styling
- Existing completed issues for the first Base UI migration are historical context, not duplicates of this visual-source migration.

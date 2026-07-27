import type { Card } from "../../src/schema/card";
import type { CardElement } from "../../src/schema/components";

const text = (content: string) => ({ tag: "plain_text" as const, content });
const md = (content: string) => ({ tag: "lark_md" as const, content });
const option = (content: string, value: string, disabled = false) => ({
  text: text(content),
  value,
  disabled,
});
const card = (elements: CardElement[]): Card => ({
  schema: "2.0",
  config: { update_multi: true, width_mode: "fill" },
  body: { elements, vertical_spacing: "medium", padding: "16px" },
});
const submit = {
  tag: "button" as const,
  name: "submit",
  form_action_type: "submit" as const,
  text: text("提交"),
  value: { intent: "save" },
};
const formCard = (name: string, elements: CardElement[]): Card =>
  card([{
    tag: "form",
    name,
    vertical_spacing: "medium",
    elements: [...elements, submit],
  }]);

export type CatalogCategory = "顶层" | "容器" | "展示" | "交互";

export type CatalogItem = {
  id: string;
  tag: string;
  title: string;
  category: CatalogCategory;
  summary: string;
  notes: string[];
  card: Card;
};

export const catalog: CatalogItem[] = [
  {
    id: "header",
    tag: "header",
    title: "标题区",
    category: "顶层",
    summary: "卡片唯一的顶层标题区域，可组合主标题、副标题、模板与安全间距。",
    notes: ["只能出现在卡片顶层", "存在 header 时 title 必填"],
    card: {
      schema: "2.0",
      config: { update_multi: true, width_mode: "fill" },
      header: {
        title: text("项目发布通知"),
        subtitle: md("JSON 2.0 · **Web Renderer**"),
        template: "blue",
        padding: "16px 20px",
      },
      body: {
        padding: "16px 20px",
        elements: [{ tag: "div", text: text("标题与正文保持清晰的层级关系。") }],
      },
    },
  },
  {
    id: "column-set",
    tag: "column_set",
    title: "分栏组",
    category: "容器",
    summary: "在同一行组织多个 column，并控制间距、对齐和列权重。",
    notes: ["columns 只接受 column", "容器嵌套计入五层深度限制"],
    card: card([{
      tag: "column_set",
      horizontal_spacing: "medium",
      columns: [
        {
          tag: "column",
          width: "weighted",
          weight: 2,
          padding: "12px",
          elements: [{ tag: "div", text: md("**主栏**\n占据两份宽度") }],
        },
        {
          tag: "column",
          width: "weighted",
          weight: 1,
          padding: "12px",
          elements: [{ tag: "div", text: md("**侧栏**\n占据一份宽度") }],
        },
      ],
    }]),
  },
  {
    id: "column",
    tag: "column",
    title: "分栏",
    category: "容器",
    summary: "column 是 column_set 的内部容器，可设置权重、内边距与子元素布局。",
    notes: ["不能直接放入 body.elements", "不能包含 form 或 table"],
    card: card([{
      tag: "column_set",
      horizontal_spacing: "medium",
      columns: [{
        tag: "column",
        width: "weighted",
        weight: 1,
        padding: "16px",
        vertical_spacing: "small",
        elements: [
          { tag: "div", text: md("**一个合法的 column**") },
          { tag: "div", text: text("它始终在 column_set 中展示。") },
        ],
      }],
    }]),
  },
  {
    id: "form",
    tag: "form",
    title: "表单",
    category: "容器",
    summary: "为最近的表单字段管理初始值、必填校验、提交与重置。",
    notes: ["只能直接位于 body.elements", "至少包含一个 submit 按钮", "不能包含 form 或 table"],
    card: formCard("profile_form", [
      {
        tag: "input",
        name: "project",
        label: text("项目名称"),
        default_value: "Renderer 主页",
        required: true,
      },
      {
        tag: "checker",
        name: "confirmed",
        text: text("信息已经确认"),
        checked: true,
      },
      {
        tag: "button",
        name: "reset",
        form_action_type: "reset",
        text: text("恢复初始值"),
      },
    ]),
  },
  {
    id: "interactive-container",
    tag: "interactive_container",
    title: "交互容器",
    category: "容器",
    summary: "让一组非表单内容成为可通过指针或键盘触发的整体交互区域。",
    notes: ["支持 Enter 与 Space", "交互子元素会阻止冒泡，避免双重触发", "不能包含 form 或 table"],
    card: card([{
      tag: "interactive_container",
      has_border: true,
      corner_radius: "8px",
      padding: "16px",
      behaviors: [{ type: "callback", value: { action: "open_release" } }],
      elements: [
        { tag: "div", text: md("**点击整块区域**") },
        { tag: "div", text: text("动作会进入下方的本地 action 日志。") },
      ],
    }]),
  },
  {
    id: "collapsible-panel",
    tag: "collapsible_panel",
    title: "折叠面板",
    category: "容器",
    summary: "以可访问的展开按钮承载可显示或隐藏的补充内容。",
    notes: ["使用 aria-expanded/aria-controls", "不能包含 form"],
    card: card([{
      tag: "collapsible_panel",
      expanded: true,
      header: {
        title: text("实现细节"),
        position: "top",
        icon_position: "right",
      },
      border: { color: "grey", corner_radius: "8px" },
      elements: [{ tag: "div", text: text("折叠状态只存在于当前浏览器视图。") }],
    }]),
  },
  {
    id: "div",
    tag: "div",
    title: "文本块",
    category: "展示",
    summary: "展示 plain_text 或有限 lark_md 文本，是最常用的正文组件。",
    notes: ["plain_text 永远作为文本节点", "lark_md 只启用安全白名单"],
    card: card([{
      tag: "div",
      margin: "4px 0px",
      text: md("**飞书卡片 JSON 2.0**\n\n支持安全链接与基础强调语法。"),
    }]),
  },
  {
    id: "markdown",
    tag: "markdown",
    title: "Markdown",
    category: "展示",
    summary: "渲染经过解析和消毒的富文本、列表、链接与代码。",
    notes: ["危险 HTML 与 URL 会被过滤", "长文本与代码在窄屏下不会撑破卡片"],
    card: card([{
      tag: "markdown",
      content: "### 发布清单\n- 引入预编译样式\n- 注入资源 resolver\n- 处理 `onAction`\n\n[查看项目](https://github.com/meixg/feishu-card-renderer)",
    }]),
  },
  {
    id: "img",
    tag: "img",
    title: "图片",
    category: "展示",
    summary: "通过宿主 resolveImage 把 img_key 安全解析为可展示资源。",
    notes: ["img_key 不是 URL", "支持 loading/error/abort 与预览", "alt 来自协议文本"],
    card: card([{
      tag: "img",
      img_key: "renderer-cover",
      alt: text("渲染器界面预览"),
      title: text("由本地演示 resolver 提供"),
      corner_radius: "8px",
      preview: true,
    }]),
  },
  {
    id: "img-combination",
    tag: "img_combination",
    title: "图片组",
    category: "展示",
    summary: "按双图、三图、等分等模式组织多张经 resolver 解析的图片。",
    notes: ["每张图片独立解析和降级", "点击图片组可进入键盘可用的预览对话框"],
    card: card([{
      tag: "img_combination",
      combination_mode: "triple",
      corner_radius: "8px",
      img_list: [
        { img_key: "renderer-cover", alt: text("默认主题") },
        { img_key: "renderer-dark", alt: text("深色主题") },
        { img_key: "renderer-mobile", alt: text("移动端") },
      ],
    }]),
  },
  {
    id: "person",
    tag: "person",
    title: "人员",
    category: "展示",
    summary: "通过宿主 resolvePerson 将人员 ID 解析为姓名和头像。",
    notes: ["无 resolver 时不会猜测姓名", "演示数据为虚构的本地数据"],
    card: card([{
      tag: "person",
      user_id: "ou_demo_ada",
      size: "large",
      show_avatar: true,
      show_name: true,
      style: "capsule",
    }]),
  },
  {
    id: "person-list",
    tag: "person_list",
    title: "人员列表",
    category: "展示",
    summary: "批量展示经 resolver 解析的人员，并限制可见行数。",
    notes: ["每个 ID 独立缓存解析结果", "解析失败保持布局稳定"],
    card: card([{
      tag: "person_list",
      persons: [
        { id: "ou_demo_ada" },
        { id: "ou_demo_lin" },
        { id: "ou_demo_kai" },
      ],
      lines: 2,
      size: "medium",
      show_avatar: true,
      show_name: true,
    }]),
  },
  {
    id: "chart",
    tag: "chart",
    title: "图表",
    category: "展示",
    summary: "将纯数据 chart_spec 交给受控的 VChart 兼容层渲染。",
    notes: ["不执行 chart_spec 中的 JavaScript", "浏览器端懒加载 VChart", "移动端存在官方能力限制"],
    card: card([{
      tag: "chart",
      aspect_ratio: "16:9",
      color_theme: "brand",
      chart_spec: {
        type: "bar",
        data: [{
          id: "usage",
          values: [
            { component: "展示", count: 9 },
            { component: "交互", count: 12 },
            { component: "容器", count: 5 },
          ],
        }],
        xField: "component",
        yField: "count",
        media: [],
      },
    }]),
  },
  {
    id: "table",
    tag: "table",
    title: "表格",
    category: "展示",
    summary: "以语义 table 展示文本、数字、日期、人员和 Markdown 单元格。",
    notes: ["只能直接位于 body.elements", "不能包含其它卡片组件", "窄屏自动横向滚动"],
    card: card([{
      tag: "table",
      page_size: 2,
      row_height: "medium",
      columns: [
        { name: "component", display_name: "组件", data_type: "text", width: "120px" },
        {
          name: "coverage",
          display_name: "覆盖率",
          data_type: "number",
          format: { symbol: "", precision: 0, separator: true },
        },
        { name: "owner", display_name: "维护者", data_type: "persons" },
        { name: "status", display_name: "状态", data_type: "lark_md" },
      ],
      rows: [
        { component: "Renderer", coverage: 100, owner: ["ou_demo_ada"], status: "**稳定**" },
        { component: "Schema", coverage: 100, owner: ["ou_demo_lin"], status: "**稳定**" },
        { component: "Adapters", coverage: 92, owner: ["ou_demo_kai"], status: "持续完善" },
      ],
    }]),
  },
  {
    id: "hr",
    tag: "hr",
    title: "分割线",
    category: "展示",
    summary: "在内容区创建轻量的语义分隔，并接受受控 margin。",
    notes: ["margin 只接受协议允许的 px 语法", "非法样式不会注入 DOM"],
    card: card([
      { tag: "div", text: text("上半部分") },
      { tag: "hr", margin: "8px 0px" },
      { tag: "div", text: text("下半部分") },
    ]),
  },
  {
    id: "input",
    tag: "input",
    title: "输入框",
    category: "交互",
    summary: "原生单行、密码或多行输入，支持默认值、必填和长度限制。",
    notes: ["表单内状态按 name 管理", "表单外修改会立即产生 CardAction"],
    card: card([{
      tag: "input",
      name: "release_note",
      label: text("发布说明"),
      placeholder: text("输入一段说明"),
      default_value: "支持全部 JSON 2.0 运行时组件",
      max_length: 60,
      hover_tips: text("最多 60 个字符"),
    }]),
  },
  {
    id: "button",
    tag: "button",
    title: "按钮",
    category: "交互",
    summary: "触发 callback 或 open_url 行为，也可作为表单 submit/reset。",
    notes: ["disabled 时不响应任何输入", "confirm 在动作前显示确认对话框"],
    card: card([{
      tag: "button",
      name: "publish",
      text: text("模拟发布"),
      value: { source: "component_catalog" },
      confirm: {
        title: text("确认发布"),
        text: text("本演示只会写入本地 action 日志。"),
      },
      behaviors: [{ type: "callback", value: { action: "publish" } }],
    }]),
  },
  {
    id: "overflow",
    tag: "overflow",
    title: "折叠菜单",
    category: "交互",
    summary: "在紧凑按钮中展示可通过键盘操作的动作菜单。",
    notes: ["Enter 打开、Esc 关闭", "菜单项动作统一输出 CardAction"],
    card: card([{
      tag: "overflow",
      name: "more",
      options: [
        { text: text("复制链接"), value: { action: "copy" } },
        { text: text("查看详情"), value: { action: "details" } },
        { text: text("不可用项"), value: { action: "disabled" }, disabled: true },
      ],
    }]),
  },
  {
    id: "select-static",
    tag: "select_static",
    title: "静态单选",
    category: "交互",
    summary: "从协议内声明的静态选项中选择一个值。",
    notes: ["使用原生 select 键盘语义", "表单外选择会立即产生动作"],
    card: card([{
      tag: "select_static",
      name: "priority",
      label: text("优先级"),
      placeholder: text("请选择优先级"),
      initial_option: "medium",
      options: [
        option("低", "low"),
        option("中", "medium"),
        option("高", "high"),
      ],
    }]),
  },
  {
    id: "multi-select-static",
    tag: "multi_select_static",
    title: "静态多选",
    category: "交互",
    summary: "在最近的 form 中选择多个静态值。",
    notes: ["只能位于 form", "提交时作为数组进入 formValue"],
    card: formCard("tags_form", [{
      tag: "multi_select_static",
      name: "tags",
      label: text("发布标签"),
      selected_values: ["stable"],
      options: [
        option("稳定", "stable"),
        option("可访问", "accessible"),
        option("安全", "secure"),
      ],
    }]),
  },
  {
    id: "select-person",
    tag: "select_person",
    title: "人员单选",
    category: "交互",
    summary: "从宿主提供的人员选项中选择一个人员 ID。",
    notes: ["选项值仍是人员 ID", "本地演示不查询真实组织目录"],
    card: card([{
      tag: "select_person",
      name: "owner",
      label: text("负责人"),
      initial_option: "ou_demo_ada",
      options: [
        option("Ada（演示）", "ou_demo_ada"),
        option("Lin（演示）", "ou_demo_lin"),
        option("Kai（演示）", "ou_demo_kai"),
      ],
    }]),
  },
  {
    id: "multi-select-person",
    tag: "multi_select_person",
    title: "人员多选",
    category: "交互",
    summary: "在 form 中选择多个人员 ID，并随表单统一提交。",
    notes: ["只能位于 form", "生产选项应由宿主安全提供"],
    card: formCard("members_form", [{
      tag: "multi_select_person",
      name: "members",
      label: text("协作者"),
      selected_values: ["ou_demo_ada", "ou_demo_lin"],
      options: [
        option("Ada（演示）", "ou_demo_ada"),
        option("Lin（演示）", "ou_demo_lin"),
        option("Kai（演示）", "ou_demo_kai"),
      ],
    }]),
  },
  {
    id: "date-picker",
    tag: "date_picker",
    title: "日期选择器",
    category: "交互",
    summary: "以浏览器原生日期控件选择 YYYY-MM-DD 值。",
    notes: ["表单外变化携带浏览器 IANA 时区", "不隐式使用服务端时区"],
    card: card([{
      tag: "date_picker",
      name: "release_date",
      label: text("发布日期"),
      initial_date: "2026-07-27",
    }]),
  },
  {
    id: "picker-time",
    tag: "picker_time",
    title: "时间选择器",
    category: "交互",
    summary: "以浏览器原生时间控件选择本地时间。",
    notes: ["动作包含浏览器 IANA 时区", "支持键盘与触控输入"],
    card: card([{
      tag: "picker_time",
      name: "release_time",
      label: text("发布时间"),
      initial_time: "09:30",
    }]),
  },
  {
    id: "picker-datetime",
    tag: "picker_datetime",
    title: "日期时间选择器",
    category: "交互",
    summary: "组合日期与本地时间，并通过统一动作携带时区。",
    notes: ["协议初始值使用 YYYY-MM-DD HH:mm", "浏览器控件使用 datetime-local"],
    card: card([{
      tag: "picker_datetime",
      name: "release_at",
      label: text("发布时刻"),
      initial_datetime: "2026-07-27 09:30",
    }]),
  },
  {
    id: "select-img",
    tag: "select_img",
    title: "图片选择",
    category: "交互",
    summary: "以图片作为单选或表单内多选选项，资源仍由 resolveImage 提供。",
    notes: ["表单外只能单选", "表单内才允许 multi_select"],
    card: card([{
      tag: "select_img",
      name: "cover",
      label: text("封面样式"),
      selected_values: ["light"],
      options: [
        { img_key: "renderer-cover", value: "light", text: text("浅色") },
        { img_key: "renderer-dark", value: "dark", text: text("深色") },
      ],
    }]),
  },
  {
    id: "checker",
    tag: "checker",
    title: "勾选器",
    category: "交互",
    summary: "使用原生 checkbox 表达确认、同意或布尔状态。",
    notes: ["required 时只有 true 才算通过", "reset 恢复 checked 初始值"],
    card: card([{
      tag: "checker",
      name: "agree",
      text: text("我理解这只是本地渲染演示"),
      checked: true,
      required: true,
    }]),
  },
];

export const categories: CatalogCategory[] = ["顶层", "容器", "展示", "交互"];

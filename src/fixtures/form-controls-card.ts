const plain = (content: string) => ({ tag: "plain_text" as const, content });

export const formControlsValidationCard = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "form",
      name: "profile",
      elements: [
        {
          tag: "input",
          element_id: "title_field",
          name: "title",
          label: plain("标题"),
          placeholder: plain("请输入标题"),
          hover_tips: plain("用于显示在卡片顶部"),
          default_value: "初始标题",
          required: true,
        },
        {
          tag: "input",
          element_id: "details_field",
          name: "details",
          label: plain("详情"),
          input_type: "multiline_text",
          rows: 3,
          default_value: "初始详情",
          required: true,
        },
        {
          tag: "checker",
          element_id: "terms_field",
          name: "terms",
          text: plain("同意条款"),
          checked: true,
          required: true,
        },
        {
          tag: "select_img",
          element_id: "images_field",
          name: "images",
          label: plain("图片选择"),
          multi_select: true,
          selected_values: ["one"],
          required: true,
          options: [
            { text: plain("图片一"), value: "one", img_key: "image-one" },
            { text: plain("图片二"), value: "two", img_key: "image-two" },
          ],
        },
        {
          tag: "date_picker",
          element_id: "date_field",
          name: "date",
          label: plain("日期"),
          initial_date: "2026-07-28",
          required: true,
        },
        {
          tag: "picker_time",
          element_id: "time_field",
          name: "time",
          label: plain("时间"),
          initial_time: "09:30",
          required: true,
        },
        {
          tag: "picker_datetime",
          element_id: "datetime_field",
          name: "datetime",
          label: plain("日期时间"),
          initial_datetime: "2026-07-28 09:30",
          required: true,
        },
        {
          tag: "button",
          name: "reset",
          form_action_type: "reset",
          text: plain("重置"),
        },
        {
          tag: "button",
          name: "submit",
          form_action_type: "submit",
          value: { intent: "save" },
          text: plain("提交"),
        },
      ],
    }],
  },
} as const;

export const standaloneDateControlsCard = {
  schema: "2.0",
  body: {
    elements: [
      {
        tag: "date_picker",
        element_id: "standalone_date",
        name: "date",
        label: plain("预约日期"),
        initial_date: "2026-07-28",
      },
      {
        tag: "picker_time",
        element_id: "standalone_time",
        name: "time",
        label: plain("预约时间"),
        initial_time: "09:30",
      },
      {
        tag: "picker_datetime",
        element_id: "standalone_at",
        name: "at",
        label: plain("预约日期时间"),
        initial_datetime: "2026-07-28 09:30",
      },
    ],
  },
} as const;

export const singleSelectImageCard = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "select_img",
      element_id: "single_image",
      name: "single-image",
      label: plain("单选图片"),
      selected_values: ["one"],
      options: [
        { text: plain("单图一"), value: "one", img_key: "image-one" },
        { text: plain("单图二"), value: "two", img_key: "image-two" },
      ],
    }],
  },
} as const;

export const collapsibleInteractionCard = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "collapsible_panel",
      element_id: "details_panel",
      expanded: false,
      header: {
        title: plain("更多信息"),
        icon_position: "right",
      },
      elements: [{
        tag: "div",
        text: plain("折叠内容"),
      }],
    }],
  },
} as const;

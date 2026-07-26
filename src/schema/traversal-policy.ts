type RecordValue = Record<string, unknown>;

export type ProtocolChildSlot = {
  readonly value: unknown;
  readonly path: readonly (string | number)[];
  replace(value: unknown): void;
};

const COLLECTION_FIELD_BY_TAG: Readonly<Record<string, string>> = {
  column_set: "columns",
  column: "elements",
  form: "elements",
  interactive_container: "elements",
  collapsible_panel: "elements",
};

const TAGGED_FIELDS_BY_TAG: Readonly<Record<string, readonly string[]>> = {
  div: ["text", "icon"],
  button: ["text"],
  img: ["alt", "title"],
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordSlot(
  parent: RecordValue,
  key: string,
  path: readonly (string | number)[],
): ProtocolChildSlot | undefined {
  const value = parent[key];
  if (!isRecord(value) || typeof value.tag !== "string") return undefined;
  return {
    value,
    path,
    replace: (next) => {
      parent[key] = next;
    },
  };
}

function arraySlots(
  parent: unknown[],
  path: readonly (string | number)[],
): ProtocolChildSlot[] {
  return parent.map((value, index) => ({
    value,
    path: [...path, index],
    replace: (next) => {
      parent[index] = next;
    },
  }));
}

export function componentChildSlots(node: RecordValue): ProtocolChildSlot[] {
  const tag = typeof node.tag === "string" ? node.tag : "";
  const slots: ProtocolChildSlot[] = [];
  const collection = COLLECTION_FIELD_BY_TAG[tag];
  if (collection && Array.isArray(node[collection])) {
    slots.push(...arraySlots(node[collection], [collection]));
  }
  for (const field of TAGGED_FIELDS_BY_TAG[tag] ?? []) {
    const slot = recordSlot(node, field, [field]);
    if (slot) slots.push(slot);
  }
  if (tag === "collapsible_panel" && isRecord(node.header)) {
    const slot = recordSlot(node.header, "title", ["header", "title"]);
    if (slot) slots.push(slot);
  }
  if (tag === "img_combination" && Array.isArray(node.img_list)) {
    node.img_list.forEach((image, index) => {
      if (!isRecord(image)) return;
      const slot = recordSlot(image, "alt", ["img_list", index, "alt"]);
      if (slot) slots.push(slot);
    });
  }
  return slots;
}

export function headerChildSlots(header: RecordValue): ProtocolChildSlot[] {
  const slots: ProtocolChildSlot[] = [];
  for (const field of ["title", "subtitle", "icon"]) {
    const slot = recordSlot(header, field, [field]);
    if (slot) slots.push(slot);
  }
  if (Array.isArray(header.text_tag_list)) {
    slots.push(...arraySlots(header.text_tag_list, ["text_tag_list"]));
  }
  return slots;
}

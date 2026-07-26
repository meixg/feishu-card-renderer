import type { CardComponentTag } from "../schema/components";
import { CARD_COMPONENT_TAGS } from "../schema/components";
import type { Card } from "../schema/card";
import {
  completeContainerCard,
} from "./container-cards";
import { completeComplexContentCard } from "./complex-content";
import { completeInteractiveCard } from "./interactive-card";
import { completeRendererCard } from "./renderer-cards";
import { minimalCardsByTag } from "./schema-cards";

export const FIXTURE_SCENARIOS = [
  "minimal",
  "complete",
  "defaults",
  "invalid",
  "nesting",
  "resources",
] as const;

export type FixtureScenario = (typeof FIXTURE_SCENARIOS)[number];
export type ResourceFixtureMode =
  | "not_applicable"
  | "missing_adapter"
  | "resolved"
  | "rejected";

export type TagCompatibilityFixture = {
  tag: CardComponentTag;
  scenarios: Record<FixtureScenario, Card>;
  resourceModes: readonly ResourceFixtureMode[];
};

const RESOURCE_TAGS = new Set<CardComponentTag>([
  "img",
  "img_combination",
  "person",
  "person_list",
  "chart",
  "select_img",
]);

/**
 * Release-level index for the executable fixtures spread across schema,
 * container, content, interaction, resource, and visual suites. Keeping this
 * index typed makes a newly registered tag fail the matrix test until all six
 * fixture classes are deliberately assigned.
 */
function cloneCard(card: Card): Card {
  return JSON.parse(JSON.stringify(card)) as Card;
}

function invalidCardForTag(tag: CardComponentTag): Card {
  const card = cloneCard(minimalCardsByTag[tag]);
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (!Array.isArray(value) &&
      (value as { tag?: unknown }).tag === tag) {
      (value as { element_id?: unknown }).element_id = "1invalid";
      return true;
    }
    return Object.values(value).some(visit);
  };
  visit(card);
  return card;
}

const CONTAINER_TAGS = new Set<CardComponentTag>([
  "column_set",
  "column",
  "form",
  "interactive_container",
  "collapsible_panel",
]);
const COMPLEX_TAGS = new Set<CardComponentTag>([
  "img_combination",
  "person",
  "person_list",
  "chart",
  "table",
]);
const INTERACTIVE_TAGS = new Set<CardComponentTag>([
  "input",
  "button",
  "overflow",
  "select_static",
  "multi_select_static",
  "select_person",
  "multi_select_person",
  "date_picker",
  "picker_time",
  "picker_datetime",
  "select_img",
  "checker",
]);

function completeCardForTag(tag: CardComponentTag): Card {
  if (CONTAINER_TAGS.has(tag)) return cloneCard(completeContainerCard);
  if (COMPLEX_TAGS.has(tag)) return cloneCard(completeComplexContentCard);
  if (INTERACTIVE_TAGS.has(tag)) return cloneCard(completeInteractiveCard);
  return cloneCard(completeRendererCard);
}

export const compatibilityFixturesByTag = Object.fromEntries(
  CARD_COMPONENT_TAGS.map((tag): [CardComponentTag, TagCompatibilityFixture] => [
    tag,
    {
      tag,
      scenarios: {
        minimal: cloneCard(minimalCardsByTag[tag]),
        complete: completeCardForTag(tag),
        defaults: cloneCard(minimalCardsByTag[tag]),
        invalid: invalidCardForTag(tag),
        nesting: CONTAINER_TAGS.has(tag)
          ? cloneCard(completeContainerCard)
          : cloneCard(minimalCardsByTag[tag]),
        resources: RESOURCE_TAGS.has(tag)
          ? completeCardForTag(tag)
          : cloneCard(minimalCardsByTag[tag]),
      },
      resourceModes: RESOURCE_TAGS.has(tag)
        ? ["missing_adapter", "resolved", "rejected"]
        : ["not_applicable"],
    },
  ]),
) as Record<CardComponentTag, TagCompatibilityFixture>;

export function fixtureCardForTag(tag: CardComponentTag) {
  return compatibilityFixturesByTag[tag].scenarios.minimal;
}

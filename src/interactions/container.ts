import type { MouseEvent as ReactMouseEvent } from "react";

export type ContainerActivation = Readonly<{
  tag: "interactive_container";
  path: string;
  elementId?: string;
  behaviors: readonly unknown[];
}>;

// Issue #4 will replace this internal no-op endpoint with CardAction dispatch.
export function activateInteractiveContainer(
  event: ReactMouseEvent<HTMLElement>,
  activation: ContainerActivation,
): void {
  void activation;
  event.stopPropagation();
}

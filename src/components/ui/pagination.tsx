import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Pagination({
  className,
  "aria-label": ariaLabel = "pagination",
  ...props
}: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label={ariaLabel}
      data-slot="pagination"
      className={cn("fcr-ui-pagination", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("fcr-ui-pagination-content", className)}
      {...props}
    />
  );
}

function PaginationItem(props: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

export { Pagination, PaginationContent, PaginationItem };

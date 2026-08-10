import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

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

type PaginationLinkProps = ComponentProps<typeof Button> & {
  isActive?: boolean;
};

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "ghost"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive || undefined}
      data-slot="pagination-link"
      className={cn("fcr-ui-pagination-link", className)}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("fcr-ui-pagination-previous", className)}
      {...props}
    >
      <ChevronLeft aria-hidden="true" />
      <span className="fcr-ui-pagination-previous-text">{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("fcr-ui-pagination-next", className)}
      {...props}
    >
      <span className="fcr-ui-pagination-next-text">{text}</span>
      <ChevronRight aria-hidden="true" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn(
        "fcr-ui-pagination-ellipsis fcr-ui-button-size-icon",
        className,
      )}
      {...props}
    >
      <MoreHorizontal aria-hidden="true" size={16} />
      <span className="fcr-sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};

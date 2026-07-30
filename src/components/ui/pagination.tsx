import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

type PaginationButtonProps = ComponentProps<typeof Button> & {
  isActive?: boolean;
};

function PaginationButton({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationButtonProps) {
  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "ghost"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      className={cn("fcr-ui-pagination-link", className)}
      {...props}
    />
  );
}

function PaginationPrevious(props: ComponentProps<typeof PaginationButton>) {
  return (
    <PaginationButton size="icon" {...props}>
      <ChevronLeft aria-hidden="true" />
    </PaginationButton>
  );
}

function PaginationNext(props: ComponentProps<typeof PaginationButton>) {
  return (
    <PaginationButton size="icon" {...props}>
      <ChevronRight aria-hidden="true" />
    </PaginationButton>
  );
}

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
};

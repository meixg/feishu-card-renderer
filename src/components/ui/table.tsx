import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Table({
  className,
  containerClassName,
  ...props
}: ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn("fcr-ui-table-container", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("fcr-ui-table", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("fcr-ui-table-header", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("fcr-ui-table-body", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("fcr-ui-table-row", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("fcr-ui-table-head", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("fcr-ui-table-cell", className)}
      {...props}
    />
  );
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };

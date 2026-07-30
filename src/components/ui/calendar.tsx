import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type DayPickerProps,
} from "react-day-picker";
import { enUS, zhCN } from "react-day-picker/locale";
import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { buttonVariants } from "./button-variants";

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type CalendarProps = DayPickerProps & {
  rendererLocale?: string;
};

function Calendar({
  className,
  classNames,
  components,
  rendererLocale = "zh_cn",
  ...props
}: CalendarProps) {
  const chinese = rendererLocale.toLowerCase().startsWith("zh");
  const locale = chinese ? zhCN : enUS;
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      data-slot="calendar"
      className={cn("fcr-ui-calendar", className)}
      classNames={{
        root: cn("fcr-ui-calendar-root", defaults.root),
        months: cn("fcr-ui-calendar-months", defaults.months),
        month: cn("fcr-ui-calendar-month", defaults.month),
        nav: cn("fcr-ui-calendar-nav", defaults.nav),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "fcr-ui-calendar-previous",
          defaults.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "fcr-ui-calendar-next",
          defaults.button_next,
        ),
        month_caption: cn("fcr-ui-calendar-caption", defaults.month_caption),
        caption_label: cn("fcr-ui-calendar-caption-label", defaults.caption_label),
        month_grid: cn("fcr-ui-calendar-grid", defaults.month_grid),
        weekdays: cn("fcr-ui-calendar-weekdays", defaults.weekdays),
        weekday: cn("fcr-ui-calendar-weekday", defaults.weekday),
        week: cn("fcr-ui-calendar-week", defaults.week),
        day: cn("fcr-ui-calendar-day", defaults.day),
        today: cn("fcr-ui-calendar-today", defaults.today),
        outside: cn("fcr-ui-calendar-outside", defaults.outside),
        disabled: cn("fcr-ui-calendar-disabled", defaults.disabled),
        hidden: cn("fcr-ui-calendar-hidden", defaults.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: iconClass, orientation, ...iconProps }) => {
          const Icon = orientation === "left"
            ? ChevronLeftIcon
            : orientation === "right"
              ? ChevronRightIcon
              : ChevronDownIcon;
          return <Icon aria-hidden="true"
            className={cn("fcr-ui-calendar-chevron", iconClass)}
            {...iconProps} />;
        },
        DayButton: (dayProps) => <CalendarDayButton {...dayProps} />,
        ...components,
      }}
      locale={locale}
      labels={{
        labelDayButton: (date, modifiers) =>
          `${isoDate(date)}${modifiers.selected
            ? chinese ? "，已选择" : ", selected"
            : ""}`,
        labelGrid: (date) => chinese
          ? `${date.getFullYear()}年${date.getMonth() + 1}月`
          : date.toLocaleDateString(rendererLocale.replace("_", "-"), {
              month: "long",
              year: "numeric",
            }),
        labelNext: () => chinese ? "转到下个月" : "Go to the Next Month",
        labelPrevious: () => chinese ? "转到上个月" : "Go to the Previous Month",
      }}
      showOutsideDays
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-selected-single={modifiers.selected || undefined}
      className={cn("fcr-ui-calendar-day-button", className)}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };

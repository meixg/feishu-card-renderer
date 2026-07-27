import { DayPicker, type DayPickerProps } from "react-day-picker";
import { enUS, zhCN } from "react-day-picker/locale";

import { cn } from "@/lib/utils";

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
  rendererLocale = "zh_cn",
  ...props
}: CalendarProps) {
  const locale = rendererLocale.toLowerCase().startsWith("zh") ? zhCN : enUS;
  return (
    <DayPicker
      data-slot="calendar"
      className={cn("fcr-ui-calendar", className)}
      locale={locale}
      labels={{
        labelDayButton: (date, modifiers) =>
          `${isoDate(date)}${modifiers.selected ? "，已选择" : ""}`,
        labelGrid: (date) => rendererLocale.toLowerCase().startsWith("zh")
          ? `${date.getFullYear()}年${date.getMonth() + 1}月`
          : date.toLocaleDateString(rendererLocale.replace("_", "-"), {
              month: "long",
              year: "numeric",
            }),
        labelNext: () => "下个月",
        labelPrevious: () => "上个月",
      }}
      showOutsideDays
      {...props}
    />
  );
}

export { Calendar };

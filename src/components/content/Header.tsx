import type { CardHeader, HeaderTemplate } from "../../schema/card";
import { safeBox } from "../../styles/safe";
import { SafeText } from "../primitives/SafeText";

const TEMPLATE_CLASSES = {
  blue: "fcr-header-template-blue",
  wathet: "fcr-header-template-wathet",
  turquoise: "fcr-header-template-turquoise",
  green: "fcr-header-template-green",
  yellow: "fcr-header-template-yellow",
  orange: "fcr-header-template-orange",
  red: "fcr-header-template-red",
  carmine: "fcr-header-template-carmine",
  violet: "fcr-header-template-violet",
  purple: "fcr-header-template-purple",
  indigo: "fcr-header-template-indigo",
  grey: "fcr-header-template-grey",
  default: "fcr-header-template-default",
} as const satisfies Record<HeaderTemplate, string>;

export function Header({ header }: { header: CardHeader }): React.JSX.Element {
  const template = header.template ?? "default";
  return (
    <header className={`fcr-header ${TEMPLATE_CLASSES[template]}`}
      style={{ padding: safeBox(header.padding, false) }}>
      <div className="fcr-header-title"><SafeText text={header.title} /></div>
      {header.subtitle && (
        <div className="fcr-header-subtitle"><SafeText text={header.subtitle} /></div>
      )}
    </header>
  );
}

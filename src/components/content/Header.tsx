import type { CardHeader } from "../../schema/card";
import { safeBox } from "../../styles/safe";
import { SafeText } from "../primitives/SafeText";

export function Header({ header }: { header: CardHeader }): React.JSX.Element {
  return (
    <header className="fcr-header" style={{ padding: safeBox(header.padding, false) }}>
      <div className="fcr-header-title"><SafeText text={header.title} /></div>
      {header.subtitle && (
        <div className="fcr-header-subtitle"><SafeText text={header.subtitle} /></div>
      )}
    </header>
  );
}

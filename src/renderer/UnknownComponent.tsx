export function UnknownComponent({ tag, path }: {
  tag: string;
  path: string;
}): React.JSX.Element {
  return (
    <div className="fcr-unsupported" role="note">
      <span className="fcr-sr-only">不支持的卡片组件</span>
      {import.meta.env.DEV && (
        <span className="fcr-unsupported-details" aria-hidden="true">
          {tag} · {path}
        </span>
      )}
    </div>
  );
}

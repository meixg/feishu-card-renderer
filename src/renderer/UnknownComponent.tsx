export function UnknownComponent({ tag }: { tag: string }): React.JSX.Element {
  void tag;
  return (
    <div className="fcr-unsupported" role="note">
      <span className="fcr-sr-only">不支持的卡片组件</span>
    </div>
  );
}

export type CardRendererProps = {
  card: unknown;
  className?: string;
};

export function CardRenderer({
  card,
  className,
}: CardRendererProps): React.JSX.Element {
  void card;
  const classes = ["fcr-root", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      data-fcr-card-renderer="placeholder"
      role="status"
    >
      <span className="fcr-block">Card renderer foundation ready</span>
    </div>
  );
}

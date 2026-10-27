export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span className={"brand-lockup " + className}>
      <img
        className="brand-lockup__symbol"
        src="/assets/brand/holy-pilot-symbol.svg"
        alt=""
        width="36"
        height="37"
      />
      <span className="brand-lockup__name">HolyPilot</span>
    </span>
  );
}

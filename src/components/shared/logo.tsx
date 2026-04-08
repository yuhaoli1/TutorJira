interface LogoProps {
  size?: number;
  className?: string;
}

// Pure wordmark — Inter Variable, weight 590, tight tracking, brand green.
// No glyph by design.
export function Logo({ size = 15, className = "" }: LogoProps) {
  return (
    <span
      className={`font-[590] tracking-display text-[#163300] ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      Firefly
    </span>
  );
}

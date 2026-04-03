import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 32, className = "" }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="拾萤"
      width={size}
      height={size}
      className={`object-contain flex-shrink-0 ${className}`}
    />
  );
}

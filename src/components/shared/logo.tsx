import Image from "next/image";

/**
 * Logo component that crops the bottom text from the logo image,
 * showing only the firefly mascot.
 *
 * The original logo.png has the firefly in the top ~62% and "拾萤" text below.
 * We use overflow-hidden + extra height on the image to crop out the text.
 */
interface LogoProps {
  /** Display size of the mascot in pixels */
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 32, className = "" }: LogoProps) {
  // Show ~62% of the image (the firefly part), so the image itself
  // needs to be taller than the container: size / 0.62 ≈ size * 1.6
  const imgSize = Math.round(size * 1.6);

  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="拾萤"
        width={imgSize}
        height={imgSize}
        className="absolute top-0 left-1/2 -translate-x-1/2 object-cover object-top"
        style={{ width: imgSize, height: imgSize }}
      />
    </div>
  );
}

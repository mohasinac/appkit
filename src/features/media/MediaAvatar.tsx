import { MediaImage } from "./MediaImage";
import { Div } from "../../ui";

export interface MediaAvatarProps {
  /** Avatar image URL. Shows a 👤 fallback when undefined. */
  src: string | undefined;
  /** Descriptive alt text — required for accessibility. */
  alt: string;
  /** Circular size preset. Defaults to `'md'`. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Additional classes applied to the outer circle wrapper. */
  className?: string;
}

const sizeClasses: Record<NonNullable<MediaAvatarProps["size"]>, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-20 h-20",
};

export function MediaAvatar({
  src,
  alt,
  size = "md",
  className = "",
}: MediaAvatarProps) {
  return (
    <Div
      className={`relative ${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}
    >
      <MediaImage src={src} alt={alt} size="avatar" />
    </Div>
  );
}

export default MediaAvatar;

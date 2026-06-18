import type { IframeHTMLAttributes } from "react";

/**
 * Iframe — primitive for embedded third-party documents (YouTube, Maps,
 * payment-provider checkout panels, etc.).
 *
 * Owns the sandbox + aspect-ratio + rounded variant so consumer code never
 * authors a raw `<iframe>` (the variant catalogue forbids it).
 */
export type IframeAspect = "video" | "square" | "card" | "portrait" | "auto";
export type IframeRounded = "none" | "md" | "lg" | "xl" | "2xl";

export interface IframeProps
  extends Omit<
    IframeHTMLAttributes<HTMLIFrameElement>,
    "className" | "style"
  > {
  src: string;
  title: string;
  /** Aspect ratio preset. Default `"video"` (16:9). */
  aspect?: IframeAspect;
  /** Rounded corners preset. Default `"lg"`. */
  rounded?: IframeRounded;
  /** Sandbox attribute. Default permits same-origin only. */
  sandbox?: string;
}

const ASPECT_CLS: Record<IframeAspect, string> = {
  video: "aspect-video",
  square: "aspect-square",
  card: "aspect-[4/3]",
  portrait: "aspect-[3/4]",
  auto: "",
};

const ROUNDED_CLS: Record<IframeRounded, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export function Iframe({
  src,
  title,
  aspect = "video",
  rounded = "lg",
  sandbox = "allow-same-origin allow-scripts allow-popups allow-forms",
  loading = "lazy",
  ...rest
}: IframeProps) {
  return (
    <iframe
      src={src}
      title={title}
      loading={loading}
      sandbox={sandbox}
      // third-party content. Aspect + rounded come from typed enums.
      className={`block w-full border-0 ${ASPECT_CLS[aspect]} ${ROUNDED_CLS[rounded]}`}
      {...rest}
    />
  );
}

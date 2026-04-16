"use client";

import { useEffect, useRef, useState } from "react";

export interface BackgroundConfig {
  type: "color" | "gradient" | "image" | "video";
  value: string;
  overlay?: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
}

export interface BackgroundRendererProps {
  mode: "light" | "dark";
  lightMode: BackgroundConfig;
  darkMode: BackgroundConfig;
}

export function BackgroundRenderer({
  mode,
  lightMode,
  darkMode,
}: BackgroundRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const config = mode === "dark" ? darkMode : lightMode;

  useEffect(() => {
    if (config.type !== "video") return;
    setIsVideoLoaded(false);
    videoRef.current?.load();
  }, [config.type, config.value]);

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (config.type) {
      case "color":
        return { backgroundColor: config.value };
      case "gradient":
        return { background: config.value };
      case "image":
        return {
          backgroundImage: `url('${config.value}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        };
      case "video":
      default:
        return {};
    }
  };

  const overlayStyle: React.CSSProperties = config.overlay?.enabled
    ? {
        backgroundColor: config.overlay.color,
        opacity: config.overlay.opacity,
      }
    : { display: "none" };

  return (
    <>
      <div
        className="fixed inset-0 -z-10 transition-all duration-500"
        style={getBackgroundStyle()}
      >
        {config.type === "video" && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src={config.value} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      <div
        className="fixed inset-0 -z-[5] transition-all duration-500 pointer-events-none"
        style={overlayStyle}
      />
    </>
  );
}

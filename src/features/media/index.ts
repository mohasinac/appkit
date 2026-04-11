"use client";

// Public API for @mohasinac/feat-media

// Core media display components
export { MediaImage } from "./MediaImage";
export type { MediaImageProps, MediaImageSize } from "./MediaImage";

export { MediaVideo } from "./MediaVideo";
export type { MediaVideoProps } from "./MediaVideo";

export { MediaAvatar } from "./MediaAvatar";
export type { MediaAvatarProps } from "./MediaAvatar";

export { MediaLightbox } from "./MediaLightbox";
export type {
  MediaLightboxProps,
  LightboxItem,
  LightboxLabels,
} from "./MediaLightbox";

// Internal slider (re-exported for advanced use)
export { MediaSlider } from "./components/MediaSlider";
export type { MediaSliderProps } from "./components/MediaSlider";

// Hooks
export {
  useMediaUpload,
  useMediaCrop,
  useMediaTrim,
  useMediaCleanup,
} from "./hooks/useMedia";
export type {
  MediaUploadResult,
  MediaCropInput,
  MediaTrimInput,
} from "./hooks/useMedia";

// Modals
export { ImageCropModal } from "./modals/ImageCropModal";
export type {
  ImageCropData,
  ImageCropModalProps,
} from "./modals/ImageCropModal";

export { VideoTrimModal } from "./modals/VideoTrimModal";
export type { VideoTrimModalProps } from "./modals/VideoTrimModal";

export { VideoThumbnailSelector } from "./modals/VideoThumbnailSelector";
export type { VideoThumbnailSelectorProps } from "./modals/VideoThumbnailSelector";

// Upload components
export { ImageUpload } from "./upload/ImageUpload";
export type { ImageUploadProps } from "./upload/ImageUpload";

export { MediaUploadField } from "./upload/MediaUploadField";
export type { MediaUploadFieldProps } from "./upload/MediaUploadField";

export { MediaUploadList } from "./upload/MediaUploadList";
export type { MediaUploadListProps } from "./upload/MediaUploadList";

export { inferMediaTypeFromMime, mediaFieldSchema } from "./types/index";
export type { MediaField, MediaFieldType } from "./types/index";

export { default as CameraCapture } from "./upload/CameraCapture";
export type { CameraCaptureProps } from "./upload/CameraCapture";

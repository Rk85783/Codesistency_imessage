import { useState } from "react";
import { isImageKitUrl, withTransform } from "../../lib/imagekit";
import { FilmIcon } from "lucide-react";

// Chat videos are stored on ImageKit, so we let ImageKit optimize delivery
// on the fly via URL transformations (compressed + sized for the bubble).
// Note: q-auto isn't enabled for video on this account (returns 400), so use a fixed quality.
// https://imagekit.io/docs/video-transformation
const VIDEO_TRANSFORM = "q-80,w-640";
const POSTER_TRANSFORM = "q-80,w-640";

/** ImageKit can extract a poster frame by appending `/ik-thumbnail.jpg`. */
function buildPosterUrl(url) {
  if (!isImageKitUrl(url)) return undefined;
  const [path] = url.split("?");
  return withTransform(`${path}/ik-thumbnail.jpg`, POSTER_TRANSFORM);
}

/** ImageKit-optimized chat video with an auto-generated poster frame. */
export function MessageVideo({ src }) {
  const optimizedSrc = withTransform(src, VIDEO_TRANSFORM);
  const posterSrc = buildPosterUrl(src);
  const [videoError, setVideoError] = useState(false);

  if (videoError) {
    return (
      <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-2 text-sm text-muted">
        <FilmIcon className="size-4 shrink-0" />
        <span>Video failed to load</span>
      </div>
    );
  }

  return (
    <video
      src={optimizedSrc}
      poster={posterSrc}
      controls
      playsInline
      preload="metadata"
      onError={() => setVideoError(true)}
      className="mb-1.5 max-h-52 max-w-full rounded-lg object-contain sm:max-h-64 sm:rounded-xl"
    />
  );
}

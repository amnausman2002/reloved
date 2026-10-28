"use client";

import { useEffect, useRef } from "react";

// The hero's background video. Started from here rather than with autoPlay so
// that a visitor who has asked her phone for less motion gets the still poster
// instead. Muted is set on the element itself because browsers only let a
// silent video play on its own.
export default function HeroVideo({ className }: { className: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.muted = true;
    video.play().catch(() => {
      // Low-power mode on iPhone refuses to play. The poster stays up.
    });
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src="/photos/hero-video-hd.mp4"
      poster="/photos/hero-video-poster.jpg"
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// The closet video behind the hero, and behind the form at the end of the
// page. Started from here rather than with autoPlay so that a visitor who has
// asked her phone for less motion gets the still poster instead. Muted is set
// on the element itself because browsers only let a silent video play on its
// own.
//
// `lazy` holds off loading until the video is about a screen away, so the
// copy at the end of the page costs nothing until she scrolls towards it.
export default function HeroVideo({ className, lazy = false }: { className: string; lazy?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(!lazy);

  useEffect(() => {
    if (near) return;
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !near) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.muted = true;
    video.play().catch(() => {
      // Low-power mode on iPhone refuses to play. The poster stays up.
    });
  }, [near]);

  return (
    <video
      ref={ref}
      className={className}
      src={near ? "/photos/hero-video-hd.mp4" : undefined}
      poster="/photos/hero-video-poster.jpg"
      muted
      loop
      playsInline
      preload={near ? "auto" : "none"}
      aria-hidden="true"
    />
  );
}

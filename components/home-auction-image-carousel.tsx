"use client";

import { useEffect, useState } from "react";

type HomeAuctionImageCarouselProps = {
  images: string[];
  title: string;
  startDelayMs: number;
};

export function HomeAuctionImageCarousel({
  images,
  title,
  startDelayMs,
}: HomeAuctionImageCarouselProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useEffect(() => {
    if (images.length < 2) return;

    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setSlideIndex((currentIndex) => currentIndex + 1);
      intervalId = window.setInterval(() => {
        setSlideIndex((currentIndex) => currentIndex + 1);
      }, 4000);
    }, startDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [images.length, startDelayMs]);

  const handleTransitionEnd = () => {
    if (slideIndex !== images.length) return;

    setTransitionEnabled(false);
    setSlideIndex(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setTransitionEnabled(true));
    });
  };

  const slides = images.length > 1 ? [...images, images[0]] : images;

  return (
    <div
      aria-label={`${title} images`}
      aria-roledescription="carousel"
      className="relative h-full w-full overflow-hidden"
      role="group"
    >
      <div
        aria-live="off"
        className="flex h-full w-full"
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateX(-${slideIndex * 100}%)`,
          transition: transitionEnabled ? "transform 500ms ease-in-out" : "none",
        }}
      >
        {slides.map((image, index) => (
          <div
            aria-hidden="true"
            className="h-full w-full shrink-0"
            key={`${image}-${index}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

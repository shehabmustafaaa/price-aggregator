"use client";

import { useState } from "react";

export default function ImageGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return <div className="h-48 w-48 rounded-xl bg-gray-800 mx-auto sm:mx-0" />;
  }

  return (
    <div className="mx-auto sm:mx-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[active]}
        alt={alt}
        className="h-56 w-56 object-contain bg-white rounded-xl border border-gray-800 p-2"
      />
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 flex-wrap max-w-56">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-lg border p-0.5 bg-white ${
                i === active ? "border-blue-500" : "border-gray-700"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-10 w-10 object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

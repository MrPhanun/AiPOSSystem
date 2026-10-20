import { useState } from "react";
import { MaskLogo } from "./Brand";

const API_URL = "http://127.0.0.1:8000";

export default function ProductImage({
  url,
  alt,
  className = "",
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  const filename = url?.split("/").pop();

  const imageUrl = url?.startsWith("data:") ? url : filename ? `${API_URL}/product-images/${filename}` : null;

  if (!imageUrl || imageError) {
    return (
      <div className={`grid place-items-center bg-tile ${className}`}>
        <MaskLogo size={56} className="opacity-15" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      className={`object-cover ${className}`}
      onError={() => setImageError(true)}
    />
  );
}

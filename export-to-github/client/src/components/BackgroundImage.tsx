import { useState, useEffect } from 'react';

interface BackgroundImageProps {
  id: number;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export function BackgroundImage({ id, name, className = "", fallbackClassName = "" }: BackgroundImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const fetchImage = async () => {
      try {
        console.log(`BackgroundImage: Fetching image for ID ${id}`);
        const response = await fetch(`/api/backgrounds/image/${id}`);
        console.log(`BackgroundImage: Response status ${response.status} for ID ${id}`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log(`BackgroundImage: Got data for ID ${id}:`, data.dataUrl ? 'data URL received' : 'no data URL');
        setDataUrl(data.dataUrl);
      } catch (error) {
        console.error(`BackgroundImage: Fetch failed for ID ${id}:`, error);
        setImageError(true);
      }
    };

    fetchImage();
  }, [id]);

  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600 text-white ${fallbackClassName}`}>
        <div className="text-center p-4">
          <div className="font-bold text-lg">{name}</div>
          <div className="text-sm opacity-75">Background Preview</div>
        </div>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img
        src={dataUrl}
        alt={name}
        className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
      />
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      )}
    </div>
  );
}
import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ScrollIndicatorProps {
  children: ReactNode;
  className?: string;
  onScroll?: () => void;
}

export function ScrollIndicator({ children, className = "", onScroll }: ScrollIndicatorProps) {
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check for scrollable content
  const checkScrollable = () => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = scrollContainerRef.current;
      const isScrollable = scrollHeight > clientHeight;
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 5;
      setShowScrollIndicator(isScrollable && !isScrolledToBottom);
    }
  };

  useEffect(() => {
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [children]);

  const handleScroll = () => {
    checkScrollable();
    onScroll?.();
  };

  return (
    <div className="relative">
      <div 
        ref={scrollContainerRef}
        className={`max-h-[70vh] sm:max-h-[50vh] overflow-y-auto scrollbar-thin -mr-4 sm:-mr-6 pr-4 sm:pr-6 ${className}`}
        onScroll={handleScroll}
      >
        {children}
      </div>

      {/* Scroll Indicator - Half on modal, half off */}
      {showScrollIndicator && (
        <div className="absolute -bottom-4 left-0 right-0 h-12 flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-to-t from-background/90 to-transparent w-full h-8 absolute bottom-0" />
          <div className="relative z-10 translate-y-2">
            <ChevronDown 
              className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1 text-white animate-bounce" 
              style={{
                background: 'linear-gradient(to right, rgb(168, 85, 247), rgb(236, 72, 153))'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
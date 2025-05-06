import React, { useEffect, useState } from 'react';

interface TypeWriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  highlight?: string; // Text to highlight
}

const TypeWriter: React.FC<TypeWriterProps> = ({ 
  text, 
  speed = 30, 
  onComplete, 
  className = "",
  highlight
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  }, [currentIndex, text, speed, onComplete]);

  // If there's highlighted text, we need to render it differently
  if (highlight && displayText.includes(highlight)) {
    return (
      <div className={className}>
        {displayText.split(highlight).map((part, i, arr) => (
          <React.Fragment key={`part-${i}`}>
            {part}
            {i < arr.length - 1 && (
              <span className="bg-indigo-500/20 px-1 rounded text-indigo-200 font-mono">
                {highlight}
              </span>
            )}
          </React.Fragment>
        ))}
        {!isComplete && <span className="animate-pulse">|</span>}
      </div>
    );
  }

  return (
    <div className={className}>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </div>
  );
};

export default TypeWriter;

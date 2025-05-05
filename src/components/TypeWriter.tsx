
import React, { useState, useEffect } from "react";

interface TypeWriterProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}

const TypeWriter: React.FC<TypeWriterProps> = ({
  text,
  speed = 30,
  delay = 0,
  onComplete,
  className = "",
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    // Initial delay before typing starts
    if (!started) {
      timer = setTimeout(() => {
        setStarted(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    // Start typing after delay
    if (started && index < text.length) {
      timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prevIndex) => prevIndex + 1);
      }, speed);
    } else if (started && index === text.length && onComplete) {
      timer = setTimeout(() => {
        onComplete();
      }, 500);
    }

    return () => clearTimeout(timer);
  }, [text, index, speed, delay, onComplete, started]);

  return (
    <div className={`${className}`}>
      {displayedText}
      {index < text.length && <span className="animate-cursor-blink">|</span>}
    </div>
  );
};

export default TypeWriter;

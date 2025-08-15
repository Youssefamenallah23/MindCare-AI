"use client";

import { useEffect, useState } from "react";

export function TypingText({
  text,
  speed = 40,
  className = "",
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    let current = "";
    const words = text.split(" ");

    const interval = setInterval(() => {
      current += (index > 0 ? " " : "") + words[index];
      setDisplayed(current);
      index++;

      if (index >= words.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <p className={className}>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </p>
  );
}

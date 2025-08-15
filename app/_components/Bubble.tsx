"use client";

import { TypingText } from "@/components/ui/TypingText";
import ReactMarkdown from "react-markdown";

type MessageProp = {
  message: {
    id: string;
    content: string;
    role: string;
  };
};

function cleanContent(text: string) {
  return text
    .replace(/\[ROUTINE_START\]/g, "")
    .replace(/\[ROUTINE_END\]/g, "")
    .replace(/undefined/g, "")
    .replace(/\b(\w+)(?:\s+\1)+\b/gi, "$1") // removes repeated words
    .replace(/\s+/g, " ")
    .trim();
}

export default function Bubble({ message }: MessageProp) {
  const { content, role } = message;
  const cleaned = cleanContent(content);
  const isAssistant = role === "assistant";

  return (
    <div className={`${role} bubble`}>
      {isAssistant ? (
        <TypingText
          text={cleaned}
          speed={40}
          className="text-base leading-relaxed"
        />
      ) : (
        <div className="text-base leading-relaxed">
          <ReactMarkdown>{cleaned}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

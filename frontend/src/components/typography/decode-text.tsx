"use client";

import * as React from "react";

/* Drafting-plot glyphs — mono charset keeps width stable while scrambling. */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/\\_";

interface DecodeTextProps {
  text: string;
}

/**
 * Decode-in effect for mono eyebrows/kickers: characters settle left to
 * right out of a scramble, like a plotter printing an annotation. SSR and
 * reduced-motion render the final string; the scramble only runs as a
 * ~400ms post-mount flourish. AT reads the stable sr-only copy once.
 */
export function DecodeText({ text }: DecodeTextProps) {
  const [display, setDisplay] = React.useState(text);

  // Adjust-state-on-prop-change (render-time, not an effect): a new text
  // snaps the display so the scramble below always starts from fresh copy.
  const [prevText, setPrevText] = React.useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setDisplay(text);
  }

  React.useEffect(() => {
    // Reduced motion: keep the settled text the state already holds.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const totalFrames = Math.max(10, Math.round(text.length * 1.6));
    const id = window.setInterval(() => {
      frame += 1;
      const revealed = Math.floor((frame / totalFrames) * text.length);
      if (frame >= totalFrames) {
        setDisplay(text);
        window.clearInterval(id);
        return;
      }
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " " || i < revealed) return char;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );
    }, 28);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{display}</span>
    </>
  );
}

"use client";

import { useState } from "react";

/** Copies a value to the clipboard and shows a short confirmation. Shows nothing if the clipboard is unavailable. */
export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <span>
      <button type="button" onClick={copy}>Copy</button>
      {copied && <span className="copied">Copied</span>}
    </span>
  );
}

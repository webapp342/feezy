"use client";

import { useState } from "react";
import { AuthFlowModal } from "./AuthFlowModal";

type Props = {
  onAuthed: () => void;
  className?: string;
};

/** Opens modal → connect wallet → auto sign → sync. */
export function SignInButton({ onAuthed, className = "btn" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sign-in-block">
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        Connect wallet
      </button>
      <AuthFlowModal
        open={open}
        onClose={() => setOpen(false)}
        onAuthed={onAuthed}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { AuthFlowModal } from "./AuthFlowModal";

type Props = {
  onAuthed: () => void;
  className?: string;
};

/** Single CTA: opens modal → connect wallet → auto sign-in → sync. */
export function SignInButton({ onAuthed, className = "btn" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sign-in-block">
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        Connect &amp; sign in
      </button>
      <p className="muted small">
        One tap — wallet connect, sign, sync bag.
      </p>
      <AuthFlowModal
        open={open}
        onClose={() => setOpen(false)}
        onAuthed={onAuthed}
      />
    </div>
  );
}

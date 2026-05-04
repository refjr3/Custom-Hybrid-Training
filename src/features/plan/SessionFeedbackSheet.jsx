import { createPortal } from "react-dom";

/**
 * Phase 11.7 builds this out fully.
 * Placeholder component so folder scaffolding can compile now.
 */
export default function SessionFeedbackSheet({ open = false }) {
  if (!open) return null;
  return createPortal(null, document.body);
}

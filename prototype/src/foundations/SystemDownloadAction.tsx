import { useEffect, useId, useRef, useState } from 'react';
import { SystemButton, type SystemButtonProps } from './SystemButton';
import { SystemIcon } from './SystemIcon';
import './system-workbench-panels.css';

export interface SystemDownloadActionProps {
  label: string;
  /** The host generates and saves the real archive; this is not a fake progress control. */
  onDownload: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  unavailableReason?: string;
  /** Visible host failure, e.g. a failed archive or access check. */
  error?: string;
  /** Called only when onDownload rejects. Never silently treats rejection as success. */
  onError?: (error: unknown) => void;
  /** Required fallback if the host lets onDownload reject without setting its own error. */
  failureMessage: string;
  variant?: SystemButtonProps['variant'];
  className?: string;
}

export function SystemDownloadAction({ label, onDownload, loading = false, disabled = false, unavailableReason, error, onError, failureMessage, variant = 'secondary', className = '' }: SystemDownloadActionProps) {
  const id = useId();
  const pending = useRef(false);
  const mounted = useRef(true);
  const [internalPending, setInternalPending] = useState(false);
  const [internalError, setInternalError] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const problem = error || internalError;
  const reason = problem || unavailableReason;
  const unavailable = disabled || Boolean(unavailableReason);
  async function download() {
    if (pending.current || loading || unavailable) return;
    pending.current = true;
    setInternalPending(true); setInternalError('');
    try { await onDownload(); }
    catch (cause) {
      if (mounted.current) setInternalError(failureMessage);
      onError?.(cause);
    } finally { pending.current = false; if (mounted.current) setInternalPending(false); }
  }
  return <div className="system-download-action">
    <SystemButton className={className} variant={variant} disabled={unavailable} loading={loading || internalPending} leadingIcon={<SystemIcon name="download" size={20} />} aria-describedby={reason ? `${id}-reason` : undefined} onClick={() => void download()}>{label}</SystemButton>
    {reason && <p id={`${id}-reason`} className="system-panel-note" data-error={Boolean(problem)}>{reason}</p>}
  </div>;
}

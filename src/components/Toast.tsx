import { useEffect } from "react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="fixed bottom-8 left-1/2 z-50 animate-[toast-in_0.25s_ease-out_forwards]">
      <div className="flex items-center gap-2 rounded-full border border-card-border bg-white px-4 py-3 shadow-lg">
        <div className="size-2 shrink-0 rounded-full bg-status-green" />
        <p className="text-base font-medium whitespace-nowrap text-black">{message}</p>
      </div>
    </div>
  );
}

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export default function GlobalTopProgress() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isBusy = isFetching > 0 || isMutating > 0;

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: number | undefined;
    if (isBusy) {
      setVisible(true);
      setProgress(10);
      interval = window.setInterval(() => {
        setProgress((p) => {
          if (p < 90) return p + Math.random() * 10;
          return p;
        });
      }, 300);
    } else if (visible) {
      // Finish the bar then hide
      setProgress(100);
      const timeout = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => window.clearTimeout(timeout);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isBusy, visible]);

  const widthStyle = useMemo(() => ({ width: `${progress}%` }), [progress]);

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent ${!visible ? 'hidden' : ''}`}>
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 transition-[width] duration-200"
        style={widthStyle}
      />
    </div>
  );
}



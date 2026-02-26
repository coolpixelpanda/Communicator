import { useCallback, useEffect, useRef } from "react";

let audioCtx: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Web Audio not available — silently skip
  }
}

/**
 * Manages browser notifications and notification sounds.
 *
 * On mount, requests Notification permission if not already granted.
 * Exposes `notify()` to show a desktop notification + play a sound,
 * but only when the tab is not focused (mimics Slack behaviour).
 */
export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (!("Notification" in window)) return;
    permissionRef.current = Notification.permission;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      playNotificationSound();

      if (document.hasFocus()) return;
      if (permissionRef.current !== "granted") return;

      const n = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "communicator-msg",
      });

      if (onClick) {
        n.onclick = () => {
          window.focus();
          onClick();
          n.close();
        };
      }

      setTimeout(() => n.close(), 5000);
    },
    []
  );

  return { notify };
}

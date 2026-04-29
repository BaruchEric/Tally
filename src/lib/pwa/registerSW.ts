export function registerServiceWorker(onUpdateReady?: (registration: ServiceWorkerRegistration) => void) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return undefined;
  }

  let cancelled = false;
  const hadController = Boolean(navigator.serviceWorker.controller);

  function attach() {
    if (cancelled) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) {
          return;
        }

        if (registration.waiting && hadController) {
          onUpdateReady?.(registration);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              onUpdateReady?.(registration);
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  }

  if (document.readyState === "complete") {
    attach();
    return () => {
      cancelled = true;
    };
  }

  window.addEventListener("load", attach, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", attach);
  };
}

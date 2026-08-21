"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { APP_VERSION_LABEL } from "@/lib/app-version";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "updating"
  | "latest"
  | "error"
  | "unsupported";

type CheckOptions = {
  userInitiated?: boolean;
};

type PwaUpdateContextValue = {
  currentVersionLabel: string;
  errorMessage: string | null;
  isStandalone: boolean;
  isSupported: boolean;
  showUpdateNotice: boolean;
  status: UpdateStatus;
  dismissUpdateNotice: () => void;
  applyUpdate: () => Promise<void>;
  checkForUpdate: (options?: CheckOptions) => Promise<void>;
};

const CHECK_FAILED_MESSAGE =
  "更新を確認できませんでした。通信環境を確認して、もう一度お試しください。";
const APPLY_FAILED_MESSAGE =
  "更新できませんでした。通信環境を確認して、もう一度お試しください。";
const UPDATE_CHECK_DELAY_MS = 4000;
const AUTO_RECHECK_DELAY_MS = 6000;
const APPLY_UPDATE_TIMEOUT_MS = 10000;

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

function getStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (typeof navigator !== "undefined" && "standalone" in navigator && Boolean(navigator.standalone))
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForWaitingWorker(registration: ServiceWorkerRegistration, timeoutMs: number) {
  if (!("serviceWorker" in navigator) || !registration.active) {
    return Promise.resolve<ServiceWorker | null>(null);
  }

  if (registration.waiting) {
    return Promise.resolve(registration.waiting);
  }

  return new Promise<ServiceWorker | null>((resolve) => {
    let settled = false;
    const cleanupCallbacks: Array<() => void> = [];

    const settle = (worker: ServiceWorker | null) => {
      if (settled) {
        return;
      }

      settled = true;
      for (const cleanup of cleanupCallbacks) {
        cleanup();
      }
      resolve(worker);
    };

    const attachWorker = (worker: ServiceWorker | null) => {
      if (!worker) {
        return;
      }

      const handleStateChange = () => {
        if (worker.state === "installed" && registration.active) {
          settle(registration.waiting ?? worker);
        }
      };

      worker.addEventListener("statechange", handleStateChange);
      cleanupCallbacks.push(() => {
        worker.removeEventListener("statechange", handleStateChange);
      });
    };

    const handleUpdateFound = () => {
      attachWorker(registration.installing);
    };

    const timeoutId = window.setTimeout(() => {
      settle(registration.waiting ?? null);
    }, timeoutMs);

    cleanupCallbacks.push(() => {
      window.clearTimeout(timeoutId);
    });

    registration.addEventListener("updatefound", handleUpdateFound);
    cleanupCallbacks.push(() => {
      registration.removeEventListener("updatefound", handleUpdateFound);
    });

    attachWorker(registration.installing);
  });
}

export function PwaRegistration({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpdateNotice, setShowUpdateNotice] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const dismissedWorkerRef = useRef<ServiceWorker | null>(null);
  const applyRequestedRef = useRef(false);
  const applyTimeoutIdRef = useRef<number | null>(null);
  const statusRef = useRef<UpdateStatus>("idle");
  const checkInFlightRef = useRef<Promise<void> | null>(null);
  const updateFoundHandlerRef = useRef<((event: Event) => void) | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearApplyTimeout = useCallback(() => {
    if (applyTimeoutIdRef.current !== null) {
      window.clearTimeout(applyTimeoutIdRef.current);
      applyTimeoutIdRef.current = null;
    }
  }, []);

  const markUpdateAvailable = useCallback((worker?: ServiceWorker | null, forceNotice = false) => {
    if (worker) {
      if (dismissedWorkerRef.current && dismissedWorkerRef.current !== worker) {
        dismissedWorkerRef.current = null;
      }
      waitingWorkerRef.current = worker;
    }

    setErrorMessage(null);
    setStatus("available");

    if (forceNotice || dismissedWorkerRef.current !== worker) {
      setShowUpdateNotice(true);
    }
  }, []);

  const attachInstallingWorker = useCallback(
    (registration: ServiceWorkerRegistration, worker: ServiceWorker | null) => {
      if (!worker) {
        return;
      }

      const handleStateChange = () => {
        if (worker.state === "installed" && registration.active) {
          markUpdateAvailable(registration.waiting ?? worker);
        }
      };

      worker.addEventListener("statechange", handleStateChange);
    },
    [markUpdateAvailable],
  );

  const checkForUpdate = useCallback(
    async ({ userInitiated = true }: CheckOptions = {}) => {
      if (!("serviceWorker" in navigator)) {
        setIsSupported(false);
        setStatus("unsupported");
        return;
      }

      const registration = registrationRef.current;
      if (!registration) {
        if (userInitiated) {
          setErrorMessage(CHECK_FAILED_MESSAGE);
          setStatus("error");
        }
        return;
      }

      if (statusRef.current === "checking" || statusRef.current === "updating") {
        return checkInFlightRef.current ?? Promise.resolve();
      }

      const task = (async () => {
        setErrorMessage(null);
        setStatus("checking");

        try {
          if (registration.waiting && registration.active) {
            markUpdateAvailable(registration.waiting, userInitiated);
            return;
          }

          await registration.update();
          const waitingWorker = await waitForWaitingWorker(registration, UPDATE_CHECK_DELAY_MS);

          if (waitingWorker) {
            markUpdateAvailable(waitingWorker, userInitiated);
            return;
          }

          if (userInitiated) {
            setStatus("latest");
          } else {
            setStatus("idle");
          }
        } catch {
          if (userInitiated) {
            setErrorMessage(CHECK_FAILED_MESSAGE);
            setStatus("error");
          } else {
            setStatus("idle");
          }
        }
      })();

      checkInFlightRef.current = task;

      try {
        await task;
      } finally {
        checkInFlightRef.current = null;
      }
    },
    [markUpdateAvailable],
  );

  const applyUpdate = useCallback(async () => {
    if (statusRef.current === "updating") {
      return;
    }

    const waitingWorker = waitingWorkerRef.current ?? registrationRef.current?.waiting ?? null;

    if (!waitingWorker) {
      await checkForUpdate();
      return;
    }

    dismissedWorkerRef.current = null;
    clearApplyTimeout();
    setErrorMessage(null);
    setStatus("updating");
    applyRequestedRef.current = true;
    applyTimeoutIdRef.current = window.setTimeout(() => {
      applyTimeoutIdRef.current = null;
      setErrorMessage(APPLY_FAILED_MESSAGE);
      setShowUpdateNotice(true);
      setStatus("error");
    }, APPLY_UPDATE_TIMEOUT_MS);

    try {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } catch {
      clearApplyTimeout();
      applyRequestedRef.current = false;
      setErrorMessage(APPLY_FAILED_MESSAGE);
      setShowUpdateNotice(true);
      setStatus("error");
    }
  }, [checkForUpdate, clearApplyTimeout]);

  const dismissUpdateNotice = useCallback(() => {
    dismissedWorkerRef.current = waitingWorkerRef.current;
    setShowUpdateNotice(false);
  }, []);

  useEffect(() => {
    setIsStandalone(getStandaloneMode());

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setIsSupported(false);
      setStatus("unsupported");
      return;
    }

    setIsSupported(true);

    let cancelled = false;
    let delayedCheckId: number | null = null;

    const handleControllerChange = () => {
      if (!applyRequestedRef.current) {
        return;
      }

      clearApplyTimeout();
      applyRequestedRef.current = false;
      window.location.reload();
    };

    const runAutoCheck = () => {
      void checkForUpdate({ userInitiated: false });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runAutoCheck();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    window.addEventListener("focus", runAutoCheck);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        if (cancelled) {
          return;
        }

        registrationRef.current = registration;

        if (registration.waiting && registration.active) {
          markUpdateAvailable(registration.waiting);
        }

        attachInstallingWorker(registration, registration.installing);

        const handleUpdateFound = () => {
          attachInstallingWorker(registration, registration.installing);
        };

        updateFoundHandlerRef.current = handleUpdateFound;
        registration.addEventListener("updatefound", handleUpdateFound);

        runAutoCheck();
        delayedCheckId = window.setTimeout(() => {
          runAutoCheck();
        }, AUTO_RECHECK_DELAY_MS);
      } catch {
        if (!cancelled) {
          setErrorMessage(CHECK_FAILED_MESSAGE);
          setStatus("error");
        }
      }
    };

    void register();

    return () => {
      cancelled = true;
      applyRequestedRef.current = false;
      clearApplyTimeout();
      if (delayedCheckId !== null) {
        window.clearTimeout(delayedCheckId);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("focus", runAutoCheck);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      const registration = registrationRef.current;
      if (registration && updateFoundHandlerRef.current) {
        registration.removeEventListener("updatefound", updateFoundHandlerRef.current);
      }
    };
  }, [attachInstallingWorker, checkForUpdate, clearApplyTimeout, markUpdateAvailable]);

  const contextValue = useMemo<PwaUpdateContextValue>(
    () => ({
      currentVersionLabel: APP_VERSION_LABEL,
      errorMessage,
      isStandalone,
      isSupported,
      showUpdateNotice,
      status,
      dismissUpdateNotice,
      applyUpdate,
      checkForUpdate,
    }),
    [applyUpdate, checkForUpdate, dismissUpdateNotice, errorMessage, isStandalone, isSupported, showUpdateNotice, status],
  );

  return <PwaUpdateContext.Provider value={contextValue}>{children}</PwaUpdateContext.Provider>;
}

export function usePwaUpdate() {
  const value = useContext(PwaUpdateContext);

  if (!value) {
    throw new Error("usePwaUpdate must be used within PwaRegistration");
  }

  return value;
}

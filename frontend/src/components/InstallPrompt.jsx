import { useEffect, useState } from "react";

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackInstructions, setFallbackInstructions] = useState("");

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // show modal unobtrusively when available
      setShowModal(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    // hide UI after successful install
    const onInstalled = () => {
      setShowModal(false);
      setShowFallback(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        console.log("PWA install choice:", choice);
      } catch (err) {
        console.error(err);
      }
      setDeferredPrompt(null);
      setShowModal(false);
    } else {
      // Fallback: show manual instructions for browsers that don't expose the prompt
      setShowFallback(true);
      const ua = navigator.userAgent || "";
      let instr = 'Open your browser menu and choose "Add to Home screen" or "Install app".';
      if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && "ontouchend" in document)) {
        instr = 'In Safari: tap the Share button → "Add to Home Screen".';
      } else if (/android/i.test(ua) && /chrome/i.test(ua)) {
        instr = 'In Chrome: tap the browser menu (⋮) → "Add to Home screen". Or accept the install prompt if shown.';
      } else if (/firefox/i.test(ua)) {
        instr = 'In Firefox: open the browser menu → "Install" or "Add to Home screen".';
      } else if (/edg\//i.test(ua) || /edge/i.test(ua)) {
        instr = 'In Edge: open the browser menu → "Apps" → "Install this site as an app".';
      }
      setFallbackInstructions(instr);
    }
  };

  const closeFallback = () => {
    setShowFallback(false);
    setShowModal(false);
  };

  return (
    <>
      {/* Small unobtrusive trigger (hidden on md and larger screens) */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setShowModal(true)}
          className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg"
          aria-label="Open install modal"
          title="Install App"
        >
          {/* simple plus/install glyph */}
          <span className="text-lg">⬇️</span>
        </button>
      </div>

      {/* Modal for install prompt or instructions */}
      {showModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded max-w-sm w-full">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold">Install ArogyaNidhi</h3>
              <button onClick={() => setShowModal(false)} className="ml-4 text-gray-500">✕</button>
            </div>
            <p className="mb-4">Get quick access to the app from your device.</p>

            {!showFallback && deferredPrompt && (
              <div className="flex gap-2">
                <button onClick={handleInstallClick} className="px-3 py-2 bg-blue-600 text-white rounded">Install</button>
                <button onClick={() => setShowModal(false)} className="px-3 py-2 border rounded">Close</button>
              </div>
            )}

            {(!deferredPrompt || showFallback) && (
              <>
                <h4 className="font-medium mb-2">Add to Home Screen</h4>
                <p className="mb-4">{fallbackInstructions || 'Open your browser menu and choose "Add to Home screen" or "Install app".'}</p>
                <div className="flex justify-between gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(fallbackInstructions || '').catch(() => {});
                    }}
                    className="px-3 py-2 border rounded"
                  >
                    Copy Instructions
                  </button>
                  <button onClick={closeFallback} className="px-3 py-2 border rounded">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPrompt;

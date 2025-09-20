import { useEffect } from "react";

/**
 * Global image watermarking hook.
 * - Attempts to bake a large, semi-transparent text watermark into the image via canvas (so Save As keeps it)
 * - Falls back to a CSS overlay if the image is CORS-tainted
 * - Targets property hero/gallery images and any <img data-wm="1"> across the app
 * - Skips tiny images to avoid icons/logos
 */
export function useWatermark() {
  useEffect(() => {
    const TEXT = "AshishProperties.in";
    const FONT_WEIGHT = 800;

    const selectors = [
      '[data-role="property-hero"] img',
      ".property-hero img",
      ".property-gallery img",
      ".lightbox img",
      '[role="dialog"] img',
      'img[data-wm="1"]',
      // Broaden selectors to cover all post/listing images so watermark appears on all posts
      ".property-card img",
      ".property-tile img",
      ".listing-card img",
      ".post-card img",
      ".ad-card img",
      ".featured-ad img",
      ".property-listing img",
      ".property-item img",
      ".listing img",
      // Fallback: images inside common card container classes
      ".card img",
    ];

    const exclude = (img: HTMLImageElement) => {
      if (!img || img.dataset.noWm === "true") return true;
      if (img.classList.contains("no-wm")) return true;
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (w < 120 || h < 120) return true; // ignore small images/icons
      return false;
    };

    const alreadyProcessed = (img: HTMLImageElement) =>
      img.dataset.wmProcessed === "1";
    const markProcessed = (img: HTMLImageElement) => {
      img.dataset.wmProcessed = "1";
    };

    const ensureLoaded = (img: HTMLImageElement) =>
      new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("img-error"));
        };
        const cleanup = () => {
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
        };
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);
      });

    const measureTextWithSpacing = (
      ctx: CanvasRenderingContext2D,
      text: string,
      letterSpacing: number,
    ) => {
      let w = 0;
      for (let i = 0; i < text.length; i++) {
        const m = ctx.measureText(text[i]);
        w += m.width;
        if (i !== text.length - 1) w += letterSpacing;
      }
      return w;
    };

    // Draws a big watermark text in the bottom-right corner
    const bakeWatermark = async (img: HTMLImageElement) => {
      await ensureLoaded(img);

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) throw new Error("no-size");

      // Try to load with CORS enabled
      const src = img.currentSrc || img.src;
      const off = new Image();
      off.crossOrigin = "anonymous";
      off.decoding = "async";
      off.loading = "eager";
      const loadPromise = new Promise<void>((resolve, reject) => {
        off.onload = () => resolve();
        off.onerror = () => reject(new Error("cors-blocked"));
      });
      off.src = src;
      await loadPromise;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("ctx");

      // Paint original
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off, 0, 0, w, h);

      // Fixed watermark size and placement (~12px) bottom-right
      const fontPx = 12;
      const letterSpacingPx = Math.round(fontPx * 0.05);

      ctx.font = `${FONT_WEIGHT} ${fontPx}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      const text = TEXT;
      const textW = measureTextWithSpacing(ctx, text, letterSpacingPx);

      const margin = 8;
      const xStart = Math.max(0, w - textW - margin);
      const y = Math.max(fontPx + margin, h - margin);

      // Draw subtle shadow/outline for readability
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;

      // Manual draw to apply letter spacing
      let x = xStart;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        ctx.strokeText(ch, x, y);
        ctx.fillText(ch, x, y);
        x += ctx.measureText(ch).width + letterSpacingPx;
      }
      ctx.restore();

      // Export as blob/URL
      return await new Promise<string>((resolve, reject) => {
        try {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                resolve(url);
              } else {
                try {
                  const data = canvas.toDataURL();
                  resolve(data);
                } catch (e) {
                  reject(new Error("toDataURL"));
                }
              }
            },
            "image/png",
            0.92,
          );
        } catch (e) {
          reject(new Error("tainted"));
        }
      });
    };

    // CSS fallback overlay (when canvas is tainted)
    const setOverlay = (img: HTMLImageElement) => {
      const parent =
        img.closest(
          "[data-role=property-hero], .property-hero, .lightbox, [role=dialog], [role='dialog']",
        ) || img.parentElement;
      if (!parent) return;

      const host = parent as HTMLElement;
      const prev = host.querySelector<HTMLElement>("[data-wm-overlay='1']");
      if (prev) return;

      const rect = img.getBoundingClientRect();
      const dispW = Math.max(1, rect.width || img.width);
      const dispH = Math.max(1, rect.height || img.height);

      if (getComputedStyle(host).position === "static")
        host.style.position = "relative";

      const overlay = document.createElement("div");
      overlay.setAttribute("data-wm-overlay", "1");
      overlay.setAttribute("aria-hidden", "true");
      // Overlay host
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "60";
      overlay.style.display = "block";

      // Single bottom-right label (~12px)
      const label = document.createElement("div");
      label.textContent = TEXT;
      label.style.position = "absolute";
      label.style.right = "8px";
      label.style.bottom = "6px";
      label.style.font = `${FONT_WEIGHT} 12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      label.style.color = "rgba(255,255,255,0.95)";
      label.style.textShadow = "0 1px 2px rgba(0,0,0,0.6)";
      label.style.userSelect = "none";
      label.style.pointerEvents = "none";
      label.style.whiteSpace = "nowrap";
      host.appendChild(overlay);
      overlay.appendChild(label);
    };

    const process = async (img: HTMLImageElement) => {
      if (alreadyProcessed(img) || exclude(img)) return;
      try {
        const url = await bakeWatermark(img);
        if (url) {
          const prev = img.dataset.wmUrl;
          img.src = url;
          img.dataset.wmUrl = url;
          if (prev && prev.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(prev);
            } catch {}
          }
          markProcessed(img);
          return;
        }
      } catch {
        // Fall back to CSS overlay
      }
      setOverlay(img);
      markProcessed(img);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.target instanceof HTMLImageElement) {
            process(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.1 },
    );

    const observeExisting = () => {
      const nodes = document.querySelectorAll<HTMLImageElement>(
        selectors.join(","),
      );
      nodes.forEach((img) => {
        if (!alreadyProcessed(img) && !exclude(img)) io.observe(img);
      });
    };

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n instanceof HTMLImageElement) {
              if (!alreadyProcessed(n) && !exclude(n)) io.observe(n);
            } else if (n instanceof HTMLElement) {
              const imgs = n.querySelectorAll<HTMLImageElement>(
                selectors.join(","),
              );
              imgs.forEach((img) => {
                if (!alreadyProcessed(img) && !exclude(img)) io.observe(img);
              });
            }
          });
        } else if (
          m.type === "attributes" &&
          m.target instanceof HTMLImageElement &&
          m.attributeName === "src"
        ) {
          const img = m.target as HTMLImageElement;
          img.dataset.wmProcessed = ""; // reset so it can reprocess on new src
          if (!exclude(img)) io.observe(img);
        }
      }
    });

    observeExisting();
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      try {
        io.disconnect();
      } catch {}
      try {
        mo.disconnect();
      } catch {}
      document
        .querySelectorAll<HTMLElement>("[data-wm-overlay='1']")
        .forEach((el) => el.remove());
    };
  }, []);
}

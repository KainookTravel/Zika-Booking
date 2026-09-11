"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useLanguageStore } from "@/stores/language";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

// ── Monkey-patch DOM methods to prevent Google Translate React crashes ───────
// Google Translate wraps text nodes in <font> tags. When React subsequently updates
// (e.g. after promotions or vouchers fetch), React calls insertBefore or removeChild
// assuming its original DOM tree. Because <font> tags altered parentNode references,
// native DOM throws: "NotFoundError: Failed to execute 'insertBefore' on 'Node'".
// This patch safely finds the proper parent/sibling or falls back cleanly.
if (typeof window !== "undefined") {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      let target: Node | null = referenceNode;
      while (target && target.parentNode && target.parentNode !== this) {
        target = target.parentNode;
      }
      if (target && target.parentNode === this) {
        return originalInsertBefore.call(this, newNode, target) as T;
      }
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child) as T;
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
}

export function GoogleTranslateScript() {
  const currentLanguage = useLanguageStore((s) => s.currentLanguage);

  useEffect(() => {
    // ── Aggressive suppression of Google Translate top toolbar banner ─────────
    const suppressGoogleBanner = () => {
      if (document.body.style.top && document.body.style.top !== "0px") {
        document.body.style.setProperty("top", "0px", "important");
      }
      if (document.body.style.position === "relative") {
        document.body.style.setProperty("position", "static", "important");
      }
      if (document.documentElement.style.top && document.documentElement.style.top !== "0px") {
        document.documentElement.style.setProperty("top", "0px", "important");
      }

      const bannerElements = document.querySelectorAll<HTMLElement>(
        'iframe.goog-te-banner-frame, iframe.skiptranslate, iframe[class*="VIpgJd"], .VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-ORHb-OEVmcd-ti6hGc, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, #goog-gt-tt, .goog-te-balloon-frame'
      );
      bannerElements.forEach((el) => {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("height", "0px", "important");
        el.style.setProperty("width", "0px", "important");
        el.style.setProperty("position", "absolute", "important");
        el.style.setProperty("top", "-9999px", "important");
        el.style.setProperty("pointer-events", "none", "important");
      });
    };

    suppressGoogleBanner();

    const observer = new MutationObserver(suppressGoogleBanner);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
      childList: true,
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
      childList: true,
    });

    const interval = setInterval(suppressGoogleBanner, 300);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    window.googleTranslateElementInit = () => {
      const googleObj = (window as any).google;
      if (googleObj?.translate?.TranslateElement) {
        // Without includedLanguages, Google Translate supports ALL 133+ languages
        new googleObj.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
          },
          "google_translate_element"
        );

        // Apply saved language after element mounts if not default
        const lang = useLanguageStore.getState().currentLanguage;
        if (lang && lang !== "en") {
          setTimeout(() => {
            const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
            if (select && select.value !== lang) {
              select.value = lang;
              select.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }, 600);
        }
      }
    };
  }, []);

  // When language changes in store, sync with google translate select if present
  useEffect(() => {
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (select && select.value !== currentLanguage) {
      select.value = currentLanguage;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, [currentLanguage]);

  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }} aria-hidden="true" />
      <Script
        id="google-translate-script"
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}

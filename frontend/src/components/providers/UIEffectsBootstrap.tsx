"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-reveal]";

export default function UIEffectsBootstrap() {
  useEffect(() => {
    const { body } = document;

    const updateScrollState = () => {
      if (window.scrollY > 12) {
        body.classList.add("has-scrolled");
      } else {
        body.classList.remove("has-scrolled");
      }
    };

    body.classList.add("reveal-ready");
    updateScrollState();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.15,
      }
    );

    const observeRevealTargets = (root: ParentNode = document) => {
      const revealElements = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
      revealElements.forEach((element) => {
        if (!element.classList.contains("is-visible")) {
          observer.observe(element);
        }
      });
    };

    observeRevealTargets();

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches(REVEAL_SELECTOR)) {
            observer.observe(node);
          }
          observeRevealTargets(node);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      body.classList.remove("reveal-ready", "has-scrolled");
      mutationObserver.disconnect();
      observer.disconnect();
      window.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  return null;
}

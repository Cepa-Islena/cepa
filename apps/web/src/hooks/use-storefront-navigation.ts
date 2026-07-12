"use client";

import { useCallback, useEffect, useState } from "react";

const sectionAnchorGapPx = 0;

export function useStorefrontNavigation() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [headerOnMedia, setHeaderOnMedia] = useState(true);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((open) => !open), []);

  const scrollToSection = useCallback((sectionId: string) => {
    setMobileNavOpen(false);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(sectionId);
        if (!target) return;

        const headerHeight = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().height ?? 0;
        const dropStats = document.querySelector<HTMLElement>(".drop-stats");
        const dropStatsStyle = dropStats ? window.getComputedStyle(dropStats) : null;
        const dropStatsTop = dropStatsStyle?.position === "sticky" ? Number.parseFloat(dropStatsStyle.top) || 0 : 0;
        const dropStatsBottom =
          dropStatsStyle?.position === "sticky" ? dropStatsTop + (dropStats?.getBoundingClientRect().height ?? 0) : 0;
        const stickyStackHeight = Math.max(headerHeight, dropStatsBottom);
        const scrollTop = target.getBoundingClientRect().top + window.scrollY - stickyStackHeight - sectionAnchorGapPx;

        window.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });
        window.history.replaceState(null, "", `#${sectionId}`);
      });
    });
  }, []);

  useEffect(() => {
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;

    const timeout = window.setTimeout(() => scrollToSection(sectionId), 250);
    return () => window.clearTimeout(timeout);
  }, [scrollToSection]);

  useEffect(() => {
    const updateHeaderTone = () => {
      const hero = document.getElementById("shop");
      if (!hero) {
        setHeaderOnMedia(false);
        return;
      }
      // Stay on-media while hero still covers the sticky header area
      setHeaderOnMedia(hero.getBoundingClientRect().bottom > 96);
    };

    updateHeaderTone();
    window.addEventListener("scroll", updateHeaderTone, { passive: true });
    window.addEventListener("resize", updateHeaderTone);
    return () => {
      window.removeEventListener("scroll", updateHeaderTone);
      window.removeEventListener("resize", updateHeaderTone);
    };
  }, []);

  return {
    mobileNavOpen,
    closeMobileNav,
    toggleMobileNav,
    scrollToSection,
    headerOnMedia,
  };
}

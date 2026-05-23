"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function LayoutVisibilityClient({ children }) {
  const pathname = usePathname();

  // Add the note-taking/create path to your hidden list
  const shouldHideLayout = 
    pathname.startsWith("/cha-ching") || 
    pathname.startsWith("/feature-guide") ||
    pathname.startsWith("/note-taking"); 

  useEffect(() => {
    const header = document.querySelector("header");
    const footerEl = document.querySelector("footer");

    if (shouldHideLayout) {
      if (header) header.style.display = "none";
      if (footerEl) footerEl.style.display = "none";
    } else {
      if (header) header.style.display = "";
      if (footerEl) footerEl.style.display = "";
    }
    
    // Cleanup function to ensure styles reset if component unmounts
    return () => {
      if (header) header.style.display = "";
      if (footerEl) footerEl.style.display = "";
    };
  }, [pathname, shouldHideLayout]);

  return <>{children}</>;
}
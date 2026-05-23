"use client";

import { usePathname } from "next/navigation";
import React from "react";

const MainLayout = ({ children }) => {
  const pathname = usePathname();
  const shouldHideLayout = pathname.startsWith("/cha-ching") || pathname.startsWith("/note-taking");

  return (
    <div className={`container mx-auto ${shouldHideLayout ? "my-0 mb-0" : "my-32"}`}>
      {children}
    </div>
  );
};

export default MainLayout;

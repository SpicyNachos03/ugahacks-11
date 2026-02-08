"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

export function Header() {
  const pathname = usePathname();
  const isOnMaps = pathname === "/maps";

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <header className="w-full max-w-5xl rounded-2xl border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center space-x-8">
            {/* Logo and title */}
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-primary"></div>
              <span className="font-semibold text-sm">Supa Idle</span>
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center space-x-6">
              <a
                href="#features"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {isOnMaps ? "Output" : "Features"}
              </a>

              {!isOnMaps && (
                <a
                  href="#pricing"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Impacts
                </a>
              )}

              {/* Github link */}
              <a
                href="https://github.com/SpicyNachos03/ugahacks-11"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Github
              </a>
            </nav>
          </div>

          {/* Button: Get Started / Home */}
          <div className="flex items-center space-x-3">
            <Button asChild size="sm" className="text-xs h-8">
              <Link href={isOnMaps ? "/" : "/maps"}>
                {isOnMaps ? "Home" : "Get Started"}
              </Link>
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
}

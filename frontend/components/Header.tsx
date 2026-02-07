"use client";

import { Button } from "./ui/button";
import { Menu } from "lucide-react";

export function Header() {
  return (
    // Wrapper to handle positioning and width constraint
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <header className="w-full max-w-5xl rounded-2xl border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-primary"></div>
              <span className="font-semibold text-sm">Title Title</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#docs" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="hidden md:inline-flex text-xs">
              Sign In
            </Button>
            <Button size="sm" className="text-xs h-8">Get Started</Button>
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
}
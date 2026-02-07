"use client";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowRight, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HeroSection() {
  const sceneRef = useRef<HTMLDivElement>(null);
  
  // State to handle random particles to prevent SSR hydration mismatch
  const [particles, setParticles] = useState<{
    left: string;
    top: string;
    delay: string;
    duration: string;
  }[]>([]);

  useEffect(() => {
    // Generate particles only on the client
    const generatedParticles = [...Array(20)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`
    }));
    setParticles(generatedParticles);

    const scene = sceneRef.current;
    if (!scene) return;

    const cards = scene.querySelectorAll('.floating-card');
    
    const animateCards = () => {
      cards.forEach((card, index) => {
        const element = card as HTMLElement;
        const time = Date.now() * 0.001;
        const offset = index * 0.5;
        
        const x = Math.sin(time + offset) * 30;
        const y = Math.cos(time + offset * 1.2) * 20;
        const rotateX = Math.sin(time + offset) * 10;
        const rotateY = Math.cos(time + offset * 0.8) * 15;
        
        element.style.transform = `
          translate3d(${x}px, ${y}px, 0) 
          rotateX(${rotateX}deg) 
          rotateY(${rotateY}deg)
        `;
      });
      
      requestAnimationFrame(animateCards);
    };
    
    const animationId = requestAnimationFrame(animateCards);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4 text-center">
        <Badge variant="secondary" className="mb-6">
          🎉 Wow! Very cool website! Slogan! Words! Yippee!
        </Badge>
        <h1 className="mx-auto max-w-4xl text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">
          Build sustainable{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-grey-500">
            cooling technique systems
          </span>{" "}
          at scale
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-8">
          Maintain and optimize your design system with our comprehensive platform. 
          Reduce your carboon footprint and involve the community to make sustainable change.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button size="lg" className="w-full sm:w-auto">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <Play className="mr-2 h-4 w-4" />
            Watch Demo
          </Button>
        </div>
        
        {/* 3D Graphics Scene */}
        <div className="relative mx-auto max-w-5xl h-96 lg:h-[500px]">
          <div 
            ref={sceneRef}
            className="relative w-full h-full [perspective:1000px]"
            style={{ perspective: '1000px' }}
          >
            {/* Central Hub */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-primary to-primary/70 rounded-3xl shadow-2xl flex items-center justify-center z-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                <div className="w-8 h-8 bg-primary rounded-lg"></div>
              </div>
            </div>
            
            {/* Floating Design System Components */}
            <div className="floating-card absolute top-16 left-20 w-40 h-24 bg-card border rounded-2xl shadow-lg p-4 transform-gpu">
              <div className="text-xs text-muted-foreground mb-2">Button</div>
              <div className="space-y-2">
                <div className="h-3 bg-primary rounded w-16"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            </div>
            
            <div className="floating-card absolute top-32 right-16 w-36 h-28 bg-card border rounded-2xl shadow-lg p-4 transform-gpu">
              <div className="text-xs text-muted-foreground mb-2">Colors</div>
              <div className="grid grid-cols-4 gap-1">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <div className="w-4 h-4 bg-secondary rounded"></div>
                <div className="w-4 h-4 bg-accent rounded"></div>
                <div className="w-4 h-4 bg-muted rounded"></div>
                <div className="w-4 h-4 bg-destructive rounded"></div>
              </div>
            </div>
            
            <div className="floating-card absolute bottom-20 left-12 w-44 h-32 bg-card border rounded-2xl shadow-lg p-4 transform-gpu">
              <div className="text-xs text-muted-foreground mb-2">Typography</div>
              <div className="space-y-2">
                <div className="h-4 bg-foreground/90 rounded w-32"></div>
                <div className="h-3 bg-foreground/70 rounded w-28"></div>
              </div>
            </div>

            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="url(#lineGradient)" strokeWidth="2" className="animate-pulse" />
              <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="url(#lineGradient)" strokeWidth="2" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
            </svg>
            
            {/* Background Particles - Now Hydration Safe */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {particles.map((style, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse"
                  style={{
                    left: style.left,
                    top: style.top,
                    animationDelay: style.delay,
                    animationDuration: style.duration
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
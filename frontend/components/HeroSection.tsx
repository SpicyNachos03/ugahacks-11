"use client";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowRight, Play, Monitor, Lightbulb, Zap, Library, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HeroSection() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<{
    left: string;
    top: string;
    delay: string;
    duration: string;
  }[]>([]);

  useEffect(() => {
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
        const offset = index * 0.8;
        
        const x = Math.sin(time + offset) * 40;
        const y = Math.cos(time + offset * 1.1) * 25;
        const rotateX = Math.sin(time + offset) * 12;
        const rotateY = Math.cos(time + offset * 0.7) * 18;
        
        element.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      requestAnimationFrame(animateCards);
    };
    
    const animationId = requestAnimationFrame(animateCards);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <Badge variant="secondary" className="mb-6 bg-emerald-100 text-emerald-700 border-emerald-200">
          🎉 Wow! Very cool website! Slogan! Words! Yippee!
        </Badge>
        <h1 className="mx-auto max-w-4xl text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6 text-emerald-950">
          Build sustainable{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
            cooling technique systems
          </span>{" "}
          at scale
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-emerald-800/70 mb-8">
          Maintain and optimize your cooling systems with our comprehensive platform. 
          Reduce your carbon footprint and involve the community to make sustainable change.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Play className="mr-2 h-4 w-4 fill-emerald-600 text-emerald-600" />
            Watch Demo
          </Button>
        </div>
        
        <div className="relative mx-auto max-w-5xl h-[500px] lg:h-[600px]">
          <div ref={sceneRef} className="relative w-full h-full [perspective:1000px]">
            
            {/* BACKGROUND LAYER: Lines and Particles */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 z-0">
              <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="#10b981" strokeWidth="1" className="animate-pulse" />
              <line x1="50%" y1="50%" x2="80%" y2="35%" stroke="#10b981" strokeWidth="1" className="animate-pulse" />
              <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="#10b981" strokeWidth="1" className="animate-pulse" />
              <line x1="50%" y1="50%" x2="75%" y2="80%" stroke="#10b981" strokeWidth="1" className="animate-pulse" />
            </svg>
            
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              {particles.map((style, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-emerald-500/30 rounded-full animate-pulse"
                  style={{
                    left: style.left,
                    top: style.top,
                    animationDelay: style.delay,
                    animationDuration: style.duration
                  }}
                />
              ))}
            </div>

            {/* FOREGROUND LAYER: Central Hub and Floating Cards */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl shadow-2xl flex items-center justify-center z-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg animate-pulse"></div>
              </div>
            </div>
            
            <div className="floating-card absolute top-10 left-[10%] w-44 h-28 
              bg-white/80 backdrop-blur-lg border border-emerald-100
              rounded-2xl shadow-xl p-4 transform-gpu z-10">
              <div className="flex items-center gap-2 text-xs text-emerald-700/70 mb-2 font-medium">
                <Monitor className="h-3 w-3" /> College Computers
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-emerald-500/20 rounded w-full"></div>
                <div className="h-2 bg-emerald-500/40 rounded w-3/4"></div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] font-mono uppercase text-emerald-600 font-bold">Optimum</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                </div>
              </div>
            </div>
          
            <div className="floating-card absolute top-32 right-[15%] w-40 h-28 
              bg-white/80 backdrop-blur-lg border border-emerald-100
              rounded-2xl shadow-xl p-4 transform-gpu z-10">
              <div className="flex items-center gap-2 text-xs text-emerald-700/70 mb-2 font-medium">
                <Lightbulb className="h-3 w-3" /> Traffic Lights
              </div>
              <div className="flex gap-2 justify-center py-2">
                <div className="h-6 w-2 bg-red-500/20 rounded-full"></div>
                <div className="h-6 w-2 bg-yellow-500/20 rounded-full"></div>
                <div className="h-6 w-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              </div>
            </div>
            
            <div className="floating-card absolute top-50 right-[9%] w-40 h-20
              bg-white/80 backdrop-blur-lg border border-emerald-100
              rounded-2xl shadow-xl p-4 transform-gpu z-10">
              <div className="flex items-center gap-2 text-xs text-emerald-700/70 mb-2 font-medium">
                <Lightbulb className="h-3 w-3" /> Street Lights
              </div>
              <div className="flex gap-2 justify-center py-2">
                <div className="h-6 w-2 bg-red-500/20 rounded-full"></div>
                <div className="h-6 w-2 bg-yellow-500/20 rounded-full"></div>
                <div className="h-6 w-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              </div>
            </div>
            
            <div className="floating-card absolute bottom-24 left-[15%] w-44 h-32
            bg-white/80 backdrop-blur-lg border border-emerald-100
            rounded-2xl shadow-xl p-4 transform-gpu z-10">
              <div className="flex items-center gap-2 text-xs text-emerald-700/70 mb-2 font-medium">
                <Zap className="h-3 w-3" /> Backup Generator
              </div>
              <div className="h-12 border-l-2 border-emerald-500/30 ml-2 relative">
                <div className="absolute top-0 -left-1 w-2 h-2 bg-emerald-500 rounded-full"></div>
                <div className="px-3 text-[10px] text-left text-emerald-900 font-medium">System Load: 24%</div>
                <div className="px-3 text-[10px] text-left text-emerald-600 font-bold">Standby Mode</div>
              </div>
            </div>
            
            <div className="floating-card absolute bottom-20 right-[15%] w-44 h-30
            bg-white/80 backdrop-blur-lg border border-emerald-100
            rounded-2xl shadow-xl p-4 transform-gpu z-10">
              <div className="flex items-center gap-2 text-xs text-emerald-700/70 mb-2 font-medium">
                <Library className="h-3 w-3" /> Library
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="h-8 bg-emerald-50 rounded flex items-center justify-center text-[10px] text-emerald-800">Archives</div>
                <div className="h-8 bg-emerald-600 rounded flex items-center justify-center text-[10px] text-white">Main Hall</div>
              </div>
            </div>
          
              <div className="floating-card absolute top-1/2 left-[5%] w-44 h-30
              bg-white/80 backdrop-blur-lg border border-emerald-100
              rounded-2xl shadow-xl p-4 transform-gpu z-10">
              <div className="flex items-center gap-2 text-xs text-emerald-700/70 mb-2 font-medium">
                <Home className="h-3 w-3" /> Home Appliances
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="h-8 bg-emerald-600 rounded flex items-center justify-center text-[10px] text-white">TVs</div>
                <div className="h-8 bg-emerald-50 rounded flex items-center justify-center text-[10px] text-emerald-800 font-medium">Ovens</div>
                <div className="h-8 bg-emerald-50 rounded flex items-center justify-center text-[10px] text-emerald-800 font-medium">Microwave</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
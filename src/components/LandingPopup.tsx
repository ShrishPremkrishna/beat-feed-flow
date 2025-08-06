import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LandingPopup = ({ isOpen, onClose }: LandingPopupProps) => {
  console.log('LandingPopup render:', { isOpen });
  
  if (!isOpen) {
    console.log('LandingPopup not open, returning null');
    return null;
  }

  console.log('LandingPopup rendering...');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Image */}
        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <div className="text-6xl">🎵</div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Logo/Title */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Beatify
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Where Beats Meet Community
            </p>
          </div>

          {/* Description */}
          <div className="space-y-3 mb-6">
            <p className="text-foreground leading-relaxed">
              🚀 <span className="font-semibold">Discover</span> fresh beats from talented producers worldwide
            </p>
            <p className="text-foreground leading-relaxed">
              💫 <span className="font-semibold">Share</span> your creations and get instant feedback from the community
            </p>
            <p className="text-foreground leading-relaxed">
              🤝 <span className="font-semibold">Connect</span> with artists, collaborate on projects, and build your network
            </p>
            <p className="text-foreground leading-relaxed">
              🔥 <span className="font-semibold">Grow</span> your fanbase and take your music career to the next level
            </p>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-4">
              Join thousands of creators already making waves
            </p>
            <Button 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
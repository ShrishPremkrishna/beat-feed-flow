import React from 'react';
import { cn } from '@/lib/utils';

interface InitialsAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Generate a consistent color based on the name
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Extract initials from display name
const getInitials = (name: string): string => {
  if (!name) return 'U';
  
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Size variants
const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg', 
  lg: 'w-16 h-16 text-xl',
  xl: 'w-32 h-32 text-4xl'
};

export const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ 
  name, 
  avatarUrl, 
  size = 'md', 
  className 
}) => {
  const displayName = name || 'User';
  const initials = getInitials(displayName);
  const colorClass = getAvatarColor(displayName);
  
  // If avatar URL exists, show image with initials fallback
  if (avatarUrl) {
    return (
      <div className={cn('relative rounded-full overflow-hidden border-2 border-primary/20', sizeClasses[size], className)}>
        <img 
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, replace with initials safely
            const target = e.target as HTMLImageElement;
            const parent = target.parentElement;
            if (parent) {
              // Remove the image element
              target.remove();
              // Create and append initials div safely
              const initialsDiv = document.createElement('div');
              initialsDiv.className = `w-full h-full ${colorClass} flex items-center justify-center text-white font-bold`;
              initialsDiv.textContent = initials;
              parent.appendChild(initialsDiv);
            }
          }}
        />
      </div>
    );
  }
  
  // Show initials avatar
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-bold border-2 border-primary/20',
      colorClass,
      sizeClasses[size],
      className
    )}>
      {initials}
    </div>
  );
}; 
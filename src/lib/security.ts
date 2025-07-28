import DOMPurify from 'dompurify';
import validator from 'validator';

// Password strength validation
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let score = 0;

  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Contains lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Contains uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Contains number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Contains special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

// URL validation
export const validateURL = (url: string): boolean => {
  if (!url) return true; // Empty URLs are allowed
  
  // Add protocol if missing
  let urlToValidate = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    urlToValidate = `https://${url}`;
  }
  
  return validator.isURL(urlToValidate, {
    protocols: ['http', 'https'],
    require_protocol: false,
    require_valid_protocol: true,
    allow_underscores: true
  });
};

// Social media handle validation
export const validateSocialHandle = (handle: string, platform: 'instagram' | 'twitter' | 'beatstars'): boolean => {
  if (!handle) return true; // Empty handles are allowed
  
  // Remove @ symbol if present
  const cleanHandle = handle.replace(/^@/, '');
  
  switch (platform) {
    case 'instagram':
    case 'twitter':
      // Instagram and Twitter handles: 1-30 characters, alphanumeric + underscores + periods
      return /^[a-zA-Z0-9_.]{1,30}$/.test(cleanHandle);
    case 'beatstars':
      // BeatStars profiles can be more flexible
      return /^[a-zA-Z0-9_.-]{1,50}$/.test(cleanHandle);
    default:
      return false;
  }
};

// Content sanitization
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  // Configure DOMPurify to only allow safe text content
  const cleanText = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content but strip tags
  });
  
  return cleanText.trim();
};

// File validation for uploads
export interface FileValidation {
  isValid: boolean;
  errors: string[];
}

export const validateAudioFile = (file: File, maxSizeMB: number = 200): FileValidation => {
  const errors: string[] = [];
  
  // Check file type
  const allowedTypes = [
    'audio/mpeg', // MP3
    'audio/wav',  // WAV
    'audio/flac', // FLAC
    'audio/m4a',  // M4A
    'audio/aac',  // AAC
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only MP3, WAV, FLAC, M4A, and AAC files are allowed.');
  }
  
  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    errors.push(`File size must be less than ${maxSizeMB}MB.`);
  }
  
  // Check file name for suspicious patterns
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('Invalid file name.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateImageFile = async (file: File, maxSizeMB: number = 5): Promise<FileValidation> => {
  const errors: string[] = [];
  
  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
  }
  
  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    errors.push(`File size must be less than ${maxSizeMB}MB.`);
  }
  
  // Check file name for suspicious patterns
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('Invalid file name.');
  }
  
  // Basic file signature validation (magic numbers)
  return new Promise<FileValidation>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer);
      const header = Array.from(arr.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Check magic numbers for common image formats
      const validSignatures = [
        'ffd8ffe0', // JPEG
        'ffd8ffe1', // JPEG
        'ffd8ffe2', // JPEG
        '89504e47', // PNG
        '47494638', // GIF
        '52494646', // WebP (RIFF)
      ];
      
      if (!validSignatures.some(sig => header.startsWith(sig))) {
        errors.push('File appears to be corrupted or not a valid image.');
      }
      
      resolve({
        isValid: errors.length === 0,
        errors
      });
    };
    
    reader.onerror = () => {
      errors.push('Unable to read file.');
      resolve({
        isValid: false,
        errors
      });
    };
    
    // Read first 4 bytes for magic number check
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

// Rate limiting helper (simple client-side tracking)
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  canAttempt(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove expired attempts
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
  
  getRemainingTime(key: string, windowMs: number): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const timeRemaining = windowMs - (Date.now() - oldestAttempt);
    return Math.max(0, timeRemaining);
  }
}

export const rateLimiter = new RateLimiter();
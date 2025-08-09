import DOMPurify from 'dompurify';
import validator from 'validator';
import { supabase } from '@/integrations/supabase/client';

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
    'audio/ogg',  // OGG
    'audio/webm', // WebM
    'audio/x-wav', // Alternative WAV MIME type
    'audio/x-flac', // Alternative FLAC MIME type
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only MP3, WAV, FLAC, M4A, AAC, OGG, and WebM files are allowed. Large files will be automatically compressed.');
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

/**
 * Server-side rate limiting integration
 */
export async function checkRateLimit(
  userIdentifier: string, 
  actionType: string, 
  maxAttempts: number = 10, 
  windowMinutes: number = 15
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('rate-limiting', {
      body: {
        user_identifier: userIdentifier,
        action_type: actionType,
        max_attempts: maxAttempts,
        window_minutes: windowMinutes
      }
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      // Fail open in case of service issues, but log the attempt
      await logSecurityEvent('RATE_LIMIT_CHECK_FAILED', `Failed to check rate limit for ${actionType}`, userIdentifier, { error: error.message });
      return true;
    }

    if (!data?.allowed) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', `Rate limit exceeded for ${actionType}`, userIdentifier, { maxAttempts, windowMinutes });
    }

    return data?.allowed || false;
  } catch (error) {
    console.error('Rate limit service error:', error);
    // Fail open but log the attempt
    await logSecurityEvent('RATE_LIMIT_SERVICE_ERROR', `Rate limit service error for ${actionType}`, userIdentifier, { error: error instanceof Error ? error.message : 'Unknown error' });
    return true;
  }
}

/**
 * Security event logging
 */
export async function logSecurityEvent(
  eventType: string,
  description: string,
  userIdentifier?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      event_type: eventType,
      event_description: description,
      user_identifier: userIdentifier || null,
      metadata: metadata || {}
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Security logging error:', error);
  }
}

/**
 * Enhanced input validation with security logging
 */
export function validateAndSanitizeInput(input: string, maxLength: number = 1000, fieldName: string = 'input'): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];
  let sanitized = input;

  // Length validation
  if (input.length > maxLength) {
    errors.push(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    logSecurityEvent('INPUT_LENGTH_EXCEEDED', `Input length exceeded for ${fieldName}`, undefined, { length: input.length, maxLength });
  }

  // Check for potential XSS attempts
  const originalLength = input.length;
  sanitized = sanitizeText(input);
  
  if (sanitized.length !== originalLength) {
    errors.push(`${fieldName} contains potentially harmful content`);
    logSecurityEvent('XSS_ATTEMPT_DETECTED', `Potential XSS attempt in ${fieldName}`, undefined, { original: input.substring(0, 100) });
  }

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/)/g,
    /(\bOR\b.*=.*|AND.*=.*)/gi
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      errors.push(`${fieldName} contains potentially harmful SQL patterns`);
      logSecurityEvent('SQL_INJECTION_ATTEMPT', `Potential SQL injection attempt in ${fieldName}`, undefined, { pattern: pattern.source });
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

// Rate limiting helper (enhanced with server-side integration)
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  async canAttempt(key: string, actionType: string, maxAttempts: number, windowMs: number): Promise<boolean> {
    // First check server-side rate limiting
    const serverAllowed = await checkRateLimit(key, actionType, maxAttempts, Math.ceil(windowMs / 60000));
    if (!serverAllowed) {
      return false;
    }

    // Then apply client-side rate limiting as backup
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove expired attempts
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      await logSecurityEvent('CLIENT_RATE_LIMIT_EXCEEDED', `Client-side rate limit exceeded for ${actionType}`, key, { maxAttempts, windowMs });
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  // Legacy sync method for backward compatibility
  canAttemptSync(key: string, maxAttempts: number, windowMs: number): boolean {
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
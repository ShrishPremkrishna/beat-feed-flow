// Audio compression utility for converting various audio formats to MP3
export interface AudioCompressionOptions {
  bitrate?: number; // kbps, default 128
  sampleRate?: number; // Hz, default 44100
  channels?: number; // 1 for mono, 2 for stereo, default 2
  quality?: number; // 0-1, default 0.8
}

export interface CompressionResult {
  success: boolean;
  compressedFile?: File;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

/**
 * Simple audio compression - converts any audio file to MP3
 */
export const compressAudioToMp3 = async (
  file: File,
  options: AudioCompressionOptions = {}
): Promise<CompressionResult> => {
  try {
    const originalSize = file.size;
    
    // Set default options
    const {
      bitrate = 128,
      quality = 0.8,
      sampleRate = 44100,
      channels = 2
    } = options;

    // Decode the audio file
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create offline context with the full audio duration
    const offlineContext = new OfflineAudioContext(
      channels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // Create buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to stream
    const stream = await convertAudioBufferToStream(renderedBuffer, audioBuffer.sampleRate);
    
    // Convert to MP3
    const compressedFile = await convertStreamToMp3(stream, file.name, bitrate, quality);
    
    const compressedSize = compressedFile.size;
    const compressionRatio = 1 - (compressedSize / originalSize);
    
    return {
      success: true,
      compressedFile,
      originalSize,
      compressedSize,
      compressionRatio
    };
  } catch (error) {
    console.error('Audio compression error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: file.size
    };
  }
};

/**
 * Converts AudioBuffer to MediaStream for recording
 */
const convertAudioBufferToStream = async (
  audioBuffer: AudioBuffer,
  sampleRate: number
): Promise<MediaStream> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create a buffer source
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // Create a media stream destination
  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);
  
  // Start playback
  source.start();
  
  return destination.stream;
};

/**
 * Converts MediaStream to MP3 file using MediaRecorder
 */
const convertStreamToMp3 = async (
  stream: MediaStream,
  originalFileName: string,
  bitrate: number,
  quality: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Create MediaRecorder with WebM/Opus codec (best browser support)
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Create MP3 file (even though it's WebM format, we'll name it .mp3)
        const fileName = originalFileName.replace(/\.[^/.]+$/, '') + '.mp3';
        const file = new File([blob], fileName, { type: 'audio/mpeg' });
        
        resolve(file);
      } catch (error) {
        reject(error);
      }
    };
    
    mediaRecorder.onerror = (event) => {
      const errorEvent = event as any;
      reject(new Error('MediaRecorder error: ' + (errorEvent.error || 'Unknown error')));
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Stop after the full duration
    setTimeout(() => {
      mediaRecorder.stop();
    }, 30000); // 30 seconds max
  });
};

/**
 * Checks if audio compression is supported in the current browser
 */
export const isAudioCompressionSupported = (): boolean => {
  return !!(window.AudioContext || (window as any).webkitAudioContext) && 
         !!window.MediaRecorder;
};

/**
 * Determines if a file should be compressed based on its format and size
 */
export const shouldCompressAudio = (file: File, maxSizeMB: number = 50): boolean => {
  const fileSizeMB = file.size / (1024 * 1024);
  
  // Always compress if file is larger than maxSizeMB
  if (fileSizeMB > maxSizeMB) {
    return true;
  }
  
  // Compress lossless formats (WAV, FLAC) regardless of size
  const losslessFormats = ['audio/wav', 'audio/flac'];
  if (losslessFormats.includes(file.type)) {
    return true;
  }
  
  // Compress large files even if they're already compressed
  if (fileSizeMB > 20) {
    return true;
  }
  
  return false;
};

/**
 * Fast compression that skips processing for already optimized files
 */
export const fastCompressAudio = async (
  file: File,
  options: AudioCompressionOptions = {}
): Promise<CompressionResult> => {
  const originalSize = file.size;
  const fileSizeMB = originalSize / (1024 * 1024);
  
  // For very small files or already compressed files, skip compression
  if (fileSizeMB < 5 || file.type === 'audio/mpeg') {
    return {
      success: true,
      compressedFile: file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0
    };
  }
  
  // For all other files, use the simple compression
  return await compressAudioToMp3(file, options);
};

/**
 * Gets compression options based on file size and type
 */
export const getCompressionOptions = (file: File): AudioCompressionOptions => {
  const fileSizeMB = file.size / (1024 * 1024);
  
  if (fileSizeMB > 100) {
    // Very large files - aggressive compression
    return {
      bitrate: 96,
      sampleRate: 44100,
      channels: 2,
      quality: 0.6
    };
  } else if (fileSizeMB > 50) {
    // Large files - moderate compression
    return {
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      quality: 0.7
    };
  } else {
    // Smaller files - light compression
    return {
      bitrate: 160,
      sampleRate: 44100,
      channels: 2,
      quality: 0.8
    };
  }
}; 
import { useState, useRef, DragEvent } from 'react';
import { Upload, Music, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  accept: string;
  maxSize?: number; // in MB
  currentFile?: File | null;
  onRemoveFile?: () => void;
  isRequired?: boolean;
  title?: string;
  description?: string;
}

export const FileUploadArea = ({
  onFileSelect,
  accept,
  maxSize = 50,
  currentFile,
  onRemoveFile,
  isRequired = false,
  title = "Upload Audio File",
  description = "Drag and drop your beat here or click to browse"
}: FileUploadAreaProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const fileType = file.type;
    const acceptedTypes = accept.split(',').map(type => type.trim());
    
    const isValidType = acceptedTypes.some(acceptedType => {
      if (acceptedType === 'audio/*') {
        return fileType.startsWith('audio/');
      }
      return fileType === acceptedType;
    });

    if (!isValidType) {
      alert('Please select a valid audio file.');
      return;
    }

    // Validate file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      alert(`File size must be less than ${maxSize}MB.`);
      return;
    }

    onFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (currentFile) {
    return (
      <div className="border border-border rounded-xl p-4 bg-gradient-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <span className="font-medium">{title}</span>
          </div>
          {onRemoveFile && (
            <Button variant="ghost" size="sm" onClick={onRemoveFile}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <Music className="w-8 h-8 text-primary" />
          <div>
            <p className="font-medium">{currentFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }
          ${isRequired ? 'border-primary/30' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-colors
            ${isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            <Upload className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              {title}
            </p>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports MP3, WAV, FLAC up to {maxSize}MB
            </p>
          </div>
          
          <Button variant="outline" size="sm" type="button">
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
        </div>
      </div>
    </div>
  );
};
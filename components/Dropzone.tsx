import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon, PlusIcon } from './Icon';

interface DropzoneProps {
  onImageAdd: (files: FileList) => void;
  className?: string;
  compact?: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ 
  onImageAdd, 
  className = "",
  compact = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImageAdd(e.dataTransfer.files);
    }
  }, [onImageAdd]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageAdd(e.target.files);
    }
    if (e.target.value) e.target.value = '';
  }, [onImageAdd]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div 
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center cursor-pointer
        border-2 border-dashed rounded-xl transition-all duration-200
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-500/10' 
          : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-800'
        }
        ${compact ? 'h-full w-full min-h-[150px]' : 'h-64 w-full'}
        ${className}
      `}
    >
      <div className={`p-3 rounded-full mb-2 ${isDragging ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
        {compact ? <PlusIcon className="w-6 h-6" /> : <UploadIcon className="w-8 h-8" />}
      </div>
      {!compact && (
        <>
          <p className="text-sm font-medium text-zinc-300 mb-1">Add Images</p>
          <p className="text-xs text-zinc-500 text-center px-4">
            Drag & drop or paste (Ctrl+V)
          </p>
        </>
      )}
      <input 
        ref={inputRef}
        type="file" 
        accept="image/*" 
        multiple
        className="hidden" 
        onChange={handleChange} 
      />
    </div>
  );
};

export default Dropzone;

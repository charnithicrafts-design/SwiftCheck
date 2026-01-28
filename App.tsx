import React, { useState, useEffect, useCallback } from 'react';
import ComparisonViewer from './components/ComparisonViewer';
import Dropzone from './components/Dropzone';
import { ImageState } from './types';
import { GridIcon, TrashIcon, RowsIcon, ColsIcon, PlusIcon, MinusIcon, LinkIcon, UnlinkIcon } from './components/Icon';

function App() {
  const [images, setImages] = useState<ImageState[]>([]);
  const [layout, setLayout] = useState({ rows: 1, cols: 2 });
  const [isSynced, setIsSynced] = useState(true);

  // Helper to read file and update state
  const processFiles = useCallback((fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              src,
              name: file.name,
              size: file.size,
              dimensions: { width: img.width, height: img.height }
            }
          ]);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Global Paste Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        processFiles(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const handleRemove = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAll = () => {
    if (confirm('Remove all images?')) {
      setImages([]);
      setLayout({ rows: 1, cols: 2 });
    }
  };

  const updateLayout = (key: 'rows' | 'cols', delta: number) => {
    setLayout(prev => {
      const newValue = prev[key] + delta;
      if (newValue < 1 || newValue > 8) return prev; // Limit to reasonable grid
      return { ...prev, [key]: newValue };
    });
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-zinc-950 text-zinc-200 selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="flex-none px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GridIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 leading-tight">
              PixelDiff
            </h1>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Multi-View</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          
          {/* Sync Toggle */}
          <button 
            onClick={() => setIsSynced(!isSynced)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 text-xs font-medium uppercase tracking-wide
              ${isSynced 
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 hover:bg-indigo-500/30' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }
            `}
            title={isSynced ? "Unlink Views (Independent Pan/Zoom)" : "Link Views (Synchronized Pan/Zoom)"}
          >
            {isSynced ? <LinkIcon className="w-4 h-4" /> : <UnlinkIcon className="w-4 h-4" />}
            <span className="hidden md:inline">{isSynced ? 'Synced' : 'Unlinked'}</span>
          </button>

          <div className="h-6 w-px bg-zinc-800" />

          {/* XY Grid Controls */}
          <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            
            {/* Rows Control */}
            <div className="flex items-center gap-1 pl-2 pr-1">
               <RowsIcon className="w-4 h-4 text-zinc-500" />
               <button onClick={() => updateLayout('rows', -1)} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"><MinusIcon className="w-3 h-3" /></button>
               <span className="w-4 text-center text-xs font-mono text-zinc-200">{layout.rows}</span>
               <button onClick={() => updateLayout('rows', 1)} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"><PlusIcon className="w-3 h-3" /></button>
            </div>

            <div className="h-4 w-px bg-zinc-700"></div>

            {/* Cols Control */}
             <div className="flex items-center gap-1 pl-1 pr-2">
               <ColsIcon className="w-4 h-4 text-zinc-500" />
               <button onClick={() => updateLayout('cols', -1)} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"><MinusIcon className="w-3 h-3" /></button>
               <span className="w-4 text-center text-xs font-mono text-zinc-200">{layout.cols}</span>
               <button onClick={() => updateLayout('cols', 1)} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"><PlusIcon className="w-3 h-3" /></button>
            </div>

          </div>

          <div className="h-6 w-px bg-zinc-800 mx-2" />

          <button 
             onClick={clearAll}
             disabled={images.length === 0}
             className="text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-medium flex items-center gap-1.5"
          >
            <TrashIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {images.length === 0 ? (
           <div className="h-full w-full flex items-center justify-center p-8">
             <div className="max-w-md w-full">
                <Dropzone onImageAdd={processFiles} />
             </div>
           </div>
        ) : (
          <ComparisonViewer 
            images={images} 
            onRemove={handleRemove} 
            onAdd={processFiles}
            layout={layout}
            isSynced={isSynced}
          />
        )}
      </main>
      
      {/* Footer / Status */}
      <div className="flex-none px-4 py-2 bg-zinc-950 border-t border-zinc-900 text-[10px] text-zinc-600 flex justify-between">
        <span>{images.length} Image{images.length !== 1 && 's'} Loaded</span>
        <span>
          {isSynced ? 'Views Locked' : 'Views Independent'} • Scroll to Zoom • Drag to Pan
        </span>
      </div>

    </div>
  );
}

export default App;

import React, { useRef, useEffect, useState } from 'react';
import { ImageState, TransformState } from '../types';
import { TrashIcon, ZoomInIcon, ZoomOutIcon, PlusIcon, MinusIcon, ResetIcon } from './Icon';
import Dropzone from './Dropzone';

interface ComparisonViewerProps {
  images: ImageState[];
  onRemove: (id: string) => void;
  onAdd: (files: FileList) => void;
  layout: { rows: number; cols: number };
  isSynced: boolean;
}

const ComparisonViewer: React.FC<ComparisonViewerProps> = ({ 
  images, 
  onRemove,
  onAdd,
  layout,
  isSynced
}) => {
  // Store transforms for each image ID
  const transformsRef = useRef<Record<string, TransformState>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<{ [key: string]: HTMLImageElement | null }>({});
  
  // Track dragging state
  const [isPanning, setIsPanning] = useState(false);
  const activeImageIdRef = useRef<string | null>(null);

  // Initialize transforms for new images
  useEffect(() => {
    images.forEach(img => {
      if (!transformsRef.current[img.id]) {
        transformsRef.current[img.id] = { x: 0, y: 0, scale: 1 };
      }
    });
    // Cleanup removed images
    const activeIds = new Set(images.map(i => i.id));
    Object.keys(transformsRef.current).forEach(key => {
      if (!activeIds.has(key)) {
        delete transformsRef.current[key];
      }
    });
    updateDOM();
  }, [images]);

  // Force update all DOM elements based on ref state
  const updateDOM = () => {
    Object.entries(imageRefs.current).forEach(([id, img]) => {
      const element = img as HTMLImageElement | null;
      if (element && transformsRef.current[id]) {
        const { x, y, scale } = transformsRef.current[id];
        element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      }
    });
  };

  const applyTransformUpdate = (
    targetId: string | null, 
    updater: (prev: TransformState) => TransformState
  ) => {
    if (isSynced || !targetId) {
      // If synced, update ALL images based on the target (or first one if global)
      // We align all images to the new state of the target for consistency
      const referenceId = targetId || images[0]?.id;
      if (!referenceId) return;

      const newState = updater(transformsRef.current[referenceId]);
      
      images.forEach(img => {
        transformsRef.current[img.id] = { ...newState };
      });
    } else {
      // Independent mode
      if (transformsRef.current[targetId]) {
        transformsRef.current[targetId] = updater(transformsRef.current[targetId]);
      }
    }
    updateDOM();
  };

  // --- Handlers ---

  const handleWheel = (e: React.WheelEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const ZOOM_SPEED = 0.001;
    const delta = e.deltaY * -ZOOM_SPEED;

    applyTransformUpdate(id, (prev) => ({
      ...prev,
      scale: Math.min(Math.max(0.1, prev.scale + delta), 20)
    }));
  };

  const handleZoomBtn = (e: React.MouseEvent, id: string | null, direction: 'in' | 'out') => {
    e.stopPropagation();
    const factor = direction === 'in' ? 1.25 : 0.8;
    
    applyTransformUpdate(id, (prev) => ({
      ...prev,
      scale: Math.min(Math.max(0.1, prev.scale * factor), 20)
    }));
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault(); // Prevent image dragging ghost
    setIsPanning(true);
    activeImageIdRef.current = id;
  };

  const handleReset = (e: React.MouseEvent, id: string | null = null) => {
    e.stopPropagation();
    const resetState = { x: 0, y: 0, scale: 1 };
    
    if (isSynced || !id) {
       images.forEach(img => {
         transformsRef.current[img.id] = resetState;
       });
    } else {
       transformsRef.current[id] = resetState;
    }
    updateDOM();
  };

  // Global Mouse Events for Panning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning || !activeImageIdRef.current) return;
      
      const dx = e.movementX;
      const dy = e.movementY;
      const targetId = activeImageIdRef.current;

      if (isSynced) {
        // Move ALL images by the delta
        images.forEach(img => {
          const t = transformsRef.current[img.id];
          transformsRef.current[img.id] = { ...t, x: t.x + dx, y: t.y + dy };
        });
        updateDOM();
      } else {
        // Move only target
        const t = transformsRef.current[targetId];
        if (t) {
          transformsRef.current[targetId] = { ...t, x: t.x + dx, y: t.y + dy };
          updateDOM();
        }
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      activeImageIdRef.current = null;
    };

    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, isSynced, images]);


  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
    gap: '1px',
    backgroundColor: '#27272a', 
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full overflow-hidden bg-zinc-950 select-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
    >
      <div className="w-full h-full" style={gridStyle}>
        {images.map((img) => (
          <div 
            key={img.id} 
            className="relative overflow-hidden bg-checkerboard group w-full h-full"
            onWheel={(e) => handleWheel(e, img.id)}
            onMouseDown={(e) => handleMouseDown(e, img.id)}
          >
             {/* The Image */}
            <div className="w-full h-full flex items-center justify-center pointer-events-none">
              <img 
                ref={el => imageRefs.current[img.id] = el}
                src={img.src} 
                alt={img.name}
                className="max-w-none origin-center transition-transform duration-75 will-change-transform" 
                // Initial transform handled by useEffect
              />
            </div>

            {/* Info & Controls Overlay */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-between items-start pointer-events-auto">
              <div className="text-xs font-mono text-zinc-300 truncate max-w-[50%] drop-shadow-md">
                <span className="font-bold text-white block truncate">{img.name}</span>
                {img.dimensions && <span>{img.dimensions.width}x{img.dimensions.height}</span>}
              </div>
              
              <div className="flex items-center gap-1.5">
                 {/* Individual Zoom Controls */}
                <div className="flex bg-zinc-900/80 rounded-lg overflow-hidden border border-zinc-700/50 backdrop-blur-sm">
                  <button 
                    onClick={(e) => handleZoomBtn(e, img.id, 'out')}
                    className="p-1.5 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Zoom Out"
                  >
                    <MinusIcon className="w-3 h-3" />
                  </button>
                  <div className="w-px bg-zinc-700/50"></div>
                  <button 
                    onClick={(e) => handleZoomBtn(e, img.id, 'in')}
                    className="p-1.5 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Zoom In"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                  className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-md transition-colors backdrop-blur-sm border border-transparent hover:border-red-400"
                  title="Remove Image"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add Button */}
        <div className="relative bg-zinc-900 border border-zinc-800 flex items-center justify-center group overflow-hidden w-full h-full">
          <Dropzone onImageAdd={onAdd} compact={true} className="border-none w-full h-full" />
        </div>
      </div>
      
      {/* Floating Control Toolbar (Global) */}
      {images.length > 0 && (
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-2xl shadow-2xl pointer-events-auto transition-transform hover:scale-105 z-50">
            <button 
              onClick={(e) => handleZoomBtn(e, null, 'out')}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/80 rounded-xl transition-colors active:scale-95"
              title="Global Zoom Out"
            >
              <ZoomOutIcon className="w-5 h-5" />
            </button>
            
            <div className="w-px h-5 bg-zinc-700 mx-1 opacity-50"></div>

            <button 
              onClick={(e) => handleReset(e)}
              className="px-4 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700/80 rounded-lg transition-colors text-xs font-medium font-mono uppercase tracking-wide active:scale-95 flex items-center gap-2"
              title="Reset All"
            >
              <ResetIcon className="w-3 h-3" />
              Reset
            </button>

            <div className="w-px h-5 bg-zinc-700 mx-1 opacity-50"></div>

            <button 
              onClick={(e) => handleZoomBtn(e, null, 'in')}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/80 rounded-xl transition-colors active:scale-95"
              title="Global Zoom In"
            >
              <ZoomInIcon className="w-5 h-5" />
            </button>
         </div>
      )}
    </div>
  );
};

export default ComparisonViewer;
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const { addToast } = useAppContext();

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsDragging(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addToast('Drop detected', 'files would be added', 'cyan');
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [addToast]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/30 animate-[fadeIn_150ms_ease] backdrop-blur-sm">
      <div className="px-16 py-10 rounded-2xl border-2 border-dashed border-[var(--brd)] bg-[var(--hover)] shadow-[0_12px_48px_rgba(0,0,0,0.4)] text-[var(--ac)] font-mono text-[14px] tracking-[2px] uppercase">
        drop files here
      </div>
    </div>
  );
}

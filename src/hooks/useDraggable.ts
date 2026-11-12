import { useState, useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $layoutResetTrigger } from '../stores/appStore';

export interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  storageKey?: string;
  defaultPosition?: () => Position;
}

export function useDraggable({ storageKey }: DraggableOptions = {}) {
  // null means "use native CSS default corner positioning" (top-left, top-center, bottom-right)
  const [position, setPosition] = useState<Position | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const resetCount = useStore($layoutResetTrigger);

  // Clear legacy stored keys so widgets always start in their clean default corners
  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, []);

  // Listen to Reset Layout trigger from Settings Drawer
  useEffect(() => {
    if (resetCount > 0) {
      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      }
      setPosition(null);
    }
  }, [resetCount]);

  // Recalculate on window resize if custom dragged position is active
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const maxX = Math.max(0, window.innerWidth - 100);
        const maxY = Math.max(0, window.innerHeight - 80);
        if (prev.x > maxX || prev.y > maxY) {
          return {
            x: Math.min(prev.x, maxX),
            y: Math.min(prev.y, maxY),
          };
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: MouseEvent) => {
    // Never initiate drag when clicking interactive elements:
    // buttons, inputs, links, textareas, forms, sliders, or elements marked with .no-drag
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('select') ||
      target.closest('iframe') ||
      target.closest('[role="button"]') ||
      target.closest('.no-drag')
    ) {
      return;
    }

    // Only allow left-click
    if (e.button !== 0) return;

    e.preventDefault();

    // Determine current position from element bounding rect so switching from CSS to translate3d has ZERO jump
    const rect = elementRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (position ? position.x : 0);
    const currentY = rect ? rect.top : (position ? position.y : 0);

    setPosition({ x: currentX, y: currentY });
    setIsDragging(true);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: currentX,
      startY: currentY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      const cardWidth = elementRef.current?.offsetWidth || 320;
      const cardHeight = elementRef.current?.offsetHeight || 100;

      const minX = 12;
      const maxX = Math.max(minX, window.innerWidth - cardWidth - 12);
      const minY = 12;
      const maxY = Math.max(minY, window.innerHeight - cardHeight - 12);

      const newX = Math.min(Math.max(minX, dragStartRef.current.startX + deltaX), maxX);
      const newY = Math.min(Math.max(minY, dragStartRef.current.startY + deltaY), maxY);

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return {
    position,
    setPosition,
    isDragging,
    handleMouseDown,
    elementRef,
  };
}

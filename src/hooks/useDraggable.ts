import { useState, useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $layoutResetTrigger } from '../stores/appStore';

interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  storageKey?: string;
  defaultPosition: () => Position;
}

export function useDraggable({ storageKey, defaultPosition }: DraggableOptions) {
  // Always initialize directly to default standard position so launch matches reset position 100%
  const [position, setPosition] = useState<Position>(defaultPosition);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const resetCount = useStore($layoutResetTrigger);

  // On client initial mount: purge any legacy coordinates from prior sessions and ensure live viewport calibration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      }
      setPosition(defaultPosition());
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
      setPosition(defaultPosition());
    }
  }, [resetCount]);

  // Recalculate on window resize to ensure element stays within viewport bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
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
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
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
  }, [isDragging, position]);

  return {
    position,
    setPosition,
    isDragging,
    handleMouseDown,
    elementRef,
  };
}

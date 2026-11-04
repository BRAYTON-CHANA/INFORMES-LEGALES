import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Portal from './Portal';

const GAP = 6;
const MARGIN = 8;

// Incluye inputs: un buscador dentro del menú recibe el foco primero
const focusables = (menu) =>
  [...(menu?.querySelectorAll('input:not([disabled]), button:not([disabled]), a[href]') || [])];

// Dropdown flotante renderizado en portal (escapa de overflow/stacking contexts).
// trigger: ({ triggerRef, open, toggle }) => ReactNode
// children: ({ close }) => ReactNode
const DropdownMenu = ({ trigger, children, menuClassName = 'w-52', align = 'right', onOpenChange }) => {
  const [open, setOpenState] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const setOpen = useCallback((v) => {
    setOpenState((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen((v) => !v), [setOpen]);

  const update = useCallback(() => {
    const trig = triggerRef.current;
    const menu = menuRef.current;
    if (!trig || !menu) return;
    const r = trig.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let top = r.bottom + GAP;
    if (top + mh > window.innerHeight - MARGIN && r.top - GAP - mh > MARGIN) {
      top = r.top - GAP - mh;
    }
    let left = align === 'right' ? r.right - mw : r.left;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - mw - MARGIN));
    setPos({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    setPos(null);
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        triggerRef.current?.focus?.();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = focusables(menuRef.current);
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown'
        ? (i + 1) % items.length
        : (i - 1 + items.length) % items.length;
      items[next].focus();
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) focusables(menuRef.current)[0]?.focus();
  }, [open, pos]);

  return (
    <>
      {trigger({ triggerRef, open, toggle })}
      {open && (
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            className={`fixed z-[70] bg-white border border-slate-100 rounded-xl shadow-xl py-1 ${menuClassName}`}
            style={pos
              ? { top: pos.top, left: pos.left, visibility: 'visible' }
              : { top: 0, left: 0, visibility: 'hidden' }}
          >
            {typeof children === 'function' ? children({ close }) : children}
          </div>
        </Portal>
      )}
    </>
  );
};

export default DropdownMenu;

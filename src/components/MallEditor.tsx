import defaultStores from "../mall-stores-default.json";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { duplicateBox, IMG_H, IMG_W, seedBoxes, type Box } from "@/lib/mall-seed";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ClipboardPaste, Copy, Minus, Plus, Save, Square, Trash2, Undo2, Redo2, ChevronUp, Maximize2, LockKeyhole, LockOpen,
} from "lucide-react";

// Version 5 uses the newly published defaults. Version 4 remains untouched as a backup.
const KEY = "mall-map-aligned-v5";
const LEGACY_KEY = "mall-map-aligned-v4";
// Convenience lock only: this code is public and does not provide real authentication.
const EDIT_CODE = "1987";
// One-time migration: retain saved positions and rotations while enlarging existing store labels.
const FONT_MIGRATION_KEY = "mall-map-font-115-migration-v1";
const enlargeFont = (value: number) => Math.round(value * 1.15 * 10) / 10;
const YELLOW = "#ffe14d";
const RED = "#ef4444";

// randomUUID is unavailable in non-secure browser contexts (e.g. HTTP by IP).
// Always provide a unique ID so copy/paste still works when hosted locally.
let newBoxCounter = 0;
function newBoxId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  newBoxCounter += 1;
  return `box-${Date.now()}-${newBoxCounter}-${Math.random().toString(36).slice(2, 10)}`;
}

export function MallEditor() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const toggleLock = () => {
    if (unlocked) {
      setEditing(null); setSel(null); setSelectedIds([]); setAlignmentGuides({});
      setUnlocked(false);
      return;
    }
    const entered = window.prompt("Enter editor code:");
    if (entered === null) return;
    if (entered === EDIT_CODE) setUnlocked(true);
    else window.alert("Incorrect code");
  };
  const [sel, setSel] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number; y?: number }>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(1); // 1 = fit whole map in the available viewport
  const [mini, setMini] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const hasUnsavedChanges = loaded && savedSnapshot !== null && JSON.stringify(boxes) !== savedSnapshot;
  const history = useRef<Box[][]>([]);
  const future = useRef<Box[][]>([]);
  const [, bumpHistory] = useState(0);
  // Space + drag pans the map. Space alone never changes the selected store.
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const spaceHeldRef = useRef(false);
  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;
  const wrapRef = useRef<HTMLDivElement>(null);
  // mall-search-feature-v1
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTerm = searchQuery.trim().toLocaleLowerCase();
  const searchMatches = searchTerm
    ? boxes.filter((b) => b.text.toLocaleLowerCase().includes(searchTerm))
    : [];

  const goToSearchResult = (b: Box) => {
    setActiveSearchId(b.id);
    setSearchOpen(false);
    const el = wrapRef.current;
    if (!el) return;
    const scale = fit * zoom;
    const contentWidth = Math.max(el.clientWidth, IMG_W * scale + 16);
    const contentHeight = Math.max(el.clientHeight, IMG_H * scale + 16);
    el.scrollTo({
      left: (contentWidth - IMG_W * scale) / 2
        + b.position.x * scale - el.clientWidth / 2,
      top: (contentHeight - IMG_H * scale) / 2
        + b.position.y * scale - el.clientHeight / 2,
      behavior: "smooth",
    });
  };

  const zoomToolbarRef = useRef<HTMLDivElement>(null);
  const [zoomToolbarPosition, setZoomToolbarPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem("mall-zoom-toolbar-position");
      if (!saved) return null;
      const position = JSON.parse(saved) as { x?: unknown; y?: unknown };
      return typeof position.x === "number" && Number.isFinite(position.x) &&
        typeof position.y === "number" && Number.isFinite(position.y)
        ? { x: position.x, y: position.y } : null;
    } catch {
      return null;
    }
  });

  const startZoomToolbarDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const toolbar = zoomToolbarRef.current;
    const workspace = wrapRef.current?.parentElement;
    if (!toolbar || !workspace) return;

    const toolbarRect = toolbar.getBoundingClientRect();
    const offsetX = e.clientX - toolbarRect.left;
    const offsetY = e.clientY - toolbarRect.top;
    const move = (event: PointerEvent) => {
      const bounds = workspace.getBoundingClientRect();
      const x = Math.max(0, Math.min(event.clientX - bounds.left - offsetX,
        Math.max(0, bounds.width - toolbarRect.width)));
      const y = Math.max(0, Math.min(event.clientY - bounds.top - offsetY,
        Math.max(0, bounds.height - toolbarRect.height)));
      setZoomToolbarPosition({ x, y });
      try { localStorage.setItem("mall-zoom-toolbar-position", JSON.stringify({ x, y })); } catch { /* storage unavailable */ }
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  useEffect(() => {
    // Preserve the old browser map for recovery without silently overriding new defaults.
    try {
      const old = localStorage.getItem(LEGACY_KEY);
      if (old && !localStorage.getItem("mall-map-v4-before-v5-backup")) {
        localStorage.setItem("mall-map-v4-before-v5-backup", old);
      }
    } catch { /* storage may be unavailable */ }
    let initial = defaultStores as Box[];
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Box[];
        if (Array.isArray(stored)) initial = stored;
      }
    } catch { /* fall back to published defaults */ }
    setBoxes(initial);
    setSavedSnapshot(JSON.stringify(initial));
    setLoaded(true);
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const calc = () => setFit(Math.max(0.01, (el.clientWidth - 16) / IMG_W));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mini]);
  const s = fit * zoom;

  // Keep the same map point centered when changing zoom, so store labels stay
  // aligned and the view does not jump to a random corner.
  const previousScale = useRef(s);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || previousScale.current === s) return;
    const before = previousScale.current;
    const centerInImage = (oldScale: number) => {
      const contentWidth = Math.max(el.clientWidth, IMG_W * oldScale + 16);
      const contentHeight = Math.max(el.clientHeight, IMG_H * oldScale + 16);
      return {
        x: (el.scrollLeft + el.clientWidth / 2 - (contentWidth - IMG_W * oldScale) / 2) / oldScale,
        y: (el.scrollTop + el.clientHeight / 2 - (contentHeight - IMG_H * oldScale) / 2) / oldScale,
      };
    };
    const center = centerInImage(before);
    const contentWidth = Math.max(el.clientWidth, IMG_W * s + 16);
    const contentHeight = Math.max(el.clientHeight, IMG_H * s + 16);
    el.scrollLeft = (contentWidth - IMG_W * s) / 2 + center.x * s - el.clientWidth / 2;
    el.scrollTop = (contentHeight - IMG_H * s) / 2 + center.y * s - el.clientHeight / 2;
    previousScale.current = s;
  }, [s]);
  const zoomIn = () => setZoom((z) => Math.min(5, Math.round(z * 1.25 * 1000) / 1000));
  const zoomOut = () => setZoom((z) => Math.max(0.3, Math.round(z / 1.25 * 1000) / 1000));
  const zoomFit = () => setZoom(1);

  const snapshot = useCallback(() => {
    history.current.push(boxesRef.current);
    if (history.current.length > 200) history.current.shift();
    // A new user edit starts a new history branch.
    future.current = [];
    bumpHistory((n) => n + 1);
  }, []);
  const update = (id: string, fn: (b: Box) => Box, record = true) => {
    if (!unlocked) return;
    if (record) snapshot();
    setBoxes((bs) => bs.map((b) => (b.id === id ? fn(b) : b)));
  };
  const undo = () => {
    if (!unlocked) return;
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(boxesRef.current);
    boxesRef.current = prev;
    setBoxes(prev);
    bumpHistory((n) => n + 1);
  };
  const redo = () => {
    if (!unlocked) return;
    const next = future.current.pop();
    if (!next) return;
    history.current.push(boxesRef.current);
    if (history.current.length > 200) history.current.shift();
    boxesRef.current = next;
    setBoxes(next);
    bumpHistory((n) => n + 1);
  };
  const addBox = () => {
    if (!unlocked) return;
    snapshot();
    const id = newBoxId();
    setBoxes((bs) => [...bs, {
      id,
      floor: 1,
      position: { x: IMG_W / 2, y: IMG_H / 2 },
      width: 80, height: 26, fontSize: 16.1, rotation: 0, text: "New", highlightColor: null,
    }]);
    setSel(id);
  };
  const del = () => {
    if (!unlocked) return;
    if (!sel) return;
    snapshot();
    setBoxes((bs) => bs.filter((b) => b.id !== sel));
    setSel(null);
  };
  const save = () => {
    if (!unlocked) return;
    const data = JSON.stringify(boxes);
    localStorage.setItem(KEY, data);
    setSavedSnapshot(data);
    setSaved("Saved");
    setTimeout(() => setSaved(null), 1500);
  };
  const clipboard = useRef<Box | null>(null);
  const [copiedBox, setCopiedBox] = useState<Box | null>(null);
  const selectedRef = useRef(sel);
  selectedRef.current = sel;
  const [copyStatus, setCopyStatus] = useState("");
  const copySelected = useCallback(() => {
    const source = boxesRef.current.find((box) => box.id === selectedRef.current);
    if (!source) { setCopyStatus("Select a box first"); return; }
    const copy = { ...source, position: { ...source.position } };
    clipboard.current = copy;
    setCopiedBox(copy);
    setCopyStatus("Copied: " + copy.text);
  }, []);
  const pasteBox = useCallback(() => {
    if (!unlocked) return;
    const source = clipboard.current ?? copiedBox;
    if (!source) { setCopyStatus("Copy a box first"); return; }
    try {
      // Clone all properties, including exact rotation; offset to make it visible.
      const clone: Box = {
        ...duplicateBox(source, newBoxId()),
        floor: source.floor,
        position: { x: source.position.x + 34, y: source.position.y + 34 },
      };
      snapshot();
      setBoxes((current) => [...current, clone]);
      selectedRef.current = clone.id;
      setSel(clone.id);
      setCopyStatus("Pasted: " + clone.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Mall map paste failed:", error);
      setCopyStatus("Paste error: " + message);
    }
  }, [snapshot, copiedBox, unlocked]);

  const exportBoxes = () => {
    const blob = new Blob([JSON.stringify(boxes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mall-stores-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const importBoxes = async (file?: File) => {
    if (!unlocked) return;
    if (!file || !unlocked) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data) || !data.every((b) => b.id && b.position && typeof b.text === "string")) throw Error();
      snapshot(); setBoxes(data); setSel(null);
    } catch { alert("Invalid stores JSON file"); }
  };

  // keyboard
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey &&
        e.key.toLowerCase() === "f") {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" || target.isContentEditable;
      if (!typing && !editing) {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      return;
    }
    if (!unlocked && !(e.ctrlKey || e.metaKey) && e.code !== "Space") return;
    const t = e.target as HTMLElement;
    const inField = editing || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      // Handle map zoom before the text-field guard. On standard keyboards Ctrl+Plus
      // commonly arrives as Ctrl+Shift+=; also support numpad + and -.
      // Prevent browser page zoom: the shortcut should resize the MAP, not the UI.
      const plus = e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
      const minus = e.key === "-" || e.key === "_" || e.code === "NumpadSubtract";
      if (plus || minus) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) { if (plus) zoomIn(); else zoomOut(); }
        return;
      }
      const k = e.key.toLowerCase();
      if (inField || !unlocked) return; // no editor shortcuts while locked
      if (k === "c" && selectedRef.current) { e.preventDefault(); copySelected(); return; }
      if (k === "v" && (clipboard.current || copiedBox)) { e.preventDefault(); pasteBox(); return; }
      if (k === "z") {
        e.preventDefault();
        if (!e.repeat) { if (e.shiftKey) redo(); else undo(); }
        return;
      }
      if (k === "y") {
        e.preventDefault();
        if (!e.repeat) redo();
        return;
      }
      return;
    }
    if (inField) return;
    if (e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); // prevent space from scrolling the browser / clicking buttons
      if (!spaceHeldRef.current) {
        spaceHeldRef.current = true;
        setSpaceHeld(true);
      }
      return;
    }
    if (spaceHeldRef.current || !unlocked) return; // arrows must not move shops while locked/panning
    if (!sel) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(); return; }
    const step = e.shiftKey ? 10 : 1;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    if (d[e.key]) {
      e.preventDefault();
      const [dx, dy] = d[e.key] as [number, number];
      update(sel, (b) => ({ ...b, position: { x: b.position.x + dx, y: b.position.y + dy } }), !e.repeat);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    const releaseSpace = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
      }
    };
    const blur = () => {
      spaceHeldRef.current = false;
      setSpaceHeld(false);
      setPanning(false);
    };
    window.addEventListener("keydown", h, true);
    window.addEventListener("keyup", releaseSpace, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", h, true);
      window.removeEventListener("keyup", releaseSpace, true);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // Ctrl + mouse wheel zooms the map, not the browser page. The toolbar and
  // header remain at a fixed size because only the map scale changes.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onCtrlWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.deltaY === 0) return;
      setZoom((current) => {
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        return Math.max(0.3, Math.min(5, Math.round(current * factor * 1000) / 1000));
      });
    };
    el.addEventListener("wheel", onCtrlWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onCtrlWheel, true);
  }, []);

  // Pan the scrollable map instead of moving shops when Space is held.
  // This capture-phase handler takes priority over shop drag/resize handlers.
  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (!spaceHeldRef.current && e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-store-box]'))) return;
    e.preventDefault();
    e.stopPropagation();
    const viewport = wrapRef.current;
    if (!viewport) return;
    const originX = e.clientX;
    const originY = e.clientY;
    const scrollX = viewport.scrollLeft;
    const scrollY = viewport.scrollTop;
    setPanning(true);
    const move = (ev: PointerEvent) => {
      ev.preventDefault();
      viewport.scrollLeft = scrollX - (ev.clientX - originX);
      viewport.scrollTop = scrollY - (ev.clientY - originY);
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setPanning(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  // pointer drag helper
  const drag = (e: React.PointerEvent, onMove: (dx: number, dy: number, ev: PointerEvent) => void) => {
    if (!unlocked) return;
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let changed = false;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / s;
      const dy = (ev.clientY - sy) / s;
      // A simple click is selection, not an edit: don't discard Redo history.
      if (!changed && Math.abs(dx) + Math.abs(dy) < 0.1) return;
      if (!changed) { snapshot(); changed = true; }
      onMove(dx, dy, ev);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setAlignmentGuides({}); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };


  const findAlignment = (moving: Box[], others: Box[], dx: number, dy: number) => {
    const tolerance = 7 / s;
    let bestX = tolerance + 1;
    let bestY = tolerance + 1;
    let snapX = 0;
    let snapY = 0;
    let guideX: number | undefined;
    let guideY: number | undefined;

    for (const a of moving) {
      if (a.rotation % 360 !== 0) continue;

      const ax = [
        a.position.x - a.width / 2 + dx,
        a.position.x + dx,
        a.position.x + a.width / 2 + dx,
      ];
      const ay = [
        a.position.y - a.height / 2 + dy,
        a.position.y + dy,
        a.position.y + a.height / 2 + dy,
      ];

      for (const b of others) {
        if (b.rotation % 360 !== 0) continue;

        const bx = [
          b.position.x - b.width / 2,
          b.position.x,
          b.position.x + b.width / 2,
        ];
        const by = [
          b.position.y - b.height / 2,
          b.position.y,
          b.position.y + b.height / 2,
        ];

        for (const x of ax) {
          for (const target of bx) {
            const diff = target - x;
            if (Math.abs(diff) < bestX && Math.abs(diff) <= tolerance) {
              bestX = Math.abs(diff);
              snapX = diff;
              guideX = target;
            }
          }
        }

        for (const y of ay) {
          for (const target of by) {
            const diff = target - y;
            if (Math.abs(diff) < bestY && Math.abs(diff) <= tolerance) {
              bestY = Math.abs(diff);
              snapY = diff;
              guideY = target;
            }
          }
        }
      }
    }

    return { snapX, snapY, guideX, guideY };
  };


  const startMove = (e: React.PointerEvent, b: Box) => {
    if (!unlocked) return;
    if (editing === b.id) return;

    if (e.shiftKey) {
      setSelectedIds((ids) =>
        ids.includes(b.id)
          ? ids.filter((id) => id !== b.id)
          : [...ids, b.id]
      );
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    selectedRef.current = b.id;
    setSel(b.id);

    const ids = selectedIds.includes(b.id) ? selectedIds : [b.id];
    const moving = boxesRef.current.filter((x) => ids.includes(x.id));
    const others = boxesRef.current.filter((x) => !ids.includes(x.id));
    const origins = new Map(moving.map((x) => [x.id, x.position]));

    if (!selectedIds.includes(b.id)) setSelectedIds([]);

    drag(e, (dx, dy) => {
      const result = findAlignment(moving, others, dx, dy);
      const finalDx = dx + result.snapX;
      const finalDy = dy + result.snapY;

      setAlignmentGuides({
        x: result.guideX,
        y: result.guideY,
      });

      setBoxes((prev) =>
        prev.map((x) => {
          const origin = origins.get(x.id);
          return origin
            ? {
                ...x,
                position: {
                  x: origin.x + finalDx,
                  y: origin.y + finalDy,
                },
              }
            : x;
        })
      );
    });
  };

  const startResize = (e: React.PointerEvent, b: Box, sxSign: number, sySign: number) => {
    if (!unlocked) return;
    const rad = (b.rotation * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const { width: w0, height: h0, position: p0 } = b;
    drag(e, (dx, dy) => {
      const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
      const w = Math.max(20, w0 + sxSign * lx), h = Math.max(12, h0 + sySign * ly);
      const cdx = (sxSign * (w - w0)) / 2, cdy = (sySign * (h - h0)) / 2;
      update(b.id, (x) => ({
        ...x, width: w, height: h,
        fontSize: Math.max(6, Math.min(80, Math.round(b.fontSize * Math.pow((w * h) / (w0 * h0), 0.22) * 10) / 10)),
        position: { x: p0.x + cdx * cos - cdy * sin, y: p0.y + cdx * sin + cdy * cos },
      }), false);
    });
  };
  const startRotate = (e: React.PointerEvent, b: Box) => {
    if (!unlocked) return;
    const el = (e.currentTarget as HTMLElement).parentElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    drag(e, (_dx, _dy, ev) => {
      let a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI - 90;
      if (ev.shiftKey) a = Math.round(a / 15) * 15;
      a = ((a % 360) + 360) % 360;
      update(b.id, (x) => ({ ...x, rotation: Math.round(a) }), false);
    });
  };

  const selected = boxes.find((b) => b.id === sel);

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-background text-foreground">
      {(!mini || !unlocked) && (
        <header className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 border-b border-border bg-card px-2 py-1.5">
          <h1 className="mr-1 text-sm font-bold">Mall Map Editor</h1>
          <div className="relative w-56 max-w-[80vw]">
            <div className="flex h-7 items-center rounded-md border border-input bg-background px-2">
              <span aria-hidden="true" className="mr-1 text-sm">⌕</span>
              <input
                ref={searchInputRef}
                type="search"
                dir="auto"
                aria-label="Search stores"
                placeholder="חיפוש חנות..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveSearchId(null);
                  setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                    searchInputRef.current?.blur();
                  }
                  if (e.key === "Enter" && searchMatches.length > 0) {
                    goToSearchResult(searchMatches[0]);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {searchOpen && searchTerm && (
              <div
                dir="rtl"
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
              >
                {searchMatches.length === 0 ? (
                  <div className="px-3 py-2 text-sm">לא נמצאו חנויות</div>
                ) : (
                  searchMatches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => goToSearchResult(b)}
                      className="block w-full border-b border-border px-3 py-2 text-right text-sm hover:bg-muted"
                    >
                      {b.text}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1" onClick={toggleLock}
            title={unlocked ? "Lock editing" : "Unlock editing"}>
            {unlocked ? <LockOpen size={14} /> : <LockKeyhole size={14} />}
            {unlocked ? "Lock Editing" : "Unlock Editing"}
          </Button>
          {unlocked && <Sep />}
          {unlocked && <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Tb onClick={addBox} icon={<Square />} label="Add box" />
          <Tb onClick={copySelected} icon={<Copy />} label="Copy (Ctrl+C)" disabled={!sel} />
          <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={pasteBox} disabled={!copiedBox}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white disabled:opacity-40"
            title="Paste (Ctrl+V)" aria-label="Paste (Ctrl+V)"><ClipboardPaste className="h-4 w-4" /></button>
          {copyStatus && <span role="status" className="max-w-64 truncate text-xs text-blue-700">{copyStatus}</span>}
          <Tb onClick={undo} icon={<Undo2 />} label="Undo (Ctrl+Z)" disabled={history.current.length === 0} />
          <Tb onClick={redo} icon={<Redo2 />} label="Redo (Ctrl+Y / Ctrl+Shift+Z)" disabled={future.current.length === 0} />
          <Tb onClick={save} icon={<Save />} label={saved ?? "Save"} />
          {loaded && <span role="status" className={hasUnsavedChanges ? "text-xs font-medium text-amber-600" : "text-xs font-medium text-green-700"}>{hasUnsavedChanges ? "● Unsaved changes" : "✓ All changes saved"}</span>}
          <Button variant="outline" size="sm" className="h-7" onClick={exportBoxes}>Export JSON</Button>
          <label className="cursor-pointer rounded border px-2 py-1 text-xs">Import JSON<input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void importBoxes(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <Tb onClick={del} icon={<Trash2 />} label="Delete" disabled={!sel} />
          <Tb onClick={() => { setMini(true); }} icon={<ChevronUp />} label="Minimize UI" />
          {unlocked && selected && (
            <>
              <Sep />
              <label className="flex items-center gap-1 text-xs"><span className="sr-only">Text</span>
                <input aria-label="Box text" dir="auto" value={selected.text} className="h-7 w-28 rounded border border-input bg-background px-1.5"
                  onFocus={snapshot} onChange={(e) => update(selected.id, (b) => ({ ...b, text: e.target.value }), false)} />
              </label>
              <div className="flex items-center overflow-hidden rounded-md border border-input" aria-label="Font size controls">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" title="Decrease font size"
                  onClick={() => update(selected.id, (b) => ({ ...b, fontSize: Math.max(6, b.fontSize - 1) }))}>
                  <Minus />
                </Button>
                <label className="flex items-center"><span className="sr-only">Font size</span>
                  <input aria-label="Font size" type="number" min={6} max={80} step={0.1} value={selected.fontSize} className="h-7 w-11 border-x border-input bg-background px-1 text-center text-xs outline-none"
                  onChange={(e) => update(selected.id, (b) => ({ ...b, fontSize: Number(e.target.value) || 6 }))} />
                </label>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" title="Increase font size"
                  onClick={() => update(selected.id, (b) => ({ ...b, fontSize: Math.min(80, b.fontSize + 1) }))}>
                  <Plus />
                </Button>
              </div>
              <label className="flex items-center gap-1 text-xs"><span>°</span>
                <input aria-label="Rotation" type="number" value={selected.rotation} className="h-7 w-12 rounded border border-input bg-background px-1 text-center"
                  onChange={(e) => update(selected.id, (b) => ({ ...b, rotation: ((Number(e.target.value) % 360) + 360) % 360 }))} />
              </label>
              <div className="flex items-center gap-1" aria-label="Box color">
                <ColorButton label="White" color="transparent" selected={!selected.highlightColor}
                  onClick={() => update(selected.id, (b) => ({ ...b, highlightColor: null }))} />
                <ColorButton label="Yellow" color={YELLOW} selected={selected.highlightColor === YELLOW}
                  onClick={() => update(selected.id, (b) => ({ ...b, highlightColor: YELLOW }))} />
                <ColorButton label="Red" color={RED} selected={selected.highlightColor === RED}
                  onClick={() => update(selected.id, (b) => ({ ...b, highlightColor: RED }))} />
              </div>
            </>
          )}
          </div>}
        </header>
      )}

      <div className="relative min-h-0 flex-1 bg-muted">
        <div ref={wrapRef} className="absolute inset-0 overflow-auto"
          onPointerDownCapture={startPan}
          title={spaceHeld ? "גררי כדי להזיז את המפה" : "רווח + גרירה: הזזת מפה • חצים: הזזת חנות • Shift+חצים: 10 פיקסלים"}
          onPointerDown={() => { setSel(null); setEditing(null); }}
          style={{ cursor: panning ? "grabbing" : spaceHeld ? "grab" : "auto", touchAction: panning ? "none" : undefined }}>
          <div className="flex items-center justify-center p-2"
            style={{ width: `max(100%, ${IMG_W * s + 16}px)`, height: `max(100%, ${IMG_H * s + 16}px)` }}>
            <div style={{ width: IMG_W * s, height: IMG_H * s, position: "relative", flex: "none" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: IMG_W, height: IMG_H, transform: `scale(${s})`, transformOrigin: "0 0", overflow: "hidden" }}>
              {loaded && (
                <img src={`${import.meta.env.BASE_URL}mall-map-clean.png`} alt="Mall map" draggable={false}
                  style={{ position: "absolute", left: 0, top: 0, width: IMG_W, height: IMG_H, maxWidth: "none", userSelect: "none", pointerEvents: "none" }} />
              )}

              {alignmentGuides.x !== undefined && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: alignmentGuides.x,
                    top: 0,
                    width: 0,
                    height: IMG_H,
                    borderLeft: `${1 / s}px dashed #ec4899`,
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
              )}
              {alignmentGuides.y !== undefined && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: alignmentGuides.y,
                    width: IMG_W,
                    height: 0,
                    borderTop: `${1 / s}px dashed #ec4899`,
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
              )}
              {boxes.map((b) => {
                const isSel = b.id === sel || selectedIds.includes(b.id);
                const isSearchResult = b.id === activeSearchId;
                return (
                  <div key={b.id}
                    data-store-box onPointerDown={(e) => { if (unlocked) startMove(e, b); }}
                    onDoubleClick={() => { if (unlocked) { snapshot(); setEditing(b.id); } }}
                    style={{
                      position: "absolute",
                       left: b.position.x - b.width / 2, top: b.position.y - b.height / 2,
                      width: b.width, height: b.height,
                      transform: `rotate(${b.rotation}deg)`,
                      background: b.highlightColor ?? "#ffffff",
                      fontSize: b.fontSize,
                      // A subtle selection frame sits outside the label; nothing crosses its text.
                      outline: isSearchResult
                         ? `${4 / s}px solid #2563eb`
                         : isSel
                           ? `${1.5 / s}px solid #0a5bd8`
                           : "1px solid rgba(0,0,0,.45)",
                      outlineOffset: isSearchResult ? 5 / s : isSel ? 3 / s : 0,
                      cursor: !unlocked ? "default" : spaceHeld ? (panning ? "grabbing" : "grab") : editing === b.id ? "text" : "move",
                      pointerEvents: unlocked ? "auto" : "none",
                      zIndex: isSearchResult ? 15 : isSel ? 10 : 1,
                    }}
                    className="flex select-none items-center justify-center text-center font-semibold leading-tight text-black"
                  >
                    {editing === b.id ? (
                      <textarea autoFocus dir="auto" value={b.text}
                        onPointerDown={(e) => e.stopPropagation()}
                        onBlur={() => setEditing(null)}
                        onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); setEditing(null); } }}
                        onChange={(e) => update(b.id, (x) => ({ ...x, text: e.target.value }), false)}
                        className="h-full w-full resize-none bg-transparent text-center outline-none"
                        style={{ fontSize: b.fontSize, lineHeight: 1.1 }} />
                    ) : (
                      <span dir="auto" className="pointer-events-none overflow-hidden px-0.5" style={{ whiteSpace: "pre-wrap" }}>{b.text}</span>
                    )}
                    {unlocked && isSel && selectedIds.length === 0 && !mini && editing !== b.id && (
                      <>
                        {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([hx, hy]) => (
                          // Only four corner resize grips. The visible square is 7 screen px;
                          // its transparent hit target is 14 screen px for easier dragging.
                          <span key={`${hx}${hy}`} onPointerDown={(e) => startResize(e, b, hx, hy)}
                            title="Resize box"
                            style={{
                              position: "absolute", width: 14 / s, height: 14 / s,
                              left: hx < 0 ? -13 / s : b.width - 1 / s,
                              top: hy < 0 ? -13 / s : b.height - 1 / s,
                              cursor: hx * hy > 0 ? "nwse-resize" : "nesw-resize",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              touchAction: "none", zIndex: 2,
                            }}>
                            <span style={{
                              display: "block", width: 7 / s, height: 7 / s,
                              border: `${1.25 / s}px solid #0a5bd8`,
                              borderRadius: 1.25 / s, backgroundColor: "#fff",
                              pointerEvents: "none",
                            }} />
                          </span>
                        ))}
                        {/* Rotation handle below the box, away from the text. */}
                        <span style={{ position: "absolute", left: `calc(50% - ${0.75 / s}px)`, top: b.height + 5 / s,
                          width: 1.5 / s, height: 17 / s, background: "#0a5bd8", pointerEvents: "none" }} />
                        <span onPointerDown={(e) => startRotate(e, b)} title="Rotate"
                          style={{ position: "absolute", left: `calc(50% - ${6 / s}px)`, top: b.height + 20 / s,
                            width: 12 / s, height: 12 / s, borderRadius: "50%", background: "#0a5bd8",
                            border: `${1 / s}px solid #fff`, cursor: "grab", touchAction: "none" }} />
                      </>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>
        <div role="group" aria-label="Map zoom" ref={zoomToolbarRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            left: zoomToolbarPosition?.x ?? 16,
            top: zoomToolbarPosition?.y ?? 16,
            maxWidth: "calc(100% - 8px)",
          }}
          className="absolute z-30 flex items-center gap-0.5 rounded-md border border-border bg-card/95 p-0.5 shadow-sm">
          <button type="button" aria-label="גרירת סרגל הזום" title="גררי להזזת הסרגל"
            onPointerDown={startZoomToolbarDrag}
            className="flex h-7 w-5 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-muted-foreground active:cursor-grabbing"
            style={{ touchAction: "none" }}>⋮⋮</button>
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={zoomOut} disabled={zoom <= 0.3}
            title="הקטנת המפה (Ctrl+-)" aria-label="הקטנת המפה"><Minus size={14} /></Button>
          <span className="w-10 shrink-0 select-none text-center text-xs font-semibold tabular-nums" aria-label="Zoom level">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={zoomIn} disabled={zoom >= 5}
            title="הגדלת המפה (Ctrl++)" aria-label="הגדלת המפה"><Plus size={14} /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={zoomFit}
            title="התאמת המפה לגודל המסך" aria-label="התאמת המפה לגודל המסך">
            <Maximize2 size={14} />
          </Button>
        </div>
        {mini && unlocked && (
          <Button variant="outline" size="icon" onPointerDown={(e) => e.stopPropagation()} onClick={() => setMini(false)} aria-label="Show UI" title="Show UI"
            className="fixed right-2 top-2 z-50 h-8 w-8 rounded-full">
            <ChevronDown size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function Tb({ onClick, icon, label, disabled }: { onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled} variant="outline" size="icon" className="h-7 w-7" title={label} aria-label={label}>
      {icon}
    </Button>
  );
}

function ColorButton({ label, color, selected, onClick }: { label: string; color: string; selected: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} variant="outline" size="icon" className={`h-7 w-7 ${selected ? "ring-2 ring-ring" : ""}`} title={label} aria-label={`${label} box color`} aria-pressed={selected}>
      <span className="h-3.5 w-3.5 rounded-sm border border-border" style={{ backgroundColor: color }} />
    </Button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px bg-border" />;

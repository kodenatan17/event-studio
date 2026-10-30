'use client';

import { Button, Sheet } from '@undangan/ui';
import type {
  AvatarAppearance,
  BodyType,
  Slot,
  WardrobeItem,
  WorldStore,
} from '@undangan/world-engine';
import {
  randomAppearance,
  SKIN_TONES,
  useWorldStore,
  wardrobeItems,
  withBody,
  withSlot,
} from '@undangan/world-engine';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react';

import {
  BODY_LABELS,
  itemLabel,
  SKIN_LABELS,
  SLOT_LABELS,
  variantLabel,
} from '@/lib/avatar-labels';
import { writeAvatarPreference } from '@/lib/avatar-preference';

interface AvatarEditorProps {
  store: WorldStore;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

type TabId = 'tubuh' | 'kepala' | 'pakaian' | 'aksesori';

const TABS: readonly { id: TabId; label: string; slots: readonly Slot[] }[] = [
  { id: 'tubuh', label: 'Tubuh', slots: [] },
  { id: 'kepala', label: 'Kepala', slots: ['hair', 'headwear'] },
  { id: 'pakaian', label: 'Pakaian', slots: ['top', 'bottom', 'selendang', 'shoes'] },
  { id: 'aksesori', label: 'Aksesori', slots: ['earrings', 'glasses', 'bag', 'brooch'] },
];

const BODIES: readonly BodyType[] = ['pria', 'wanita'];
const REQUIRED: readonly Slot[] = ['hair', 'top', 'bottom', 'shoes'];

/** Rotation per pixel dragged, and per arrow key or button press (radians). */
const DRAG_RATE = 0.012;
const ROTATE_STEP = Math.PI / 12;
const MAX_YAW = Math.PI;

const CHOICE =
  'min-h-11 rounded-full border border-[#7a4a2a] px-3 py-2 text-sm font-medium text-[#4e2c18] ' +
  'transition-colors motion-reduce:transition-none aria-pressed:bg-[#7a4a2a] aria-pressed:text-[#fbf7ee] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e2c18]';
const SWATCH =
  'size-11 rounded-full border-2 border-[#fbf7ee] shadow-sm ring-1 ring-[#7a4a2a]/40 ' +
  'aria-pressed:ring-3 aria-pressed:ring-[#7a4a2a] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e2c18]';

function Choices({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold text-[#4e2c18]">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

interface SlotRowProps {
  slot: Slot;
  look: AvatarAppearance;
  onChange: (look: AvatarAppearance) => void;
}

/** One slot: its items, plus the worn item's colours or motifs. */
function SlotRow({ slot, look, onChange }: SlotRowProps) {
  const items = wardrobeItems(look.body, slot);
  if (items.length === 0) return null;
  const worn = look.slots[slot];
  const wornItem = items.find((item) => item.id === worn?.item);
  const choose = (item: WardrobeItem) =>
    onChange(withSlot(look, slot, { item: item.id, variant: item.variants?.[0]?.id }));

  return (
    <>
      <Choices label={SLOT_LABELS[slot]}>
        {REQUIRED.includes(slot) ? null : (
          <button
            type="button"
            className={CHOICE}
            aria-pressed={!worn}
            onClick={() => onChange(withSlot(look, slot, null))}
          >
            Tanpa
          </button>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={CHOICE}
            aria-pressed={worn?.item === item.id}
            onClick={() => choose(item)}
          >
            {itemLabel(item.id)}
          </button>
        ))}
      </Choices>
      {wornItem?.variants && wornItem.variants.length > 1 ? (
        <Choices label={`Warna ${SLOT_LABELS[slot].toLowerCase()}`}>
          {wornItem.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={SWATCH}
              style={{ backgroundColor: variant.swatch }}
              aria-label={variantLabel(variant.id)}
              aria-pressed={worn?.variant === variant.id}
              onClick={() =>
                onChange(withSlot(look, slot, { item: wornItem.id, variant: variant.id }))
              }
            />
          ))}
        </Choices>
      ) : null}
    </>
  );
}

/**
 * Avatar editor (FR-07): a sheet over the live scene, so the character itself is the preview.
 * Choices apply at once through the store. Only "Simpan" keeps them: Escape, "Batal" and browser
 * back all end in the unmount, which restores the look from when the editor opened. A UI overlay
 * like the quick map, not a WorldAction (§8.3); the world behind stays inert with input suspended.
 */
export function AvatarEditor({ store, onClose, fallbackFocus }: AvatarEditorProps) {
  const look = useWorldStore(store, (state) => state.avatarAppearance);
  const [snapshot] = useState(look);
  const [tab, setTab] = useState<TabId>('tubuh');
  // State only for the slider's value; a drag updates it when it ends, not on every move.
  const [yaw, setYaw] = useState(0);
  const liveYaw = useRef(0);
  const saved = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ pointer: number; x: number; yaw: number } | null>(null);
  const baseId = useId();

  const apply = (next: AvatarAppearance) => store.getState().setAvatarAppearance(next);

  const turnPreview = (next: number) => {
    liveYaw.current = Math.max(-MAX_YAW, Math.min(MAX_YAW, next));
    store.getState().input.preview.yaw = liveYaw.current;
  };
  const rotate = (next: number) => {
    turnPreview(next);
    setYaw(liveYaw.current);
  };

  // The camera shifts the view clear of the panel.
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const { preview } = store.getState().input;
    const measure = () => {
      const { left, height, width } = element.getBoundingClientRect();
      const side = left > 0;
      preview.insetRight = side ? width / window.innerWidth : 0;
      preview.insetBottom = side ? 0 : height / window.innerHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      preview.insetRight = 0;
      preview.insetBottom = 0;
      preview.yaw = 0;
    };
  }, [store]);

  useEffect(
    () => () => {
      if (!saved.current) store.getState().setAvatarAppearance(snapshot);
    },
    [store, snapshot],
  );

  const save = () => {
    saved.current = true;
    writeAvatarPreference(store.getState().avatarAppearance);
    onClose();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, yaw: liveYaw.current };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    turnPreview(drag.current.yaw + (event.clientX - drag.current.x) * DRAG_RATE);
  };
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setYaw(liveYaw.current);
  };
  const handleSurfaceKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      rotate(yaw - ROTATE_STEP);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      rotate(yaw + ROTATE_STEP);
    }
  };

  const handleTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = TABS.findIndex((candidate) => candidate.id === tab);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    if (!next) return;
    setTab(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  };

  const current = TABS.find((candidate) => candidate.id === tab) ?? TABS[0];

  return (
    <Sheet
      label="Ubah Avatar"
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      panelRef={panel}
      data-testid="avatar-editor"
      data-overlay-type="avatar_editor"
      surface={
        <>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Putar avatar"
            aria-valuemin={-180}
            aria-valuemax={180}
            aria-valuenow={Math.round((yaw * 180) / Math.PI)}
            aria-valuetext={`${Math.round((yaw * 180) / Math.PI)} derajat`}
            data-testid="avatar-rotate"
            className="absolute inset-0 cursor-grab touch-none outline-none select-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#fbf7ee] active:cursor-grabbing"
            onKeyDown={handleSurfaceKey}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-2 px-3">
            <Button
              variant="secondary"
              className="pointer-events-auto"
              onClick={() => rotate(yaw - ROTATE_STEP)}
            >
              Putar kiri
            </Button>
            <Button
              variant="secondary"
              className="pointer-events-auto"
              onClick={() => rotate(yaw + ROTATE_STEP)}
            >
              Putar kanan
            </Button>
          </div>
        </>
      }
    >
      <h2 className="px-4 pt-3 font-serif text-xl leading-tight text-[#2b2118]">Ubah Avatar</h2>
      <div
        role="tablist"
        aria-label="Bagian avatar"
        className="flex shrink-0 gap-1 border-b border-[#e6d6c3] px-2 pt-2"
        onKeyDown={handleTabKey}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            id={`${baseId}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === id ? 0 : -1}
            className="min-h-11 flex-1 rounded-t-lg px-1 text-sm font-medium text-[#4e2c18] aria-selected:bg-[#7a4a2a] aria-selected:text-[#fbf7ee] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4e2c18]"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3"
      >
        {tab === 'tubuh' ? (
          <>
            <Choices label="Tubuh">
              {BODIES.map((body) => (
                <button
                  key={body}
                  type="button"
                  className={CHOICE}
                  aria-pressed={look.body === body}
                  onClick={() => apply(withBody(look, body))}
                >
                  {BODY_LABELS[body]}
                </button>
              ))}
            </Choices>
            <Choices label="Warna kulit">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  className={SWATCH}
                  style={{ backgroundColor: tone.swatch }}
                  aria-label={SKIN_LABELS[tone.id]}
                  aria-pressed={look.skin === tone.id}
                  onClick={() => apply({ ...look, skin: tone.id })}
                />
              ))}
            </Choices>
          </>
        ) : (
          current?.slots.map((slot) => (
            <SlotRow key={slot} slot={slot} look={look} onChange={apply} />
          ))
        )}
      </div>
      <div className="flex shrink-0 justify-between gap-2 border-t border-[#e6d6c3] px-4 py-2">
        <Button variant="ghost" onClick={() => apply(randomAppearance(Math.random, look.body))}>
          Acak
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </div>
    </Sheet>
  );
}

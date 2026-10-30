'use client';

import type { InputAction, WorldStore } from '@undangan/world-engine';
import { joystickVector, queueAction, useWorldStore } from '@undangan/world-engine';
import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';

import { avatarActionLabel, controlLabel } from '@/lib/labels';

interface TouchControlsProps {
  store: WorldStore;
  /** Hidden while the "Interaksi" panel occupies the same space. */
  hidden?: boolean;
}

/** Knob travel (px) for full speed; also the stick radius passed to `joystickVector`. */
const STICK_RADIUS = 40;

const ACTION =
  'pointer-events-auto flex items-center justify-center rounded-full bg-[#fbf7ee]/95 text-sm font-semibold ' +
  'text-[#4e2c18] shadow-lg ring-1 ring-[#4e2c18]/15 transition active:scale-[.94] ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100 aria-disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e2c18]';

/**
 * Touch-first controls (`pointer: coarse`, FR-04): an analog stick bottom-left and the action
 * cluster bottom-right ("Lompat", "Buka", "Sapa"). They write the store's input bus only, so
 * dragging never re-renders React. Sits above the bottom bar (`bottom-full`), so the measured
 * canvas area is unchanged. The stick is `aria-hidden`: WASD, floor taps and the labelled HTML
 * controls reach the same places. No backdrop blur: blurring over the live canvas costs frames.
 */
export function TouchControls({ store, hidden = false }: TouchControlsProps) {
  const nearby = useWorldStore(store, (state) => state.nearby);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const setStick = (dx: number, dy: number) => {
    const vector = joystickVector(dx, dy, STICK_RADIUS);
    const { joystick } = store.getState().input;
    joystick.x = vector.x;
    joystick.y = vector.y;
    const length = Math.hypot(dx, dy);
    const scale = length > STICK_RADIUS ? STICK_RADIUS / length : 1;
    if (knob.current) {
      knob.current.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    }
  };

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setStick(
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2),
    );
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointer.current) return;
    pointer.current = null;
    setStick(0, 0);
  };

  // Never leave the avatar walking after the controls unmount (2D, scene error).
  useEffect(
    () => () => {
      const { joystick } = store.getState().input;
      joystick.x = 0;
      joystick.y = 0;
    },
    [store],
  );

  const act = (action: InputAction) => queueAction(store.getState().input, action);
  const nearbyLabel = nearby ? controlLabel(nearby.id) : null;

  return (
    <div
      data-testid="touch-controls"
      className={`pointer-events-none absolute inset-x-3 bottom-full mb-3 items-end justify-between ${
        hidden ? 'hidden' : 'hidden pointer-coarse:flex'
      }`}
    >
      <div
        ref={base}
        data-testid="joystick"
        aria-hidden="true"
        className="pointer-events-auto relative size-28 touch-none rounded-full bg-[#2b2118]/40 ring-2 ring-[#fbf7ee]/60 select-none"
        onPointerDown={(event) => {
          if (pointer.current !== null) return;
          event.preventDefault();
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          track(event);
        }}
        onPointerMove={(event) => {
          if (event.pointerId === pointer.current) track(event);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <div
          ref={knob}
          className="pointer-events-none absolute top-1/2 left-1/2 -mt-6 -ml-6 size-12 rounded-full bg-[#fbf7ee]/95 shadow-md ring-1 ring-[#4e2c18]/20"
        />
      </div>

      <div className="flex items-end gap-2">
        <button type="button" className={`${ACTION} mb-14 size-13`} onClick={() => act('wave')}>
          {avatarActionLabel('wave')}
        </button>
        <button
          type="button"
          // Focusable while disabled, so focus can return here after the opened dialog closes.
          aria-disabled={nearbyLabel ? undefined : 'true'}
          className={`${ACTION} mb-6 size-14`}
          onClick={() => {
            if (store.getState().nearby) act('interact');
          }}
        >
          {avatarActionLabel('interact')}
          {nearbyLabel ? <span className="sr-only"> {nearbyLabel}</span> : null}
        </button>
        <button type="button" className={`${ACTION} size-16`} onClick={() => act('jump')}>
          {avatarActionLabel('jump')}
        </button>
      </div>
    </div>
  );
}

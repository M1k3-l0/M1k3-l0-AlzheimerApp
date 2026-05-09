import React from 'react';

/**
 * Icone da public/new_icon (Flaticon).
 * name = nome file senza .svg (es. home, user, comments).
 * color = 'primary' | 'primaryDark' | 'accent' | 'white' | 'text' | 'textSecondary' | 'currentColor' | css value.
 * Se non passato, usa currentColor (eredita dal parent, es. TabBar active/inactive).
 */
const ICON_NAMES = [
  'add', 'badge-check', 'bell', 'bell-slash', 'calendar-lines', 'camera', 'comments',
  'envelope', 'face-expressionless', 'grin', 'home', 'lock', 'paper-plane', 'phone-call',
  'picture', 'sad', 'settings', 'shield-check', 'shield-exclamation', 'shoe-prints', 'text',
  'thumbs-up', 'trash', 'user', 'users-alt', 'microphone', 'play', 'pause', 'arrow-left', 'angle-right', 'crown', 'pencil', 'stethoscope'
];

const INLINE_ICONS = {
  microphone: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2c-1.66 0-3 1.34-3 3v5c0 1.66 1.34 3 3 3s3-1.34 3-5V5c0-1.66-1.34-3-3-3zM11 10V5c0-.55.45-1 1-1s1 .45 1 1v5c0 .55-.45 1-1 1s-1-.45-1-1zM19 10v1c0 3.53-2.61 6.43-6 6.92V21h-2v-3.08c-3.39-.49-6-3.39-6-6.92v-1h2v1c0 2.76 2.24 5 5 5s5-2.24 5-5v-1h2z'/%3E%3C/svg%3E",
  play: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M8 5v14l11-7z'/%3E%3C/svg%3E",
  pause: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 19h4V5H6v14zm8-14v14h4V5h-4z'/%3E%3C/svg%3E",
  'arrow-left': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'/%3E%3C/svg%3E",
  'angle-right': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'/%3E%3C/svg%3E",
  'crown': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z'/%3E%3C/svg%3E",
  'pencil': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E",
  'stethoscope': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M11 20H8.38c-3.13 0-5.74-2.43-5.88-5.55C2.35 11.23 4.9 8.5 8 8.5h3c1.65 0 3-1.35 3-3V3c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v4H6V3c0-1.65 1.35-3 3-3h4c1.65 0 3 1.35 3 3v2.5c0 2.4-1.74 4.41-4 4.9V14c0 1.1.9 2 2 2h3c1.65 0 3 1.35 3 3v.09c0 .41-.28.78-.68.88l-1.35.34c-1.04.26-1.76.99-1.92 2.05-.12.82.5 1.54 1.3 1.62 1.48.16 2.75-.92 2.94-2.39.2-1.62-.97-3.09-2.58-3.32l-1.05-.15V19c0-2.76-2.24-5-5-5H8.38c-2.03 0-3.74 1.57-3.87 3.6C4.37 19.82 6.13 21.5 8.24 21.5H11c.55 0 1-.45 1-1s-.45-1-1-1zm6 0c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1z'/%3E%3C/svg%3E"
};

const COLOR_MAP = {
  primary: 'var(--color-primary)',
  primaryDark: 'var(--color-primary-dark)',
  primarySoft: 'var(--color-primary-soft)',
  accent: 'var(--color-accent)',
  white: '#ffffff',
  text: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  success: 'var(--color-success)',
  error: 'var(--color-error)',
};

function resolveColor(color) {
  if (!color || color === 'currentColor') return 'currentColor';
  if (COLOR_MAP[color]) return COLOR_MAP[color];
  return color;
}

export default function AppIcon({ name, size = 24, color, className, style = {} }) {
  const safeName = ICON_NAMES.includes(name) ? name : 'home';
  const src = INLINE_ICONS[name] || `/new_icon/${safeName}.svg`;
  const bg = resolveColor(color);
  
  const maskStyle = {
    display: 'inline-block',
    width: size,
    height: size,
    flexShrink: 0,
    backgroundColor: bg,
    mask: `url("${src}") no-repeat center / contain`,
    WebkitMask: `url("${src}") no-repeat center / contain`,
    ...style,
  };
  return <span className={className} style={maskStyle} role="img" aria-hidden />;
}

export { ICON_NAMES, COLOR_MAP };

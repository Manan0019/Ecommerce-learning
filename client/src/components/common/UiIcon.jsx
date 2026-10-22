/** Consistent inline SVG arrows and navigation symbols. No external icon dependency. */
const shapes = {
  right: <path d="M4.5 12h15m-6-6 6 6-6 6" />,
  left: <path d="M19.5 12h-15m6-6-6 6 6 6" />,
  'up-right': <path d="M6.5 17.5 17.5 6.5M8 6.5h9.5V16" />,
  up: <path d="M12 19V5m-6 6 6-6 6 6" />,
  down: <path d="M12 5v14m-6-6 6 6 6-6" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-down': <path d="m5 9 7 7 7-7" />,
  plus: <path d="M12 5v14M5 12h14" /> ,
  trash: <><path d="M4 7h16M10 4h4m-8 3 1 13h10l1-13M10 10v7M14 10v7"/></>,
  save: <><path d="M4 4h13l3 3v13H4V4Z"/><path d="M8 4v6h8V4M8 20v-7h8v7"/></>,
  ban: <><circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/></>,
  filter: <><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="12" r="2"/></>,
  x: <path d="M6 6l12 12M18 6 6 18" /> ,
  'layout-dashboard': <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  package: <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4m-9 4v10"/></>,
  truck: <><path d="M2 5h12v12H2zM14 9h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  'check-circle': <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-2c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4v2"/><path d="M17 5.5a2.5 2.5 0 0 1 0 5M16.5 13c2.5.3 4 1.6 4 3.8V19"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  play: <path d="m8 5 11 7-11 7z" />,
  check: <path d="m5 12 4 4L19 6" />,
  edit: <><path d="M12 20h9"/><path d="M16 4a2.2 2.2 0 0 1 3.1 3.1L8.9 17.3l-4.2 1.1 1.1-4.2L16 4Z"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  heart: <path d="M20.8 4.8a5 5 0 0 0-7.1 0L12 6.5l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 20.7l8.8-8.8a5 5 0 0 0 0-7.1Z"/>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></>,
  compare: <><path d="M3 8h17l-4-4m4 4-4 4M21 16H4l4-4m-4 4 4 4"/></>,
  store: <><path d="M3 9.5h18l-1.2-5H4.2L3 9.5Z"/><path d="M5 9.5V20h14V9.5M9 20v-7h6v7"/></>,
  'log-out': <><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M12 8l4 4-4 4m4-4H8"/></>,
  bag: <><path d="M4 8h16l-1.25 13H5.25L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
  images: <><rect x="3" y="5" width="15" height="15" rx="2"/><path d="M7 15l3-3 2.5 2.5 2-2 3.5 4"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/></>,
  maximize: <><path d="M8 3H3v5m0-5 7 7m6-7h5v5m0-5-7 7M3 16v5h5m-5 0 7-7m11 2v5h-5m5 0-7-7"/></>,
};
export default function UiIcon({ name = 'right', size = 18, className = '' }) {
  return <svg className={`nx47-icon ${className}`.trim()} aria-hidden="true" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" focusable="false">{shapes[name] || shapes.right}</svg>;
}

// Extended icon set — Tabler-flavored stroke icons.
const Icon = ({ d, size = 16, stroke = 1.6, className = '', children, vb = 24 }) => (
  <svg
    viewBox={`0 0 ${vb} ${vb}`}
    width={size} height={size}
    fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  Plus:    (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Send:    (p) => <Icon {...p}><path d="M4 12l16-8-6 18-3-7-7-3z" /></Icon>,
  Search:  (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>,
  Chevron: (p) => <Icon {...p} d="m9 6 6 6-6 6" />,
  ChevronDown: (p) => <Icon {...p} d="m6 9 6 6 6-6" />,
  ChevronLeft: (p) => <Icon {...p} d="m15 6-6 6 6 6" />,
  Spark:   (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Icon>,
  Warning: (p) => <Icon {...p}><path d="M12 4 2.5 20h19L12 4z" /><path d="M12 10v4" /><path d="M12 17.2v.1" /></Icon>,
  Info:    (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v.1M11 12h1v5h1" /></Icon>,
  Check:   (p) => <Icon {...p} d="m4 12 5 5L20 6" />,
  X:       (p) => <Icon {...p} d="M5 5l14 14M19 5 5 19" />,
  Mail:    (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>,
  Paper:   (p) => <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Icon>,
  Attach:  (p) => <Icon {...p}><path d="m21 11.5-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L11 17a2 2 0 1 1-3-3l7-7" /></Icon>,
  Mic:     (p) => <Icon {...p}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Icon>,
  Pin:     (p) => <Icon {...p}><path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4-1-6z" /></Icon>,
  Folder:  (p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></Icon>,
  Tag:     (p) => <Icon {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /></Icon>,
  Settings:(p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1A1.7 1.7 0 0 0 9 4.7 1.7 1.7 0 0 0 10 3.2V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>,
  More:    (p) => <Icon {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></Icon>,
  Edit:    (p) => <Icon {...p} d="M4 20h4l10-10-4-4L4 16v4z" />,
  Trend:   (p) => <Icon {...p} d="M3 17 9 11l4 4 8-9" />,
  Fish:    (p) => <Icon {...p}><path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" /><circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" /><path d="m3 12 3 3M3 12l3-3" /></Icon>,
  Beaker:  (p) => <Icon {...p}><path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3" /><path d="M7.5 14h9" /></Icon>,
  Building:(p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></Icon>,
  Heart:   (p) => <Icon {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></Icon>,
  Logo:    (p) => <Icon {...p}><path d="M4 14c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4" /><path d="M3 18h18" strokeWidth="1" opacity=".5" /></Icon>,

  // New for v2
  Bolt:    (p) => <Icon {...p} d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
  Chart:   (p) => <Icon {...p}><path d="M3 3v18h18" /><path d="M7 14v3M11 10v7M15 7v10M19 12v5" /></Icon>,
  Brain:   (p) => <Icon {...p}><path d="M9 3a3 3 0 0 0-3 3v.5A3 3 0 0 0 4 9c0 1 .5 1.8 1.2 2.4A3 3 0 0 0 6 17a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z" /><path d="M15 3a3 3 0 0 1 3 3v.5A3 3 0 0 1 20 9c0 1-.5 1.8-1.2 2.4A3 3 0 0 1 18 17a3 3 0 0 1-3 3 3 3 0 0 1-3-3" /></Icon>,
  Bell:    (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></Icon>,
  Eye:     (p) => <Icon {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Icon>,
  EyeOff:  (p) => <Icon {...p}><path d="M3 3l18 18M10.6 6.1A8 8 0 0 1 12 6c6 0 10 6 10 6a16 16 0 0 1-3 3.6M6.6 6.6A16 16 0 0 0 2 12s4 6 10 6a8 8 0 0 0 4-1.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>,
  Lock:    (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>,
  Shield:  (p) => <Icon {...p}><path d="M12 3 4 6v6c0 5 3 8 8 9 5-1 8-4 8-9V6l-8-3z" /></Icon>,
  Sparkle: (p) => <Icon {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" /></Icon>,
  Doc:     (p) => <Icon {...p}><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /></Icon>,
  Download:(p) => <Icon {...p}><path d="M12 4v12m-5-5 5 5 5-5M4 20h16" /></Icon>,
  Excel:   (p) => <Icon {...p}><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="m9 10 6 8M15 10l-6 8" /></Icon>,
  Pdf:     (p) => <Icon {...p}><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 10h1.5a1.5 1.5 0 0 1 0 3H9zM9 10v6M14 10v6M14 13h2.5" /></Icon>,
  Globe:   (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>,
  Clock:   (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
  Calendar:(p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>,
  Phone:   (p) => <Icon {...p}><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Icon>,
  Wa:      (p) => <Icon {...p}><path d="M3 21l1.5-5A8 8 0 1 1 8 19.5L3 21z" /><path d="M9 9c0 3 3 6 6 6l1.5-1.5L14 12l-2 .5-1-1 .5-2-1.5-2.5z" /></Icon>,
  Robot:   (p) => <Icon {...p}><rect x="4" y="8" width="16" height="11" rx="2" /><path d="M12 5v3M9 13h.01M15 13h.01M9 16h6" /><path d="M2 13v2M22 13v2" /></Icon>,
  Stream:  (p) => <Icon {...p}><path d="M4 12c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3" /><path d="M4 17c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3" /></Icon>,
  Audit:   (p) => <Icon {...p}><path d="M5 3h10l4 4v14H5z" /><path d="M9 13l2 2 4-4M9 17h6" /></Icon>,
  Refresh: (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></Icon>,
  Filter:  (p) => <Icon {...p} d="M3 5h18l-7 9v6l-4-2v-4z" />,
  External:(p) => <Icon {...p}><path d="M14 5h5v5M19 5l-9 9M12 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6" /></Icon>,
  Menu:    (p) => <Icon {...p} d="M4 7h16M4 12h16M4 17h16" />,
  Power:   (p) => <Icon {...p}><path d="M12 3v9M7 6a8 8 0 1 0 10 0" /></Icon>,
};

window.I = I;
window.Icon = Icon;

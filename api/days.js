import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const THEME = {
  bg: '#805D5F',
  past: '#E8C4CC',
  today: '#D9AD68',
  future: 'rgba(232, 196, 204, 0.2)',
  text: '#D9AD68',
  subtext: 'rgba(232, 196, 204, 0.55)',
};

function dimension(value, fallback, cap) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), cap) : fallback;
}

export function calendar(tz, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const y = get('year'), m = get('month'), d = get('day');
  const total = ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365;
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
  return { total, dayOfYear, left: total - dayOfYear, pct: Math.floor(dayOfYear / total * 100) };
}

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const width = dimension(searchParams.get('width'), 1290, 3000);
  const height = dimension(searchParams.get('height'), 2796, 4000);
  const tz = searchParams.get('tz') || 'America/Chicago';
  let date;
  try { date = calendar(tz); }
  catch { return new Response('Invalid tz: use an IANA timezone such as America/Chicago.', { status: 400 }); }
  const { total, dayOfYear, left, pct } = date;
  const cols = 15;
  const rows = Math.ceil(total / cols);
  const gridW = width * 0.72;
  const cell = gridW / cols;
  const dot = cell * 0.62;
  const gridH = cell * rows;
  const top = height * 0.27;
  const h = (style, children) => ({ type: 'div', key: null, props: { style, children } });
  const dots = [];
  for (let i = 1; i <= total; i++) {
    const color = i < dayOfYear ? THEME.past : i === dayOfYear ? THEME.today : THEME.future;
    dots.push(h(
      { width: cell, height: cell, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
      h({ width: dot, height: dot, borderRadius: dot, backgroundColor: color })
    ));
  }
  const fs = width * 0.034;
  const tree = h(
    { width, height, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: THEME.bg },
    [
      h({ position: 'absolute', top, left: (width - gridW) / 2, width: gridW, height: gridH, display: 'flex', flexWrap: 'wrap' }, dots),
      h({ position: 'absolute', top: top + gridH + cell * 1.4, width, display: 'flex', justifyContent: 'center', fontSize: fs, letterSpacing: fs * 0.04 }, [
        h({ color: THEME.text }, `${left}d left`),
        h({ color: THEME.subtext, marginLeft: fs * 0.6 }, `·  ${pct}%`),
      ]),
    ]
  );
  const response = new ImageResponse(tree, { width, height });
  response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600');
  return response;
}

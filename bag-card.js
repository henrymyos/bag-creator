// Share image for a bag: a 1080x1350 PNG (Instagram portrait) drawn on a canvas, then shared or downloaded.

// Pure: discs -> one group per type that has discs, duplicates folded into a qty.
function bagCardGroups(discs, types) {
  return types.map(t => {
    const group = discs.filter(d => d.type === t.key);
    const byKey = new Map();
    for (const d of group) {
      const k = `${d.brand}|${d.name}`;
      const e = byKey.get(k);
      if (e) e.qty++;
      else byKey.set(k, { name: d.name, brand: d.brand, qty: 1, flight: `${d.speed} | ${d.glide} | ${d.turn} | ${d.fade}` });
    }
    return { label: t.label, color: t.color, count: group.length, items: [...byKey.values()] };
  }).filter(g => g.count);
}

// Pure: split groups into at most two columns, keeping each group whole and the columns balanced.
function bagCardColumns(groups) {
  const size = g => g.items.length + 1.3; // a group header is a bit taller than a row
  const total = groups.reduce((n, g) => n + size(g), 0);
  if (total <= 12 || groups.length < 2) return [groups];
  let left = 0, i = 0;
  while (i < groups.length - 1 && left + size(groups[i]) / 2 <= total / 2) left += size(groups[i++]);
  return [groups.slice(0, i), groups.slice(i)];
}

const BAG_CARD_W = 1080, BAG_CARD_H = 1350;
// Same order, labels and colors as the bag pages' TYPE_CONFIG.
const BAG_CARD_TYPES = [
  { key:'putter',   label:'Putters',          color:'#3fb950' },
  { key:'midrange', label:'Midranges',        color:'#d29922' },
  { key:'fairway',  label:'Fairway Drivers',  color:'#a371f7' },
  { key:'distance', label:'Distance Drivers', color:'#f78166' },
];

function brandLabel(b) {
  return b === 'mvp' ? 'MVP' : b.charAt(0).toUpperCase() + b.slice(1);
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '\u2026').width > maxW) t = t.slice(0, -1);
  return t + '\u2026';
}

function drawBagCard(ctx, { owner, bagName, discs, types = BAG_CARD_TYPES, host }) {
  const W = BAG_CARD_W, H = BAG_CARD_H, PAD = 72;
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#39d353';
  ctx.fillRect(0, 0, W, 12);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#39d353';
  ctx.font = '700 34px "Barlow Condensed", sans-serif';
  ctx.fillText('IN THE BAG', PAD, 108);
  ctx.fillStyle = '#e6edf3';
  ctx.font = '700 92px "Barlow Condensed", sans-serif';
  ctx.fillText(fitText(ctx, owner.toUpperCase(), W - PAD * 2), PAD, 196);
  let y = 196;
  if (bagName) {
    ctx.fillStyle = '#8b949e';
    ctx.font = '600 40px Barlow, sans-serif';
    y += 58;
    ctx.fillText(fitText(ctx, bagName, W - PAD * 2), PAD, y);
  }

  const groups = bagCardGroups(discs, types);
  // Breakdown chips: "3 Putters  4 Midranges ..."
  y += 72;
  let x = PAD;
  ctx.font = '700 30px "Barlow Condensed", sans-serif';
  for (const g of [...groups, { label: 'total', count: discs.length, color: '#e6edf3' }]) {
    const text = `${g.count} ${g.label.split(' ')[0].toUpperCase()}`;
    const w = ctx.measureText(text).width + 36;
    if (x + w > W - PAD) break;
    ctx.fillStyle = g.color + '26';
    ctx.beginPath();
    ctx.roundRect(x, y - 36, w, 50, 25);
    ctx.fill();
    ctx.fillStyle = g.color;
    ctx.fillText(text, x + 18, y);
    x += w + 14;
  }

  const top = y + 60, bottom = H - 120;
  const cols = bagCardColumns(groups);
  const colW = (W - PAD * 2 - (cols.length - 1) * 48) / cols.length;
  cols.forEach((col, ci) => {
    const units = col.reduce((n, g) => n + g.items.length + 1.3, 0);
    const row = Math.min(64, (bottom - top) / units);
    const s = row / 64;
    const cx = PAD + ci * (colW + 48);
    let cy = top;
    for (const g of col) {
      cy += row * 1.3;
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(cx + 9 * s, cy - 12 * s, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 ${Math.round(32 * s)}px "Barlow Condensed", sans-serif`;
      ctx.fillText(`${g.label.toUpperCase()} \u00b7 ${g.count}`, cx + 30 * s, cy);
      for (const it of g.items) {
        cy += row;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#8b949e';
        ctx.font = `500 ${Math.round(28 * s)}px Barlow, sans-serif`;
        ctx.fillText(it.flight, cx + colW, cy);
        const flightW = ctx.measureText(it.flight).width + 20;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e6edf3';
        ctx.font = `600 ${Math.round(38 * s)}px Barlow, sans-serif`;
        const qty = it.qty > 1 ? ` \u00d7${it.qty}` : '';
        const name = fitText(ctx, it.name + qty, colW - flightW - 30 * s);
        ctx.fillText(name, cx + 30 * s, cy);
        const nameW = ctx.measureText(name).width;
        ctx.fillStyle = '#8b949e';
        ctx.font = `500 ${Math.round(26 * s)}px Barlow, sans-serif`;
        const brand = ' ' + brandLabel(it.brand);
        if (cx + 30 * s + nameW + ctx.measureText(brand).width < cx + colW - flightW) ctx.fillText(brand, cx + 30 * s + nameW, cy);
      }
    }
  });

  ctx.fillStyle = '#8b949e';
  ctx.font = '600 30px Barlow, sans-serif';
  ctx.fillText('Build yours at', PAD, H - 60);
  const lead = ctx.measureText('Build yours at ').width;
  ctx.fillStyle = '#39d353';
  ctx.font = '600 30px Barlow, sans-serif';
  ctx.fillText(host, PAD + lead, H - 60);
}

// Draws the card, then opens the share sheet with the PNG (phones) or downloads it (desktop).
async function shareBagImage(opts) {
  await Promise.all(['700 92px "Barlow Condensed"', '600 38px Barlow', '500 28px Barlow'].map(f => document.fonts.load(f))).catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = BAG_CARD_W;
  canvas.height = BAG_CARD_H;
  drawBagCard(canvas.getContext('2d'), opts);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], 'disc-golf-bag.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: opts.title || `${opts.owner}'s Disc Golf Bag` }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; } // other errors: fall back to a download
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return 'saved';
}

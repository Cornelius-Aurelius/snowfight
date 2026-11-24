'use strict';

const get = id => document.getElementById(id);
const canvas = get('game');
const context = canvas.getContext('2d', { alpha: false });
const backdrop = document.createElement('canvas');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const stages = [
  { rows: 9, speed: 4.3, hp: 1 },
  { rows: 10, speed: 4.6, hp: 2 },
  { rows: 11, speed: 5.1, hp: 2 },
  { rows: 12, speed: 5.5, hp: 3 },
  { rows: 8, speed: 5.4, hp: 3 },
];
const worlds = [
  { name:'Toy Factory', art:'factory', boss:'Nutcracker King', accent:'#6effd3' },
  { name:'Christmas Market', art:'market', boss:'Market Marshal', accent:'#ffd993' },
  { name:'Frozen Railway', art:'rail', boss:'Railway Commander', accent:'#83defb' },
  { name:'Aurora Forest', art:'forest', boss:'Firwood Guardian', accent:'#8ef3b1' },
  { name:'Clockwork Palace', art:'tower', boss:'Clockwork Emperor', accent:'#ffacf1' },
];
// Each string describes a repeating front-to-back row sequence. The seven
// positions span the enemy road, leaving the gift lane free on the right.
const ranks = {
  full: '1110111',
  wall: '1111111',
  left: '1111000',
  right:'0001111',
  split:'1100011',
  spine:'0011100',
  outer:'1101011',
  inner:'0111110',
  slant:'1010101',
  bands:'1011010',
};
const layouts = {
  A:['inner','full'], B:['left','right','spine'], C:['split','spine'],
  D:['left','inner','right','outer'], E:['right','spine','left','split'],
  F:['wall','spine','split'], G:['slant','bands'], H:['right','right','left'],
  I:['left','left','right'], J:['outer','inner','spine'],
  K:['split','left','split','right'], L:['spine','wall','spine','full'],
  M:['bands','left','slant','right'], N:['outer','wall','inner'],
  O:['spine','left','right','spine','split'], P:['wall','full','inner'],
  Q:['left','spine','left','split'], R:['right','spine','right','split'],
  S:['slant','split','bands','spine'], T:['inner','outer','wall','split'],
};
const floorPlans = [
  { edge:[1.12,1.08,1.08,1.02], stone:['#536783','#9bdbee'], paving:'panels' },
  { edge:[1.04,1.16,1.02,1.09], stone:['#775366','#ffc284'], paving:'bricks' },
  { edge:[1.14,1.04,1.16,1.01], stone:['#344d72','#afc7f9'], paving:'rails' },
  { edge:[1.09,1.13,1.01,1.16], stone:['#414a7a','#ffa9d8'], paving:'diamonds' },
  { edge:[1.03,1.16,1.13,1.02], stone:['#276c75','#9df8e9'], paving:'ice' },
  { edge:[1.13,1.01,1.15,1.09], stone:['#315c54','#c6d891'], paving:'planks' },
  { edge:[1.05,1.11,1.08,1.16], stone:['#644775','#ffd581'], paving:'mosaic' },
  { edge:[1.17,1.02,1.08,1.13], stone:['#7c4667','#f8afcf'], paving:'checker' },
];
const toyTypes = {
  robot:   { speed:1,    sway:1,   extra:0, size:1,    color:'#f79f35' },
  soldier: { speed:1,    sway:.8,  extra:0, size:1,    color:'#f63c62' },
  drum:    { speed:1.07, sway:.75, extra:0, size:1,    color:'#ffb06f' },
  train:   { speed:1.19, sway:.26, extra:0, size:.84,  color:'#79e5eb' },
  jack:    { speed:.97,  sway:2.3, extra:0, size:.99,  color:'#8bffa2' },
  bear:    { speed:.84,  sway:.50, extra:2, size:1.16, color:'#e3a9ff' },
};
const toyLineups = [
  ['robot','soldier','drum','bear'],
  ['drum','soldier','jack','robot'],
  ['train','robot','soldier','bear'],
  ['jack','bear','train','drum'],
  ['bear','soldier','train','jack'],
];
const levelsPerWorld = 8;
// Each entry sets five wave layouts, toy spacing, and the depth of the
// companion pedestal, double-shot pedestal, and start of the gift lane.
const campaign = [
  ['First March',        'ABCFJ', 3.1, 23,28,41],
  ['Left Flank',         'IQDKL', 2.9, 25,25,43],
  ['Twin Columns',       'CKSFT', 3.6, 19,30,37],
  ['Right Rush',         'HRDJP', 2.8, 27,27,44],
  ['Broken Chevron',     'GOMNF', 3.4, 21,29,40],
  ['Factory Gauntlet',   'LTQSH', 3.2, 26,23,36],
  ['Rivet Ranks',        'MNAGK', 3.0, 18,32,45],
  ['Royal Escort',       'PFLTN', 3.5, 28,26,38],
  ['Lantern Parade',     'DHJQC', 3.3, 22,24,39],
  ['Market Crossfire',   'OSGBR', 3.7, 24,31,46],
  ['Bell Ringers',       'JEHPL', 2.8, 19,26,42],
  ['Stall Side Sweep',   'QMKBC', 3.2, 27,30,39],
  ['Gift Bargain',       'RCLSG', 3.4, 22,22,34],
  ['Candlelight Clash',  'NIDPF', 3.1, 18,28,46],
  ['Closing Time',       'KEQTJ', 2.9, 29,29,43],
  ['Marshal’s Parade',   'FBPND', 3.5, 20,25,37],
  ['Platform One',       'BGMQH', 3.5, 24,26,39],
  ['Fast Freight',       'HJPFC', 2.7, 28,31,44],
  ['Switchback',         'EDSDK', 3.5, 21,29,36],
  ['Snowbound Express',  'LQFJH', 3.7, 26,23,47],
  ['Signal Box',         'GSNRM', 3.2, 19,24,37],
  ['Double Track',       'CRKOT', 3.3, 25,31,42],
  ['Last Train North',   'PHEGQ', 2.9, 30,25,45],
  ['Iron Conductor',     'TMPNL', 3.0, 20,29,38],
  ['Firwood Fork',       'KCHOE', 3.5, 24,25,36],
  ['Pinecone Pincer',    'SCQGN', 2.8, 18,30,40],
  ['Emerald Switchback', 'DJMKR', 3.4, 22,27,45],
  ['Silent Clearing',    'OILAQ', 3.8, 29,22,37],
  ['Northern Lights',    'RQCSB', 3.2, 21,26,41],
  ['Timber Line',        'NPHDT', 3.5, 26,32,48],
  ['Frozen Canopy',      'MFEKI', 3.0, 19,24,42],
  ['Guardian’s Grove',   'JNPTG', 3.6, 29,27,39],
  ['Palace Steps',       'FTINB', 3.7, 22,31,47],
  ['Copper Columns',     'CEKRS', 3.3, 27,24,41],
  ['Pendulum March',     'ERDQM', 3.0, 20,27,35],
  ['Gilded Corridor',    'LFJHP', 3.2, 29,28,43],
  ['Royal Zigzag',       'GKOMS', 3.3, 24,25,38],
  ['Midnight Muster',    'PHLTN', 2.8, 18,32,44],
  ['Clock Strikes Twelve','TJPSF',3.4, 28,26,37],
  ['The Emperor’s Guard','NPTPL', 3.0, 21,29,40],
].map(([name,waves,gap,companion,double,gifts]) => ({name,waves,gap,companion,double,gifts}));
const totalLevels = campaign.length;
let unlocked = clamp(Math.floor(Number(read('snowfight-unlocked',1)) || 1),1,totalLevels);
let level = unlocked;
let world = worlds[Math.floor((level-1)/levelsPerWorld)];
const sceneryRequested = new Set();
const keys = new Set();
let width, height, ratio, laneWidth, playerY;
let phase = 'ready';
let waveIndex, health, score, player, enemies, shots, gifts, upgrades, particles;
let shotTimer, clock, between, hintTimer, messageUntil, pointerId, pointerX;
let lastTime = 0, readyFrame = 0;
let visualTime = 0, bossEntrance = -2;
let streak, peakStreak, streakUntil;
let bestStreak = read('snowfight-best-streak', 0);
let fastest = read('snowfight-fastest', 0);
let mute = read('snowfight-muted', false);
let best = read('snowfight-best', 0);
let audio;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function project(x, z) {
  const depth = clamp(z / 103, 0, 1.15);
  const perspective = 1 / (1 + depth * 2.2);
  return [width / 2 + x * laneWidth * perspective,
    playerY - (playerY - height * 0.055) * depth * (1.65 - depth * 0.65), perspective];
}

function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}
function round(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function oval(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function gradient(ctx, x, y, r, lit, shade) {
  const g = ctx.createRadialGradient(x - r * 0.28, y - r * 0.38, 1, x, y, r * 1.15);
  g.addColorStop(0, lit);
  g.addColorStop(1, shade);
  return g;
}

function snowman(ctx, gold = false) {
  const snow = gold ? '#ffe386' : '#ffffff';
  const shadow = gold ? '#b86810' : '#9eabc6';
  oval(ctx, 0, -17, 20, 23, gradient(ctx, 0, -17, 24, snow, shadow));
  oval(ctx, 0, -42, 14, 14, gradient(ctx, 0, -42, 15, snow, shadow));
  polygon(ctx, [[-18,-26],[-28,-39],[-24,-40],[-15,-30]], '#6f4636');
  polygon(ctx, [[18,-25],[29,-35],[31,-31],[17,-19]], '#6f4636');
  oval(ctx, -27, -39, 5, 5, '#9e2437');
  oval(ctx, 28, -35, 5, 5, '#9e2437');
  oval(ctx, 0, -37, 17, 7, gradient(ctx, -4, -38, 18, '#f24b66', '#9c1736'));
  round(ctx, -11, -38, 21, 2, 1, '#fbbca6');
  oval(ctx, -3, -23, 3, 3, gold ? '#91501d' : '#2e4660');
  oval(ctx, -1, -13, 3, 3, gold ? '#91501d' : '#2e4660');
  polygon(ctx, [[-8,-35],[-2,-34],[-8,-13],[-14,-15]], '#dc2a46');
  oval(ctx, 0, -53, 17, 5, '#16243b');
  round(ctx, -11, -65, 22, 13, 3, gradient(ctx,-4,-64,18,'#54748f','#101d32'));
  round(ctx, -11, -57, 22, 3, 1, '#ba2640');
  oval(ctx, 8, -45, 2.4, 2.4, '#192c47');
  oval(ctx, 7.4, -45.7, .8, .8, '#fff');
  polygon(ctx, [[13,-44],[23,-42],[13,-39]], '#f78a26');
}

function toy(ctx, type) {
  const robot = type === 'robot';
  const gold = '#ffce57';
  const red = gradient(ctx, -6, -37, 39, '#ff8260', '#8d1634');
  round(ctx, -17, -10, 14, 11, 3, '#742138');
  round(ctx, 3, -10, 14, 11, 3, '#742138');
  round(ctx, -24, -38, 9, 23, 3, red);
  round(ctx, 15, -38, 9, 23, 3, red);
  round(ctx, -16, -42, 32, 33, 5, red);
  round(ctx, -12, -39, 24, 2, 1, '#ffbda5');
  for (const x of [-19,19]) oval(ctx,x,-35,4.5,3.3,gold);
  round(ctx, -14, -20, 28, 4, 1, robot ? gold : '#301e36');
  if (robot) {
    round(ctx, -15, -60, 30, 23, 4, '#793345');
    round(ctx, -12, -57, 24, 15, 3, '#cedded');
    for (const x of [-6, 6]) oval(ctx, x, -50, 3.5, 3, '#ff861c');
    for (const x of [-7,0,7]) round(ctx,x-1.2,-33,2.4,8,1,gold);
    round(ctx,-2,-66,4,8,1,'#80364a');
    oval(ctx,0,-67,4,3.5,gold);
    oval(ctx, 22, -31, 8, 7, gold);
    oval(ctx, 22, -31, 4, 3, '#904128');
  } else {
    round(ctx, -13, -55, 26, 17, 4, '#ffe0b0');
    for (const x of [-5, 5]) oval(ctx, x, -48, 2, 2, '#272440');
    round(ctx, -19, -70, 38, 16, 3, type === 'boss' ? '#b12338' : '#1b324e');
    round(ctx, -19, -57, 38, 4, 2, gold);
    round(ctx, -5, -42, 10, 3, 1, '#4f2335');
    for (const x of [-9,9]) oval(ctx,x,-27,2,2,gold);
    polygon(ctx, [[-11,-38],[-2,-23],[2,-23],[11,-38],[7,-38],[0,-28],[-7,-38]], '#fff4ec');
    if (type === 'boss') polygon(ctx, [[-19,-68],[-19,-78],[-7,-71],[0,-82],[7,-71],[19,-78],[19,-68]], gold);
  }
}

function sprite(paint) {
  const image = document.createElement('canvas');
  image.width = 152;
  image.height = 184;
  const ctx = image.getContext('2d');
  ctx.setTransform(2, 0, 0, 2, 76, 172);
  paint(ctx);
  return image;
}
const sprites = {
  snowman: sprite(ctx => snowman(ctx)), gold: sprite(ctx => snowman(ctx, true)),
  robot: sprite(ctx => toy(ctx, 'robot')), soldier: sprite(ctx => toy(ctx, 'soldier')),
  boss: sprite(ctx => toy(ctx, 'boss')),
};

const artwork = {};
function loadArtwork(name, file, isScenery = false, fallback = '') {
  const image = document.createElement('img');
  image.decoding = 'async';
  image.onload = () => {
    if (name.startsWith('scene-') && name !== 'scene-'+level) return;
    artwork[name] = image;
    if (!width) return;
    if (isScenery) paintBackdrop();
    if (phase !== 'playing') draw();
  };
  if (fallback) image.onerror = () => {
    image.onerror = null;
    image.src = fallback;
  };
  image.src = file;
}
function prepareScenery() {
  if (!sceneryRequested.has(world.art)) {
    sceneryRequested.add(world.art);
    if (world.art !== 'factory') loadArtwork(`boss-${world.art}`,`art/boss-${world.art}.webp`);
  }
  const key = 'scene-'+level;
  if (sceneryRequested.has(key)) return;
  // Retain only the displayed scene and use the browser's image cache on replay.
  for (const name of sceneryRequested) {
    if (name.startsWith('scene-')) {
      sceneryRequested.delete(name);
      delete artwork[name];
    }
  }
  sceneryRequested.add(key);
  loadArtwork(key,`art/scenes/${level}.webp`,true,`art/${world.art}.webp`);
}
prepareScenery();
for (const name of ['drum','train','jack','bear']) loadArtwork(name,`art/${name}.webp`);
loadArtwork('button', 'art/button.webp');
for (const name of Object.keys(sprites)) loadArtwork(name, `art/${name}.webp`);

function stamp(name, x, y, scale, tilt = 0, lift = 0) {
  oval(context, x + 4*scale, y + 2*scale, 26*scale, Math.max(1,7*scale), '#294d6922');
  oval(context, x, y, 17*scale, Math.max(1,4*scale), '#243d634a');
  const image = (name === 'boss' && artwork[`boss-${world.art}`]) || artwork[name];
  if (!image) {
    context.drawImage(sprites[name] || sprites.robot, x - 38 * scale, y - 86 * scale - lift, 76 * scale, 92 * scale);
    return;
  }
  const targetHeight = (name === 'boss' ? 91 : name === 'snowman' || name === 'gold' ? 76 : 77) * scale;
  const targetWidth = targetHeight * image.naturalWidth / image.naturalHeight;
  if (tilt) {
    context.save();
    context.translate(x,y-lift);
    context.rotate(tilt);
    context.drawImage(image,-targetWidth/2,-targetHeight,targetWidth,targetHeight);
    context.restore();
  } else {
    context.drawImage(image,x-targetWidth/2,y-targetHeight-lift,targetWidth,targetHeight);
  }
}

function roadEdge(x, front, back) {
  const points = [];
  if (front === 0) points.push([width/2+x*laneWidth*1.20, height]);
  for (let z = front; z < back; z += 4) points.push(project(x,z));
  points.push(project(x,back));
  return points;
}

function trackShape(ctx, left, right, front, back, color) {
  polygon(ctx,[...roadEdge(left,front,back), ...roadEdge(right,front,back).reverse()],color);
}

function paintFloor(ctx) {
  const chapter = Math.floor((level-1)/levelsPerWorld);
  const plan = floorPlans[(level-1)%levelsPerWorld];
  const [stone, trim] = plan.stone;
  const boundary = (side,z) => {
    const station = z/35;
    const section = Math.min(2,Math.floor(station));
    const factor = station-section;
    const edge = plan.edge[section]*(1-factor) + plan.edge[section+1]*factor;
    const offset = Math.sin(z/20 + chapter)*chapter*.013;
    // Swell the edges away from the playable lanes, leaving shots and steering predictable.
    const shoulder = Math.max(0,Math.sin(station*Math.PI+side*chapter*.7))*(.08+chapter*.02);
    return side*(edge+shoulder) + offset;
  };
  const outline = side => Array.from({length:22},(_,i) => {
    const z = i*5;
    return project(boundary(side,z),z);
  });
  const left = outline(-1), right = outline(1);
  left.unshift([width/2+boundary(-1,0)*laneWidth*1.13,height]);
  right.unshift([width/2+boundary(1,0)*laneWidth*1.13,height]);

  const ice = ctx.createLinearGradient(0,0,0,height);
  ice.addColorStop(0,stone+'20');
  ice.addColorStop(.48,stone+'72');
  ice.addColorStop(.72,stone+'88');
  ice.addColorStop(.89,world.accent+'2e');
  ice.addColorStop(1,stone+'b9');
  ctx.save();
  ctx.beginPath();
  [...left,...right.slice().reverse()].forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fillStyle = ice;
  ctx.fill();
  ctx.strokeStyle = trim+'a9';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();

  const cell = (x,z,w,d,color) =>
    polygon(ctx,[project(x,z),project(x+w,z),project(x+w,z+d),project(x,z+d)],color);
  const depth = plan.paving === 'planks' ? 2.6 : plan.paving === 'panels' ? 8 : 5.5;
  const tile = plan.paving === 'checker' ? .32 : .24;
  for (let row=0; row*depth<105; row++) {
    const z = row*depth;
    for (let column=0; column<12; column++) {
      const x = -1.36+column*tile+(plan.paving === 'bricks' && row%2 ? tile/2 : 0);
      if (plan.paving === 'diamonds' || plan.paving === 'mosaic') {
        if ((row+column)%2) continue;
        polygon(ctx,[project(x,z+depth/2),project(x+tile/2,z+depth),
          project(x+tile,z+depth/2),project(x+tile/2,z)],trim+'64');
      } else if (plan.paving === 'ice') {
        if ((row+column)%3) continue;
        polygon(ctx,[project(x,z),project(x+tile*.9,z+depth),project(x+tile,z+depth*.15)],trim+'35');
      } else if (plan.paving === 'rails') {
        if (column%4 === 0) cell(x,z,.038,depth,trim+'a0');
        if (row%2 === 0) cell(x,z,tile-.008,.42,trim+'66');
      } else {
        cell(x,z,tile-.012,depth-.18,(row+column)%2 ? trim+'34' : '#07132124');
      }
    }
  }
  for (let i=0; i<7; i++) {
    const y = playerY+(height-playerY)*i/7;
    ctx.fillStyle = i%2 ? trim+'18' : trim+'32';
    ctx.fillRect(0,y,width,plan.paving === 'planks' ? 3 : 1);
  }
  ctx.restore();

  for (const side of [-1,1]) {
    for (let z=8; z<105; z+=8) {
      const [x,y,perspective] = project(boundary(side,z),z);
      oval(ctx,x,y,4*perspective,2*perspective,trim+'a0');
      oval(ctx,x,y,1.7*perspective,1.35*perspective,'#fff8df');
    }
  }
}

function paintBackdrop() {
  const ctx = backdrop.getContext('2d', { alpha: false });
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sky = ctx.createLinearGradient(0,0,0,height);
  sky.addColorStop(0, '#101b43');
  sky.addColorStop(.55, '#21577c');
  sky.addColorStop(1, '#78a3c2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const scenery = artwork['scene-'+level];
  if (scenery) {
    ctx.drawImage(scenery,0,0,width,height);
    if (width > height*1.32) {
      const shade = ctx.createLinearGradient(0,0,width,0);
      shade.addColorStop(0,'#13294671');
      shade.addColorStop(.35,'#13294600');
      shade.addColorStop(.65,'#13294600');
      shade.addColorStop(1,'#13294671');
      ctx.fillStyle = shade;
      ctx.fillRect(0,0,width,height);
    }
  } else {
    const glow = ctx.createRadialGradient(width/2,height*.19,0,width/2,height*.19,width*.62);
    glow.addColorStop(0,world.accent+'7a');
    glow.addColorStop(1,world.accent+'00');
    ctx.fillStyle = glow;
    ctx.fillRect(0,0,width,height);
  }
  paintFloor(ctx);
  const giftStart = campaign[level-1].gifts - 3;
  trackShape(ctx,.47,1.02,giftStart,105,'#052a4f99');
  trackShape(ctx,.55,1.02,giftStart,105,world.accent+'45');
  for (let z = 15; z < 91; z += 13) {
    for (const side of [-1,1]) {
      const [x,y,s] = project(side*.88,z);
      const size = scaleAt(s);
      oval(ctx,x-side*12*size,y+8*size,18*size,4*size,'#ffd58d42');
    }
  }
  for (let z = 12; z < 98; z += 10.5) {
    for (const side of [-1,1]) {
      const [x,y,s] = project(side*1.09,z);
      const size = scaleAt(s);
      round(ctx,x-4*size,y-21*size,8*size,23*size,2*size,'#ad3349');
      round(ctx,x-4*size,y-10*size,8*size,4*size,1*size,'#fff2e9');
      oval(ctx,x,y-22*size,10*size,8*size,'#ffdf8660');
      oval(ctx,x,y-22*size,4.5*size,4.5*size,'#fff2b5');
    }
  }
  for (let z = giftStart; z < 105; z += 3) {
    const [x,y,s] = project(.48,z);
    round(ctx,x-3*s,y-3*s,6*s,5*s,1*s,'#f9fdff');
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  ratio = Math.min(devicePixelRatio || 1, 1.65, Math.sqrt(1_500_000 / (width * height)));
  laneWidth = Math.min(width * .49, height * .45);
  playerY = height * .69;
  canvas.width = backdrop.width = Math.round(width * ratio);
  canvas.height = backdrop.height = Math.round(height * ratio);
  context.setTransform(ratio,0,0,ratio,0,0);
  paintBackdrop();
  draw();
}

function scaleAt(s) { return s * clamp(Math.min(width / 480, height / 680), .44, 1.3); }

function gift(x, y, s, label, warm = false) {
  oval(context,x,y,25*s,6*s,warm ? '#fa83b66e' : '#7bffe373');
  round(context,x-21*s,y-33*s,42*s,34*s,4*s,warm ? '#a3275f' : '#087970');
  round(context,x-21*s,y-34*s,42*s,9*s,3*s,warm ? '#db6181' : '#44bfce');
  round(context,x-3*s,y-34*s,6*s,9*s,1*s,'#defcff');
  oval(context,x-5*s,y-36*s,5*s,2.5*s,'#b4f0ee');
  oval(context,x+5*s,y-36*s,5*s,2.5*s,'#b4f0ee');
  round(context,x+16*s,y-24*s,3*s,20*s,1*s,'#081b4040');
  context.font = `900 ${Math.max(8, 18*s)}px system-ui`;
  context.textAlign = 'center';
  context.fillStyle = '#fff';
  context.fillText(label,x,y-7*s);
}

function chocolate(x,y,s) {
  if (artwork.button) {
    context.drawImage(artwork.button,x-8*s,y-7*s,16*s,13*s);
    return;
  }
  oval(context,x,y,7*s,5.4*s,'#59281b');
  oval(context,x,y-1.3*s,7*s,4.7*s,'#a36236');
  oval(context,x-2.2*s,y-1.5*s,1*s,1*s,'#3d241e');
  oval(context,x+2.2*s,y-1.5*s,1*s,1*s,'#3d241e');
}

function lightRing(x,y,r,color) {
  context.beginPath();
  context.ellipse(x,y,r,r*.26,0,0,Math.PI*2);
  context.lineWidth = Math.max(1,r*.032);
  context.strokeStyle = color;
  context.stroke();
}

function drawWeather(time) {
  for (let i = 0; i < 32; i++) {
    const near = i % 4 === 0;
    const y = (i*97 + time*(near ? 57 : 21)) % height;
    const x = (i*173 + time*(near ? 40 : 12) + Math.sin(time+i)*8) % width;
    const radius = near ? 2.5 : 1 + i%3*.35;
    oval(context,x,y,radius,radius,near ? '#e6f6ff70' : '#edfaff9c');
  }
}

function draw() {
  if (!player || !width) return;
  context.drawImage(backdrop,0,0,width,height);
  const moving = !reduced && (phase === 'playing' || phase === 'ready');
  if (moving) drawWeather(visualTime);
  for (let i = gifts.length - 1; i >= 0; i--) {
    const item = gifts[i];
    if (item.used) continue;
    const [x,y,s] = project(item.x,item.z);
    gift(x,y,scaleAt(s) * 1.28,'+1',i % 2 === 1);
  }
  for (const enemy of enemies) {
    const [x,y,s] = project(enemy.x,enemy.z);
    const size = scaleAt(s) * (enemy.type === 'boss' ? 2.6 : 1.06*toyTypes[enemy.type].size);
    const stride = visualTime * (enemy.type === 'boss' ? 5 : 11) + enemy.seed*.67;
    const lift = enemy.type === 'jack' ? 13 : enemy.type === 'train' ? 2 : 6;
    const bounce = moving ? Math.abs(Math.sin(stride))*lift*size : 0;
    const tilt = moving ? Math.sin(stride)*(enemy.type === 'train' ? .035 : .095) : 0;
    if (enemy.type === 'boss') {
      oval(context,x,y,34*size,9*size,'#ff536c5f');
      oval(context,x,y,25*size,6*size,'#ffa66968');
      lightRing(x,y,(41+Math.sin(reduced ? 0 : visualTime*4)*5)*size,'#ffcb7bd8');
      const arrival = clock-bossEntrance;
      if (!reduced && arrival < 1.1) {
        const radius = (36+arrival*85)*size;
        lightRing(x,y,radius,'#ffcf91bd');
        lightRing(x,y,radius*.72,'#ff726a91');
      }
    }
    stamp(enemy.type,x,y,size,tilt,bounce);
    if (enemy.flash > clock && !reduced) {
      oval(context,x,y-28*size,19*size,14*size,'#fff1bf88');
    }
    if (enemy.type === 'boss') {
      const barWidth = Math.max(56, 68 * size);
      const barY = y - 90*size - 14;
      round(context,x-barWidth/2,barY,barWidth,13,5,'#562637');
      round(context,x-barWidth/2,barY,barWidth*Math.max(0,enemy.hp/enemy.max),13,4,'#cc2243');
      context.fillStyle = '#fff';
      context.font = '900 10px system-ui';
      context.textAlign = 'center';
      context.fillText(enemy.hp,x,barY+10);
    }
  }
  for (const upgrade of upgrades) {
    if (upgrade.hp <= 0) continue;
    const [x,y,s] = project(upgrade.x,upgrade.z);
    const unit = scaleAt(s)*1.10;
    oval(context,x,y-38*unit,49*unit,24*unit,upgrade.kind === 'companion' ? '#ffd37462' : '#8bffdd70');
    oval(context,x,y+2*unit,43*unit,8*unit,'#0a223e64');
    round(context,x-34*unit,y-31*unit,68*unit,32*unit,4*unit,'#23486f');
    round(context,x-34*unit,y-37*unit,68*unit,10*unit,4*unit,'#f9fdff');
    if (upgrade.kind === 'companion') stamp('gold',x,y-37*unit,unit*.83);
    else {
      chocolate(x-11*unit,y-50*unit,1.55*unit);
      chocolate(x+13*unit,y-57*unit,1.55*unit);
    }
    context.fillStyle = '#fff';
    context.textAlign = 'center';
    context.font = `900 ${Math.max(13,22*unit)}px system-ui`;
    context.fillText(upgrade.hp,x,y-9*unit);
  }
  for (const shot of shots) {
    const [x,y,s] = project(shot.x,shot.z);
    const radius = scaleAt(s)*1.16;
    if (!reduced) {
      polygon(context,[[x-3*radius,y-14*radius],[x+3*radius,y-14*radius],[x+radius,y+16*radius],[x-radius,y+16*radius]],'#ffd47796');
      oval(context,x,y-12*radius,8*radius,7*radius,'#ffe9b54a');
    }
    chocolate(x,y-14*radius,radius);
  }
  for (const p of particles) {
    const [x,y] = project(p.x,p.z);
    const age = 1-p.life/p.duration;
    const yNow = y - p.lift * Math.sin(age * Math.PI * .76);
    const radius = p.size * (1-age*.8);
    context.globalAlpha = 1-age;
    if (p.ring) {
      lightRing(x,yNow,6+age*p.size,p.color);
    } else {
      const shard = age*p.spin;
      polygon(context,[[x+Math.cos(shard)*radius,yNow+Math.sin(shard)*radius],
        [x+Math.cos(shard+2.1)*radius,yNow+Math.sin(shard+2.1)*radius],
        [x+Math.cos(shard+4.2)*radius,yNow+Math.sin(shard+4.2)*radius]],p.color);
    }
    context.globalAlpha = 1;
  }
  for (let i = 0; i < player.helpers; i++) {
    const [x,y,s] = project(clamp(player.x + helperOffset(i),-.98,.98),0);
    stamp('snowman',x,y+12+Math.floor(i/4)*8,scaleAt(s)*.48);
  }
  const [x,y,s] = project(player.x,0);
  const heroScale = scaleAt(s)*1.25;
  oval(context,x,y+2*heroScale,33*heroScale,9*heroScale,'#a3f6ff65');
  oval(context,x,y+2*heroScale,25*heroScale,6*heroScale,'#b4f8ff5c');
  if (phase === 'playing' && !reduced) {
    const glide = player.target-player.x;
    if (Math.abs(glide) > .015) {
      oval(context,x-Math.sign(glide)*18*heroScale,y+3*heroScale,27*heroScale,4*heroScale,'#f5fbffaa');
    }
  }
  const lean = moving ? clamp((player.target-player.x)*.56,-.22,.22) : 0;
  const recoil = moving && phase === 'playing' ? Math.max(0,shotTimer-.14)*24 : 0;
  stamp('snowman',x,y,heroScale,lean,recoil + (moving ? Math.sin(visualTime*3)*1.7+1.7 : 0));
  if (phase === 'ready' || (phase === 'playing' && hintTimer > 0)) {
    for (const side of [-1,1]) {
      const arrowX = x + side * (26 + 26 * heroScale);
      polygon(context,[[arrowX-7*side,y-18],[arrowX+3*side,y-18],[arrowX+3*side,y-23],
        [arrowX+13*side,y-14],[arrowX+3*side,y-5],[arrowX+3*side,y-10],[arrowX-7*side,y-10]], '#f6fcffe8');
    }
  }
}

function helperOffset(index) {
  return (index % 2 === 0 ? -1 : 1) * (.12 + Math.floor(index / 2) * .08);
}
function feedback(pitch, duration = .08, flavor = 'triangle') {
  if (mute || !audio || audio.state !== 'running') return;
  const t = audio.currentTime;
  const note = audio.createOscillator(), volume = audio.createGain();
  note.type = flavor;
  note.frequency.setValueAtTime(pitch,t);
  note.frequency.exponentialRampToValueAtTime(pitch * .65,t+duration);
  volume.gain.setValueAtTime(.045,t);
  volume.gain.exponentialRampToValueAtTime(.001,t+duration);
  note.connect(volume).connect(audio.destination);
  note.start(t);
  note.stop(t+duration);
}
function enableAudio() {
  if (mute) return;
  try {
    audio ||= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch {}
}
function paintHealth() {
  get('health').replaceChildren(...Array.from({ length:5 },(_,i) => {
    const pip = document.createElement('i');
    pip.classList.toggle('lost', i >= health);
    return pip;
  }));
  get('health').setAttribute('aria-label',`${health} snowballs remaining`);
}
function message(text, seconds = 2) {
  get('toast').textContent = text;
  messageUntil = clock + seconds;
}
function recordKey(key) {
  return level === 1 ? key : `${key}-level-${level}`;
}
function loadRecords() {
  best = read(recordKey('snowfight-best'),0);
  bestStreak = read(recordKey('snowfight-best-streak'),0);
  fastest = read(recordKey('snowfight-fastest'),0);
}
function refreshHud() {
  get('chapter').textContent = `LEVEL ${level} / ${totalLevels}`;
  get('wave').textContent = `WAVE ${waveIndex + 1} / ${stages.length}`;
  get('score').textContent = `${score.toLocaleString('en-GB')} pts`;
  paintHealth();
}
function loadWave(index) {
  waveIndex = index;
  between = -1;
  const stage = stages[index];
  const local = (level-1)%levelsPerWorld;
  const chapter = Math.floor((level-1)/levelsPerWorld);
  const design = campaign[level-1];
  const sequence = layouts[design.waves[index]];
  const rows = stage.rows + Math.floor((local+chapter)/5);
  const roster = toyLineups[chapter];
  const featured = roster[local%roster.length];
  const support = roster[(local+1+(local>=4 ? 1 : 0))%roster.length];
  enemies = [];
  if (index === stages.length - 1) {
    bossEntrance = clock;
    message(`The ${world.boss}`,1.7);
    feedback(175,.36);
    const hp = 78 + chapter*9 + local*3;
    const base = (sequence[0] === 'left' ? -.32 : sequence[0] === 'right' ? .20 : -.14);
    enemies.push({ x:base, base, z:86+(local%3)*3, hp, max:hp, type:'boss', seed:1, spread:.24 + chapter*.025 });
  }
  for (let row = rows - 1; row >= 0; row--) {
    const rank = ranks[sequence[row%sequence.length]];
    for (let col = 0; col < rank.length; col++) {
      if (rank[col] === '0') continue;
      const roll = (row*3 + col + index*2 + local) % 11;
      const type = roll < (local === 0 ? 5 : 6) ? featured : roll < 9 ? support
        : roster[(index+local+row)%roster.length];
      const toy = toyTypes[type];
      const x = -.70 + col*.192 + (row % 2 ? .035 : -.023);
      const z = 39 + row*(design.gap + index*.08) + (col%2)*.75;
      const hp = stage.hp + (type === 'soldier' && index >= 2 ? 1 : 0) + toy.extra;
      enemies.push({ x, base:x, z, hp, type, speed:toy.speed, seed:row*7+col, spread:(.035 + index*.013 + chapter*.009)*toy.sway });
    }
  }
  refreshHud();
}
function selectLevel(next, phaseName = 'ready') {
  level = clamp(next,1,unlocked);
  world = worlds[Math.floor((level-1)/levelsPerWorld)];
  prepareScenery();
  loadRecords();
  reset(phaseName);
  if (width) { paintBackdrop(); draw(); }
}

function reset(phaseName = 'playing') {
  health = 5;
  score = 0;
  clock = 0;
  bossEntrance = -2;
  hintTimer = 5;
  shotTimer = 0;
  messageUntil = 0;
  streak = peakStreak = streakUntil = 0;
  get('streak').hidden = true;
  player = { x:0, target:0, helpers:0, double:false, guard:0 };
  const design = campaign[level-1];
  upgrades = [
    { kind:'companion', x:-.82, z:design.companion, hp:16 },
    { kind:'double', x:.78, z:design.double, hp:6 },
  ];
  const giftGap = (103-design.gifts)/17;
  gifts = Array.from({length:18}, (_,i) => ({ x:.77+(i%2)*.04,z:design.gifts+i*giftGap,used:false }));
  shots = [];
  particles = [];
  get('toast').textContent = '';
  loadWave(0);
  setPhase(phaseName);
}

function setPhase(next) {
  phase = next;
  keys.clear();
  pointerId = null;
  get('panel').hidden = next === 'playing';
  get('main-card').hidden = false;
  get('level-picker').hidden = true;
  get('hint').hidden = next !== 'playing' || hintTimer <= 0;
  get('pause').disabled = next !== 'playing' && next !== 'paused';
  get('pause').setAttribute('aria-label',next === 'paused' ? 'Resume game' : 'Pause game');
  get('again').hidden = next !== 'paused' && next !== 'won';
  get('again').textContent = next === 'won' ? 'Replay level' : 'Restart level';
  if (next === 'playing') return;
  if (next === 'won' && (!fastest || clock < fastest)) {
    fastest = clock;
    write(recordKey('snowfight-fastest'),fastest);
  }
  if (next === 'won' || next === 'lost') {
    if (peakStreak > bestStreak) {
      bestStreak = peakStreak;
      write(recordKey('snowfight-best-streak'),bestStreak);
    }
    best = Math.max(best, score);
    write(recordKey('snowfight-best'),best);
  }
  if (next === 'won' && level === unlocked && level < totalLevels) {
    unlocked += 1;
    write('snowfight-unlocked',unlocked);
  }
  const form = campaign[level-1];
  get('location').textContent = `${world.name} · Level ${level}`;
  const menu = {
    ready:['Snowfight',level === 1 ? 'Slide, fling chocolate buttons, and stop the toy army.' : form.name,'Play'],
    paused:['Paused','Drag to slide. On a keyboard, use ← / → or A / D.','Resume'],
    won:[level === totalLevels ? 'Campaign cleared' : 'Level cleared',
      `The ${world.boss} is down. ${score.toLocaleString('en-GB')} points in ${clock.toFixed(1)}s.`,
      level < totalLevels ? 'Next level' : 'Play again'],
    lost:['Overrun',`The toys broke through on wave ${waveIndex + 1}. You scored ${score.toLocaleString('en-GB')} points.`,'Retry'],
  };
  const [title, details, action] = menu[next];
  get('title').textContent = title;
  get('details').textContent = details;
  get('action').textContent = action;
  const records = [];
  if (best) records.push(`Best ${best.toLocaleString('en-GB')} pts`);
  if (bestStreak) records.push(`Best streak ${bestStreak}`);
  if (fastest) records.push(`Fastest ${fastest.toFixed(1)}s`);
  get('best').textContent = records.join(' · ');
}

function fire(x, drift, damage) {
  if (shots.length < 150) shots.push({ x:clamp(x,-.98,.98), z:1.5, drift, damage });
}
function burst(x,z,color,large = false) {
  if (reduced || particles.length >= 100) return;
  const count = Math.min(large ? 13 : 6, 99-particles.length);
  const duration = large ? .66 : .40;
  for (let i = 0; i < count; i++) {
    const direction = Math.sin(i*2.399);
    particles.push({ x,z,life:duration,duration,drift:direction*(large ? 1.8 : .9),
      lift:12+i%5*(large ? 12 : 5),spin:i%2 ? 6 : -7,size:3+i%4*(large ? 2 : 1),
      color:i%3 === 0 ? '#fff2bb' : color });
  }
  particles.push({ x,z,life:.35,duration:.35,drift:0,lift:0,size:large ? 66 : 28,
    color:'#ffe7aa',ring:true });
}
function countStreak() {
  streak += 1;
  streakUntil = clock + 2.2;
  peakStreak = Math.max(peakStreak,streak);
  if (streak < 3) return;
  const badge = get('streak');
  badge.hidden = false;
  badge.textContent = `${streak} TOYS IN A ROW`;
  if (streak % 10 === 0) feedback(610 + Math.min(streak,40)*8,.13);
}

function clearStreak() {
  streak = streakUntil = 0;
  get('streak').hidden = true;
}

function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i], oldZ = shot.z;
    shot.z += dt * 52;
    shot.x += dt * shot.drift;
    const touches = (target, range) =>
      target.z >= oldZ - 1.5 && target.z <= shot.z + 1.2 && Math.abs(target.x - shot.x) < range;
    const upgrade = upgrades.find(item => item.hp > 0 && touches(item,.11));
    let hit = false;
    if (upgrade) {
      upgrade.hp -= shot.damage;
      burst(upgrade.x,upgrade.z,'#ffdf89');
      hit = true;
      if (upgrade.hp <= 0) {
        if (upgrade.kind === 'double') player.double = true;
        else player.helpers = Math.min(6,player.helpers + 1);
        message(upgrade.kind === 'double' ? 'Double shot unlocked' : 'Snowman helper joined');
        feedback(720,.16);
      }
    }
    if (!hit) {
      const gift = gifts.find(item => !item.used && touches(item,.075));
      if (gift) {
        gift.used = true;
        hit = true;
        const gainsHelper = player.helpers < 6;
        player.helpers = Math.min(6,player.helpers + 1);
        score += 35;
        burst(gift.x,gift.z,'#fdfdff');
        refreshHud();
        message(gainsHelper ? '+1 snowman helper' : 'Gift bonus +35',1);
        feedback(640,.1);
      }
    }
    if (!hit) {
      for (let target = enemies.length - 1; target >= 0; target--) {
        const enemy = enemies[target];
        if (!touches(enemy,enemy.type === 'boss' ? .24 : .115)) continue;
        enemy.hp -= shot.damage;
        enemy.flash = clock + .08;
        hit = true;
        if (enemy.hp <= 0) {
          enemies.splice(target,1);
          countStreak();
          score += enemy.type === 'boss' ? 600 : 10;
          get('score').textContent = `${score.toLocaleString('en-GB')} pts`;
          burst(enemy.x,enemy.z,toyTypes[enemy.type]?.color ?? '#f63c62',enemy.type === 'boss');
        }
        break;
      }
    }
    if (hit || shot.z > 105 || Math.abs(shot.x) > 1.13) shots.splice(i,1);
  }
}

function step(dt) {
  clock += dt;
  if (streakUntil && clock > streakUntil) clearStreak();
  hintTimer -= dt;
  if (hintTimer <= 0) get('hint').hidden = true;
  if (messageUntil && clock > messageUntil) { messageUntil = 0; get('toast').textContent = ''; }
  const left = keys.has('arrowleft') || keys.has('a');
  const right = keys.has('arrowright') || keys.has('d');
  player.target = clamp(player.target + (Number(right)-Number(left))*dt*1.85,-.95,.95);
  player.x += (player.target-player.x)*Math.min(1,dt*28);
  shotTimer -= dt;
  if (shotTimer <= 0) {
    shotTimer += player.double ? .18 : .22;
    if (player.double) {
      fire(player.x-.042,-.018,2);
      fire(player.x+.042,.018,2);
    } else {
      fire(player.x,0,2);
    }
    if (Math.floor(clock / .18) % 2 === 0) {
      for (let i = 0; i < player.helpers; i++) fire(player.x+helperOffset(i)*.70,0,1);
    }
  }
  const stage = stages[waveIndex];
  player.guard -= dt;
  const chapterSpeed = Math.floor((level-1)/levelsPerWorld)*.22;
  const localSpeed = ((level-1)%levelsPerWorld)*.055;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const boss = enemy.type === 'boss';
    enemy.z -= (boss ? 3.2 + chapterSpeed*.55 : (stage.speed + chapterSpeed + localSpeed)*enemy.speed) * dt;
    enemy.x = enemy.base + Math.sin(clock*(boss ? .85 : .6)+enemy.seed)*enemy.spread;
    if (enemy.z > 1) continue;
    enemies.splice(i,1);
    if (player.guard > 0 && !boss) continue;
    player.guard = 1.2;
    clearStreak();
    health = Math.max(0,health - (boss ? 5 : 1));
    paintHealth();
    feedback(105,.25,'sawtooth');
    message('Toys broke through',.75);
    if (health === 0) { setPhase('lost'); return; }
  }
  // Faster toys can overtake a rank. Resolve nearer targets first and draw them on top.
  enemies.sort((a,b) => b.z-a.z);
  updateShots(dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.drift*dt;
    if (p.life <= 0) particles.splice(i,1);
  }
  if (enemies.length) return;
  if (waveIndex === stages.length - 1) {
    score += health*100;
    refreshHud();
    clearStreak();
    setPhase('won');
    feedback(880,.4);
  } else if (between < 0) {
    between = clock + 1.4;
    message('Wave cleared',1.3);
    feedback(520,.13);
  } else if (clock >= between) {
    loadWave(waveIndex+1);
  }
}

function frame(now) {
  const dt = Math.min((now-lastTime)/1000,.044);
  if (phase === 'playing') {
    visualTime += dt;
    step(dt);
    draw();
  } else if (phase === 'ready' && !reduced) {
    visualTime = now/1000;
    if (now-readyFrame >= 32) {
      readyFrame = now;
      draw();
    }
  }
  lastTime = now;
  requestAnimationFrame(frame);
}

function togglePause() {
  if (phase === 'playing') { setPhase('paused'); get('action').focus(); }
  else if (phase === 'paused') { setPhase('playing'); get('pause').focus(); }
}
get('action').addEventListener('click',() => {
  enableAudio();
  if (phase === 'paused') setPhase('playing');
  else if (phase === 'won' && level < totalLevels) selectLevel(level+1,'playing');
  else reset();
  get('pause').focus({ preventScroll:true });
});
get('again').addEventListener('click',() => { reset(); get('pause').focus(); });
get('pause').addEventListener('click',togglePause);
get('levels').addEventListener('click',() => {
  const grid = get('level-grid');
  grid.replaceChildren();
  worlds.forEach((area,chapter) => {
    const heading = document.createElement('h3');
    heading.textContent = area.name;
    const group = document.createElement('div');
    for (let index = 0; index < levelsPerWorld; index++) {
      const number = chapter*levelsPerWorld+index+1;
      const formation = campaign[number-1];
      const button = document.createElement('button');
      button.textContent = number;
      button.disabled = number > unlocked;
      button.classList.toggle('current-level',number === level);
      button.setAttribute('aria-label',`Level ${number}, ${formation.name}${button.disabled ? ', locked' : ''}`);
      if (number === level) button.setAttribute('aria-current','true');
      button.addEventListener('click',() => {
        if (phase === 'paused' && number === level) {
          get('level-picker').hidden = true;
          get('main-card').hidden = false;
        } else selectLevel(number);
        get('action').focus();
      });
      group.appendChild(button);
    }
    grid.append(heading,group);
  });
  get('level-picker').hidden = false;
  get('main-card').hidden = true;
  get('close-levels').focus();
});
get('close-levels').addEventListener('click',() => {
  get('level-picker').hidden = true;
  get('main-card').hidden = false;
  get('levels').focus();
});
function soundButton() {
  get('mute').setAttribute('aria-pressed',String(mute));
  get('mute').setAttribute('aria-label',mute ? 'Unmute sound' : 'Mute sound');
  get('mute').textContent = mute ? '♪̸' : '♫';
}
get('mute').addEventListener('click',() => {
  mute = !mute;
  write('snowfight-muted', mute);
  soundButton();
  enableAudio();
  feedback(420);
});
get('share')?.addEventListener('click', async () => {
  const url = document.querySelector('link[rel=canonical]').href;
  try {
    if (navigator.share) await navigator.share({ title:'Snowfight', url });
    else await navigator.clipboard.writeText(url);
    if (!navigator.share) message('Game link copied');
  } catch (error) {
    if (error.name !== 'AbortError') message('Share this page using your browser menu');
  }
});
canvas.addEventListener('pointerdown',event => {
  if (phase !== 'playing' || pointerId != null || event.button !== 0) return;
  pointerId = event.pointerId;
  pointerX = event.clientX;
  canvas.setPointerCapture(pointerId);
});
canvas.addEventListener('pointermove',event => {
  if (event.pointerId !== pointerId) return;
  player.target = clamp(player.target + (event.clientX-pointerX)/laneWidth,-.95,.95);
  pointerX = event.clientX;
});
for (const name of ['pointerup','pointercancel','lostpointercapture']) {
  canvas.addEventListener(name,event => { if (event.pointerId === pointerId) pointerId = null; });
}
window.addEventListener('keydown',event => {
  const key = event.key.toLowerCase();
  if (key === 'escape' && !event.repeat) {
    if (!get('level-picker').hidden) get('close-levels').click();
    else togglePause();
  }
  if (phase === 'playing' && ['arrowleft','arrowright','a','d'].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});
window.addEventListener('keyup',event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur',() => { keys.clear(); pointerId = null; });
document.addEventListener('visibilitychange',() => {
  if (document.hidden && phase === 'playing') setPhase('paused');
});
new ResizeObserver(resize).observe(canvas);
soundButton();
selectLevel(level);
resize();
requestAnimationFrame(frame);

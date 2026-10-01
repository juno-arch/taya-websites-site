# Turns out/net.json (from grow.py) into the living mycelium behind every page:
#   ../mycelium.svg   the network: one small file every page shares (cached after the first page). mycelium.js
#                     fetches it and lays it into the soil; without JavaScript (or with reduced motion) soil.css
#                     simply shows the same file, still, as the soil's background
#   ../soil.css       the part between the "generated" markers: the traveling lights' routes (keyframes)
#
#   python3 _mycelium/grow.py && python3 _mycelium/build.py      (both seeded, so the same network every time)
#
# How the grow-in stays cheap: threads that start growing in the same instant and look alike share one <path>
# (one subpath each). A dash pattern restarts at every subpath, so animating that one path's stroke-dashoffset
# grows all of its threads from their own starting points at the same speed. About 300 animated paths for the
# whole canvas; a phone shows (and animates) only the ones in its view (the rest are class "d", for wider screens).
#
# How it stays readable: every thread is an opaque color inside one group that's see-through as a whole, so
# where threads cross they never add up. The brightest thread is bone at 23% over the soil (#413f3a), a light's
# heart is rgb(90, 63, 23); the dimmest words on the soil (--ink-soft #b9b3a7) need the soil behind them to stay
# under a luminance of .062, and the brightest of these is .058 (4.67 to 1). Change a color here, check the words.
import json, math, os, random, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out')
random.seed(11)

if not os.path.exists(os.path.join(OUT, 'net.json')):
    raise SystemExit('run python3 _mycelium/grow.py first')
d = json.load(open(os.path.join(OUT, 'net.json')))
W, H, DS = d['W'], d['H'], d['DS']
HY = d['hyphae']
MAXT = max(max(h['ticks']) for h in HY)
# where the lights may travel for phones (what a 390 x 844 phone sees of the canvas, which sits centred)
PX0, PY0, PX1, PY1 = d['phone']
# which threads a phone draws: what any phone up to 440 wide and about 960 tall (with the browser's bars
# tucked away) can see of the canvas, plus a little margin. Everything else is class "d" (wider screens only)
ZX0, ZY0, ZX1, ZY1 = 740, 120, 1180, 1080
PM = 24

# ---- look ----
BONE = (236, 227, 211)
SOIL = (14, 14, 12)
OPACITY = 0.23                                          # the whole network's opacity over the soil
ZF = [0.46, 0.72, 1.0]                                  # depth: far threads dimmer (deeper in the soil)
ZW = [0.85, 1.0, 1.12]
WC = [0.55, 0.8, 1.15, 1.6]                             # width classes, px

def wclass(load):
    w = 0.5 * load ** 0.21
    return 0 if w < 0.66 else 1 if w < 0.95 else 2 if w < 1.35 else 3

def look_color(z, wc):
    f = ZF[z] * (0.7 + 0.3 * wc / 3)
    return tuple(round(SOIL[i] + (BONE[i] - SOIL[i]) * f) for i in range(3))

# ---- time: sim ticks -> seconds after the grow starts ----
T0, T1, P = 0.25, 8.2, 0.78
def t_of(tick): return T0 + (T1 - T0) * (tick / MAXT) ** P
def v_at(tick):  # fastest tips' speed (px/s) at this tick
    u = max(tick, 1) / MAXT
    dtdtick = (T1 - T0) * P * u ** (P - 1) / MAXT
    return DS / dtdtick
BIN = 0.12

# ---- geometry ----
def rdp(p, eps):
    """Ramer-Douglas-Peucker: keep only the points the curve needs (within eps px)"""
    if len(p) < 3: return list(p)
    keep = [False] * len(p); keep[0] = keep[-1] = True
    stack = [(0, len(p) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = p[a], p[b]
        dx, dy = bx - ax, by - ay; n = math.hypot(dx, dy) or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            dd = abs((p[i][0] - ax) * dy - (p[i][1] - ay) * dx) / n
            if dd > best: best, bi = dd, i
        if best > eps or (b - a) * 3 > 42:   # also never let a stretch get too long
            m = bi if best > eps else (a + b) // 2
            keep[m] = True
            stack += [(a, m), (m, b)]
    return [q for q, k in zip(p, keep) if k]

def sub(pts, i0, i1): return rdp(pts[i0:i1 + 1], 0.7)
def arclen(p): return sum(math.dist(p[i], p[i + 1]) for i in range(len(p) - 1))

def fmt(v):
    s = str(int(round(v)))
    return '0' if s in ('-0', '') else s

def nums(vals):
    out = ''
    for v in vals:
        s = fmt(v)
        if out and not s.startswith('-'): out += ' '
        out += s
    return out

def _rnd(q): return (round(q[0]), round(q[1]))

def cr_path(p):
    """Catmull-Rom through the points as cubic Beziers, relative, with S for every segment after the first.
    Written in half pixels (the viewBox is twice the canvas), rounded on the absolute grid so nothing drifts."""
    p = [(x * 2, y * 2) for x, y in p]
    if len(p) == 2:
        a, c = _rnd(p[0]), _rnd(p[1])
        return 'M' + nums(a) + 'l' + nums((c[0] - a[0], c[1] - a[1]))
    s = 'M' + nums(_rnd(p[0]))
    ext = [p[0]] + p + [p[-1]]
    for i in range(1, len(ext) - 2):
        a, b, c, e = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6)
        c2 = (c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6)
        B, C1, C2, C = _rnd(b), _rnd(c1), _rnd(c2), _rnd(c)
        if i == 1:
            s += 'c' + nums((C1[0] - B[0], C1[1] - B[1], C2[0] - B[0], C2[1] - B[1], C[0] - B[0], C[1] - B[1]))
        else:
            s += 's' + nums((C2[0] - B[0], C2[1] - B[1], C[0] - B[0], C[1] - B[1]))
    return s

def cr_sample(p, step=6.0):
    """points along the same Catmull-Rom curve, about every `step` px (for the lights' routes)"""
    if len(p) < 2: return list(p)
    ext = [p[0]] + p + [p[-1]]; out = [p[0]]
    for i in range(1, len(ext) - 2):
        a, b, c, e = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6)
        c2 = (c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6)
        n = max(1, int(math.dist(b, c) / 1.5))
        for j in range(1, n + 1):
            t = j / n; m = 1 - t
            out.append((m ** 3 * b[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t ** 3 * c[0],
                        m ** 3 * b[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t ** 3 * c[1]))
    res = [out[0]]; acc = 0.0
    for i in range(1, len(out)):
        acc += math.dist(out[i - 1], out[i])
        if acc >= step: res.append(out[i]); acc = 0.0
    if res[-1] != out[-1]: res.append(out[-1])
    return res

def in_phone(pts):
    return any(ZX0 - PM <= x <= ZX1 + PM and ZY0 - PM <= y <= ZY1 + PM for x, y in pts)

# ---- runs: each hypha split where its width class changes (it tapers after each branch it feeds) ----
runs = []
for h in HY:
    pts = [tuple(p) for p in h['pts']]
    if len(pts) < 2: continue
    if h['curly']:
        cls = [1 if h['parent'] is None else 0] * len(pts)   # the knots' tangles a touch heavier than the fuzz
    else:
        cls = [wclass(l) for l in h['load']]
    i0 = 0
    for i in range(1, len(pts)):
        if i == len(pts) - 1 or cls[i] != cls[i0]:
            if i - i0 >= 1:
                runs.append({'z': h['z'], 'wc': cls[i0], 'pts': sub(pts, i0, i), 't0': h['ticks'][i0]})
            i0 = i

# ---- group into animated paths ----
groups = defaultdict(list)
for r in runs:
    zone = 'p' if in_phone(r['pts']) else 'd'
    b = math.ceil(t_of(r['t0']) / BIN)
    groups[(r['z'], r['wc'], zone, b)].append(r)

els = []
for (z, wc, zone, b), rs in groups.items():
    L = max(arclen(r['pts']) for r in rs)
    tk = max(r['t0'] for r in rs)
    dur = max(0.15, L / (v_at(tk) * 1.05))
    els.append({'z': z, 'wc': wc, 'zone': zone, 'delay': b * BIN, 'dur': dur, 'L': L,
                'd': ''.join(cr_path(r['pts']) for r in rs)})
els.sort(key=lambda e: (e['z'], e['wc'], e['delay']))
END = max(e['delay'] + e['dur'] for e in els)
print(len(runs), 'runs,', len(els), 'paths;', sum(1 for e in els if e['zone'] == 'p'), 'on phones;', f'grow ends {END:.2f}s')

# ---- knots: a faint glow at each colony's heart, appearing as it starts ----
knots = []
for (cx, cy, t0, n) in d['colonies']:
    near = ZX0 - 60 <= cx <= ZX1 + 60 and ZY0 - 60 <= cy <= ZY1 + 60
    knots.append((cx, cy, t_of(t0), 'p' if near else 'd'))

# ---- traveling lights: routes along real threads, from a tip back toward its colony (or out again) ----
byid = {h['id']: h for h in HY}
def route_from(hid, idx):
    pts = []
    while hid is not None:
        h = byid[hid]
        seg = [tuple(p) for p in h['pts'][:idx + 1]]
        pts = seg[::-1] if not pts else pts + seg[::-1][1:]
        hid, idx = h['parent'], h['pidx']
    return pts

def smooth_route(pts):
    k = [pts[i] for i in range(0, len(pts), 3)]
    if k[-1] != pts[-1]: k.append(pts[-1])
    return cr_sample(k, 6.0)

def zone_ok(pts, rect):
    x0, y0, x1, y1 = rect
    return all(x0 <= x <= x1 and y0 <= y <= y1 for x, y in pts)

def pick_routes(n, rect, avoid, lo, hi, tries=4000):
    got = []
    cands = [h for h in HY if not h['curly'] and len(h['pts']) > 8]
    for _ in range(tries):
        if len(got) >= n: break
        h = random.choice(cands)
        full = route_from(h['id'], len(h['pts']) - 1)
        if arclen(full) < lo: continue
        L = random.uniform(lo, hi)
        cum = [0.0]
        for i in range(1, len(full)): cum.append(cum[-1] + math.dist(full[i - 1], full[i]))
        if cum[-1] < L: continue
        s0 = random.uniform(0, cum[-1] - L)
        seg = [p for p, c in zip(full, cum) if s0 <= c <= s0 + L]
        if len(seg) < 4 or not zone_ok(seg, rect): continue
        if avoid and zone_ok(seg, avoid): continue
        mid = seg[len(seg) // 2]
        if any(math.dist(mid, g[len(g) // 2]) < 150 for g in got): continue   # keep lights apart
        if random.random() < 0.4: seg = seg[::-1]   # some flow out to the tips
        got.append(seg)
    return got

PHONE_RECT = (PX0 + 18, PY0 + 40, PX1 - 18, PY1 - 30)
DESK_RECT = (330, 210, 1590, 990)
routes = [(r, 'p') for r in pick_routes(4, PHONE_RECT, None, 240, 420)]
routes += [(r, 'd') for r in pick_routes(5, DESK_RECT, (PX0, PY0, PX1, PY1), 280, 520)]

LIGHT_START = 8.6       # after the grow has settled
SPEED = 26.0            # px per second: slow
lights_css = []
for i, (seg, zone) in enumerate(routes):
    pts = smooth_route(seg)
    L = arclen(pts)
    travel = L / SPEED
    cycle = travel + random.uniform(24, 44)
    frac = travel / cycle
    iters = max(1, int(600 // cycle))    # about ten minutes, then they rest
    delay = LIGHT_START + i * 3.7 + random.uniform(0, 2.5)
    # a keyframe every ~18px along the route; fade in over the first 18% of the trip, out over the last 22%
    frames = []
    cum = [0.0]
    for j in range(1, len(pts)): cum.append(cum[-1] + math.dist(pts[j - 1], pts[j]))
    for j in list(range(0, len(pts), 3)) + ([len(pts) - 1] if (len(pts) - 1) % 3 else []):
        u = cum[j] / L
        o = max(0.0, min(1.0, u / 0.18, (1 - u) / 0.22)); o = o * o * (3 - 2 * o)
        frames.append(f'{u * frac * 100:.2f}%{{transform:translate({pts[j][0]:.1f}px,{pts[j][1]:.1f}px);opacity:{o:.2f}}}')
    frames.append(f'{min(100, frac * 100 + 0.01):.2f}%,100%{{transform:translate({pts[-1][0]:.1f}px,{pts[-1][1]:.1f}px);opacity:0}}')
    lights_css.append(f'@keyframes myc-l{i}{{{"".join(frames)}}}\n'
                      f'.myc-go .myc-l{i}{{animation:myc-l{i} {cycle:.1f}s linear {delay:.1f}s {iters} both}}')
print(len(routes), 'light routes')

# ---- the SVG file ----
# Each look (depth and width) is one group with its color and width written on it, so the file draws the same
# on its own (as the soil's background, without JavaScript) as it does laid into the page. Each path carries
# its own length, start and duration (--l, --d, --t) for the grow-in in soil.css.
def el_svg(e):
    cls = ' class="d"' if e['zone'] == 'd' else ''
    return f'<path{cls} style="--l:{math.ceil(e["L"] * 2) + 2};--d:{e["delay"]:.2f};--t:{e["dur"]:.2f}" d="{e["d"]}"/>'

body = []
for z in range(3):
    for wc in range(4):
        mine = [e for e in els if e['z'] == z and e['wc'] == wc]
        if not mine: continue
        c = look_color(z, wc)
        body.append(f'<g stroke="#{c[0]:02x}{c[1]:02x}{c[2]:02x}" stroke-width="{WC[wc] * ZW[z] * 2:.2f}">'
                    + ''.join(el_svg(e) for e in mine) + '</g>')
knot_svg = ''.join(f'<circle class="myc-k{" d" if z == "d" else ""}" cx="{x * 2}" cy="{y * 2}" r="88" style="--d:{t:.2f}"/>'
                   for x, y, t, z in knots)
lights_attr = ' '.join(z for _, z in routes)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W * 2} {H * 2}" width="{W}" height="{H}" '
       f'data-end="{END + 0.4:.1f}" data-lights="{lights_attr}" aria-hidden="true" focusable="false">'
       '<defs><radialGradient id="myc-kg"><stop offset="0" stop-color="#ece3d3" stop-opacity=".5"/>'
       '<stop offset=".3" stop-color="#ece3d3" stop-opacity=".2"/><stop offset=".65" stop-color="#ece3d3" stop-opacity=".06"/>'
       '<stop offset="1" stop-color="#ece3d3" stop-opacity="0"/></radialGradient></defs>'
       f'<g opacity="{OPACITY}" fill="none" stroke-linecap="round" stroke-linejoin="round">'
       f'<g fill="url(#myc-kg)" stroke="none">{knot_svg}</g>' + ''.join(body) + '</g></svg>\n')
open(os.path.join(SITE, 'mycelium.svg'), 'w').write(svg)
print(f'mycelium.svg {len(svg) / 1024:.0f} KB')

# ---- the lights, into soil.css ----
A = '/* ==== generated by _mycelium/build.py: the traveling lights (edit the script, not these lines) ==== */'
B = '/* ==== end of the generated lights ==== */'
p = os.path.join(SITE, 'soil.css')
css = open(p).read()
if A not in css or B not in css: raise SystemExit('soil.css needs the two "generated" marker lines')
css = css[:css.index(A)] + A + '\n' + '\n'.join(lights_css) + '\n' + css[css.index(B):]
open(p, 'w').write(css)
print('soil.css lights updated')

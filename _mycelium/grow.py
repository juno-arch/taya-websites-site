# Grows a mycelium network (a hyphal growth model, not a graph): a few colonies send out hyphae that
# wander with slowly changing curvature, branch at acute angles behind their tips, turn away from their
# neighbours, fuse where they meet another thread (anastomosis), and stop where the soil is crowded.
# The growth time of every point is recorded, so the page can replay the growth exactly.
# Seeded, so it grows the same network every time (the one Pollen chose, Sep 30, 2026).
#
#   python3 _mycelium/grow.py    -> _mycelium/out/net.json (hyphae with points, ticks, widths) + out/preview.png
#   then python3 _mycelium/build.py turns it into the site's mycelium.svg and soil.css's traveling lights.
# (Folders starting with "_" are not published; out/ is not kept in git, since this makes it again in 2 seconds.)
import json, math, os, random
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)

SEED = int(os.environ.get('SEED', 7))
random.seed(SEED)
W, H = 1920, 1200
DS = 3.0            # one growth step, px
CELL = 6
PHONE = (770, 190, 1150, 1010)   # what a 390x844 phone sees of the canvas (it sits centred)

# colonies: (x, y, start tick, primary hyphae). Two sit inside every phone's view, the rest spread for wide screens
COLONIES = [
    (872, 430, 0, 15),
    (1052, 806, 10, 14),
    (470, 360, 22, 13),
    (1468, 330, 16, 13),
    (1420, 930, 30, 12),
    (560, 930, 26, 12),
    (1830, 640, 40, 10),
    (120, 700, 44, 10),
    (960, 1180, 52, 8),
    (1000, 40, 48, 8),
]
# denser knots (where threads crowd and tangle), besides the colonies themselves: (x, y, radius, strength)
KNOTS = [(1000, 612, 60, 1.0), (760, 250, 46, 0.8), (1210, 540, 52, 0.9), (330, 610, 60, 0.8), (1650, 540, 58, 0.8),
         (930, 960, 50, 0.85), (1180, 1020, 44, 0.7), (650, 640, 48, 0.8)]

# a smooth, low-frequency "richness" of the soil: where it's rich the mycelium branches more and packs tighter
def _vnoise_table(n, s):
    r = random.Random(s); return [[r.random() for _ in range(n)] for _ in range(n)]
NT = _vnoise_table(16, SEED + 101)
def vnoise(x, y, scale=360.0):
    fx, fy = x / scale, y / scale
    ix, iy = int(math.floor(fx)), int(math.floor(fy)); tx, ty = fx - ix, fy - iy
    sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    g = lambda a, b: NT[a % 16][b % 16]
    a = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx
    b = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx
    return a + (b - a) * sy

def richness(x, y):
    d = 0.55 + 0.75 * vnoise(x, y) + 0.25 * vnoise(x + 999, y + 333, 150)
    for (kx, ky, kr, ks) in KNOTS:
        q = ((x - kx) ** 2 + (y - ky) ** 2) / (2 * kr * kr)
        if q < 9: d += ks * math.exp(-q)
    for (cx, cy, _, _) in COLONIES:
        q = ((x - cx) ** 2 + (y - cy) ** 2) / (2 * 40 * 40)
        if q < 9: d += 1.1 * math.exp(-q)
    return d

grid = defaultdict(list)   # cell -> [(hypha id, index)]
def cell(x, y): return (int(x // CELL), int(y // CELL))

class Hypha:
    __slots__ = ('id', 'pts', 'ticks', 'parent', 'pidx', 'gen', 'children', 'alive', 'th', 'k', 'col', 'end', 'speed',
                 'curly', 'life', 'acc', 'z', 'cool')
H_ = []

def new_hypha(x, y, th, parent, pidx, gen, col, tick, curly=False, life=10 ** 9, speed=1.0, z=None):
    h = Hypha(); h.id = len(H_); h.pts = [(x, y)]; h.ticks = [tick]; h.parent = parent; h.pidx = pidx; h.gen = gen
    if z is None:
        if parent is None: z = random.choice((0, 1, 1, 2))
        else:
            z = H_[parent].z
            if random.random() < 0.22: z = max(0, min(2, z + random.choice((-1, 1))))
    h.z = z
    h.children = []; h.alive = True; h.th = th; h.k = random.gauss(0, 0.006); h.col = col; h.end = 'tip'
    h.speed = speed; h.curly = curly; h.life = life; h.acc = 0.0; h.cool = 0
    H_.append(h); grid[cell(x, y)].append((h.id, 0))
    if parent is not None: H_[parent].children.append((pidx, h.id))
    return h

def angdiff(a, b):
    d = (a - b) % (2 * math.pi)
    return d - 2 * math.pi if d > math.pi else d

def neighbours(x, y, r):
    c0, c1 = cell(x - r, y - r), cell(x + r, y + r)
    for cx in range(c0[0], c1[0] + 1):
        for cy in range(c0[1], c1[1] + 1):
            for item in grid.get((cx, cy), ()):
                yield item

def foreign(h, hid, idx, same_depth=True):
    """is point (hid, idx) someone else's thread, as far as tip h is concerned?"""
    if hid == h.id: return idx < len(h.pts) - 14
    if same_depth and H_[hid].z != h.z: return False
    # a young branch ignores the thread it's leaving, near where it left
    if hid == h.parent and len(h.pts) < 12 and abs(idx - h.pidx) < 10: return False
    g = H_[hid]
    if g.parent == h.id and abs(g.pidx - (len(h.pts) - 1)) < 12 and len(g.pts) < 12: return False
    return True

def start_colonies_at(tick):
    for ci, (cx, cy, t0, n) in enumerate(COLONIES):
        if t0 != tick: continue
        base = random.random() * math.tau
        for i in range(n):
            th = base + i * math.tau / n + random.gauss(0, 0.18)
            # they leave from all over a small tangled heart, not from one point (no starburst)
            r0 = random.uniform(2, 10); a0 = th + random.gauss(0, 0.9)
            x, y = cx + math.cos(a0) * r0, cy + math.sin(a0) * r0
            new_hypha(x, y, th + random.gauss(0, 0.2), None, 0, 0, ci, tick, speed=random.uniform(0.9, 1.0))
        # the knot itself: short curly threads tangled around the centre
        for i in range(int(n * 1.7)):
            th = random.random() * math.tau
            r = random.uniform(1, 17) ** 1.0
            new_hypha(cx + math.cos(th) * r, cy + math.sin(th) * r, th + random.uniform(-2, 2), None, 0, 1, ci, tick,
                      curly=True, life=random.randint(6, 22), speed=0.55, z=random.choice((1, 2, 2)))

def step(h, tick):
    x, y = h.pts[-1]
    rich = richness(x, y)
    # slowly wandering curvature, a little jitter, and (for the leading hyphae) a pull outward from the colony
    if h.curly:
        h.k += random.gauss(0, 0.05); h.k = max(-0.22, min(0.22, h.k * 0.9))
        h.th += h.k + random.gauss(0, 0.08)
    else:
        km = 0.018 if h.gen == 0 else 0.026
        h.k += random.gauss(0, 0.0026); h.k = max(-km, min(km, h.k * 0.986))
        h.th += h.k + random.gauss(0, 0.011)
        cx, cy = COLONIES[h.col][0], COLONIES[h.col][1]
        rad = math.atan2(y - cy, x - cx)
        pull = 0.02 if h.gen <= 1 else 0.013
        h.th += pull * angdiff(rad, h.th)
    # turn away from other threads close ahead (hyphae avoid each other until they meet)
    rx = ry = 0.0; crowd = 0
    R = 11.0 / max(0.45, rich) ** 0.55
    for hid, idx in neighbours(x, y, R):
        if not foreign(h, hid, idx, False): continue
        px, py = H_[hid].pts[idx]
        dx, dy = x - px, y - py; d2 = dx * dx + dy * dy
        if d2 < R * R:
            crowd += 1
            if d2 > 0.01:
                w = 1.0 / d2; rx += dx * w; ry += dy * w
    if crowd and not h.curly:
        away = math.atan2(ry, rx)
        h.th += 0.05 * angdiff(away, h.th) * min(1.0, crowd / 6)
    nx, ny = x + math.cos(h.th) * DS, y + math.sin(h.th) * DS
    # fuse with a thread it touches
    best = None; bd = 2.4 * 2.4
    if h.cool: h.cool -= 1
    for hid, idx in (() if h.cool else neighbours(nx, ny, 2.6)):
        if not foreign(h, hid, idx): continue
        px, py = H_[hid].pts[idx]
        d2 = (nx - px) ** 2 + (ny - py) ** 2
        if d2 < bd: bd, best = d2, (hid, idx, px, py)
    if best is not None and random.random() < 0.3:
        h.cool = 4; best = None   # it slips past (over or under) instead of joining
    if best is not None:
        h.pts.append((best[2], best[3])); h.ticks.append(tick); h.alive = False; h.end = ('fuse', best[0], best[1])
        return
    h.pts.append((nx, ny)); h.ticks.append(tick); grid[cell(nx, ny)].append((h.id, len(h.pts) - 1))
    # crowded soil: stop growing
    limit = 6 + 8 * min(1.8, rich)
    if (not h.curly and crowd > limit) or len(h.pts) > h.life:
        h.alive = False; h.end = 'crowd' if crowd > limit else 'tip'; return
    if nx < -40 or ny < -40 or nx > W + 40 or ny > H + 40:
        h.alive = False; h.end = 'out'; return
    # branch behind the tip, at an acute angle; the parent swerves a little the other way
    if not h.curly and len(h.pts) > 6:
        Lb = (88 if h.gen <= 1 else 72 if h.gen <= 3 else 62) / max(0.35, rich) ** 1.05
        if random.random() < DS / Lb and h.gen < 9:
            s = random.choice((-1, 1))
            a = h.th + s * math.radians(random.uniform(22, 56))
            new_hypha(nx, ny, a, h.id, len(h.pts) - 1, h.gen + 1, h.col, tick, speed=random.uniform(0.72, 0.92))
            h.th -= s * math.radians(random.uniform(3, 9))
        # rarely, a tiny side hair (the fuzz along a hypha)
        elif random.random() < 0.022 * rich:
            s = random.choice((-1, 1))
            new_hypha(nx, ny, h.th + s * math.radians(random.uniform(35, 80)), h.id, len(h.pts) - 1, h.gen + 1, h.col,
                      tick, life=random.randint(2, 6), speed=0.6, curly=True)

def grow(max_tick=900):
    tick = 0
    while tick < max_tick:
        start_colonies_at(tick)
        alive = [h for h in H_ if h.alive]
        if not alive and tick > max(c[2] for c in COLONIES): break
        random.shuffle(alive)
        for h in alive:
            h.acc += h.speed
            while h.acc >= 1 and h.alive:
                h.acc -= 1; step(h, tick)
        tick += 1
    return tick

def downstream():
    """tips carried by each hypha at each index (Leonardo's rule: a thread is as thick as all it feeds)"""
    total = {}
    def tot(hid):
        if hid in total: return total[hid]
        h = H_[hid]; t = 1 + sum(tot(c) for _, c in h.children); total[hid] = t; return t
    for h in sorted(H_, key=lambda h: -h.gen): tot(h.id)
    out = {}
    for h in H_:
        ch = sorted(h.children)
        arr = []; j = 0; acc = total[h.id]
        # walking from the base out, each branch point hands its load to the branch
        for i in range(len(h.pts)):
            while j < len(ch) and ch[j][0] < i:
                acc -= total[ch[j][1]]; j += 1
            arr.append(acc)
        out[h.id] = arr
    return out

if __name__ == '__main__':
    import sys
    sys.setrecursionlimit(100000)
    ticks = grow()
    ds = downstream()
    L = sum((len(h.pts) - 1) * DS for h in H_)
    ends = defaultdict(int)
    for h in H_: ends[h.end if isinstance(h.end, str) else 'fuse'] += 1
    print(f'seed {SEED}: {len(H_)} hyphae, {L:.0f}px of thread, {ticks} ticks, ends {dict(ends)}')
    data = {'W': W, 'H': H, 'DS': DS, 'ticks': ticks, 'phone': PHONE, 'colonies': COLONIES, 'knots': KNOTS,
            'hyphae': [{'id': h.id, 'pts': [[round(x, 2), round(y, 2)] for x, y in h.pts], 'ticks': h.ticks,
                        'parent': h.parent, 'pidx': h.pidx, 'gen': h.gen, 'curly': h.curly, 'col': h.col, 'z': h.z,
                        'end': h.end if isinstance(h.end, str) else ['fuse', h.end[1], h.end[2]],
                        'load': ds[h.id]} for h in H_]}
    json.dump(data, open(os.path.join(OUT, 'net.json'), 'w'))
    # quick preview (only if Pillow is installed)
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        raise SystemExit(0)
    S = 1
    im = Image.new('RGB', (W * S, H * S), (14, 14, 12)); d = ImageDraw.Draw(im)
    for h in H_:
        for i in range(1, len(h.pts)):
            w = max(1, round(0.5 * ds[h.id][i] ** 0.42 * S))
            (x0, y0), (x1, y1) = h.pts[i - 1], h.pts[i]
            d.line((x0 * S, y0 * S, x1 * S, y1 * S), fill=(120, 116, 106), width=w)
    d.rectangle(PHONE, outline=(200, 120, 40))
    im.save(os.path.join(OUT, 'preview.png'))

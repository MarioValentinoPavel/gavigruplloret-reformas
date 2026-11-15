// Maqueta: bloque de pisos de Lloret en blanco, como una maqueta de arquitectura.
// Capas (tags): roof (cubierta), facade (fachadas + trabajos verticales), floor (viviendas),
// inst (instalaciones), base (planta baja / construcción). Se monta en la portada y se despieza con el scroll.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const COL = {
  white: 0xf4f2ed, wall: 0xefece6, slab: 0xe3dfd7, board: 0xebe8e2, inner: 0xdcd8d0,
  anth: 0x373c41, glass: 0x8ea2ac, wood: 0xc29a6b, stone: 0xd8d3c9, top: 0x2b2f33,
  yellow: 0xf2b300, water: 0x3a7bb8, copper: 0xb26d36, drain: 0x9aa1a7, leaf: 0x7e9a6c,
  line: 0x8c9094, rug: 0xb9b2a6, fabric: 0xd9d4cb
};
const TAGS = ['roof', 'facade', 'floor', 'inst', 'base', 'fig'];

// Niveles (metros de la maqueta)
const L = { pb: 0, f1: 3.6, f2: 6.6, f3: 9.6, roof: 12.6 };
const W2 = 6, D2 = 4.5, T = 0.25;

export async function createMaqueta(canvas, opt = {}) {
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opt.capture, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d3c8, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
  sun.position.set(-11, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);

  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);

  // ---------- materiales por capa (para poder atenuar cada capa por separado)
  const mats = {};
  const lineMats = {};
  function M(tag, key, extra) {
    const id = tag + ':' + key;
    if (!mats[id]) {
      const base = {
        white: { color: COL.white, roughness: .92 }, wall: { color: COL.wall, roughness: .95 }, slab: { color: COL.slab, roughness: .95 },
        inner: { color: COL.inner, roughness: .9 }, anth: { color: COL.anth, roughness: .55, metalness: .15 },
        glass: { color: COL.glass, roughness: .12, metalness: .2, transparent: true, opacity: .62 },
        wood: { color: COL.wood, roughness: .7 }, stone: { color: COL.stone, roughness: .8 }, top: { color: COL.top, roughness: .45 },
        yellow: { color: COL.yellow, roughness: .45 }, water: { color: COL.water, roughness: .4 }, copper: { color: COL.copper, roughness: .35, metalness: .55 },
        drain: { color: COL.drain, roughness: .6 }, leaf: { color: COL.leaf, roughness: .85 }, rug: { color: COL.rug, roughness: 1 },
        fabric: { color: COL.fabric, roughness: 1 }, board: { color: COL.board, roughness: 1 }
      }[key];
      const m = new THREE.MeshStandardMaterial({ ...base, ...extra });
      m.envMapIntensity = .55;
      m.userData.baseOpacity = m.opacity;
      m.userData.baseTransparent = m.transparent;
      m.userData.tag = tag;
      mats[id] = m;
    }
    return mats[id];
  }
  function LM(tag) {
    if (!lineMats[tag]) lineMats[tag] = new THREE.LineBasicMaterial({ color: COL.line, transparent: true, opacity: .42 });
    lineMats[tag].userData.baseOpacity = .42;
    return lineMats[tag];
  }

  const UNIT = new THREE.BoxGeometry(1, 1, 1);
  const UNIT_EDGES = new THREE.EdgesGeometry(UNIT);
  function bx(g, tag, key, x0, y0, z0, x1, y1, z1, o = {}) {
    const m = new THREE.Mesh(UNIT, M(tag, key));
    m.scale.set(Math.max(Math.abs(x1 - x0), 1e-3), Math.max(Math.abs(y1 - y0), 1e-3), Math.max(Math.abs(z1 - z0), 1e-3));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = o.cast !== false; m.receiveShadow = true;
    if (o.edges) { const e = new THREE.LineSegments(UNIT_EDGES, LM(tag)); m.add(e); }
    g.add(m); return m;
  }
  function cyl(g, tag, key, r, x0, y0, z0, x1, y1, z1, seg = 14) {
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), M(tag, key));
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; m.receiveShadow = true;
    g.add(m); return m;
  }

  // Muro con huecos. axis 'z': muro en el plano XY (fachada delantera/trasera), recorre x. axis 'x': plano ZY, recorre z.
  function wall(g, tag, key, axis, fixed0, fixed1, a0, a1, y0, y1, holes, o = {}) {
    const seg = (s0, s1, yy0, yy1) => {
      if (s1 - s0 < 1e-3 || yy1 - yy0 < 1e-3) return;
      if (axis === 'z') bx(g, tag, key, s0, yy0, fixed0, s1, yy1, fixed1, o); else bx(g, tag, key, fixed0, yy0, s0, fixed1, yy1, s1, o);
    };
    const hs = [...holes].sort((p, q) => p[0] - q[0]);
    let cur = a0;
    for (const [h0, h1, hy0, hy1] of hs) {
      seg(cur, h0, y0, y1);              // machón
      seg(h0, h1, y0, hy0);              // antepecho
      seg(h0, h1, hy1, y1);              // dintel
      cur = h1;
    }
    seg(cur, a1, y0, y1);
  }
  // Carpintería: marco antracita + vidrio dentro de un hueco
  function opening(g, tag, axis, fixed, h0, h1, y0, y1, o = {}) {
    const f = .07, d = .12;
    const c = axis === 'z' ? [fixed - d, fixed] : [fixed - d, fixed];
    const put = (s0, s1, yy0, yy1, key) => axis === 'z' ? bx(g, tag, key, s0, yy0, c[0], s1, yy1, c[1], { cast: key !== 'glass' }) : bx(g, tag, key, c[0], yy0, s0, c[1], yy1, s1, { cast: key !== 'glass' });
    put(h0, h1, y0, y0 + f, 'anth'); put(h0, h1, y1 - f, y1, 'anth');
    put(h0, h0 + f, y0, y1, 'anth'); put(h1 - f, h1, y0, y1, 'anth');
    if (o.mullion) put((h0 + h1) / 2 - f / 2, (h0 + h1) / 2 + f / 2, y0, y1, 'anth');
    const gl = put(h0 + f, h1 - f, y0 + f, y1 - f, 'glass'); gl.castShadow = false;
    if (o.blind) { // persiana a medio bajar
      const by = y1 - (y1 - y0) * o.blind;
      put(h0 + f, h1 - f, by, y1 - f, 'wall');
    }
  }

  function figure(g, tag, x, y, z, rotY = 0, lean = 0) {
    const p = new THREE.Group();
    bx(p, tag, 'white', -.17, .82, -.1, .17, 1.42, .1);          // tronco
    bx(p, tag, 'white', -.15, 0, -.07, -.02, .84, .07);           // piernas
    bx(p, tag, 'white', .02, 0, -.07, .15, .84, .07);
    bx(p, tag, 'white', -.25, .86, -.06, -.17, 1.36, .06);        // brazos
    bx(p, tag, 'white', .17, .86, -.06, .25, 1.36, .06);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), M(tag, 'white'));
    head.position.set(0, 1.56, 0); head.castShadow = true; p.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(tag, 'yellow'));
    helmet.position.set(0, 1.6, 0); helmet.castShadow = true; p.add(helmet);
    p.position.set(x, y, z); p.rotation.y = rotY; p.rotation.z = lean;
    g.add(p); return p;
  }

  // ---------- construcción del edificio
  const root = new THREE.Group(); scene.add(root);
  const layers = {};
  function layer(id, tag) {
    const g = new THREE.Group(); g.userData.tag = tag; root.add(g);
    layers[id] = { g, tag, off: new THREE.Vector3(), intro: 0 };
    return g;
  }

  // Base de la maqueta (fija)
  const board = new THREE.Group(); root.add(board);
  bx(board, 'board', 'board', -9, -.4, -7.2, 9, 0, 8.2, { edges: true });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: .13 }));
  shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = -.401; shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // Planta baja (construcción)
  const pb = layer('base', 'base');
  bx(pb, 'base', 'slab', -W2, 0, -D2, W2, .18, D2, { edges: true });
  // fachada delantera de la planta baja: escaparates, puerta y rótulo
  wall(pb, 'base', 'wall', 'z', D2 - T, D2, -W2, W2, .18, L.f1, [[-5.4, -2.2, .5, 2.75], [-1.6, 1.6, .5, 2.75], [2.3, 3.5, .18, 2.55], [4.1, 5.4, .95, 2.55]], { edges: true });
  opening(pb, 'base', 'z', D2 + .01, -5.4, -2.2, .5, 2.75, { mullion: true });
  opening(pb, 'base', 'z', D2 + .01, -1.6, 1.6, .5, 2.75, { mullion: true });
  opening(pb, 'base', 'z', D2 + .01, 4.1, 5.4, .95, 2.55);
  bx(pb, 'base', 'anth', 2.3, .18, D2 - .12, 3.5, 2.55, D2);   // puerta
  // fachada lateral y muros traseros
  wall(pb, 'base', 'wall', 'x', W2 - T, W2, -D2, D2, .18, L.f1, [[-3.6, -2.0, .8, 2.45], [.8, 2.4, .8, 2.45]], { edges: true });
  opening(pb, 'base', 'x', W2 + .01, -3.6, -2.0, .8, 2.45);
  opening(pb, 'base', 'x', W2 + .01, .8, 2.4, .8, 2.45);
  bx(pb, 'base', 'wall', -W2, .18, -D2, W2, L.f1, -D2 + T);
  bx(pb, 'base', 'wall', -W2, .18, -D2, -W2 + T, L.f1, D2);
  // rótulo con la marca (textura de canvas)
  const sign = await makeSign();
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(7, .62), new THREE.MeshStandardMaterial({ map: sign, roughness: .6 }));
  signMesh.material.userData = { baseOpacity: 1, baseTransparent: false, tag: 'base' };
  mats['base:sign'] = signMesh.material;
  signMesh.position.set(W2 + .02, 3.05, -.6); signMesh.rotation.y = Math.PI / 2; pb.add(signMesh);
  // persona a la entrada
  figure(pb, 'fig', 3.55, 0, 6.2, -0.5);

  // Plantas (viviendas)
  const floors = [];
  for (const [id, lv] of [['f1', L.f1], ['f2', L.f2], ['f3', L.f3]]) {
    const g = layer(id, 'floor');
    floors.push({ id, lv, g });
    bx(g, 'floor', 'slab', -W2, lv, -D2, W2, lv + .3, D2, { edges: true });
    // muros trasero e izquierdo (fondo de la vivienda)
    bx(g, 'floor', 'wall', -W2, lv + .3, -D2, W2, lv + 3, -D2 + T, { edges: true });
    bx(g, 'floor', 'wall', -W2, lv + .3, -D2, -W2 + T, lv + 3, D2, { edges: true });
    // tabiques: baño/cocina a la derecha
    wall(g, 'floor', 'inner', 'x', 1.15, 1.25, -.8, D2 - T, lv + .3, lv + 2.75, [[2.4, 3.3, lv + .3, lv + 2.4]]);
    bx(g, 'floor', 'inner', 1.15, lv + .3, -.9, W2 - T, lv + 2.75, -.8);
  }
  const [F1, F2, F3] = floors.map((f) => f.g);
  // P1: baño + dormitorio
  {
    const g = F1, y = L.f1 + .3;
    bx(g, 'floor', 'stone', 1.25, y, -.8, W2 - T, y + .02, D2 - T, { cast: false });
    // bañera hueca: fondo + cuatro bordes + agua
    bx(g, 'floor', 'white', 4.1, y, -.75, 5.72, y + .3, 1.05);
    bx(g, 'floor', 'white', 4.1, y + .3, -.75, 5.72, y + .58, -.63, { edges: true });
    bx(g, 'floor', 'white', 4.1, y + .3, .93, 5.72, y + .58, 1.05, { edges: true });
    bx(g, 'floor', 'white', 4.1, y + .3, -.63, 4.22, y + .58, .93);
    bx(g, 'floor', 'white', 5.6, y + .3, -.63, 5.72, y + .58, .93);
    bx(g, 'floor', 'water', 4.22, y + .3, -.63, 5.6, y + .46, .93, { cast: false });
    M('floor', 'water').color.set(0x9fc4d6);
    cyl(g, 'floor', 'anth', .035, 5.5, y + .58, -.6, 5.5, y + .8, -.6);
    bx(g, 'floor', 'white', 1.3, y, .36, 1.62, y + .4, .8);                         // inodoro
    cyl(g, 'floor', 'white', .25, 1.78, y + .1, .58, 1.78, y + .44, .58, 20);
    bx(g, 'floor', 'white', 1.28, y + .44, .32, 1.42, y + .86, .84, { edges: true });
    bx(g, 'floor', 'wood', 2.0, y + .22, -.75, 3.4, y + .8, -.25);                  // mueble de lavabo suspendido
    bx(g, 'floor', 'white', 1.98, y + .8, -.77, 3.42, y + .86, -.23);
    cyl(g, 'floor', 'white', .22, 2.7, y + .86, -.5, 2.7, y + 1.0, -.5, 22);
    const mirror = new THREE.Mesh(new THREE.CircleGeometry(.42, 32), M('floor', 'glass'));
    mirror.position.set(2.7, y + 1.75, -.785); g.add(mirror);
    bx(g, 'floor', 'glass', 4.1, y, 1.9, 4.13, y + 2.0, 3.6, { cast: false });       // mampara
    bx(g, 'floor', 'white', 4.13, y, 1.9, 5.72, y + .06, 3.6);                       // plato de ducha
    cyl(g, 'floor', 'anth', .03, 5.65, y, 3.4, 5.65, y + 2.05, 3.4);                  // columna de ducha
    cyl(g, 'floor', 'anth', .16, 5.5, y + 2.05, 3.4, 5.5, y + 2.08, 3.4, 18);
    // dormitorio
    bx(g, 'floor', 'wood', -5.72, y, -4.2, -.8, y + .02, 1.6, { cast: false });
    bx(g, 'floor', 'fabric', -5.55, y, -1.6, -3.4, y + .5, .6);                     // cama
    bx(g, 'floor', 'white', -5.45, y + .5, -1.5, -3.5, y + .62, .5);
    bx(g, 'floor', 'wood', -5.72, y, -1.7, -5.55, y + 1.1, .7);                      // cabecero
    bx(g, 'floor', 'white', -3.2, y, -4.2, -.9, y + 2.4, -3.62, { edges: true });   // armario
  }
  // P2: cocina + comedor
  {
    const g = F2, y = L.f2 + .3;
    bx(g, 'floor', 'stone', -W2 + T, y, -D2 + T, W2 - T, y + .02, D2 - T, { cast: false });
    bx(g, 'floor', 'white', 1.3, y, -.78, 5.7, y + .88, -.18);                      // encimera trasera
    bx(g, 'floor', 'top', 1.28, y + .88, -.8, 5.72, y + .94, -.14);
    bx(g, 'floor', 'white', 5.1, y, -.18, 5.72, y + .88, 2.6);                      // encimera lateral
    bx(g, 'floor', 'top', 5.04, y + .88, -.18, 5.74, y + .94, 2.62);
    bx(g, 'floor', 'anth', 3.0, y + .94, -.66, 3.7, y + .96, -.3);                  // fregadero
    bx(g, 'floor', 'top', 5.2, y + .94, .6, 5.62, y + .955, 1.4);                   // placa
    bx(g, 'floor', 'white', 1.3, y + 1.75, -.78, 4.2, y + 2.5, -.42);               // muebles altos
    bx(g, 'floor', 'anth', 4.4, y + 1.9, -.78, 5.4, y + 2.05, -.3);                 // campana
    bx(g, 'floor', 'anth', 4.75, y + 2.05, -.78, 5.05, y + 2.75, -.5);
    cyl(g, 'floor', 'anth', .03, 3.35, y + .94, -.72, 3.35, y + 1.2, -.72);         // grifo
    bx(g, 'floor', 'white', 1.3, y, -.78, 2.0, y + 2.2, -.1, { edges: true });      // nevera
    bx(g, 'floor', 'white', 2.3, y, 1.1, 4.2, y + .9, 2.1);                         // isla
    bx(g, 'floor', 'top', 2.26, y + .9, 1.06, 4.24, y + .96, 2.14);
    for (const sx of [2.7, 3.3, 3.9]) cyl(g, 'floor', 'anth', .16, sx, y, 2.55, sx, y + .7, 2.55);
    // comedor
    bx(g, 'floor', 'wood', -4.6, y + .72, .1, -2.4, y + .78, 1.3);
    for (const [cx, cz] of [[-4.2, -.25], [-3.0, -.25], [-4.2, 1.65], [-3.0, 1.65]]) bx(g, 'floor', 'white', cx - .2, y, cz - .2, cx + .2, y + .45, cz + .2);
    for (const [lx, lz] of [[-4.5, .2], [-2.5, .2], [-4.5, 1.2], [-2.5, 1.2]]) bx(g, 'floor', 'wood', lx - .04, y, lz - .04, lx + .04, y + .72, lz + .04);
  }
  // P3: salón con parquet + clima
  {
    const g = F3, y = L.f3 + .3;
    bx(g, 'floor', 'wood', -W2 + T, y, -D2 + T, W2 - T, y + .03, D2 - T, { cast: false });
    bx(g, 'floor', 'fabric', 1.6, y, -.75, 4.9, y + .42, .1);                       // sofá
    bx(g, 'floor', 'fabric', 1.6, y + .42, -.75, 4.9, y + .9, -.45);
    bx(g, 'floor', 'fabric', 4.05, y, .1, 4.9, y + .42, 1.9);
    bx(g, 'floor', 'rug', 1.5, y + .03, .4, 3.9, y + .05, 2.9, { cast: false });
    bx(g, 'floor', 'wood', 2.2, y, 1.3, 3.3, y + .38, 2.1);                         // mesa baja
    const pot = cyl(g, 'floor', 'white', .22, 5.25, y, 3.6, 5.25, y + .5, 3.6);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(.55, 1), M('floor', 'leaf'));
    leaf.position.set(5.25, y + 1.0, 3.6); leaf.castShadow = true; g.add(leaf);
    bx(g, 'floor', 'fabric', -5.55, y, -1.6, -3.4, y + .5, .6);                     // dormitorio
    bx(g, 'floor', 'wood', -5.72, y, -1.7, -5.55, y + 1.1, .7);
    bx(g, 'floor', 'white', -3.2, y, -4.2, -.9, y + 2.4, -3.62, { edges: true });
    bx(g, 'inst', 'white', 2.3, y + 2.2, -D2 + T, 3.5, y + 2.55, -D2 + T + .26);     // split de clima
    bx(g, 'inst', 'anth', 2.4, y + 2.22, -D2 + T + .2, 3.4, y + 2.26, -D2 + T + .27);
  }

  // Fachadas (delantera y lateral de las plantas) + trabajos verticales
  const fFront = layer('facadeFront', 'facade');
  const fSide = layer('facadeSide', 'facade');
  for (const lv of [L.f1, L.f2, L.f3]) {
    const y0 = lv, y1 = lv + 3;
    const holes = [[-4.85, -3.15, lv + .3, lv + 2.55], [-.85, .85, lv + .3, lv + 2.55], [3.15, 4.85, lv + .3, lv + 2.55]];
    wall(fFront, 'facade', 'wall', 'z', D2 - T, D2, -W2, W2, y0, y1, holes, { edges: true });
    holes.forEach(([h0, h1, hy0, hy1], i) => opening(fFront, 'facade', 'z', D2 + .01, h0, h1, hy0, hy1, { mullion: true, blind: i === 1 && lv === L.f2 ? .45 : (i === 2 && lv === L.f1 ? .3 : 0) }));
    for (const cx of [-4, 0, 4]) {                          // balcones
      bx(fFront, 'facade', 'white', cx - 1.55, lv + .14, D2, cx + 1.55, lv + .3, D2 + 1.25, { edges: true });
      bx(fFront, 'facade', 'white', cx - 1.55, lv + .3, D2 + 1.12, cx + 1.55, lv + .95, D2 + 1.25);
      bx(fFront, 'facade', 'white', cx - 1.55, lv + .3, D2, cx - 1.42, lv + .95, D2 + 1.25);
      bx(fFront, 'facade', 'white', cx + 1.42, lv + .3, D2, cx + 1.55, lv + .95, D2 + 1.25);
      bx(fFront, 'facade', 'anth', cx - 1.55, lv + 1.02, D2 + 1.14, cx + 1.55, lv + 1.07, D2 + 1.23);
      for (let k = 0; k < 7; k++) { const px = cx - 1.45 + k * .483; bx(fFront, 'facade', 'anth', px - .015, lv + .95, D2 + 1.17, px + .015, lv + 1.02, D2 + 1.2, { cast: false }); }
    }
    const sh = [[-3.1, -1.7, lv + 1.2, lv + 2.5], [1.0, 2.4, lv + 1.2, lv + 2.5]];
    wall(fSide, 'facade', 'wall', 'x', W2 - T, W2, -D2, D2, y0, y1, sh, { edges: true });
    sh.forEach(([h0, h1, hy0, hy1]) => opening(fSide, 'facade', 'x', W2 + .01, h0, h1, hy0, hy1, { blind: lv === L.f3 ? .35 : 0 }));
    bx(fSide, 'facade', 'white', W2, lv + 1.12, -3.18, W2 + .08, lv + 1.2, -1.62); // vierteaguas
    bx(fSide, 'facade', 'white', W2, lv + 1.12, .92, W2 + .08, lv + 1.2, 2.48);
  }
  // cuerda de trabajos verticales + operario
  const ropeX = W2 + .55, ropeZ = 3.25;
  const rope = cyl(fSide, 'facade', 'yellow', .03, ropeX, 14.15, ropeZ, ropeX, 4.6, ropeZ, 8);
  bx(fSide, 'facade', 'yellow', W2 - .05, 13.9, ropeZ - .12, ropeX + .05, 14.2, ropeZ + .12); // anclaje
  const worker = figure(fSide, 'fig', ropeX + .18, 7.4, ropeZ, Math.PI / 2, .12);
  bx(worker, 'fig', 'wood', -.3, .74, -.28, .3, .8, .26);           // asiento (viaja con el operario)
  cyl(worker, 'fig', 'anth', .14, .5, .1, 0, .5, .45, 0);            // cubo de trabajo

  // Cubierta
  const roof = layer('roof', 'roof');
  bx(roof, 'roof', 'slab', -W2, L.roof, -D2, W2, L.roof + .3, D2, { edges: true });
  const py0 = L.roof + .3, py1 = L.roof + 1.25;
  bx(roof, 'roof', 'white', -W2, py0, D2 - T, W2, py1, D2, { edges: true });
  bx(roof, 'roof', 'white', -W2, py0, -D2, W2, py1, -D2 + T, { edges: true });
  bx(roof, 'roof', 'white', -W2, py0, -D2 + T, -W2 + T, py1, D2 - T, { edges: true });
  bx(roof, 'roof', 'white', W2 - T, py0, -D2 + T, W2, py1, D2 - T, { edges: true });
  bx(roof, 'roof', 'white', -5.6, py0, -4.1, -2.6, py0 + 2.6, -1.6, { edges: true }); // caseta
  bx(roof, 'roof', 'anth', -4.6, py0, -1.62, -3.6, py0 + 2.1, -1.5);
  for (const cx of [1.1, 2.8]) {                                                   // condensadoras de clima
    bx(roof, 'roof', 'white', cx - .7, py0, -3.9, cx + .7, py0 + .95, -3.2, { edges: true });
    const fan = new THREE.Mesh(new THREE.CircleGeometry(.34, 24), M('roof', 'anth'));
    fan.position.set(cx - .1, py0 + .48, -3.19); roof.add(fan);
  }
  bx(roof, 'roof', 'slab', -1.5, py0, -.5, 4.6, py0 + .05, 3.6, { cast: false });   // tela impermeable (zona)
  // canalón y bajante en la esquina delantera derecha
  bx(roof, 'roof', 'anth', W2 - .1, L.roof + .05, D2 - .05, W2 + .18, L.roof + .3, D2 + .2);

  // Instalaciones: montantes en el patinejo (esquina trasera derecha) que se estiran al despiezar
  const inst = layer('inst', 'inst');
  const riser = new THREE.Group(); inst.add(riser);
  const RH = L.roof + .3;
  const rx = 5.05, rz = -3.95;
  cyl(riser, 'inst', 'water', .07, rx, 0, rz, rx, RH, rz);
  cyl(riser, 'inst', 'yellow', .07, rx + .22, 0, rz, rx + .22, RH, rz);
  cyl(riser, 'inst', 'drain', .11, rx + .1, 0, rz + .3, rx + .1, RH, rz + .3);
  cyl(riser, 'inst', 'anth', .045, rx + .42, 0, rz, rx + .42, RH, rz);
  cyl(riser, 'inst', 'copper', .04, rx + .55, L.f3, rz + .05, rx + .55, RH, rz + .05);
  // derivaciones en cada planta (viajan con su planta)
  const branch = (g, lv) => {
    cyl(g, 'inst', 'water', .055, rx, lv + .55, rz, rx, lv + .55, -.85);
    cyl(g, 'inst', 'yellow', .055, rx + .22, lv + .75, rz, rx + .22, lv + .75, -.85);
    cyl(g, 'inst', 'anth', .035, rx + .42, lv + 2.6, rz, -.4, lv + 2.6, rz);
    bx(g, 'inst', 'anth', -.9, lv + 1.5, -D2 + T, -.2, lv + 2.1, -D2 + T + .12);    // cuadro eléctrico
  };
  branch(F1, L.f1); branch(F2, L.f2); branch(F3, L.f3);
  cyl(F3, 'inst', 'copper', .04, rx + .55, L.f3 + 2.45, rz + .05, 3.5, L.f3 + 2.45, rz + .05);
  cyl(roof, 'inst', 'copper', .04, 1.8, py0 + .25, -3.5, rx + .55, py0 + .25, -3.5);

  // ---------- estado
  const EXPLODE = {
    roof: new THREE.Vector3(0, 6.2, 0), facadeFront: new THREE.Vector3(0, 0, 6.6), facadeSide: new THREE.Vector3(6.4, 0, 0),
    f3: new THREE.Vector3(0, 4.5, 0), f2: new THREE.Vector3(0, 2.9, 0), f1: new THREE.Vector3(0, 1.3, 0), base: new THREE.Vector3(), inst: new THREE.Vector3()
  };
  const ANCHOR = {   // punto de cada capa al que apunta su etiqueta (coordenadas sin despiezar)
    roof: new THREE.Vector3(-1, L.roof + 1.3, 0), facade: new THREE.Vector3(W2 + .05, 11.4, 1.7),
    floor: new THREE.Vector3(3.2, L.f2 + 1.2, .8), inst: new THREE.Vector3(rx + .2, 5.2, rz), base: new THREE.Vector3(-3.8, 1.6, D2 + .05)
  };
  const ANCHOR_LAYER = { roof: 'roof', facade: 'facadeSide', floor: 'f2', inst: 'inst', base: 'base' };

  let explode = 0, focus = null, focusAmt = {}, introT = 1, introStart = 0, introOn = false;
  TAGS.forEach((t) => (focusAmt[t] = 1));
  let rectFn = () => ({ x: innerWidth * .5, y: 0, w: innerWidth * .5, h: innerHeight });
  let alignBottom = true;
  let px = 0, py = 0, tpx = 0, tpy = 0;
  let dirty = true, running = false, raf = 0;

  const AZ = Math.PI / 4, EL = THREE.MathUtils.degToRad(27);
  const CENTER = new THREE.Vector3(0, 6.5, 0);

  // caja que ocupa la maqueta (con despiece) en coordenadas de mundo
  const baseBox = new THREE.Box3(new THREE.Vector3(-9, -.4, -7.2), new THREE.Vector3(9, 15.6, 8.2));
  function currentBox(e) {
    const b = baseBox.clone();
    b.max.y += 6.2 * e;  // cubierta
    b.max.z = Math.max(b.max.z, D2 + 1.25 + 6.6 * e);
    b.max.x = Math.max(b.max.x, ropeX + .6 + 6.4 * e);
    return b;
  }
  const tmpV = new THREE.Vector3();
  function frame() {
    // cámara ortográfica en dirección fija; el marco se ajusta al rectángulo que pide la maqueta
    const dist = 80;
    camera.position.set(CENTER.x + dist * Math.cos(EL) * Math.sin(AZ), CENTER.y + dist * Math.sin(EL), CENTER.z + dist * Math.cos(EL) * Math.cos(AZ));
    camera.up.set(0, 1, 0); camera.lookAt(CENTER); camera.updateMatrixWorld();
    const b = currentBox(explode);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      tmpV.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(camera.matrixWorldInverse);
      minX = Math.min(minX, tmpV.x); maxX = Math.max(maxX, tmpV.x); minY = Math.min(minY, tmpV.y); maxY = Math.max(maxY, tmpV.y);
    }
    const vw = canvas.clientWidth || innerWidth, vh = canvas.clientHeight || innerHeight;
    const r = rectFn();
    const k = Math.min(r.w / (maxX - minX), r.h / (maxY - minY));
    const rcx = r.x + r.w / 2;
    const mcx = (minX + maxX) / 2;
    camera.left = mcx - rcx / k; camera.right = camera.left + vw / k;
    if (alignBottom) { const rb = r.y + r.h; camera.bottom = minY - (vh - rb) / k; camera.top = camera.bottom + vh / k; }
    else { const rcy = r.y + r.h / 2, mcy = (minY + maxY) / 2; camera.top = mcy + rcy / k; camera.bottom = camera.top - vh / k; }
    camera.updateProjectionMatrix();
    pxPerUnit = k;
  }
  let pxPerUnit = 1;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function spring(t) { // llega, se pasa un poco y se asienta
    if (t >= 1) return 1;
    return 1 - Math.exp(-6.5 * t) * Math.cos(7.5 * t);
  }
  const INTRO_ORDER = ['base', 'f1', 'f2', 'f3', 'inst', 'roof', 'facadeFront', 'facadeSide'];

  function applyLayers(now) {
    const e = ease(Math.min(1, Math.max(0, explode)));
    for (const id in layers) {
      const ly = layers[id];
      const off = EXPLODE[id] || new THREE.Vector3();
      ly.g.position.copy(off).multiplyScalar(e);
      if (introOn) {
        const i = INTRO_ORDER.indexOf(id);
        const t = Math.max(0, (now - introStart - i * 140) / 900);
        const s = spring(Math.min(1, t));
        const drop = id === 'facadeFront' ? new THREE.Vector3(0, 0, 9) : id === 'facadeSide' ? new THREE.Vector3(9, 0, 0) : new THREE.Vector3(0, 9, 0);
        ly.g.position.addScaledVector(drop, 1 - s);
        ly.g.visible = t > 0;
      } else ly.g.visible = true;
    }
    // los montantes se estiran hasta la cubierta despiezada
    layers.inst.g.children[0].scale.y = (RH + 6.2 * e * (L.roof / RH)) / RH;
    // el operario baja un poco por la cuerda durante la entrada
    if (introOn) {
      const t = Math.min(1, Math.max(0, (now - introStart - 1300) / 1400));
      worker.position.y = 9.6 - 2.2 * ease(t);
    }
  }

  function applyFocus(dt) {
    let changed = false;
    for (const t of TAGS) {
      const target = !focus || t === focus || (focus === 'facade' && t === 'fig') ? 1 : .14;
      const cur = focusAmt[t];
      const nv = cur + (target - cur) * Math.min(1, dt * 7);
      if (Math.abs(nv - cur) > .001) { focusAmt[t] = nv; changed = true; } else focusAmt[t] = target;
    }
    for (const id in mats) {
      const m = mats[id]; const a = focusAmt[m.userData.tag] ?? 1;
      const op = m.userData.baseOpacity * a;
      const tr = m.userData.baseTransparent || a < .999;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
      m.opacity = op; m.depthWrite = a > .5;
    }
    for (const t in lineMats) lineMats[t].opacity = .42 * (focusAmt[t] ?? 1);
    return changed;
  }

  let last = performance.now();
  function tick(now) {
    raf = running ? requestAnimationFrame(tick) : 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    px += (tpx - px) * Math.min(1, dt * 4); py += (tpy - py) * Math.min(1, dt * 4);
    const moving = Math.abs(tpx - px) > .0005 || Math.abs(tpy - py) > .0005;
    const fch = applyFocus(dt);
    const introRunning = introOn && now - introStart < 3200;
    if (introOn && !introRunning) introOn = false;
    if (!(dirty || moving || fch || introRunning)) return;
    dirty = false;
    root.rotation.y = px * .09; root.rotation.x = py * .025;
    applyLayers(now);
    frame();
    renderer.render(scene, camera);
    opt.onFrame && opt.onFrame();
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    dirty = true;
  }
  resize();

  const proj = new THREE.Vector3();
  const api = {
    renderer, scene, camera,
    setRect(fn, bottom = true) { rectFn = fn; alignBottom = bottom; dirty = true; },
    setExplode(p) { if (p !== explode) { explode = p; dirty = true; } },
    setFocus(tag) { focus = tag; dirty = true; },
    pointer(x, y) { tpx = x; tpy = y; },
    intro() { introStart = performance.now(); introOn = true; dirty = true; },
    skipIntro() { introOn = false; worker.position.y = 7.4; dirty = true; },
    invalidate() { dirty = true; },
    start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    renderNow() { applyFocus(1); applyLayers(performance.now()); frame(); renderer.render(scene, camera); },
    resize,
    // posición en pantalla (px) del punto de una capa
    project(tag) {
      const a = ANCHOR[tag]; const ly = layers[ANCHOR_LAYER[tag]];
      proj.copy(a);
      if (tag === 'inst') proj.y *= layers.inst.g.children[0].scale.y;
      proj.add(ly.g.position);
      root.localToWorld(proj);
      proj.project(camera);
      return { x: (proj.x + 1) / 2 * (canvas.clientWidth || innerWidth), y: (1 - proj.y) / 2 * (canvas.clientHeight || innerHeight) };
    },
    get scale() { return pxPerUnit; },
    // Foto fija de un encuadre (para las miniaturas y las imágenes de respaldo)
    shot(o) {
      const w = o.w || 640, h = o.h || 480;
      const prevPR = renderer.getPixelRatio(), prevSize = renderer.getSize(new THREE.Vector2());
      const prevFocus = focus, prevExplode = explode, prevBg = scene.background;
      renderer.setPixelRatio(1); renderer.setSize(w, h, false);
      explode = o.explode ?? 0; focus = o.focus ?? null;
      TAGS.forEach((t) => (focusAmt[t] = !focus || t === focus || (focus === 'facade' && t === 'fig') ? 1 : .14));
      applyFocus(0); introOn = false; worker.position.y = 7.4;
      root.rotation.set(0, 0, 0);
      applyLayers(performance.now());
      (o.hide || []).forEach((id) => { if (layers[id]) layers[id].g.visible = false; });
      scene.background = o.bg != null ? new THREE.Color(o.bg) : null;
      const az = THREE.MathUtils.degToRad(o.az ?? 45), el = THREE.MathUtils.degToRad(o.el ?? 27);
      const c = new THREE.Vector3(...(o.center || [0, 6.5, 0])), dist = 80, half = (o.size || 20) / 2;
      const cam = new THREE.OrthographicCamera(-half * w / h, half * w / h, half, -half, .1, 200);
      cam.position.set(c.x + dist * Math.cos(el) * Math.sin(az), c.y + dist * Math.sin(el), c.z + dist * Math.cos(el) * Math.cos(az));
      cam.lookAt(c); cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      const url = renderer.domElement.toDataURL(o.type || 'image/webp', o.q ?? .9);
      scene.background = prevBg; explode = prevExplode; focus = prevFocus;
      for (const id in layers) layers[id].g.visible = true;
      renderer.setPixelRatio(prevPR); renderer.setSize(prevSize.x, prevSize.y, false);
      dirty = true;
      return url;
    }
  };
  return api;
}

async function makeSign() {
  const c = document.createElement('canvas');
  c.width = 1400; c.height = 124;
  const g = c.getContext('2d');
  try { await document.fonts.load('700 60px Excon'); } catch (_) { /* sin fuente */ }
  g.fillStyle = '#2b2f33'; g.fillRect(0, 0, c.width, c.height);
  // G hexagonal
  const cx = 70, cy = 62, R = 40;
  const P = (a) => [cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)];
  g.strokeStyle = '#f2b300'; g.lineWidth = 11; g.lineJoin = 'miter'; g.lineCap = 'butt';
  g.beginPath();
  const pts = [P(-30), P(-90), P(-150), P(150), P(90), P(30)];
  g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
  g.lineTo(cx + R * Math.cos(Math.PI / 6), cy); g.lineTo(cx + 6, cy);
  g.stroke();
  g.fillStyle = '#f4f2ed';
  g.font = '700 58px Excon, system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('GAVIGRUPLLORET', 135, 64);
  const w = g.measureText('GAVIGRUPLLORET').width;
  g.fillStyle = '#f2b300';
  g.font = '500 58px Excon, system-ui, sans-serif';
  g.fillText('REFORMAS', 135 + w + 22, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

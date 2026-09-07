import * as THREE from 'three';
import { sampleTrackCurve } from '../utils/math.js';

export class TrackBuilder {
  /**
   * Generates a complete 3D racing circuit including road mesh, curbs,
   * guardrails, start gantry, and theme scenery (buildings, trees, cliffs, ocean).
   */
  static buildTrack(trackDef) {
    const root = new THREE.Group();
    root.name = `Track_${trackDef.id}`;

    // Sample track spline
    const sampleCount = 500;
    const trackData = sampleTrackCurve(trackDef.controlPoints, sampleCount);
    trackData.roadWidth = trackDef.roadWidth || 16.0;

    const samples = trackData.samples;
    const roadWidth = trackData.roadWidth;
    const halfWidth = roadWidth * 0.5;

    // --- 1. ROAD MESH & MATERIALS ---
    // Procedural asphalt canvas texture for realistic road surface with dashed lines and edge lines
    const roadTexture = TrackBuilder.createRoadTexture();
    const roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.85,
      metalness: 0.12
    });

    const roadGeo = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const normals = [];
    const indices = [];

    // Construct quad strips along track spline
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const leftPt = s.position.clone().addScaledVector(s.right, -halfWidth);
      const rightPt = s.position.clone().addScaledVector(s.right, halfWidth);

      vertices.push(leftPt.x, leftPt.y + 0.02, leftPt.z);
      vertices.push(rightPt.x, rightPt.y + 0.02, rightPt.z);

      const v = (s.distance / 12.0) % 1.0;
      uvs.push(0, v);
      uvs.push(1, v);

      normals.push(s.normal.x, s.normal.y, s.normal.z);
      normals.push(s.normal.x, s.normal.y, s.normal.z);

      if (i < samples.length - 1) {
        const i0 = i * 2;
        const i1 = i0 + 1;
        const i2 = (i + 1) * 2;
        const i3 = i2 + 1;

        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
      } else {
        // Connect loop back to start
        const i0 = i * 2;
        const i1 = i0 + 1;
        const i2 = 0;
        const i3 = 1;
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    roadGeo.setIndex(indices);

    const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
    roadMesh.receiveShadow = true;
    root.add(roadMesh);

    // --- 2. CURBS / RUMBLE STRIPS (Red & White alternating) ---
    TrackBuilder.buildCurbs(root, samples, halfWidth);

    // --- 3. SAFETY BARRIERS / GUARD RAILS ---
    TrackBuilder.buildBarriers(root, samples, halfWidth, trackDef.barrierHeight || 1.6);

    // --- 4. START / FINISH GANTRY & GRID MARKINGS ---
    TrackBuilder.buildStartFinish(root, samples[0], roadWidth);

    // --- 5. THEMED SCENERY & SURROUNDINGS ---
    TrackBuilder.buildScenery(root, trackDef, samples, roadWidth);

    return {
      root,
      trackData,
      roadMaterial
    };
  }

  static createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Rich dark asphalt base
    ctx.fillStyle = '#22252e';
    ctx.fillRect(0, 0, 512, 512);

    // Procedural asphalt stone aggregates & noise
    for (let i = 0; i < 7000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(40 + Math.random() * 35);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Racing line tire rubber wear grooves (dark rubber deposited by tires)
    ctx.fillStyle = 'rgba(12, 14, 18, 0.45)';
    ctx.fillRect(95, 0, 80, 512);
    ctx.fillRect(337, 0, 80, 512);

    // Outer Solid Bright White Road Boundaries
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 0, 12, 512);
    ctx.fillRect(512 - 26, 0, 12, 512);

    // Center Vibrant Amber/Yellow Dashed Dividing Line
    ctx.fillStyle = '#f59e0b';
    const dashLength = 46;
    const dashGap = 26;
    for (let y = 0; y < 512; y += dashLength + dashGap) {
      ctx.fillRect(256 - 5, y, 10, dashLength);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createSponsorBannerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Barrier sponsor banners in repeating blocks
    const sponsors = [
      { name: 'TURBO RUSH', bg: '#090d16', color: '#00e5ff', sub: 'CHAMPIONSHIP', subColor: '#fde047' },
      { name: 'PIRELLI', bg: '#d90429', color: '#ffd000', sub: 'P ZERO RACING', subColor: '#ffffff' },
      { name: 'BREMBO', bg: '#dc2626', color: '#ffffff', sub: 'BRAKE SYSTEMS', subColor: '#fecdd3' },
      { name: 'SHELL', bg: '#f59e0b', color: '#b91c1c', sub: 'V-POWER NITRO', subColor: '#1e293b' },
      { name: 'MOBIL 1', bg: '#1e3a8a', color: '#ffffff', sub: 'MOTOR OIL', subColor: '#ef4444' },
      { name: 'APEX GT', bg: '#047857', color: '#a7f3d0', sub: 'PERFORMANCE', subColor: '#ffffff' }
    ];

    const blockWidth = canvas.width / sponsors.length;

    sponsors.forEach((sp, idx) => {
      const bx = idx * blockWidth;
      // Background block
      ctx.fillStyle = sp.bg;
      ctx.fillRect(bx, 0, blockWidth, 128);

      // Top and bottom checkered accent stripes
      const checkSize = 8;
      for (let cx = 0; cx < blockWidth; cx += checkSize * 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx + cx, 0, checkSize, 6);
        ctx.fillRect(bx + cx + checkSize, 122, checkSize, 6);
        ctx.fillStyle = '#111111';
        ctx.fillRect(bx + cx + checkSize, 0, checkSize, 6);
        ctx.fillRect(bx + cx, 122, checkSize, 6);
      }

      // Vertical dividing border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(bx + blockWidth - 2, 0, 2, 128);

      // Sponsor Title Text
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = sp.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sp.name, bx + blockWidth * 0.5, 52);

      // Subtitle / Tagline
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = sp.subColor;
      ctx.fillText(sp.sub, bx + blockWidth * 0.5, 92);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  static createBuildingWindowTexture(paletteIndex = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Concrete facade background
    const bgColors = ['#111827', '#1e293b', '#0f172a', '#18181b'];
    ctx.fillStyle = bgColors[paletteIndex % bgColors.length];
    ctx.fillRect(0, 0, 256, 512);

    // Office window grid
    const cols = 8;
    const rows = 20;
    const winWidth = 22;
    const winHeight = 16;
    const padX = (256 - (cols * winWidth)) / (cols + 1);
    const padY = (512 - (rows * winHeight)) / (rows + 1);

    const warmColors = ['#fef08a', '#fde047', '#fed7aa', '#ffffff'];
    const coolColors = ['#38bdf8', '#7dd3fc', '#a5f3fc', '#e0f2fe'];
    const unlitColors = ['#090d16', '#030712', '#0f172a', '#1e293b'];

    for (let r = 0; r < rows; r++) {
      // Horizontal spandrel line
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, r * (winHeight + padY), 256, 2);

      for (let c = 0; c < cols; c++) {
        const wx = padX + c * (winWidth + padX);
        const wy = padY + r * (winHeight + padY);

        const rand = Math.random();
        if (rand > 0.45) {
          // Lit window
          const colorList = (paletteIndex % 2 === 0) ? warmColors : coolColors;
          ctx.fillStyle = colorList[Math.floor(Math.random() * colorList.length)];
          ctx.fillRect(wx, wy, winWidth, winHeight);
        } else {
          // Dark unlit office window
          ctx.fillStyle = unlitColors[Math.floor(Math.random() * unlitColors.length)];
          ctx.fillRect(wx, wy, winWidth, winHeight);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static buildCurbs(root, samples, halfWidth) {
    // Alternating red/white curbs on outer and inner edges
    const curbWidth = 0.9;
    const curbHeight = 0.12;

    const curbMat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
      vertexColors: true
    });

    const curbGeo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const indices = [];

    const redColor = new THREE.Color(0xd90429);
    const whiteColor = new THREE.Color(0xffffff);

    // Left and Right curbs
    for (let side = -1; side <= 1; side += 2) {
      const sideBaseIdx = positions.length / 3;

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const innerX = s.position.clone().addScaledVector(s.right, side * halfWidth);
        const outerX = s.position.clone().addScaledVector(s.right, side * (halfWidth + curbWidth));

        positions.push(innerX.x, innerX.y + 0.03, innerX.z);
        positions.push(outerX.x, outerX.y + curbHeight, outerX.z);

        // Pattern alternating every few meters
        const pattern = Math.floor(s.distance / 2.5) % 2 === 0;
        const col = pattern ? redColor : whiteColor;

        colors.push(col.r, col.g, col.b);
        colors.push(col.r, col.g, col.b);

        const currentIdx = sideBaseIdx + i * 2;
        const nextIdx = (i < samples.length - 1) ? currentIdx + 2 : sideBaseIdx;

        indices.push(currentIdx, currentIdx + 1, nextIdx);
        indices.push(currentIdx + 1, nextIdx + 1, nextIdx);
      }
    }

    curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    curbGeo.setIndex(indices);
    curbGeo.computeVertexNormals();

    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.receiveShadow = true;
    root.add(curbMesh);
  }

  static buildBarriers(root, samples, halfWidth, barrierHeight) {
    const barrierOffset = 1.0;
    const sponsorTex = TrackBuilder.createSponsorBannerTexture();
    const barrierMat = new THREE.MeshStandardMaterial({
      map: sponsorTex,
      metalness: 0.35,
      roughness: 0.55
    });

    for (let side = -1; side <= 1; side += 2) {
      const barrierGeo = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const basePt = s.position.clone().addScaledVector(s.right, side * (halfWidth + barrierOffset));
        const topPt = basePt.clone().add(new THREE.Vector3(0, barrierHeight, 0));

        positions.push(basePt.x, basePt.y, basePt.z);
        positions.push(topPt.x, topPt.y, topPt.z);

        // UV mapping along barrier length (sponsor banner repeats every 14m)
        const u = s.distance / 14.0;
        uvs.push(u, 0);
        uvs.push(u, 1);

        const currentIdx = i * 2;
        const nextIdx = (i < samples.length - 1) ? currentIdx + 2 : 0;

        if (side === 1) {
          indices.push(currentIdx, currentIdx + 1, nextIdx);
          indices.push(currentIdx + 1, nextIdx + 1, nextIdx);
        } else {
          indices.push(currentIdx, nextIdx, currentIdx + 1);
          indices.push(currentIdx + 1, nextIdx, nextIdx + 1);
        }
      }

      barrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      barrierGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      barrierGeo.setIndex(indices);
      barrierGeo.computeVertexNormals();

      const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
      barrierMesh.castShadow = false;
      barrierMesh.receiveShadow = true;
      root.add(barrierMesh);
    }
  }

  static buildStartFinish(root, startSample, roadWidth) {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.copy(startSample.position);
    gantryGroup.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0),
        startSample.tangent,
        new THREE.Vector3(0, 1, 0)
      )
    );

    const span = roadWidth + 5.0;
    const height = 7.5;

    // Truss uprights (Left and Right)
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.3 });
    const postGeo = new THREE.BoxGeometry(0.6, height, 0.6);

    const leftPost = new THREE.Mesh(postGeo, steelMat);
    leftPost.position.set(-span * 0.5, height * 0.5, 0);
    gantryGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, steelMat);
    rightPost.position.set(span * 0.5, height * 0.5, 0);
    gantryGroup.add(rightPost);

    // Overhead crossbeam
    const beamGeo = new THREE.BoxGeometry(span, 1.2, 0.8);
    const beam = new THREE.Mesh(beamGeo, steelMat);
    beam.position.set(0, height, 0);
    gantryGroup.add(beam);

    // Electronic Start Banner
    const bannerGeo = new THREE.PlaneGeometry(span * 0.75, 1.0);
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d');
    bctx.fillStyle = '#0f172a';
    bctx.fillRect(0, 0, 512, 128);
    bctx.strokeStyle = '#00e5ff';
    bctx.lineWidth = 6;
    bctx.strokeRect(6, 6, 500, 116);
    bctx.fillStyle = '#00e5ff';
    bctx.font = 'bold 44px monospace';
    bctx.textAlign = 'center';
    bctx.fillText('TURBO RUSH 3D', 256, 56);
    bctx.fillStyle = '#f8fafc';
    bctx.font = 'bold 28px monospace';
    bctx.fillText('START / FINISH', 256, 100);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.set(0, height - 0.2, 0.42);
    gantryGroup.add(bannerMesh);

    // Checkered Finish Line decal on road
    const checkCanvas = document.createElement('canvas');
    checkCanvas.width = 256;
    checkCanvas.height = 64;
    const cctx = checkCanvas.getContext('2d');
    const sq = 32;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 8; c++) {
        cctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        cctx.fillRect(c * sq, r * sq, sq, sq);
      }
    }
    const checkTex = new THREE.CanvasTexture(checkCanvas);
    checkTex.repeat.set(roadWidth / 4, 1);
    checkTex.wrapS = THREE.RepeatWrapping;

    const checkGeo = new THREE.PlaneGeometry(roadWidth * 0.98, 3.5);
    const checkMat = new THREE.MeshBasicMaterial({ map: checkTex });
    const checkMesh = new THREE.Mesh(checkGeo, checkMat);
    checkMesh.rotation.x = -Math.PI / 2;
    checkMesh.position.set(0, 0.05, 0);
    gantryGroup.add(checkMesh);

    root.add(gantryGroup);
  }

  static buildScenery(root, trackDef, samples, roadWidth) {
    const theme = trackDef.theme;

    if (theme === 'city') {
      TrackBuilder.buildCityScenery(root, samples, roadWidth);
    } else if (theme === 'mountain') {
      TrackBuilder.buildMountainScenery(root, samples, roadWidth);
    } else if (theme === 'desert') {
      TrackBuilder.buildDesertScenery(root, samples, roadWidth);
    } else if (theme === 'coastal') {
      TrackBuilder.buildCoastalScenery(root, samples, roadWidth);
    }
  }

  static buildCityScenery(root, samples, roadWidth) {
    const windowTexA = TrackBuilder.createBuildingWindowTexture(0);
    const windowTexB = TrackBuilder.createBuildingWindowTexture(1);
    const windowTexC = TrackBuilder.createBuildingWindowTexture(2);
    const windowTextures = [windowTexA, windowTexB, windowTexC];

    const bldgColors = [0x1e293b, 0x0f172a, 0x18181b, 0x1e1b4b, 0x022c22, 0x172554];
    const bldgMats = windowTextures.map((tex, idx) => new THREE.MeshStandardMaterial({
      color: bldgColors[idx % bldgColors.length],
      map: tex,
      roughness: 0.35,
      metalness: 0.65
    }));

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.3
    });

    const antennaMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2
    });

    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xff0044
    });

    const neonColors = [0x00e5ff, 0xff0055, 0x10b981, 0xf59e0b];
    const neonMats = neonColors.map(nc => new THREE.MeshBasicMaterial({ color: nc }));

    // Place buildings along the perimeter of the track
    const step = 6;
    for (let i = 0; i < samples.length; i += step) {
      const s = samples[i];
      [-1, 1].forEach((side, sideIdx) => {
        const dist = roadWidth * 0.5 + 15 + Math.random() * 26;
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        const height = 35 + Math.random() * 85;
        const width = 18 + Math.random() * 16;
        const depth = 18 + Math.random() * 16;

        const bldgMat = bldgMats[(i + sideIdx) % bldgMats.length];
        const bldgGeo = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeo, bldgMat);
        bldg.position.set(pos.x, pos.y + height * 0.5, pos.z);
        bldg.castShadow = false;
        bldg.receiveShadow = true;
        root.add(bldg);

        // Rooftop mechanical penthouse / HVAC housing
        const roofGeo = new THREE.BoxGeometry(width * 0.5, 4.0, depth * 0.5);
        const roofBox = new THREE.Mesh(roofGeo, roofMat);
        roofBox.position.set(pos.x, pos.y + height + 2.0, pos.z);
        root.add(roofBox);

        // Rooftop antenna spire with blinking aircraft warning beacon
        if (Math.random() > 0.3) {
          const spireHeight = 8 + Math.random() * 12;
          const spireGeo = new THREE.CylinderGeometry(0.15, 0.35, spireHeight, 6);
          const spire = new THREE.Mesh(spireGeo, antennaMat);
          spire.position.set(pos.x, pos.y + height + 4.0 + spireHeight * 0.5, pos.z);
          root.add(spire);

          const beaconGeo = new THREE.SphereGeometry(0.6, 6, 6);
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(pos.x, pos.y + height + 4.0 + spireHeight, pos.z);
          root.add(beacon);
        }

        // Sleek vertical architectural neon accent strip facing the road
        if (Math.random() > 0.5) {
          const neonMat = neonMats[(i + sideIdx) % neonMats.length];
          const stripGeo = new THREE.BoxGeometry(0.6, height * 0.7, 0.6);
          const strip = new THREE.Mesh(stripGeo, neonMat);
          const stripPos = pos.clone().addScaledVector(s.right, -side * (width * 0.48));
          strip.position.set(stripPos.x, pos.y + height * 0.5, stripPos.z);
          root.add(strip);
        }
      });

      // Streetlights
      if (i % 10 === 0) {
        TrackBuilder.buildStreetLight(root, s, roadWidth * 0.5 + 2.5);
      }
    }
  }

  static buildMountainScenery(root, samples, roadWidth) {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.1
    });

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.8,
      metalness: 0.05
    });

    // Mountain rock peaks and pine trees
    for (let i = 0; i < samples.length; i += 6) {
      const s = samples[i];
      [-1, 1].forEach((side) => {
        const dist = roadWidth * 0.5 + 14 + Math.random() * 40;
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        // Cliffs
        const cliffHeight = 40 + Math.random() * 60;
        const cliffGeo = new THREE.ConeGeometry(25 + Math.random() * 20, cliffHeight, 6);
        const cliff = new THREE.Mesh(cliffGeo, rockMat);
        cliff.position.set(pos.x, pos.y + cliffHeight * 0.4, pos.z);
        cliff.castShadow = false;
        cliff.receiveShadow = true;
        root.add(cliff);

        // Pine trees
        if (Math.random() > 0.4) {
          const treePos = s.position.clone().addScaledVector(s.right, side * (roadWidth * 0.5 + 4 + Math.random() * 10));
          const treeGroup = TrackBuilder.buildPineTree(foliageMat);
          treeGroup.position.set(treePos.x, treePos.y, treePos.z);
          root.add(treeGroup);
        }
      });
    }
  }

  static buildDesertScenery(root, samples, roadWidth) {
    const mesaMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.95,
      metalness: 0.05
    });

    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7
    });

    // Red rock canyon mesas
    for (let i = 0; i < samples.length; i += 8) {
      const s = samples[i];
      [-1, 1].forEach((side) => {
        const dist = roadWidth * 0.5 + 24 + Math.random() * 50;
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        const mesaHeight = 25 + Math.random() * 35;
        const mesaGeo = new THREE.CylinderGeometry(20 + Math.random() * 15, 30 + Math.random() * 20, mesaHeight, 7);
        const mesa = new THREE.Mesh(mesaGeo, mesaMat);
        mesa.position.set(pos.x, pos.y + mesaHeight * 0.5, pos.z);
        mesa.castShadow = false;
        mesa.receiveShadow = true;
        root.add(mesa);

        // Cactus
        if (Math.random() > 0.6) {
          const cPos = s.position.clone().addScaledVector(s.right, side * (roadWidth * 0.5 + 4 + Math.random() * 8));
          const cactusGeo = new THREE.CylinderGeometry(0.35, 0.4, 4.5, 6);
          const cactus = new THREE.Mesh(cactusGeo, cactusMat);
          cactus.position.set(cPos.x, cPos.y + 2.25, cPos.z);
          root.add(cactus);
        }
      });
    }
  }

  static buildCoastalScenery(root, samples, roadWidth) {
    // Ocean plane
    const oceanGeo = new THREE.PlaneGeometry(1600, 1600);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.85
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.y = -1.2;
    root.add(oceanMesh);

    // Palm Trees along coastal boulevard
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    for (let i = 0; i < samples.length; i += 7) {
      const s = samples[i];
      const side = (i % 2 === 0) ? 1 : -1;
      const pos = s.position.clone().addScaledVector(s.right, side * (roadWidth * 0.5 + 4));
      const palm = TrackBuilder.buildPalmTree(palmMat);
      palm.position.set(pos.x, pos.y, pos.z);
      root.add(palm);
    }
  }

  static buildStreetLight(root, sample, offsetDist) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const pos = sample.position.clone().addScaledVector(sample.right, offsetDist);
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const pole = new THREE.Mesh(poleGeo, postMat);
    pole.position.set(pos.x, pos.y + 3.75, pos.z);
    root.add(pole);

    const armGeo = new THREE.BoxGeometry(2.2, 0.12, 0.12);
    const arm = new THREE.Mesh(armGeo, postMat);
    arm.position.set(pos.x - (sample.right.x * 1.1), pos.y + 7.5, pos.z - (sample.right.z * 1.1));
    root.add(arm);

    const bulbGeo = new THREE.SphereGeometry(0.38, 8, 8);
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    const bulbPos = new THREE.Vector3(pos.x - (sample.right.x * 2.0), pos.y + 7.4, pos.z - (sample.right.z * 2.0));
    bulb.position.copy(bulbPos);
    root.add(bulb);
  }

  static buildPineTree(foliageMat) {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.25;
    tree.add(trunk);

    // 3 tiers of foliage cones
    for (let tier = 0; tier < 3; tier++) {
      const coneGeo = new THREE.ConeGeometry(2.4 - tier * 0.5, 2.8, 7);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = 2.4 + tier * 1.6;
      cone.castShadow = false;
      cone.receiveShadow = true;
      tree.add(cone);
    }
    return tree;
  }

  static buildPalmTree(foliageMat) {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 7.0, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = (Math.random() - 0.5) * 0.15; // natural slight lean
    tree.add(trunk);

    // Palm fronds
    for (let f = 0; f < 6; f++) {
      const frondGeo = new THREE.BoxGeometry(0.5, 0.08, 3.2);
      const frond = new THREE.Mesh(frondGeo, foliageMat);
      frond.position.set(0, 7.0, 0);
      frond.rotation.y = (f / 6) * Math.PI * 2;
      frond.rotation.x = 0.45; // drooping outward
      tree.add(frond);
    }
    return tree;
  }
}

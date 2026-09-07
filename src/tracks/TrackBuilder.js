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

    // --- 2b. CONCRETE SIDEWALKS (Urban & Coastal circuits) ---
    TrackBuilder.buildSidewalks(root, samples, halfWidth, trackDef);

    // --- 3. SAFETY BARRIERS / GUARD RAILS ---
    TrackBuilder.buildBarriers(root, samples, halfWidth, trackDef.barrierHeight || 1.6);

    // --- 4. START / FINISH GANTRY & GRID MARKINGS ---
    TrackBuilder.buildStartFinish(root, samples[0], roadWidth);

    // --- 4b. OVERHEAD HIGHWAY DIRECTIONAL GANTRIES ---
    TrackBuilder.buildHighwayGantries(root, samples, roadWidth, trackDef);

    // --- 4c. 3D ENCLOSED TUNNELS WITH SODIUM & NEON CEILING LIGHTS ---
    TrackBuilder.buildTunnels(root, samples, roadWidth, trackDef);

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
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Metallic curtain-wall facade background
    const bgColors = ['#0a0f1d', '#0f172a', '#18181b', '#1e1b4b'];
    ctx.fillStyle = bgColors[paletteIndex % bgColors.length];
    ctx.fillRect(0, 0, 512, 1024);

    // Subtle vertical aluminum mullions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 0; x < 512; x += 16) {
      ctx.fillRect(x, 0, 1, 1024);
    }

    // High-density office window grid
    const cols = 12;
    const rows = 28;
    const winWidth = 28;
    const winHeight = 22;
    const padX = (512 - (cols * winWidth)) / (cols + 1);
    const padY = (1024 - (rows * winHeight)) / (rows + 1);

    const warmColors = ['#fef08a', '#fde047', '#fed7aa', '#ffffff', '#ffedd5'];
    const coolColors = ['#38bdf8', '#7dd3fc', '#a5f3fc', '#e0f2fe', '#67e8f9'];
    const unlitColors = ['#060a12', '#0a0f1d', '#0f172a', '#111827'];

    for (let r = 0; r < rows; r++) {
      // Horizontal concrete/steel floor dividing slab
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, r * (winHeight + padY), 512, 4);

      for (let c = 0; c < cols; c++) {
        const wx = padX + c * (winWidth + padX);
        const wy = padY + r * (winHeight + padY);

        const rand = Math.random();
        if (rand > 0.42) {
          // Lit office interior
          const colorList = (paletteIndex % 2 === 0) ? warmColors : coolColors;
          ctx.fillStyle = colorList[Math.floor(Math.random() * colorList.length)];
          ctx.fillRect(wx, wy, winWidth, winHeight);

          // Subtle internal office desk/blind shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fillRect(wx, wy + winHeight * 0.55, winWidth, winHeight * 0.45);
        } else {
          // Dark tinted reflective glass
          ctx.fillStyle = unlitColors[Math.floor(Math.random() * unlitColors.length)];
          ctx.fillRect(wx, wy, winWidth, winHeight);
        }

        // Window frame outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, winWidth, winHeight);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createStorefrontTexture(paletteIndex = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, 512, 256);

    // Marble entrance pillars
    ctx.fillStyle = '#334155';
    for (let x = 0; x < 512; x += 128) {
      ctx.fillRect(x, 0, 16, 256);
    }

    // Large glowing showroom display windows
    const brands = ['APEX MOTORS', 'TURBO GT CAFE', 'GRAND PRIX LOUNGE', 'CYBER DYNAMICS'];
    for (let i = 0; i < 4; i++) {
      const wx = 20 + i * 128;
      // Glowing warm showroom interior
      const grad = ctx.createLinearGradient(wx, 60, wx, 240);
      grad.addColorStop(0, '#fde68a');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, 70, 96, 170);

      // Glass reflection streak
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(wx, 240);
      ctx.lineTo(wx + 30, 240);
      ctx.lineTo(wx + 75, 70);
      ctx.lineTo(wx + 45, 70);
      ctx.closePath();
      ctx.fill();

      // Storefront Marquee Signboard
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wx - 2, 20, 100, 36);
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx - 2, 20, 100, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(brands[i % brands.length], wx + 48, 42);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  static createHelipadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Tarmac pad
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);

    // Yellow outer safety circle
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 105, 0, Math.PI * 2);
    ctx.stroke();

    // Red warning dots
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const rx = 128 + Math.cos(a) * 115;
      const ry = 128 + Math.sin(a) * 115;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bold White 'H'
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 128, 130);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createHighwayGantryTexture(trackDef, gantryIdx, side) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const theme = trackDef.theme || 'city';
    const isTokyo = theme === 'tokyo';

    // Signboard background: Green for expressway, Blue for metro/coastal
    ctx.fillStyle = isTokyo ? '#0f172a' : (side === 0 ? '#047857' : '#1e3a8a');
    ctx.fillRect(0, 0, 512, 256);

    // Inner White Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    // Theme-specific signs
    let mainText = 'DOWNTOWN GP';
    let subText = 'METRO SPEEDWAY 2.4 KM';
    let exitText = 'EXIT 4';

    if (isTokyo) {
      if (side === 0) {
        mainText = '首都高 [11] 台場線';
        subText = 'SHUTO ODAIBA EXP';
        exitText = '出口 12';
      } else {
        mainText = '湾岸線 / WANGAN';
        subText = 'RAINBOW TUNNEL 800M';
        exitText = '本線';
      }
    } else if (theme === 'coastal') {
      mainText = side === 0 ? 'RIVIERA BRIDGE' : 'MARINA BEACHWAY';
      subText = side === 0 ? 'OCEAN CAUSEWAY 3.5 KM' : 'BEACH HARBOR EXIT';
      exitText = 'EXIT 2';
    } else if (theme === 'mountain') {
      mainText = side === 0 ? 'TOUGE SUMMIT' : 'ROCK TUNNEL PASS';
      subText = 'ALPINE VISTA / HAIRPINS';
      exitText = 'PEAK';
    } else if (theme === 'desert') {
      mainText = side === 0 ? 'CANYON SPEEDWAY' : 'MESA STRAIGHTAWAY';
      subText = 'TOP SPEED CHECK 280 KM/H';
      exitText = 'SUPER GP';
    } else if (theme === 'forest') {
      mainText = side === 0 ? 'REDWOOD STAGE' : 'TIMBER PASS RALLY';
      subText = 'FOREST TRAIL RIDGE';
      exitText = 'SECTOR 2';
    }

    // Top Exit Badge
    ctx.fillStyle = '#facc15';
    ctx.fillRect(20, 20, 110, 36);
    ctx.fillStyle = '#030712';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(exitText, 75, 45);

    // Main Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = isTokyo ? 'bold 38px sans-serif' : 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mainText, 256, 120);

    // Subtitle
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(subText, 256, 170);

    // Downward Lane Arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(240, 195);
    ctx.lineTo(272, 195);
    ctx.lineTo(256, 230);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
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

  static buildSidewalks(root, samples, halfWidth, trackDef) {
    if (!['city', 'tokyo', 'coastal'].includes(trackDef.theme)) return;

    const swWidth = 3.8;
    const swHeight = 0.16;
    const curbOffset = 0.9;

    const swMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.85,
      metalness: 0.1
    });

    for (let side = -1; side <= 1; side += 2) {
      const swGeo = new THREE.BufferGeometry();
      const positions = [];
      const indices = [];

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const innerPt = s.position.clone().addScaledVector(s.right, side * (halfWidth + curbOffset));
        const outerPt = s.position.clone().addScaledVector(s.right, side * (halfWidth + curbOffset + swWidth));

        positions.push(innerPt.x, innerPt.y + swHeight, innerPt.z);
        positions.push(outerPt.x, outerPt.y + swHeight, outerPt.z);

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

      swGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      swGeo.setIndex(indices);
      swGeo.computeVertexNormals();

      const swMesh = new THREE.Mesh(swGeo, swMat);
      swMesh.receiveShadow = true;
      root.add(swMesh);
    }
  }

  static buildHighwayGantries(root, samples, roadWidth, trackDef) {
    const gantryIndices = [
      Math.floor(samples.length * 0.28),
      Math.floor(samples.length * 0.65)
    ];

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
    const span = roadWidth + 5.5;
    const height = 7.8;

    gantryIndices.forEach((idx, gIdx) => {
      const s = samples[idx];
      if (!s) return;

      const gantry = new THREE.Group();
      gantry.position.copy(s.position);
      gantry.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          s.tangent,
          new THREE.Vector3(0, 1, 0)
        )
      );

      // Posts
      const postGeo = new THREE.BoxGeometry(0.5, height, 0.5);
      const lp = new THREE.Mesh(postGeo, steelMat);
      lp.position.set(-span * 0.5, height * 0.5, 0);
      gantry.add(lp);

      const rp = new THREE.Mesh(postGeo, steelMat);
      rp.position.set(span * 0.5, height * 0.5, 0);
      gantry.add(rp);

      // Overhead cross-truss
      const beamGeo = new THREE.BoxGeometry(span, 0.9, 0.6);
      const beam = new THREE.Mesh(beamGeo, steelMat);
      beam.position.set(0, height, 0);
      gantry.add(beam);

      // Directional Overhead Signboards
      const signGeo = new THREE.PlaneGeometry(span * 0.42, 2.0);
      const signTexLeft = TrackBuilder.createHighwayGantryTexture(trackDef, gIdx, 0);
      const signMatLeft = new THREE.MeshBasicMaterial({ map: signTexLeft });
      const signMeshLeft = new THREE.Mesh(signGeo, signMatLeft);
      signMeshLeft.position.set(-span * 0.24, height - 0.4, 0.32);
      gantry.add(signMeshLeft);

      const signTexRight = TrackBuilder.createHighwayGantryTexture(trackDef, gIdx, 1);
      const signMatRight = new THREE.MeshBasicMaterial({ map: signTexRight });
      const signMeshRight = new THREE.Mesh(signGeo, signMatRight);
      signMeshRight.position.set(span * 0.24, height - 0.4, 0.32);
      gantry.add(signMeshRight);

      root.add(gantry);
    });
  }

  static buildTunnels(root, samples, roadWidth, trackDef) {
    if (!trackDef.features?.tunnelIndices || trackDef.features.tunnelIndices.length === 0) return;

    const cpCount = trackDef.controlPoints.length;
    const isTokyo = trackDef.theme === 'tokyo';
    const isMountain = trackDef.theme === 'mountain';

    const tunnelRadius = roadWidth * 0.58;
    const archSegments = 8;

    const wallColor = isMountain ? 0x27272a : isTokyo ? 0x0f172a : 0x1e293b;
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: isMountain ? 0.95 : 0.45,
      metalness: isMountain ? 0.05 : 0.6,
      side: THREE.BackSide
    });

    const portalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.3
    });

    const tubeLightColor = isMountain ? 0xf59e0b : isTokyo ? 0x00e5ff : 0xf8fafc;
    const tubeLightMat = new THREE.MeshBasicMaterial({ color: tubeLightColor });

    trackDef.features.tunnelIndices.forEach(([cpStart, cpEnd]) => {
      const startIdx = Math.floor((cpStart / cpCount) * samples.length);
      const endIdx = Math.floor((cpEnd / cpCount) * samples.length);

      const positions = [];
      const indices = [];

      const count = endIdx >= startIdx ? (endIdx - startIdx) : (samples.length - startIdx + endIdx);
      if (count < 2) return;

      for (let step = 0; step <= count; step++) {
        const sIdx = (startIdx + step) % samples.length;
        const s = samples[sIdx];

        for (let a = 0; a <= archSegments; a++) {
          const theta = (a / archSegments) * Math.PI;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);

          const pt = s.position.clone()
            .addScaledVector(s.right, -cos * tunnelRadius)
            .add(new THREE.Vector3(0, sin * tunnelRadius * 0.95 + 0.4, 0));

          positions.push(pt.x, pt.y, pt.z);
        }

        if (step > 0) {
          const prevSlice = (step - 1) * (archSegments + 1);
          const currSlice = step * (archSegments + 1);

          for (let a = 0; a < archSegments; a++) {
            const p0 = prevSlice + a;
            const p1 = prevSlice + a + 1;
            const c0 = currSlice + a;
            const c1 = currSlice + a + 1;

            indices.push(p0, c0, p1);
            indices.push(p1, c0, c1);
          }
        }

        if (step % 5 === 0) {
          const lightGeo = new THREE.BoxGeometry(0.35, 0.15, 4.0);
          const lightMesh = new THREE.Mesh(lightGeo, tubeLightMat);
          lightMesh.position.set(s.position.x, s.position.y + tunnelRadius * 0.92, s.position.z);
          lightMesh.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
              new THREE.Vector3(0, 0, 0),
              s.tangent,
              new THREE.Vector3(0, 1, 0)
            )
          );
          root.add(lightMesh);
        }
      }

      const tunnelGeo = new THREE.BufferGeometry();
      tunnelGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      tunnelGeo.setIndex(indices);
      tunnelGeo.computeVertexNormals();

      const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
      root.add(tunnelMesh);

      [startIdx, endIdx].forEach((pIdx) => {
        const ps = samples[pIdx];
        if (!ps) return;

        const portalGroup = new THREE.Group();
        portalGroup.position.copy(ps.position);
        portalGroup.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().lookAt(
            new THREE.Vector3(0, 0, 0),
            ps.tangent,
            new THREE.Vector3(0, 1, 0)
          )
        );

        const pHeight = tunnelRadius + 1.5;
        const colGeo = new THREE.BoxGeometry(1.8, pHeight, 2.5);
        const leftCol = new THREE.Mesh(colGeo, portalMat);
        leftCol.position.set(-tunnelRadius - 0.9, pHeight * 0.5, 0);
        portalGroup.add(leftCol);

        const rightCol = new THREE.Mesh(colGeo, portalMat);
        rightCol.position.set(tunnelRadius + 0.9, pHeight * 0.5, 0);
        portalGroup.add(rightCol);

        const lintelGeo = new THREE.BoxGeometry(tunnelRadius * 2 + 3.6, 2.0, 2.5);
        const lintel = new THREE.Mesh(lintelGeo, portalMat);
        lintel.position.set(0, pHeight, 0);
        portalGroup.add(lintel);

        root.add(portalGroup);
      });
    });
  }

  static buildSkyscraper(root, pos, sample, side, type, bldgMats, storefrontMat, roofMat, antennaMat, beaconMat, neonMats, helipadTex, neonTexList, seed) {
    const baseMat = bldgMats[seed % bldgMats.length];

    if (type === 0) {
      // 1. STEPPED SUPERTALL SKYSCRAPER
      const baseWidth = 28 + (seed % 8);
      const baseDepth = 28 + (seed % 8);
      const baseHeight = 16;

      const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
      const baseMesh = new THREE.Mesh(baseGeo, storefrontMat);
      baseMesh.position.set(pos.x, pos.y + baseHeight * 0.5, pos.z);
      root.add(baseMesh);

      const canopyGeo = new THREE.BoxGeometry(12, 0.4, 6);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      const canopyOffset = pos.clone().addScaledVector(sample.right, -side * (baseWidth * 0.5 + 3));
      canopy.position.set(canopyOffset.x, pos.y + 4.5, canopyOffset.z);
      root.add(canopy);

      const midWidth = baseWidth * 0.78;
      const midDepth = baseDepth * 0.78;
      const midHeight = 45 + (seed % 40);
      const midGeo = new THREE.BoxGeometry(midWidth, midHeight, midDepth);
      const midMesh = new THREE.Mesh(midGeo, baseMat);
      midMesh.position.set(pos.x, pos.y + baseHeight + midHeight * 0.5, pos.z);
      root.add(midMesh);

      const upWidth = midWidth * 0.72;
      const upDepth = midDepth * 0.72;
      const upHeight = 35 + (seed % 30);
      const upGeo = new THREE.BoxGeometry(upWidth, upHeight, upDepth);
      const upMesh = new THREE.Mesh(upGeo, baseMat);
      upMesh.position.set(pos.x, pos.y + baseHeight + midHeight + upHeight * 0.5, pos.z);
      root.add(upMesh);

      const crownGeo = new THREE.BoxGeometry(upWidth + 1.2, 1.6, upDepth + 1.2);
      const crownMat = neonMats[seed % neonMats.length];
      const crown = new THREE.Mesh(crownGeo, crownMat);
      const totalH = baseHeight + midHeight + upHeight;
      crown.position.set(pos.x, pos.y + totalH + 0.8, pos.z);
      root.add(crown);

      const spireH = 16;
      const spireGeo = new THREE.CylinderGeometry(0.12, 0.4, spireH, 6);
      const spire = new THREE.Mesh(spireGeo, antennaMat);
      spire.position.set(pos.x, pos.y + totalH + 1.6 + spireH * 0.5, pos.z);
      root.add(spire);

      const beaconGeo = new THREE.SphereGeometry(0.7, 8, 8);
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(pos.x, pos.y + totalH + 1.6 + spireH, pos.z);
      root.add(beacon);

    } else if (type === 1) {
      // 2. CURVED GLASS CYLINDRICAL TOWER WITH HELIPAD
      const radius = 12 + (seed % 5);
      const height = 70 + (seed % 45);
      const cylGeo = new THREE.CylinderGeometry(radius, radius * 1.08, height, 20);
      const cylMat = new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? 0x0284c7 : 0x0f172a,
        metalness: 0.85,
        roughness: 0.15,
        map: baseMat.map
      });
      const cylMesh = new THREE.Mesh(cylGeo, cylMat);
      cylMesh.position.set(pos.x, pos.y + height * 0.5, pos.z);
      root.add(cylMesh);

      const finMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
      for (let f = 0; f < 4; f++) {
        const ang = (f / 4) * Math.PI * 2;
        const finGeo = new THREE.BoxGeometry(0.3, height, 1.8);
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.set(
          pos.x + Math.cos(ang) * (radius + 0.8),
          pos.y + height * 0.5,
          pos.z + Math.sin(ang) * (radius + 0.8)
        );
        fin.rotation.y = -ang;
        root.add(fin);
      }

      const heliGeo = new THREE.CircleGeometry(radius * 0.88, 20);
      const heliMat = new THREE.MeshBasicMaterial({ map: helipadTex });
      const heliMesh = new THREE.Mesh(heliGeo, heliMat);
      heliMesh.rotation.x = -Math.PI / 2;
      heliMesh.position.set(pos.x, pos.y + height + 0.1, pos.z);
      root.add(heliMesh);

    } else if (type === 2) {
      // 3. CYBERPUNK / HIGH-TECH ANGLED TOWER WITH NEON BILLBOARD
      const width = 24 + (seed % 8);
      const depth = 22 + (seed % 6);
      const height = 65 + (seed % 50);

      const towerGeo = new THREE.BoxGeometry(width, height, depth);
      const towerMesh = new THREE.Mesh(towerGeo, baseMat);
      towerMesh.position.set(pos.x, pos.y + height * 0.5, pos.z);
      root.add(towerMesh);

      const neonMat = neonMats[seed % neonMats.length];
      [-1, 1].forEach((corner) => {
        const stripGeo = new THREE.BoxGeometry(0.5, height, 0.5);
        const strip = new THREE.Mesh(stripGeo, neonMat);
        const sOffset = pos.clone()
          .addScaledVector(sample.right, -side * (width * 0.48))
          .add(new THREE.Vector3(corner * depth * 0.48, 0, 0));
        strip.position.set(sOffset.x, pos.y + height * 0.5, sOffset.z);
        root.add(strip);
      });

      if (neonTexList && neonTexList.length > 0) {
        const signTex = neonTexList[seed % neonTexList.length];
        const signMat = new THREE.MeshBasicMaterial({ map: signTex });
        const signGeo = new THREE.PlaneGeometry(16, 9);
        const signMesh = new THREE.Mesh(signGeo, signMat);
        const signOffset = pos.clone().addScaledVector(sample.right, -side * (width * 0.52));
        signMesh.position.set(signOffset.x, pos.y + 18 + (seed % 15), signOffset.z);
        signMesh.lookAt(sample.position.x, signMesh.position.y, sample.position.z);
        root.add(signMesh);
      }

    } else {
      // 4. COMMERCIAL PLAZA WITH LUXURY STOREFRONTS & ROOF TERRACE
      const width = 26 + (seed % 10);
      const depth = 20 + (seed % 8);
      const height = 36 + (seed % 20);

      const plazaGeo = new THREE.BoxGeometry(width, height, depth);
      const plazaMesh = new THREE.Mesh(plazaGeo, baseMat);
      plazaMesh.position.set(pos.x, pos.y + height * 0.5, pos.z);
      root.add(plazaMesh);

      const sfGeo = new THREE.BoxGeometry(width + 0.4, 10, depth + 0.4);
      const sfMesh = new THREE.Mesh(sfGeo, storefrontMat);
      sfMesh.position.set(pos.x, pos.y + 5, pos.z);
      root.add(sfMesh);

      const roofLedgeGeo = new THREE.BoxGeometry(width + 1.0, 1.2, depth + 1.0);
      const roofLedge = new THREE.Mesh(roofLedgeGeo, neonMats[seed % neonMats.length]);
      roofLedge.position.set(pos.x, pos.y + height + 0.6, pos.z);
      root.add(roofLedge);
    }
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
    } else if (theme === 'tokyo') {
      TrackBuilder.buildTokyoScenery(root, samples, roadWidth);
    } else if (theme === 'forest') {
      TrackBuilder.buildForestScenery(root, samples, roadWidth);
    }
  }

  static buildCityScenery(root, samples, roadWidth) {
    const windowTexA = TrackBuilder.createBuildingWindowTexture(0);
    const windowTexB = TrackBuilder.createBuildingWindowTexture(1);
    const windowTexC = TrackBuilder.createBuildingWindowTexture(2);
    const storefrontTex = TrackBuilder.createStorefrontTexture(0);
    const helipadTex = TrackBuilder.createHelipadTexture();

    const bldgColors = [0x1e293b, 0x0f172a, 0x18181b, 0x1e1b4b, 0x022c22, 0x172554];
    const bldgMats = [windowTexA, windowTexB, windowTexC].map((tex, idx) => new THREE.MeshStandardMaterial({
      color: bldgColors[idx % bldgColors.length],
      map: tex,
      roughness: 0.25,
      metalness: 0.8
    }));

    const storefrontMat = new THREE.MeshStandardMaterial({
      map: storefrontTex,
      roughness: 0.2,
      metalness: 0.4
    });

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.3 });
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    const neonColors = [0x00e5ff, 0xff0055, 0x10b981, 0xf59e0b];
    const neonMats = neonColors.map(nc => new THREE.MeshBasicMaterial({ color: nc }));

    // Place varied architecture along the circuit
    const step = 5;
    for (let i = 0; i < samples.length; i += step) {
      const s = samples[i];
      [-1, 1].forEach((side, sideIdx) => {
        const dist = roadWidth * 0.5 + 16 + ((i * 3 + sideIdx * 7) % 18);
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        const type = (Math.floor(i / step) + sideIdx) % 4;
        TrackBuilder.buildSkyscraper(
          root, pos, s, side, type,
          bldgMats, storefrontMat, roofMat, antennaMat, beaconMat, neonMats, helipadTex, null,
          i + sideIdx
        );
      });

      // Streetlights every 10 samples
      if (i % 10 === 0) {
        TrackBuilder.buildStreetLight(root, s, roadWidth * 0.5 + 2.5);
      }
    }
  }

  static buildMountainScenery(root, samples, roadWidth) {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.92,
      metalness: 0.08
    });

    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.95,
      metalness: 0.05
    });

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.8,
      metalness: 0.05
    });

    for (let i = 0; i < samples.length; i += 5) {
      const s = samples[i];
      [-1, 1].forEach((side, sideIdx) => {
        const dist = roadWidth * 0.5 + 13 + ((i * 5 + sideIdx * 9) % 35);
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        // Towering alpine rock peaks
        const cliffHeight = 45 + ((i * 7 + sideIdx * 13) % 70);
        const cliffRadius = 22 + ((i * 3) % 18);
        const cliffGeo = new THREE.ConeGeometry(cliffRadius, cliffHeight, 7);
        const cliff = new THREE.Mesh(cliffGeo, sideIdx === 0 ? rockMat : darkRockMat);
        cliff.position.set(pos.x, pos.y + cliffHeight * 0.38, pos.z);
        cliff.rotation.y = (i * 0.3) % (Math.PI * 2);
        cliff.castShadow = false;
        cliff.receiveShadow = true;
        root.add(cliff);

        // Pine trees clustered at base
        if (i % 3 === 0) {
          const treePos = s.position.clone().addScaledVector(s.right, side * (roadWidth * 0.5 + 4 + (i % 6)));
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

    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      roughness: 0.98,
      metalness: 0.02
    });

    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7
    });

    // Red rock canyon mesas & sandstone arches
    for (let i = 0; i < samples.length; i += 6) {
      const s = samples[i];
      [-1, 1].forEach((side, sideIdx) => {
        const dist = roadWidth * 0.5 + 22 + ((i * 6 + sideIdx * 11) % 45);
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        const mesaHeight = 28 + ((i * 4) % 36);
        const mesaGeo = new THREE.CylinderGeometry(18 + (i % 12), 28 + (i % 18), mesaHeight, 8);
        const mesa = new THREE.Mesh(mesaGeo, sideIdx === 0 ? mesaMat : sandMat);
        mesa.position.set(pos.x, pos.y + mesaHeight * 0.5, pos.z);
        mesa.rotation.y = (i * 0.4) % (Math.PI * 2);
        root.add(mesa);

        // Saguaro cacti
        if (i % 4 === 0) {
          const cPos = s.position.clone().addScaledVector(s.right, side * (roadWidth * 0.5 + 5 + (i % 7)));
          const cactusGeo = new THREE.CylinderGeometry(0.35, 0.45, 5.0, 6);
          const cactus = new THREE.Mesh(cactusGeo, cactusMat);
          cactus.position.set(cPos.x, cPos.y + 2.5, cPos.z);
          root.add(cactus);
        }
      });

      // Majestic freestanding sandstone arch across open canyons
      if (i === Math.floor(samples.length * 0.4)) {
        const archGeo = new THREE.TorusGeometry(32, 5.5, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, mesaMat);
        arch.position.set(s.position.x, s.position.y + 12, s.position.z);
        arch.rotation.z = Math.PI;
        arch.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
        root.add(arch);
      }
    }
  }

  static buildCoastalScenery(root, samples, roadWidth) {
    // Shimmering ocean plane
    const oceanGeo = new THREE.PlaneGeometry(2400, 2400);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.88
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.y = -1.2;
    root.add(oceanMesh);

    // Palm Trees & Beach Villas
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const villaMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.15 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.05, metalness: 0.2, transmission: 0.8 });
    const yachtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 });

    for (let i = 0; i < samples.length; i += 6) {
      const s = samples[i];
      const side = (i % 2 === 0) ? 1 : -1;
      const pos = s.position.clone().addScaledVector(s.right, side * (roadWidth * 0.5 + 4.5));
      const palm = TrackBuilder.buildPalmTree(palmMat);
      palm.position.set(pos.x, pos.y, pos.z);
      root.add(palm);

      // Luxury seaside villas on land side
      if (side === 1 && i % 12 === 0) {
        const villaPos = s.position.clone().addScaledVector(s.right, roadWidth * 0.5 + 24);
        const villa = new THREE.Group();
        const mainBox = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 14), villaMat);
        mainBox.position.y = 4.5;
        villa.add(mainBox);

        const balcony = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 4), glassMat);
        balcony.position.set(0, 7.5, 8.5);
        villa.add(balcony);

        villa.position.set(villaPos.x, s.position.y, villaPos.z);
        root.add(villa);
      }

      // Anchored luxury yachts in the bay
      if (side === -1 && i % 18 === 0) {
        const yachtPos = s.position.clone().addScaledVector(s.right, -roadWidth * 0.5 - 55);
        const yacht = new THREE.Group();

        // Hull
        const hullGeo = new THREE.BoxGeometry(4.5, 2.2, 12);
        const hull = new THREE.Mesh(hullGeo, yachtMat);
        hull.position.y = 0.6;
        yacht.add(hull);

        // Mast
        const mastGeo = new THREE.CylinderGeometry(0.12, 0.16, 14, 6);
        const mast = new THREE.Mesh(mastGeo, villaMat);
        mast.position.set(0, 8.0, 0);
        yacht.add(mast);

        yacht.position.set(yachtPos.x, -0.6, yachtPos.z);
        yacht.rotation.y = (i * 0.5) % Math.PI;
        root.add(yacht);
      }
    }

    // Suspension Bridge Towers & Glowing Steel Cables
    const bridgeSample = samples[Math.floor(samples.length * 0.25)];
    if (bridgeSample) {
      const towerGroup = new THREE.Group();
      towerGroup.position.copy(bridgeSample.position);
      towerGroup.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          bridgeSample.tangent,
          new THREE.Vector3(0, 1, 0)
        )
      );

      const towerHeight = 44;
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
      const cableMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

      [-1, 1].forEach((tside) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(1.6, towerHeight, 1.8), towerMat);
        post.position.set(tside * (roadWidth * 0.5 + 2.5), towerHeight * 0.5, 0);
        towerGroup.add(post);

        // Stay cables
        const cableGeo = new THREE.CylinderGeometry(0.06, 0.06, towerHeight * 1.05, 4);
        const cable = new THREE.Mesh(cableGeo, cableMat);
        cable.position.set(tside * (roadWidth * 0.5 + 2.5), towerHeight * 0.5, 0);
        cable.rotation.x = 0.22;
        towerGroup.add(cable);
      });

      root.add(towerGroup);
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
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    tree.add(trunk);

    for (let f = 0; f < 6; f++) {
      const frondGeo = new THREE.BoxGeometry(0.5, 0.08, 3.2);
      const frond = new THREE.Mesh(frondGeo, foliageMat);
      frond.position.set(0, 7.0, 0);
      frond.rotation.y = (f / 6) * Math.PI * 2;
      frond.rotation.x = 0.45;
      tree.add(frond);
    }
    return tree;
  }

  static createTokyoNeonTexture(index = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const signs = [
      { text: '首都高速', sub: 'SHUTO TOKYO', color: '#00e5ff', bg: '#030712' },
      { text: '東京 NIGHT', sub: 'NEO CIRCUIT', color: '#d946ef', bg: '#0f172a' },
      { text: 'NITRO MAX', sub: '超加速 BOOST', color: '#facc15', bg: '#18181b' },
      { text: 'APEX GT', sub: 'RACING LAB', color: '#10b981', bg: '#022c22' }
    ];

    const s = signs[index % signs.length];

    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = s.color;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.fillStyle = s.color;
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, 256, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(s.sub, 256, 185);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static buildTokyoScenery(root, samples, roadWidth) {
    const neonTextures = [
      TrackBuilder.createTokyoNeonTexture(0),
      TrackBuilder.createTokyoNeonTexture(1),
      TrackBuilder.createTokyoNeonTexture(2),
      TrackBuilder.createTokyoNeonTexture(3)
    ];

    const windowTexA = TrackBuilder.createBuildingWindowTexture(0);
    const windowTexB = TrackBuilder.createBuildingWindowTexture(1);
    const storefrontTex = TrackBuilder.createStorefrontTexture(1);
    const helipadTex = TrackBuilder.createHelipadTexture();

    const towerMats = [
      new THREE.MeshStandardMaterial({ color: 0x0f172a, map: windowTexA, roughness: 0.22, metalness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, map: windowTexB, roughness: 0.22, metalness: 0.85 })
    ];

    const storefrontMat = new THREE.MeshStandardMaterial({
      map: storefrontTex,
      roughness: 0.2,
      metalness: 0.5
    });

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.3 });
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    const neonColors = [0x00e5ff, 0xd946ef, 0xfacc15, 0x10b981];
    const neonMats = neonColors.map(nc => new THREE.MeshBasicMaterial({ color: nc }));

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.3 });

    // Place dense cyberpunk skyscrapers & expressway pillars
    const step = 4;
    for (let i = 0; i < samples.length; i += step) {
      const s = samples[i];
      [-1, 1].forEach((side, sideIdx) => {
        const dist = roadWidth * 0.5 + 14 + ((i * 4 + sideIdx * 8) % 20);
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        const type = (Math.floor(i / step) + sideIdx) % 4;
        TrackBuilder.buildSkyscraper(
          root, pos, s, side, type,
          towerMats, storefrontMat, roofMat, antennaMat, beaconMat, neonMats, helipadTex, neonTextures,
          i + sideIdx
        );
      });

      // Flyover concrete support pillars for elevated expressway sections
      if (s.position.y > 2.5 && i % 6 === 0) {
        const pillarGeo = new THREE.CylinderGeometry(1.2, 1.4, s.position.y + 2, 12);
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(s.position.x, (s.position.y) * 0.5, s.position.z);
        root.add(pillar);
      }

      // Midnight highway streetlights
      if (i % 8 === 0) {
        TrackBuilder.buildStreetLight(root, s, roadWidth * 0.5 + 2.5);
      }
    }
  }

  static buildForestScenery(root, samples, roadWidth) {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.95,
      metalness: 0.05
    });

    const redwoodFoliage = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.85
    });

    const tentMatA = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.4 });
    const tentMatB = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });

    for (let i = 0; i < samples.length; i += 4) {
      const s = samples[i];
      [-1, 1].forEach((side, sideIdx) => {
        const treeDist = roadWidth * 0.5 + 6 + ((i * 3 + sideIdx * 7) % 28);
        const pos = s.position.clone().addScaledVector(s.right, side * treeDist);

        const redwood = TrackBuilder.buildRedwoodTree(redwoodFoliage);
        redwood.position.set(pos.x, pos.y, pos.z);
        root.add(redwood);

        // Mossy rock boulders
        if (i % 3 === 0) {
          const rockPos = s.position.clone().addScaledVector(s.right, side * (roadWidth * 0.5 + 3.5 + (i % 5)));
          const rockSize = 1.4 + ((i * 2) % 3);
          const rockGeo = new THREE.DodecahedronGeometry(rockSize, 1);
          const rock = new THREE.Mesh(rockGeo, rockMat);
          rock.position.set(rockPos.x, rockPos.y + rockSize * 0.55, rockPos.z);
          rock.rotation.set((i * 0.3) % 3, (i * 0.5) % 3, 0);
          root.add(rock);
        }

        // Rally spectator tents along hairpins
        if (i % 14 === 0 && side === 1) {
          const tentPos = s.position.clone().addScaledVector(s.right, roadWidth * 0.5 + 14);
          const tentGeo = new THREE.ConeGeometry(3.5, 3.8, 4);
          const tent = new THREE.Mesh(tentGeo, (i % 2 === 0) ? tentMatA : tentMatB);
          tent.position.set(tentPos.x, s.position.y + 1.9, tentPos.z);
          tent.rotation.y = Math.PI * 0.25;
          root.add(tent);
        }
      });
    }
  }

  static buildRedwoodTree(foliageMat) {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c2b16, roughness: 0.9 });
    const trunkHeight = 18 + Math.random() * 9;
    const trunkGeo = new THREE.CylinderGeometry(0.55, 1.1, trunkHeight, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight * 0.5;
    tree.add(trunk);

    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const coneRadius = 4.2 - t * 0.65;
      const coneHeight = 4.0;
      const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = trunkHeight * 0.45 + t * 3.0;
      tree.add(cone);
    }

    return tree;
  }
}

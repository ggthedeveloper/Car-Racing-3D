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

    // Asphalt medium gray - crisp and visible
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 0, 512, 512);

    // Procedural asphalt noise grain
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(65 + Math.random() * 30);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Outer Solid Bright White Road Lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 0, 14, 512);
    ctx.fillRect(512 - 30, 0, 14, 512);

    // Center Vibrant Yellow/Amber Dashed Line
    ctx.fillStyle = '#fbbf24';
    const dashLength = 48;
    const dashGap = 28;
    for (let y = 0; y < 512; y += dashLength + dashGap) {
      ctx.fillRect(256 - 5, y, 10, dashLength);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
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
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.4
    });

    for (let side = -1; side <= 1; side += 2) {
      const barrierGeo = new THREE.BufferGeometry();
      const positions = [];
      const indices = [];

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const basePt = s.position.clone().addScaledVector(s.right, side * (halfWidth + barrierOffset));
        const topPt = basePt.clone().add(new THREE.Vector3(0, barrierHeight, 0));

        positions.push(basePt.x, basePt.y, basePt.z);
        positions.push(topPt.x, topPt.y, topPt.z);

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
    const bldgColors = [0x334155, 0x475569, 0x1e293b, 0x1e3a8a, 0x0f766e];
    const bldgMats = bldgColors.map(c => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.4,
      metalness: 0.7
    }));

    const windowColors = [0x38bdf8, 0xfde047, 0xf472b6, 0x4ade80];
    const windowMats = windowColors.map(wc => new THREE.MeshStandardMaterial({
      color: wc,
      emissive: wc,
      emissiveIntensity: 1.6,
      roughness: 0.2
    }));

    // Place buildings along the perimeter of the track
    const step = 6;
    for (let i = 0; i < samples.length; i += step) {
      const s = samples[i];
      [-1, 1].forEach((side, sideIdx) => {
        const dist = roadWidth * 0.5 + 14 + Math.random() * 22;
        const pos = s.position.clone().addScaledVector(s.right, side * dist);

        const height = 30 + Math.random() * 80;
        const width = 16 + Math.random() * 16;
        const depth = 16 + Math.random() * 16;

        const bldgMat = bldgMats[(i + sideIdx) % bldgMats.length];
        const bldgGeo = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeo, bldgMat);
        bldg.position.set(pos.x, pos.y + height * 0.5, pos.z);
        bldg.castShadow = false;
        bldg.receiveShadow = true;
        root.add(bldg);

        // Multiple glowing window bands at different vertical tiers
        const winMat = windowMats[(i + sideIdx) % windowMats.length];
        for (let tier = 0.35; tier <= 0.85; tier += 0.25) {
          const bandGeo = new THREE.BoxGeometry(width * 1.02, 2.5, depth * 1.02);
          const band = new THREE.Mesh(bandGeo, winMat);
          band.position.set(pos.x, pos.y + height * tier, pos.z);
          root.add(band);
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

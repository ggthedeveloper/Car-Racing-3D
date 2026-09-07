import * as THREE from 'three';

export class TrackManager {
  constructor(trackData, totalLaps = 3) {
    this.trackData = trackData;
    this.totalLaps = totalLaps;
    this.samples = trackData.samples;
    this.totalLength = trackData.totalLength;

    // Checkpoints: sample track at regular intervals (e.g. 10 checkpoints)
    this.checkpointCount = 12;
    this.checkpoints = [];
    for (let i = 0; i < this.checkpointCount; i++) {
      const sampleIdx = Math.floor((i / this.checkpointCount) * this.samples.length);
      this.checkpoints.push({
        id: i,
        sample: this.samples[sampleIdx],
        index: sampleIdx
      });
    }

    // Player race state
    this.currentLap = 1;
    this.lapTimes = [];
    this.currentLapTime = 0;
    this.bestLapTime = 0;
    this.totalRaceTime = 0;
    this.nextCheckpointIdx = 1; // start line is checkpoint 0
    this.isFinished = false;
    this.isWrongWay = false;

    // Racer tracking for position leaderboard
    this.racers = []; // { id, isPlayer, progressDistance, lap, position }
  }

  getGridPositions(totalCars = 8) {
    // 2-by-2 staggered starting grid along spline samples behind the start/finish line
    const grid = [];
    const count = this.samples.length;
    const halfWidth = (this.trackData.roadWidth || 16) * 0.5;
    const colSpacing = Math.min(3.8, halfWidth * 0.45);

    for (let i = 0; i < totalCars; i++) {
      const row = Math.floor(i / 2);
      const colSide = (i % 2 === 0) ? -1 : 1; // Left / Right

      // Step back along spline: ~8-10 samples per row
      const stepBack = (row + 1) * 8 + 4;
      const sampleIdx = (count - stepBack + count) % count;
      const s = this.samples[sampleIdx];

      const pos = s.position.clone().addScaledVector(s.right, colSide * colSpacing);
      pos.y += 0.4;

      const yaw = Math.atan2(s.tangent.x, s.tangent.z);

      grid.push({
        slot: i + 1,
        position: pos,
        yaw
      });
    }
    return grid;
  }

  update(dt, playerVehicle, aiRacers = [], isRacing = true) {
    if (!isRacing) return;

    this.totalRaceTime += dt;
    if (!this.isFinished) {
      this.currentLapTime += dt;
    }

    // --- 1. TRACK PLAYER PROGRESS & CHECKPOINTS ---
    const playerClosest = this.trackData.getClosestSample(playerVehicle.position);
    if (playerClosest && playerClosest.sample) {
      const sample = playerClosest.sample;
      
      // Wrong-way check: dot product between vehicle forward and track tangent
      const dotForward = playerVehicle.forward.dot(sample.tangent);
      this.isWrongWay = dotForward < -0.4 && playerVehicle.speedKmh > 15;

      // Check next expected checkpoint
      const targetCp = this.checkpoints[this.nextCheckpointIdx];
      const distToCp = playerVehicle.position.distanceTo(targetCp.sample.position);

      if (distToCp < (this.trackData.roadWidth * 0.8)) {
        // Passed checkpoint!
        if (this.nextCheckpointIdx === 0) {
          // Completed a full lap!
          this.lapTimes.push(this.currentLapTime);
          if (this.bestLapTime === 0 || this.currentLapTime < this.bestLapTime) {
            this.bestLapTime = this.currentLapTime;
          }

          if (this.currentLap >= this.totalLaps) {
            this.isFinished = true;
          } else {
            this.currentLap++;
            this.currentLapTime = 0;
            this.nextCheckpointIdx = 1;
          }
        } else {
          this.nextCheckpointIdx = (this.nextCheckpointIdx + 1) % this.checkpointCount;
        }
      }
    }

    // --- 2. CALCULATE LIVE RACE POSITIONS ---
    const allRacers = [];

    // Player entry
    const playerDistAlong = playerClosest ? playerClosest.sample.distance : 0;
    const playerTotalDist = (this.currentLap - 1) * this.totalLength + playerDistAlong;
    allRacers.push({
      id: 'player',
      isPlayer: true,
      name: 'YOU',
      totalDist: playerTotalDist,
      position: 1,
      lap: this.currentLap,
      pos3D: playerVehicle.position
    });

    // AI entries
    aiRacers.forEach((ai) => {
      const aiClosest = this.trackData.getClosestSample(ai.physics.position);
      const aiDistAlong = aiClosest ? aiClosest.sample.distance : 0;
      const aiTotalDist = (ai.currentLap - 1) * this.totalLength + aiDistAlong;
      allRacers.push({
        id: ai.id,
        isPlayer: false,
        name: ai.name,
        totalDist: aiTotalDist,
        position: 1,
        lap: ai.currentLap,
        pos3D: ai.physics.position
      });
    });

    // Sort descending by total distance traveled
    allRacers.sort((a, b) => b.totalDist - a.totalDist);
    allRacers.forEach((racer, idx) => {
      racer.position = idx + 1;
    });

    this.racers = allRacers;
  }

  getPlayerPosition() {
    const p = this.racers.find((r) => r.isPlayer);
    return p ? p.position : 1;
  }
}

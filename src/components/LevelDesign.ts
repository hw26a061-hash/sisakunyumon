import { LevelConfig, Platform, Guard, SecurityCamera, Laser, Treasure, KeyCard, LockedDoor } from '../types';

export const LEVEL_TEMPLATES: LevelConfig[] = [
  {
    id: 1,
    name: 'エメラルド美術館の夜',
    difficulty: 'Easy',
    description: '最初の手がかり：エメラルド美術館に保管された「深緑の涙」を奪還せよ。警備員の巡回ルートを把握し、監視カメラを煙幕で無効化しよう。',
    mapWidth: 2600,
    mapHeight: 600,
    spawnPoint: { x: 100, y: 450 },
    goalPoint: { x: 2450, y: 450 },
    platforms: [
      // Floor
      { x: 0, y: 520, width: 800, height: 80, type: 'normal' },
      { x: 950, y: 520, width: 800, height: 80, type: 'normal' }, // Pit between 800 and 950
      { x: 1900, y: 520, width: 700, height: 80, type: 'normal' }, // Pit between 1750 and 1900

      // Medium Ledges / Pillars
      { x: 300, y: 400, width: 150, height: 20, type: 'normal' },
      { x: 550, y: 320, width: 200, height: 20, type: 'normal' },
      { x: 900, y: 430, width: 120, height: 20, type: 'normal' },
      { x: 1100, y: 350, width: 250, height: 20, type: 'normal' },
      { x: 1450, y: 280, width: 200, height: 20, type: 'normal' },

      // High Ceilings for Grappling
      { x: 0, y: 0, width: 2600, height: 60, type: 'normal', isHookable: true }, // Full Ceiling
      { x: 700, y: 200, width: 100, height: 100, type: 'normal', isHookable: true }, // Hanging block
      { x: 1700, y: 150, width: 120, height: 50, type: 'normal', isHookable: true },

      // Door blockers & end walls
      { x: 1800, y: 400, width: 100, height: 120, type: 'normal' },
      { x: 2400, y: 380, width: 150, height: 20, type: 'normal' },
    ],
    guards: [
      {
        id: 'g1_1',
        startX: 1000,
        endX: 1350,
        x: 1100,
        y: 470, // 520 - 50 height
        vx: 1.5,
        width: 32,
        height: 50,
        facingLeft: false,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 160,
      },
      {
        id: 'g1_2',
        startX: 1950,
        endX: 2300,
        x: 2100,
        y: 470,
        vx: 1.8,
        width: 32,
        height: 50,
        facingLeft: true,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 180,
      },
    ],
    cameras: [
      {
        id: 'c1_1',
        x: 650,
        y: 80,
        angle: Math.PI / 4,
        sweepMin: Math.PI / 6,
        sweepMax: Math.PI / 3,
        sweepSpeed: 0.015,
        sightRange: 250,
        isStunned: false,
        stunTimer: 0,
      },
      {
        id: 'c1_2',
        x: 1500,
        y: 80,
        angle: Math.PI / 2,
        sweepMin: Math.PI / 3,
        sweepMax: 2 * Math.PI / 3,
        sweepSpeed: 0.01,
        sightRange: 220,
        isStunned: false,
        stunTimer: 0,
      },
    ],
    lasers: [
      {
        id: 'l1_1',
        x1: 450,
        y1: 60,
        x2: 450,
        y2: 400,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 2500, // Blink every 2.5s
      },
      {
        id: 'l1_2',
        x1: 1750,
        y1: 200,
        x2: 1750,
        y2: 520,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 0, // Always active!
      },
    ],
    treasures: [
      { id: 't1_1', x: 380, y: 350, type: 'bronze', value: 100, isCollected: false },
      { id: 't1_2', x: 650, y: 270, type: 'silver', value: 250, isCollected: false },
      { id: 't1_3', x: 1150, y: 300, type: 'bronze', value: 100, isCollected: false },
      { id: 't1_4', x: 1250, y: 300, type: 'silver', value: 250, isCollected: false },
      { id: 't1_5', x: 1550, y: 230, type: 'gold', value: 500, isCollected: false },
      { id: 't1_6', x: 1750, y: 100, type: 'gold', value: 500, isCollected: false }, // High secret
      { id: 't1_7', x: 2450, y: 330, type: 'legendary', value: 2000, isCollected: false }, // "深緑の涙" - Main target
    ],
    keyCards: [
      { x: 1300, y: 300, color: 'red', isCollected: false },
    ],
    lockedDoors: [
      { x: 1800, y: 400, width: 25, height: 120, color: 'red', isUnlocked: false },
    ],
  },
  {
    id: 2,
    name: 'スカイパレス・ヘイスト',
    difficulty: 'Medium',
    description: '第２の指令：富豪の超高層ヘブンビルの最上階から「蒼天のサファイア」を入手せよ。足場が狭く、エスケープにはワイヤー移動（グラップル）が必須だ。',
    mapWidth: 3200,
    mapHeight: 600,
    spawnPoint: { x: 80, y: 400 },
    goalPoint: { x: 3050, y: 200 },
    platforms: [
      // Vertical drop platform segments
      { x: 0, y: 480, width: 500, height: 120, type: 'normal' },
      { x: 600, y: 420, width: 300, height: 180, type: 'normal' },
      // Pit with electric hazard
      { x: 900, y: 550, width: 450, height: 50, type: 'hazard' },
      { x: 1350, y: 420, width: 400, height: 180, type: 'normal' },

      { x: 1850, y: 320, width: 300, height: 280, type: 'normal' },
      { x: 2250, y: 500, width: 850, height: 100, type: 'normal' },

      // Hanging ledges / structural columns
      { x: 250, y: 320, width: 120, height: 20, type: 'normal' },
      { x: 450, y: 220, width: 120, height: 20, type: 'normal' },
      { x: 700, y: 280, width: 150, height: 20, type: 'normal' },
      
      // Trampoline / spring platforms (type: bounce)
      { x: 1050, y: 440, width: 60, height: 15, type: 'bounce' }, // Helps bounce over the hazard
      { x: 1250, y: 300, width: 100, height: 20, type: 'normal' },
      
      // Maze parts
      { x: 1450, y: 280, width: 200, height: 30, type: 'normal' },
      { x: 1450, y: 150, width: 300, height: 20, type: 'normal' },

      // High Ceilings & swing pegs
      { x: 0, y: 0, width: 3200, height: 60, type: 'normal', isHookable: true },
      { x: 1000, y: 200, width: 80, height: 80, type: 'normal', isHookable: true },
      { x: 1600, y: 100, width: 100, height: 60, type: 'normal', isHookable: true },
      { x: 2200, y: 220, width: 150, height: 20, type: 'normal', isHookable: true },
      { x: 2500, y: 350, width: 150, height: 20, type: 'normal', isHookable: true },
      { x: 2750, y: 250, width: 150, height: 20, type: 'normal', isHookable: true },
      { x: 3000, y: 280, width: 180, height: 320, type: 'normal' },
    ],
    guards: [
      {
        id: 'g2_1',
        startX: 150,
        endX: 450,
        x: 300,
        y: 430,
        vx: 1.8,
        width: 32,
        height: 50,
        facingLeft: false,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 160,
      },
      {
        id: 'g2_2',
        startX: 1400,
        endX: 1700,
        x: 1500,
        y: 370,
        vx: 2.2,
        width: 32,
        height: 50,
        facingLeft: true,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 170,
      },
      {
        id: 'g2_3',
        startX: 2300,
        endX: 2800,
        x: 2400,
        y: 450,
        vx: 2.0,
        width: 32,
        height: 50,
        facingLeft: false,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 200,
      },
    ],
    cameras: [
      {
        id: 'c2_1',
        x: 750,
        y: 120,
        angle: Math.PI / 2,
        sweepMin: Math.PI / 4,
        sweepMax: 3 * Math.PI / 4,
        sweepSpeed: 0.012,
        sightRange: 220,
        isStunned: false,
        stunTimer: 0,
      },
      {
        id: 'c2_2',
        x: 2100,
        y: 80,
        angle: Math.PI / 2,
        sweepMin: Math.PI / 3,
        sweepMax: 2 * Math.PI / 3,
        sweepSpeed: 0.02,
        sightRange: 250,
        isStunned: false,
        stunTimer: 0,
      },
    ],
    lasers: [
      {
        id: 'l2_1',
        x1: 450,
        y1: 60,
        x2: 450,
        y2: 480,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 1800, // rapid blink
      },
      {
        id: 'l2_2',
        x1: 1100,
        y1: 60,
        x2: 1100,
        y2: 300,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 0,
      },
      {
        id: 'l2_3',
        x1: 1800,
        y1: 60,
        x2: 1800,
        y2: 320,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 2200,
      },
      {
        id: 'l2_4',
        x1: 2900,
        y1: 60,
        x2: 2900,
        y2: 500,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 0, // Solid wall blocking the way, need key card!
      },
    ],
    treasures: [
      { id: 't2_1', x: 280, y: 270, type: 'silver', value: 250, isCollected: false },
      { id: 't2_2', x: 420, y: 150, type: 'gold', value: 500, isCollected: false },
      { id: 't2_3', x: 800, y: 230, type: 'silver', value: 250, isCollected: false },
      { id: 't2_4', x: 1250, y: 250, type: 'gold', value: 500, isCollected: false },
      { id: 't2_5', x: 2250, y: 160, type: 'silver', value: 250, isCollected: false },
      { id: 't2_6', x: 2550, y: 300, type: 'gold', value: 500, isCollected: false },
      { id: 't2_7', x: 3050, y: 220, type: 'legendary', value: 3500, isCollected: false }, // "蒼天のサファイア"
    ],
    keyCards: [
      { x: 1550, y: 100, color: 'blue', isCollected: false },
    ],
    lockedDoors: [
      { x: 2880, y: 380, width: 40, height: 120, color: 'blue', isUnlocked: false },
    ],
  },
  {
    id: 3,
    name: '地下アルティメット・ヴォルト',
    difficulty: 'Hard',
    description: '最終ボス：皇帝の極秘金庫最深部に眠る、伝説の宝石「ジェミニ・スター（星霜の閃光）」を手に入れろ。警備ロボ、極細レーザー、二重ロックがあなたを阻む。',
    mapWidth: 4000,
    mapHeight: 600,
    spawnPoint: { x: 80, y: 450 },
    goalPoint: { x: 3850, y: 440 },
    platforms: [
      // Initial platform
      { x: 0, y: 520, width: 400, height: 80, type: 'normal' },
      
      // Giant spike hazard on floor
      { x: 400, y: 560, width: 1200, height: 40, type: 'hazard' },
      
      // Suspended stepping stones with dynamic ranges
      { x: 460, y: 400, width: 100, height: 20, type: 'normal' },
      { x: 620, y: 300, width: 80, height: 20, type: 'normal' },
      { x: 800, y: 240, width: 120, height: 20, type: 'normal' },
      { x: 1000, y: 330, width: 100, height: 20, type: 'normal' },
      
      // Bouncing escape pads
      { x: 1180, y: 460, width: 60, height: 20, type: 'bounce' },
      { x: 1300, y: 380, width: 120, height: 20, type: 'normal' },
      { x: 1500, y: 280, width: 120, height: 20, type: 'normal' },

      // Secure mid-deck
      { x: 1600, y: 500, width: 1000, height: 100, type: 'normal' },
      { x: 1800, y: 380, width: 250, height: 20, type: 'normal' },
      { x: 2200, y: 300, width: 300, height: 20, type: 'normal' },

      // Laser grid tunnels
      { x: 2600, y: 500, width: 800, height: 100, type: 'normal' },
      
      // Acid/Electric pit before vault
      { x: 3400, y: 550, width: 300, height: 50, type: 'hazard' },
      { x: 3500, y: 320, width: 120, height: 20, type: 'bounce' }, // Bounce to goal

      // Vault Chamber
      { x: 3700, y: 500, width: 300, height: 100, type: 'normal' },
      
      // High Ceilings & Grab Points
      { x: 0, y: 0, width: 4000, height: 60, type: 'normal', isHookable: true },
      { x: 800, y: 100, width: 100, height: 50, type: 'normal', isHookable: true },
      { x: 2100, y: 150, width: 200, height: 50, type: 'normal', isHookable: true },
      { x: 3500, y: 180, width: 100, height: 50, type: 'normal', isHookable: true },
    ],
    guards: [
      {
        id: 'g3_1',
        startX: 100,
        endX: 350,
        x: 200,
        y: 470,
        vx: 2.0,
        width: 32,
        height: 50,
        facingLeft: false,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 180,
      },
      {
        id: 'g3_2',
        startX: 1650,
        endX: 2000,
        x: 1800,
        y: 450,
        vx: 2.5,
        width: 32,
        height: 50,
        facingLeft: true,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 200,
      },
      {
        id: 'g3_3',
        startX: 2100,
        endX: 2500,
        x: 2300,
        y: 450,
        vx: 2.6,
        width: 32,
        height: 50,
        facingLeft: false,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 200,
      },
      {
        id: 'g3_4',
        startX: 2700,
        endX: 3200,
        x: 2900,
        y: 450,
        vx: 3.0, // High-speed security droid
        width: 32,
        height: 50,
        facingLeft: true,
        isStunned: false,
        stunTimer: 0,
        sightAngle: 0,
        sightRange: 220,
      },
    ],
    cameras: [
      {
        id: 'c3_1',
        x: 550,
        y: 120,
        angle: Math.PI / 2,
        sweepMin: Math.PI / 4,
        sweepMax: 3 * Math.PI / 4,
        sweepSpeed: 0.02,
        sightRange: 260,
        isStunned: false,
        stunTimer: 0,
      },
      {
        id: 'c3_2',
        x: 1900,
        y: 80,
        angle: Math.PI / 2,
        sweepMin: Math.PI / 6,
        sweepMax: 5 * Math.PI / 6,
        sweepSpeed: 0.025,
        sightRange: 280,
        isStunned: false,
        stunTimer: 0,
      },
      {
        id: 'c3_3',
        x: 3200,
        y: 80,
        angle: Math.PI / 2,
        sweepMin: Math.PI / 3,
        sweepMax: 2 * Math.PI / 3,
        sweepSpeed: 0.015,
        sightRange: 240,
        isStunned: false,
        stunTimer: 0,
      },
    ],
    lasers: [
      {
        id: 'l3_1',
        x1: 420,
        y1: 60,
        x2: 420,
        y2: 520,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 1500, // rapid blink
      },
      {
        id: 'l3_2',
        x1: 1600,
        y1: 60,
        x2: 1600,
        y2: 500,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 0,
      },
      {
        id: 'l3_3',
        x1: 2600,
        y1: 60,
        x2: 2600,
        y2: 500,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 2000,
      },
      {
        id: 'l3_4',
        x1: 3400,
        y1: 60,
        x2: 3400,
        y2: 550,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 0, // Double Keycard barrier check
      },
      {
        id: 'l3_5',
        x1: 3700,
        y1: 60,
        x2: 3700,
        y2: 500,
        isActive: true,
        pulseTimer: 0,
        pulseInterval: 1200,
      },
    ],
    treasures: [
      { id: 't3_1', x: 480, y: 350, type: 'gold', value: 500, isCollected: false },
      { id: 't3_2', x: 850, y: 190, type: 'gold', value: 500, isCollected: false },
      { id: 't3_3', x: 1350, y: 330, type: 'silver', value: 250, isCollected: false },
      { id: 't3_4', x: 1900, y: 320, type: 'gold', value: 500, isCollected: false },
      { id: 't3_5', x: 2350, y: 250, type: 'gold', value: 500, isCollected: false },
      { id: 't3_6', x: 3550, y: 130, type: 'gold', value: 1000, isCollected: false }, // Ultimate secret high spot
      { id: 't3_7', x: 3850, y: 440, type: 'legendary', value: 5000, isCollected: false }, // "ジェミニ・スター"
    ],
    keyCards: [
      { x: 850, y: 80, color: 'blue', isCollected: false }, // blue key
      { x: 2380, y: 250, color: 'red', isCollected: false }, // red key
    ],
    lockedDoors: [
      { x: 3380, y: 380, width: 40, height: 120, color: 'blue', isUnlocked: false },
      { x: 3680, y: 380, width: 25, height: 120, color: 'red', isUnlocked: false },
    ],
  },
];

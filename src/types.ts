export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  doubleJumpAvailable: boolean;
  isSliding: boolean;
  slideTimer: number;
  facingLeft: boolean;
  health: number;
  maxHealth: number;
  smokeBombs: number;
  maxSmokeBombs: number;
  stealthEnergy: number;
  maxStealthEnergy: number;
  isStealth: boolean;
  grappleState: GrappleState;
  grappleAimAngle?: number;
  isHoldingSpace?: boolean;
  spaceHoldDuration?: number;
  prevSpacePressed?: boolean;
}

export type GrappleType = 'IDLE' | 'FIRING' | 'RETRACTING' | 'SWINGING';

export interface GrappleState {
  type: GrappleType;
  targetX: number;
  targetY: number;
  length: number;
  angle: number;
  angularVelocity: number;
}

export interface Guard {
  id: string;
  startX: number;
  endX: number;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  facingLeft: boolean;
  isStunned: boolean;
  stunTimer: number;
  sightAngle: number; // looking sweep angle
  sightRange: number;
}

export interface SecurityCamera {
  id: string;
  x: number;
  y: number;
  angle: number;
  sweepMin: number;
  sweepMax: number;
  sweepSpeed: number;
  sightRange: number;
  isStunned: boolean;
  stunTimer: number;
}

export interface Laser {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isActive: boolean;
  pulseTimer: number;
  pulseInterval: number; // blink interval in ms, 0 means always on
}

export interface Treasure {
  id: string;
  x: number;
  y: number;
  type: 'bronze' | 'silver' | 'gold' | 'legendary';
  value: number;
  isCollected: boolean;
}

export interface SmokeBombObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDetonated: boolean;
  radius: number;
  life: number; // remains active for X frames
}

export interface KeyCard {
  x: number;
  y: number;
  color: 'red' | 'blue';
  isCollected: boolean;
}

export interface LockedDoor {
  x: number;
  y: number;
  width: number;
  height: number;
  color: 'red' | 'blue';
  isUnlocked: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'normal' | 'hazard' | 'bounce' | 'ice';
}

export interface LevelConfig {
  id: number;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  mapWidth: number;
  mapHeight: number;
  spawnPoint: Vector2D;
  goalPoint: Vector2D;
  platforms: Platform[];
  guards: Guard[];
  cameras: SecurityCamera[];
  lasers: Laser[];
  treasures: Treasure[];
  keyCards: KeyCard[];
  lockedDoors: LockedDoor[];
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  effect: string;
}

export interface GameStats {
  score: number;
  coins: number; // stolen coins used raw for upgrades
  alertLevel: number; // 0 to 100
  stealthRating: 'S' | 'A' | 'B' | 'C' | 'D';
  timeElapsed: number; // in seconds
  gemsCollected: number;
  totalGems: number;
}

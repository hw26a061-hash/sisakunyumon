import React, { useRef, useEffect, useState } from 'react';
import { 
  LevelConfig, Player, Guard, SecurityCamera, Laser, 
  Treasure, SmokeBombObject, KeyCard, LockedDoor, Platform, GameStats, Vector2D 
} from '../types';
import { sfx } from '../utils/audio';

interface GameCanvasProps {
  level: LevelConfig;
  selectedUpgrades: Set<string>;
  onGameOver: (finalStats: GameStats, reason: string) => void;
  onStageClear: (finalStats: GameStats) => void;
  isPaused: boolean;
  onUpdateStats: (player: Player, stats: GameStats, keyCards: { red: boolean; blue: boolean }) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'dust' | 'smoke' | 'spark' | 'sparkle' | 'glitch';
}

interface Droid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  laserAngle: number;
  laserSweepDir: number;
  shootCooldown: number;
}

export default function GameCanvas({
  level,
  selectedUpgrades,
  onGameOver,
  onStageClear,
  isPaused,
  onUpdateStats,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport Dimensions
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 500 });

  // Game Loop States & Refs
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<Vector2D>({ x: 400, y: 150 });

  // Load level variables into running state
  const playerRef = useRef<Player>({
    x: level.spawnPoint.x,
    y: level.spawnPoint.y,
    vx: 0,
    vy: 0,
    width: 24,
    height: 48,
    isGrounded: false,
    doubleJumpAvailable: true,
    isSliding: false,
    slideTimer: 0,
    facingLeft: false,
    health: selectedUpgrades.has('max_hp') ? 4 : 3,
    maxHealth: selectedUpgrades.has('max_hp') ? 4 : 3,
    smokeBombs: selectedUpgrades.has('max_smoke') ? 5 : 3,
    maxSmokeBombs: selectedUpgrades.has('max_smoke') ? 5 : 3,
    stealthEnergy: 100,
    maxStealthEnergy: selectedUpgrades.has('stealth_battery') ? 140 : 100,
    isStealth: false,
    grappleState: {
      type: 'IDLE',
      targetX: 0,
      targetY: 0,
      length: 0,
      angle: 0,
      angularVelocity: 0,
    },
  });

  // Dynamic status of elements (level copies)
  const guardsRef = useRef<Guard[]>([]);
  const camerasRef = useRef<SecurityCamera[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const treasuresRef = useRef<Treasure[]>([]);
  const smokeBombsRef = useRef<SmokeBombObject[]>([]);
  const keyCardsRef = useRef<KeyCard[]>([]);
  const lockedDoorsRef = useRef<LockedDoor[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const droidsRef = useRef<Droid[]>([]);

  // Alert and score metrics
  const scoreRef = useRef<number>(0);
  const alertLevelRef = useRef<number>(0);
  const gemsCollectedRef = useRef<number>(0);
  const timeElapsedRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Sounds alert control to prevent spam overlap
  const lastAlertSoundTime = useRef<number>(0);

  // Camera scroll tracking
  const cameraScrollX = useRef<number>(0);
  const cameraScrollY = useRef<number>(0);

  const getWorldMousePos = (): Vector2D => {
    return {
      x: mousePos.current.x + cameraScrollX.current,
      y: mousePos.current.y + cameraScrollY.current,
    };
  };

  // Initialize level elements
  useEffect(() => {
    // Reset Player
    const maxHP = selectedUpgrades.has('max_hp') ? 4 : 3;
    const maxSmoke = selectedUpgrades.has('max_smoke') ? 5 : 3;
    const maxStealth = selectedUpgrades.has('stealth_battery') ? 140 : 100;

    playerRef.current = {
      x: level.spawnPoint.x,
      y: level.spawnPoint.y,
      vx: 0,
      vy: 0,
      width: 24,
      height: 48,
      isGrounded: false,
      doubleJumpAvailable: true,
      isSliding: false,
      slideTimer: 0,
      facingLeft: false,
      health: maxHP,
      maxHealth: maxHP,
      smokeBombs: maxSmoke,
      maxSmokeBombs: maxSmoke,
      stealthEnergy: maxStealth,
      maxStealthEnergy: maxStealth,
      isStealth: false,
      grappleState: {
        type: 'IDLE',
        targetX: 0,
        targetY: 0,
        length: 0,
        angle: 0,
        angularVelocity: 0,
      },
    };

    // Clone level structures for dynamic play
    guardsRef.current = level.guards.map(g => ({ ...g, isStunned: false, stunTimer: 0 }));
    camerasRef.current = level.cameras.map(c => ({ ...c, isStunned: false, stunTimer: 0 }));
    lasersRef.current = level.lasers.map(l => ({ ...l, isActive: true, pulseTimer: 0 }));
    treasuresRef.current = level.treasures.map(t => ({ ...t, isCollected: false }));
    keyCardsRef.current = level.keyCards.map(k => ({ ...k, isCollected: false }));
    lockedDoorsRef.current = level.lockedDoors.map(d => ({ ...d, isUnlocked: false }));

    smokeBombsRef.current = [];
    particlesRef.current = [];
    droidsRef.current = [];

    scoreRef.current = 0;
    alertLevelRef.current = 0;
    gemsCollectedRef.current = 0;
    timeElapsedRef.current = 0;
    frameCountRef.current = 0;
    cameraScrollX.current = 0;
    cameraScrollY.current = 0;

  }, [level, selectedUpgrades]);

  // Handle keys and mouse inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Prevent browser default scrolling
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) {
        e.preventDefault();
      }

      keysPressed.current[k] = true;
      keysPressed.current[e.key] = true; // Support arrows

      // Smoke bomb throw (Q)
      if (k === 'q' && !isPaused) {
        throwSmokeBomb();
      }

      // Stealth activation (SHIFT only)
      if (k === 'shift' && !isPaused) {
        toggleStealth();
      }

      // Grapple Hook action (E / F keys)
      if ((k === 'e' || k === 'f') && !isPaused) {
        fireGrapple();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = false;
      keysPressed.current[e.key] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      // Mouse coordinates relative to actual design canvas bounds
      const scaleX = 800 / rect.width;
      const scaleY = 500 / rect.height;
      mousePos.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isPaused) return;
      if (e.button === 0) {
        // Left click: Fire Grapple Hook!
        fireGrapple();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isPaused, level, selectedUpgrades]);

  // ResizeObserver for responsive canvas wrapping
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Max fixed aspect ratio of 800/500
        const containerWidth = entry.contentRect.width;
        // Keep it responsive but bounded
        const responsiveWidth = Math.min(containerWidth, 800);
        const responsiveHeight = (responsiveWidth * 5) / 8;
        setViewportSize({ width: responsiveWidth, height: responsiveHeight });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Action: Launch smoke bomb
  const throwSmokeBomb = () => {
    const p = playerRef.current;
    if (p.smokeBombs <= 0) {
      sfx.playFailure();
      return;
    }

    p.smokeBombs--;
    sfx.playSmokeBomb();

    // Spawn smoke bomb object traveling towards looking direction/angle mouse
    const speed = 10;
    const baseDir = p.facingLeft ? -1 : 1;
    let vx = baseDir * speed;
    let vy = -5;

    // Adjust trajectory towards mouse coordinates if mouse is screen-bound
    const worldMouse = getWorldMousePos();
    if (mousePos.current.x !== 0) {
      const dx = worldMouse.x - p.x;
      const dy = worldMouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        vx = (dx / dist) * speed * 1.2;
        vy = (dy / dist) * speed * 1.2;
      }
    }

    smokeBombsRef.current.push({
      x: p.x,
      y: p.y - 10,
      vx,
      vy,
      isDetonated: false,
      radius: 0,
      life: 180, // lasts 3 seconds (60fps)
    });
    
    // Spawn spark particles upon throw
    spawnSparkParticles(p.x, p.y - 10, '#94a3b8', 6);
  };

  // Action: Toggle cloaking stealth Shroud
  const toggleStealth = () => {
    const p = playerRef.current;
    if (!p.isStealth) {
      if (p.stealthEnergy > 20) {
        p.isStealth = true;
        sfx.playStealth();
        // Create stealth spark halo
        spawnSparkParticles(p.x, p.y - p.height / 2, '#22d3ee', 12);
      } else {
        sfx.playFailure();
      }
    } else {
      p.isStealth = false;
    }
  };

  // Finds the standard non-hazard platform edge/corner closer to player's trajectory or auto-aims in player's facing direction
  const findGrappleTarget = (): { target: Vector2D; distance: number } | null => {
    const p = playerRef.current;
    // Hook max range: default 280px, upgraded to ~370px (+~30%)
    const maxRange = selectedUpgrades.has('wire_range') ? 370 : 280;
    const px = p.x;
    const py = p.y - p.height / 2;

    // Detect if we are holding space and exceeded hold threshold (9 frames ~ 0.15s)
    const isActuallyHolding = !!p.isHoldingSpace && (p.spaceHoldDuration !== undefined && p.spaceHoldDuration >= 9);

    // Advanced Auto-Aim in player's facing direction (keyboard-only gameplay optimization)
    // We generate sample target points along undersides and side walls of all platforms
    let bestAutoTarget: Vector2D | null = null;
    let bestAutoScore = -Infinity;
    let bestAutoDistance = maxRange;

    level.platforms.forEach((plat) => {
      if (plat.type === 'hazard') return;

      const candidates: Vector2D[] = [];

      // Sample along underside (ceiling)
      const undersideSteps = Math.max(2, Math.floor(plat.width / 30));
      for (let i = 0; i <= undersideSteps; i++) {
        candidates.push({
          x: plat.x + (plat.width * i) / undersideSteps,
          y: plat.y + plat.height,
        });
      }

      // Sample along left vertical wall
      const leftSteps = Math.max(2, Math.floor(plat.height / 30));
      for (let i = 0; i <= leftSteps; i++) {
        candidates.push({
          x: plat.x,
          y: plat.y + (plat.height * i) / leftSteps,
        });
      }

      // Sample along right vertical wall
      const rightSteps = Math.max(2, Math.floor(plat.height / 30));
      for (let i = 0; i <= rightSteps; i++) {
        candidates.push({
          x: plat.x + plat.width,
          y: plat.y + (plat.height * i) / rightSteps,
        });
      }

      candidates.forEach((c) => {
        const dx = c.x - px;
        const dy = c.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Must be within valid range
        if (dist > maxRange || dist < 45) return;

        // Must broadly be in the direction the player is facing/moving (Normally restricted only if NOT fully holding space)
        if (!isActuallyHolding) {
          if (p.facingLeft && dx > 25) return;
          if (!p.facingLeft && dx < -25) return;
          if (c.y > p.y + 25) return; // Ensure it's not far below player's feet
        }

        // Evaluate score
        const angle = Math.atan2(dy, dx);
        const idealAngle = isActuallyHolding && p.grappleAimAngle !== undefined
          ? p.grappleAimAngle
          : (p.facingLeft ? -Math.PI * 0.75 : -Math.PI * 0.25);

        let diff = Math.abs(angle - idealAngle);
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        diff = Math.abs(diff);

        // If manually holding space to rotate aim, filter targets inside a ±45 degree cone to be very precise!
        if (isActuallyHolding && diff > Math.PI / 4) return;

        const angleScale = (Math.PI - diff) / Math.PI; // 0 to 1 (1 is perfect 45 deg)
        const heightFactor = (p.y - c.y) / 150; // higher is better
        // When space is holding, proximity to exact beam angle matters most
        const score = isActuallyHolding
          ? angleScale * 140 - (dist / maxRange) * 10
          : angleScale * 100 + heightFactor * 30 - (dist / maxRange) * 15;

        if (score > bestAutoScore) {
          bestAutoScore = score;
          bestAutoTarget = c;
          bestAutoDistance = dist;
        }
      });
    });

    if (bestAutoTarget) {
      return { target: bestAutoTarget, distance: bestAutoDistance };
    }

    return null;
  };

  // Action: Grapple Hook Fire logic
  const fireGrapple = () => {
    const p = playerRef.current;

    // If currently anchored/swinging, cancel grapple/release wire
    if (p.grappleState.type === 'SWINGING' || p.grappleState.type === 'FIRING') {
      p.grappleState.type = 'IDLE';
      sfx.playGrappleLaunch();
      return;
    }

    const grappleInfo = findGrappleTarget();

    if (grappleInfo) {
      const { target } = grappleInfo;
      sfx.playGrappleLaunch();
      p.grappleState = {
        type: 'FIRING',
        targetX: target.x,
        targetY: target.y,
        length: 10, // starts traveling quickly
        angle: 0,
        angularVelocity: 0,
      };
      
      spawnSparkParticles(target.x, target.y, '#818cf8', 4);
    } else {
      // No grab points found
      sfx.playFailure();
    }
  };

  // Helper particles spawn
  const spawnSparkParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 30 + 20,
        type: 'spark',
      });
    }
  };

  const spawnSmokeParticles = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        size: Math.random() * 12 + 8,
        color: '#cbd5e1',
        alpha: 0.8,
        life: 0,
        maxLife: Math.random() * 60 + 50,
        type: 'smoke',
      });
    }
  };

  const spawnGlitchParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x + (Math.random() * 16 - 8),
        y: y + (Math.random() * 30 - 15),
        vx: (Math.random() * 2 - 1) * 0.5,
        vy: -Math.random() * 1,
        size: Math.random() * 4 + 2,
        color,
        alpha: 0.9,
        life: 0,
        maxLife: Math.random() * 20 + 10,
        type: 'glitch',
      });
    }
  };

  // Main Loop Manager
  useEffect(() => {
    let animationId: number;
    
    const tick = () => {
      if (isPaused) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      // 1. Core Physics & Gameplay updates
      updateGameplay();

      // 2. Render all Canvas elements
      renderCanvas();

      // Loop
      frameCountRef.current++;
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, level, selectedUpgrades]);

  // Update logic: physics, alarms, scrolling, particles, guards
  const updateGameplay = () => {
    const p = playerRef.current;
    
    // Time Tracker (every 60 frames roughly 1 sec)
    if (frameCountRef.current % 60 === 0) {
      timeElapsedRef.current++;
    }

    // A. Apply Stealth Energy Decay/Recharge
    if (p.isStealth) {
      p.stealthEnergy = Math.max(0, p.stealthEnergy - 0.4);
      if (p.stealthEnergy <= 0) {
        p.isStealth = false;
        sfx.playFailure();
      }
      // Leave tiny cyan dust residues behind player movement
      if (Math.random() < 0.15) {
        particlesRef.current.push({
          x: p.x + (Math.random() * 10 - 5),
          y: p.y - Math.random() * p.height,
          vx: (Math.random() * 0.5 - 0.25),
          vy: -Math.random() * 0.5,
          size: Math.random() * 2 + 1,
          color: '#22d3ee',
          alpha: 0.6,
          life: 0,
          maxLife: 25,
          type: 'sparkle',
        });
      }
    } else {
      p.stealthEnergy = Math.min(p.maxStealthEnergy, p.stealthEnergy + 0.15);
    }

    // B. Player Movement and Physics Engine
    // Determine upgrades speed factors
    const hasSpeedUpgrade = selectedUpgrades.has('movement_speed');
    const moveAcceleration = hasSpeedUpgrade ? 0.95 : 0.8;
    const maxRunSpeed = hasSpeedUpgrade ? 6.2 : 5.2;
    const jumpStrength = hasSpeedUpgrade ? -10.5 : -9.5;
    const gravity = 0.42;
    const horizontalFriction = 0.84;

    // Horizontal movement commands
    let moveIntent = 0;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
      moveIntent = -1;
      p.facingLeft = true;
    } else if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
      moveIntent = 1;
      p.facingLeft = false;
    }

    // Sliding input (S / Arrow Down)
    if ((keysPressed.current['s'] || keysPressed.current['arrowdown']) && p.isGrounded && !p.isSliding) {
      p.isSliding = true;
      p.slideTimer = 25; // 25 frames slide
      sfx.playSlide();
      // Throw dust kick particles
      spawnSparkParticles(p.x, p.y, '#94a3b8', 5);
    }

    if (p.isSliding) {
      p.height = 24; // smaller hitbox
      p.slideTimer--;
      // Apply sliding force boost
      p.vx += (p.facingLeft ? -1.0 : 1.0) * 0.45;
      
      // Emit dust particles while sliding
      if (frameCountRef.current % 3 === 0) {
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: (p.facingLeft ? 1 : -1) * (Math.random() * 2),
          vy: -Math.random() * 1,
          size: Math.random() * 4 + 2,
          color: '#94a3b8',
          alpha: 0.7,
          life: 0,
          maxLife: 20,
          type: 'dust',
        });
      }

      if (p.slideTimer <= 0) {
        // Can stand up only if no platform is directly above!
        const canStandUp = !checkPlatformOverhead();
        if (canStandUp) {
          p.isSliding = false;
          p.height = 48; // restore normal hitbox
        } else {
          p.slideTimer = 5; // force slide longer
        }
      }
    } else {
      p.vx += moveIntent * moveAcceleration;
    }

    // Apply Friction and Gravity (with gentle air dampening inside swing state)
    if (p.grappleState.type === 'SWINGING') {
      p.vx *= 0.993; // light air drag
      p.vy *= 0.993;
      p.vy += gravity; // Gravity keeps the swing natural!
    } else {
      p.vx *= horizontalFriction;
      p.vy += gravity;
    }

    // Clamp horizontal speeds (swings are slightly buffered for extra adrenaline flow)
    const currMaxH = p.isSliding ? 8.5 : (p.grappleState.type === 'SWINGING' ? maxRunSpeed * 1.5 : maxRunSpeed);
    p.vx = Math.max(-currMaxH, Math.min(currMaxH, p.vx));

    // Jump / Double Jump / Grapple hook controls
    const isSwingingState = p.grappleState.type === 'SWINGING';
    const isFiringState = p.grappleState.type === 'FIRING';
    const isSpacePressedNow = !!keysPressed.current[' '];
    const spaceJustPressed = isSpacePressedNow && !p.prevSpacePressed;
    const spaceJustReleased = !isSpacePressedNow && p.prevSpacePressed;
    p.prevSpacePressed = isSpacePressedNow;

    // Release space hold if grounded
    if (p.isGrounded) {
      p.isHoldingSpace = false;
    }

    // A. Just Pressed space controls
    if (spaceJustPressed) {
      if (isSwingingState || isFiringState) {
        // Release active wire on press
        p.grappleState.type = 'IDLE';
        p.isHoldingSpace = false;
        if (isSwingingState) {
          p.vx += (p.vx > 0 ? 3.2 : -3.2);
          p.vy = jumpStrength * 0.95;
          p.doubleJumpAvailable = true;
          sfx.playJump();
          spawnSparkParticles(p.x, p.y, '#e2e8f0', 6);
        } else {
          sfx.playGrappleLaunch();
        }
        keysPressed.current[' '] = false; // consume
      } else if (p.isGrounded) {
        // Regular jump on ground
        p.vy = jumpStrength;
        p.isGrounded = false;
        p.doubleJumpAvailable = true;
        sfx.playJump();
        spawnSparkParticles(p.x, p.y, '#e2e8f0', 5);
        keysPressed.current[' '] = false; // consume
      } else {
        // Start orbital aim holding in mid-air
        p.isHoldingSpace = true;
        p.spaceHoldDuration = 0;
        p.grappleAimAngle = p.facingLeft ? -Math.PI * 0.75 : -Math.PI * 0.25;
      }
    }

    // B. Maintain and rotate aim while holding space in air
    const HOLD_THRESHOLD = 9;
    if (p.isHoldingSpace && isSpacePressedNow && !p.isGrounded) {
      if (p.spaceHoldDuration === undefined) p.spaceHoldDuration = 0;
      p.spaceHoldDuration++;

      // Rotate laser direction ONLY when the HOLD_THRESHOLD is reached/exceeded
      if (p.spaceHoldDuration >= HOLD_THRESHOLD) {
        if (p.grappleAimAngle === undefined) {
          p.grappleAimAngle = p.facingLeft ? -Math.PI * 0.75 : -Math.PI * 0.25;
        }
        p.grappleAimAngle += 0.048; // clockwise rotation per frame (approx. 2.7 degrees)
        while (p.grappleAimAngle > Math.PI) p.grappleAimAngle -= Math.PI * 2;
        while (p.grappleAimAngle < -Math.PI) p.grappleAimAngle += Math.PI * 2;
      }
    }

    // C. Just Released space controls
    if (spaceJustReleased) {
      if (p.isHoldingSpace) {
        p.isHoldingSpace = false;
        if (p.grappleState.type === 'IDLE') {
          const duration = p.spaceHoldDuration || 0;
          if (duration < HOLD_THRESHOLD) {
            // Short press (tap): Execute mid-air double jump!
            if (p.doubleJumpAvailable) {
              p.vy = jumpStrength * 0.9;
              p.doubleJumpAvailable = false;
              sfx.playJump();
              spawnSparkParticles(p.x, p.y - 12, '#818cf8', 8);
            }
          } else {
            // Long press: Release to fire the grapple wire at the selected direction
            const grappleInfo = findGrappleTarget();
            if (grappleInfo) {
              const { target } = grappleInfo;
              sfx.playGrappleLaunch();
              p.grappleState = {
                type: 'FIRING',
                targetX: target.x,
                targetY: target.y,
                length: 10,
                angle: 0,
                angularVelocity: 0,
              };
              spawnSparkParticles(target.x, target.y, '#818cf8', 4);
            } else {
              sfx.playFailure();
            }
          }
        }
        p.spaceHoldDuration = 0;
      }
    }

    // D. Discrete W / ArrowUp jump and double jump controls
    // Guard this so keys are not eaten up/consumed when in active swinging or firing state (needed for wire length adjustment!)
    if (!isSwingingState && !isFiringState) {
      const isWOrUpPressed = keysPressed.current['w'] || keysPressed.current['arrowup'];
      if (isWOrUpPressed) {
        keysPressed.current['w'] = false;
        keysPressed.current['arrowup'] = false;
        if (p.isGrounded) {
          p.vy = jumpStrength;
          p.isGrounded = false;
          p.doubleJumpAvailable = true;
          sfx.playJump();
          spawnSparkParticles(p.x, p.y, '#e2e8f0', 5);
        } else {
          if (p.doubleJumpAvailable) {
            p.vy = jumpStrength * 0.9;
            p.doubleJumpAvailable = false;
            sfx.playJump();
            spawnSparkParticles(p.x, p.y - 12, '#818cf8', 8);
          }
        }
      }
    }

    // C. Grapple Hook Vector math
    const g = p.grappleState;
    if (g.type === 'FIRING') {
      // Line extends towards target ceiling anchor
      const dx = g.targetX - p.x;
      const dy = g.targetY - (p.y - p.height / 2);
      const targetDist = Math.sqrt(dx * dx + dy * dy);
      
      // Wire moves fast (40px per frame)
      g.length += 30;
      
      if (g.length >= targetDist) {
        // Wire hit anchor! Switch to swinging or pulling
        g.type = 'SWINGING';
        g.length = targetDist;
        
        // Calculate original pendulum angle and variables
        g.angle = Math.atan2(dy, dx);
        g.angularVelocity = p.vx / g.length; // convert linear velocity to angular
        sfx.playGrappleAttach();
        spawnSparkParticles(g.targetX, g.targetY, '#fcd34d', 8);
      }

      // Check max range cancel with a small animation margin
      const maxRange = selectedUpgrades.has('wire_range') ? 370 : 280;
      if (g.length > maxRange + 35) {
        g.type = 'IDLE';
      }
    } else if (g.type === 'SWINGING') {
      // Physics for pendulum swing: Player swings beneath (g.targetX, g.targetY)
      // Pendulum anchor point coordinates
      const anchorX = g.targetX;
      const anchorY = g.targetY;

      // Gravity force pulls downwards on player, calculating angular acceleration
      // angle is measured from positive vertical axis, but here simple polar swing calculations
      const playerYCenter = p.y - p.height / 2;
      const dx = p.x - anchorX;
      const dy = playerYCenter - anchorY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      // Force leash distance constraint (like a rope tension)
      if (currentDist > g.length) {
        // Compute direction unit vector
        const ux = dx / currentDist;
        const uy = dy / currentDist;

        // Pull player back to radius constraint
        p.x = anchorX + ux * g.length;
        p.y = anchorY + uy * g.length + p.height / 2;

        // Cancel velocity pointing outward of the tether circle
        const velDotRope = p.vx * ux + p.vy * uy;
        p.vx -= ux * velDotRope;
        p.vy -= uy * velDotRope;
      }

      // Apply slight pull/retracting swing speed if clicking up or forwards
      const swingSpeed = 0.32;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
        p.vx -= swingSpeed;
      }
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
        p.vx += swingSpeed;
      }

      // Reel-in action: Pull yourself up with S / W keys
      const reelSpeed = 4.5;
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
        g.length = Math.max(50, g.length - reelSpeed);
      }
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
        g.length = Math.min(g.length + reelSpeed, 420);
      }

      // Emit small sparkles along the wire rope
      if (frameCountRef.current % 6 === 0) {
        const t = Math.random();
        particlesRef.current.push({
          x: anchorX + dx * t,
          y: anchorY + dy * t,
          vx: 0,
          vy: 0.1,
          size: Math.random() * 2 + 1,
          color: '#818cf8',
          alpha: 0.8,
          life: 0,
          maxLife: 15,
          type: 'sparkle',
        });
      }
    }

    // Apply generic speed updates to player x and y
    p.x += p.vx;
    p.y += p.vy;

    // D. Collision against Level Boundaries
    p.x = Math.max(10, Math.min(level.mapWidth - 10, p.x));

    // Handle falling in pits
    if (p.y > level.mapHeight + 100) {
      handlePlayerDamage(1.5, 'Spike/Pit');
      p.x = level.spawnPoint.x;
      p.y = level.spawnPoint.y - 100;
      p.vx = 0;
      p.vy = 0;
      if (p.grappleState) p.grappleState.type = 'IDLE';
    }

    // E. Platforms Collision
    p.isGrounded = false;
    
    level.platforms.forEach((plat) => {
      // Check collision using standard Axis-Aligned Bounding Box (AABB) intersection
      const pLeft = p.x - p.width / 2;
      const pRight = p.x + p.width / 2;
      const pTop = p.y - p.height;
      const pBottom = p.y;

      const plLeft = plat.x;
      const plRight = plat.x + plat.width;
      const plTop = plat.y;
      const plBottom = plat.y + plat.height;

      const isColliding = 
        pRight > plLeft && 
        pLeft < plRight && 
        pBottom > plTop && 
        pTop < plBottom;

      if (isColliding) {
        // Resolve collision by computing the overlap on both axes and shifting the smallest overlap
        const overlapX = Math.min(pRight - plLeft, plRight - pLeft);
        const overlapY = Math.min(pBottom - plTop, plBottom - pTop);

        if (overlapX < overlapY) {
          // Horizontal resolution
          if (p.x < plat.x + plat.width / 2) {
            p.x -= overlapX;
          } else {
            p.x += overlapX;
          }
          p.vx = 0;
        } else {
          // Vertical resolution
          if (p.y < plat.y + plat.height / 2) {
            p.y -= overlapY;
            p.vy = 0;

            // Checked landing on top
            if (plat.type === 'hazard') {
              handlePlayerDamage(1.0, 'Hazard Floor');
              p.vy = -6; // bounce player up slightly
            } else if (plat.type === 'bounce') {
              p.vy = -12.5; // mega high jump!
              sfx.playJump();
              spawnSparkParticles(p.x, p.y, '#10b981', 12);
            } else {
              p.isGrounded = true;
              p.doubleJumpAvailable = true;
            }
          } else {
            p.y += overlapY;
            p.vy = Math.max(0, p.vy); // stop climbing through ceiling
          }
        }
      }
    });

    // F. Keycards and Locked Doors Operations
    keyCardsRef.current.forEach((card) => {
      if (card.isCollected) return;
      const dx = p.x - card.x;
      const dy = (p.y - p.height / 2) - card.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 25) {
        card.isCollected = true;
        sfx.playCollect();
        spawnSparkParticles(card.x, card.y, card.color === 'red' ? '#ef4444' : '#06b6d4', 12);
      }
    });

    lockedDoorsRef.current.forEach((door) => {
      if (door.isUnlocked) return;

      // Check if player has the card of corresponding door color
      const colorMatch = door.color === 'red' 
        ? keyCardsRef.current.find(k => k.color === 'red' && k.isCollected)
        : keyCardsRef.current.find(k => k.color === 'blue' && k.isCollected);

      // Player collides with locked door like a hard wall
      const pLeft = p.x - p.width / 2;
      const pRight = p.x + p.width / 2;
      const pTop = p.y - p.height;
      const pBottom = p.y;

      const dLeft = door.x;
      const dRight = door.x + door.width;
      const dTop = door.y;
      const dBottom = door.y + door.height;

      const isColliding = pRight > dLeft && pLeft < dRight && pBottom > dTop && pTop < dBottom;

      if (isColliding) {
        if (colorMatch) {
          // Open door!
          door.isUnlocked = true;
          sfx.playSuccess();
          spawnSparkParticles(door.x + door.width / 2, door.y + door.height / 2, '#4f46e5', 18);
        } else {
          // Push player away
          const overlapLeft = pRight - dLeft;
          const overlapRight = dRight - pLeft;
          if (overlapLeft < overlapRight) {
            p.x -= overlapLeft;
          } else {
            p.x += overlapRight;
          }
          p.vx = 0;
        }
      }
    });

    // G. Smoke Bomb Movement and Cloud Expansion
    smokeBombsRef.current.forEach((sb) => {
      if (!sb.isDetonated) {
        // Physics for rolling smoke grenade
        sb.vy += gravity * 0.9;
        sb.vx *= 0.98;
        sb.x += sb.vx;
        sb.y += sb.vy;

        // Collision of grenade on floor/walls
        level.platforms.forEach((plat) => {
          if (sb.x > plat.x && sb.x < plat.x + plat.width && sb.y > plat.y && sb.y < plat.y + plat.height) {
            // Hit! Detonate instantly!
            sb.isDetonated = true;
            sb.radius = 1;
            sb.vx = 0;
            sb.vy = 0;
            spawnSmokeParticles(sb.x, sb.y, 40);
          }
        });

        // Detonate after travel velocity drops or bounds limits
        if (Math.abs(sb.vx) < 0.1 && Math.abs(sb.vy) < 0.1) {
          sb.isDetonated = true;
          sb.radius = 1;
          spawnSmokeParticles(sb.x, sb.y, 40);
        }
      } else {
        // It's detonated, expand cloud radius to maximum 150px
        sb.radius = Math.min(160, sb.radius + 3.8);
        sb.life--;
      }
    });

    // Clear dead smoke bomb items
    smokeBombsRef.current = smokeBombsRef.current.filter((sb) => sb.life > 0);

    // H. Security Guards Sight Sweeps & Alert Tracking
    let searchlightsCaughtPlayer = false;

    guardsRef.current.forEach((guard) => {
      if (guard.isStunned) {
        guard.stunTimer--;
        if (guard.stunTimer <= 0) {
          guard.isStunned = false;
        }
        return;
      }

      // Check if guard lies inside any Active Smoke Bomb cloud
      const insideSmoke = smokeBombsRef.current.some(
        (sb) => sb.isDetonated && Math.sqrt((guard.x - sb.x) ** 2 + (guard.y - guard.height / 2 - sb.y) ** 2) < sb.radius
      );

      if (insideSmoke) {
        guard.isStunned = true;
        guard.stunTimer = 180; // stunned for 3 seconds
        spawnGlitchParticles(guard.x, guard.y - guard.height / 2, '#94a3b8', 6);
        return;
      }

      // Patrol movement
      if (guard.facingLeft) {
        guard.x -= guard.vx;
        if (guard.x <= guard.startX) {
          guard.facingLeft = false;
        }
      } else {
        guard.x += guard.vx;
        if (guard.x >= guard.endX) {
          guard.facingLeft = true;
        }
      }

      // Sweep sight angle back and forth slightly or look direct
      guard.sightAngle = Math.sin(frameCountRef.current * 0.04) * 0.12;

      // Sight cone sweep raycasts
      const range = guard.sightRange;
      const dx = p.x - guard.x;
      const dy = (p.y - p.height / 2) - (guard.y + 12); // eye level
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < range && !p.isStealth) {
        // Calculate angle of ray to player
        const rayAngle = Math.atan2(dy, dx);
        // Base direction angle
        const baseAngle = guard.facingLeft ? Math.PI : 0;
        const diffAngle = Math.abs(normalizeAngle(rayAngle - (baseAngle + guard.sightAngle)));

        // Cone of 30 degrees (roughly 0.5 rads)
        if (diffAngle < 0.42) {
          // Player is in sight!
          searchlightsCaughtPlayer = true;
        }
      }

      // Stealth melee takedown: Player jumps directly on top of guard to knock him out!
      const isStealthJump = 
        p.vx === 0 && p.vy > 0 &&
        p.x > guard.x - 20 && p.x < guard.x + 20 &&
        p.y >= guard.y - 10 && p.y <= guard.y + 15;

      if (isStealthJump) {
        guard.isStunned = true;
        guard.stunTimer = 240; // longer knockout 4 seconds
        p.vy = -6.5; // bounce up
        sfx.playSmokeBomb();
        spawnSparkParticles(guard.x, guard.y - guard.height / 2, '#475569', 15);
      }
    });

    // I. Security Cameras Angle sweeping
    camerasRef.current.forEach((camera) => {
      // Check if camera is inside active smoke cloud
      const insideSmoke = smokeBombsRef.current.some(
        (sb) => sb.isDetonated && Math.sqrt((camera.x - sb.x) ** 2 + (camera.y - sb.y) ** 2) < sb.radius
      );

      if (insideSmoke) {
        camera.isStunned = true;
        camera.stunTimer = 180;
        spawnGlitchParticles(camera.x, camera.y, '#38bdf8', 2);
        return;
      }

      if (camera.isStunned) {
        camera.stunTimer--;
        if (camera.stunTimer <= 0) {
          camera.isStunned = false;
        }
        return;
      }

      // Rotate camera back and forth
      camera.angle += camera.sweepSpeed;
      if (camera.angle > camera.sweepMax) {
        camera.angle = camera.sweepMax;
        camera.sweepSpeed = -Math.abs(camera.sweepSpeed);
      } else if (camera.angle < camera.sweepMin) {
        camera.angle = camera.sweepMin;
        camera.sweepSpeed = Math.abs(camera.sweepSpeed);
      }

      // Sight cone collision
      const dx = p.x - camera.x;
      const dy = (p.y - p.height / 2) - camera.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < camera.sightRange && !p.isStealth) {
        const rayAngle = Math.atan2(dy, dx);
        const diffAngle = Math.abs(normalizeAngle(rayAngle - camera.angle));
        
        // 25 degree cone
        if (diffAngle < 0.35) {
          searchlightsCaughtPlayer = true;
        }
      }
    });

    // J. Laser Grid collision checks
    lasersRef.current.forEach((laser) => {
      if (laser.pulseInterval > 0) {
        laser.pulseTimer += 16.66; // approx ms at 60fps
        if (laser.pulseTimer >= laser.pulseInterval) {
          laser.isActive = !laser.isActive;
          laser.pulseTimer = 0;
        }
      }

      if (!laser.isActive) return;

      // Check laser line intersect with player outline bounding box
      // To simplify line-segment to box collision, compute distance of player center x/y to the laser segment
      // Or check intersect with player's bounding lines
      if (!p.isStealth) {
        const caughtByLaser = lineRectIntersect(
          laser.x1, laser.y1, laser.x2, laser.y2,
          p.x - p.width / 2, p.y - p.height, p.width, p.height
        );

        if (caughtByLaser) {
          searchlightsCaughtPlayer = true;
          // Spawn zap sparks
          if (frameCountRef.current % 4 === 0) {
            spawnSparkParticles(p.x, p.y - p.height / 2, '#ef4444', 3);
          }
        }
      }
    });

    // K. Alert Level increment / decay computations
    if (searchlightsCaughtPlayer) {
      // Rapid increment of alert level
      alertLevelRef.current = Math.min(100, alertLevelRef.current + 2.2);
      
      // Play alert periodic beep
      const now = Date.now();
      if (now - lastAlertSoundTime.current > 420) {
        sfx.playAlert();
        lastAlertSoundTime.current = now;
      }

      // Spark warning trail near player
      if (frameCountRef.current % 5 === 0) {
        spawnSparkParticles(p.x, p.y - p.height, '#ef4444', 2);
      }
    } else {
      // Slowly drop alert level
      alertLevelRef.current = Math.max(0, alertLevelRef.current - 0.15);
    }

    // L. Alert Level 100% Extreme security response: Drone patrols!
    if (alertLevelRef.current >= 100) {
      if (droidsRef.current.length === 0) {
        // Spawn our first security micro-drone overhead!
        droidsRef.current.push({
          x: p.x - 200,
          y: 60,
          vx: 0,
          vy: 0,
          targetX: p.x,
          targetY: 80,
          laserAngle: Math.PI / 2,
          laserSweepDir: 0.02,
          shootCooldown: 0,
        });
      }

      // Update Security Drones
      droidsRef.current.forEach((dr) => {
        // Seek player horizontally overhead
        dr.targetX = p.x;
        dr.targetY = p.y - 180; // hover overhead

        dr.x += (dr.targetX - dr.x) * 0.05; // ease to player
        dr.y += (dr.targetY - dr.y) * 0.05;

        // Droids project red search lasers downwards
        dr.laserAngle += dr.laserSweepDir;
        if (dr.laserAngle > Math.PI / 2 + 0.5 || dr.laserAngle < Math.PI / 2 - 0.5) {
          dr.laserSweepDir = -dr.laserSweepDir;
        }

        // Search sweep hits player!
        const laserEndX = dr.x + Math.cos(dr.laserAngle) * 400;
        const laserEndY = dr.y + Math.sin(dr.laserAngle) * 400;

        const droneLaserCaught = lineRectIntersect(
          dr.x, dr.y, laserEndX, laserEndY,
          p.x - p.width / 2, p.y - p.height, p.width, p.height
        );

        if (droneLaserCaught && !p.isStealth) {
          // Direct alert damage!
          handlePlayerDamage(0.08, 'Security Overdrive Drone');
          spawnSparkParticles(p.x, p.y - p.height / 2, '#f43f5e', 2);
        }
      });
    } else {
      droidsRef.current = []; // dismiss droids if security settles
    }

    // M. Coins and gems looting
    treasuresRef.current.forEach((t) => {
      if (t.isCollected) return;

      // Distance check from chest or gem to player center
      const dx = p.x - t.x;
      const dy = (p.y - p.height / 2) - t.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 30) {
        t.isCollected = true;
        sfx.playCollect();

        // Add score values
        let sparkColor = '#f59e0b'; // Gold
        if (t.type === 'silver') sparkColor = '#cbd5e1';
        if (t.type === 'bronze') sparkColor = '#b45309';
        if (t.type === 'legendary') {
          sparkColor = '#c084fc'; // Purple magic jewel
          scoreRef.current += t.value;
          gemsCollectedRef.current++;
        } else {
          scoreRef.current += t.value;
          gemsCollectedRef.current++;
        }

        // Spawn glitter cascade
        for (let i = 0; i < 15; i++) {
          particlesRef.current.push({
            x: t.x,
            y: t.y,
            vx: (Math.random() * 4 - 2),
            vy: (Math.random() * -4),
            size: Math.random() * 3.5 + 1.5,
            color: sparkColor,
            alpha: 1,
            life: 0,
            maxLife: Math.random() * 30 + 30,
            type: 'sparkle',
          });
        }
      }
    });

    // N. Scroll Camera tracking based on player location
    cameraScrollX.current += (p.x - 280 - cameraScrollX.current) * 0.08;
    // Bound camera view to map width limit
    cameraScrollX.current = Math.max(0, Math.min(level.mapWidth - 800, cameraScrollX.current));

    cameraScrollY.current += (p.y - 250 - cameraScrollY.current) * 0.08;
    cameraScrollY.current = Math.max(0, Math.min(level.mapHeight - 500, cameraScrollY.current));

    // O. Update Particles animations
    particlesRef.current.forEach((pt) => {
      pt.life++;
      if (pt.type === 'dust') {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha = 1 - (pt.life / pt.maxLife);
      } else if (pt.type === 'spark') {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.08; // small drop
        pt.alpha = 1 - (pt.life / pt.maxLife);
      } else if (pt.type === 'smoke') {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.98;
        pt.vy *= 0.98;
        pt.size += 0.15; // expanding cloud
        pt.alpha = 0.8 * (1 - (pt.life / pt.maxLife));
      } else if (pt.type === 'sparkle') {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha = 0.9 * (1 - (pt.life / pt.maxLife));
      } else if (pt.type === 'glitch') {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha = 1 - (pt.life / pt.maxLife);
      }
    });

    // Clear faded out particles
    particlesRef.current = particlesRef.current.filter((pt) => pt.life < pt.maxLife);

    // P. Check Game Over or Clear State Conditionals
    if (p.health <= 0) {
      triggerGameOver('HEALTH_DEPLETED');
    }

    // Goal clear: check collision with goal point
    const goalX = level.goalPoint.x;
    const goalY = level.goalPoint.y;

    // Has collected the legendary target jewel before escaping?
    const blockGoal = treasuresRef.current.some(t => t.type === 'legendary' && !t.isCollected);

    const distanceToGoal = Math.sqrt((p.x - goalX) ** 2 + ((p.y - p.height / 2) - goalY) ** 2);
    if (distanceToGoal < 45) {
      if (blockGoal) {
        // Overlay tooltip or visual effect indicating main jewel needs retrieval
        if (frameCountRef.current % 30 === 0) {
          spawnSparkParticles(goalX, goalY, '#f43f5e', 5);
        }
      } else {
        triggerStageClear();
      }
    }

    // Q. Notify React states about HUD specifications
    onUpdateStats(
      { ...p }, 
      {
        score: scoreRef.current,
        coins: scoreRef.current, // cumulative stolen gems
        alertLevel: alertLevelRef.current,
        stealthRating: getRating(alertLevelRef.current),
        timeElapsed: timeElapsedRef.current,
        gemsCollected: gemsCollectedRef.current,
        totalGems: treasuresRef.current.length,
      },
      {
        red: keyCardsRef.current.some(k => k.color === 'red' && k.isCollected),
        blue: keyCardsRef.current.some(k => k.color === 'blue' && k.isCollected),
      }
    );
  };

  // Inflict damage with immune ticks
  const lastDamageTime = useRef<number>(0);
  const handlePlayerDamage = (amount: number, source: string) => {
    const now = Date.now();
    if (now - lastDamageTime.current > 1000) { // 1 second immunity
      const p = playerRef.current;
      p.health = Math.max(0, p.health - amount);
      sfx.playFailure();
      lastDamageTime.current = now;
      spawnSparkParticles(p.x, p.y - p.height / 2, '#ef4444', 15);
    }
  };

  // Determine overhead structural block when standing up from slide
  const checkPlatformOverhead = (): boolean => {
    const p = playerRef.current;
    let hit = false;
    // Check rectangular path representing player upper-body standing size
    const testTop = p.y - 48; // full height size
    const testBottom = p.y - 24; // slide half
    const testLeft = p.x - p.width / 2;
    const testRight = p.x + p.width / 2;

    level.platforms.forEach((plat) => {
      const plLeft = plat.x;
      const plRight = plat.x + plat.width;
      const plTop = plat.y;
      const plBottom = plat.y + plat.height;

      if (testRight > plLeft && testLeft < plRight && testBottom > plTop && testTop < plBottom) {
        hit = true;
      }
    });

    return hit;
  };

  // Angle normalization helper
  const normalizeAngle = (angle: number): number => {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  };

  // Simple intersection checks
  const lineRectIntersect = (
    x1: number, y1: number, x2: number, y2: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean => {
    // Check if the line intersects any of the 4 bounding box edges of the player
    const left = lineLineIntersect(x1, y1, x2, y2, rx, ry, rx, ry + rh);
    const right = lineLineIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
    const top = lineLineIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry);
    const bottom = lineLineIntersect(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);

    // Or if the line endpoints are fully inside the rect
    const pointInside = x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh;

    return left || right || top || bottom || pointInside;
  };

  const lineLineIntersect = (
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): boolean => {
    const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
      return true;
    }
    return false;
  };

  // Grade Rating Generator
  const getRating = (alertMax: number): 'S' | 'A' | 'B' | 'C' | 'D' => {
    if (alertMax < 15) return 'S'; // Stealth ghost
    if (alertMax < 40) return 'A';
    if (alertMax < 70) return 'B';
    if (alertMax < 90) return 'C';
    return 'D';
  };

  const triggerGameOver = (reason: string) => {
    const score = scoreRef.current;
    const accumCoins = scoreRef.current;
    
    // Save coins earned to total local storage bank
    const saved = localStorage.getItem('kaitou_total_coins');
    const existing = saved ? parseInt(saved, 10) : 0;
    localStorage.setItem('kaitou_total_coins', (existing + accumCoins).toString());

    onGameOver({
      score,
      coins: accumCoins,
      alertLevel: alertLevelRef.current,
      stealthRating: getRating(alertLevelRef.current),
      timeElapsed: timeElapsedRef.current,
      gemsCollected: gemsCollectedRef.current,
      totalGems: treasuresRef.current.length,
    }, reason);
  };

  const triggerStageClear = () => {
    const score = scoreRef.current;
    const accumCoins = scoreRef.current;

    // Save earned gems to bank
    const saved = localStorage.getItem('kaitou_total_coins');
    const existing = saved ? parseInt(saved, 10) : 0;
    localStorage.setItem('kaitou_total_coins', (existing + accumCoins).toString());

    onStageClear({
      score,
      coins: accumCoins,
      alertLevel: alertLevelRef.current,
      stealthRating: getRating(alertLevelRef.current),
      timeElapsed: timeElapsedRef.current,
      gemsCollected: gemsCollectedRef.current,
      totalGems: treasuresRef.current.length,
    });
  };

  // Rendering Master Frame with Canvas API contexts
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Frame
    ctx.clearRect(0, 0, 800, 500);

    // Save scroll translation offset
    ctx.save();
    ctx.translate(-cameraScrollX.current, -cameraScrollY.current);

    // 1. Draw Starry Moon night and city buildings (Relative background scroll)
    drawBackground(ctx);

    // 2. Draw Platforms (Museum wood/carbon patterns with fluorescent edges)
    drawPlatforms(ctx);

    // 3. Draw Locked Doors & Escape points
    drawDoorsAndEscapes(ctx);

    // 4. Draw Security Cameras Sweeping Light Cones
    drawCameras(ctx);

    // 5. Draw Guard patrol lines & flashlight search cones
    drawGuards(ctx);

    // 6. Draw glowing Laser lines
    drawLasers(ctx);

    // 7. Draw Drones if Alert 100% active
    drawDrones(ctx);

    // 8. Draw Keycards & Gems / Treasures
    drawCollectibles(ctx);

    // 9. Draw active physical Smoke Grenades and Smoke clouds
    drawSmokeZones(ctx);

    // 10. Draw particles trails
    drawParticles(ctx);

    // 11. Draw Player (Thief silhouette with top hat and animated waving physics cape)
    drawPlayer(ctx);

    // 12. Draw Grappling Wire Rope
    drawGrappleWire(ctx);

    // 13. Draw Interactive Tactical Aim / Wire Guide UI
    drawGrappleGuide(ctx);

    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Night sky dark gradient inside museums
    const grad = ctx.createLinearGradient(
      cameraScrollX.current, 
      cameraScrollY.current, 
      cameraScrollX.current + 800, 
      cameraScrollY.current + 500
    );
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(0.5, '#020617');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(cameraScrollX.current, cameraScrollY.current, 800, 500);

    // Distant background silhouettes of skyline (scroll parallax factor 0.3)
    const parallaxX = cameraScrollX.current * 0.3;
    const parallaxY = cameraScrollY.current * 0.3;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    
    // Static Moon drawn once in distance
    ctx.save();
    ctx.translate(parallaxX, parallaxY);
    ctx.beginPath();
    ctx.arc(680, 100, 45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();
    
    // Moon crater circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.beginPath(); ctx.arc(660, 80, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(690, 110, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(685, 80, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Parallax Skyline buildings
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    for (let i = 0; i < 20; i++) {
      const bWidth = 120 + (i % 3) * 30;
      const bHeight = 150 + (i % 4) * 50;
      const bx = i * 160 - parallaxX;
      const by = 500 + parallaxY - bHeight;
      ctx.fillRect(bx, by, bWidth, bHeight);

      // Simple yellow/blue building matrix windows representation
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      if (i % 2 === 0) {
        for (let wy = by + 20; wy < by + bHeight - 20; wy += 25) {
          ctx.fillRect(bx + 15, wy, 8, 8);
          ctx.fillRect(bx + 35, wy, 8, 8);
          if (bWidth > 130) ctx.fillRect(bx + 55, wy, 8, 8);
        }
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)'; // restore
    }
  };

  const drawPlatforms = (ctx: CanvasRenderingContext2D) => {
    level.platforms.forEach((plat) => {
      ctx.save();

      if (plat.type === 'hazard') {
        // Red electric floor spikes glowing stripes
        ctx.fillStyle = '#1e1c1c';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Stripes
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let sx = plat.x; sx < plat.x + plat.width; sx += 20) {
          ctx.moveTo(sx, plat.y + plat.height);
          ctx.lineTo(sx + 10, plat.y);
        }
        ctx.stroke();

        // Glowing red safety cap wire
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plat.x, plat.y);
        ctx.lineTo(plat.x + plat.width, plat.y);
        ctx.stroke();

      } else if (plat.type === 'bounce') {
        // Glowing bounce trampoline neon pad
        ctx.fillStyle = '#065f46';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#10b981';
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Arrows indicator
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.moveTo(plat.x + plat.width / 2, plat.y + 4);
        ctx.lineTo(plat.x + plat.width / 2 - 8, plat.y + 12);
        ctx.lineTo(plat.x + plat.width / 2 + 8, plat.y + 12);
        ctx.closePath();
        ctx.fill();

      } else {
        // Regular platform carbon slate pattern
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Neon metallic blue trim
        ctx.strokeStyle = '#4f46e5';
        ctx.strokeStyle = 'rgba(79, 70, 229, 0.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Museum elegant gold accent inner line for depth
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(plat.x + 3, plat.y + 3, plat.width - 6, plat.height - 6);
      }

      ctx.restore();
    });
  };

  const drawDoorsAndEscapes = (ctx: CanvasRenderingContext2D) => {
    // Locked Doors
    lockedDoorsRef.current.forEach((door) => {
      if (door.isUnlocked) return;
      
      const themeColor = door.color === 'red' ? '#f43f5e' : '#22d3ee';
      ctx.fillStyle = 'rgba(23, 23, 23, 0.95)';
      ctx.fillRect(door.x, door.y, door.width, door.height);

      // Frame outlining with locks glowing tags
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 6;
      ctx.shadowColor = themeColor;
      ctx.strokeRect(door.x, door.y, door.width, door.height);

      // Keyhole tag visual
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(door.x + door.width / 2, door.y + door.height / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(door.x + door.width / 2 - 2.5, door.y + door.height / 2 + 3, 5, 8);
    });

    // Escape Goal point (e.g. big metal vault with moon emblem or getaway chopper door)
    const goalX = level.goalPoint.x;
    const goalY = level.goalPoint.y;

    ctx.save();
    // Glowing green getaway circular portal or double vault door
    ctx.fillStyle = '#171717';
    ctx.beginPath();
    ctx.arc(goalX, goalY, 32, 0, Math.PI * 2);
    ctx.fill();

    const escFinished = treasuresRef.current.some(t => t.type === 'legendary' && !t.isCollected);
    const ringColor = escFinished ? 'rgba(148, 163, 184, 0.4)' : '#10b981';

    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = ringColor;
    ctx.stroke();

    // Inner details - theft target complete icon
    ctx.fillStyle = ringColor;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(escFinished ? 'SECURE' : 'ESCAPE', goalX, goalY - 14);

    // Escape arrow logo in center
    ctx.beginPath();
    ctx.moveTo(goalX - 10, goalY + 5);
    ctx.lineTo(goalX + 10, goalY + 5);
    ctx.lineTo(goalX + 10, goalY - 2);
    ctx.lineTo(goalX + 15, goalY - 2);
    ctx.lineTo(goalX, goalY - 17);
    ctx.lineTo(goalX - 15, goalY - 2);
    ctx.lineTo(goalX - 10, goalY - 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawCameras = (ctx: CanvasRenderingContext2D) => {
    camerasRef.current.forEach((camera) => {
      // Wall mounting bracket anchor
      ctx.fillStyle = '#475569';
      ctx.fillRect(camera.x - 6, camera.y - 12, 12, 12);
      
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(camera.x, camera.y - 10);
      ctx.lineTo(camera.x, camera.y);
      ctx.stroke();

      // Camera body swivel indicator
      ctx.translate(camera.x, camera.y);
      ctx.rotate(camera.angle);
      
      // Cam casing
      ctx.fillStyle = camera.isStunned ? '#64748b' : '#1e293b';
      ctx.fillRect(-12, -6, 24, 12);
      
      // Red lens glowing indicator dot
      ctx.fillStyle = camera.isStunned ? '#cbd5e1' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(8, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Undo translations
      ctx.rotate(-camera.angle);
      ctx.translate(-camera.x, -camera.y);

      if (camera.isStunned) {
        // Draw spinning stun loops!
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px sans-serif';
        ctx.fillText('⚡ Stunned', camera.x - 22, camera.y + 24);
        return;
      }

      // Draw Volumetric Sweep Search Cone
      const coneGrad = ctx.createRadialGradient(
        camera.x, camera.y, 10,
        camera.x, camera.y, camera.sightRange
      );
      
      // Flash Alert Yellow/Amber light cone
      const coneColor = alertLevelRef.current > 60 ? 'rgba(239, 68, 68, ' : 'rgba(234, 179, 8, ';
      coneGrad.addColorStop(0, coneColor + '0.25)');
      coneGrad.addColorStop(0.5, coneColor + '0.12)');
      coneGrad.addColorStop(1, coneColor + '0.0)');

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(camera.x, camera.y);
      // Sweep cone geometry (approx 25 degrees)
      const sweepLeft = camera.angle - 0.22;
      const sweepRight = camera.angle + 0.22;
      ctx.lineTo(
        camera.x + Math.cos(sweepLeft) * camera.sightRange,
        camera.y + Math.sin(sweepLeft) * camera.sightRange
      );
      ctx.arc(
        camera.x, camera.y, camera.sightRange,
        sweepLeft, sweepRight, false
      );
      ctx.lineTo(camera.x, camera.y);
      ctx.closePath();
      ctx.fill();
    });
  };

  const drawGuards = (ctx: CanvasRenderingContext2D) => {
    guardsRef.current.forEach((guard) => {
      // Body visual
      ctx.fillStyle = guard.isStunned ? '#2e3a4e' : '#0f172a'; // dark security police suit
      
      // Head with security peaked cap
      ctx.fillRect(guard.x - 8, guard.y - 12 - 38, 16, 12);
      ctx.fillStyle = '#fbcfe8'; // pale skin
      ctx.fillRect(guard.x - 7, guard.y - 38, 14, 10);
      
      // Cap rim
      ctx.fillStyle = '#020617';
      ctx.fillRect(guard.x - (guard.facingLeft ? 11 : 7), guard.y - 14 - 38, 18, 4);

      // Trench coat body
      ctx.fillStyle = guard.isStunned ? '#475569' : '#1e293b';
      ctx.fillRect(guard.x - 12, guard.y - 28, 24, 28);

      // Legs pacing animation overlay
      ctx.fillStyle = '#020617';
      const legStride = guard.isStunned ? 0 : Math.sin(frameCountRef.current * 0.15 + guard.x * 0.05) * 6;
      ctx.fillRect(guard.x - 8, guard.y, 4, 1); // stub floor
      ctx.fillRect(guard.x + 4, guard.y, 4, 1);

      // Stunned indicator loops above head
      if (guard.isStunned) {
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const spinY = guard.y - 58 + Math.sin(frameCountRef.current * 0.2) * 2;
        ctx.ellipse(guard.x, spinY, 12, 4, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fcd34d';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ZZZ', guard.x, guard.y - 64);
        return;
      }

      // Flashlight cone (facing direct)
      const baseAngle = guard.facingLeft ? Math.PI : 0;
      const lightAngle = baseAngle + guard.sightAngle;

      const flashlightX = guard.x + (guard.facingLeft ? -10 : 10);
      const flashlightY = guard.y - 16; // hand level

      // Flashlight body handle
      ctx.fillStyle = '#64748b';
      ctx.fillRect(flashlightX - (guard.facingLeft ? 4 : 0), flashlightY - 3, 8, 5);

      const coneGrad = ctx.createRadialGradient(
        flashlightX, flashlightY, 5,
        flashlightX, flashlightY, guard.sightRange
      );
      
      const coneColor = alertLevelRef.current > 60 ? 'rgba(239, 68, 68, ' : 'rgba(255, 255, 255, ';
      coneGrad.addColorStop(0, coneColor + '0.22)');
      coneGrad.addColorStop(0.5, coneColor + '0.10)');
      coneGrad.addColorStop(1, coneColor + '0.0)');

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(flashlightX, flashlightY);
      
      const sweepLeft = lightAngle - 0.35;
      const sweepRight = lightAngle + 0.35;

      ctx.lineTo(
        flashlightX + Math.cos(sweepLeft) * guard.sightRange,
        flashlightY + Math.sin(sweepLeft) * guard.sightRange
      );
      ctx.arc(
        flashlightX, flashlightY, guard.sightRange,
        sweepLeft, sweepRight, false
      );
      ctx.lineTo(flashlightX, flashlightY);
      ctx.closePath();
      ctx.fill();
    });
  };

  const drawLasers = (ctx: CanvasRenderingContext2D) => {
    lasersRef.current.forEach((laser) => {
      if (!laser.isActive) return;

      ctx.save();
      
      // Drawing laser glowing line
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#f43f5e';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();

      // Draw shiny terminals at wire terminals
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(laser.x1, laser.y1, 4, 0, Math.PI * 2);
      ctx.arc(laser.x2, laser.y2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  };

  const drawDrones = (ctx: CanvasRenderingContext2D) => {
    droidsRef.current.forEach((dr) => {
      ctx.save();
      
      // Floating Drone metal chassis body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(dr.x, dr.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spinning drone blades left and right
      ctx.fillStyle = '#475569';
      const bladeW = Math.sin(frameCountRef.current * 0.8) * 16;
      ctx.fillRect(dr.x - 22, dr.y - 12, 10, 2);
      ctx.fillRect(dr.x + 12, dr.y - 12, 10, 2);

      // Red central camera lens eye
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(dr.x, dr.y + 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Drone search laser segment
      const laserLength = 350;
      const endX = dr.x + Math.cos(dr.laserAngle) * laserLength;
      const endY = dr.y + Math.sin(dr.laserAngle) * laserLength;

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(dr.x, dr.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      ctx.restore();
    });
  };

  const drawCollectibles = (ctx: CanvasRenderingContext2D) => {
    // Treasures (Bronze, Silver, Gold, Gems, Legendary Diamond target)
    treasuresRef.current.forEach((t) => {
      if (t.isCollected) return;

      ctx.save();

      if (t.type === 'legendary') {
        // Draw the majestic pulsing main mission objective diamond (Gemini Star!)
        const scale = 1.0 + Math.sin(frameCountRef.current * 0.08) * 0.12;
        ctx.translate(t.x, t.y);
        ctx.scale(scale, scale);

        // Holographic secure pedestal base
        ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.fillRect(-15, 12, 30, 6);

        // Core Glowing diamond
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#c084fc';
        ctx.fillStyle = '#8b5cf6'; // Violet jewel core
        
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, -6);
        ctx.lineTo(0, 8);
        ctx.lineTo(-14, -6);
        ctx.closePath();
        ctx.fill();

        // Shimmering reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(6, -6);
        ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();

      } else {
        // Normal shiny coins
        let gemColor = '#f59e0b'; // Gold
        let edgeColor = '#d97706';
        let radius = 6.5;

        if (t.type === 'silver') {
          gemColor = '#cbd5e1';
          edgeColor = '#94a3b8';
          radius = 5.5;
        } else if (t.type === 'bronze') {
          gemColor = '#b45309';
          edgeColor = '#78350f';
          radius = 4.5;
        }

        // Bobbing gem animation
        const bobY = Math.sin(frameCountRef.current * 0.06 + t.x * 0.1) * 3.5;

        // Draw crystal gem diamond polygon
        ctx.shadowBlur = 4;
        ctx.shadowColor = gemColor;
        ctx.fillStyle = gemColor;
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(t.x, t.y + bobY - radius);
        ctx.lineTo(t.x + radius, t.y + bobY);
        ctx.lineTo(t.x, t.y + bobY + radius);
        ctx.lineTo(t.x - radius, t.y + bobY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });

    // Keycards floating items
    keyCardsRef.current.forEach((card) => {
      if (card.isCollected) return;

      const cardColor = card.color === 'red' ? '#ef4444' : '#06b6d4';
      const bobY = Math.sin(frameCountRef.current * 0.08 + card.x * 0.1) * 3;

      // Draw Keycard plastic rect
      ctx.save();
      ctx.fillStyle = 'rgba(23, 23, 23, 0.9)';
      ctx.fillRect(card.x - 7, card.y + bobY - 11, 14, 22);

      ctx.strokeStyle = cardColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(card.x - 7, card.y + bobY - 11, 14, 22);

      // Gold magnetic chip stripe
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(card.x - 4, card.y + bobY - 6, 8, 4);

      ctx.restore();
    });
  };

  const drawSmokeZones = (ctx: CanvasRenderingContext2D) => {
    smokeBombsRef.current.forEach((sb) => {
      if (!sb.isDetonated) {
        // Draw spinning metal grenade traveling
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(sb.x, sb.y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Detonated smoke clouds. Beautiful expanding volumetric vapor circles.
        ctx.save();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.08)'; // translucent charcoal grey
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 3;

        // Draw multiple overlapping clouds for volume feel
        for (let i = 0; i < 4; i++) {
          const shiftAngle = (i * Math.PI) / 2;
          const sx = sb.x + Math.cos(shiftAngle) * (sb.radius * 0.3);
          const sy = sb.y + Math.sin(shiftAngle) * (sb.radius * 0.3);

          ctx.beginPath();
          ctx.arc(sx, sy, sb.radius * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      }
    });
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach((pt) => {
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D) => {
    const p = playerRef.current;
    ctx.save();
    
    // Transparent glitch effect when stealthing
    if (p.isStealth) {
      ctx.globalAlpha = 0.28;
    }

    // Facing direction mirror flip
    ctx.translate(p.x, p.y);
    if (p.facingLeft) {
      ctx.scale(-1, 1);
    }

    // A. Elegant physics wavy cape trailing (purple neon gradient)
    // Dynamic tail calculations based on thief horizontal velocity
    ctx.fillStyle = '#4f46e5'; // Deep Indigo
    const capeW = 18;
    const capeH = p.isSliding ? 14 : 36;
    const wave = Math.sin(frameCountRef.current * 0.15) * 3;
    const trailOffset = -p.vx * 1.5 - (p.isSliding ? 12 : 5);

    // Draw wavy polygon for cape
    ctx.beginPath();
    ctx.moveTo(-2, -p.height + 15); // collar
    ctx.quadraticCurveTo(
      -12 + trailOffset, -p.height / 2 + wave,
      -22 + trailOffset * 1.5, -p.height + capeH + wave
    ); // wavy end
    ctx.lineTo(-6, -p.height / 2);
    ctx.closePath();
    ctx.fill();

    // B. Player Core clothes (Sleek black charcoal jumpsuit)
    ctx.fillStyle = '#171717';
    const bodyW = 16;
    const bodyH = p.height - 12;
    ctx.fillRect(-bodyW / 2, -bodyH, bodyW, bodyH);

    // Silver utility harness straps
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-bodyW / 2, -bodyH + 8, bodyW, 3);

    // Face / Mask wrapping
    ctx.fillStyle = '#fbcfe8'; // pale face
    ctx.fillRect(-6, -p.height, 12, 10);

    ctx.fillStyle = '#171717'; // mask wrap over face
    ctx.fillRect(-6.5, -p.height + 3, 13, 4);

    // Glowing white eyes dots
    ctx.fillStyle = p.isStealth ? '#22d3ee' : '#ffffff';
    ctx.beginPath();
    ctx.arc(2, -p.height + 4.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // C. Iconic Thief Black Top Hat
    ctx.fillStyle = '#020617'; // top-hat black
    ctx.fillRect(-10, -p.height - 2, 20, 3); // cylinder rim
    ctx.fillRect(-7, -p.height - 16, 14, 14); // cylinder cap

    // Gold silk ribbon strap on hat
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-7, -p.height - 5, 14, 3.5);

    // Restore context transforms
    ctx.restore();
  };

  const drawGrappleWire = (ctx: CanvasRenderingContext2D) => {
    const p = playerRef.current;
    const g = p.grappleState;

    if (g.type === 'FIRING' || g.type === 'SWINGING') {
      ctx.save();
      
      // Wire steel color with neon blue core glow
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      // Draw wire connecting player center to target ceiling anchor
      ctx.moveTo(p.x, p.y - p.height / 2);
      
      if (g.type === 'FIRING') {
        // Wire extends progressively
        const dx = g.targetX - p.x;
        const dy = g.targetY - (p.y - p.height / 2);
        const ratio = g.length / Math.sqrt(dx * dx + dy * dy);
        const currLineX = p.x + dx * Math.min(1.0, ratio);
        const currLineY = (p.y - p.height / 2) + dy * Math.min(1.0, ratio);
        ctx.lineTo(currLineX, currLineY);
      } else {
        ctx.lineTo(g.targetX, g.targetY);
      }
      ctx.stroke();

      // Shiny glowing claw grabber hook at anchor point
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#22d3ee';
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(g.targetX, g.targetY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Distinct cyan shell contour
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(g.targetX, g.targetY, 7.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  };

  const drawGrappleGuide = (ctx: CanvasRenderingContext2D) => {
    const p = playerRef.current;
    
    // Check if showing aim is appropriate
    if (isPaused) return;

    const maxRange = selectedUpgrades.has('wire_range') ? 370 : 280;

    const px = p.x;
    const py = p.y - p.height / 2;

    const isActuallyHolding = !!p.isHoldingSpace && (p.spaceHoldDuration !== undefined && p.spaceHoldDuration >= 9);

    // A. Transparent outer range boundary indicator (Dotted Circle/Halo around player)
    ctx.save();
    ctx.strokeStyle = p.grappleState.type === 'IDLE' ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(px, py, maxRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // If player is already actively utilizing wire, project active release helper
    if (p.grappleState.type === 'SWINGING' || p.grappleState.type === 'FIRING') {
      ctx.save();
      const wave = 9 + Math.sin(frameCountRef.current * 0.18) * 3;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.grappleState.targetX, p.grappleState.targetY, wave, 0, Math.PI * 2);
      ctx.stroke();

      // Draw small text showing "[SPACE] TO RELEASE" near the active anchor
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
      ctx.font = '8px system-ui, sans-serif';
      ctx.fillText('[SPACE]: RELEASE', p.grappleState.targetX + 12, p.grappleState.targetY + 3);
      ctx.restore();
      return;
    }

    // B. Draw rotating laser aiming beam if player is holding space (exceeding HOLD threshold)
    if (isActuallyHolding && p.grappleAimAngle !== undefined) {
      ctx.save();
      const laserX = px + Math.cos(p.grappleAimAngle) * maxRange;
      const laserY = py + Math.sin(p.grappleAimAngle) * maxRange;

      // Draw elegant neon sweeping line
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.45)'; // Indigo-400 transparent laser
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(laserX, laserY);
      ctx.stroke();

      // Draw subtle orbital gauge arc near player showing rotation intent
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.arc(px, py, 35, p.grappleAimAngle - 0.5, p.grappleAimAngle);
      ctx.stroke();

      // Draw small arrowhead indicating clockwise rotation direction
      const arrowAngle = p.grappleAimAngle;
      const arrowX = px + Math.cos(arrowAngle) * 35;
      const arrowY = py + Math.sin(arrowAngle) * 35;
      ctx.fillStyle = 'rgba(129, 140, 248, 0.7)';
      ctx.beginPath();
      ctx.arc(arrowX, arrowY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // C. Calculate live snap coordinate for HUD locks (purely Auto-Aim based)
    const grappleInfo = findGrappleTarget();

    // D. Draw targeted HUD elements based on snap calculation
    if (grappleInfo) {
      const tgt = grappleInfo.target;
      const minDistance = grappleInfo.distance;

      // 1. Sleek laser trajectory guide link (Cyan transparent dashed path from player to target platform)
      ctx.save();
      ctx.strokeStyle = isActuallyHolding ? 'rgba(34, 211, 238, 0.85)' : 'rgba(34, 211, 238, 0.55)'; // highlight when holding
      ctx.lineWidth = isActuallyHolding ? 1.6 : 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      ctx.restore();

      // 2. High-Tech Snapping cursor on target surface
      ctx.save();
      const waveVal = 8 + Math.sin(frameCountRef.current * 0.15) * 2;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = isActuallyHolding ? 2.2 : 1.8;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#22d3ee';
      
      // Target Diamond bracket
      ctx.beginPath();
      ctx.moveTo(tgt.x, tgt.y - waveVal);
      ctx.lineTo(tgt.x + waveVal, tgt.y);
      ctx.lineTo(tgt.x, tgt.y + waveVal);
      ctx.lineTo(tgt.x - waveVal, tgt.y);
      ctx.closePath();
      ctx.stroke();

      // Inner snap dot
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Status text label near the target point directly
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#22d3ee';
      ctx.font = '900 8.5px system-ui, sans-serif';
      ctx.fillText(isActuallyHolding ? 'AIM LOCKED - RELEASE' : 'GRAPPLE LOCK-ON', tgt.x + 14, tgt.y - 4);
      
      const distancePercent = Math.round((minDistance / maxRange) * 100);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '7.5px system-ui, sans-serif';
      const actionText = isActuallyHolding ? 'RELEASE [SPACE] TO SWING' : '[SPACE] TO SWING';
      ctx.fillText(`RANGE: ${distancePercent}% | ${actionText}`, tgt.x + 14, tgt.y + 7);
      ctx.restore();
    } else if (isActuallyHolding && p.grappleAimAngle !== undefined) {
      // 4. If holding but no target exists along this angle, draw helper near player
      ctx.save();
      ctx.fillStyle = 'rgba(165, 180, 252, 0.7)';
      ctx.font = '8px system-ui, sans-serif';
      ctx.fillText('AIM ROTATING (RELEASE TO JUMP)', px + 18, py - 14);
      ctx.restore();
    }
  };

  return (
    <div 
      ref={containerRef} 
      id="game-canvas-area" 
      className="relative flex items-center justify-center w-full min-h-[500px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-inner"
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className={`w-full max-w-[800px] h-auto object-contain bg-neutral-950 aspect-video rounded-xl shadow-2xl block ${!isPaused ? 'cursor-none' : 'cursor-default'}`}
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

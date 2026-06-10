import React from 'react';
import { 
  Heart, Zap, Bomb, Shield, Key, AlertTriangle, Play, Pause, RefreshCw, LogOut, Award, Timer 
} from 'lucide-react';
import { GameStats, Player, KeyCard } from '../types';

interface GameHUDProps {
  player: Player;
  stats: GameStats;
  activeKeyCards: { red: boolean; blue: boolean };
  onPauseToggle: () => void;
  isPaused: boolean;
  onRestart: () => void;
  onExit: () => void;
  levelName: string;
}

export default function GameHUD({
  player,
  stats,
  activeKeyCards,
  onPauseToggle,
  isPaused,
  onRestart,
  onExit,
  levelName,
}: GameHUDProps) {
  // Compute Alert Color
  const getAlertColor = (alert: number) => {
    if (alert >= 80) return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    if (alert >= 40) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20';
  };

  const getAlertBarColor = (alert: number) => {
    if (alert >= 80) return 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    if (alert >= 40) return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    return 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]';
  };

  // Helper for rendering hearts
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < player.maxHealth; i++) {
      hearts.push(
        <Heart 
          key={i} 
          className={`w-4.5 h-4.5 transition-all duration-300 ${
            i < player.health 
              ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]' 
              : 'text-neutral-700 fill-neutral-900'
          }`} 
        />
      );
    }
    return hearts;
  };

  return (
    <div id="game-hud-overlay" className="absolute inset-x-0 top-0 p-4 flex flex-col pointer-events-none z-20 select-none">
      
      {/* Top Bar Info */}
      <div className="flex justify-between items-start w-full">
        
        {/* Left Side: Vitals */}
        <div className="flex flex-col gap-2.5 pointer-events-auto">
          {/* Mission Indicator */}
          <div className="bg-neutral-900/90 border border-neutral-800 px-3 py-1 rounded-lg text-left shadow-lg">
            <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-400 block">CURRENT MISSION</span>
            <span className="text-xs font-semibold text-neutral-200">{levelName}</span>
          </div>

          {/* Health Segment */}
          <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800/80 px-3.5 py-2 rounded-xl shadow-xl">
            <span className="text-[10px] font-mono font-bold text-neutral-400 mr-1 block">HP:</span>
            <div className="flex gap-1">{renderHearts()}</div>
          </div>

          {/* Cloaking Energy (Stealth battery) */}
          <div className="bg-neutral-900/90 border border-neutral-800/80 px-3.5 py-2.5 rounded-xl shadow-xl w-48 flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Zap className={`w-3 h-3 ${player.isStealth ? 'animate-bounce text-cyan-300' : 'text-cyan-400'}`} />
                CLOAK STEALTH
              </span>
              <span className="text-cyan-300 font-bold">{Math.round(player.stealthEnergy)}%</span>
            </div>
            <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
              <div 
                className={`h-full transition-all duration-75 ${
                  player.isStealth 
                    ? 'bg-gradient-to-r from-sky-450 to-cyan-400 animate-pulse' 
                    : 'bg-cyan-505 bg-gradient-to-r from-indigo-500 to-cyan-500'
                }`}
                style={{ width: `${(player.stealthEnergy / player.maxStealthEnergy) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Title / Level Alarm Alert system */}
        <div className="flex flex-col items-center">
          <div className={`border p-2.5 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur transition-all duration-300 ${getAlertColor(stats.alertLevel)}`}>
            <AlertTriangle className={`w-5 h-5 ${stats.alertLevel >= 80 ? 'animate-bounce text-rose-500' : ''}`} />
            
            <div className="text-left w-36">
              <div className="flex justify-between items-center text-[9px] font-mono font-black tracking-wider">
                <span>SECURITY LEVEL</span>
                <span>{Math.round(stats.alertLevel)}%</span>
              </div>
              <div className="w-full bg-neutral-950/60 h-2 rounded-full overflow-hidden mt-1 border border-neutral-900">
                <div 
                  className={`h-full transition-all duration-300 ${getAlertBarColor(stats.alertLevel)}`}
                  style={{ width: `${stats.alertLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Alarm warning banner */}
          {stats.alertLevel >= 80 && (
            <div className="mt-2 bg-rose-600 border border-rose-500 px-3 py-0.5 rounded text-[10px] font-mono font-black text-rose-100 animate-pulse tracking-widest shadow-md">
              ALARM TRIGGERED: SEC-DRONES ACTIVE
            </div>
          )}
        </div>

        {/* Right Side: Gadgets, Score, Controls */}
        <div className="flex flex-col gap-2.5 items-end pointer-events-auto">
          {/* Controls Bar */}
          <div className="flex gap-2">
            <button
              onClick={onPauseToggle}
              className="p-2 bg-neutral-905 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg shadow-lg cursor-pointer transition-all active:scale-95"
              title="一時停止"
            >
              {isPaused ? <Play className="w-4 h-4 fill-neutral-300" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={onRestart}
              className="p-2 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg shadow-lg cursor-pointer transition-all active:scale-95"
              title="リトライ"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onExit}
              className="p-2 bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 text-rose-400 hover:text-rose-300 rounded-lg shadow-lg cursor-pointer transition-all active:scale-95"
              title="リタイア(タイトルに戻る)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Scoreboard / Gems collected */}
          <div className="bg-neutral-900/90 border border-neutral-800/80 px-4 py-2.5 rounded-xl shadow-xl flex flex-col gap-1 items-end min-w-[120px]">
            <span className="text-[9px] font-mono font-bold tracking-wider text-amber-500 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" /> STOLEN GEMS
            </span>
            <span className="text-base font-mono font-black text-amber-400 tracking-wider">
              {stats.score} <span className="text-xs text-neutral-400">pts</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
              お宝: <span className="font-bold text-neutral-200">{stats.gemsCollected}</span> / {stats.totalGems}
            </span>
          </div>

          {/* Time Limit / Elapsed */}
          <div className="bg-neutral-900/90 border border-neutral-800/80 px-3.5 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-mono">
            <Timer className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-300">TIME:</span>
            <span className="text-white font-bold">{Math.floor(stats.timeElapsed / 60)}:{(stats.timeElapsed % 60).toString().padStart(2, '0')}</span>
          </div>

          {/* Keycards Collected */}
          <div className="flex gap-2 mt-0.5">
            <div className={`p-1.5 rounded-lg border flex items-center justify-center transition-all shadow-md ${
              activeKeyCards.red 
                ? 'bg-rose-900/40 border-rose-500 text-rose-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]' 
                : 'bg-neutral-900/50 border-neutral-850 text-neutral-700'
            }`}>
              <Key className="w-4 h-4" />
              <span className="text-[9px] font-bold font-mono ml-1">RED</span>
            </div>

            <div className={`p-1.5 rounded-lg border flex items-center justify-center transition-all shadow-md ${
              activeKeyCards.blue 
                ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]' 
                : 'bg-neutral-900/50 border-neutral-850 text-neutral-700'
            }`}>
              <Key className="w-4 h-4" />
              <span className="text-[9px] font-bold font-mono ml-1">BLUE</span>
            </div>
          </div>

          {/* Quick Slot representation */}
          <div className="flex gap-2 mt-1">
            <div className="bg-neutral-900/95 border border-neutral-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-neutral-950 flex items-center justify-center border border-neutral-800">
                <span className="text-[10px] font-mono font-bold text-neutral-400">Q</span>
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] text-neutral-500">SMOKE BOMB</span>
                <span className="text-xs font-bold text-neutral-200 mt-1 flex items-center gap-1">
                  <Bomb className="w-3.5 h-3.5 text-neutral-300" />
                  {player.smokeBombs} / {player.maxSmokeBombs}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Screen Effects overlay (e.g. Red screen flash if alert > 80, pulse red border) */}
      {stats.alertLevel >= 80 && (
        <div className="absolute inset-0 border-[3px] border-rose-500/20 rounded-lg pointer-events-none animate-pulse z-10" />
      )}
    </div>
  );
}

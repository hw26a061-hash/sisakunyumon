import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Shield, Award, Play, RotateCcw, LogOut, Bomb, 
  Search, ShieldAlert, ArrowRight, Heart, Star, Skull, Volume2, VolumeX, Eye 
} from 'lucide-react';
import TitleScreen from './components/TitleScreen';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import { LevelConfig, Player, GameStats } from './types';
import { sfx } from './utils/audio';

type GameScreen = 'TITLE' | 'PLAYING' | 'GAME_OVER' | 'STAGE_CLEAR';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [activeLevel, setActiveLevel] = useState<LevelConfig | null>(null);
  
  // Audio state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('kaitou_sound_enabled');
    return saved !== 'false';
  });

  // Upgrade state
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<string>>(new Set());

  // HUD and dynamic stat syncs
  const [hudPlayer, setHudPlayer] = useState<Player | null>(null);
  const [hudStats, setHudStats] = useState<GameStats>({
    score: 0,
    coins: 0,
    alertLevel: 0,
    stealthRating: 'S',
    timeElapsed: 0,
    gemsCollected: 0,
    totalGems: 0,
  });
  const [hudKeyCards, setHudKeyCards] = useState<{ red: boolean; blue: boolean }>({ red: false, blue: false });

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [endStats, setEndStats] = useState<GameStats | null>(null);
  const [defeatReason, setDefeatReason] = useState<string>('');

  // Storage of high level scores
  const [highScores, setHighScores] = useState<{ [levelId: number]: GameStats }>(() => {
    const saved = localStorage.getItem('kaitou_high_scores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Cumulative Gems bank limit
  const [totalBankGems, setTotalBankGems] = useState<number>(() => {
    const saved = localStorage.getItem('kaitou_total_coins');
    return saved ? parseInt(saved, 10) : 400; // default 400
  });

  useEffect(() => {
    sfx.toggle(soundEnabled);
    localStorage.setItem('kaitou_sound_enabled', soundEnabled.toString());
  }, [soundEnabled]);

  const handleToggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const handleStartGame = (level: LevelConfig, upgrades: Set<string>) => {
    setActiveLevel(level);
    setSelectedUpgrades(upgrades);
    setIsPaused(false);
    setScreen('PLAYING');
  };

  const handleUpdateStats = (player: Player, stats: GameStats, keyCards: { red: boolean; blue: boolean }) => {
    setHudPlayer(player);
    setHudStats(stats);
    setHudKeyCards(keyCards);
  };

  const handleGameOver = (finalStats: GameStats, reason: string) => {
    setEndStats(finalStats);
    
    // Choose flavor-text for game over description
    let localizedReason = '警備システムに捕捉されました！';
    if (reason === 'HEALTH_DEPLETED') {
      localizedReason = '警備ドローンやレーザー防壁の攻撃を受け、怪盗のスーツ耐久値（HP）が限界に達しました。';
    }
    setDefeatReason(localizedReason);

    sfx.playFailure();
    setScreen('GAME_OVER');
  };

  const handleStageClear = (finalStats: GameStats) => {
    setEndStats(finalStats);

    // Update persistent high score if new is higher
    if (activeLevel) {
      const prevBest = highScores[activeLevel.id];
      if (!prevBest || finalStats.score > prevBest.score) {
        const updateBest = { ...highScores, [activeLevel.id]: finalStats };
        setHighScores(updateBest);
        localStorage.setItem('kaitou_high_scores', JSON.stringify(updateBest));
      }
    }

    // Reload bank stats
    const updatedBank = localStorage.getItem('kaitou_total_coins');
    if (updatedBank) {
      setTotalBankGems(parseInt(updatedBank, 10));
    }

    sfx.playSuccess();
    setScreen('STAGE_CLEAR');
  };

  const handleRestart = () => {
    setIsPaused(false);
    setScreen('PLAYING');
    sfx.playJump();
  };

  const handleExitToTitle = () => {
    setIsPaused(false);
    setScreen('TITLE');
    
    // Update bank summary on menu exit
    const updatedBank = localStorage.getItem('kaitou_total_coins');
    if (updatedBank) {
      setTotalBankGems(parseInt(updatedBank, 10));
    }

    sfx.playJump();
  };

  return (
    <div 
      id="app-root-container" 
      className="w-full min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {screen === 'TITLE' && (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <TitleScreen
              onStartGame={handleStartGame}
              ownedCoins={totalBankGems}
              highScores={highScores}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          </motion.div>
        )}

        {screen === 'PLAYING' && activeLevel && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full flex flex-col items-center justify-center p-4 relative max-w-5xl mx-auto"
          >
            {/* Embedded Active Game Canvas & HUD overlay */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950">
              
              {hudPlayer && (
                <GameHUD
                  player={hudPlayer}
                  stats={hudStats}
                  activeKeyCards={hudKeyCards}
                  onPauseToggle={() => setIsPaused(!isPaused)}
                  isPaused={isPaused}
                  onRestart={handleRestart}
                  onExit={handleExitToTitle}
                  levelName={activeLevel.name}
                />
              )}

              <GameCanvas
                level={activeLevel}
                selectedUpgrades={selectedUpgrades}
                onGameOver={handleGameOver}
                onStageClear={handleStageClear}
                isPaused={isPaused}
                onUpdateStats={handleUpdateStats}
              />

              {/* Pause Overlaid Banner */}
              {isPaused && (
                <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 font-sans">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-2xl max-w-xs text-center border-t-4 border-t-indigo-505 border-t-indigo-500"
                  >
                    <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-bold block mb-1">STEALTH MISSION</span>
                    <h3 className="text-xl font-black text-neutral-150 mb-4 tracking-tight">作戦一時停止中</h3>
                    <p className="text-xs text-neutral-400 mb-6 font-sans">
                      警備の目は一時的にストップしています。再度スタートするか設定を確認してください。
                    </p>

                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={() => setIsPaused(false)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-black text-xs tracking-widest text-white rounded-lg transition-all cursor-pointer active:scale-95"
                      >
                        再開する
                      </button>
                      <button
                        onClick={handleRestart}
                        className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs tracking-widest rounded-lg transition-all cursor-pointer border border-neutral-700"
                      >
                        最初からやり直す
                      </button>
                      <button
                        onClick={handleExitToTitle}
                        className="w-full py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-450 text-neutral-400 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                      >
                        街に隠れる（リタイア）
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Quick Layout Tip overlay footer */}
            <div className="mt-4 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-center font-sans text-[11px] text-neutral-400 bg-neutral-900/60 backdrop-blur-sm border border-neutral-800 px-6 py-3 rounded-xl max-w-4xl mx-auto shadow-md">
              <span className="text-indigo-400 font-black tracking-wider uppercase text-[10px]">OPERATOR GUIDANCE:</span>
              <span className="border-r border-neutral-800 pr-4">[A / D / ← →] 左右移動</span>
              <span className="border-r border-neutral-800 pr-4">[W / ↑] ジャンプ / 2段跳び</span>
              <span className="border-r border-neutral-800 pr-4">[S / ↓] スライディング (レーザー回避)</span>
              <span className="border-r border-neutral-800 pr-4 text-cyan-400 font-semibold">[SPACE] 地上で跳躍 / 空中で短押しで2段跳び、長押しで照準回転・離してワイヤー射出 (スイング中に W/S で伸縮、SPACE で高速離脱)</span>
              <span className="border-r border-neutral-800 pr-4">[Q] 煙幕グレネード</span>
              <span>[SHIFT] ステルス光学迷彩</span>
            </div>
          </motion.div>
        )}

        {screen === 'GAME_OVER' && endStats && activeLevel && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full flex flex-col items-center justify-center p-6 z-10 max-w-md mx-auto"
          >
            <div className="w-full bg-neutral-900/95 border border-neutral-800/80 rounded-2xl shadow-3xl p-8 text-center border-t-8 border-t-rose-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient(circle_at_center,_var(--tw-gradient-stops)) from-rose-950/15 via-neutral-900 to-neutral-900 pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-5 text-rose-500 animate-pulse">
                <Skull className="w-8 h-8" />
              </div>

              <span className="text-[10px] font-mono tracking-widest font-black text-rose-450 text-rose-400 block mb-1">
                TACTICAL HEIST FAILED
              </span>
              <h2 className="text-3xl font-black text-neutral-100 tracking-tight mb-3">
                怪盗、捕縛さる。
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans mb-6">
                {defeatReason}
              </p>

              {/* Stats breakdown */}
              <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-xl bg-neutral-950/80 border border-neutral-850/80 text-left font-mono">
                <div>
                  <span className="text-[10px] text-neutral-500 block">潜入ミッション:</span>
                  <span className="text-xs font-bold text-neutral-200 truncate block mt-0.5">{activeLevel.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">回収お宝スコア:</span>
                  <span className="text-xs font-bold text-amber-400 block mt-0.5">{endStats.score} pts</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">逃走経過時間:</span>
                  <span className="text-xs font-bold text-neutral-300 block mt-0.5">
                    {Math.floor(endStats.timeElapsed / 60)}分{(endStats.timeElapsed % 60).toString().padStart(2, '0')}秒
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">盗み出したお宝:</span>
                  <span className="text-xs font-bold text-neutral-300 block mt-0.5">
                    {endStats.gemsCollected} / {endStats.totalGems} 個
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleRestart}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-xl font-bold text-xs tracking-widest flex items-center justify-center gap-2 hover:from-rose-500 hover:to-rose-400 cursor-pointer active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>再度潜入する (リトライ)</span>
                </button>
                <button
                  onClick={handleExitToTitle}
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs tracking-widest rounded-xl transition-all border border-neutral-700 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>アジトに戻る (タイトルへ)</span>
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {screen === 'STAGE_CLEAR' && endStats && activeLevel && (
          <motion.div
            key="stageclear"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full flex flex-col items-center justify-center p-6 z-10 max-w-md mx-auto"
          >
            <div className="w-full bg-neutral-900/95 border border-neutral-800/80 rounded-2xl shadow-3xl p-8 text-center border-t-8 border-t-emerald-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient(circle_at_center,_var(--tw-gradient-stops)) from-emerald-950/15 via-neutral-900 to-neutral-900 pointer-events-none" />

              <div className="absolute -top-12 -left-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />

              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 text-emerald-400">
                <Award className="w-8 h-8" />
              </div>

              <span className="text-[10px] font-mono tracking-widest font-black text-emerald-400 block mb-1">
                HEIST SUCCESSFUL COMPLETE
              </span>
              <h2 className="text-3xl font-black text-neutral-100 tracking-tight mb-2">
                お宝、華麗に奪取！
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans mb-6">
                警備網を欺き、見事目的のお宝の回収および現場からのエスケープに成功しました。歴史にその名を刻むでしょう。
              </p>

              {/* End Screen Score Breakdown */}
              <div className="flex flex-col gap-2 mb-6">
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-800 text-xs">
                  <span className="text-neutral-500">遂行オペレーション:</span>
                  <span className="font-bold text-neutral-200">{activeLevel.name}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-800 text-xs font-mono">
                  <span className="text-neutral-500">獲得スコア (Gems):</span>
                  <span className="font-black text-amber-400 flex items-center gap-1">
                    +{endStats.score} pts
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-800 text-xs font-mono">
                  <span className="text-neutral-500">ステルス評価 (Rank):</span>
                  <span className={`font-black uppercase text-sm ${
                    endStats.stealthRating === 'S' ? 'text-amber-450 text-indigo-400 text-shadow' : 'text-emerald-400'
                  }`}>
                    {endStats.stealthRating}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-800 text-xs font-mono">
                  <span className="text-neutral-500">お宝回収割合:</span>
                  <span className="font-bold text-neutral-200">
                    {endStats.gemsCollected} / {endStats.totalGems} 個 ({(Math.round(endStats.gemsCollected / endStats.totalGems * 100)) || 0}%)
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 text-xs font-mono">
                  <span className="text-neutral-500">所要エスケープタイム:</span>
                  <span className="font-bold text-neutral-200">
                    {Math.floor(endStats.timeElapsed / 60)}分{(endStats.timeElapsed % 60).toString().padStart(2, '0')}秒
                  </span>
                </div>
              </div>

              {/* Victory tips */}
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 mb-6 text-[11px] text-emerald-400 leading-relaxed font-sans text-left">
                <strong>★ 闇取引アップグレード:</strong><br />
                今回獲得したGemsを使って、タイトル画面の「闇ショップ」から新しいガジェットを強化できます！更に難しい次のレベルに挑もう！
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleExitToTitle}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-bold text-xs tracking-widest flex items-center justify-center gap-2 hover:from-indigo-500 hover:to-indigo-400 cursor-pointer active:scale-95 transition-all shadow-lg shadow-indigo-600/10"
                >
                  <span>闇ショップ・次作戦へ進む</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

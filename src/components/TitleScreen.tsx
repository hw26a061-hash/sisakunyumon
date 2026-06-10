import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, Play, Bomb, Volume2, VolumeX, Sparkles, 
  ShoppingBag, Zap, HelpCircle, Award, Check, Lock, ChevronUp, ChevronDown 
} from 'lucide-react';
import { LevelConfig, Upgrade, GameStats } from '../types';
import { LEVEL_TEMPLATES } from './LevelDesign';
import { sfx } from '../utils/audio';

interface TitleScreenProps {
  onStartGame: (level: LevelConfig, selectedUpgrades: Set<string>) => void;
  ownedCoins: number;
  highScores: { [levelId: number]: GameStats };
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const UPGRADE_LIST: Upgrade[] = [
  {
    id: 'wire_range',
    name: '高強度チタンワイヤー',
    description: 'ワイヤーの射出距離が 30% 増加し、より高い天井や遠くの足場に捕まれるようになります。',
    cost: 500,
    purchased: false,
    effect: 'Grapple hook range +30%',
  },
  {
    id: 'max_smoke',
    name: '大容量煙幕弾ホルダー',
    description: 'ミッション開始時、および最大煙幕弾の所持数が 3個 から 5個 に増加します。',
    cost: 400,
    purchased: false,
    effect: 'Max smoke bombs 3 -> 5',
  },
  {
    id: 'stealth_battery',
    name: '電磁ステルス・セル',
    description: '光学迷彩（ステルス機能）の最大容量が 40% 増加し、検知を避ける隠密行動の時間を延ばします。',
    cost: 600,
    purchased: false,
    effect: 'Stealth energy +40%',
  },
  {
    id: 'max_hp',
    name: '防弾ケブラー・シルクハット',
    description: '障害物や警戒ドローンの攻撃に対する耐久力が向上し、最大耐久値が 3 から 4 に増加します。',
    cost: 800,
    purchased: false,
    effect: 'Max HP 3 -> 4',
  },
  {
    id: 'movement_speed',
    name: '防重力テイルコート',
    description: '怪盗の身のこなしが身軽になり、移動速度が 15% 、ジャンプ力が 10% 向上します。',
    cost: 500,
    purchased: false,
    effect: 'Movement speed +15%, Jump high +10%',
  }
];

export default function TitleScreen({
  onStartGame,
  ownedCoins,
  highScores,
  soundEnabled,
  onToggleSound,
}: TitleScreenProps) {
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig>(LEVEL_TEMPLATES[0]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(() => {
    // Load existing items if any
    const saved = localStorage.getItem('kaitou_purchased_upgrades');
    if (saved) {
      try {
        return new Set<string>(JSON.parse(saved));
      } catch {
        return new Set<string>();
      }
    }
    return new Set<string>();
  });
  const [currentCoins, setCurrentCoins] = useState<number>(() => {
    // Give initial coins if none stored to let player try buying items
    const saved = localStorage.getItem('kaitou_total_coins');
    if (saved !== null) {
      return parseInt(saved, 10);
    }
    // Give initial 400 coins to player for a nice starting experience!
    localStorage.setItem('kaitou_total_coins', '400');
    return 400;
  });

  const [activeTab, setActiveTab] = useState<'levels' | 'shop' | 'tutorial'>('levels');

  const handlePurchase = (upgrade: Upgrade) => {
    if (currentCoins >= upgrade.cost && !purchasedIds.has(upgrade.id)) {
      const newPurchased = new Set(purchasedIds);
      newPurchased.add(upgrade.id);
      const newCoins = currentCoins - upgrade.cost;
      
      setPurchasedIds(newPurchased);
      setCurrentCoins(newCoins);
      
      localStorage.setItem('kaitou_purchased_upgrades', JSON.stringify(Array.from(newPurchased)));
      localStorage.setItem('kaitou_total_coins', newCoins.toString());
      
      localStorage.setItem('kaitou_notified_upgrade', 'true');
      sfx.playCollect();
    } else {
      sfx.playFailure();
    }
  };

  const handleLevelSelect = (level: LevelConfig) => {
    setSelectedLevel(level);
    sfx.playJump();
  };

  const handlePlay = () => {
    sfx.playSuccess();
    onStartGame(selectedLevel, purchasedIds);
  };

  return (
    <div 
      id="title-container" 
      className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 font-sans relative overflow-hidden select-none"
    >
      {/* Dynamic Background Grid and Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-neutral-950 to-neutral-950 pointer-events-none" />
      
      {/* Decorative Moon */}
      <div 
        id="bg-moon" 
        className="absolute top-12 right-24 w-40 h-40 rounded-full bg-neutral-100/5 blur-sm border border-neutral-100/10 pointer-events-none shadow-[0_0_80px_rgba(255,255,255,0.03)]"
      />

      {/* Header Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-widest text-shadow-sm">
              PHANTOM THIEF <span className="text-indigo-400">LUX</span>
            </h1>
            <p className="text-[10px] text-neutral-500 font-mono">COSMIC STEALTH OPS v1.1</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Jewel Counter */}
          <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800 px-3.5 py-1.5 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <span className="text-xs font-mono font-bold text-cyan-400">{currentCoins} <span className="text-[10px] text-neutral-400 font-normal">GEMS</span></span>
          </div>

          {/* Sound Toggle */}
          <button
            id="sound-toggle"
            onClick={onToggleSound}
            className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
            title={soundEnabled ? '音声をオフにする' : '音声をオンにする'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>
        </div>
      </header>

      {/* Hero Badge */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-4 flex flex-col items-center justify-center z-10">
        <div className="text-center mb-8 relative">
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur opacity-70" />
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              2D Stealth Platformer
            </span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mt-4 mb-2 bg-gradient-to-b from-neutral-50 to-neutral-300 bg-clip-text text-transparent font-sans">
              怪盗ファントムルクス
            </h2>
            <p className="text-sm text-neutral-400 max-w-lg mx-auto font-sans leading-relaxed">
              月夜の静寂。セキュリティを華麗にかわし、世界で最も厳重な金庫から、伝説のクリスタルを盗み出す。
            </p>
          </motion.div>
        </div>

        {/* Level & Shop Tabs */}
        <div className="w-full max-w-4xl bg-neutral-900/80 border border-neutral-800/80 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden min-h-[460px]">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-neutral-800/80 p-4 flex flex-row md:flex-col gap-2">
            <button
              onClick={() => { setActiveTab('levels'); sfx.playJump(); }}
              className={`flex-1 md:flex-initial py-3 px-4 rounded-xl flex items-center gap-3 transition-all text-sm font-medium cursor-pointer ${
                activeTab === 'levels'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>潜入指令 (レベル)</span>
            </button>

            <button
              onClick={() => { setActiveTab('shop'); sfx.playJump(); }}
              className={`flex-1 md:flex-initial py-3 px-4 rounded-xl flex items-center gap-3 transition-all text-sm font-medium cursor-pointer ${
                activeTab === 'shop'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>闇ショップ (強化)</span>
            </button>

            <button
              onClick={() => { setActiveTab('tutorial'); sfx.playJump(); }}
              className={`flex-1 md:flex-initial py-3 px-4 rounded-xl flex items-center gap-3 transition-all text-sm font-medium cursor-pointer ${
                activeTab === 'tutorial'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>操作マニュアル</span>
            </button>

            <div className="hidden md:flex flex-col flex-1 justify-end p-2">
              <div className="border border-neutral-800 bg-neutral-950/60 rounded-xl p-3 text-center">
                <span className="text-[10px] text-neutral-500 block">現在の装備強化</span>
                <span className="text-xs text-indigo-400 font-mono font-bold block mt-1">
                  {purchasedIds.size} / {UPGRADE_LIST.length} 装着中
                </span>
              </div>
            </div>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-6 relative bg-neutral-950/40">
            {activeTab === 'levels' && (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    潜入ターゲットの選択
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                    {LEVEL_TEMPLATES.map((level) => {
                      const scoreData = highScores[level.id];
                      const isSelected = selectedLevel.id === level.id;
                      
                      return (
                        <button
                          key={level.id}
                          onClick={() => handleLevelSelect(level)}
                          className={`p-4 rounded-xl text-left transition-all border outline-none cursor-pointer relative ${
                            isSelected 
                              ? 'bg-neutral-900 border-indigo-500 shadow-md shadow-indigo-500/5' 
                              : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] font-mono font-black text-indigo-400 tracking-wider">
                              STAGE 0{level.id}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                              level.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              level.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {level.difficulty}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-neutral-100 truncate">{level.name}</h4>
                          
                          {/* Stars/Rating Badge if beaten */}
                          {scoreData ? (
                            <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-neutral-800/80 pt-2 text-neutral-400">
                              <span className="flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-amber-400" />
                                <span>{scoreData.score} pts</span>
                              </span>
                              <span className="font-bold text-amber-400">RANK {scoreData.stealthRating}</span>
                            </div>
                          ) : (
                            <div className="mt-3 text-[10px] text-neutral-500">未潜入</div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Level Details Panel */}
                  <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-4">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 block mb-1">MISSION ANALYSIS</span>
                    <h4 className="text-sm font-bold text-neutral-200 mb-1.5">{selectedLevel.name}</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed font-sans">{selectedLevel.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-neutral-800/60 text-xs font-mono">
                      <div>
                        <span className="text-neutral-500 block">最大防御レベル:</span>
                        <span className="text-neutral-300 font-bold block mt-0.5">
                          監視カメラ: {selectedLevel.cameras.length}基 / レーザー: {selectedLevel.lasers.length}本
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">ターゲット価値:</span>
                        <span className="text-neutral-300 font-bold block mt-0.5">
                          お宝: {selectedLevel.treasures.length}個 / 伝説素材 1個
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handlePlay}
                    className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-sm tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4.5 h-4.5 fill-white" />
                    <span>作戦開始 (潜入する)</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'shop' && (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-neutral-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      闇のガジェットブローカー
                    </h3>
                    <span className="text-[10px] uppercase font-mono text-neutral-400">
                      手に入れたGemsで怪盗の七つ道具を強化
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {UPGRADE_LIST.map((upgrade) => {
                      const isOwned = purchasedIds.has(upgrade.id);
                      const canAfford = currentCoins >= upgrade.cost;
                      
                      return (
                        <div
                          key={upgrade.id}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                            isOwned 
                              ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400 opacity-80' 
                              : 'bg-neutral-900 border-neutral-800'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-xs font-bold text-neutral-100">{upgrade.name}</h4>
                              {isOwned ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 font-bold">
                                  <Check className="w-2.5 h-2.5" /> 装着完了
                                </span>
                              ) : (
                                <span className={`text-xs font-mono font-bold ${canAfford ? 'text-amber-400' : 'text-neutral-500'}`}>
                                  {upgrade.cost} Gems
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed mb-2 font-sans">
                              {upgrade.description}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-neutral-800/80">
                            <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded">
                              {upgrade.effect}
                            </span>

                            {!isOwned && (
                              <button
                                onClick={() => handlePurchase(upgrade)}
                                disabled={!canAfford}
                                className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest cursor-pointer ${
                                  canAfford 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition-all' 
                                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                }`}
                              >
                                購入
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 text-[10px] text-neutral-500 text-center font-sans">
                  ※ アップグレードはミッション開始時に全種類自動適用されます。
                </div>
              </div>
            )}

            {activeTab === 'tutorial' && (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-200 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    怪盗のアクション指南
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-neutral-900/60 rounded-xl p-3 border border-neutral-800/80">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">BASIC CONTROLS</span>
                      <ul className="space-y-1.5 font-sans text-neutral-300 text-[11px]">
                        <li><strong className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">A / D</strong> もしくは <strong className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">← / →</strong>：移動</li>
                        <li><strong className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">W</strong> もしくは <strong className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">SPACE / ↑</strong>：ジャンプ（空中2段ジャンプ可）</li>
                        <li><strong className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">S</strong> もしくは <strong className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">↓</strong>：スライディング（低姿勢でレーザーを回避）</li>
                      </ul>
                    </div>

                    <div className="bg-neutral-900/60 rounded-xl p-3 border border-neutral-800/80">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">THIEF GADGETS</span>
                      <ul className="space-y-1.5 font-sans text-neutral-300 text-[11px]">
                        <li>
                          <span className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">マウスクリック</span>：
                          壁や天井に向けてワイヤー（グラップル）を発射！体を引っ張ることができます。
                        </li>
                        <li>
                          <span className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">Q</span>：
                          <strong>煙幕弾 (Smoke Bomb)</strong>を投射。煙の範囲内の警備員を気絶させ、カメラを停止。
                        </li>
                        <li>
                          <span className="text-white font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">SHIFT / E</span>：
                          <strong>光学迷彩ステルス</strong>を作動。一定時間完全に身を隠し、光線をすり抜けます。
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 bg-neutral-900/40 rounded-xl p-3 border border-neutral-800 text-[11px] text-neutral-400 space-y-1 font-sans">
                    <p className="font-bold text-neutral-200">★ 隠密の極意（ハイスコアのコツ）：</p>
                    <p>1. 警備員や監視カメラの<strong>黄色いライト（視界コーン）</strong>に入ると警戒レベルが上がり、見つかると大警報に発展します！</p>
                    <p>2. 緑色・青色の金庫は特定の<strong>キーカード</strong>を見つけることで解除可能です。</p>
                    <p>3. 最深部でお宝を奪取したら、右端の<strong>脱出ポータル（脱出用金庫／ドア）</strong>に到達することでクリア。</p>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-neutral-500 font-sans">
                  怪盗活動を開始する準備ができたら、上の「潜入指令」タブに戻り、ミッションに出撃してください。
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Developer Credit Line */}
        <div className="mt-8 text-neutral-600 font-mono text-[9px] uppercase tracking-widest text-center">
          COSMIC STEALTH SYNDICATE • LIGHTWEIGHT GRAPHICS SYSTEM
        </div>
      </main>
    </div>
  );
}

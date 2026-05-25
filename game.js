// Bille de Siège — base stable + corrections trous marqués / ressources mélangées sans régression.
(() => {
try {
  ['bdsBootV11','bdsBootFinal','bdsBoot','bdsBootClean'].forEach(function(id){
    var n = document.getElementById(id);
    if (n) n.remove();
  });
} catch(e) {}
  const canvas = document.getElementById('game');
  const VIEW_BOTTOM_RESERVED = 118;
  const el = (id) => document.getElementById(id);
  const UI = {
    stone: el('stone'), wood: el('wood'), gold: el('gold'), relic: el('relic'), info: el('info'), power: el('powerFill'),
    timer: el('turnTimer'), timerValue: el('timerValue'), btnPause: el('btnPause'), roundTitle: el('roundTitle'),
    phase: el('phaseBanner'), p1Card: el('p1Card'), p2Card: el('p2Card'), p1State: el('p1State'), p2State: el('p2State'),
    btnAttack: el('btnAttack'), btnDefense: el('btnDefense'), btnMarket: el('btnMarket'), btnPlaceTower: el('btnPlaceTower'), btnCastleBuild: el('btnCastleBuild'), btnRandomRepair: el('btnRandomRepair'), btnClearDebris: el('btnClearDebris'), btnSideRamp: el('btnSideRamp'), btnRamp: el('btnRamp'), btnSecondBall: el('btnSecondBall'), btnEnd: el('btnEnd'),
    pill1: el('castlePill1'), pill2: el('castlePill2'), toast: el('toast'), flash: el('impactFlash'),
    modal: el('castleModal'), close: el('modalClose'), modalTitle: el('modalTitle'), details: el('castleDetails')
  };

  function resetPowerGauge() {
    if (!UI.power) return;
    // La jauge est verticale : on ne doit jamais la remettre à width:0%, sinon elle devient invisible.
    UI.power.style.width = '';
    UI.power.style.height = '0%';
  }

  // Sécurité : si l'index.html n'a pas encore le bouton de déblayage, il est créé automatiquement.
  if (!UI.btnClearDebris && UI.btnSideRamp && UI.btnSideRamp.parentNode) {
    UI.btnClearDebris = document.createElement('button');
    UI.btnClearDebris.id = 'btnClearDebris';
    UI.btnClearDebris.type = 'button';
    UI.btnClearDebris.title = 'Déblayer les décombres du couloir d’attaque';
    UI.btnClearDebris.textContent = '🧹 Déblayer couloir';
    UI.btnSideRamp.parentNode.insertBefore(UI.btnClearDebris, UI.btnSideRamp);
  }

  // Sécurité : si l'index.html n'a pas encore le bouton dédié, il est créé automatiquement.
  if (!UI.btnSideRamp && UI.btnRamp && UI.btnRamp.parentNode) {
    UI.btnSideRamp = document.createElement('button');
    UI.btnSideRamp.id = 'btnSideRamp';
    UI.btnSideRamp.type = 'button';
    UI.btnSideRamp.title = 'Rampes latérales libres';
    UI.btnSideRamp.textContent = '🪵 Rampes latérales';
    UI.btnRamp.parentNode.insertBefore(UI.btnSideRamp, UI.btnRamp);
  }

  if (!UI.btnClearDebris && UI.btnSideRamp && UI.btnSideRamp.parentNode) {
    UI.btnClearDebris = document.createElement('button');
    UI.btnClearDebris.id = 'btnClearDebris';
    UI.btnClearDebris.type = 'button';
    UI.btnClearDebris.title = 'Déblayer les décombres du couloir d’attaque';
    UI.btnClearDebris.textContent = '🧹 Déblayer couloir';
    UI.btnSideRamp.parentNode.insertBefore(UI.btnClearDebris, UI.btnSideRamp);
  }

  // Sécurité : si l'ancien index.html est encore utilisé, le bouton est créé automatiquement.
  // La seconde bille s'achète désormais dans le marché : pas de bouton autonome recréé en secours.

  function ensureActionButton(id, text, title, afterEl) {
    let btn = el(id);
    if (!btn && afterEl && afterEl.parentNode) {
      btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.textContent = text;
      if (title) btn.title = title;
      afterEl.parentNode.insertBefore(btn, afterEl.nextSibling);
    }
    return btn;
  }

  UI.btnRepairKit = ensureActionButton('btnRepairKit', '🧰 Kits', 'Ouvrir les kits récupérés sur le plateau', UI.btnRandomRepair);
  UI.btnBuildKit = ensureActionButton('btnBuildKit', '🏗️ Kit construction', 'Ancien bouton masqué : les kits passent maintenant par le bouton Kits', UI.btnRepairKit || UI.btnRandomRepair);


  // Difficultés de partie : modifie la densité des trous, la taille réelle de la bille,
  // les gains minimums et le coût de la seconde bille sans toucher au reste du gameplay.
  const DIFFICULTY_STORAGE_KEY = 'BDS_DIFFICULTY_RULESET_V1';
  const DIFFICULTIES = {
    easy: {
      id: 'easy',
      label: 'Facile',
      holesPerRow: 6,
      gainMin: 1,
      gainMax: 8,
      ballR: 0.88,
      secondBallCost: {
        duo:  { wood: 3, gold: 2 },
        solo: { wood: 5, gold: 3 }
      },
      description: '6 trous / ligne · gains 1 à 8 · bille grosse'
    },
    medium: {
      id: 'medium',
      label: 'Moyen',
      holesPerRow: 5,
      gainMin: 2,
      gainMax: 8,
      ballR: 0.66,
      secondBallCost: {
        duo:  { wood: 4, gold: 2 },
        solo: { wood: 6, gold: 3 }
      },
      description: '5 trous / ligne · gains 2 à 8 · bille -25%'
    },
    hard: {
      id: 'hard',
      label: 'Difficile',
      holesPerRow: 4,
      gainMin: 3,
      gainMax: 8,
      ballR: 0.44,
      secondBallCost: {
        duo:  { wood: 5, gold: 3 },
        solo: { wood: 7, gold: 4 }
      },
      description: '4 trous / ligne · gains 3 à 8 · bille moitié'
    }
  };

  function readDifficultyId() {
    try {
      const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
      return DIFFICULTIES[saved] ? saved : 'hard';
    } catch (err) {
      return 'hard';
    }
  }

  let currentDifficultyId = readDifficultyId();
  let currentDifficulty = DIFFICULTIES[currentDifficultyId] || DIFFICULTIES.hard;

  function setDifficultyId(id) {
    if (!DIFFICULTIES[id]) return;
    currentDifficultyId = id;
    currentDifficulty = DIFFICULTIES[id];
    try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, id); } catch (err) {}
  }


  // Progression cosmétique : points de victoire + skins de bille.
  // Aucun achat ne modifie la puissance, la vitesse, les dégâts ou la physique.
  const PROGRESS_STORAGE_KEY = 'BDS_PROGRESS_COSMETIQUE_V1';
  const BALL_SKINS = [
    { id: 'ivory',   name: 'Ivoire nacré',       icon: '⚪', color: 0xf5ead8, cost: 0,   roughness: 0.07, metalness: 0.14, accent: 0xffffff, glow: 'rgba(255,246,224,.28)' },
    { id: 'ruby',    name: 'Rubis incandescent', icon: '🔴', color: 0xd91f35, cost: 30,  roughness: 0.14, metalness: 0.24, accent: 0xff8a5c, emissive: 0x3a0508, emissiveIntensity: 0.08, glow: 'rgba(255,54,78,.34)' },
    { id: 'sapphire',name: 'Saphir électrique', icon: '🔵', color: 0x2466ff, cost: 30,  roughness: 0.13, metalness: 0.26, accent: 0x72e2ff, emissive: 0x06143a, emissiveIntensity: 0.07, glow: 'rgba(71,143,255,.34)' },
    { id: 'emerald', name: 'Émeraude mystique',  icon: '🟢', color: 0x12b56f, cost: 45,  roughness: 0.12, metalness: 0.24, accent: 0x7affb6, emissive: 0x052b19, emissiveIntensity: 0.06, glow: 'rgba(48,255,158,.30)' },
    { id: 'amethyst',name: 'Améthyste royale',  icon: '🟣', color: 0x8b38ff, cost: 60,  roughness: 0.13, metalness: 0.28, accent: 0xff78f6, emissive: 0x21053a, emissiveIntensity: 0.08, glow: 'rgba(160,76,255,.34)' },
    { id: 'obsidian',name: 'Obsidienne violette', icon: '⚫', color: 0x141018, cost: 75,  roughness: 0.10, metalness: 0.46, accent: 0x7f45ff, emissive: 0x150028, emissiveIntensity: 0.07, glow: 'rgba(121,70,255,.26)' },
    { id: 'gold',    name: 'Or solaire',        icon: '🟡', color: 0xffc13b, cost: 90,  roughness: 0.08, metalness: 0.72, accent: 0xffffa6, emissive: 0x3a2300, emissiveIntensity: 0.07, glow: 'rgba(255,209,73,.34)' },
    { id: 'ember',   name: 'Braise volcanique', icon: '🟠', color: 0xff5a1f, cost: 110, roughness: 0.16, metalness: 0.32, accent: 0xffd36a, emissive: 0x3a0c00, emissiveIntensity: 0.12, glow: 'rgba(255,92,30,.36)' },
    { id: 'crystal', name: 'Cristal arctique',  icon: '💎', color: 0xcff9ff, cost: 135, roughness: 0.02, metalness: 0.08, accent: 0xffffff, transparent: true, opacity: 0.86, emissive: 0x10343a, emissiveIntensity: 0.05, glow: 'rgba(190,250,255,.32)' },
    { id: 'neon',    name: 'Néon cyan',         icon: '✨', color: 0x00f0ff, cost: 165, roughness: 0.09, metalness: 0.34, accent: 0xffffff, emissive: 0x003a40, emissiveIntensity: 0.16, glow: 'rgba(0,240,255,.42)' },
    { id: 'metal',   name: 'Bille en fer',      icon: '⚙️', color: 0x5f666b, light: 0xa3aaae, dark: 0x22272b, cost: 190, roughness: 0.42, metalness: 0.88, accent: 0xb3bcc2, emissive: 0x050607, emissiveIntensity: 0.015, glow: 'rgba(150,160,165,.26)' },
    { id: 'chrome',  name: 'Chrome argenté',   icon: '◽', color: 0xd7e0e6, light: 0xffffff, dark: 0x6f7a82, cost: 230, roughness: 0.015, metalness: 1.00, accent: 0xffffff, emissive: 0x111820, emissiveIntensity: 0.035, glow: 'rgba(235,248,255,.50)' },
    { id: 'galaxy',  name: 'Galaxie noire',     icon: '🌌', color: 0x21103d, cost: 260, roughness: 0.08, metalness: 0.50, accent: 0xff4fd8, emissive: 0x12002c, emissiveIntensity: 0.14, glow: 'rgba(255,79,216,.32)' }
  ];

  const BALL_EFFECTS = [
    {
      id: 'none',
      name: 'Aucun effet',
      icon: '○',
      cost: 0,
      color: 0xf5ead8,
      accent: 0xffffff,
      glow: 'rgba(255,246,224,.18)',
      description: 'Bille sans aura pulsée.'
    },
    {
      id: 'pulse',
      name: 'Pulsar vivant',
      icon: '💓',
      cost: 150,
      color: 0x00f0ff,
      accent: 0xffffff,
      glow: 'rgba(0,240,255,.42)',
      description: 'Aura lumineuse qui respire comme un battement de cœur.'
    }
  ];

  const CASTLE_SKINS = [
    {
      id: 'classic', name: 'Château classique', cost: 0,
      wall: 0xb0a898, light: 0xd2c9b7, dark: 0x6d6252, damaged: 0x7a6a52, trim: 0xd7bd62,
      roofP1: 0x8b1c18, roofP2: 0x1c2e8b, bannerP1: 0xb51d18, bannerP2: 0x2245b8,
      glow: 'rgba(232,201,106,.22)'
    },
    { id: 'royal_red', name: 'Forteresse rubis', cost: 85, wall: 0xb9a48f, light: 0xe3d0b8, dark: 0x69513f, damaged: 0x80513f, roof: 0xb42024, banner: 0xe2382f, trim: 0xd9ba5a, glow: 'rgba(255,70,58,.24)' },
    { id: 'royal_blue', name: 'Forteresse saphir', cost: 85, wall: 0xa8b0c8, light: 0xd1dcf5, dark: 0x4e5774, damaged: 0x596071, roof: 0x174dc5, banner: 0x2f75ff, trim: 0xd6c178, glow: 'rgba(70,140,255,.24)' },
    { id: 'black_gold', name: 'Noir et or', cost: 120, wall: 0x302a24, light: 0x76644a, dark: 0x14100d, damaged: 0x3c3024, roof: 0x0a0908, banner: 0xd6a92e, trim: 0xffd667, glow: 'rgba(255,210,90,.30)' },
    { id: 'white_gold', name: 'Blanc impérial', cost: 145, wall: 0xd8d3c4, light: 0xfff4d5, dark: 0x8b846f, damaged: 0xaaa18c, roof: 0xf2f0e8, banner: 0xd6a92e, trim: 0xffd667, glow: 'rgba(255,245,205,.28)' },
    { id: 'ancient_green', name: 'Pierre ancienne', cost: 170, wall: 0x6f9272, light: 0xacc8a3, dark: 0x394f39, damaged: 0x5c6d50, roof: 0x0f5b39, banner: 0x39b56a, trim: 0xb7c77a, glow: 'rgba(95,220,140,.22)' },
    { id: 'volcanic', name: 'Citadelle volcanique', cost: 210, wall: 0x4a3028, light: 0x8d5842, dark: 0x1b1110, damaged: 0x5d2b20, roof: 0xb33518, banner: 0xff6b21, trim: 0xffbd58, glow: 'rgba(255,95,35,.26)' },
    { id: 'arctic', name: 'Château arctique', cost: 240, wall: 0xbfdce4, light: 0xf4ffff, dark: 0x68848d, damaged: 0x8aa1a8, roof: 0x79e4ff, banner: 0xdafcff, trim: 0xffffff, glow: 'rgba(170,240,255,.30)' }
  ];

  // Références de progression : les objectifs doivent demander une vraie performance,
  // pas être atteints automatiquement pendant une partie normale.
  const CASTLE_PART_HP_VALUES = [12, 12, 12, 12, 14, 14, 14, 14, 22];
  const DEFENSE_TOWER_HP_VALUES = [85, 105, 125, 150];
  const DAMAGE_OBJECTIVE_BASE = CASTLE_PART_HP_VALUES.reduce((sum, hp) => sum + hp, 0)
    + DEFENSE_TOWER_HP_VALUES.reduce((sum, hp) => sum + hp, 0);

  const VP_OBJECTIVES = [
    {
      id: 'damage',
      label: 'PV retirés',
      get: s => s.damage,
      thresholds: [[590, 1], [650, 2], [720, 4], [800, 6], [900, 8]]
    },
    { id: 'structures', label: 'Structures détruites', get: s => s.partsDestroyed + s.towersDestroyed, thresholds: [[11, 1], [15, 3], [20, 6]] },
    { id: 'combos',     label: 'Combos de siège',      get: s => s.combos,                         thresholds: [[1, 2], [3, 4], [5, 8]] },
    { id: 'resources',  label: 'Ressources gagnées',   get: s => s.resources,                      thresholds: [[80, 1], [140, 2], [210, 4], [300, 6]] },
    { id: 'holes',      label: 'Trous atteints',       get: s => s.holesHit,                       thresholds: [[15, 1], [30, 2], [45, 4], [60, 6]] },
    { id: 'edge',       label: 'Pillages / vols',      get: s => s.edgeSteals,                     thresholds: [[5, 1], [10, 2], [15, 5]] },
    { id: 'relics',     label: 'Reliques trouvées',    get: s => s.relicsFound,                    thresholds: [[1, 2], [2, 3], [3, 4], [4, 5]] },
    { id: 'second',     label: 'Seconds lancers',      get: s => s.secondShots,                    thresholds: [[12, 1], [18, 2], [21, 4]] }
  ];
  const VICTORY_POINT_WIN_BONUS = 3;
  const FAST_VICTORY_OBJECTIVE = {
    id: 'fastWin',
    label: 'Victoire rapide',
    get: () => matchTurns,
    thresholds: [[30, 3], [25, 5], [20, 8]]
  };
  const SCORE_TO_BEAT_DEFAULT = 20;
  const SCORE_TO_BEAT_BONUS = 3;

  function defaultProgress() {
    return {
      victoryPoints: 0,
      lifetimeEarned: 0,
      bestScoreToBeat: SCORE_TO_BEAT_DEFAULT,
      unlockedBallSkins: ['ivory'],
      selectedBallSkins: { '1': 'ivory', '2': 'ivory' },
      unlockedBallEffects: ['none'],
      selectedBallEffects: { '1': 'none', '2': 'none' },
      unlockedCastleSkins: ['classic'],
      selectedCastleSkins: { '1': 'classic', '2': 'classic' }
    };
  }

  function findBallSkin(id) {
    return BALL_SKINS.find(skin => skin.id === id) || BALL_SKINS[0];
  }

  function findBallEffect(id) {
    return BALL_EFFECTS.find(effect => effect.id === id) || BALL_EFFECTS[0];
  }

  function findCastleSkin(id) {
    return CASTLE_SKINS.find(skin => skin.id === id) || CASTLE_SKINS[0];
  }

  function colorToHex(value) {
    return '#' + (Number(value) >>> 0).toString(16).padStart(6, '0').slice(-6);
  }

  function cssColor(value, fallback = '#ffffff') {
    if (typeof value === 'string') return value;
    if (Number.isFinite(Number(value))) return colorToHex(value);
    return fallback;
  }

  function shadeBallColor(value, amount) {
    const color = Number(value) >>> 0;
    const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
    const r = clamp(((color >> 16) & 255) + amount);
    const g = clamp(((color >> 8) & 255) + amount);
    const b = clamp((color & 255) + amount);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function ballSkinCssVars(skin) {
    const base = cssColor(skin.color);
    const light = cssColor(skin.light, shadeBallColor(skin.color, 76));
    const dark = cssColor(skin.dark, shadeBallColor(skin.color, -92));
    const accent = cssColor(skin.accent, shadeBallColor(skin.color, 38));
    const glow = skin.glow || 'rgba(255,228,138,.22)';
    return `--skin:${base};--skin-light:${light};--skin-dark:${dark};--skin-accent:${accent};--skin-glow:${glow};`;
  }

  function ballEffectCssVars(effect) {
    const base = cssColor(effect.color, '#00f0ff');
    const light = cssColor(effect.light, shadeBallColor(effect.color || 0x00f0ff, 72));
    const dark = cssColor(effect.dark, shadeBallColor(effect.color || 0x00f0ff, -88));
    const accent = cssColor(effect.accent, '#ffffff');
    const glow = effect.glow || 'rgba(0,240,255,.32)';
    return `--skin:${base};--skin-light:${light};--skin-dark:${dark};--skin-accent:${accent};--skin-glow:${glow};`;
  }

  function castleSkinValue(skin, key, player = 1) {
    const playerKey = key + (player === 2 ? 'P2' : 'P1');
    return skin[playerKey] !== undefined ? skin[playerKey] : skin[key];
  }

  function castleSkinCssVars(skin) {
    const wall = cssColor(castleSkinValue(skin, 'wall', 1), '#b0a898');
    const light = cssColor(castleSkinValue(skin, 'light', 1), '#d2c9b7');
    const dark = cssColor(castleSkinValue(skin, 'dark', 1), '#6d6252');
    const roof = cssColor(castleSkinValue(skin, 'roof', 1), '#8b1c18');
    const banner = cssColor(castleSkinValue(skin, 'banner', 1), '#b51d18');
    const trim = cssColor(castleSkinValue(skin, 'trim', 1), '#d7bd62');
    const glow = skin.glow || 'rgba(255,228,138,.22)';
    return `--castle-wall:${wall};--castle-light:${light};--castle-dark:${dark};--castle-roof:${roof};--castle-banner:${banner};--castle-trim:${trim};--skin-glow:${glow};`;
  }

  function normalizeProgress(raw) {
    const base = defaultProgress();
    const data = raw && typeof raw === 'object' ? raw : {};
    base.victoryPoints = Math.max(0, Number(data.victoryPoints) || 0);
    base.lifetimeEarned = Math.max(base.victoryPoints, Number(data.lifetimeEarned) || base.victoryPoints);
    base.bestScoreToBeat = Math.max(SCORE_TO_BEAT_DEFAULT, Number(data.bestScoreToBeat) || SCORE_TO_BEAT_DEFAULT);

    const validIds = new Set(BALL_SKINS.map(skin => skin.id));
    const unlocked = Array.isArray(data.unlockedBallSkins) ? data.unlockedBallSkins.filter(id => validIds.has(id)) : [];
    base.unlockedBallSkins = Array.from(new Set(['ivory', ...unlocked]));

    const selected = data.selectedBallSkins && typeof data.selectedBallSkins === 'object' ? data.selectedBallSkins : {};
    ['1', '2'].forEach(playerKey => {
      const selectedId = selected[playerKey];
      base.selectedBallSkins[playerKey] = base.unlockedBallSkins.includes(selectedId) ? selectedId : 'ivory';
    });

    const validEffectIds = new Set(BALL_EFFECTS.map(effect => effect.id));
    const unlockedEffects = Array.isArray(data.unlockedBallEffects) ? data.unlockedBallEffects.filter(id => validEffectIds.has(id)) : [];
    base.unlockedBallEffects = Array.from(new Set(['none', ...unlockedEffects]));

    const selectedEffects = data.selectedBallEffects && typeof data.selectedBallEffects === 'object' ? data.selectedBallEffects : {};
    ['1', '2'].forEach(playerKey => {
      const selectedId = selectedEffects[playerKey];
      base.selectedBallEffects[playerKey] = base.unlockedBallEffects.includes(selectedId) ? selectedId : 'none';
    });

    const validCastleIds = new Set(CASTLE_SKINS.map(skin => skin.id));
    const unlockedCastle = Array.isArray(data.unlockedCastleSkins) ? data.unlockedCastleSkins.filter(id => validCastleIds.has(id)) : [];
    base.unlockedCastleSkins = Array.from(new Set(['classic', ...unlockedCastle]));

    const selectedCastle = data.selectedCastleSkins && typeof data.selectedCastleSkins === 'object' ? data.selectedCastleSkins : {};
    ['1', '2'].forEach(playerKey => {
      const selectedId = selectedCastle[playerKey];
      base.selectedCastleSkins[playerKey] = base.unlockedCastleSkins.includes(selectedId) ? selectedId : 'classic';
    });
    return base;
  }

  const PROFILE_AVATARS = [
    { id: 'knight', icon: '🛡️', label: 'Chevalier' },
    { id: 'archer', icon: '🏹', label: 'Archère' },
    { id: 'mage', icon: '🧙', label: 'Mage' },
    { id: 'builder', icon: '🔨', label: 'Bâtisseur' },
    { id: 'dragon', icon: '🐉', label: 'Dragon' },
    { id: 'crown', icon: '👑', label: 'Roi' },
    { id: 'fox', icon: '🦊', label: 'Renard' },
    { id: 'wolf', icon: '🐺', label: 'Loup' },
    { id: 'lion', icon: '🦁', label: 'Lion' },
    { id: 'eagle', icon: '🦅', label: 'Aigle' },
    { id: 'bear', icon: '🐻', label: 'Ours' },
    { id: 'owl', icon: '🦉', label: 'Hibou' },
    { id: 'boar', icon: '🐗', label: 'Sanglier' },
    { id: 'unicorn', icon: '🦄', label: 'Licorne' },
    { id: 'phoenix', icon: '🔥', label: 'Phénix' },
    { id: 'skull', icon: '💀', label: 'Crâne' },
    { id: 'bombardier', icon: '💣', label: 'Bombardier' },
    { id: 'castle', icon: '🏰', label: 'Château' },
    { id: 'gem', icon: '💎', label: 'Joyau' },
    { id: 'lightning', icon: '⚡', label: 'Foudre' },
    { id: 'moon', icon: '🌙', label: 'Lune' },
    { id: 'star', icon: '⭐', label: 'Étoile' },
    { id: 'clover', icon: '🍀', label: 'Trèfle' },
    { id: 'mushroom', icon: '🍄', label: 'Champignon' },
    { id: 'acorn', icon: '🌰', label: 'Gland' },
    { id: 'explorer', icon: '🧭', label: 'Explorateur' },
    { id: 'smith', icon: '⚒️', label: 'Forgeron' },
    { id: 'champion', icon: '🏆', label: 'Champion' }
  ];
  const DEFAULT_PROFILE_AVATAR = 'knight';

  function normalizeProfileAvatar(id) {
    const value = String(id || '').trim();
    return PROFILE_AVATARS.some(a => a.id === value) ? value : DEFAULT_PROFILE_AVATAR;
  }

  function profileAvatarData(id) {
    return PROFILE_AVATARS.find(a => a.id === normalizeProfileAvatar(id)) || PROFILE_AVATARS[0];
  }

  function profileTitleData(progressData) {
    const pr = progressData || defaultProgress();
    const earned = Number(pr.lifetimeEarned || 0);
    const record = Math.max(SCORE_TO_BEAT_DEFAULT, Number(pr.bestScoreToBeat || SCORE_TO_BEAT_DEFAULT));
    if (earned >= 260) return { icon: '👑', label: 'Seigneur du Siège' };
    if (earned >= 180) return { icon: '🏆', label: 'Champion des Remparts' };
    if (earned >= 120) return { icon: '🔥', label: 'Briseur de Châteaux' };
    if (earned >= 70) return { icon: '🧱', label: 'Maître Bâtisseur' };
    if (record >= SCORE_TO_BEAT_DEFAULT + 18) return { icon: '🎯', label: 'Tireur Royal' };
    if (earned >= 30) return { icon: '🪙', label: 'Pilleur Malin' };
    return { icon: '🌱', label: 'Apprenti du Siège' };
  }

  const PROFILES_STORAGE_KEY = 'BDS_PLAYER_PROFILES_V1';

  function loadLegacyProgress() {
    try {
      return normalizeProgress(JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || 'null'));
    } catch (err) {
      return defaultProgress();
    }
  }

  function makeProfileId() {
    return 'profil_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function cleanProfileName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 18) || 'Joueur';
  }

  function createProfileObject(name, progressData, avatarId = DEFAULT_PROFILE_AVATAR) {
    const id = makeProfileId();
    return { id, name: cleanProfileName(name), avatar: normalizeProfileAvatar(avatarId), progress: normalizeProgress(progressData || defaultProgress()) };
  }

  function defaultProfileState() {
    const p1 = createProfileObject('Joueur 1', loadLegacyProgress());
    const p2 = createProfileObject('Joueur 2', defaultProgress());
    return {
      version: 1,
      activeSlots: { '1': p1.id, '2': p2.id },
      profiles: { [p1.id]: p1, [p2.id]: p2 }
    };
  }

  function normalizeProfileState(raw) {
    if (!raw || typeof raw !== 'object' || !raw.profiles || typeof raw.profiles !== 'object') return defaultProfileState();

    const profiles = {};
    Object.values(raw.profiles).forEach((profile, index) => {
      if (!profile || typeof profile !== 'object') return;
      const id = String(profile.id || makeProfileId());
      profiles[id] = {
        id,
        name: cleanProfileName(profile.name || ('Joueur ' + (index + 1))),
        avatar: normalizeProfileAvatar(profile.avatar || (index === 1 ? 'archer' : DEFAULT_PROFILE_AVATAR)),
        progress: normalizeProgress(profile.progress || defaultProgress())
      };
    });

    const ids = Object.keys(profiles);
    if (!ids.length) return defaultProfileState();

    const activeSlots = raw.activeSlots && typeof raw.activeSlots === 'object' ? { ...raw.activeSlots } : {};
    if (!profiles[activeSlots['1']]) activeSlots['1'] = ids[0];
    if (!profiles[activeSlots['2']]) activeSlots['2'] = ids[1] || ids[0];

    return { version: 1, activeSlots, profiles };
  }

  function loadProfileState() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || 'null');
      return normalizeProfileState(saved);
    } catch (err) {
      return defaultProfileState();
    }
  }

  let profileState = loadProfileState();

  function getProfilesArray() {
    return Object.values(profileState.profiles).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  function getProfileById(id) {
    return profileState.profiles[id] || getProfilesArray()[0];
  }

  function getActiveProfile(player = 1) {
    const key = String(player || 1);
    return getProfileById(profileState.activeSlots[key]);
  }

  function getPlayerProgress(player = 1) {
    const profile = getActiveProfile(player);
    return profile ? profile.progress : defaultProgress();
  }

  function getProfileName(player = 1) {
    const profile = getActiveProfile(player);
    return profile ? profile.name : ('Joueur ' + player);
  }

  function getProfileAvatar(player = 1) {
    const profile = getActiveProfile(player);
    return profileAvatarData(profile ? profile.avatar : DEFAULT_PROFILE_AVATAR).icon;
  }

  let progress = getPlayerProgress(1);

  function saveProfiles() {
    try { localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profileState)); } catch (err) {}
    progress = getPlayerProgress(1);
    try { localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch (err) {}
  }

  function saveProgress() {
    saveProfiles();
  }

  function createPlayerProfile(name, avatarId = DEFAULT_PROFILE_AVATAR) {
    const profile = createProfileObject(name, defaultProgress(), avatarId);
    profileState.profiles[profile.id] = profile;
    saveProfiles();
    renderProfiles();
    updateMainMenuProgress();
    return profile;
  }

  function selectProfileForPlayer(player, profileId) {
    if (!profileState.profiles[profileId]) return;
    profileState.activeSlots[String(player)] = profileId;
    saveProfiles();
    try { applyActiveBallSkin(active); } catch (err) {}
    try { updateBallPulseColors(active); } catch (err) {}
    try { refreshCastleSkin(player); } catch (err) {}
    renderProfiles();
    renderProgression();
    renderCustomization();
    updateMainMenuProgress();
    updateHUD();
  }

  function renamePlayerProfile(profileId) {
    const profile = profileState.profiles[profileId];
    if (!profile) return;
    const next = cleanProfileName(window.prompt('Nouveau pseudo :', profile.name));
    if (!next) return;
    profile.name = next;
    saveProfiles();
    renderProfiles();
    renderProgression();
    renderCustomization();
    updateMainMenuProgress();
    updateHUD();
  }

  function deletePlayerProfile(profileId) {
    const profiles = getProfilesArray();
    if (profiles.length <= 1) {
      window.alert('Il faut garder au moins un profil.');
      return;
    }
    const profile = profileState.profiles[profileId];
    if (!profile) return;
    const ok = window.confirm('Supprimer le profil "' + profile.name + '" ?\n\nSa progression sera perdue.');
    if (!ok) return;
    delete profileState.profiles[profileId];
    const fallback = getProfilesArray()[0];
    ['1', '2'].forEach(key => {
      if (profileState.activeSlots[key] === profileId) profileState.activeSlots[key] = fallback.id;
    });
    saveProfiles();
    renderProfiles();
    renderProgression();
    renderCustomization();
    updateMainMenuProgress();
    updateHUD();
  }

  function resetProgressionData() {
    const names = Array.from(new Set([getActiveProfile(1).id, getActiveProfile(2).id])).map(id => profileState.profiles[id].name).join(' / ');
    const ok = window.confirm(
      'Remettre à zéro la progression des profils actifs ?\n\n' +
      names + '\n\n' +
      'Cela supprimera les points de victoire, les couleurs de bille, les effets de bille, les couleurs de château et le score à battre de ces profils.'
    );
    if (!ok) return;

    Array.from(new Set([getActiveProfile(1).id, getActiveProfile(2).id])).forEach(id => {
      const profile = profileState.profiles[id];
      if (profile) profile.progress = defaultProgress();
    });
    saveProfiles();
    updateMainMenuProgress();
    renderProfiles();
    renderProgression();
    renderCustomization();

    try { applyActiveBallSkin(active); } catch (err) {}
    try { updateBallPulseColors(active); } catch (err) {}
    try { refreshAllCastleSkins(); } catch (err) {}
  }

  function getSelectedBallSkinId(player = active) {
    const pr = getPlayerProgress(player);
    const key = String(player || 1);
    const legacyId = pr.selectedBallSkins && pr.selectedBallSkins[key] ? pr.selectedBallSkins[key] : null;
    const id = pr.selectedBallSkin || legacyId || 'ivory';
    return pr.unlockedBallSkins.includes(id) ? id : 'ivory';
  }

  function setSelectedBallSkin(player, skinId) {
    const pr = getPlayerProgress(player);
    if (!pr.unlockedBallSkins.includes(skinId)) return;
    pr.selectedBallSkin = skinId;
    pr.selectedBallSkins[String(player)] = skinId;
    saveProgress();
    if (player === active) applyActiveBallSkin(player);
    renderCustomization();
    updateMainMenuProgress();
  }

  function unlockBallSkin(skinId, player = active) {
    const skin = findBallSkin(skinId);
    const pr = getPlayerProgress(player);
    if (!skin || pr.unlockedBallSkins.includes(skin.id)) return;
    if (pr.victoryPoints < skin.cost) return;
    pr.victoryPoints -= skin.cost;
    pr.unlockedBallSkins.push(skin.id);
    saveProgress();
    renderCustomization();
    updateMainMenuProgress();
  }

  function getSelectedBallEffectId(player = active) {
    const pr = getPlayerProgress(player);
    const key = String(player || 1);
    const legacyId = pr.selectedBallEffects && pr.selectedBallEffects[key] ? pr.selectedBallEffects[key] : null;
    const id = pr.selectedBallEffect || legacyId || 'none';
    return pr.unlockedBallEffects.includes(id) ? id : 'none';
  }

  function setSelectedBallEffect(player, effectId) {
    const pr = getPlayerProgress(player);
    if (!pr.unlockedBallEffects.includes(effectId)) return;
    pr.selectedBallEffect = effectId;
    pr.selectedBallEffects[String(player)] = effectId;
    saveProgress();
    if (player === active) updateBallPulseColors(player);
    renderCustomization();
    updateMainMenuProgress();
  }

  function unlockBallEffect(effectId, player = active) {
    const effect = findBallEffect(effectId);
    const pr = getPlayerProgress(player);
    if (!effect || pr.unlockedBallEffects.includes(effect.id)) return;
    if (pr.victoryPoints < effect.cost) return;
    pr.victoryPoints -= effect.cost;
    pr.unlockedBallEffects.push(effect.id);
    saveProgress();
    renderCustomization();
    updateMainMenuProgress();
  }

  function getSelectedCastleSkinId(player = active) {
    const pr = getPlayerProgress(player);
    const key = String(player || 1);
    const legacyId = pr.selectedCastleSkins && pr.selectedCastleSkins[key] ? pr.selectedCastleSkins[key] : null;
    const id = pr.selectedCastleSkin || legacyId || 'classic';
    return pr.unlockedCastleSkins.includes(id) ? id : 'classic';
  }

  function setSelectedCastleSkin(player, skinId) {
    const pr = getPlayerProgress(player);
    if (!pr.unlockedCastleSkins.includes(skinId)) return;
    pr.selectedCastleSkin = skinId;
    pr.selectedCastleSkins[String(player)] = skinId;
    saveProgress();
    try { refreshCastleSkin(player); } catch (err) {}
    renderCustomization();
    updateMainMenuProgress();
  }

  function unlockCastleSkin(skinId, player = active) {
    const skin = findCastleSkin(skinId);
    const pr = getPlayerProgress(player);
    if (!skin || pr.unlockedCastleSkins.includes(skin.id)) return;
    if (pr.victoryPoints < skin.cost) return;
    pr.victoryPoints -= skin.cost;
    pr.unlockedCastleSkins.push(skin.id);
    saveProgress();
    renderCustomization();
    updateMainMenuProgress();
  }

  function calculateVictoryPointsForStats(stats, isWinner) {
    const lines = [];
    let points = 0;
    VP_OBJECTIVES.forEach(objective => {
      const value = Number(objective.get(stats)) || 0;
      let bestThreshold = null;
      let bestReward = 0;
      objective.thresholds.forEach(([threshold, reward]) => {
        if (value >= threshold && reward >= bestReward) {
          bestThreshold = threshold;
          bestReward = reward;
        }
      });
      if (bestReward > 0) {
        points += bestReward;
        lines.push({ label: objective.label, value, points: bestReward, reached: [bestThreshold] });
      }
    });
    if (isWinner) {
      points += VICTORY_POINT_WIN_BONUS;
      lines.push({ label: 'Victoire', value: 'Château détruit', points: VICTORY_POINT_WIN_BONUS, reached: [] });

      const turns = Number(FAST_VICTORY_OBJECTIVE.get(stats)) || 0;
      let fastThreshold = null;
      let fastReward = 0;
      FAST_VICTORY_OBJECTIVE.thresholds.forEach(([maxTurns, reward]) => {
        if (turns > 0 && turns <= maxTurns && reward >= fastReward) {
          fastThreshold = maxTurns;
          fastReward = reward;
        }
      });
      if (fastReward > 0) {
        points += fastReward;
        lines.push({ label: FAST_VICTORY_OBJECTIVE.label, value: turns + ' manches', points: fastReward, reached: [fastThreshold] });
      }
    }
    return { points, lines };
  }

  function awardVictoryPoints(winner) {
    const reports = [];

    [1, 2].forEach(player => {
      if (gameMode === 'solo' && player === 2) return;
      const pr = getPlayerProgress(player);
      const previousScoreToBeat = Math.max(SCORE_TO_BEAT_DEFAULT, Number(pr.bestScoreToBeat) || SCORE_TO_BEAT_DEFAULT);
      const result = calculateVictoryPointsForStats(matchStats[player - 1], player === winner);
      const report = {
        player,
        profileName: getProfileName(player),
        ...result,
        baseScore: result.points,
        highScoreBonus: 0,
        previousScoreToBeat,
        bestScoreToBeat: previousScoreToBeat,
        recordBroken: false,
        balanceBefore: pr.victoryPoints
      };

      if (report.baseScore > previousScoreToBeat) {
        report.recordBroken = true;
        report.highScoreBonus = SCORE_TO_BEAT_BONUS;
        report.points += SCORE_TO_BEAT_BONUS;
        report.bestScoreToBeat = report.baseScore;
        pr.bestScoreToBeat = report.baseScore;
        report.lines.push({ label: 'Nouveau score à battre', value: report.baseScore + ' pts', points: SCORE_TO_BEAT_BONUS, reached: [] });
      }

      pr.victoryPoints += report.points;
      pr.lifetimeEarned += report.points;
      report.balance = pr.victoryPoints;
      reports.push(report);
    });

    const total = reports.reduce((sum, report) => sum + report.points, 0);
    saveProgress();
    updateMainMenuProgress();
    return {
      reports,
      total,
      recordBroken: reports.some(r => r.recordBroken),
      recordBonus: SCORE_TO_BEAT_BONUS
    };
  }

  const turnOverlay = document.createElement('div');
  turnOverlay.id = 'turnOverlay';
  turnOverlay.innerHTML = '<div class="turn-card"><h2></h2><p></p></div>';
  document.body.appendChild(turnOverlay);
  const turnTitle = turnOverlay.querySelector('h2');
  const turnText  = turnOverlay.querySelector('p');

  // Marché : échanges de ressources simples, sans modifier le gameplay principal.
  // Règle : en temps normal, convertir coûte légèrement plus cher que ce que l'on récupère.
  // Un seul échange est autorisé par tour de joueur. Pendant l'événement Solde au marché, les taux deviennent meilleurs.
  const marketOverlay = document.createElement('div');
  marketOverlay.id = 'marketOverlay';
  marketOverlay.innerHTML = `
    <div class="market-box">
      <button class="market-close" type="button">✕</button>
      <h2>⚖️ Marché</h2>
      <p class="market-stock"></p>
      <div class="market-actions"></div>
    </div>`;
  document.body.appendChild(marketOverlay);
  const marketClose = marketOverlay.querySelector('.market-close');
  const marketStock = marketOverlay.querySelector('.market-stock');
  const marketActions = marketOverlay.querySelector('.market-actions');

  const MARKET_TRADES_NORMAL = [
    { id: 'wood_gold',  from: 'wood',  fromLabel: 'bois',    fromIcon: '🪵', cost: 3, to: 'gold',  toLabel: 'or',      toIcon: '🪙', gain: 1 },
    { id: 'stone_gold', from: 'stone', fromLabel: 'pierres', fromIcon: '🪨', cost: 3, to: 'gold',  toLabel: 'or',      toIcon: '🪙', gain: 1 },
    { id: 'gold_wood',  from: 'gold',  fromLabel: 'or',      fromIcon: '🪙', cost: 1, to: 'wood',  toLabel: 'bois',    toIcon: '🪵', gain: 2 },
    { id: 'gold_stone', from: 'gold',  fromLabel: 'or',      fromIcon: '🪙', cost: 1, to: 'stone', toLabel: 'pierres', toIcon: '🪨', gain: 2 },
    { id: 'relic_gold', from: 'relic', fromLabel: 'relique', fromIcon: '🏺', cost: 1, to: 'gold', toLabel: 'or', toIcon: '🪙', gain: 5 }
  ];

  const MARKET_TRADES_SALE = [
    { id: 'wood_gold_sale',  from: 'wood',  fromLabel: 'bois',    fromIcon: '🪵', cost: 2, to: 'gold',  toLabel: 'or',      toIcon: '🪙', gain: 1 },
    { id: 'stone_gold_sale', from: 'stone', fromLabel: 'pierres', fromIcon: '🪨', cost: 2, to: 'gold',  toLabel: 'or',      toIcon: '🪙', gain: 1 },
    { id: 'gold_wood_sale',  from: 'gold',  fromLabel: 'or',      fromIcon: '🪙', cost: 1, to: 'wood',  toLabel: 'bois',    toIcon: '🪵', gain: 3 },
    { id: 'gold_stone_sale', from: 'gold',  fromLabel: 'or',      fromIcon: '🪙', cost: 1, to: 'stone', toLabel: 'pierres', toIcon: '🪨', gain: 3 },
    { id: 'relic_gold_sale', from: 'relic', fromLabel: 'relique', fromIcon: '🏺', cost: 1, to: 'gold', toLabel: 'or', toIcon: '🪙', gain: 5 }
  ];

  // Réparation aléatoire +40 PV : le joueur choisit comment payer.
  const repairOverlay = document.createElement('div');
  repairOverlay.id = 'repairOverlay';
  repairOverlay.innerHTML = `
    <div class="market-box repair-box">
      <button class="market-close repair-close" type="button">✕</button>
      <h2>🔧 Réparation</h2>
      <p class="market-stock repair-stock"></p>
      <div class="market-actions repair-actions"></div>
    </div>`;
  document.body.appendChild(repairOverlay);
  const repairClose = repairOverlay.querySelector('.repair-close');
  const repairStock = repairOverlay.querySelector('.repair-stock');
  const repairActions = repairOverlay.querySelector('.repair-actions');

  // Menu unique des kits : évite deux petits boutons mal placés sur mobile.
  const kitOverlay = document.createElement('div');
  kitOverlay.id = 'kitOverlay';
  kitOverlay.innerHTML = `
    <div class="market-box kit-box">
      <button class="market-close kit-close" type="button">✕</button>
      <h2>🧰 Kits</h2>
      <p class="market-stock kit-stock"></p>
      <div class="market-actions kit-actions"></div>
    </div>`;
  document.body.appendChild(kitOverlay);
  const kitClose = kitOverlay.querySelector('.kit-close');
  const kitStock = kitOverlay.querySelector('.kit-stock');
  const kitActions = kitOverlay.querySelector('.kit-actions');

  const REPAIR_COST_OPTIONS = [
    { id: 'stone2', label: '2 pierres', cost: { stone: 2 }, icon: '2 🪨' },
    { id: 'wood2',  label: '2 bois',    cost: { wood: 2 },  icon: '2 🪵' },
    { id: 'mix',    label: '1 pierre + 1 bois', cost: { stone: 1, wood: 1 }, icon: '1 🪨 + 1 🪵' },
    { id: 'gold1',  label: '1 or',      cost: { gold: 1 },  icon: '1 🪙' }
  ];

  // Validation de placement des tours : évite les poses accidentelles pendant le mouvement caméra.
  const towerConfirmOverlay = document.createElement('div');
  towerConfirmOverlay.id = 'towerConfirmOverlay';
  towerConfirmOverlay.innerHTML = `
    <div class="tower-confirm-box">
      <h3>🗼 Valider la tour ?</h3>
      <p class="tower-confirm-text">Position sélectionnée.</p>
      <div class="tower-confirm-actions">
        <button id="towerConfirmCancel" type="button">Annuler</button>
        <button id="towerConfirmOk" type="button">Valider</button>
      </div>
      <small>Tu peux déplacer la vue avant de valider.</small>
    </div>`;
  document.body.appendChild(towerConfirmOverlay);
  const towerConfirmText = towerConfirmOverlay.querySelector('.tower-confirm-text');
  const towerConfirmOk = towerConfirmOverlay.querySelector('#towerConfirmOk');
  const towerConfirmCancel = towerConfirmOverlay.querySelector('#towerConfirmCancel');
  towerConfirmOverlay.addEventListener('pointerdown', ev => ev.stopPropagation());

  // Choix de rampe : quand plusieurs emplacements sont disponibles, le joueur choisit.
  const rampChoiceOverlay = document.createElement('div');
  rampChoiceOverlay.id = 'rampChoiceOverlay';
  rampChoiceOverlay.innerHTML = `
    <div class="ramp-choice-box">
      <button class="ramp-choice-close" type="button">✕</button>
      <h2 id="rampChoiceTitle">🪵 Choisir une rampe</h2>
      <p id="rampChoiceSubtitle">Sélectionne l'emplacement à construire.</p>
      <div id="rampChoiceList" class="ramp-choice-list"></div>
    </div>`;
  document.body.appendChild(rampChoiceOverlay);
  const rampChoiceClose = rampChoiceOverlay.querySelector('.ramp-choice-close');
  const rampChoiceTitle = rampChoiceOverlay.querySelector('#rampChoiceTitle');
  const rampChoiceSubtitle = rampChoiceOverlay.querySelector('#rampChoiceSubtitle');
  const rampChoiceList = rampChoiceOverlay.querySelector('#rampChoiceList');
  rampChoiceOverlay.addEventListener('pointerdown', ev => ev.stopPropagation());

  function closeRampChoice() {
    rampChoiceOverlay.classList.remove('show');
  }

  if (rampChoiceClose) rampChoiceClose.onclick = closeRampChoice;
  rampChoiceOverlay.addEventListener('click', e => {
    if (e.target === rampChoiceOverlay) closeRampChoice();
  });

  // Sélection directe sur le plateau : après avoir choisi une rampe ou un décombre
  // dans une liste, la caméra montre l'objet et le joueur confirme en cliquant dessus.
  const worldActionPrompt = document.createElement('div');
  worldActionPrompt.id = 'worldActionPrompt';
  worldActionPrompt.innerHTML = `
    <div class="world-action-card">
      <b></b>
      <span></span>
      <button type="button">Annuler</button>
    </div>`;
  document.body.appendChild(worldActionPrompt);
  const worldActionPromptTitle = worldActionPrompt.querySelector('b');
  const worldActionPromptText = worldActionPrompt.querySelector('span');
  const worldActionPromptCancel = worldActionPrompt.querySelector('button');
  let pendingWorldAction = null;

  function showWorldActionPrompt(title, text) {
    if (worldActionPromptTitle) worldActionPromptTitle.textContent = title || 'Sélection';
    if (worldActionPromptText) worldActionPromptText.textContent = text || 'Clique directement sur l’objet pour confirmer.';
    worldActionPrompt.classList.add('show');
  }

  function clearPendingWorldAction() {
    pendingWorldAction = null;
    if (worldActionPrompt) worldActionPrompt.classList.remove('show');
    updateZoneMarkerVisibility();
  }

  if (worldActionPromptCancel) {
    worldActionPromptCancel.onclick = () => {
      clearPendingWorldAction();
      rampCameraFocus = null;
      showToast('Sélection annulée');
    };
  }

  function focusCameraOnWorldPoint(x, z, player = active, duration = 6500, height = 19, distance = 24) {
    const target = new THREE.Vector3(x, 2.7, z);
    const pos = target.clone().add(new THREE.Vector3(0, height, -dir(player) * distance));
    rampCameraFocus = { target, pos, until: Date.now() + duration };
  }

  function setPendingWorldAction(action) {
    pendingWorldAction = action || null;
    if (!pendingWorldAction) { clearPendingWorldAction(); return; }
    showWorldActionPrompt(
      pendingWorldAction.title || 'Confirmer sur le plateau',
      pendingWorldAction.text || 'Clique directement sur l’objet pour confirmer.'
    );
    updateZoneMarkerVisibility();
  }

  function handlePendingWorldActionClick(point) {
    if (!pendingWorldAction || !point || !point.world) return false;
    const action = pendingWorldAction;
    const dist = Math.hypot(point.world.x - action.x, point.world.z - action.z);
    if (dist > (action.radius || 4.0)) {
      if (typeof action.refocus === 'function') action.refocus();
      showToast('Clique sur l’objet sélectionné<br>ou annule la sélection');
      return true;
    }
    if (typeof action.execute === 'function') action.execute();
    clearPendingWorldAction();
    return true;
  }

  // Contrôles caméra simples : on évite les gestes compliqués qui posaient problème.
  const cameraControls = document.createElement('div');
  cameraControls.id = 'cameraControls';
  cameraControls.innerHTML = `
    <button id="camRotateLeft" type="button" title="Tourner à gauche">↶</button>
    <button id="camZoomOut" type="button" title="Dézoomer">−</button>
    <button id="camReset" type="button">Recentrer</button>
    <button id="camZoomIn" type="button" title="Zoomer">+</button>
    <button id="camRotateRight" type="button" title="Tourner à droite">↷</button>
  `;
  document.body.appendChild(cameraControls);
  cameraControls.addEventListener('pointerdown', ev => ev.stopPropagation());
  const camRotateLeft = cameraControls.querySelector('#camRotateLeft');
  const camRotateRight = cameraControls.querySelector('#camRotateRight');
  const camZoomOut = cameraControls.querySelector('#camZoomOut');
  const camZoomIn = cameraControls.querySelector('#camZoomIn');
  const camReset = cameraControls.querySelector('#camReset');


  // Tutoriel de démarrage : explications en pop-up, sans modifier le gameplay.
  const tutorialOverlay = document.createElement('div');
  tutorialOverlay.id = 'tutorialOverlay';
  tutorialOverlay.innerHTML = `
    <div class="tutorial-box">
      <button id="tutorialClose" aria-label="Fermer">✕</button>
      <div class="tutorial-step" id="tutorialStepCount">1/12</div>
      <h2 id="tutorialTitle"></h2>
      <div id="tutorialBody"></div>
      <div class="tutorial-actions">
        <button id="tutorialPrev">← Retour</button>
        <button id="tutorialSkip">Passer</button>
        <button id="tutorialNext">Suivant →</button>
      </div>
    </div>`;
  document.body.appendChild(tutorialOverlay);

  const tutorialTitle = tutorialOverlay.querySelector('#tutorialTitle');
  const tutorialBody = tutorialOverlay.querySelector('#tutorialBody');
  const tutorialStepCount = tutorialOverlay.querySelector('#tutorialStepCount');
  const tutorialPrev = tutorialOverlay.querySelector('#tutorialPrev');
  const tutorialNext = tutorialOverlay.querySelector('#tutorialNext');
  const tutorialSkip = tutorialOverlay.querySelector('#tutorialSkip');
  const tutorialClose = tutorialOverlay.querySelector('#tutorialClose');

  const tutorialSlides = [
    {
      title: 'Bienvenue, commandant',
      body: `
        <p>Dans <b>Bille de Siège</b>, tu attaques le château adverse avec une bille et tu protèges ton propre château.</p>
        <p>Ton objectif est simple :</p>
        <ul>
          <li><b>détruire les défenses adverses</b> ;</li>
          <li><b>ouvrir l’accès au château</b> ;</li>
          <li><b>faire tomber toutes les parties du château ennemi</b> avant que le tien ne soit détruit.</li>
        </ul>
        <div class="tutorial-card blue">Pense comme dans un siège : tu prépares, tu attaques, tu répares, puis tu recommences jusqu’à faire céder l’adversaire.</div>`
    },
    {
      title: 'Choisis ta partie',
      body: `
        <p>Au menu principal, commence par choisir le type de partie :</p>
        <ul>
          <li><b>1 joueur</b> : tu joues contre l’IA.</li>
          <li><b>2 joueurs</b> : deux joueurs jouent sur le même appareil, chacun leur tour.</li>
        </ul>
        <p>Ensuite, choisis la difficulté :</p>
        <ul>
          <li><b>Facile</b> : bille plus grosse, plus de trous, plus simple pour marquer des gains.</li>
          <li><b>Moyen</b> : équilibre entre précision et accessibilité.</li>
          <li><b>Difficile</b> : bille plus petite, moins de trous, il faut viser juste.</li>
        </ul>
        <div class="tutorial-card gold">La difficulté change surtout la précision demandée et le coût de certaines actions. Commence en Facile si tu découvres le jeu.</div>`
    },
    {
      title: 'Préparation : place tes tours',
      body: `
        <p>Avant le premier vrai tour, tu dois placer <b>4 tours de défense</b>.</p>
        <ul>
          <li>Ces tours protègent ton château.</li>
          <li>Elles empêchent l’adversaire d’utiliser certains accès vers ta butte.</li>
          <li>Place-les de façon à gêner les trajectoires dangereuses.</li>
        </ul>
        <p>Tu peux déplacer, zoomer et tourner la caméra pour bien voir la zone avant de valider.</p>
        <div class="tutorial-card green">Une tour bien placée peut faire perdre plusieurs tours à ton adversaire.</div>`
    },
    {
      title: 'Comment se déroule un tour',
      body: `
        <p>À ton tour, tu peux préparer ton action avant de lancer la bille.</p>
        <ul>
          <li><b>Attaque</b> : construire des rampes, nettoyer ton couloir, aller au marché ou lancer la bille.</li>
          <li><b>Défense</b> : réparer, reconstruire ou utiliser tes kits.</li>
          <li><b>Marché</b> : échanger des ressources ou acheter une seconde bille.</li>
        </ul>
        <p>Quand tu es prêt, lance la bille. Le tour se termine quand la bille s’arrête ou tombe dans un trou.</p>
        <div class="tutorial-card blue">Tu n’es pas obligé de tout faire à chaque tour. Le bon choix dépend de l’état du plateau.</div>`
    },
    {
      title: 'Lancer la bille',
      body: `
        <p>En phase de lancer, place la bille sur la ligne de départ, vise, charge la puissance puis relâche.</p>
        <ul>
          <li>Un tir fort peut atteindre le château, mais il est plus difficile à contrôler.</li>
          <li>Un tir plus précis peut viser un trou, un kit ou une rampe.</li>
          <li>Les rebonds peuvent créer de bonnes surprises… ou envoyer la bille dans un piège.</li>
        </ul>
        <div class="tutorial-card red">Ne tire pas toujours à fond. En Difficile, la précision vaut souvent mieux que la puissance brute.</div>`
    },
    {
      title: 'Détruire les défenses adverses',
      body: `
        <p>Pour vraiment menacer le château ennemi, commence souvent par viser ses tours.</p>
        <ul>
          <li>Chaque tour détruite peut ouvrir un accès vers une rampe château.</li>
          <li>Les rampes château aident la bille à monter vers la butte.</li>
          <li>Une fois sur la butte, la bille peut toucher les murs, les tours du château ou le donjon.</li>
        </ul>
        <div class="tutorial-card red">Détruire une tour, ce n’est pas juste faire des dégâts : c’est ouvrir une nouvelle route d’attaque.</div>`
    },
    {
      title: 'Trous, ressources, pièges et reliques',
      body: `
        <p>Les trous peuvent t’aider à gagner des ressources, mais ils ne sont pas tous sûrs.</p>
        <ul>
          <li>Si la bille tombe dans un trou de gain, tu reçois des ressources.</li>
          <li>Certains trous cachent un piège : quand tu les déclenches, ils deviennent visibles pour la suite de la partie.</li>
          <li>Des reliques sont cachées dans certains trous. Elles rapportent des points en fin de partie.</li>
          <li>Tu peux aussi revendre une relique au marché contre de l’or.</li>
        </ul>
        <div class="tutorial-card gold">Une relique trouvée reste comptée pour le score final, même si tu la revends ensuite.</div>`
    },
    {
      title: 'Décombres dans le couloir',
      body: `
        <p>Quand une tour ou une partie du château s’effondre, des <b>décombres</b> peuvent tomber dans ton couloir d’attaque.</p>
        <ul>
          <li>Au début, c’est un obstacle gênant mais localisé.</li>
          <li>Si ta bille tape dedans, les morceaux s’étalent.</li>
          <li>Plus tu tires dedans, plus le couloir devient sale et imprévisible.</li>
          <li>Tu peux payer <b>1 or</b> pour déblayer le couloir.</li>
        </ul>
        <div class="tutorial-card red">Laisser les décombres traîner peut te coûter cher. Nettoyer au bon moment peut sauver un tir important.</div>`
    },
    {
      title: 'Kits à récupérer',
      body: `
        <p>Des kits peuvent apparaître sur le plateau. Pour les prendre, touche-les avec la bille.</p>
        <ul>
          <li><b>Kit réparation</b> : répare plus tard une structure abîmée.</li>
          <li><b>Kit construction</b> : reconstruit plus tard une partie détruite du château.</li>
          <li>Les kits sont gardés en réserve jusqu’à leur utilisation.</li>
          <li>Ils s’utilisent en phase Défense.</li>
        </ul>
        <div class="tutorial-card green">Un kit peut valoir plus qu’un petit gain de ressources. Regarde toujours ce qui se trouve sur ta trajectoire.</div>`
    },
    {
      title: 'Marché et seconde bille',
      body: `
        <p>Le marché sert à adapter ta stratégie quand il te manque une ressource.</p>
        <ul>
          <li>Tu peux échanger bois, pierre et or.</li>
          <li>Tu peux revendre une relique contre de l’or.</li>
          <li>Tu peux acheter une <b>seconde bille</b> pour obtenir un lancer supplémentaire.</li>
        </ul>
        <p>Attention : tu ne peux faire qu’<b>une seule action marché</b> par tour.</p>
        <div class="tutorial-card gold">Acheter une seconde bille est puissant, mais cela remplace ton échange de ressources du tour.</div>`
    },
    {
      title: 'Événements de manche',
      body: `
        <p>Parfois, un événement change les conditions de jeu pendant la manche.</p>
        <ul>
          <li>Certains événements augmentent les gains.</li>
          <li>D’autres rendent les attaques plus violentes.</li>
          <li>La <b>Pluie boueuse</b> ajoute des zones qui ralentissent la bille sur les deux couloirs.</li>
        </ul>
        <div class="tutorial-card blue">Quand un événement apparaît, adapte ton tir. Un bon joueur profite des bonus et limite les dégâts des malus.</div>`
    },
    {
      title: 'Gagner et progresser',
      body: `
        <p>La partie se termine quand un château est détruit.</p>
        <p>À la fin, tu gagnes des points selon tes actions :</p>
        <ul>
          <li>dégâts infligés ;</li>
          <li>structures détruites ;</li>
          <li>ressources gagnées ;</li>
          <li>reliques trouvées ;</li>
          <li>seconds lancers et actions marquantes.</li>
        </ul>
        <div class="tutorial-card gold">Ces points servent uniquement à débloquer des éléments cosmétiques. Ils ne donnent aucun avantage de puissance.</div>`
    },
    {
      title: 'Conseil final',
      body: `
        <p>Pour bien jouer, ne vise pas toujours la même chose.</p>
        <ul>
          <li>Si le château est accessible, attaque.</li>
          <li>Si ton couloir est sale, déblaye.</li>
          <li>Si un kit est bien placé, récupère-le.</li>
          <li>Si tu manques de ressources, vise les trous ou va au marché.</li>
          <li>Si ton château souffre, passe en défense.</li>
        </ul>
        <div class="tutorial-card">Tu es prêt. Place tes tours, observe le plateau, puis lance le siège.</div>`
    }
  ];

  let tutorialIndex = 0;

  function renderTutorial() {
    const slide = tutorialSlides[tutorialIndex];
    tutorialStepCount.textContent = (tutorialIndex + 1) + '/' + tutorialSlides.length;
    tutorialTitle.innerHTML = slide.title;
    tutorialBody.innerHTML = slide.body;
    tutorialPrev.disabled = tutorialIndex === 0;
    tutorialNext.textContent = tutorialIndex === tutorialSlides.length - 1 ? 'Jouer' : 'Suivant →';
  }

  function openTutorial() {
    tutorialIndex = 0;
    renderTutorial();
    tutorialOverlay.classList.add('show');
  }

  function closeTutorial() {
    tutorialOverlay.classList.remove('show');
  }

  tutorialPrev.onclick = () => {
    if (tutorialIndex > 0) {
      tutorialIndex--;
      renderTutorial();
    }
  };
  tutorialNext.onclick = () => {
    if (tutorialIndex < tutorialSlides.length - 1) {
      tutorialIndex++;
      renderTutorial();
    } else {
      closeTutorial();
    }
  };
  tutorialSkip.onclick = closeTutorial;
  tutorialClose.onclick = closeTutorial;
  tutorialOverlay.addEventListener('click', e => {
    if (e.target === tutorialOverlay) closeTutorial();
  });

  // Fenêtre de personnalisation : progression cosmétique uniquement.
  const customizationOverlay = document.createElement('div');
  customizationOverlay.id = 'customizationOverlay';
  customizationOverlay.innerHTML = `
    <div class="customization-box">
      <button class="customization-close" type="button">✕</button>
      <h2>🎨 Personnalisation</h2>
      <p class="customization-subtitle">Points de victoire, couleurs de bille, effets de bille et couleurs de château. Aucun bonus gameplay.</p>
      <div id="customizationContent"></div>
    </div>`;
  document.body.appendChild(customizationOverlay);
  const customizationClose = customizationOverlay.querySelector('.customization-close');
  const customizationContent = customizationOverlay.querySelector('#customizationContent');

  function renderCustomization() {
    if (!customizationContent) return;

    const playerWallets = [1, 2].map(player => {
      const pr = getPlayerProgress(player);
      return `<div class="profile-wallet"><b>J${player} · ${getProfileName(player)}</b><span>🏆 ${pr.victoryPoints || 0} pts</span><small>Score à battre : ${Math.max(SCORE_TO_BEAT_DEFAULT, pr.bestScoreToBeat || SCORE_TO_BEAT_DEFAULT)}</small></div>`;
    }).join('');

    const shopActions = (type, id, cost, unlockedFn, selectedFn) => {
      return [1, 2].map(player => {
        const pr = getPlayerProgress(player);
        const unlocked = unlockedFn(pr);
        const selected = selectedFn(player);
        if (unlocked) {
          const dataName = type === 'skin' ? 'data-select-player' : type === 'effect' ? 'data-select-effect-player' : 'data-select-castle-player';
          const dataItem = type === 'skin' ? 'data-skin' : type === 'effect' ? 'data-effect' : 'data-castle-skin';
          return `<button class="custom-select ${selected ? 'selected' : ''}" ${dataName}="${player}" ${dataItem}="${id}">J${player}${selected ? ' ✓' : ''}</button>`;
        }
        const unlockName = type === 'skin' ? 'data-unlock' : type === 'effect' ? 'data-unlock-effect' : 'data-unlock-castle';
        const unlockPlayer = type === 'skin' ? 'data-unlock-player' : type === 'effect' ? 'data-unlock-effect-player' : 'data-unlock-castle-player';
        return `<button class="custom-unlock" ${unlockName}="${id}" ${unlockPlayer}="${player}" ${pr.victoryPoints >= cost ? '' : 'disabled'}>J${player} débloquer — ${cost} pts</button>`;
      }).join('');
    };

    const skinCards = BALL_SKINS.map(skin => {
      const selectedP1 = getSelectedBallSkinId(1) === skin.id;
      const selectedP2 = getSelectedBallSkinId(2) === skin.id;
      const unlockedP1 = getPlayerProgress(1).unlockedBallSkins.includes(skin.id);
      const unlockedP2 = getPlayerProgress(2).unlockedBallSkins.includes(skin.id);
      const selectedTags = [selectedP1 ? 'J1' : '', selectedP2 ? 'J2' : ''].filter(Boolean).join(' / ');
      const skinVars = ballSkinCssVars(skin);
      const actions = shopActions('skin', skin.id, skin.cost, pr => pr.unlockedBallSkins.includes(skin.id), player => getSelectedBallSkinId(player) === skin.id);
      return `
        <div class="skin-card ${(unlockedP1 || unlockedP2) ? 'unlocked' : 'locked'} ${(selectedP1 || selectedP2) ? 'active' : ''}" style="${skinVars}">
          <div class="skin-card-preview"><span class="skin-preview-ball"></span></div>
          <div class="skin-info">
            <b>${skin.name}</b>
            <small>${selectedTags || (skin.cost === 0 ? 'Gratuit' : skin.cost + ' points de victoire')}</small>
          </div>
          <div class="skin-actions">${actions}</div>
        </div>`;
    }).join('');

    const effectCards = BALL_EFFECTS.map(effect => {
      const selectedP1 = getSelectedBallEffectId(1) === effect.id;
      const selectedP2 = getSelectedBallEffectId(2) === effect.id;
      const unlockedP1 = getPlayerProgress(1).unlockedBallEffects.includes(effect.id);
      const unlockedP2 = getPlayerProgress(2).unlockedBallEffects.includes(effect.id);
      const selectedTags = [selectedP1 ? 'J1' : '', selectedP2 ? 'J2' : ''].filter(Boolean).join(' / ');
      const effectVars = ballEffectCssVars(effect);
      const actions = shopActions('effect', effect.id, effect.cost, pr => pr.unlockedBallEffects.includes(effect.id), player => getSelectedBallEffectId(player) === effect.id);
      return `
        <div class="skin-card effect-card ${(unlockedP1 || unlockedP2) ? 'unlocked' : 'locked'} ${(selectedP1 || selectedP2) ? 'active' : ''}" style="${effectVars}">
          <div class="skin-card-preview effect-preview ${effect.id === 'pulse' ? 'effect-preview-pulse' : ''}"><span class="skin-preview-ball ${effect.id === 'pulse' ? 'effect-pulse-ball' : ''}"></span></div>
          <div class="skin-info">
            <b>${effect.name}</b>
            <small>${selectedTags || (effect.cost === 0 ? 'Gratuit' : effect.cost + ' points de victoire')}</small>
            <em>${effect.description || ''}</em>
          </div>
          <div class="skin-actions">${actions}</div>
        </div>`;
    }).join('');

    const castleCards = CASTLE_SKINS.map(skin => {
      const selectedP1 = getSelectedCastleSkinId(1) === skin.id;
      const selectedP2 = getSelectedCastleSkinId(2) === skin.id;
      const unlockedP1 = getPlayerProgress(1).unlockedCastleSkins.includes(skin.id);
      const unlockedP2 = getPlayerProgress(2).unlockedCastleSkins.includes(skin.id);
      const selectedTags = [selectedP1 ? 'J1' : '', selectedP2 ? 'J2' : ''].filter(Boolean).join(' / ');
      const skinVars = castleSkinCssVars(skin);
      const actions = shopActions('castle', skin.id, skin.cost, pr => pr.unlockedCastleSkins.includes(skin.id), player => getSelectedCastleSkinId(player) === skin.id);
      return `
        <div class="skin-card castle-card ${(unlockedP1 || unlockedP2) ? 'unlocked' : 'locked'} ${(selectedP1 || selectedP2) ? 'active' : ''}" style="${skinVars}">
          <div class="skin-card-preview castle-preview">
            <span class="skin-preview-castle-real" aria-hidden="true">
              <span class="castle-piece castle-wall castle-wall-back"></span>
              <span class="castle-piece castle-wall castle-wall-left"></span>
              <span class="castle-piece castle-wall castle-wall-right"></span>
              <span class="castle-piece castle-wall castle-wall-front"></span>
              <span class="castle-piece castle-tower castle-tower-back-left"></span>
              <span class="castle-piece castle-tower castle-tower-back-right"></span>
              <span class="castle-piece castle-tower castle-tower-front-left"></span>
              <span class="castle-piece castle-tower castle-tower-front-right"></span>
              <span class="castle-piece castle-keep"></span>
            </span>
          </div>
          <div class="skin-info">
            <b>${skin.name}</b>
            <small>${selectedTags || (skin.cost === 0 ? 'Gratuit' : skin.cost + ' points de victoire')}</small>
          </div>
          <div class="skin-actions">${actions}</div>
        </div>`;
    }).join('');

    customizationContent.innerHTML = `
      <div class="profile-wallet-grid">${playerWallets}</div>
      <div class="scoreboard-panel">
        <h3>Tableau de score</h3>
        <div class="scoreboard-row"><span>J1 ${getProfileName(1)}</span><b>${Math.max(SCORE_TO_BEAT_DEFAULT, getPlayerProgress(1).bestScoreToBeat || SCORE_TO_BEAT_DEFAULT)} pts</b></div>
        <div class="scoreboard-row"><span>J2 ${getProfileName(2)}</span><b>${Math.max(SCORE_TO_BEAT_DEFAULT, getPlayerProgress(2).bestScoreToBeat || SCORE_TO_BEAT_DEFAULT)} pts</b></div>
        <small>Le bonus record est ajouté aux points gagnés du profil concerné, mais il ne compte pas dans le nouveau score à battre.</small>
      </div>
      <div class="custom-note">Les personnalisations sont propres à chaque profil. Elles changent uniquement l’apparence : couleurs, châteaux et effets visuels. Même vitesse, même puissance, même physique.</div>
      <div class="skin-table-title">
        <b>Couleurs de bille</b>
        <small>Chaque profil débloque ses propres couleurs.</small>
      </div>
      <div class="skin-grid">${skinCards}</div>
      <div class="skin-table-title effect-section-title">
        <b>Effets visuels de bille</b>
        <small>Effets purement cosmétiques. Aucun impact sur la trajectoire.</small>
      </div>
      <div class="skin-grid effect-grid">${effectCards}</div>
      <div class="skin-table-title castle-section-title">
        <b>Couleurs de château</b>
        <small>Modifie les murs, toits, fanions et tours de défense.</small>
      </div>
      <div class="skin-grid castle-grid">${castleCards}</div>`;

    customizationContent.querySelectorAll('[data-unlock]').forEach(btn => {
      btn.onclick = () => unlockBallSkin(btn.dataset.unlock, Number(btn.dataset.unlockPlayer || active));
    });
    customizationContent.querySelectorAll('[data-select-player]').forEach(btn => {
      btn.onclick = () => setSelectedBallSkin(Number(btn.dataset.selectPlayer), btn.dataset.skin);
    });
    customizationContent.querySelectorAll('[data-unlock-effect]').forEach(btn => {
      btn.onclick = () => unlockBallEffect(btn.dataset.unlockEffect, Number(btn.dataset.unlockEffectPlayer || active));
    });
    customizationContent.querySelectorAll('[data-select-effect-player]').forEach(btn => {
      btn.onclick = () => setSelectedBallEffect(Number(btn.dataset.selectEffectPlayer), btn.dataset.effect);
    });
    customizationContent.querySelectorAll('[data-unlock-castle]').forEach(btn => {
      btn.onclick = () => unlockCastleSkin(btn.dataset.unlockCastle, Number(btn.dataset.unlockCastlePlayer || active));
    });
    customizationContent.querySelectorAll('[data-select-castle-player]').forEach(btn => {
      btn.onclick = () => setSelectedCastleSkin(Number(btn.dataset.selectCastlePlayer), btn.dataset.castleSkin);
    });
  }

  function openCustomization() {
    closeProgression();
    closeProfiles();
    renderCustomization();
    customizationOverlay.classList.add('show');
  }

  function closeCustomization() {
    customizationOverlay.classList.remove('show');
  }

  customizationClose.onclick = closeCustomization;
  customizationOverlay.addEventListener('click', e => {
    if (e.target === customizationOverlay) closeCustomization();
  });

  // Menu progression : affiche les objectifs qui rapportent des points de victoire.
  const progressionOverlay = document.createElement('div');
  progressionOverlay.id = 'progressionOverlay';
  progressionOverlay.innerHTML = `
    <div class="progression-box">
      <button class="progression-close" type="button">✕</button>
      <h2>🏆 Progression</h2>
      <p class="progression-subtitle">Objectifs de fin de partie et paliers de points de victoire.</p>
      <div id="progressionContent"></div>
    </div>`;
  document.body.appendChild(progressionOverlay);
  const progressionClose = progressionOverlay.querySelector('.progression-close');
  const progressionContent = progressionOverlay.querySelector('#progressionContent');

  function progressionUnitLabel(objective, threshold) {
    if (objective.id === 'fastWin') return threshold + ' manches ou moins';
    if (objective.id === 'damage') return threshold + ' PV retirés';
    if (objective.id === 'structures') return threshold + (threshold > 1 ? ' éléments détruits' : ' élément détruit');
    if (objective.id === 'combos') return threshold + (threshold > 1 ? ' combos' : ' combo');
    if (objective.id === 'resources') return threshold + ' ressources gagnées';
    if (objective.id === 'holes') return threshold + (threshold > 1 ? ' trous atteints' : ' trou atteint');
    if (objective.id === 'edge') return threshold + (threshold > 1 ? ' pillages / vols' : ' pillage / vol');
    if (objective.id === 'relics') return threshold + (threshold > 1 ? ' reliques trouvées' : ' relique trouvée');
    if (objective.id === 'second') return threshold + (threshold > 1 ? ' seconds lancers' : ' second lancer');
    return String(threshold);
  }

  function renderProgression() {
    if (!progressionContent) return;
    const objectiveCards = VP_OBJECTIVES.map(objective => {
      const rows = objective.thresholds.map(([threshold, reward]) => `
        <li>
          <span>${progressionUnitLabel(objective, threshold)}</span>
          <b>+${reward}</b>
        </li>`).join('');
      return `
        <div class="objective-card">
          <h3>${objective.label}</h3>
          <ul>${rows}</ul>
        </div>`;
    }).join('');

    const progressionWallets = [1, 2].map(player => {
      const pr = getPlayerProgress(player);
      return `<div class="profile-wallet"><b>J${player} · ${getProfileName(player)}</b><span>🏆 ${pr.victoryPoints || 0} pts</span><small>${pr.lifetimeEarned || 0} gagnés · score à battre ${Math.max(SCORE_TO_BEAT_DEFAULT, pr.bestScoreToBeat || SCORE_TO_BEAT_DEFAULT)}</small></div>`;
    }).join('');

    progressionContent.innerHTML = `
      <div class="profile-wallet-grid">${progressionWallets}</div>
      <div class="progression-rule">
        Les points sont calculés à la fin de la partie avec les statistiques du récapitulatif. Dans chaque catégorie, seul le meilleur palier atteint rapporte des points : les anciens paliers ne se cumulent pas. La victoire rapide récompense uniquement le vainqueur si la partie se termine en peu de manches. Pour les structures, seules les tours et pièces de château comptent ; les rampes détruites par usure sont exclues. Ces points servent uniquement à acheter des cosmétiques.
      </div>
      <div class="progression-reset-panel">
        <span>Remise à zéro pour les tests : points, cosmétiques et score à battre des profils actifs J1/J2.</span>
        <button id="resetProgressionBtn" type="button">Réinitialiser la progression</button>
      </div>
      <div class="objective-grid">
        <div class="objective-card win-bonus">
          <h3>Victoire finale</h3>
          <ul>
            <li><span>Détruire le château adverse</span><b>+${VICTORY_POINT_WIN_BONUS}</b></li>
          </ul>
        </div>
        <div class="objective-card fast-bonus">
          <h3>${FAST_VICTORY_OBJECTIVE.label}</h3>
          <ul>
            ${FAST_VICTORY_OBJECTIVE.thresholds.map(([threshold, reward]) => `<li><span>${progressionUnitLabel(FAST_VICTORY_OBJECTIVE, threshold)}</span><b>+${reward}</b></li>`).join('')}
          </ul>
        </div>
        ${objectiveCards}
      </div>`;

    const resetProgressionBtn = progressionContent.querySelector('#resetProgressionBtn');
    if (resetProgressionBtn) resetProgressionBtn.onclick = resetProgressionData;
  }

  function openProgression() {
    closeCustomization();
    closeProfiles();
    renderProgression();
    progressionOverlay.classList.add('show');
  }

  function closeProgression() {
    progressionOverlay.classList.remove('show');
  }

  progressionClose.onclick = closeProgression;
  progressionOverlay.addEventListener('click', e => {
    if (e.target === progressionOverlay) closeProgression();
  });

  // Menu profils : chaque pseudo possède sa propre progression et ses propres cosmétiques.
  const profilesOverlay = document.createElement('div');
  profilesOverlay.id = 'profilesOverlay';
  profilesOverlay.innerHTML = `
    <div class="profiles-box">
      <button class="profiles-close" type="button">✕</button>
      <h2>👤 Profils joueurs</h2>
      <p class="profiles-subtitle">Choisis le profil utilisé par J1 et J2. Chaque profil garde ses propres points, skins et score à battre.</p>
      <div id="profilesContent"></div>
    </div>`;
  document.body.appendChild(profilesOverlay);
  const profilesClose = profilesOverlay.querySelector('.profiles-close');
  const profilesContent = profilesOverlay.querySelector('#profilesContent');
  let selectedCreateAvatar = DEFAULT_PROFILE_AVATAR;

  function profileSummary(profile) {
    const pr = profile.progress || defaultProgress();
    return `${pr.victoryPoints || 0} pts · record ${Math.max(SCORE_TO_BEAT_DEFAULT, pr.bestScoreToBeat || SCORE_TO_BEAT_DEFAULT)}`;
  }

  function renderProfiles() {
    if (!profilesContent) return;
    const profiles = getProfilesArray();
    const options = profiles.map(profile => `<option value="${profile.id}">${profile.name} — ${profileSummary(profile)}</option>`).join('');
    const profileCards = profiles.map(profile => {
      const activeJ1 = profileState.activeSlots['1'] === profile.id;
      const activeJ2 = profileState.activeSlots['2'] === profile.id;
      const pr = profile.progress || defaultProgress();
      const avatar = profileAvatarData(profile.avatar);
      const title = profileTitleData(pr);
      return `
        <div class="profile-card ${(activeJ1 || activeJ2) ? 'active' : ''}">
          <div class="profile-main-line">
            <b><span class="profile-avatar-pill" title="${avatar.label}">${avatar.icon}</span>${profile.name}</b>
            <span>${activeJ1 ? 'J1' : ''}${activeJ1 && activeJ2 ? ' / ' : ''}${activeJ2 ? 'J2' : ''}</span>
          </div>
          <div class="profile-title-badge"><span>${title.icon}</span><b>${title.label}</b></div>
          <small>${pr.victoryPoints || 0} points disponibles · ${pr.lifetimeEarned || 0} gagnés · score à battre ${Math.max(SCORE_TO_BEAT_DEFAULT, pr.bestScoreToBeat || SCORE_TO_BEAT_DEFAULT)}</small>
          <div class="profile-actions">
            <button data-profile-j1="${profile.id}" ${activeJ1 ? 'class="selected"' : ''}>J1</button>
            <button data-profile-j2="${profile.id}" ${activeJ2 ? 'class="selected"' : ''}>J2</button>
            <button data-profile-rename="${profile.id}">Renommer</button>
            <button data-profile-delete="${profile.id}">Supprimer</button>
          </div>
        </div>`;
    }).join('');

    profilesContent.innerHTML = `
      <div class="profile-active-grid">
        <label>Profil Joueur 1
          <select id="profileSelectJ1">${options}</select>
        </label>
        <label>Profil Joueur 2
          <select id="profileSelectJ2">${options}</select>
        </label>
      </div>
      <div class="profile-create-row">
        <input id="profileCreateName" maxlength="18" placeholder="Nouveau pseudo" />
        <button id="profileCreateBtn" type="button">Créer</button>
      </div>
      <div class="profile-avatar-create" aria-label="Choix avatar du nouveau profil">
        ${PROFILE_AVATARS.map(a => `<button type="button" class="profile-avatar-choice ${a.id === selectedCreateAvatar ? 'selected' : ''}" data-create-avatar="${a.id}" title="${a.label}"><span>${a.icon}</span><small>${a.label}</small></button>`).join('')}
      </div>
      <div class="profile-list">${profileCards}</div>`;

    const selectJ1 = profilesContent.querySelector('#profileSelectJ1');
    const selectJ2 = profilesContent.querySelector('#profileSelectJ2');
    if (selectJ1) {
      selectJ1.value = profileState.activeSlots['1'];
      selectJ1.onchange = () => selectProfileForPlayer(1, selectJ1.value);
    }
    if (selectJ2) {
      selectJ2.value = profileState.activeSlots['2'];
      selectJ2.onchange = () => selectProfileForPlayer(2, selectJ2.value);
    }

    profilesContent.querySelectorAll('[data-create-avatar]').forEach(btn => {
      btn.onclick = () => {
        selectedCreateAvatar = normalizeProfileAvatar(btn.dataset.createAvatar);
        renderProfiles();
      };
    });

    const createInput = profilesContent.querySelector('#profileCreateName');
    const createBtn = profilesContent.querySelector('#profileCreateBtn');
    if (createBtn) createBtn.onclick = () => {
      const name = cleanProfileName(createInput ? createInput.value : '');
      if (!name) return;
      const profile = createPlayerProfile(name, selectedCreateAvatar);
      if (createInput) createInput.value = '';
      selectProfileForPlayer(1, profile.id);
    };

    profilesContent.querySelectorAll('[data-profile-j1]').forEach(btn => btn.onclick = () => selectProfileForPlayer(1, btn.dataset.profileJ1));
    profilesContent.querySelectorAll('[data-profile-j2]').forEach(btn => btn.onclick = () => selectProfileForPlayer(2, btn.dataset.profileJ2));
    profilesContent.querySelectorAll('[data-profile-rename]').forEach(btn => btn.onclick = () => renamePlayerProfile(btn.dataset.profileRename));
    profilesContent.querySelectorAll('[data-profile-delete]').forEach(btn => btn.onclick = () => deletePlayerProfile(btn.dataset.profileDelete));
  }

  function openProfiles() {
    closeCustomization();
    closeProgression();
    renderProfiles();
    profilesOverlay.classList.add('show');
  }

  function closeProfiles() {
    profilesOverlay.classList.remove('show');
  }

  profilesClose.onclick = closeProfiles;
  profilesOverlay.addEventListener('click', e => {
    if (e.target === profilesOverlay) closeProfiles();
  });

  // Menu principal + menu pause. Les boutons de mode relancent proprement la page
  // pour éviter les régressions d'état après une partie commencée.
  const mainMenuOverlay = document.createElement('div');
  mainMenuOverlay.id = 'mainMenuOverlay';
  mainMenuOverlay.innerHTML = `
    <div class="main-menu-box">
      <img class="main-bds-logo" src="logo-bds-512.png" alt="Logo BDS" />
      <h2>Bille de Siège</h2>
      <p class="menu-subtitle" id="mainMenuSubtitle">Choisis ton mode de jeu</p>
      <div class="main-progress-badge" id="mainProgressBadge"></div>

      <div id="mainHomePanel" class="main-menu-screen active">
        <div class="main-menu-actions">
          <button id="mainResume" class="resume" type="button">▶ Reprendre</button>
          <button id="mainSolo" class="primary" type="button">🤖 1 joueur — contre l'IA</button>
          <button id="mainDuo" type="button">👥 2 joueurs — duel local</button>
          <div class="menu-line"></div>
          <button id="mainSettings" type="button">⚙️ Paramètres de jeu</button>
          <button id="mainTutorial" type="button">📘 Tutoriel</button>
          <button id="mainProfiles" type="button">👤 Profils joueurs</button>
          <button id="mainProgression" type="button">🏆 Progression</button>
          <button id="mainCustomize" type="button">🎨 Personnalisation</button>
        </div>
      </div>

      <div id="mainDifficultyPanel" class="main-menu-screen">
        <div class="difficulty-panel">
          <strong id="mainDifficultyTitle">⚔️ Choix de difficulté</strong>
          <small id="mainSelectedModeInfo">Choisis d'abord un mode de jeu.</small>
          <div class="difficulty-buttons">
            <button id="difficultyEasy" type="button" data-difficulty="easy">Facile</button>
            <button id="difficultyMedium" type="button" data-difficulty="medium">Moyen</button>
            <button id="difficultyHard" type="button" data-difficulty="hard">Difficile</button>
          </div>
          <small id="mainDifficultyInfo"></small>
        </div>
        <button id="mainBackDifficulty" class="menu-back-button" type="button">← Retour au menu</button>
      </div>

      <div id="mainSettingsPanel" class="main-menu-screen">
        <div id="musicPanel" class="music-panel audio-options-panel">
          <strong>🎵 Musiques & sons</strong>
          <div class="music-buttons">
            <button id="mainSfx" type="button">🔊 Sons activés</button>
            <button id="mainMusic" type="button">▶ Musique</button>
          </div>
          <div class="audio-volume-options" aria-label="Options audio">
            <div class="volume-row">
              <label for="mainMenuMusicVolume">Musique menu <b id="mainMenuMusicVolumeValue">25%</b></label>
              <input id="mainMenuMusicVolume" type="range" min="0" max="100" step="1" value="25" />
            </div>
            <div class="volume-row">
              <label for="mainGameMusicVolume">Musique partie <b id="mainGameMusicVolumeValue">25%</b></label>
              <input id="mainGameMusicVolume" type="range" min="0" max="100" step="1" value="25" />
            </div>
            <div class="volume-row">
              <label for="mainMarketMusicVolume">Musique marché <b id="mainMarketMusicVolumeValue">25%</b></label>
              <input id="mainMarketMusicVolume" type="range" min="0" max="100" step="1" value="25" />
            </div>
            <div class="volume-row">
              <label for="mainSfxVolume">Bruitages <b id="mainSfxVolumeValue">100%</b></label>
              <input id="mainSfxVolume" type="range" min="0" max="100" step="1" value="100" />
            </div>
          </div>
          <small id="musicStatus">Audio prêt.</small>
        </div>
        <button id="mainBackSettings" class="menu-back-button" type="button">← Retour au menu</button>
      </div>

      <p class="main-menu-note">En pause, le chrono et la physique sont arrêtés.</p>
    </div>`;
  document.body.appendChild(mainMenuOverlay);
  const mainResume = mainMenuOverlay.querySelector('#mainResume');
  const mainSolo = mainMenuOverlay.querySelector('#mainSolo');
  const mainDuo = mainMenuOverlay.querySelector('#mainDuo');
  const mainTutorial = mainMenuOverlay.querySelector('#mainTutorial');
  const mainProfiles = mainMenuOverlay.querySelector('#mainProfiles');
  const mainProgression = mainMenuOverlay.querySelector('#mainProgression');
  const mainCustomize = mainMenuOverlay.querySelector('#mainCustomize');
  const mainSettings = mainMenuOverlay.querySelector('#mainSettings');
  const mainBackDifficulty = mainMenuOverlay.querySelector('#mainBackDifficulty');
  const mainBackSettings = mainMenuOverlay.querySelector('#mainBackSettings');
  const mainHomePanel = mainMenuOverlay.querySelector('#mainHomePanel');
  const mainDifficultyPanel = mainMenuOverlay.querySelector('#mainDifficultyPanel');
  const mainSettingsPanel = mainMenuOverlay.querySelector('#mainSettingsPanel');
  const mainMenuSubtitle = mainMenuOverlay.querySelector('#mainMenuSubtitle');
  const mainProgressBadge = mainMenuOverlay.querySelector('#mainProgressBadge');
  const mainSelectedModeInfo = mainMenuOverlay.querySelector('#mainSelectedModeInfo');
  const mainDifficultyInfo = mainMenuOverlay.querySelector('#mainDifficultyInfo');
  const difficultyButtons = Array.from(mainMenuOverlay.querySelectorAll('[data-difficulty]'));
  let pendingDifficultyMode = null;

  function setMainMenuHomeSubtitle() {
    if (!mainMenuSubtitle) return;
    if (gameStarted && gamePaused && !gameOver) {
      mainMenuSubtitle.textContent = 'Jeu en pause';
    } else if (gameOver) {
      mainMenuSubtitle.textContent = 'Partie terminée — choisis un mode de jeu';
    } else {
      mainMenuSubtitle.textContent = 'Choisis ton mode de jeu';
    }
  }

  function showMainMenuScreen(screen) {
    const screens = [mainHomePanel, mainDifficultyPanel, mainSettingsPanel];
    screens.forEach(panel => {
      if (panel) panel.classList.toggle('active', panel === screen);
    });
  }

  function showMainMenuHome() {
    pendingDifficultyMode = null;
    showMainMenuScreen(mainHomePanel);
    setMainMenuHomeSubtitle();
    updateDifficultyMenu();
  }

  function showDifficultyChoice(mode) {
    pendingDifficultyMode = mode === 'solo' ? 'solo' : 'duo';
    showMainMenuScreen(mainDifficultyPanel);
    if (mainMenuSubtitle) {
      mainMenuSubtitle.textContent = pendingDifficultyMode === 'solo'
        ? '1 joueur — choisis la difficulté'
        : '2 joueurs — choisis la difficulté';
    }
    updateDifficultyMenu();
  }

  function showGameSettings() {
    pendingDifficultyMode = null;
    showMainMenuScreen(mainSettingsPanel);
    if (mainMenuSubtitle) mainMenuSubtitle.textContent = 'Paramètres de jeu';
    updateVolumeUI();
    updateMusicUI();
  }

  function updateMainMenuProgress() {
    if (!mainProgressBadge) return;
    const p1 = getPlayerProgress(1);
    const p2 = getPlayerProgress(2);
    mainProgressBadge.innerHTML = '👤 J1 ' + getProfileName(1) + ' : 🏆 ' + (p1.victoryPoints || 0) + ' pts · record ' + Math.max(SCORE_TO_BEAT_DEFAULT, p1.bestScoreToBeat || SCORE_TO_BEAT_DEFAULT) + '<br>' +
      '👤 J2 ' + getProfileName(2) + ' : 🏆 ' + (p2.victoryPoints || 0) + ' pts · record ' + Math.max(SCORE_TO_BEAT_DEFAULT, p2.bestScoreToBeat || SCORE_TO_BEAT_DEFAULT);
  }

  function updateDifficultyMenu() {
    difficultyButtons.forEach(btn => {
      const selected = btn.dataset.difficulty === currentDifficultyId;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    if (mainSelectedModeInfo) {
      if (pendingDifficultyMode === 'solo') mainSelectedModeInfo.textContent = 'Mode choisi : 1 joueur contre IA';
      else if (pendingDifficultyMode === 'duo') mainSelectedModeInfo.textContent = 'Mode choisi : 2 joueurs en duel local';
      else mainSelectedModeInfo.textContent = 'Choisis d’abord 1 joueur ou 2 joueurs.';
    }
    if (mainDifficultyInfo) {
      const d = currentDifficulty;
      const modeForCost = pendingDifficultyMode === 'solo' ? 'solo' : (pendingDifficultyMode === 'duo' ? 'duo' : null);
      if (modeForCost) {
        const cost = d.secondBallCost[modeForCost] || d.secondBallCost.duo;
        mainDifficultyInfo.innerHTML = d.description + '<br>Seconde bille : ' + costTxt(cost);
      } else {
        const duoCost = d.secondBallCost.duo;
        const soloCost = d.secondBallCost.solo;
        mainDifficultyInfo.innerHTML = d.description + '<br>Seconde bille : duo ' + costTxt(duoCost) + ' · solo ' + costTxt(soloCost);
      }
    }
  }

  updateMainMenuProgress();
  updateDifficultyMenu();

  // Audio du jeu : 3 musiques MP3 externes + bruitages personnalisables.
  // menu   = musiques/music-bds-menu.mp3
  // partie = musiques/music-bds-ambiance.mp3
  // marché = musiques/music-bds-marche.mp3
  // Bruitages optionnels dans le dossier bruitages/ : si un fichier manque, le jeu garde le bruitage synthétique de secours.
  // Échange au marché = bruitages/marche-echange.mp3
  // Boutons/échanges du marché aléatoires = bruitages/marche-btn-1.mp3 à bruitages/marche-btn-8.mp3
  // Roulement de bille = bruitages/bille-roule.mp3
  // Tout est lancé après un vrai clic utilisateur pour respecter Android/Chrome.
  const AUDIO_PREF_KEY = 'BDS_MUSIC_ENABLED_INSTALLABLE_FINAL';
  const SFX_PREF_KEY = 'BDS_SFX_ENABLED_INSTALLABLE_FINAL';
  const MUSIC_MENU_VOLUME_KEY = 'BDS_MUSIC_MENU_VOLUME_DEFAULT_25';
  const MUSIC_GAME_VOLUME_KEY = 'BDS_MUSIC_GAME_VOLUME_DEFAULT_25';
  const MUSIC_MARKET_VOLUME_KEY = 'BDS_MUSIC_MARKET_VOLUME_DEFAULT_25';
  const SFX_VOLUME_KEY = 'BDS_SFX_VOLUME_DEFAULT_100';
  const DEFAULT_MENU_MUSIC_VOLUME = 0.05;
  const DEFAULT_GAME_MUSIC_VOLUME = 0.05;
  const DEFAULT_MARKET_MUSIC_VOLUME = 0.05;
  const DEFAULT_SFX_VOLUME = 1.00;
  let musicEnabled = localStorage.getItem(AUDIO_PREF_KEY) === '1';
  let sfxEnabled = localStorage.getItem(SFX_PREF_KEY) !== '0';
  let menuMusicVolume = readStoredVolume(MUSIC_MENU_VOLUME_KEY, DEFAULT_MENU_MUSIC_VOLUME);
  let gameMusicVolume = readStoredVolume(MUSIC_GAME_VOLUME_KEY, DEFAULT_GAME_MUSIC_VOLUME);
  let marketMusicVolume = readStoredVolume(MUSIC_MARKET_VOLUME_KEY, DEFAULT_MARKET_MUSIC_VOLUME);
  let sfxVolume = readStoredVolume(SFX_VOLUME_KEY, DEFAULT_SFX_VOLUME);
  let musicCtx = null;
  let musicMaster = null;
  let musicTimer = null;
  let musicRunning = false;
  let musicAudios = { menu: null, game: null, market: null };
  let activeMusicRole = null;
  let musicUsesFile = false;
  const MUSIC_FILES = {
    menu: 'musiques/music-bds-menu.mp3',
    game: 'musiques/music-bds-ambiance.mp3',
    market: 'musiques/music-bds-marche.mp3'
  };

  const SFX_FILES = {
    click: 'bruitages/click.mp3',
    confirm: 'bruitages/confirm.mp3',
    launch: 'bruitages/launch.mp3',
    impact: 'bruitages/impact.mp3',
    gain: 'bruitages/gain.mp3',
    jackpot: 'bruitages/jackpot.mp3',
    marketExchange: 'bruitages/marche-echange.mp3',
    ballRoll: 'bruitages/bille-roule.mp3',
    trap: 'bruitages/trap.mp3',
    damage: 'bruitages/damage.mp3',
    destroy: 'bruitages/destroy.mp3',
    build: 'bruitages/build.mp3',
    repair: 'bruitages/repair.mp3',
    victory: 'bruitages/victory.mp3',
    test: 'bruitages/test.mp3'
  };

  const SFX_VARIANTS = {
    marketButton: [
      'bruitages/marche-btn-1.mp3',
      'bruitages/marche-btn-2.mp3',
      'bruitages/marche-btn-3.mp3',
      'bruitages/marche-btn-4.mp3',
      'bruitages/marche-btn-5.mp3',
      'bruitages/marche-btn-6.mp3',
      'bruitages/marche-btn-7.mp3',
      'bruitages/marche-btn-8.mp3'
    ],
    victory: [
      'bruitages/victory.mp3',
      'bruitages/victory-1.mp3',
      'bruitages/victory-2.mp3',
      'bruitages/victory-3.mp3',
      'bruitages/victoire.mp3',
      'bruitages/victoire-1.mp3',
      'bruitages/victoire-2.mp3',
      'bruitages/victoire-3.mp3'
    ],
    gainWood: [
      'bruitages/gain-bois-1.mp3',
      'bruitages/gain-bois-2.mp3',
      'bruitages/gain-bois-3.mp3'
    ],
    gainStone: [
      'bruitages/gain-pierre-1.mp3',
      'bruitages/gain-pierre-2.mp3',
      'bruitages/gain-pierre-3.mp3'
    ],
    gainGold: [
      'bruitages/gain-or-1.mp3',
      'bruitages/gain-or-2.mp3',
      'bruitages/gain-or-3.mp3'
    ],
    combo: [
      'bruitages/combo-1.mp3',
      'bruitages/combo-2.mp3',
      'bruitages/combo-3.mp3'
    ],
    lineComplete: [
      'bruitages/ligne-complete-1.mp3',
      'bruitages/ligne-complete-2.mp3',
      'bruitages/ligne-complete-3.mp3'
    ],
    relic: [
      'bruitages/relique-1.mp3',
      'bruitages/relique-2.mp3'
    ],
    event: [
      'bruitages/evenement-1.mp3',
      'bruitages/evenement-2.mp3'
    ],
    impactStone: [
      'bruitages/impact-pierre-1.mp3',
      'bruitages/impact-pierre-2.mp3',
      'bruitages/impact-pierre-3.mp3'
    ]
  };

  const VICTORY_AUDIO_FILES = [
    'musiques/music-bds-victory.mp3',
    'musiques/music-bds-victoire.mp3',
    'bruitages/victory.mp3',
    'bruitages/victory-1.mp3',
    'bruitages/victory-2.mp3',
    'bruitages/victory-3.mp3',
    'bruitages/victoire.mp3',
    'bruitages/victoire-1.mp3',
    'bruitages/victoire-2.mp3',
    'bruitages/victoire-3.mp3'
  ];
  let victoryAudio = null;

  // Réglage individuel du volume de chaque bruitage.
  // 1.00 = volume normal, 0.50 = moitié moins fort, 1.25 = un peu plus fort.
  // Pour équilibrer tes sons du marché, modifie surtout les lignes marketButton.1 à marketButton.8.
  // Important : les bruitages de secours synthétiques restent actifs.
  // Si un MP3 personnalisé est absent ou impossible à lire, le jeu garde un son par défaut.
  // Les limites anti-spam ci-dessous évitent les grosses superpositions de sons.
  const AUDIO_SYNTH_FALLBACK_ENABLED = true;
  const MUSIC_SYNTH_FALLBACK_ENABLED = false;
  const SFX_VOLUME_MULTIPLIERS = {
    click: 0.70,
    confirm: 0.85,
    launch: 0.85,
    impact: 0.75,
    gain: 0.80,
    jackpot: 0.75,
    marketExchange: 0.70,
    ballRoll: 1.00,
    trap: 0.80,
    damage: 0.10,
    destroy: 0.20,
    build: 0.80,
    repair: 0.80,
    victory: 0.75,
    test: 0.70,

    // Sons aléatoires des boutons / échanges du marché :
    'marketButton.1': 0.70,
    'marketButton.2': 0.70,
    'marketButton.3': 0.70,
    'marketButton.4': 0.70,
    'marketButton.5': 0.70,
    'marketButton.6': 0.70,
    'marketButton.7': 0.70,
    'marketButton.8': 0.70,

    gainWood: 0.82,
    gainStone: 0.82,
    gainGold: 0.88,
    combo: 0.82,
    'victory.1': 0.90,
    'victory.2': 0.90,
    'victory.3': 0.90,
    'victory.4': 0.90,
    'victory.5': 0.90,
    'victory.6': 0.90,
    'victory.7': 0.90,
    'victory.8': 0.90
  };

  function getSfxMultiplier(kind) {
    const value = SFX_VOLUME_MULTIPLIERS[kind];
    return Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
  }

  function getSfxVariantMultiplier(group, index) {
    const specific = SFX_VOLUME_MULTIPLIERS[group + '.' + (index + 1)];
    if (Number.isFinite(specific)) return Math.max(0, Math.min(2, specific));
    const groupValue = SFX_VOLUME_MULTIPLIERS[group];
    return Number.isFinite(groupValue) ? Math.max(0, Math.min(2, groupValue)) : 1;
  };

  const sfxAudios = Object.create(null);
  const sfxFileUnavailable = Object.create(null);
  const sfxVariantAudios = Object.create(null);
  const sfxVariantUnavailable = Object.create(null);
  let rollingAudio = null;
  let rollingFileUnavailable = false;
  let rollingSynthSource = null;
  let rollingSynthGain = null;
  let rollingSynthFilter = null;
  let rollingCurrentVolume = 0;

  function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
  }

  function readStoredVolume(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') return fallback;
    return clamp01(parseFloat(raw));
  }

  function pct(value) {
    return Math.round(clamp01(value) * 100) + '%';
  }

  const mainMusic = mainMenuOverlay.querySelector('#mainMusic');
  const mainSfx = mainMenuOverlay.querySelector('#mainSfx');
  const mainMenuMusicVolume = mainMenuOverlay.querySelector('#mainMenuMusicVolume');
  const mainGameMusicVolume = mainMenuOverlay.querySelector('#mainGameMusicVolume');
  const mainMarketMusicVolume = mainMenuOverlay.querySelector('#mainMarketMusicVolume');
  const mainSfxVolume = mainMenuOverlay.querySelector('#mainSfxVolume');
  const mainMenuMusicVolumeValue = mainMenuOverlay.querySelector('#mainMenuMusicVolumeValue');
  const mainGameMusicVolumeValue = mainMenuOverlay.querySelector('#mainGameMusicVolumeValue');
  const mainMarketMusicVolumeValue = mainMenuOverlay.querySelector('#mainMarketMusicVolumeValue');
  const mainSfxVolumeValue = mainMenuOverlay.querySelector('#mainSfxVolumeValue');
  const musicPanel = mainMenuOverlay.querySelector('#musicPanel');
  const musicStatus = mainMenuOverlay.querySelector('#musicStatus');

  function setMusicStatus(text) {
    if (musicStatus) musicStatus.textContent = text;
  }

  function getMusicVolume(role) {
    if (role === 'menu') return menuMusicVolume;
    if (role === 'market') return marketMusicVolume;
    return gameMusicVolume;
  }

  function applyAudioVolumes() {
    if (musicAudios.menu) musicAudios.menu.volume = getMusicVolume('menu');
    if (musicAudios.game) musicAudios.game.volume = getMusicVolume('game');
    if (musicAudios.market) musicAudios.market.volume = getMusicVolume('market');
    if (musicMaster && musicRunning && !musicUsesFile) {
      musicMaster.gain.value = Math.max(0.02, getMusicVolume(activeMusicRole || getDesiredMusicRole()) * 1.25);
    }
  }

  function updateVolumeUI() {
    if (mainMenuMusicVolume) mainMenuMusicVolume.value = Math.round(menuMusicVolume * 100);
    if (mainGameMusicVolume) mainGameMusicVolume.value = Math.round(gameMusicVolume * 100);
    if (mainMarketMusicVolume) mainMarketMusicVolume.value = Math.round(marketMusicVolume * 100);
    if (mainSfxVolume) mainSfxVolume.value = Math.round(sfxVolume * 100);
    if (mainMenuMusicVolumeValue) mainMenuMusicVolumeValue.textContent = pct(menuMusicVolume);
    if (mainGameMusicVolumeValue) mainGameMusicVolumeValue.textContent = pct(gameMusicVolume);
    if (mainMarketMusicVolumeValue) mainMarketMusicVolumeValue.textContent = pct(marketMusicVolume);
    if (mainSfxVolumeValue) mainSfxVolumeValue.textContent = pct(sfxVolume);
  }

  function bindVolumeSlider(input, key, setter, label) {
    if (!input) return;
    input.addEventListener('input', (event) => {
      const value = clamp01(Number(event.target.value) / 100);
      setter(value);
      localStorage.setItem(key, String(value));
      updateVolumeUI();
      applyAudioVolumes();
      setMusicStatus(label + ' : ' + pct(value));
    }, true);
    input.addEventListener('change', () => {
      if (label === 'Bruitages' && sfxEnabled) playSfx('test', 0.75, true);
    }, true);
  }

  function getMusicContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setMusicStatus('Audio non compatible avec ce navigateur.');
      return null;
    }
    if (!musicCtx) musicCtx = new AudioContextClass();
    return musicCtx;
  }

  function updateMusicUI() {
    if (musicPanel) musicPanel.classList.toggle('music-playing', musicRunning);
    if (mainMusic) {
      if (musicRunning) {
        mainMusic.textContent = activeMusicRole === 'menu' ? '⏸ Musique menu' : (activeMusicRole === 'market' ? '⏸ Musique marché' : '⏸ Musique partie');
        mainMusic.classList.remove('music-off');
      } else {
        mainMusic.textContent = '▶ Musique';
        mainMusic.classList.toggle('music-off', !musicEnabled);
      }
    }
    updateSfxUI();
  }

  function updateSfxUI() {
    if (!mainSfx) return;
    mainSfx.textContent = sfxEnabled ? '🔊 Sons activés' : '🔇 Sons coupés';
    mainSfx.classList.toggle('music-off', !sfxEnabled);
  }

  async function unlockAudio(event) {
    const ctx = getMusicContext();
    if (!ctx) return null;
    try { await ctx.resume(); } catch (e) {}
    preloadSfxFiles();
    return ctx;
  }

  const sfxLast = Object.create(null);

  function getSfxAudio(kind) {
    if (!SFX_FILES[kind] || sfxFileUnavailable[kind]) return null;
    if (!sfxAudios[kind]) {
      const audio = new Audio(SFX_FILES[kind]);
      audio.preload = 'auto';
      audio.addEventListener('error', () => {
        sfxFileUnavailable[kind] = true;
      }, { once: true });
      sfxAudios[kind] = audio;
      try { audio.load(); } catch (e) {}
    }
    return sfxAudios[kind];
  }

  function getSfxVariantAudio(group, index) {
    const list = SFX_VARIANTS[group];
    if (!Array.isArray(list) || !list[index]) return null;
    const url = list[index];
    const key = group + ':' + index;
    if (sfxVariantUnavailable[key]) return null;
    if (!sfxVariantAudios[key]) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.addEventListener('error', () => {
        sfxVariantUnavailable[key] = true;
      }, { once: true });
      sfxVariantAudios[key] = audio;
      try { audio.load(); } catch (e) {}
    }
    return sfxVariantAudios[key];
  }

  function preloadSfxFiles() {
    Object.keys(SFX_FILES).forEach(kind => getSfxAudio(kind));
    Object.keys(SFX_VARIANTS).forEach(group => {
      const list = SFX_VARIANTS[group] || [];
      list.forEach((_, index) => getSfxVariantAudio(group, index));
    });
  }

  function tryPlayRandomFileSfx(group, intensity = 1) {
    const list = SFX_VARIANTS[group];
    if (!Array.isArray(list) || !list.length) return false;
    const order = list.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    for (const index of order) {
      const key = group + ':' + index;
      if (sfxVariantUnavailable[key]) continue;
      const base = getSfxVariantAudio(group, index);
      if (!base || sfxVariantUnavailable[key]) continue;
      if (base.readyState < 2) {
        try { base.load(); } catch (e) {}
        continue;
      }
      try {
        const audio = base.cloneNode(true);
        audio.volume = clamp01(Math.min(1, (0.52 + intensity * 0.13) * sfxVolume * getSfxVariantMultiplier(group, index)));
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return true;
      } catch (e) {}
    }
    return false;
  }

  function playRandomSfx(group = 'marketButton', fallbackKind = 'marketExchange', intensity = 1, force = false) {
    if (!force && !sfxEnabled) return;

    const nowForLimit = (window.performance && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
    const limitKey = 'random:' + group;
    const gap = group === 'marketButton' ? 0.22 : 0.14;
    if (!force && sfxLast[limitKey] && nowForLimit - sfxLast[limitKey] < gap) return;
    sfxLast[limitKey] = nowForLimit;

    if (tryPlayRandomFileSfx(group, intensity)) return;
    playSfx(fallbackKind, intensity, force);
  }

  function tryPlayFileSfx(kind = 'click', intensity = 1) {
    const base = getSfxAudio(kind);
    if (!base || sfxFileUnavailable[kind]) return false;
    if (base.readyState < 2) {
      try { base.load(); } catch (e) {}
      return false;
    }
    try {
      const audio = base.cloneNode(true);
      audio.volume = clamp01(Math.min(1, (0.52 + intensity * 0.13) * sfxVolume * getSfxMultiplier(kind)));
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function playSfx(kind = 'click', intensity = 1, force = false) {
    if (!force && !sfxEnabled) return;

    const nowForLimit = (window.performance && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
    const sfxGapByKind = {
      click: 0.07,
      impact: 0.18,
      damage: 0.34,
      destroy: 0.70,
      gain: 0.16,
      jackpot: 0.24,
      marketExchange: 0.18,
      build: 0.22,
      repair: 0.22,
      trap: 0.30,
      launch: 0.18,
      victory: 0.80
    };
    const gap = sfxGapByKind[kind] || 0.12;
    if (!force && sfxLast[kind] && nowForLimit - sfxLast[kind] < gap) return;
    sfxLast[kind] = nowForLimit;

    if (tryPlayFileSfx(kind, intensity)) return;

    // Si le MP3 personnalisé n'est pas disponible, on joue le bruitage de secours.
    // Le fichier personnalisé reste prioritaire dès qu'il est chargé correctement.
    if (!AUDIO_SYNTH_FALLBACK_ENABLED) return;

    const ctx = getMusicContext();
    if (!ctx) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.min(0.95, 0.45 + intensity * 0.14) * sfxVolume * getSfxMultiplier(kind), now);
    master.connect(ctx.destination);

    function tone(freq, delay, dur, vol = 0.25, type = 'triangle', slideTo = null) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(24, slideTo), now + delay + dur);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.03);
    }

    function noise(delay, dur, vol = 0.20) {
      const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now + delay);
      gain.gain.setValueAtTime(vol, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      src.buffer = buffer;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(now + delay);
      src.stop(now + delay + dur + 0.02);
    }

    switch (kind) {
      case 'click':
        tone(520, 0, 0.055, 0.11, 'square', 360);
        break;
      case 'confirm':
        tone(520, 0, 0.08, 0.18, 'triangle');
        tone(780, 0.07, 0.11, 0.18, 'triangle');
        break;
      case 'launch':
        noise(0, 0.16, 0.12);
        tone(180, 0, 0.22, 0.13, 'sawtooth', 620);
        break;
      case 'impact':
        noise(0, 0.10 + intensity * 0.025, 0.11 + intensity * 0.035);
        tone(120 + intensity * 22, 0, 0.10, 0.10, 'sine', 70);
        break;
      case 'gain':
        tone(660, 0, 0.08, 0.18, 'triangle');
        tone(880, 0.08, 0.10, 0.20, 'triangle');
        tone(1180, 0.18, 0.12, 0.18, 'triangle');
        break;
      case 'jackpot':
        tone(660, 0, 0.09, 0.20, 'triangle');
        tone(880, 0.08, 0.10, 0.22, 'triangle');
        tone(1180, 0.17, 0.12, 0.24, 'triangle');
        tone(1560, 0.30, 0.18, 0.22, 'triangle');
        break;
      case 'marketExchange':
        // Tintement de pièces : échange validé au marché.
        tone(740, 0.00, 0.055, 0.18, 'triangle');
        tone(990, 0.055, 0.070, 0.20, 'triangle');
        tone(1240, 0.135, 0.085, 0.18, 'triangle');
        tone(520, 0.215, 0.070, 0.12, 'sine');
        break;
      case 'trap':
        noise(0, 0.18, 0.18);
        tone(220, 0, 0.20, 0.19, 'sawtooth', 90);
        break;
      case 'damage':
        noise(0, 0.16, 0.22);
        tone(160, 0, 0.18, 0.19, 'sawtooth', 80);
        break;
      case 'destroy':
        noise(0, 0.35, 0.30);
        tone(180, 0, 0.35, 0.24, 'sawtooth', 55);
        tone(90, 0.06, 0.34, 0.18, 'sine', 45);
        break;
      case 'build':
        tone(360, 0, 0.09, 0.16, 'triangle');
        tone(540, 0.09, 0.13, 0.17, 'triangle');
        break;
      case 'repair':
        tone(420, 0, 0.08, 0.16, 'sine');
        tone(620, 0.08, 0.12, 0.18, 'sine');
        tone(820, 0.19, 0.14, 0.17, 'sine');
        break;
      case 'victory':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.22, 0.22, 'triangle'));
        break;
      case 'test':
      default:
        tone(660, 0, 0.09, 0.22, 'square');
        tone(880, 0.13, 0.10, 0.24, 'square');
        tone(990, 0.27, 0.13, 0.22, 'square');
        break;
    }

    setTimeout(() => { try { master.disconnect(); } catch (e) {} }, 1200);
  }


  function shuffleCopy(list) {
    const out = Array.isArray(list) ? list.slice() : [];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  function tryPlayStandaloneAudio(url, volume = 0.85) {
    return new Promise(resolve => {
      let done = false;
      const audio = new Audio(url);
      const finish = ok => {
        if (done) return;
        done = true;
        audio.removeEventListener('error', onError);
        resolve(!!ok);
      };
      const onError = () => finish(false);
      audio.preload = 'auto';
      audio.loop = false;
      audio.volume = clamp01(volume);
      audio.addEventListener('error', onError, { once: true });
      try {
        if (victoryAudio) { try { victoryAudio.pause(); victoryAudio.currentTime = 0; } catch (e) {} }
        const promise = audio.play();
        if (promise && typeof promise.then === 'function') {
          promise.then(() => {
            victoryAudio = audio;
            finish(true);
          }).catch(() => finish(false));
        } else {
          victoryAudio = audio;
          finish(true);
        }
      } catch (e) {
        finish(false);
      }
      setTimeout(() => finish(false), 1400);
    });
  }

  async function playVictoryAudio() {
    // La musique/son de victoire personnalisé est prioritaire.
    // On accepte plusieurs noms pour éviter de casser le choix de fichier déjà fait.
    try { await unlockAudio(); } catch (e) {}
    try { stopRollingSound(); } catch (e) {}
    try { stopBackgroundMusic(false); } catch (e) {}

    const volume = Math.min(1, Math.max(0.55, sfxVolume * 0.9));
    const urls = shuffleCopy(VICTORY_AUDIO_FILES);
    for (const url of urls) {
      // On tente vraiment la lecture du MP3 au lieu de retomber trop vite
      // sur le son synthétique si le fichier n'était pas encore préchargé.
      const ok = await tryPlayStandaloneAudio(url, volume);
      if (ok) return true;
    }
    playRandomSfx('victory', 'victory', 1.8, true);
    return false;
  }

  function getRollingAudio() {
    if (rollingFileUnavailable || !SFX_FILES.ballRoll) return null;
    if (!rollingAudio) {
      rollingAudio = new Audio(SFX_FILES.ballRoll);
      rollingAudio.loop = true;
      rollingAudio.preload = 'auto';
      rollingAudio.volume = 0;
      rollingAudio.addEventListener('error', () => {
        rollingFileUnavailable = true;
        try { rollingAudio.pause(); } catch (e) {}
      }, { once: true });
      try { rollingAudio.load(); } catch (e) {}
    }
    return rollingAudio;
  }

  function ensureRollingSynth() {
    const ctx = getMusicContext();
    if (!ctx) return false;
    if (rollingSynthGain && rollingSynthSource) return true;

    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 1.4));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      // Bruit grave un peu irrégulier : ça imite mieux une bille qui roule qu'un simple bip.
      last = last * 0.92 + (Math.random() * 2 - 1) * 0.08;
      data[i] = last;
    }

    rollingSynthSource = ctx.createBufferSource();
    rollingSynthSource.buffer = buffer;
    rollingSynthSource.loop = true;

    rollingSynthFilter = ctx.createBiquadFilter();
    rollingSynthFilter.type = 'lowpass';
    rollingSynthFilter.frequency.value = 260;
    rollingSynthFilter.Q.value = 0.9;

    rollingSynthGain = ctx.createGain();
    rollingSynthGain.gain.value = 0;

    rollingSynthSource.connect(rollingSynthFilter);
    rollingSynthFilter.connect(rollingSynthGain);
    rollingSynthGain.connect(ctx.destination);
    try { rollingSynthSource.start(); } catch (e) {}
    return true;
  }

  function stopRollingSound(immediate = false) {
    rollingCurrentVolume = 0;
    if (rollingAudio) {
      try {
        if (immediate) {
          rollingAudio.pause();
          rollingAudio.currentTime = 0;
          rollingAudio.volume = 0;
        } else {
          rollingAudio.volume = 0;
          rollingAudio.pause();
        }
      } catch (e) {}
    }
    if (rollingSynthGain) {
      const ctx = getMusicContext();
      if (ctx) {
        try { rollingSynthGain.gain.setTargetAtTime(0, ctx.currentTime, immediate ? 0.01 : 0.08); } catch (e) { rollingSynthGain.gain.value = 0; }
      } else {
        rollingSynthGain.gain.value = 0;
      }
    }
  }

  function updateRollingSound(speed = 0, onRampOrButte = false) {
    speed = Math.max(0, Number(speed) || 0);
    const shouldRoll = sfxEnabled && !gameOver && !gamePaused && gameStarted && phase === 'attack' && !canShoot && !ballInHole && speed > 0.045;
    if (!shouldRoll) {
      if (rollingCurrentVolume > 0.001) stopRollingSound(false);
      return;
    }

    const speedPower = clamp01((speed - 0.045) / 0.74);
    const surfaceBoost = onRampOrButte ? 1.14 : 1.0;
    const targetVolume = clamp01((0.10 + speedPower * 0.34) * surfaceBoost * sfxVolume * getSfxMultiplier('ballRoll'));
    rollingCurrentVolume = targetVolume;

    const file = getRollingAudio();
    if (file && !rollingFileUnavailable) {
      try {
        file.volume = targetVolume;
        file.playbackRate = THREE.MathUtils.clamp(0.78 + speedPower * 0.72, 0.72, 1.55);
        if (file.paused) {
          file.play().catch(() => {
            rollingFileUnavailable = true;
            stopRollingSound(true);
          });
        }
        return;
      } catch (e) {
        rollingFileUnavailable = true;
      }
    }

    if (!AUDIO_SYNTH_FALLBACK_ENABLED) return;
    if (ensureRollingSynth() && rollingSynthGain) {
      const ctx = getMusicContext();
      try {
        if (ctx.state === 'suspended') ctx.resume();
        rollingSynthGain.gain.setTargetAtTime(targetVolume * 0.72, ctx.currentTime, 0.055);
        if (rollingSynthFilter) rollingSynthFilter.frequency.setTargetAtTime(170 + speedPower * 620, ctx.currentTime, 0.07);
      } catch (e) {
        rollingSynthGain.gain.value = targetVolume * 0.72;
      }
    }
  }

  function toggleSfx(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    sfxEnabled = !sfxEnabled;
    localStorage.setItem(SFX_PREF_KEY, sfxEnabled ? '1' : '0');
    updateSfxUI();
    if (sfxEnabled) {
      unlockAudio(event).then(() => playSfx('confirm', 1, true));
      setMusicStatus('Sons activés.');
    } else {
      stopRollingSound(true);
      setMusicStatus('Sons coupés.');
    }
  }

  function musicTone(freq, start, duration, gainValue, type = 'triangle') {
    const ctx = getMusicContext();
    if (!ctx || !musicMaster) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(musicMaster);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function musicChord(root, when) {
    musicTone(root, when, 1.85, 0.070, 'sine');
    musicTone(root * 1.5, when + 0.02, 1.65, 0.038, 'triangle');
    musicTone(root * 2, when + 0.04, 1.25, 0.032, 'triangle');
    musicTone(root * 0.5, when, 1.9, 0.030, 'sine');
  }

  function musicPluck(freq, when) {
    musicTone(freq, when, 0.25, 0.095, 'triangle');
  }

  function scheduleMusicBar() {
    const ctx = getMusicContext();
    if (!ctx || !musicRunning) return;
    const now = ctx.currentTime + 0.05;
    const roots = [110, 146.83, 130.81, 98];
    for (let b = 0; b < 4; b++) {
      const t = now + b * 1.15;
      const root = roots[b];
      musicChord(root, t);
      musicPluck(root * 2.0, t + 0.12);
      musicPluck(root * 2.25, t + 0.40);
      musicPluck(root * 3.0, t + 0.68);
      musicPluck(root * 2.5, t + 0.96);
    }
  }


  function getDesiredMusicRole() {
    if (marketOverlay && marketOverlay.classList.contains('open')) return 'market';
    return (mainMenuOverlay && mainMenuOverlay.classList.contains('show')) ? 'menu' : 'game';
  }

  function getMusicLabel(role) {
    if (role === 'menu') return 'menu principal';
    if (role === 'market') return 'marché';
    return 'partie';
  }

  function normalizeMusicRole(role) {
    return role === 'menu' || role === 'game' || role === 'market' ? role : 'game';
  }

  function getMusicFile(role) {
    return MUSIC_FILES[normalizeMusicRole(role)];
  }

  function getMusicAudio(role) {
    role = normalizeMusicRole(role);
    if (!musicAudios[role]) {
      const audio = new Audio(getMusicFile(role));
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = getMusicVolume(role);
      audio.addEventListener('error', () => {
        if (!musicRunning || activeMusicRole === role) {
          setMusicStatus('MP3 ' + getMusicLabel(role) + ' indisponible. Vérifie ' + getMusicFile(role) + '. Secours synthétique prêt.');
        }
      });
      musicAudios[role] = audio;
    }
    return musicAudios[role];
  }

  function pauseAllFileMusic(exceptRole = null) {
    Object.entries(musicAudios).forEach(([role, audio]) => {
      if (!audio || role === exceptRole) return;
      try { audio.pause(); } catch (e) {}
    });
  }

  async function startFileMusic(role) {
    role = normalizeMusicRole(role);
    const audio = getMusicAudio(role);
    try {
      pauseAllFileMusic(role);
      audio.volume = getMusicVolume(role);
      await audio.play();
      activeMusicRole = role;
      musicUsesFile = true;
      return true;
    } catch (e) {
      musicUsesFile = false;
      return false;
    }
  }

  function stopBackgroundMusic(update = true) {
    pauseAllFileMusic();
    activeMusicRole = null;
    musicUsesFile = false;
    musicRunning = false;
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
    if (musicMaster) {
      try { musicMaster.disconnect(); } catch (e) {}
      musicMaster = null;
    }
    if (update) {
      setMusicStatus('Ambiance coupée.');
      updateMusicUI();
    }
  }

  async function startBackgroundMusic(event, role = null) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    role = normalizeMusicRole(role || getDesiredMusicRole());
    const ctx = getMusicContext();
    if (!ctx) return;
    try { await ctx.resume(); } catch (e) {}

    stopBackgroundMusic(false);

    musicEnabled = true;
    localStorage.setItem(AUDIO_PREF_KEY, '1');

    const fileOk = await startFileMusic(role);
    if (fileOk) {
      musicRunning = true;
      setMusicStatus(role === 'menu' ? 'Musique du menu active.' : (role === 'market' ? 'Musique du marché active.' : 'Musique de partie active.'));
      updateMusicUI();
      return;
    }

    if (!MUSIC_SYNTH_FALLBACK_ENABLED) {
      musicRunning = false;
      musicUsesFile = false;
      activeMusicRole = null;
      setMusicStatus('MP3 introuvable ou non autorisé. Aucun son de secours lancé.');
      updateMusicUI();
      return;
    }

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -28;
    compressor.knee.value = 24;
    compressor.ratio.value = 9;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.22;

    musicMaster = ctx.createGain();
    musicMaster.gain.value = Math.max(0.02, getMusicVolume(role) * 1.25);
    musicMaster.connect(compressor);
    compressor.connect(ctx.destination);

    musicRunning = true;
    scheduleMusicBar();
    musicTimer = setInterval(scheduleMusicBar, 4300);
    setMusicStatus('Musique synthétique de secours active.');
    updateMusicUI();
  }

  function syncMusicForScreen(event = null, role = null) {
    if (!musicEnabled) return;
    const wantedRole = normalizeMusicRole(role || getDesiredMusicRole());
    if (musicRunning && musicUsesFile && activeMusicRole === wantedRole) return;
    startBackgroundMusic(event, wantedRole);
  }

  function toggleBackgroundMusic(event) {
    if (musicRunning) {
      musicEnabled = false;
      localStorage.setItem(AUDIO_PREF_KEY, '0');
      stopBackgroundMusic(true);
    } else {
      startBackgroundMusic(event);
    }
  }

  async function testSound(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const ctx = getMusicContext();
    if (!ctx) return;
    try { await ctx.resume(); } catch (e) {}

    const out = ctx.createGain();
    out.gain.value = 0.55 * sfxVolume;
    out.connect(ctx.destination);
    const now = ctx.currentTime;

    [660, 880, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.16);
      gain.gain.setValueAtTime(0.001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.34, now + i * 0.16 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.18);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.22);
    });

    setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 900);
    playSfx('test', 1, true);
    setMusicStatus('Test son lancé.');
  }

  bindVolumeSlider(mainMenuMusicVolume, MUSIC_MENU_VOLUME_KEY, value => { menuMusicVolume = value; }, 'Musique menu');
  bindVolumeSlider(mainGameMusicVolume, MUSIC_GAME_VOLUME_KEY, value => { gameMusicVolume = value; }, 'Musique partie');
  bindVolumeSlider(mainMarketMusicVolume, MUSIC_MARKET_VOLUME_KEY, value => { marketMusicVolume = value; }, 'Musique marché');
  bindVolumeSlider(mainSfxVolume, SFX_VOLUME_KEY, value => { sfxVolume = value; }, 'Bruitages');
  updateVolumeUI();
  applyAudioVolumes();

  if (mainSfx) mainSfx.addEventListener('click', toggleSfx, true);
  if (mainMusic) mainMusic.addEventListener('click', toggleBackgroundMusic, true);
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  document.addEventListener('pointerdown', (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest('button, .pause-btn, .castle-pill') : null;
    if (!btn || btn.disabled) return;
    btn.classList.add('tap-pressed');
    window.setTimeout(() => btn.classList.remove('tap-pressed'), 170);
  }, true);
  document.addEventListener('click', (ev) => {
    if (ev.target && ev.target.closest && ev.target.closest('button, .main-menu-box, .modal-box')) playSfx('click');
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && musicRunning && musicCtx && musicCtx.state === 'suspended') {
      try { musicCtx.resume(); } catch (e) {}
    }
    const activeAudio = activeMusicRole ? musicAudios[activeMusicRole] : null;
    if (!document.hidden && musicRunning && musicUsesFile && activeAudio && activeAudio.paused) {
      try { activeAudio.play(); } catch (e) {}
    }
  });
  window.BDS_AUDIO = { startBackgroundMusic, stopBackgroundMusic, testSound, playSfx, playRandomSfx, toggleSfx, syncMusicForScreen, stopRollingSound, updateRollingSound };
  setMusicStatus('Audio prêt.');
  updateMusicUI();

  // Couche d'effets UI indépendante du gameplay : textes flottants, messages forts, recap animé.
  const fxLayer = document.createElement('div');
  fxLayer.id = 'fxLayer';
  document.body.appendChild(fxLayer);

  const bigFx = document.createElement('div');
  bigFx.id = 'bigFx';
  bigFx.innerHTML = '<strong></strong><span></span>';
  document.body.appendChild(bigFx);
  const bigFxTitle = bigFx.querySelector('strong');
  const bigFxText = bigFx.querySelector('span');


  // Couche "arcade juice" : pur habillage visuel/sonore, aucune règle modifiée.
  const addictionLayer = document.createElement('div');
  addictionLayer.id = 'addictionLayer';
  addictionLayer.innerHTML = `
    <div id="ambientSparkLayer" aria-hidden="true"></div>
    <div id="hypeMeter" aria-hidden="true">
      <span class="hype-label">ÉLAN</span>
      <b class="hype-value">0</b>
      <i class="hype-fill"></i>
    </div>
    <div id="momentBanner" aria-live="polite">
      <strong></strong>
      <span></span>
    </div>`;
  document.body.appendChild(addictionLayer);
  const ambientSparkLayer = addictionLayer.querySelector('#ambientSparkLayer');
  const hypeMeter = addictionLayer.querySelector('#hypeMeter');
  const hypeValue = hypeMeter ? hypeMeter.querySelector('.hype-value') : null;
  const hypeFill = hypeMeter ? hypeMeter.querySelector('.hype-fill') : null;
  const momentBanner = addictionLayer.querySelector('#momentBanner');
  const momentBannerTitle = momentBanner ? momentBanner.querySelector('strong') : null;
  const momentBannerText = momentBanner ? momentBanner.querySelector('span') : null;
  let hypeScore = 0;
  let hypeHideTimer = null;

  function buildAmbientSparkles() {
    if (!ambientSparkLayer || ambientSparkLayer.childElementCount) return;
    const symbols = ['✦', '✧', '•', '✶'];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('i');
      s.textContent = symbols[i % symbols.length];
      s.style.setProperty('--x', (Math.random() * 100).toFixed(2) + 'vw');
      s.style.setProperty('--y', (Math.random() * 100).toFixed(2) + 'vh');
      s.style.setProperty('--d', (7 + Math.random() * 14).toFixed(2) + 's');
      s.style.setProperty('--delay', (-Math.random() * 18).toFixed(2) + 's');
      s.style.setProperty('--size', (0.55 + Math.random() * 0.95).toFixed(2));
      ambientSparkLayer.appendChild(s);
    }
  }

  function pulseScreen(kind = 'gold') {
    document.body.classList.remove('juice-pulse-gold', 'juice-pulse-green', 'juice-pulse-red', 'juice-pulse-cyan');
    void document.body.offsetWidth;
    document.body.classList.add('juice-pulse-' + kind);
    clearTimeout(pulseScreen._t);
    pulseScreen._t = setTimeout(() => {
      document.body.classList.remove('juice-pulse-gold', 'juice-pulse-green', 'juice-pulse-red', 'juice-pulse-cyan');
    }, 560);
  }

  function setHype(points = 0, label = '', variant = 'gold') {
    hypeScore = THREE.MathUtils.clamp(hypeScore + points, 0, 100);
    if (!hypeMeter) return;
    hypeMeter.className = 'show ' + variant;
    if (hypeValue) hypeValue.textContent = String(Math.round(hypeScore));
    if (hypeFill) hypeFill.style.width = Math.max(8, hypeScore) + '%';
    if (label) hypeMeter.dataset.label = label;
    clearTimeout(hypeHideTimer);
    hypeHideTimer = setTimeout(() => {
      hypeScore = Math.max(0, hypeScore - 22);
      if (hypeScore <= 3) hypeMeter.classList.remove('show');
      else {
        if (hypeValue) hypeValue.textContent = String(Math.round(hypeScore));
        if (hypeFill) hypeFill.style.width = hypeScore + '%';
      }
    }, 4200);
  }

  function showMomentBanner(title, text = '', variant = 'gold', duration = 1750) {
    if (!momentBanner || (turnOverlay && turnOverlay.classList && turnOverlay.classList.contains('show'))) return;
    if (momentBannerTitle) momentBannerTitle.textContent = title;
    if (momentBannerText) momentBannerText.innerHTML = text;
    momentBanner.className = 'show ' + variant;
    clearTimeout(momentBanner._t);
    momentBanner._t = setTimeout(() => momentBanner.classList.remove('show'), duration);
  }

  function spawnJuiceEmojiBurst(center, icons, amount = 18, variant = 'gold') {
    if (!center) return;
    const p = center.clone ? worldToScreen(center) : center;
    const list = Array.isArray(icons) && icons.length ? icons : ['✨'];
    for (let i = 0; i < amount; i++) {
      const node = document.createElement('div');
      node.className = 'juice-emoji ' + variant;
      node.textContent = list[i % list.length];
      node.style.left = p.x + 'px';
      node.style.top = p.y + 'px';
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 170;
      node.style.setProperty('--jx', (Math.cos(angle) * radius).toFixed(1) + 'px');
      node.style.setProperty('--jy', (Math.sin(angle) * radius - 60 - Math.random() * 70).toFixed(1) + 'px');
      node.style.animationDelay = (i * 0.012).toFixed(3) + 's';
      document.body.appendChild(node);
      setTimeout(() => node.remove(), 1300);
    }
  }

  function playJuiceChord(kind = 'gain', power = 1) {
    if (!sfxEnabled) return;
    const ctx = getMusicContext();
    if (!ctx || !AUDIO_SYNTH_FALLBACK_ENABLED) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.min(0.55, 0.18 + power * 0.07) * sfxVolume, now);
    master.connect(ctx.destination);
    const seq = kind === 'damage' ? [180, 140, 90] : kind === 'market' ? [520, 740, 1040, 1320] : kind === 'victory' ? [523, 659, 784, 1046, 1318] : [660, 880, 1174, 1568];
    seq.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'damage' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.0001, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.055 + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.055 + 0.16 + power * 0.018);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.22 + power * 0.025);
    });
    setTimeout(() => { try { master.disconnect(); } catch (e) {} }, 900);
  }

  function celebrateMicroMoment(title, text, variant, pos, icons, points = 10) {
    setHype(points, title, variant);
    showMomentBanner(title, text, variant);
    pulseScreen(variant === 'damage' || variant === 'destroy' ? 'red' : (variant === 'gain' ? 'green' : 'gold'));
    if (pos) spawnJuiceEmojiBurst(pos, icons, Math.min(34, 12 + Math.floor(points * 0.55)), variant);
  }

  // Bandeau événement : une règle spéciale aléatoire peut apparaître tous les 3 tours.
  const eventBanner = document.createElement('div');
  eventBanner.id = 'eventBanner';
  eventBanner.className = 'hidden';
  document.body.appendChild(eventBanner);

  // File d'attente des messages courts : évite les superpositions avec les gros effets et les overlays.
  const toastQueue = [];
  let toastBusy = false;

  const CFG = { laneW: 24, laneL: 220, gap: 9, leftX: -16.5, rightX: 16.5, p1CastleZ: 94, p2CastleZ: -94, ballR: currentDifficulty.ballR };
  const HOLE_R = 0.72;

  // Dimensions centrales utilisées par le château et les rampes amovibles.
  // Elles étaient appelées plus bas sans être déclarées : c'était la cause du blocage au chargement.
  const BUTTE = {
    w: 22.0,
    h: 2.4,
    // Butte allongée : la bille roule dessus avant de toucher le château.
    d: 28.0
  };

  // Château reculé sur la butte : plus de butte devant le château que derrière.
  // Le signe s'inverse selon le joueur pour garder les deux côtés parfaitement miroir.
  const CASTLE_KEEP_REAR_OFFSET = 4.6;

  const RAMP = {
    length: 16.0,
    halfLength: 8.0,
    width: 3.9,
    surfaceStartY: 0.16,
    surfaceEndY: 2.06,
    ballRise: BUTTE.h,
    exitOverlap: -0.55,
    wearPerPassage: 10
  };

  // Butte latérale : chemin étroit et long, en continuité de la butte du château.
  // Elle donne un accès offensif de base : chaque joueur peut construire cette rampe
  // sans devoir détruire une tour au préalable.
  const SIDE_RIDGE = {
    width: 4.05,
    // Distance entre le début de la butte latérale et l'avant de la butte du château.
    // La butte continue ensuite jusqu'au fond du couloir pour atteindre un trou de vol de ressources.
    length: 37.0,
    backMargin: 3.8,
    // Collée au bord du couloir : elle longe la bande latérale sans manger la zone centrale.
    xOffset: 9.85,
    rampHP: 80,
    // Même usure fixe que les rampes château : -10 PV à chaque passage.
    wearPerPassage: 10,
    stealHoleBackOffset: 1.2,
    cost: { wood: 2, stone: 2, gold: 2 },
    entryOverlap: 0.4
  };

  const TURN_EVENT_INTERVAL = 3;
  const TURN_EVENTS = [
    { id: 'gold2',   icon: '🪙', title: 'OR DOUBLÉ',      short: 'or doublé',      desc: 'Tous les gains d’or sont doublés ce tour.', resource: 'gold' },
    { id: 'wood2',   icon: '🪵', title: 'BOIS DOUBLÉ',    short: 'bois doublé',    desc: 'Tous les gains de bois sont doublés ce tour.', resource: 'wood' },
    { id: 'stone2',  icon: '🪨', title: 'PIERRE DOUBLÉE', short: 'pierre doublée', desc: 'Tous les gains de pierre sont doublés ce tour.', resource: 'stone' },
    { id: 'damage2',    icon: '💥', title: 'DÉGÂTS DOUBLÉS',   short: 'dégâts doublés',   desc: 'Tous les dégâts sont doublés ce tour.', damage: true },
    { id: 'mudRain',    icon: '🌧️', title: 'PLUIE BOUEUSE',     short: 'pluie boueuse',     desc: 'Des zones de boue apparaissent sur les deux couloirs. Les billes ralentissent en les traversant.', mud: true },
    { id: 'marketSale', icon: '🏷️', title: 'SOLDE AU MARCHÉ', short: 'solde au marché', desc: 'Les taux du marché sont meilleurs ce tour. Un seul échange marché par joueur.', marketSale: true },
    { id: 'all2',       icon: '✨', title: 'GAINS DOUBLÉS',    short: 'gains doublés',    desc: 'Tous les gains de ressources sont doublés ce tour.', allResources: true }
  ];

  /* ── Scene ── */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x102015); // rendu plus vivant, moins terne
  scene.fog = new THREE.FogExp2(0x0b2818, 0.00235);

  const camera = new THREE.PerspectiveCamera(54, innerWidth / (innerHeight - VIEW_BOTTOM_RESERVED), 0.1, 900);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.15));
  renderer.setSize(innerWidth, innerHeight - VIEW_BOTTOM_RESERVED);
  // Optimisation mobile : les ombres dynamiques coûtaient trop cher et provoquaient du lag.
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.54;

  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight - VIEW_BOTTOM_RESERVED);
    camera.aspect = innerWidth / (innerHeight - VIEW_BOTTOM_RESERVED);
    camera.updateProjectionMatrix();
  });

  /* ── Éclairage style salle de billard ── */
  // Ambiance renforcée : on garde l'atmosphère billard, mais le plateau reste lisible.
  scene.add(new THREE.AmbientLight(0xfff3df, 1.58));

  const keyLight = new THREE.DirectionalLight(0xffe7c0, 1.72);
  keyLight.position.set(-14, 58, 38);
  keyLight.castShadow = false;
  scene.add(keyLight);

  // Suspension au-dessus de chaque couloir (lampes pendantes style billard)
  function addTableLamp(x, z) {
    const lamp = new THREE.PointLight(0xffe8b8, 3.05, 98, 1.35);
    lamp.position.set(x, 32, z);
    lamp.castShadow = false;
    scene.add(lamp);

    // Halo visible
    const haloGeo = new THREE.SphereGeometry(0.75, 8, 6);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe8b8, transparent: true, opacity: 0.58 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(lamp.position);
    scene.add(halo);

    // Cône de lumière vers le bas (abat-jour)
    const coneGeo = new THREE.ConeGeometry(0.55, 1.25, 14, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x3a2a08, side: THREE.BackSide });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(lamp.position);
    cone.position.y -= 0.8;
    scene.add(cone);
  }

  // Lampes sur chaque couloir, plusieurs positions
  [-16.5, 16.5].forEach(x => {
    [-45, 65].forEach(z => addTableLamp(x, z));
  });

  // Remplissage doux pour déboucher les ombres sans tuer le style billard.
  const fillLight = new THREE.HemisphereLight(0xffe8b8, 0x164a2a, 0.98);
  scene.add(fillLight);


  /* ── Textures procédurales légères : plus beau sans charger d'images ni faire laguer ── */
  function seededRandom(seed) {
    let s = seed >>> 0;
    return function() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function makeCanvasTexture(size, painter, repeatX = 1, repeatY = 1) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    painter(ctx, size);
    const texture = new THREE.CanvasTexture(cv);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function makeFeltTexture(base, seed, repeatX = 7, repeatY = 30) {
    const rnd = seededRandom(seed);
    return makeCanvasTexture(96, (ctx, size) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 760; i++) {
        const x = rnd() * size, y = rnd() * size;
        const len = 1.0 + rnd() * 3.8;
        const a = rnd() * Math.PI;
        const light = rnd() > 0.54;
        ctx.strokeStyle = light ? 'rgba(255,255,225,.045)' : 'rgba(0,0,0,.075)';
        ctx.lineWidth = 0.55 + rnd() * 0.55;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      const grad = ctx.createRadialGradient(size*.42, size*.35, 2, size*.5, size*.5, size*.78);
      grad.addColorStop(0, 'rgba(255,255,255,.055)');
      grad.addColorStop(1, 'rgba(0,0,0,.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }, repeatX, repeatY);
  }

  function makeWoodTexture(seed, repeatX = 4, repeatY = 18) {
    const rnd = seededRandom(seed);
    return makeCanvasTexture(128, (ctx, size) => {
      const g = ctx.createLinearGradient(0, 0, size, 0);
      g.addColorStop(0, '#2a1408');
      g.addColorStop(.48, '#5b2b12');
      g.addColorStop(1, '#251105');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      for (let y = -18; y < size + 18; y += 6 + rnd()*4) {
        ctx.strokeStyle = rnd() > .55 ? 'rgba(255,190,94,.075)' : 'rgba(0,0,0,.16)';
        ctx.lineWidth = 1 + rnd()*2.2;
        ctx.beginPath();
        let offset = rnd()*16;
        for (let x = -8; x <= size + 8; x += 12) {
          const yy = y + Math.sin((x + offset) * .075) * (2 + rnd()*2.5);
          if (x <= -8) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 18; i++) {
        const x = rnd()*size, y = rnd()*size, r = 3 + rnd()*10;
        ctx.strokeStyle = 'rgba(0,0,0,.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r*.32, rnd()*Math.PI, 0, Math.PI*2);
        ctx.stroke();
      }
    }, repeatX, repeatY);
  }

  function makeStoneTexture(seed, repeatX = 4, repeatY = 4) {
    const rnd = seededRandom(seed);
    return makeCanvasTexture(128, (ctx, size) => {
      ctx.fillStyle = '#b9b09e';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 520; i++) {
        const v = 138 + Math.floor(rnd()*70);
        ctx.fillStyle = `rgba(${v},${v-6},${v-18},${.045 + rnd()*.065})`;
        ctx.fillRect(rnd()*size, rnd()*size, 1 + rnd()*2.2, 1 + rnd()*2.2);
      }
      ctx.strokeStyle = 'rgba(64,52,38,.18)';
      ctx.lineWidth = 1;
      for (let y = 0; y < size; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y + rnd()*5); ctx.lineTo(size, y + rnd()*5); ctx.stroke();
      }
      for (let x = 0; x < size; x += 30) {
        ctx.beginPath(); ctx.moveTo(x + rnd()*5, 0); ctx.lineTo(x + rnd()*5, size); ctx.stroke();
      }
    }, repeatX, repeatY);
  }

  function makeDarkFloorTexture(seed) {
    const rnd = seededRandom(seed);
    return makeCanvasTexture(160, (ctx, size) => {
      ctx.fillStyle = '#140904';
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 16) {
        ctx.fillStyle = y % 32 === 0 ? 'rgba(255,160,70,.035)' : 'rgba(0,0,0,.10)';
        ctx.fillRect(0, y, size, 1);
      }
      for (let i = 0; i < 150; i++) {
        ctx.fillStyle = rnd() > .5 ? 'rgba(255,210,120,.025)' : 'rgba(0,0,0,.08)';
        ctx.fillRect(rnd()*size, rnd()*size, 1 + rnd()*2, 1);
      }
    }, 12, 16);
  }

  const gfxTex = {
    felt: makeFeltTexture('#17633d', 7123, 5.6, 30),
    feltAlt: makeFeltTexture('#155a37', 8129, 5.6, 30),
    butte: makeFeltTexture('#238453', 9021, 2.2, 2.2),
    rail: makeWoodTexture(4401, 1.2, 14),
    wood: makeWoodTexture(4402, 1.5, 8),
    floor: makeDarkFloorTexture(2209),
    stone: makeStoneTexture(7107, 2.4, 2.4),
    stoneDark: makeStoneTexture(7108, 2.0, 2.0)
  };

  /* ── Matériaux Billard ── */
  const mat = {
    // Feutre vert billard
    felt:    new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.felt, roughness: 0.96, metalness: 0.0 }),
    feltAlt: new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.feltAlt, roughness: 0.96, metalness: 0.0 }),
    // Butte du château : proche du tapis, mais assez différente pour être lisible.
    butte:   new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.butte, roughness: 0.94, metalness: 0.0 }),

    // Bois d'acajou (bordures, rails)
    rail:  new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.rail, roughness: 0.50, metalness: 0.03 }),
    wood:  new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.wood, roughness: 0.60, metalness: 0.02 }),

    // Bois foncé du plancher alentours
    floor: new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.floor, roughness: 0.86, metalness: 0.0 }),

    // Caoutchouc des bandes
    rubber: new THREE.MeshStandardMaterial({ color: 0x0c2f1d, roughness: 0.91, metalness: 0.0 }),

    // Pierre (châteaux)
    stone:    new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.stone, roughness: 0.86, metalness: 0.03 }),
    stoneLight:new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.stone, roughness: 0.80, metalness: 0.02 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x8f8473, map: gfxTex.stoneDark, roughness: 0.94, metalness: 0.0 }),
    mortar:   new THREE.MeshStandardMaterial({ color: 0x463e34, roughness: 0.98, metalness: 0.0 }),
    windowDark:new THREE.MeshStandardMaterial({ color: 0x070503, roughness: 0.96, metalness: 0.0 }),
    damaged:  new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.92, metalness: 0.0 }),
    destroyed:new THREE.MeshStandardMaterial({ color: 0x4a3c2a, roughness: 0.96, metalness: 0.0 }),
    rubble:   new THREE.MeshStandardMaterial({ color: 0x5b513f, roughness: 0.98, metalness: 0.0 }),

    // Toits de château
    roofR:  new THREE.MeshStandardMaterial({ color: 0x8b1c18, roughness: 0.58, metalness: 0.06 }),
    roofB:  new THREE.MeshStandardMaterial({ color: 0x1c2e8b, roughness: 0.58, metalness: 0.06 }),
    roofTrim:new THREE.MeshStandardMaterial({ color: 0xd7bd62, roughness: 0.45, metalness: 0.30 }),
    bannerR:new THREE.MeshStandardMaterial({ color: 0xb51d18, roughness: 0.72, metalness: 0.0 }),
    bannerB:new THREE.MeshStandardMaterial({ color: 0x2245b8, roughness: 0.72, metalness: 0.0 }),

    // Laiton (poches, coins)
    brass:  new THREE.MeshStandardMaterial({ color: 0xd5ac3e, metalness: 0.78, roughness: 0.18, emissive: 0x171000, emissiveIntensity: 0.18 }),

    // Bille en ivoire poli
    ivory:  new THREE.MeshStandardMaterial({ color: 0xfff4df, roughness: 0.055, metalness: 0.16,
                                              emissive: 0x100804, emissiveIntensity: 0.08, envMapIntensity: 1.35 }),

    // Intérieur poche (noir mat)
    pocket: new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 0.98 }),

    // Verre / fantôme
    ghost:  new THREE.MeshStandardMaterial({ color: 0x88ddaa, transparent: true, opacity: 0.28, roughness: 0.4 }),

    // Rampe bois
    ramp:   new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.wood, roughness: 0.64, metalness: 0.02 }),

    dark:   new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.88 }),
    metal:  new THREE.MeshStandardMaterial({ color: 0xd0d8e0, metalness: 0.9, roughness: 0.12 }),
    slope:  new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.felt, roughness: 0.93 }),
    slopeTop:new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.butte, roughness: 0.90 }),

    // Anneau de poche de trou (selon type ressource)
    holeRing: new THREE.MeshStandardMaterial({ color: 0xe0b23d, metalness: 0.72, roughness: 0.18, emissive: 0x1c1200, emissiveIntensity: 0.18 }),
    holeInner:new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 0.98 }),
    water:  new THREE.MeshStandardMaterial({ color: 0x1a5c6e, transparent: true, opacity: .5, roughness: .2 }),

    // Drap latéral (vert plus sombre autour des couloirs)
    cloth: new THREE.MeshStandardMaterial({ color: 0x0d3420, map: gfxTex.feltAlt, roughness: 0.97 }),

    // Décor autour des tables
    wall: new THREE.MeshStandardMaterial({ color: 0x160d08, map: gfxTex.wood, roughness: 0.90, metalness: 0.0 }),
    beam: new THREE.MeshStandardMaterial({ color: 0xffffff, map: gfxTex.rail, roughness: 0.70, metalness: 0.02 }),
    carpet: new THREE.MeshStandardMaterial({ color: 0x361307, roughness: 0.88, metalness: 0.0 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x14331d, roughness: 0.96, metalness: 0.0 }),

    // Lignes décoratives très légères : MeshBasicMaterial = aucun coût lumière.
    accentGold: new THREE.MeshBasicMaterial({ color: 0xffd66e, transparent: true, opacity: 0.72 }),
    accentEmerald: new THREE.MeshBasicMaterial({ color: 0x42ffb0, transparent: true, opacity: 0.18 }),
    accentRed: new THREE.MeshBasicMaterial({ color: 0xff5a48, transparent: true, opacity: 0.24 }),
    accentBlue: new THREE.MeshBasicMaterial({ color: 0x5d8dff, transparent: true, opacity: 0.24 }),
  };

  const kitMat = {
    crate: new THREE.MeshStandardMaterial({ color: 0x6b3b18, roughness: 0.72, metalness: 0.02 }),
    repair: new THREE.MeshStandardMaterial({ color: 0xf3efe1, roughness: 0.50, metalness: 0.04 }),
    repairMark: new THREE.MeshStandardMaterial({ color: 0xd82222, roughness: 0.48, metalness: 0.02 }),
    build: new THREE.MeshStandardMaterial({ color: 0xd6a83a, roughness: 0.55, metalness: 0.12 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a1708, roughness: 0.80, metalness: 0.0 })
  };
  const mudMat = new THREE.MeshBasicMaterial({ color: 0x2a1608, transparent: true, opacity: 0.46, side: THREE.DoubleSide });
  const mudEdgeMat = new THREE.MeshBasicMaterial({ color: 0x5b3515, transparent: true, opacity: 0.62, side: THREE.DoubleSide });

  const castleSkinMaterials = {};

  function materialColorByPlayer(skin, field, player) {
    return castleSkinValue(skin, field, player) ?? 0xffffff;
  }

  function makeCastleMat(color, roughness = 0.78, metalness = 0.04) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

function shadeHexColor(color, amount) {
    const c = Number(color) >>> 0;
    const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
    const r = clamp(((c >> 16) & 255) + amount);
    const g = clamp(((c >> 8) & 255) + amount);
    const b = clamp((c & 255) + amount);
    return (r << 16) | (g << 8) | b;
  }

  function getCastleSkinMaterials(player = 1) {
    const skin = findCastleSkin(getSelectedCastleSkinId(player));
    const key = skin.id + '_p' + player;
    if (!castleSkinMaterials[key]) {
      castleSkinMaterials[key] = {
        wall: makeCastleMat(materialColorByPlayer(skin, 'wall', player), 0.82, 0.04),
        light: makeCastleMat(materialColorByPlayer(skin, 'light', player), 0.76, 0.05),
        dark: makeCastleMat(materialColorByPlayer(skin, 'dark', player), 0.92, 0.02),
        damaged: makeCastleMat(materialColorByPlayer(skin, 'damaged', player), 0.94, 0.02),
        roof: makeCastleMat(materialColorByPlayer(skin, 'roof', player), 0.55, 0.08),
        roofDamaged: makeCastleMat(shadeHexColor(materialColorByPlayer(skin, 'roof', player), -72), 0.82, 0.03),
        banner: makeCastleMat(materialColorByPlayer(skin, 'banner', player), 0.72, 0.02),
        trim: makeCastleMat(materialColorByPlayer(skin, 'trim', player), 0.42, 0.34),
      };
    }
    return castleSkinMaterials[key];
  }

  function refreshCastleSkin(player) {
    if (!Array.isArray(players) || !players[player - 1]) return;
    players[player - 1].castle.forEach((part, idx) => {
      if (part.hp > 0) updateCastlePartVisual(player, idx);
    });
    players[player - 1].towers.forEach(tower => {
      if (tower.placed && tower.hp > 0) towerMesh(player, tower);
    });
  }

  function refreshAllCastleSkins() {
    refreshCastleSkin(1);
    refreshCastleSkin(2);
  }

  const addBox  = (w,h,d,x,y,z,m,parent=scene) => { const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); o.castShadow=o.receiveShadow=true; parent.add(o); return o; };
  const addCyl  = (r,h,x,y,z,m,parent=scene,seg=32) => { const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),m); o.position.set(x,y,z); o.castShadow=o.receiveShadow=true; parent.add(o); return o; };
  const addCone = (r,h,x,y,z,m,parent=scene,seg=32) => { const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),m); o.position.set(x,y,z); o.castShadow=true; parent.add(o); return o; };

  /* ── Plateau principal — Table de Billard ── */
  // Plancher de salle
  addBox(380, 0.4, 480, 0, -1.4, 0, mat.floor);

  // Surface feutre des couloirs
  const laneL = CFG.laneL;
  addBox(CFG.laneW, 0.22, laneL, CFG.leftX,  0, 0, mat.felt);
  addBox(CFG.laneW, 0.22, laneL, CFG.rightX, 0, 0, mat.feltAlt);

  // Zone centrale (séparation) — feutre sombre
  addBox(CFG.gap, 0.18, laneL, 0, 0, 0, mat.cloth);

  // Zones au-delà des bouts — feutre d'extension
  addBox(CFG.laneW * 2 + CFG.gap + 10, 0.15, 30, 0, -0.03, laneL/2 + 15, mat.cloth);
  addBox(CFG.laneW * 2 + CFG.gap + 10, 0.15, 30, 0, -0.03, -laneL/2 - 15, mat.cloth);

  /* ── Cadre en bois d'acajou autour de chaque couloir ── */
  function buildBilliardTable(x) {
    const hw = CFG.laneW / 2;
    const hl = laneL / 2;
    const railH  = 2.2;
    const railW  = 1.8;
    const railY  = railH / 2;

    // Bandes latérales (caoutchouc + bois)
    addBox(railW, railH, laneL + 2, x - hw - railW/2, railY, 0, mat.rubber);
    addBox(railW, railH, laneL + 2, x + hw + railW/2, railY, 0, mat.rubber);

    // Bandes de bout
    addBox(CFG.laneW + railW*2, railH, railW, x, railY,  hl + railW/2, mat.rubber);
    addBox(CFG.laneW + railW*2, railH, railW, x, railY, -hl - railW/2, mat.rubber);

    // Habillage bois sur les bandes extérieures
    addBox(0.9, railH + 0.3, laneL + railW*2 + 0.6, x - hw - railW - 0.45, railY + 0.15, 0, mat.rail);
    addBox(0.9, railH + 0.3, laneL + railW*2 + 0.6, x + hw + railW + 0.45, railY + 0.15, 0, mat.rail);
    addBox(CFG.laneW + railW*2 + 1.8 + 0.6, railH + 0.3, 0.9, x, railY + 0.15,  hl + railW + 0.45, mat.rail);
    addBox(CFG.laneW + railW*2 + 1.8 + 0.6, railH + 0.3, 0.9, x, railY + 0.15, -hl - railW - 0.45, mat.rail);

    // Pieds de la table (4 coins)
    [[-hw - railW - 0.9, -hl - railW - 0.9],
     [ hw + railW + 0.9, -hl - railW - 0.9],
     [-hw - railW - 0.9,  hl + railW + 0.9],
     [ hw + railW + 0.9,  hl + railW + 0.9]
    ].forEach(([px, pz]) => {
      addBox(1.6, 3.8, 1.6, x + px, -1.9, pz, mat.wood);
    });

    // Coins laiton (cabochons aux 4 coins des bandes)
    [[-hw - railW, -hl - railW], [hw + railW, -hl - railW],
     [-hw - railW,  hl + railW], [hw + railW,  hl + railW]
    ].forEach(([cx, cz]) => {
      addCyl(0.55, 0.4, x + cx, railH + 0.2, cz, mat.brass);
    });

    // Ligne de tir centrale (marquage laiton discret)
    addBox(CFG.laneW * 0.7, 0.06, 0.12, x, 0.26, 0, mat.brass);
  }

  buildBilliardTable(CFG.leftX);
  buildBilliardTable(CFG.rightX);

  // Finition moderne du plateau : quelques lignes fines, pas d'ombres, pas d'animation lourde.
  function addLaneAccents(x, playerTintMat) {
    const hw = CFG.laneW / 2;
    const hl = laneL / 2;
    addBox(0.12, 0.055, laneL - 13.0, x - hw + 1.05, 0.39, 0, mat.accentGold);
    addBox(0.12, 0.055, laneL - 13.0, x + hw - 1.05, 0.39, 0, mat.accentGold);
    addBox(CFG.laneW - 5.0, 0.055, 0.12, x, 0.39, -hl + 8.0, mat.accentGold);
    addBox(CFG.laneW - 5.0, 0.055, 0.12, x, 0.39,  hl - 8.0, mat.accentGold);
    addBox(CFG.laneW - 7.5, 0.045, 0.10, x, 0.405, 0, mat.accentEmerald);
    addBox(0.10, 0.045, laneL - 35.0, x - hw + 3.0, 0.405, 0, playerTintMat);
    addBox(0.10, 0.045, laneL - 35.0, x + hw - 3.0, 0.405, 0, playerTintMat);
  }
  addLaneAccents(CFG.leftX, mat.accentRed);
  addLaneAccents(CFG.rightX, mat.accentBlue);

  function addDecorativeRoom() {
    // Parquet sombre avec lignes de planches : donne de la profondeur sans coûter cher.
    for (let x = -170; x <= 170; x += 18) addBox(0.16, 0.045, 470, x, -1.15, 0, mat.beam);
    for (let z = -220; z <= 220; z += 24) addBox(380, 0.04, 0.12, 0, -1.13, z, mat.beam);

    // Murs et poutres de salle médiévale/billard.
    addBox(382, 22, 2.2, 0, 9.6, -238, mat.wall);
    addBox(382, 22, 2.2, 0, 9.6,  238, mat.wall);
    addBox(2.2, 22, 482, -190, 9.6, 0, mat.wall);
    addBox(2.2, 22, 482,  190, 9.6, 0, mat.wall);

    [-150, -75, 0, 75, 150].forEach(x => {
      addBox(2.2, 23.5, 2.8, x, 10.2, -236.2, mat.beam);
      addBox(2.2, 23.5, 2.8, x, 10.2,  236.2, mat.beam);
    });
    [-175, 175].forEach(x => [-160, -80, 0, 80, 160].forEach(z => addBox(2.4, 23.5, 2.4, x, 10.2, z, mat.beam)));

    // Tapis latéraux et blasons.
    addBox(52, 0.06, 126, -80, -1.06, 0, mat.carpet);
    addBox(52, 0.06, 126,  80, -1.06, 0, mat.carpet);
    addBox(20, 12, 0.26, -42, 11.5, -236.8, mat.bannerR);
    addBox(20, 12, 0.26,  42, 11.5, -236.8, mat.bannerB);
    addBox(20, 12, 0.26, -42, 11.5,  236.8, mat.bannerR);
    addBox(20, 12, 0.26,  42, 11.5,  236.8, mat.bannerB);

    function addCrateStack(x, z, flip = 1) {
      addBox(4.8, 3.0, 4.8, x, 0.05, z, mat.wood);
      addBox(3.8, 2.4, 3.8, x + flip * 3.5, -0.25, z + 4.0, mat.rail);
      addCyl(1.15, 3.2, x - flip * 3.4, 0.0, z - 3.4, mat.wood, scene, 16);
      addCyl(1.15, 3.2, x - flip * 5.6, 0.0, z - 2.9, mat.wood, scene, 16);
    }
    addCrateStack(-118, -132, 1);
    addCrateStack( 118,  132, -1);
    addCrateStack(-118,  132, 1);
    addCrateStack( 118, -132, -1);

    // Petits arbustes décoratifs aux coins lointains, hors zone de jeu.
    [[-145,-190], [145,-190], [-145,190], [145,190]].forEach(([x,z]) => {
      addCyl(0.55, 4.5, x, 0.8, z, mat.wood, scene, 10);
      addCone(4.2, 8.5, x, 6.4, z, mat.foliage, scene, 12);
      addCone(3.3, 6.8, x, 10.2, z, mat.foliage, scene, 12);
    });
  }

  addDecorativeRoom();

  /* ── Poches (6 par couloir, style billard anglais) ── */
  function addBilliardPocket(x, z) {
    // Tous les trous ont volontairement la même apparence : impossible de savoir s'il
    // s'agit d'un gain simple/double/triple ou d'un piège avant que la bille tombe dedans.
    const pocketMat = mat.holeRing;

    // Anneau extérieur
    const ring = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R, 0.11, 14, 52), pocketMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.31, z);
    scene.add(ring);

    // Bord intérieur biseauté (laiton léger)
    const inner = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 0.75, 0.055, 10, 40), mat.brass);
    inner.rotation.x = Math.PI / 2;
    inner.position.set(x, 0.32, z);
    scene.add(inner);

    // Fond noir (poche)
    const pocket = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R * 0.68, HOLE_R * 0.78, 0.4, 48), mat.pocket);
    pocket.position.set(x, 0.14, z);
    scene.add(pocket);

    // Ombre portée (disque noir)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(HOLE_R * 0.6, 44),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.34, z);
    scene.add(shadow);

    const holeGlow = new THREE.Mesh(
      new THREE.TorusGeometry(HOLE_R * 1.35, 0.055, 10, 54),
      new THREE.MeshBasicMaterial({ color: 0xffd66e, transparent: true, opacity: 0.36, side: THREE.DoubleSide })
    );
    holeGlow.rotation.x = Math.PI / 2;
    holeGlow.position.set(x, 0.37, z);
    holeGlow.visible = true;
    scene.add(holeGlow);

    // Marqueur rouge affiché uniquement après déclenchement d'un piège.
    // Au départ tous les trous restent identiques : le piège n'est révélé qu'une fois subi.
    const trapMarker = new THREE.Group();
    trapMarker.visible = false;
    trapMarker.position.set(x, 0.52, z);
    const trapBarMat = new THREE.MeshBasicMaterial({
      color: 0xff3030,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });
    const trapBarGeo = new THREE.BoxGeometry(HOLE_R * 2.05, 0.08, 0.18);
    const trapBarA = new THREE.Mesh(trapBarGeo, trapBarMat);
    const trapBarB = new THREE.Mesh(trapBarGeo, trapBarMat.clone());
    trapBarA.rotation.y = Math.PI / 4;
    trapBarB.rotation.y = -Math.PI / 4;
    trapMarker.add(trapBarA, trapBarB);
    scene.add(trapMarker);

    // Marqueur de trou déjà découvert : cyan, sans croix.
    // Il reste visible après le mélange des ressources pour aider à finir les lignes.
    const discoveredMarker = new THREE.Group();
    discoveredMarker.visible = false;
    discoveredMarker.position.set(x, 0.545, z);

    const discoveredMat = new THREE.MeshBasicMaterial({
      color: 0x5ef7ff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const discoveredSoftMat = new THREE.MeshBasicMaterial({
      color: 0xb9ffff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const discoveredOuter = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 1.48, 0.055, 10, 64), discoveredMat);
    discoveredOuter.rotation.x = Math.PI / 2;
    discoveredOuter.position.y = 0.005;
    const discoveredInner = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 1.12, 0.035, 8, 52), discoveredSoftMat);
    discoveredInner.rotation.x = Math.PI / 2;
    discoveredInner.position.y = 0.018;
    const discoveredDot = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), discoveredMat.clone());
    discoveredDot.position.set(HOLE_R * 1.46, 0.08, -HOLE_R * 1.46);
    discoveredMarker.add(discoveredOuter, discoveredInner, discoveredDot);
    scene.add(discoveredMarker);

    return { x, z, ring, inner, pocket, shadow, holeGlow, trapMarker, discoveredMarker };
  }

  function bonusHoleZ(attacker) {
    const defender = enemy(attacker);
    const b = defenseZoneBounds(defender);
    const zoneEdge = attacker === 1 ? Math.min(b.zMin, b.zMax) : Math.max(b.zMin, b.zMax);
    const rampZ = rampSlotPosition(attacker, 1).z;
    return (zoneEdge + rampZ) / 2;
  }

  function createBonusHoleVisual(attacker) {
    const laneX = attackX(attacker);
    const z = bonusHoleZ(attacker);
    const g = new THREE.Group();
    g.position.set(laneX, 0.02, z);

    const outerMat = new THREE.MeshStandardMaterial({ color: 0x7dfcff, metalness: 0.72, roughness: 0.16, emissive: 0x064c55, emissiveIntensity: 0.34 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xffd45a, metalness: 0.55, roughness: 0.22, emissive: 0x5a3200, emissiveIntensity: 0.22 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x62f7ff, transparent: true, opacity: 0.44, side: THREE.DoubleSide, depthWrite: false });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x120a1c, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 1.06, 0.13, 14, 58), outerMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.36;
    g.add(ring);

    const inner = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 0.72, 0.06, 10, 44), innerMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.y = 0.385;
    g.add(inner);

    const pocket = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R * 0.66, HOLE_R * 0.78, 0.40, 48), mat.pocket);
    pocket.position.y = 0.16;
    g.add(pocket);

    const glow = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 1.62, 0.075, 10, 64), glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.46;
    g.add(glow);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(HOLE_R * 0.49, 32), coreMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.43;
    g.add(disc);

    // Point d'interrogation stylisé en petits blocs : léger et lisible sur mobile.
    addBox(0.52, 0.08, 0.16, 0, 0.55, -0.22, markerMat, g);
    addBox(0.16, 0.08, 0.42, 0.18, 0.56, 0.02, markerMat, g);
    addBox(0.34, 0.08, 0.14, 0.02, 0.57, 0.25, markerMat, g);
    addBox(0.16, 0.08, 0.16, 0, 0.58, 0.52, markerMat, g);

    scene.add(g);
    const minX = laneX - CFG.laneW / 2 + 3.1;
    const maxX = laneX + CFG.laneW / 2 - 3.1;
    return {
      attacker,
      x: laneX,
      z,
      y: 0.42,
      minX,
      maxX,
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.028 + Math.random() * 0.038),
      nextSpeedChange: Date.now() + 500 + Math.random() * 1100,
      last: false,
      mesh: g,
      ring,
      glow
    };
  }

  function buildBonusHoles() {
    [1, 2].forEach(attacker => bonusHoles.push(createBonusHoleVisual(attacker)));
  }

  function updateBonusHoles(dt = 1) {
    const now = Date.now();
    bonusHoles.forEach(h => {
      if (now >= h.nextSpeedChange) {
        const direction = Math.random() < 0.42 ? -Math.sign(h.vx || 1) : Math.sign(h.vx || 1);
        h.vx = (direction || 1) * (0.018 + Math.random() * 0.060);
        h.nextSpeedChange = now + 380 + Math.random() * 1350;
      }
      h.x += h.vx * dt;
      if (h.x <= h.minX) { h.x = h.minX; h.vx = Math.abs(h.vx) * (0.78 + Math.random() * 0.55); }
      if (h.x >= h.maxX) { h.x = h.maxX; h.vx = -Math.abs(h.vx) * (0.78 + Math.random() * 0.55); }
      if (h.mesh) {
        h.mesh.position.x = h.x;
        h.mesh.position.z = h.z;
        h.mesh.position.y = Math.sin(_t * 3.2 + h.attacker) * 0.035;
      }
      const pulse = 1 + Math.sin(_t * 5.4 + h.attacker) * 0.095;
      if (h.glow) {
        h.glow.scale.setScalar(pulse);
        h.glow.material.opacity = 0.30 + (Math.sin(_t * 4.8 + h.attacker) + 1) * 0.13;
      }
      if (h.ring) h.ring.scale.setScalar(1 + Math.sin(_t * 4.2 + h.attacker) * 0.025);
    });
  }

  function rollBonusHoleOption() {
    return BONUS_HOLE_OPTIONS[randInt(0, BONUS_HOLE_OPTIONS.length - 1)];
  }

  function queueBonusForNextTurn(player, bonus) {
    const pl = players[player - 1];
    if (!pl || !bonus) return;
    pl.queuedBonusNextTurn = { ...bonus };
    turnSummary.push('Trou bonus J' + player + ' : ' + bonus.summary);
    bigMessage('TROU BONUS OBTENU !', 'Joueur ' + player + '<br>' + bonus.icon + ' ' + bonus.summary, 'jackpot', 2900);
    battleNotice('TROU BONUS J' + player, bonus.icon + ' ' + bonus.summary, 'jackpot', 3900);
    floatText('BONUS<br>' + bonus.icon, ball.position.clone().add(new THREE.Vector3(0, 1.9, 0)), 'jackpot');
    showToast('Bonus J' + player + ' pour son prochain tour<br>' + bonus.icon + ' ' + bonus.label);
  }

  function applyQueuedBonusForPlayer(player) {
    const pl = players[player - 1];
    if (!pl) return;

    pl.bonusSecondShotThisTurn = false;
    pl.bonusDoubleDamageThisTurn = false;

    const bonus = pl.queuedBonusNextTurn;
    pl.queuedBonusNextTurn = null;
    if (!bonus) return;

    if (bonus.resource && bonus.amount) {
      pl.res[bonus.resource] = (pl.res[bonus.resource] || 0) + bonus.amount;
      statForPlayer(player).resources += bonus.amount;
      const icon = RESOURCE_ICONS[bonus.resource] || '';
      bigMessage('BONUS ACTIVÉ J' + player, `${icon} +${bonus.amount} ${RESOURCE_NAMES[bonus.resource] || bonus.resource}`, 'gain', 2100);
      battleNotice('BONUS ACTIVÉ J' + player, icon + ' +' + bonus.amount + ' ' + (RESOURCE_NAMES[bonus.resource] || bonus.resource), 'gain', 3000);
      showToast('Bonus du tour J' + player + '<br>' + icon + ' +' + bonus.amount);
      return;
    }

    if (bonus.id === 'secondShot') {
      pl.bonusSecondShotThisTurn = true;
      bigMessage('BONUS ACTIVÉ J' + player, '⚪ 1 second lancé ce tour', 'second', 2100);
      battleNotice('BONUS ACTIVÉ J' + player, '⚪ Second lancé disponible pour ce tour', 'second', 3000);
      showToast('Bonus du tour J' + player + '<br>Second lancé disponible');
      return;
    }

    if (bonus.id === 'doubleDamage') {
      pl.bonusDoubleDamageThisTurn = true;
      bigMessage('BONUS ACTIVÉ J' + player, '💥 Dégâts doublés ce tour', 'damage', 2100);
      battleNotice('BONUS ACTIVÉ J' + player, '💥 Dégâts doublés en plus des événements', 'damage', 3000);
      showToast('Bonus du tour J' + player + '<br>Dégâts doublés');
    }
  }

  function createHoleLayout() {
    const rows = [24, 44, 64, 84, 104];
    const columns = createHoleColumns(currentDifficulty.holesPerRow);
    const trapPattern = {
      4: [3, 1, 2, 0, 3],
      5: [4, 1, 3, 0, 2],
      6: [5, 1, 4, 0, 2]
    }[currentDifficulty.holesPerRow] || [3, 1, 2, 0, 3];

    return rows.flatMap((dz, rowIndex) => {
      const trapIndex = trapPattern[rowIndex % trapPattern.length];
      return columns.map((relX, colIndex) => ({
        relX,
        dz,
        rowIndex,
        colIndex,
        trap: colIndex === trapIndex
      }));
    });
  }

  function createHoleColumns(count) {
    if (count === 6) return [-9.0, -5.4, -1.8, 1.8, 5.4, 9.0];
    if (count === 5) return [-8.0, -4.0, 0.0, 4.0, 8.0];
    return [-7.5, -2.5, 2.5, 7.5];
  }

  const holeLayout = createHoleLayout();
  const holes = [];
  const sideTheftHoles = [];
  const bonusHoles = [];
  const slopes = [];
  // Une ligne complète est validée une seule fois par joueur et par rangée.
  // Les ressources changent à chaque tour, mais les pièges et les trous découverts restent stables.
  const completedHoleRows = [new Set(), new Set()];
  const RESOURCE_TYPES = ['stone', 'wood', 'gold'];
  const RESOURCE_ICONS = { stone: '🪨', wood: '🪵', gold: '🪙', relic: '🏺' };
  const RESOURCE_NAMES = { stone: 'pierre', wood: 'bois', gold: 'or', relic: 'relique' };
  const RELIC_HOLES_PER_SIDE = 4;
  const RELIC_MARKET_GOLD_VALUE = 5;
  const BONUS_HOLE_CAPTURE_R = HOLE_R + CFG.ballR * 0.52;
  const BONUS_HOLE_OPTIONS = [
    { id: 'secondShot', label: 'Second lancé', icon: '⚪', summary: '1 second lancé au prochain tour' },
    { id: 'wood5',      label: '+5 bois',       icon: '🪵', resource: 'wood',  amount: 5, summary: '+5 bois au prochain tour' },
    { id: 'stone5',     label: '+5 pierres',    icon: '🪨', resource: 'stone', amount: 5, summary: '+5 pierres au prochain tour' },
    { id: 'gold5',      label: '+5 or',         icon: '🪙', resource: 'gold',  amount: 5, summary: '+5 or au prochain tour' },
    { id: 'doubleDamage', label: 'Dégâts doublés', icon: '💥', summary: 'dégâts doublés au prochain tour' }
  ];
  const DEBRIS_CLEAR_COST = { gold: 1 };
  const DEBRIS_RADIUS = 2.25;
  const DEBRIS_STAGE_RADII = [0, 2.25, 2.82, 3.45];
  const DEBRIS_STAGE_LABELS = ['', 'gros tas', 'tas éclaté', 'gravats éparpillés'];
  const DEBRIS_FOCUS_DURATION = 1850;
  const TURN_INTRO_CAMERA_DURATION = 9200;
  const KIT_CAPTURE_R = 1.75;
  const KIT_REPAIR_AMOUNT = 25;
  const REGULAR_REPAIR_AMOUNT = 40;
  const KIT_REBUILD_RATIO = 0.50;
  const KIT_SPAWN_CHANCE = { easy: 0.22, medium: 0.18, hard: 0.14 };
  const MUD_ZONES_PER_PLAYER = 3;
  const MUD_RADIUS = 3.2;
  // Rayon de validation adapté à la taille de la bille : avec une bille plus petite,
  // un trou ne doit pas aspirer la bille quand elle passe juste à côté.
  const MAIN_HOLE_CAPTURE_R = HOLE_R + CFG.ballR * 0.45;
  const SIDE_THEFT_HOLE_CAPTURE_R = HOLE_R + CFG.ballR * 0.82;

  // Zones de construction des tours de défense.
  // On garde l'ancienne grande zone bleue continue ET on ajoute les zones fines
  // entre chaque ligne de trous/pièges. Résultat : le joueur peut toujours placer
  // une tour dans la zone défensive principale, tout en voyant mieux les emplacements
  // tactiques recommandés entre les rangées.
  const DEFENSE_ZONE = {
    halfWidth: CFG.laneW / 2 - 2.45,
    zMinP1: 14,
    zMaxP1: 52,
    zMinP2: -52,
    zMaxP2: -14,
    rowSafetyMargin: 5.15,
    minDepth: 6.4,
    maxDepth: 10.4
  };

  const zoneMarkers = [];

  function updateZoneMarkerVisibility() {
    const hasPendingConstruction = !!(typeof pendingWorldAction !== 'undefined' && pendingWorldAction && pendingWorldAction.type);
    zoneMarkers.forEach(marker => {
      const ud = marker.userData || {};
      let visible = false;

      // Les zones de construction ne sont plus affichées en permanence.
      // Elles apparaissent uniquement pendant l'action concernée : tours ou rampes.
      if (gameStarted && !gameOver) {
        if ((setupMode || placingTower || phase === 'setup') && ud.zoneKind === 'defenseTower') {
          visible = ud.player === active;
        } else if (hasPendingConstruction) {
          if (pendingWorldAction.type === 'build-side-ramp') {
            visible = ud.zoneKind === 'sideRamp' && ud.player === active;
          } else if (pendingWorldAction.type === 'build-classic-ramp') {
            visible = ud.zoneKind === 'castleRamp' && ud.player === active;
          }
        }
      }

      marker.visible = !!visible;
    });
  }

  const matchStats = [
    { turns: 0, resources: 0, damage: 0, partsDestroyed: 0, towersDestroyed: 0, holesHit: 0, combos: 0, edgeSteals: 0, secondShots: 0, relicsFound: 0 },
    { turns: 0, resources: 0, damage: 0, partsDestroyed: 0, towersDestroyed: 0, holesHit: 0, combos: 0, edgeSteals: 0, secondShots: 0, relicsFound: 0 }
  ];
  let matchTurns = 0; // Numéro de manche : J1 + J2 jouent tous les deux le même tour.
  let activeTurnEvent = null;
  let turnEventDeck = [];
  let rampCameraFocus = null;
  const aiShotMemory = { type: '', x: 9999, z: 9999, repeat: 0, lastSideIndex: -1, lastClassicSlot: -1 };

  function createShotState() {
    return {
      towerDestroyed: false,
      comboSiegeUsed: false,
      backEdgePenalty: false,
      damageEventUsed: false,
      bonusDamageUsed: false,
    };
  }

  let currentShot = createShotState();

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function makeHoleReward() {
    const roll = Math.random();
    // Les gains dépendent de la difficulté : facile 1-8, moyen 2-8, difficile 3-8.
    // Parfois double, rarement triple.
    const count = roll < 0.10 ? 3 : (roll < 0.35 ? 2 : 1);
    const chosen = shuffle(RESOURCE_TYPES).slice(0, count);
    const reward = {};
    chosen.forEach(type => reward[type] = randInt(currentDifficulty.gainMin, currentDifficulty.gainMax));
    return reward;
  }

  function holeRewardLabel(reward) {
    return Object.entries(reward || {}).map(([type, amount]) => {
      const name = RESOURCE_NAMES[type] || type;
      return amount + ' ' + name + (type === 'stone' && amount > 1 ? 's' : '');
    }).join(' + ');
  }

  function activateHoleGlow(h) {
    // Tous les trous attirent légèrement l'œil, sans révéler s'ils donnent une ressource ou un piège.
    if (h.holeGlow) {
      h.holeGlow.visible = true;
      h.holeGlow.material.opacity = 0.28;
    }
  }

  function updateHoleTrapVisual(h) {
    if (!h) return;
    const revealed = !!(h.baseTrap && h.trap && h.trapKnown);
    if (h.trapMarker) h.trapMarker.visible = revealed;
    if (h.holeGlow && h.holeGlow.material && h.holeGlow.material.color) {
      const color = revealed ? 0xff3030 : (h.discovered ? 0x62f7ff : (h.relicKnown ? 0xfff06a : 0xffd65a));
      h.holeGlow.material.color.setHex(color);
      h.holeGlow.material.opacity = h.discovered ? 0.40 : 0.26;
    }
    if (h.ring && h.ring.material && h.ring.material.emissive) {
      h.ring.material.emissive.setHex(revealed ? 0x3a0000 : (h.discovered ? 0x003a44 : 0x1c1200));
      h.ring.material.emissiveIntensity = h.discovered ? 0.38 : 0.18;
    }
    updateHoleDiscoveredVisual(h);
  }

  function updateHoleDiscoveredVisual(h) {
    if (!h || !h.discoveredMarker) return;
    h.discoveredMarker.visible = !!h.discovered;
    if (h.discoveredMarker.visible) {
      const scale = h.baseTrap && h.trapKnown ? 1.08 : 1.0;
      h.discoveredMarker.scale.setScalar(scale);
    }
  }

  function holeRowKey(h) {
    if (!h) return '';
    return String(Number.isFinite(h.rowIndex) ? h.rowIndex : h.dz);
  }

  function markHoleDiscovered(h) {
    if (!h) return;
    const wasNew = !h.discovered;
    h.discovered = true;
    updateHoleTrapVisual(h);
    updateHoleDiscoveredVisual(h);
    if (wasNew) {
      progressStory('Trou découvert', 'Ce trou reste marqué pour finir une ligne.', '🕳️');
      checkCompletedHoleRow(h.player, holeRowKey(h));
    }
  }

  function checkCompletedHoleRow(player, rowKey) {
    const doneSet = completedHoleRows[player - 1];
    if (!doneSet || doneSet.has(rowKey)) return false;
    const row = holes.filter(h => h.player === player && holeRowKey(h) === rowKey);
    if (!row.length || row.some(h => !h.discovered)) return false;
    doneSet.add(rowKey);
    grantCompletedHoleRowBonus(player, row.length);
    return true;
  }

  function grantCompletedHoleRowBonus(player, rowSize = 0) {
    const pl = players[player - 1];
    if (!pl) return;

    const choices = ['doubleResources', 'secondBall', 'freeTower', 'gold', 'wood', 'stone'];
    const choice = choices[randInt(0, choices.length - 1)];
    let title = 'LIGNE DE TROUS COMPLÈTE !';
    let detail = 'J' + player + ' a découvert toute une ligne' + (rowSize ? ' · ' + rowSize + ' trous' : '');
    let icon = '🕳️';

    if (choice === 'doubleResources') {
      const before = { stone: pl.res.stone || 0, wood: pl.res.wood || 0, gold: pl.res.gold || 0 };
      RESOURCE_TYPES.forEach(type => {
        const amount = before[type] || 0;
        if (amount > 0) {
          pl.res[type] += amount;
          statForPlayer(player).resources += amount;
        }
      });
      icon = '✨';
      detail += '<br>✨ Ressources x2';
      animateResourceReward(before, ball.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
    } else if (choice === 'secondBall') {
      pl.extraShotsLeft = Math.max(pl.extraShotsLeft || 0, 1);
      pl.bonusSecondShotThisTurn = true;
      icon = '⚪';
      detail += '<br>⚪ Seconde bille gagnée';
    } else if (choice === 'freeTower') {
      pl.freeTowerBuilds = (pl.freeTowerBuilds || 0) + 1;
      icon = '🗼';
      detail += '<br>🗼 1 reconstruction de tour gratuite';
    } else {
      const amount = 5;
      pl.res[choice] = (pl.res[choice] || 0) + amount;
      statForPlayer(player).resources += amount;
      icon = RESOURCE_ICONS[choice] || '🎁';
      detail += '<br>' + icon + ' +5 ' + (RESOURCE_NAMES[choice] || choice);
      animateResourceReward({ [choice]: amount }, ball.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
    }

    turnSummary.push('Ligne complète : ' + icon + ' bonus');
    impact(ball.position, 0x56f7ff, 2.2);
    playRandomSfx('lineComplete', 'jackpot', 1.45);
    bigMessage(title, detail, 'jackpot', 3000);
    battleNotice('LIGNE COMPLÈTE', icon + ' Bonus de découverte pour J' + player, 'jackpot', 3600);
    celebrateMicroMoment('LIGNE COMPLÈTE !', icon + ' Bonus débloqué', 'jackpot', ball.position.clone().add(new THREE.Vector3(0, 1.4, 0)), ['🕳️', icon, '✨', '🎁'], 38);
    playJuiceChord('victory', 1.45);
    floatText('LIGNE !<br>' + icon, ball.position.clone().add(new THREE.Vector3(0, 2.2, 0)), 'jackpot');
    updateHUD();
  }

  function resetRelicHolesForMatch() {
    completedHoleRows.forEach(set => set.clear());
    holes.forEach(h => {
      h.relic = false;
      h.relicFound = false;
      h.relicKnown = false;
      h.discovered = false;
      h.trapKnown = false;
      h.trap = !!h.baseTrap;
      updateHoleTrapVisual(h);
      updateHoleDiscoveredVisual(h);
    });

    // Les reliques sont tirées une seule fois au début de la partie.
    // Elles ne remplacent jamais un piège : les pièges restent exactement au même endroit toute la partie.
    [1, 2].forEach(player => {
      shuffle(holes.filter(h => h.player === player && !h.baseTrap)).slice(0, RELIC_HOLES_PER_SIDE).forEach(h => {
        h.relic = true;
        h.relicFound = false;
        h.relicKnown = false;
        h.trap = false;
        h.reward = null;
        h.kind = 'relique cachée';
        updateHoleTrapVisual(h);
        updateHoleDiscoveredVisual(h);
      });
    });
  }

  function rerollHoleRewards() {
    holes.forEach(h => {
      h.last = false;
      activateHoleGlow(h);
      if (h.relic && !h.relicFound) {
        h.trap = false;
        h.reward = null;
        h.kind = 'relique cachée';
      } else if (h.baseTrap) {
        // Piège fixe : sa position ne change jamais. Seule sa révélation visuelle peut évoluer.
        h.trap = true;
        h.reward = null;
        h.kind = h.trapKnown ? 'piège révélé' : 'trou inconnu';
      } else {
        h.trap = false;
        h.reward = makeHoleReward();
        h.kind = holeRewardLabel(h.reward);
      }
      updateHoleTrapVisual(h);
      updateHoleDiscoveredVisual(h);
    });
  }

  function startZ(p) { return p === 1 ? 92 : -92; }
  function dir(p) { return p === 1 ? -1 : 1; }
  function castleX(p) { return p === 1 ? CFG.leftX : CFG.rightX; }
  function castleZ(p) { return p === 1 ? CFG.p1CastleZ : CFG.p2CastleZ; }
  function attackX(p) { return p === 1 ? CFG.rightX : CFG.leftX; }
  function defenseX(p) { return p === 1 ? CFG.leftX : CFG.rightX; }
  function enemy(p) { return p === 1 ? 2 : 1; }

  function defenseZoneBounds(player) {
    return player === 1
      ? { x: defenseX(player), zMin: DEFENSE_ZONE.zMinP1, zMax: DEFENSE_ZONE.zMaxP1 }
      : { x: defenseX(player), zMin: DEFENSE_ZONE.zMinP2, zMax: DEFENSE_ZONE.zMaxP2 };
  }

  function defenseHoleRowsForPlayer(player) {
    // Le couloir de défense d'un joueur est le couloir d'attaque de l'adversaire.
    // On récupère donc les rangées de trous adverses pour créer des bandes fines entre elles.
    const attacker = enemy(player);
    return [...new Set(holeLayout.map(spec => startZ(attacker) + dir(attacker) * spec.dz))]
      .sort((a, b) => a - b);
  }

  function defenseTowerMainBuildZone(player) {
    const b = defenseZoneBounds(player);
    const depth = Math.abs(b.zMax - b.zMin);
    return {
      index: 'main',
      type: 'main',
      x: b.x,
      xMin: b.x - DEFENSE_ZONE.halfWidth,
      xMax: b.x + DEFENSE_ZONE.halfWidth,
      zMin: Math.min(b.zMin, b.zMax),
      zMax: Math.max(b.zMin, b.zMax),
      z: (b.zMin + b.zMax) / 2,
      w: DEFENSE_ZONE.halfWidth * 2,
      d: depth,
      label: 'Zone principale'
    };
  }

  function defenseTowerFineBuildZones(player) {
    const rows = defenseHoleRowsForPlayer(player);
    const zones = [];

    // Une zone par espace entre deux rangées de trous/pièges.
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i];
      const b = rows[i + 1];
      const gap = Math.abs(b - a);
      const depth = THREE.MathUtils.clamp(gap - DEFENSE_ZONE.rowSafetyMargin * 2, DEFENSE_ZONE.minDepth, DEFENSE_ZONE.maxDepth);
      const centerZ = (a + b) / 2;
      zones.push({
        index: i,
        type: 'fine',
        x: defenseX(player),
        xMin: defenseX(player) - DEFENSE_ZONE.halfWidth,
        xMax: defenseX(player) + DEFENSE_ZONE.halfWidth,
        zMin: centerZ - depth / 2,
        zMax: centerZ + depth / 2,
        z: centerZ,
        w: DEFENSE_ZONE.halfWidth * 2,
        d: depth,
        label: `Zone tour ${i + 1}`
      });
    }

    return zones;
  }

  function defenseTowerBuildZones(player) {
    // Important : la zone principale est dessinée/valide, les zones fines sont ajoutées par-dessus.
    return [defenseTowerMainBuildZone(player), ...defenseTowerFineBuildZones(player)];
  }

  function zoneContains(zone, x, z) {
    return !!zone && x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax;
  }

  function towerBuildZoneAt(player, x, z) {
    // Les zones fines sont prioritaires pour le guidage visuel, puis la grande zone existante reste valide.
    return defenseTowerFineBuildZones(player).find(zone => zoneContains(zone, x, z))
      || (zoneContains(defenseTowerMainBuildZone(player), x, z) ? defenseTowerMainBuildZone(player) : null);
  }

  function nearestTowerBuildZone(player, x, z) {
    const fineZones = defenseTowerFineBuildZones(player);
    const exactFine = fineZones.find(zone => zoneContains(zone, x, z));
    if (exactFine) {
      return {
        zone: exactFine,
        x: THREE.MathUtils.clamp(x, exactFine.xMin + 1.3, exactFine.xMax - 1.3),
        z: THREE.MathUtils.clamp(z, exactFine.zMin + 1.2, exactFine.zMax - 1.2)
      };
    }

    const main = defenseTowerMainBuildZone(player);
    if (zoneContains(main, x, z)) {
      return {
        zone: main,
        x: THREE.MathUtils.clamp(x, main.xMin + 1.3, main.xMax - 1.3),
        z: THREE.MathUtils.clamp(z, main.zMin + 1.2, main.zMax - 1.2)
      };
    }

    const zones = fineZones.length ? fineZones : [main];
    let best = zones[0];
    zones.forEach(zone => {
      const dx = Math.max(zone.xMin - x, 0, x - zone.xMax);
      const dz = Math.max(zone.zMin - z, 0, z - zone.zMax);
      const bdX = Math.max(best.xMin - x, 0, x - best.xMax);
      const bdZ = Math.max(best.zMin - z, 0, z - best.zMax);
      if (dx * dx + dz * dz < bdX * bdX + bdZ * bdZ) best = zone;
    });
    return {
      zone: best,
      x: THREE.MathUtils.clamp(x, best.xMin + 1.3, best.xMax - 1.3),
      z: THREE.MathUtils.clamp(z, best.zMin + 1.2, best.zMax - 1.2)
    };
  }

  function sideRidgeIndexes() {
    return [0, 1];
  }

  function sideRidgeSideSign(attacker, sideIndex = 0) {
    const exterior = attackX(attacker) >= 0 ? 1 : -1;
    return sideIndex === 0 ? exterior : -exterior;
  }

  function sideRidgeLabel(sideIndex = 0) {
    return sideIndex === 0 ? 'extérieure' : 'intérieure';
  }

  function sideRidgeX(attacker, sideIndex = 0) {
    return attackX(attacker) + sideRidgeSideSign(attacker, sideIndex) * SIDE_RIDGE.xOffset;
  }

  function sideRidgeFrontZ(attacker) {
    const defender = enemy(attacker);
    return castleZ(defender) - dir(attacker) * (BUTTE.d / 2);
  }

  function sideRidgeStartZ(attacker) {
    return sideRidgeFrontZ(attacker) - dir(attacker) * SIDE_RIDGE.length;
  }

  function sideRidgeEndZ(attacker) {
    return dir(attacker) < 0
      ? -CFG.laneL / 2 + SIDE_RIDGE.backMargin
      :  CFG.laneL / 2 - SIDE_RIDGE.backMargin;
  }

  function sideRidgeRunLength(attacker) {
    return Math.abs(sideRidgeEndZ(attacker) - sideRidgeStartZ(attacker));
  }

  function sideRidgeCenterZ(attacker) {
    return (sideRidgeStartZ(attacker) + sideRidgeEndZ(attacker)) / 2;
  }

  function sideRidgeBounds(attacker, sideIndex = 0) {
    const start = sideRidgeStartZ(attacker);
    const front = sideRidgeFrontZ(attacker);
    const end = sideRidgeEndZ(attacker);
    return {
      x: sideRidgeX(attacker, sideIndex),
      zMin: Math.min(start, end) - 0.55,
      zMax: Math.max(start, end) + 0.85,
      zStart: start,
      zFront: front,
      zEnd: end,
      sideIndex
    };
  }

  function sideRidgeHitForAttacker(attacker, x, z, extra = 0) {
    for (const sideIndex of sideRidgeIndexes()) {
      const b = sideRidgeBounds(attacker, sideIndex);
      if (Math.abs(x - b.x) <= SIDE_RIDGE.width / 2 + extra && z >= b.zMin - extra && z <= b.zMax + extra) return b;
    }
    return null;
  }

  function isOnSideRidgeForAttacker(attacker, x, z, extra = 0) {
    return !!sideRidgeHitForAttacker(attacker, x, z, extra);
  }

  function sideRampPosition(attacker, sideIndex = 0) {
    const exitZ = sideRidgeStartZ(attacker) + dir(attacker) * SIDE_RIDGE.entryOverlap;
    return new THREE.Vector3(sideRidgeX(attacker, sideIndex), 0.34, exitZ - dir(attacker) * RAMP.halfLength);
  }

  function buildSideRidges() {
    [1, 2].forEach(attacker => {
      sideRidgeIndexes().forEach(sideIndex => {
        const x = sideRidgeX(attacker, sideIndex);
        const z = sideRidgeCenterZ(attacker);
        const len = sideRidgeRunLength(attacker);
        const sideSign = sideRidgeSideSign(attacker, sideIndex);
        const ridge = addBox(SIDE_RIDGE.width, BUTTE.h, len + 1.6, x, BUTTE.h / 2, z, mat.butte);
        ridge.name = 'butte_laterale_j' + attacker + '_' + sideRidgeLabel(sideIndex);

        // Dessus lisible : la butte latérale devient un couloir haut vers le fond du plateau.
        addBox(SIDE_RIDGE.width + 0.35, 0.07, len + 1.7, x, BUTTE.h + 0.055, z, mat.slopeTop);

        // Rebord intérieur anti-château : la bille reste dans ce couloir et ne peut pas partir taper le château.
        addBox(0.34, 1.05, len + 1.25, x - sideSign * (SIDE_RIDGE.width / 2 + 0.10), BUTTE.h + 0.54, z, mat.rail);
        // Petit rebord extérieur visuel, plus bas, pour renforcer l'effet couloir.
        addBox(0.20, 0.46, len + 1.15, x + sideSign * (SIDE_RIDGE.width / 2 + 0.05), BUTTE.h + 0.27, z, mat.wood);
      });
    });
  }



  function debrisRandom(seed = 1) {
    let t = (seed >>> 0) || 1;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function debrisRoofMaterialForDefender(defender) {
    return defender === 1 ? mat.roofR : mat.roofB;
  }

  function addDebrisBlock(group, rand, material, radius = 1.1, sizeMul = 1) {
    const a = rand() * Math.PI * 2;
    const rr = 0.12 + rand() * radius;
    const w = (0.34 + rand() * 0.92) * sizeMul;
    const h = (0.14 + rand() * 0.48) * sizeMul;
    const d = (0.32 + rand() * 0.82) * sizeMul;
    const block = addBox(w, h, d, Math.cos(a) * rr, h / 2, Math.sin(a) * rr, material, group);
    block.rotation.y = a + rand() * Math.PI;
    block.rotation.x = (rand() - 0.5) * 0.22;
    block.rotation.z = (rand() - 0.5) * 0.22;
    return block;
  }

  function addDebrisBeam(group, rand, material, radius = 1.05, lengthMul = 1) {
    const a = rand() * Math.PI * 2;
    const rr = 0.10 + rand() * radius;
    const len = (1.05 + rand() * 1.35) * lengthMul;
    const h = 0.16 + rand() * 0.16;
    const beam = addBox(0.22 + rand() * 0.18, h, len, Math.cos(a) * rr, h / 2 + rand() * 0.08, Math.sin(a) * rr, material, group);
    beam.rotation.y = a + (rand() - 0.5) * 1.2;
    beam.rotation.x = (rand() - 0.5) * 0.18;
    beam.rotation.z = (rand() - 0.5) * 0.16;
    return beam;
  }

  function addRoofShard(group, rand, material, radius = 1.05) {
    const a = rand() * Math.PI * 2;
    const rr = 0.15 + rand() * radius;
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.32 + rand() * 0.42, 0.22 + rand() * 0.20, 4),
      material
    );
    shard.position.set(Math.cos(a) * rr, 0.22 + rand() * 0.16, Math.sin(a) * rr);
    shard.rotation.y = a + Math.PI / 4 + rand() * 0.7;
    shard.rotation.x = (rand() - 0.5) * 0.35;
    shard.rotation.z = (rand() - 0.5) * 0.35;
    shard.castShadow = shard.receiveShadow = true;
    group.add(shard);
    return shard;
  }

  function addDebrisDust(group, rand, radius, opacity = 0.18) {
    const dust = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 32),
      new THREE.MeshBasicMaterial({ color: 0x140c06, transparent: true, opacity, side: THREE.DoubleSide })
    );
    dust.rotation.x = -Math.PI / 2;
    dust.rotation.z = rand() * Math.PI;
    dust.position.y = 0.02;
    group.add(dust);
    return dust;
  }

  function createDebrisVisual(x, z, seed = 0, defender = 0, label = 'Décombres', stage = 1, y = 0.34) {
    const rand = debrisRandom(seed + stage * 7777);
    const g = new THREE.Group();
    g.position.set(x, y, z);

    // Plus le joueur tape dedans, plus le tas s'étale visuellement et mécaniquement.
    const variant = Math.floor(rand() * 5);
    const roofMat = debrisRoofMaterialForDefender(defender);
    const spread = stage === 1 ? 1.0 : (stage === 2 ? 1.35 : 1.75);
    const flat = stage === 1 ? 1.0 : (stage === 2 ? 0.78 : 0.58);
    const dustRadius = (DEBRIS_STAGE_RADII[stage] || DEBRIS_RADIUS) * 0.92;
    g.userData.debrisVariant = variant;
    g.userData.debrisStage = stage;
    g.userData.label = label;

    if (variant === 0) {
      for (let i = 0; i < 10 + stage * 4; i++) addDebrisBlock(g, rand, rand() < 0.38 ? mat.destroyed : mat.rubble, 1.20 * spread, 0.92 * flat);
      for (let i = 0; i < 2 + stage; i++) addDebrisBeam(g, rand, mat.wood, 0.92 * spread, 0.70 + stage * 0.10);
      addDebrisDust(g, rand, dustRadius, 0.16 + stage * 0.035);
    } else if (variant === 1) {
      for (let i = 0; i < 4 + stage; i++) {
        const slab = addDebrisBlock(g, rand, i % 2 ? mat.damaged : mat.stoneDark, 0.78 * spread, 1.18 * flat);
        slab.scale.x *= 1.34 + stage * 0.10;
        slab.scale.z *= 0.72 + stage * 0.12;
      }
      for (let i = 0; i < 6 + stage * 3; i++) addDebrisBlock(g, rand, mat.rubble, 1.18 * spread, 0.66 * flat);
      addDebrisDust(g, rand, dustRadius, 0.18 + stage * 0.03);
    } else if (variant === 2) {
      for (let i = 0; i < 4 + stage * 2; i++) addRoofShard(g, rand, roofMat, 1.00 * spread);
      for (let i = 0; i < 5 + stage * 3; i++) addDebrisBlock(g, rand, rand() < 0.5 ? mat.destroyed : mat.rubble, 1.05 * spread, 0.68 * flat);
      for (let i = 0; i < 1 + stage; i++) addDebrisBeam(g, rand, mat.roofTrim, 0.85 * spread, 0.72 + stage * 0.08);
      addDebrisDust(g, rand, dustRadius, 0.16 + stage * 0.03);
    } else if (variant === 3) {
      for (let i = 0; i < 5 + stage * 3; i++) addDebrisBeam(g, rand, i % 3 === 0 ? mat.rail : mat.wood, 1.03 * spread, 0.90 + stage * 0.12);
      for (let i = 0; i < 6 + stage * 2; i++) addDebrisBlock(g, rand, i % 2 ? mat.rubble : mat.destroyed, 1.0 * spread, 0.62 * flat);
      addDebrisDust(g, rand, dustRadius, 0.15 + stage * 0.03);
    } else {
      for (let i = 0; i < 9 + stage * 3; i++) addDebrisBlock(g, rand, i % 3 === 0 ? mat.stoneDark : mat.rubble, 0.82 * spread, 0.94 * flat);
      for (let i = 0; i < 3 + stage * 2; i++) addDebrisBlock(g, rand, mat.destroyed, 0.58 * spread, 1.05 * flat);
      addDebrisDust(g, rand, dustRadius, 0.19 + stage * 0.035);
    }

    if (stage >= 3) {
      for (let i = 0; i < 10; i++) addDebrisBlock(g, rand, rand() < 0.65 ? mat.rubble : mat.destroyed, 2.55, 0.42);
    }

    g.rotation.y = rand() * Math.PI * 2;
    scene.add(g);
    return g;
  }

  function debrisStageRadius(stage) {
    return DEBRIS_STAGE_RADII[Math.max(1, Math.min(3, stage || 1))] || DEBRIS_RADIUS;
  }

  function generateDebrisFragments(seed, stage) {
    const out = [];
    if (stage < 2) return out;
    const rand = debrisRandom(seed + stage * 9151);
    const count = stage === 2 ? 4 : 9;
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const rr = (stage === 2 ? 0.75 : 1.05) + rand() * (stage === 2 ? 1.45 : 2.35);
      out.push({ ox: Math.cos(a) * rr, oz: Math.sin(a) * rr, r: (stage === 2 ? 0.52 : 0.42) + rand() * (stage === 2 ? 0.32 : 0.38) });
    }
    return out;
  }

  function refreshDebrisVisual(debris) {
    if (!debris) return;
    if (debris.mesh && debris.mesh.parent) debris.mesh.parent.remove(debris.mesh);
    debris.radius = debrisStageRadius(debris.stage);
    debris.fragments = generateDebrisFragments(debris.visualSeed, debris.stage);
    debris.mesh = createDebrisVisual(debris.x, debris.z, debris.visualSeed, enemy(debris.attacker || active), debris.label, debris.stage, debris.y || 0.34);
  }

  function evolveDebris(debris) {
    if (!debris) return;
    if (!debris.stage) debris.stage = 1;
    if (debris.stage < 3) {
      debris.stage++;
      refreshDebrisVisual(debris);
      turnSummary.push('Décombres étalés : ' + DEBRIS_STAGE_LABELS[debris.stage]);
      floatText(debris.stage === 2 ? 'DÉCOMBRES<br>ÉCLATÉS' : 'GRAVATS<br>ÉPARPILLÉS', ball.position.clone().add(new THREE.Vector3(0, 1.6, 0)), 'damage');
      bigMessage(debris.stage === 2 ? 'DÉCOMBRES ÉCLATÉS' : 'GRAVATS ÉPARPILLÉS', 'Le couloir devient plus difficile à traverser.<br><small>Déblayage conseillé : 1 🪙 or</small>', 'damage', 1600);
    } else {
      turnSummary.push('Gravats heurtés : couloir toujours encombré');
      floatText('GRAVATS', ball.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 'damage');
    }
  }

  function laneDebris(attacker) {
    const pl = players[attacker - 1];
    if (!Array.isArray(pl.attackDebris)) pl.attackDebris = [];
    return pl.attackDebris;
  }

  function debrisLaneForDestroyedDefense(player) {
    // Les décombres d'une défense J1 sont dans le couloir d'attaque de J2, et inversement.
    return enemy(player);
  }

  function findDebrisNearPositionInLane(attacker, pos, extra = 1.2) {
    if (!pos) return null;
    return laneDebris(attacker).find(debris => {
      if (!debris || !debris.mesh) return false;
      const limit = (debris.radius || DEBRIS_RADIUS) + extra;
      return Math.hypot(debris.x - pos.x, debris.z - pos.z) <= limit;
    }) || null;
  }

  function findDefenseDebrisAt(player, pos, extra = 1.2) {
    return findDebrisNearPositionInLane(debrisLaneForDestroyedDefense(player), pos, extra);
  }

  function isOnDefenseDebris(player, x, z) {
    return !!findDefenseDebrisAt(player, { x, z }, 1.35);
  }

  function consumeDebris(debris) {
    if (!debris) return false;
    const attacker = debris.attacker || active;
    const list = laneDebris(attacker);
    const idx = list.indexOf(debris);
    if (idx >= 0) list.splice(idx, 1);
    removeDebris(debris);
    return true;
  }

  function spawnDebrisInAttackLane(attacker, position, label = 'Décombres', meta = {}) {
    if (!position || !players[attacker - 1]) return null;
    const laneX = attackX(attacker);
    const x = THREE.MathUtils.clamp(position.x, laneX - CFG.laneW / 2 + DEBRIS_RADIUS + 0.8, laneX + CFG.laneW / 2 - DEBRIS_RADIUS - 0.8);
    const z = THREE.MathUtils.clamp(position.z, -CFG.laneL / 2 + DEBRIS_RADIUS + 1.4, CFG.laneL / 2 - DEBRIS_RADIUS - 1.4);
    // Les décombres issus du château doivent rester visibles sur la butte, pas être créés au sol sous le volume de la butte.
    const sourceY = Number.isFinite(position.y) ? position.y : 0;
    const defender = enemy(attacker);
    const onCastleButte = sourceY > BUTTE.h + 0.9
      && Math.abs(x - castleX(defender)) < BUTTE.w / 2 + 1.2
      && Math.abs(z - castleZ(defender)) < BUTTE.d / 2 + 3.0;
    const y = onCastleButte ? BUTTE.h + 0.38 : 0.34;
    const debris = {
      attacker,
      x,
      z,
      y,
      onButte: onCastleButte,
      stage: 1,
      radius: DEBRIS_RADIUS,
      fragments: [],
      label,
      sourceType: meta.sourceType || null,
      sourcePlayer: meta.sourcePlayer || null,
      sourceIndex: Number.isInteger(meta.sourceIndex) ? meta.sourceIndex : null,
      hitCooldown: 0,
      visualSeed: Math.floor(Math.random() * 1000000) + laneDebris(attacker).length + attacker * 101,
      mesh: null
    };
    debris.mesh = createDebrisVisual(x, z, debris.visualSeed, enemy(attacker), label, debris.stage, y);
    laneDebris(attacker).push(debris);
    if (phase === 'attack' && shotStarted && attacker === active) {
      if (!Array.isArray(shotCreatedDebris)) shotCreatedDebris = [];
      shotCreatedDebris.push(debris);
    }
    return debris;
  }

  function removeDebris(debris) {
    if (!debris) return;
    if (debris.mesh && debris.mesh.parent) debris.mesh.parent.remove(debris.mesh);
    debris.mesh = null;
  }

  function clearDebrisForPlayer(player) {
    const list = laneDebris(player);
    list.forEach(removeDebris);
    list.length = 0;
  }

  function activeDebrisCount() {
    return laneDebris(active).filter(d => d && d.mesh).length;
  }

  function activeDebrisOptions() {
    return laneDebris(active)
      .map((debris, index) => ({ debris, index }))
      .filter(item => item.debris && item.debris.mesh);
  }

  function debrisDisplayName(debris, index = 0) {
    const base = debris && debris.label ? debris.label : 'Décombre';
    const stage = debris && debris.stage ? DEBRIS_STAGE_LABELS[Math.max(1, Math.min(3, debris.stage))] : '';
    return 'Décombre ' + (index + 1) + ' · ' + base + (stage ? ' · ' + stage : '');
  }

  function canClearActiveDebris() {
    return gameStarted && !gamePaused && !isAITurn() && !gameOver && !turnLocked && !setupMode && phase === 'attack' && !shotStarted && activeDebrisCount() > 0 && canPay(players[active - 1].res, DEBRIS_CLEAR_COST);
  }

  function clearSelectedDebris(debris, index = -1, options = {}) {
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || gameOver) return false;
    const list = laneDebris(active);
    const idx = index >= 0 ? index : list.indexOf(debris);
    if (idx < 0 || !list[idx] || !list[idx].mesh) {
      showToast('Décombre introuvable');
      return false;
    }
    const pl = players[active - 1];
    if (!pay(pl.res, DEBRIS_CLEAR_COST)) {
      showToast('Déblayage impossible<br>Il faut 1 🪙 or par décombre');
      return false;
    }
    const removed = list[idx];
    removeDebris(removed);
    list.splice(idx, 1);
    turnSummary.push('Décombre déblayé : -1 or');
    playSfx('repair', 1.0);
    const name = debrisDisplayName(removed, idx);
    if (!options.silent) battleNotice('DÉCOMBRE DÉBLAYÉ', name + ' · coût 1 🪙', 'gain', 1700);
    showToast('Décombre retiré<br>-1 🪙 or');
    updateHUD();
    return true;
  }

  function worstDebrisForPlayer(player) {
    const list = laneDebris(player).filter(d => d && d.mesh);
    if (!list.length) return null;
    return list.slice().sort((a, b) => {
      const scoreA = (a.stage || 1) * 100 - Math.abs(a.z - startZ(player));
      const scoreB = (b.stage || 1) * 100 - Math.abs(b.z - startZ(player));
      return scoreB - scoreA;
    })[0];
  }

  function clearActiveAttackDebris() {
    // Utilisé surtout par l'IA : depuis le nouveau système, 1 or retire 1 seul décombre.
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || gameOver) return false;
    const target = worstDebrisForPlayer(active);
    if (!target) {
      showToast('Aucun décombre<br>Couloir libre');
      return false;
    }
    return clearSelectedDebris(target, laneDebris(active).indexOf(target), { silent: true });
  }

  function openDebrisChoice() {
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || dragging || gameOver || isAITurn()) return;
    const options = activeDebrisOptions();
    if (!options.length) {
      showToast('Aucun décombre<br>Couloir libre');
      return;
    }
    if (!rampChoiceOverlay || !rampChoiceList) return;
    const affordable = canPay(players[active - 1].res, DEBRIS_CLEAR_COST);
    if (rampChoiceTitle) rampChoiceTitle.textContent = '🧹 Choisir un décombre';
    if (rampChoiceSubtitle) rampChoiceSubtitle.textContent = 'Chaque décombre retiré coûte 1 or. Choisis une cible, puis clique dessus sur le plateau.';
    rampChoiceList.innerHTML = options.map(item => {
      const d = item.debris;
      return `<button type="button" data-debris-index="${item.index}" ${affordable ? '' : 'disabled'}>
        <b>${debrisDisplayName(d, item.index)}</b>
        <span>Position : couloir d’attaque · coût ${costTxt(DEBRIS_CLEAR_COST)}</span>
        <small>${affordable ? 'Montrer ce décombre' : 'Il faut 1 or'}</small>
      </button>`;
    }).join('');
    rampChoiceList.querySelectorAll('[data-debris-index]').forEach(btn => {
      btn.onclick = () => {
        const index = Number(btn.dataset.debrisIndex);
        const debris = laneDebris(active)[index];
        closeRampChoice();
        if (!debris || !debris.mesh) return;
        focusCameraOnDebrisList([debris], 6500);
        setPendingWorldAction({
          type: 'clear-debris',
          title: '🧹 Déblayage ciblé',
          text: 'Clique directement sur ce décombre pour le retirer pour 1 or.',
          x: debris.x,
          z: debris.z,
          radius: Math.max((debris.radius || DEBRIS_RADIUS) + 1.8, 4.2),
          refocus: () => focusCameraOnDebrisList([debris], 4500),
          execute: () => clearSelectedDebris(debris, laneDebris(active).indexOf(debris))
        });
      };
    });
    rampChoiceOverlay.classList.add('show');
  }

  function handleDebrisCollider(debris, cx, cz, radius, fragment = false) {
    const dx = ball.position.x - cx;
    const dz = ball.position.z - cz;
    const minDist = radius + CFG.ballR * 0.92;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0 || dist >= minDist) return false;

    const stage = Math.max(1, Math.min(3, debris.stage || 1));
    const nx = dx / dist;
    const nz = dz / dist;
    const penetration = minDist - dist;
    ball.position.x += nx * penetration;
    ball.position.z += nz * penetration;

    const vn = velocity.x * nx + velocity.z * nz;
    if (vn < 0) {
      const bounce = fragment ? (1.05 + stage * 0.12) : (1.42 + stage * 0.14);
      velocity.x -= (bounce * vn) * nx;
      velocity.z -= (bounce * vn) * nz;
    }

    const tangent = (Math.random() - 0.5) * (0.010 + stage * 0.012);
    velocity.x += -nz * tangent;
    velocity.z += nx * tangent;
    velocity.multiplyScalar(stage === 1 ? 0.72 : (stage === 2 ? 0.64 : 0.56));

    if ((debris.hitCooldown || 0) <= 0) {
      debris.hitCooldown = 20;
      impact(ball.position, stage >= 3 ? 0xd0b07c : 0xb8a070, 0.95 + stage * 0.12);
      playSfx('damage', 0.45 + stage * 0.08);
      evolveDebris(debris);
      updateHUD();
    }
    return true;
  }

  function updateDebrisPhysics(dt = 1) {
    const list = laneDebris(active);
    if (!list.length) return;
    list.forEach(debris => {
      debris.hitCooldown = Math.max(0, (debris.hitCooldown || 0) - dt);
      const mainHit = handleDebrisCollider(debris, debris.x, debris.z, debris.radius || DEBRIS_RADIUS, false);
      if (mainHit) return;
      (debris.fragments || []).forEach(f => handleDebrisCollider(debris, debris.x + f.ox, debris.z + f.oz, f.r, true));
    });
  }

  const activeKits = [];
  const activeMudZones = [];

  function randFloat(min, max) { return min + Math.random() * (max - min); }
  function kitLabel(type) { return type === 'build' ? 'kit de construction' : 'kit de réparation'; }

  function playerKits(player = active) {
    const pl = players[player - 1];
    if (!pl.kits) pl.kits = { repair: 0, build: 0 };
    pl.kits.repair = pl.kits.repair || 0;
    pl.kits.build = pl.kits.build || 0;
    return pl.kits;
  }

  function createKitVisual(kit) {
    const g = new THREE.Group();
    g.position.set(kit.x, 0.42, kit.z);
    addBox(1.35, 0.55, 1.35, 0, 0.28, 0, kitMat.crate, g);
    addBox(1.52, 0.10, 1.52, 0, 0.61, 0, kit.type === 'build' ? kitMat.build : kitMat.repair, g);
    addBox(1.48, 0.10, 0.18, 0, 0.68, 0, kitMat.dark, g);
    addBox(0.18, 0.10, 1.48, 0, 0.69, 0, kitMat.dark, g);
    if (kit.type === 'repair') {
      addBox(0.86, 0.08, 0.18, 0, 0.80, 0, kitMat.repairMark, g);
      addBox(0.18, 0.08, 0.86, 0, 0.81, 0, kitMat.repairMark, g);
    } else {
      const plankA = addBox(0.94, 0.16, 0.20, 0.02, 0.82, 0.02, kitMat.build, g); plankA.rotation.y = Math.PI / 7;
      const plankB = addBox(0.22, 0.14, 0.92, -0.12, 0.82, 0.08, mat.wood, g); plankB.rotation.y = -Math.PI / 5;
    }
    const glow = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.045, 10, 44), new THREE.MeshBasicMaterial({ color: kit.type === 'build' ? 0xffc24b : 0x74ff9b, transparent: true, opacity: 0.42, side: THREE.DoubleSide }));
    glow.rotation.x = Math.PI / 2; glow.position.y = 0.06; g.add(glow); g.userData.glow = glow;
    scene.add(g); return g;
  }

  function removeKit(kit) { if (kit && kit.mesh && kit.mesh.parent) kit.mesh.parent.remove(kit.mesh); if (kit) kit.mesh = null; }
  function clearKitsForPlayer(player) { for (let i = activeKits.length - 1; i >= 0; i--) if (activeKits[i].player === player) { removeKit(activeKits[i]); activeKits.splice(i, 1); } }
  function clearAllKits() { activeKits.forEach(removeKit); activeKits.length = 0; }

  function isKitSpawnBlocked(player, x, z) {
    if (isOnButte(x, z) || isOnHole(x, z)) return true;
    if (holes.some(h => h.player === player && Math.hypot(h.x - x, h.z - z) < 4.4)) return true;
    if (sideTheftHoles.some(h => h.attacker === player && Math.hypot(h.x - x, h.z - z) < 4.2)) return true;
    if (laneDebris(player).some(d => Math.hypot(d.x - x, d.z - z) < (d.radius || DEBRIS_RADIUS) + 2.1)) return true;
    if (activeKits.some(k => k.player === player && Math.hypot(k.x - x, k.z - z) < 7.0)) return true;
    if (activeMudZones.some(m => m.player === player && Math.hypot(m.x - x, m.z - z) < m.r + 2.2)) return true;
    return false;
  }

  function maybeSpawnKitForPlayer(player, force = false) {
    if (activeKits.some(k => k.player === player)) return null;
    const chance = KIT_SPAWN_CHANCE[currentDifficulty.id] ?? 0.16;
    if (!force && Math.random() > chance) return null;
    const laneX = attackX(player);
    for (let i = 0; i < 36; i++) {
      const x = laneX + randFloat(-CFG.laneW / 2 + 3.2, CFG.laneW / 2 - 3.2);
      const z = startZ(player) + dir(player) * randFloat(30, 108);
      if (isKitSpawnBlocked(player, x, z)) continue;
      const kit = { player, type: Math.random() < 0.62 ? 'repair' : 'build', x, z, mesh: null, seed: Math.floor(Math.random() * 999999), last: false };
      kit.mesh = createKitVisual(kit);
      activeKits.push(kit);
      return kit;
    }
    return null;
  }

  function updateKitAnimations() {
    activeKits.forEach(kit => {
      if (!kit.mesh) return;
      kit.mesh.rotation.y += 0.006;
      const bob = Math.sin(_t * 2.2 + kit.seed * 0.001) * 0.045;
      kit.mesh.position.y = 0.42 + bob;
      if (kit.mesh.userData.glow) kit.mesh.userData.glow.material.opacity = 0.30 + (Math.sin(_t * 3.5 + kit.seed * 0.002) + 1) * 0.12;
    });
  }

  function updateKitPhysics() {
    if (holeResolved || !activeKits.length) return;
    for (let i = activeKits.length - 1; i >= 0; i--) {
      const kit = activeKits[i];
      if (kit.player !== active) continue;
      const d = Math.hypot(ball.position.x - kit.x, ball.position.z - kit.z);
      if (d < KIT_CAPTURE_R + CFG.ballR) {
        const stock = playerKits(active);
        stock[kit.type] = (stock[kit.type] || 0) + 1;
        removeKit(kit); activeKits.splice(i, 1);
        velocity.multiplyScalar(0.90);
        impact(ball.position, kit.type === 'build' ? 0xffc24b : 0x74ff9b, 1.5);
        playSfx('confirm', 1.0);
        turnSummary.push('Kit récupéré : ' + kitLabel(kit.type));
        floatText((kit.type === 'build' ? 'KIT<br>CONSTRUCTION' : 'KIT<br>RÉPARATION'), ball.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 'gain');
        bigMessage('KIT RÉCUPÉRÉ', (kit.type === 'build' ? '🏗️ Construction' : '🧰 Réparation') + '<br><small>Utilisable plus tard en défense</small>', 'gain', 1700);
        updateHUD(); break;
      }
    }
  }

  function repairKitCandidates(player = active) { return randomRepairCandidates(player).sort((a, b) => (a.current / a.max) - (b.current / b.max)); }

  function debrisSourceInfoForPlayer(debris, player = active) {
    if (!debris || !players[player - 1]) return null;
    const pl = players[player - 1];

    // Données propres pour les nouveaux gravats.
    if (debris.sourcePlayer === player && debris.sourceType) {
      const idx = debris.sourceIndex;
      if (debris.sourceType === 'tower' && Number.isInteger(idx) && pl.towers[idx]) {
        return { kind: 'tower', idx };
      }
      if (debris.sourceType === 'castle' && Number.isInteger(idx) && pl.castle[idx]) {
        return { kind: 'castle', idx };
      }
    }

    // Tolérance pour les anciennes parties en cours : on tente de retrouver l'origine par le nom.
    const label = String(debris.label || '').toLowerCase();
    const towerMatch = label.match(/tour\s*(\d+)/i);
    if (towerMatch) {
      const idx = Number(towerMatch[1]) - 1;
      if (idx >= 0 && pl.towers[idx]) return { kind: 'tower', idx };
    }
    const castleIdx = pl.castle.findIndex(part => String(part.name || '').toLowerCase() === label);
    if (castleIdx >= 0) return { kind: 'castle', idx: castleIdx };
    return null;
  }

  function constructionKitCandidates(player = active) {
    const pl = players[player - 1];
    const debrisSource = buildKitDebrisSourcePlayer(player);
    const availableDebris = laneDebris(debrisSource).filter(d => d && d.mesh);
    const list = [];

    availableDebris.forEach((debris, debrisIndex) => {
      const info = debrisSourceInfoForPlayer(debris, player);
      if (!info) return;

      if (info.kind === 'castle') {
        const part = pl.castle[info.idx];
        if (!part || part.hp > 0) return;
        list.push({
          kind: 'castle',
          idx: info.idx,
          name: part.name,
          max: part.max,
          part,
          debris,
          debrisIndex,
          priority: info.idx === 8 ? 130 : (info.idx >= 4 ? 86 : 68)
        });
        return;
      }

      if (info.kind === 'tower') {
        const tower = pl.towers[info.idx];
        if (!tower || tower.placed) return;
        const opponentRamp = players[enemy(player) - 1].ramps[info.idx];
        const relockBonus = opponentRamp && opponentRamp.unlocked && !opponentRamp.built ? 36 : 0;
        list.push({
          kind: 'tower',
          idx: info.idx,
          name: 'Tour ' + (info.idx + 1),
          max: tower.max,
          tower,
          debris,
          debrisIndex,
          priority: 95 + relockBonus + info.idx * 2
        });
      }
    });

    return list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  function buildKitDebrisSourcePlayer(player = active) {
    // Les gravats d'une structure détruite se trouvent dans le couloir d'attaque
    // du joueur qui l'a détruite. Pour reconstruire son château, le défenseur
    // doit donc avoir des gravats présents dans le couloir de l'adversaire.
    return enemy(player);
  }

  function hasBuildKitDebrisForPlayer(player = active) {
    return constructionKitCandidates(player).length > 0;
  }

  function buildKitDebrisCountForPlayer(player = active) {
    return laneDebris(buildKitDebrisSourcePlayer(player)).length;
  }

  function canUseRepairKit(player = active) {
    const kits = playerKits(player);
    return gameStarted && !gamePaused && !isAITurn() && !gameOver && !turnLocked && !setupMode && phase === 'defense' && !kitUsedThisTurn && kits.repair > 0 && repairKitCandidates(player).length > 0;
  }

  function canUseBuildKit(player = active) {
    const kits = playerKits(player);
    return gameStarted && !gamePaused && !isAITurn() && !gameOver && !turnLocked && !setupMode && phase === 'defense' && !kitUsedThisTurn && kits.build > 0 && constructionKitCandidates(player).length > 0 && hasBuildKitDebrisForPlayer(player);
  }

  function canOpenKitChoice(player = active) {
    const kits = playerKits(player);
    return gameStarted && !gamePaused && !isAITurn() && !gameOver && !turnLocked && !setupMode && phase === 'defense' && !kitUsedThisTurn && ((kits.repair || 0) > 0 || (kits.build || 0) > 0);
  }

  function refreshKitChoice() {
    const kits = playerKits(active);
    const repairCandidates = repairKitCandidates(active);
    const buildCandidates = constructionKitCandidates(active);
    const debrisCount = buildKitDebrisCountForPlayer(active);
    kitStock.innerHTML = `Joueur ${active} — 🧰 réparation : ${kits.repair || 0} · 🏗️ construction : ${kits.build || 0}<br>${repairCandidates.length} structure(s) réparable(s) · ${buildCandidates.length} reconstruction(s) possible(s) sur gravats · ${debrisCount} tas de gravats disponible(s)`;
    kitActions.innerHTML = '';

    const repairBtn = document.createElement('button');
    repairBtn.type = 'button';
    repairBtn.className = 'market-trade kit-trade';
    repairBtn.disabled = !canUseRepairKit(active);
    repairBtn.innerHTML = `<strong>🧰</strong><span>→</span><strong>+${KIT_REPAIR_AMOUNT} PV</strong><small>Utilise 1 kit de réparation sur la structure la plus abîmée</small>`;
    repairBtn.onclick = () => {
      if (useRepairKitForActive()) closeKitChoice();
    };
    kitActions.appendChild(repairBtn);

    if ((kits.build || 0) <= 0) {
      const buildBtn = document.createElement('button');
      buildBtn.type = 'button';
      buildBtn.className = 'market-trade kit-trade';
      buildBtn.disabled = true;
      buildBtn.innerHTML = `<strong>🏗️</strong><span>→</span><strong>Reconstruction</strong><small>Aucun kit construction en réserve</small>`;
      kitActions.appendChild(buildBtn);
      return;
    }

    if (!buildCandidates.length) {
      const buildBtn = document.createElement('button');
      buildBtn.type = 'button';
      buildBtn.className = 'market-trade kit-trade';
      buildBtn.disabled = true;
      const reason = debrisCount <= 0
        ? 'Impossible sans gravats sur le couloir'
        : 'Aucun gravat ne correspond à une structure détruite';
      buildBtn.innerHTML = `<strong>🏗️</strong><span>→</span><strong>Reconstruction</strong><small>${reason}</small>`;
      kitActions.appendChild(buildBtn);
      return;
    }

    const title = document.createElement('div');
    title.className = 'kit-choice-title';
    title.textContent = 'Choisis le tas de gravats à reconstruire :';
    kitActions.appendChild(title);

    buildCandidates.forEach((choice, idx) => {
      const buildBtn = document.createElement('button');
      buildBtn.type = 'button';
      buildBtn.className = 'market-trade kit-trade';
      const debrisName = debrisDisplayName(choice.debris, choice.debrisIndex ?? idx);
      buildBtn.innerHTML = `<strong>🏗️</strong><span>→</span><strong>${choice.name}</strong><small>${debrisName} · reconstruit à 50 % des PV</small>`;
      buildBtn.onclick = () => {
        if (choice.debris) focusCameraOnDebrisList([choice.debris], 3600);
        if (useBuildKitForActive(choice)) closeKitChoice();
      };
      kitActions.appendChild(buildBtn);
    });
  }

  function openKitChoice() {
    if (!canOpenKitChoice(active)) {
      showToast('Kits indisponibles<br>Disponible en défense avec au moins 1 kit');
      return;
    }
    refreshKitChoice();
    kitOverlay.classList.add('open');
  }

  function closeKitChoice() {
    kitOverlay.classList.remove('open');
  }

  function useRepairKitForActive() {
    if (!isAITurn() && !canUseRepairKit(active)) return false;
    const kits = playerKits(active); if (kits.repair <= 0 || kitUsedThisTurn) return false;
    const choice = repairKitCandidates(active)[0]; if (!choice) return false;
    const pl = players[active - 1]; let repaired = 0; let fxPos = new THREE.Vector3(castleX(active), 4.2, castleZ(active));
    if (choice.kind === 'castle') {
      const part = pl.castle[choice.idx]; const before = part.hp; part.hp = Math.min(part.max, part.hp + KIT_REPAIR_AMOUNT); repaired = part.hp - before; updateCastlePartVisual(active, choice.idx); if (part.hit) fxPos = new THREE.Vector3(castleX(active) + part.hit.x, 4.4, castleZ(active) + part.hit.z);
    } else {
      const tower = pl.towers[choice.idx]; const before = tower.hp; tower.hp = Math.min(tower.max, tower.hp + KIT_REPAIR_AMOUNT); repaired = tower.hp - before; towerMesh(active, tower); if (tower.pos) fxPos = tower.pos.clone().add(new THREE.Vector3(0, 4, 0));
    }
    kits.repair--; kitUsedThisTurn = true; turnSummary.push('Kit réparation : +' + repaired + ' PV sur ' + choice.name); impact(fxPos, 0x74ff9b, 1.55); playSfx('repair', 1.2); floatText('KIT +' + repaired + ' PV', fxPos, 'gain'); bigMessage('KIT DE RÉPARATION', choice.name + '<br>+' + repaired + ' PV', 'gain', 2200); updateHUD(); if (UI.modal.classList.contains('open')) openCastle(active); return true;
  }

  function useBuildKitForActive(forcedChoice = null) {
    if (!isAITurn() && !canUseBuildKit(active)) return false;
    const kits = playerKits(active);
    if (kits.build <= 0 || kitUsedThisTurn) return false;
    if (!hasBuildKitDebrisForPlayer(active)) {
      showToast('Kit construction impossible<br>Il faut des gravats sur le couloir');
      return false;
    }

    const choice = forcedChoice || constructionKitCandidates(active)[0];
    if (!choice || !choice.debris || !choice.debris.mesh) return false;

    const pl = players[active - 1];
    let label = choice.name;
    let newHp = 0;
    let fxPos = new THREE.Vector3(castleX(active), 4.2, castleZ(active));

    consumeDebris(choice.debris);

    if (choice.kind === 'tower') {
      const tower = pl.towers[choice.idx];
      newHp = Math.max(1, Math.ceil(tower.max * KIT_REBUILD_RATIO));
      tower.placed = true;
      tower.hp = newHp;
      // Avec un kit construction, la tour revient exactement sur le tas de gravats choisi.
      tower.pos = new THREE.Vector3(choice.debris.x, 0.1, choice.debris.z);
      towerMesh(active, tower);
      if (tower.pos) fxPos = tower.pos.clone().add(new THREE.Vector3(0, 4.2, 0));

      const attacker = enemy(active);
      const ramp = players[attacker - 1].ramps[choice.idx];
      if (ramp && !ramp.built) {
        ramp.unlocked = false;
        updateTowerGhosts();
      }
    } else {
      const part = pl.castle[choice.idx];
      newHp = Math.max(1, Math.ceil(part.max * KIT_REBUILD_RATIO));
      part.hp = newHp;
      part.built = true;
      updateCastlePartVisual(active, choice.idx);
      if (part.hit) fxPos = new THREE.Vector3(castleX(active) + part.hit.x, 4.4, castleZ(active) + part.hit.z);
    }

    kits.build--;
    kitUsedThisTurn = true;
    turnSummary.push('Kit construction : ' + label + ' rebâti à ' + newHp + '/' + choice.max + ' PV');
    impact(fxPos, 0xffc24b, 1.65);
    playSfx('build', 1.2);
    floatText('KIT<br>REBÂTI', fxPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 'gain');
    bigMessage('KIT DE CONSTRUCTION', label + '<br>' + newHp + '/' + choice.max + ' PV<br><small>Gravats utilisés</small>', 'gain', 2400);
    updateHUD();
    if (UI.modal.classList.contains('open')) openCastle(active);
    return true;
  }

  function createMudZone(player, x, z, r = MUD_RADIUS) {
    const g = new THREE.Group(); g.position.set(x, 0.39, z);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 34), mudMat.clone()); puddle.rotation.x = -Math.PI / 2; puddle.rotation.z = Math.random() * Math.PI; g.add(puddle);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.055, 8, 42), mudEdgeMat.clone()); edge.rotation.x = Math.PI / 2; edge.scale.x = 1.24; edge.scale.y = 0.72; edge.position.y = 0.015; g.add(edge);
    scene.add(g); return { player, x, z, r, mesh: g, hitCooldown: 0 };
  }
  function removeMudZone(zone) { if (zone && zone.mesh && zone.mesh.parent) zone.mesh.parent.remove(zone.mesh); if (zone) zone.mesh = null; }
  function clearMudZones() { activeMudZones.forEach(removeMudZone); activeMudZones.length = 0; }
  function isMudSpawnBlocked(player, x, z) { if (isOnButte(x, z) || isOnHole(x, z)) return true; if (holes.some(h => h.player === player && Math.hypot(h.x - x, h.z - z) < 4.8)) return true; if (sideTheftHoles.some(h => h.attacker === player && Math.hypot(h.x - x, h.z - z) < 4.6)) return true; if (laneDebris(player).some(d => Math.hypot(d.x - x, d.z - z) < (d.radius || DEBRIS_RADIUS) + 2.4)) return true; if (activeKits.some(k => k.player === player && Math.hypot(k.x - x, k.z - z) < 4.8)) return true; if (activeMudZones.some(m => m.player === player && Math.hypot(m.x - x, m.z - z) < m.r + MUD_RADIUS + 1.6)) return true; return false; }
  function spawnMudZonesForEvent() { clearMudZones(); [1, 2].forEach(player => { const laneX = attackX(player); let made = 0; for (let tries = 0; tries < 60 && made < MUD_ZONES_PER_PLAYER; tries++) { const x = laneX + randFloat(-CFG.laneW / 2 + 3.2, CFG.laneW / 2 - 3.2); const z = startZ(player) + dir(player) * randFloat(24, 108); if (isMudSpawnBlocked(player, x, z)) continue; activeMudZones.push(createMudZone(player, x, z, MUD_RADIUS + randFloat(-0.45, 0.55))); made++; } }); }
  function updateMudPhysics(dt = 1) { if (!activeTurnEvent || !activeTurnEvent.mud || !activeMudZones.length) return; activeMudZones.forEach(zone => { zone.hitCooldown = Math.max(0, (zone.hitCooldown || 0) - dt); if (zone.player !== active) return; const d = Math.hypot(ball.position.x - zone.x, ball.position.z - zone.z); if (d < zone.r + CFG.ballR * 0.35) { velocity.multiplyScalar(0.900); if (zone.hitCooldown <= 0 && velocity.length() > 0.12) { zone.hitCooldown = 28; impact(ball.position, 0x5b3515, 0.55); floatText('BOUE', ball.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 'trap'); if (!zone.notedForShot) { zone.notedForShot = true; turnSummary.push('Boue : bille ralentie'); } } } }); }


  function addSideTheftHoleVisual(attacker, sideIndex = 0) {
    const b = sideRidgeBounds(attacker, sideIndex);
    const x = b.x;
    // Trou placé vraiment au bout du couloir haut, juste avant le rebord de fond.
    const z = b.zEnd - dir(attacker) * SIDE_RIDGE.stealHoleBackOffset;
    const y = BUTTE.h + 0.30;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 1.02, 0.12, 14, 52), mat.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.08, z);
    scene.add(ring);

    const inner = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R * 0.74, 0.055, 10, 40), mat.holeRing);
    inner.rotation.x = Math.PI / 2;
    inner.position.set(x, y + 0.095, z);
    scene.add(inner);

    const pocket = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R * 0.66, HOLE_R * 0.76, 0.46, 48), mat.pocket);
    pocket.position.set(x, y - 0.10, z);
    scene.add(pocket);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(HOLE_R * 0.62, 44),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.82, side: THREE.DoubleSide })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, y + 0.11, z);
    scene.add(shadow);

    const holeGlow = new THREE.Mesh(
      new THREE.TorusGeometry(HOLE_R * 1.45, 0.06, 10, 54),
      new THREE.MeshBasicMaterial({ color: 0xffd66e, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
    );
    holeGlow.rotation.x = Math.PI / 2;
    holeGlow.position.set(x, y + 0.14, z);
    scene.add(holeGlow);

    sideTheftHoles.push({ attacker, sideIndex, x, z, y, ring, inner, pocket, shadow, holeGlow, last: false });
  }

  function buildSideTheftHoles() {
    [1, 2].forEach(attacker => {
      sideRidgeIndexes().forEach(sideIndex => addSideTheftHoleVisual(attacker, sideIndex));
    });
  }

  function zoneBox(x, z, w, d, color, opacity = 0.0, lineOpacity = 0.45, mode = 'full') {
    const g = new THREE.Group();
    g.visible = false;
    scene.add(g);
    zoneMarkers.push(g);

    const baseMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    if (opacity > 0) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), baseMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.231, z);
      g.add(p);
    }

    const lineMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: lineOpacity, depthWrite: false });
    const y = 0.292;
    const t = mode === 'full' ? 0.095 : 0.080;
    const corner = Math.min(4.2, Math.min(w, d) * 0.28);
    const strip = (sw, sd, sx, sz) => addBox(sw, 0.04, sd, sx, y, sz, lineMat, g);

    if (mode === 'corner') {
      [-1, 1].forEach(ix => [-1, 1].forEach(iz => {
        strip(corner, t, x + ix * (w / 2 - corner / 2), z + iz * (d / 2));
        strip(t, corner, x + ix * (w / 2), z + iz * (d / 2 - corner / 2));
      }));
    } else {
      strip(w, t, x, z - d / 2);
      strip(w, t, x, z + d / 2);
      strip(t, d, x - w / 2, z);
      strip(t, d, x + w / 2, z);
      [-0.28, 0.28].forEach(k => strip(w * 0.82, 0.035, x, z + k * d));
    }
    return g;
  }

  function drawGameplayZones() {
    [1, 2].forEach(player => {
      defenseTowerBuildZones(player).forEach((zone, idx) => {
        const isMain = zone.type === 'main';
        const opacity = isMain ? 0.052 : (idx % 2 === 0 ? 0.135 : 0.105);
        const lineOpacity = isMain ? 0.74 : 0.96;
        const color = isMain ? 0x5eb9ff : 0x4fc3ff;
        const marker = zoneBox(zone.x, zone.z, zone.w, zone.d, color, opacity, lineOpacity, isMain ? 'corner' : 'full');
        marker.userData.zoneKind = 'defenseTower';
        marker.userData.zoneType = zone.type;
        marker.userData.player = player;
      });
    });

    [1, 2].forEach(attacker => {
      sideRidgeIndexes().forEach(sideIndex => {
        const sideRp = sideRampPosition(attacker, sideIndex);
        const marker = zoneBox(sideRp.x, sideRp.z, SIDE_RIDGE.width + 1.15, RAMP.length + 1.4, 0xffd45a, 0.055, 0.98, 'corner');
        marker.userData.zoneKind = 'sideRamp';
        marker.userData.player = attacker;
        marker.userData.sideIndex = sideIndex;
      });
      [0, 1, 2, 3].forEach(slot => {
        const rp = rampSlotPosition(attacker, slot);
        const marker = zoneBox(rp.x, rp.z, RAMP.width + 1.0, RAMP.length + 1.4, 0xff8a47, 0.050, 0.92, 'corner');
        marker.userData.zoneKind = 'castleRamp';
        marker.userData.player = attacker;
        marker.userData.slot = slot;
      });
    });
  }

  function addSlopeHole(player, spec) {
    const laneX  = attackX(player);
    const mirror = player === 1 ? 1 : -1;
    const x = laneX + spec.relX * mirror;
    const z = startZ(player) + dir(player) * spec.dz;
    const h = addBilliardPocket(x, z);
    const reward = spec.trap ? null : makeHoleReward();
    holes.push({
      player,
      x, z,
      dz: spec.dz,
      rowIndex: spec.rowIndex,
      colIndex: spec.colIndex,
      baseTrap: !!spec.trap,
      trap: !!spec.trap,
      trapKnown: false,
      kind: spec.trap ? 'trou inconnu' : holeRewardLabel(reward),
      reward,
      ring: h.ring,
      inner: h.inner,
      black: h.pocket,
      shadow: h.shadow,
      holeGlow: h.holeGlow,
      trapMarker: h.trapMarker,
      discoveredMarker: h.discoveredMarker,
      discovered: false,
      last: false
    });
  }

  [1, 2].forEach(p => holeLayout.forEach(spec => addSlopeHole(p, spec)));
  buildSideRidges();
  buildSideTheftHoles();
  buildBonusHoles();
  drawGameplayZones();

  /* ── Châteaux ── */
  const castleDefs = [
    // PV volontairement bas : une partie doit avancer vite, pas durer 45 minutes.
    // Format : nom, icône, PV max, coût réparation, coût reconstruction après destruction.
    ['Mur avant',       '🧱', CASTLE_PART_HP_VALUES[0], { stone: 2, wood: 1 }, { stone: 5, wood: 2, gold: 1 }],
    ['Mur arrière',     '🧱', CASTLE_PART_HP_VALUES[1], { stone: 2, wood: 1 }, { stone: 5, wood: 2, gold: 1 }],
    ['Mur gauche',      '🧱', CASTLE_PART_HP_VALUES[2], { stone: 2, wood: 1 }, { stone: 5, wood: 2, gold: 1 }],
    ['Mur droit',       '🧱', CASTLE_PART_HP_VALUES[3], { stone: 2, wood: 1 }, { stone: 5, wood: 2, gold: 1 }],
    ['Tour AV gauche',  '🗼', CASTLE_PART_HP_VALUES[4], { stone: 3, wood: 1 }, { stone: 6, wood: 3, gold: 1 }],
    ['Tour AV droite',  '🗼', CASTLE_PART_HP_VALUES[5], { stone: 3, wood: 1 }, { stone: 6, wood: 3, gold: 1 }],
    ['Tour AR gauche',  '🗼', CASTLE_PART_HP_VALUES[6], { stone: 3, wood: 1 }, { stone: 6, wood: 3, gold: 1 }],
    ['Tour AR droite',  '🗼', CASTLE_PART_HP_VALUES[7], { stone: 3, wood: 1 }, { stone: 6, wood: 3, gold: 1 }],
    ['Donjon central',  '🏰', CASTLE_PART_HP_VALUES[8], { stone: 5, wood: 3, gold: 1 }, { stone: 10, wood: 5, gold: 2 }]
  ];
  const towerHP         = DEFENSE_TOWER_HP_VALUES.slice();
  const towerRebuildCost = [{ stone: 2, wood: 1 }, { stone: 3, wood: 1 }, { stone: 4, wood: 2 }, { stone: 5, wood: 2 }];
  const rampCost         = [{ wood: 2, stone: 1 }, { wood: 3, stone: 1 }, { wood: 3, stone: 2 }, { wood: 4, stone: 2, gold: 1 }];
  const rampHP           = [60, 60, 60, 60];
  function getSecondBallCost() {
    // Le coût dépend du mode et de la difficulté.
    return { ...(currentDifficulty.secondBallCost[gameMode === 'solo' ? 'solo' : 'duo'] || currentDifficulty.secondBallCost.duo) };
  }

  const players = [0, 1].map(i => ({
    res: { stone: 8, wood: 4, gold: 0, relic: 0 },
    castle: castleDefs.map(d => ({ name: d[0], icon: d[1], hp: d[2], max: d[2], cost: d[3], rebuildCost: d[4], built: true, mesh: null })),
    castleGroup: null,
    castleKeep: null,
    towers: [0, 1, 2, 3].map(s => ({ slot: s, hp: towerHP[s], max: towerHP[s], placed: false, pos: null, mesh: null, ghost: null })),
    ramps: [0, 1, 2, 3].map(s => ({ unlocked: false, built: false, hp: rampHP[s], max: rampHP[s], mesh: null, ghost: null, usedThisShot: false })),
    sideRamps: sideRidgeIndexes().map(sideIndex => ({ sideIndex, unlocked: true, built: false, hp: SIDE_RIDGE.rampHP, max: SIDE_RIDGE.rampHP, mesh: null, ghost: null, usedThisShot: false })),
    attackDebris: [],
    kits: { repair: 0, build: 0 },
    queuedBonusNextTurn: null,
    bonusSecondShotThisTurn: false,
    bonusDoubleDamageThisTurn: false,
    freeTowerBuilds: 0,
    secondBallTurns: 0,
    extraShotsLeft: 0,
    secondBallActiveThisTurn: false
  }));

  let active = 1, phase = 'setup', setupMode = true, placingTower = true;
  let holeResolved = false, canShoot = false, dragging = false;
  let dragStart = null, dragNow = null, ballInHole = false;
  let turnLocked = false, turnSummary = [], shotStarted = false;
  let autoSwitchStarted = false, castleHitThisShot = false, castleAccessThisShot = false, sideRidgeAccessThisShot = false, gameOver = false;
  let finishTimer = null, secondShotReady = false;
  let randomRepairUsedThisTurn = false, marketTradeUsedThisTurn = false, kitUsedThisTurn = false;
  let shotCreatedDebris = [];
  let turnIntroCamera = null;
  let turnTimerId = null, turnTimerRunning = false, turnTimerPausedMs = 60000, turnTimerDeadline = 0, turnTimerExpired = false;
  let gameMode = 'duo';
  let gameStarted = false;
  let gamePaused = true;
  let aiActionTimers = [];
  let defenseCamYaw = 0, defenseCamDist = 108, defenseCamHeight = 58, defenseCamPanX = 0, defenseCamPanZ = 0;
  let screenShakeTime = 0, screenShakePower = 0;
  let victoryFocus = null, victoryCameraOffset = null;
  let pointerMode = 'none', downData = null;
  let pendingTowerPlacement = null;
  const activeCameraPointers = new Map();
  let pinchState = null;
  const velocity = new THREE.Vector3();
  const AIM_ARM_DISTANCE = 10;
  const AIM_VERTICAL_MIN = 16;
  const AIM_MIN_POWER = 20;

  function resetDefenseCamera() {
    // Vue de départ type jeu de gestion : plus haute, plus reculée,
    // centrée sur toute la zone bleue avec le château dans l'axe.
    defenseCamYaw = 0;
    defenseCamDist = 132;
    defenseCamHeight = 82;
    defenseCamPanX = 0;

    const b = defenseZoneBounds(active);
    const zoneCenterZ = (b.zMin + b.zMax) / 2;
    const targetZ = zoneCenterZ + (-dir(active)) * 12;
    defenseCamPanZ = targetZ - castleZ(active);

    pinchState = null;
    clampDefenseCamera();
  }

  function isCameraControlPhase() {
    return phase === 'defense' || phase === 'setup' || placingTower;
  }

  function clampDefenseCamera() {
    // Dézoom large, mais borné pour garder la table et le château dans le champ.
    defenseCamDist = THREE.MathUtils.clamp(defenseCamDist, 42, 210);
    defenseCamHeight = THREE.MathUtils.clamp(defenseCamDist * 0.64, 34, 136);

    const laneX = defenseX(active);
    const targetXMin = laneX - 18;
    const targetXMax = laneX + 18;
    defenseCamPanX = THREE.MathUtils.clamp(defenseCamPanX, targetXMin - laneX, targetXMax - laneX);

    // La cible caméra est basée sur le château. Ces limites permettent de revenir
    // vers la zone de placement sans jamais filmer trop loin hors plateau.
    const targetZMin = -104;
    const targetZMax = 104;
    defenseCamPanZ = THREE.MathUtils.clamp(defenseCamPanZ, targetZMin - castleZ(active), targetZMax - castleZ(active));
  }

  function moveDefenseCamera(dx, dy) {
    // Un doigt = déplacement de la vue, comme dans un jeu de gestion.
    panDefenseCamera(dx, dy);
  }

  function panDefenseCamera(dx, dy) {
    const scale = THREE.MathUtils.clamp(defenseCamDist * 0.0064, 0.28, 1.25);
    // Contrôle inversé comme la visée lance-pierre :
    // glisser vers la droite déplace la vue vers la gauche, et inversement.
    // Même logique verticale pour garder une sensation cohérente en placement de tours.
    defenseCamPanX += dx * scale;
    defenseCamPanZ += dy * dir(active) * scale;
    clampDefenseCamera();
  }

  function zoomDefenseCamera(delta) {
    defenseCamDist = THREE.MathUtils.clamp(defenseCamDist + delta, 42, 210);
    clampDefenseCamera();
  }

  function rotateDefenseCamera(delta) {
    defenseCamYaw += delta;
    // Limite large : assez de rotation pour inspecter, sans perdre complètement le plateau.
    defenseCamYaw = THREE.MathUtils.clamp(defenseCamYaw, -1.45, 1.45);
    clampDefenseCamera();
  }

  function updateCameraControlsVisibility() {
    cameraControls.classList.toggle('show', gameStarted && !gamePaused && !isAITurn() && isCameraControlPhase() && !gameOver);
  }

  /* ── Construction des châteaux ── */
  function castleFrontZ(p) {
    return p === 1 ? -6 : 6;
  }

  function castleRearZ(p) {
    return -castleFrontZ(p);
  }

  function castleKeepOffsetZ(p) {
    return -dir(p) * CASTLE_KEEP_REAR_OFFSET;
  }

  function castlePartMaterial(part, p) {
    const cm = getCastleSkinMaterials(p);
    return part.hp / part.max > 0.35 ? cm.wall : cm.damaged;
  }

  function removeCastlePartVisual(part) {
    if (part.mesh && part.mesh.parent) part.mesh.parent.remove(part.mesh);
    part.mesh = null;
  }

  function setCastleHitBox(part, hit, p) {
    const s = 0.84;
    part.hit = { ...hit };
    part.hit.x = (hit.x || 0) * s;
    part.hit.z = (hit.z || 0) * s + castleKeepOffsetZ(p);
    if (hit.w) part.hit.w = hit.w * s;
    if (hit.d) part.hit.d = hit.d * s;
    if (hit.r) part.hit.r = hit.r * s;
  }

  function castleRoofMaterial(p) { return getCastleSkinMaterials(p).roof; }
  function castleBannerMaterial(p) { return getCastleSkinMaterials(p).banner; }
  function castleTrimMaterial(p) { return getCastleSkinMaterials(p).trim; }

function roofDamageRatio(obj) {
    if (!obj || !obj.max) return 1;
    return Math.max(0, Math.min(1, obj.hp / obj.max));
  }
function roofIsDamaged(obj) {
    // Étape visuelle intermédiaire : avant la destruction, le toit se dégrade clairement.
    return obj && obj.hp > 0 && roofDamageRatio(obj) <= 0.65;
  }
function roofIsCritical(obj) {
    return obj && obj.hp > 0 && roofDamageRatio(obj) <= 0.35;
  }
function addDamagedRoofDetails(parent, p, x, y, z, radius, central = false, critical = false) {
    const cm = getCastleSkinMaterials(p);
    const dark = cm.dark || mat.windowDark;
    const trim = cm.trim || mat.windowDark;
    const crackY = y + (central ? 0.35 : 0.22);

    // Fissures sombres posées sur le toit : très lisible en vue de dessus.
    for (let i = 0; i < (central ? 5 : 4); i++) {
      const a = (i / (central ? 5 : 4)) * Math.PI * 2 + 0.35;
      const len = radius * (critical ? 1.05 : 0.78) * (0.72 + Math.random() * 0.25);
      const cx = x + Math.cos(a) * radius * 0.28;
      const cz = z + Math.sin(a) * radius * 0.28;
      const crack = addBox(0.13, 0.08, len, cx, crackY + i * 0.015, cz, mat.windowDark, parent);
      crack.rotation.y = -a + Math.PI / 2;
      crack.rotation.z = (Math.random() - 0.5) * 0.35;
    }

    // Tuiles cassées / morceaux de faîtage manquants.
    const chips = critical ? 7 : 4;
    for (let i = 0; i < chips; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = radius * (0.38 + Math.random() * 0.58);
      const chip = addBox(
        0.42 + Math.random() * 0.38,
        0.10 + Math.random() * 0.12,
        0.30 + Math.random() * 0.34,
        x + Math.cos(a) * rr,
        crackY - 0.16 + Math.random() * 0.16,
        z + Math.sin(a) * rr,
        dark,
        parent
      );
      chip.rotation.set((Math.random() - 0.5) * 0.55, -a, (Math.random() - 0.5) * 0.45);
    }

    if (critical) {
      // Toit très abîmé : barre de faîtage tordue + petit pan effondré.
      const brokenRidge = addBox(radius * 1.55, 0.12, 0.14, x, crackY + 0.26, z, trim, parent);
      brokenRidge.rotation.y = 0.65;
      brokenRidge.rotation.z = 0.22;
      const hole = addBox(radius * 0.78, 0.13, radius * 0.52, x - radius * 0.22, crackY + 0.02, z + radius * 0.18, mat.windowDark, parent);
      hole.rotation.y = -0.45;
    }
  }


  function addCastleFlag(parent, p, x, y, z, side = 1) {
    addCyl(0.08, 1.7, x, y, z, castleTrimMaterial(p), parent, 10);
    const flag = addBox(1.15, 0.52, 0.08, x + side * 0.58, y + 0.48, z, castleBannerMaterial(p), parent);
    flag.userData.fxWind = true;
    flag.userData.baseX = flag.position.x;
    flag.userData.amp = 0.05;
    return flag;
  }

  function addDamageCrack(parent, x, y, z, face = 'z') {
    const c1 = addBox(0.10, 1.55, 0.07, x, y, z, mat.windowDark, parent);
    c1.rotation.z = 0.45;
    const c2 = addBox(0.09, 0.95, 0.07, x + 0.25, y - 0.42, z, mat.windowDark, parent);
    c2.rotation.z = -0.55;
    if (face === 'x') {
      c1.rotation.y = Math.PI / 2;
      c2.rotation.y = Math.PI / 2;
    }
  }

  function addWallStoneLines(parent, width, z, damaged, faceSign = 1) {
    const faceZ = z + faceSign * 1.54;
    [1.35, 2.55, 3.75].forEach(y => addBox(width * 0.88, 0.045, 0.08, 0, y, faceZ, mat.mortar, parent));
    [-4.7, -2.3, 0, 2.3, 4.7].forEach((x, i) => {
      addBox(0.07, 0.72, 0.08, x, 1.9 + (i % 2) * 1.18, faceZ, mat.mortar, parent);
    });
    [-3.9, 0, 3.9].forEach(x => addBox(0.34, 1.18, 0.10, x, 3.02, faceZ + faceSign * 0.01, mat.windowDark, parent));
    if (damaged) addDamageCrack(parent, 2.3, 3.0, faceZ + faceSign * 0.02, 'z');
  }

  function addSideWallStoneLines(parent, x, damaged, faceSign = 1) {
    const faceX = x + faceSign * 1.54;
    [-4.7, -2.3, 0, 2.3, 4.7].forEach(z => addBox(0.08, 0.045, 1.75, faceX, 1.35, z, mat.mortar, parent));
    [-4.1, 0, 4.1].forEach(z => addBox(0.10, 1.18, 0.34, faceX + faceSign * 0.01, 3.02, z, mat.windowDark, parent));
    if (damaged) addDamageCrack(parent, faceX + faceSign * 0.02, 3.0, 2.2, 'x');
  }

  function addBattlementsX(parent, z, y, stoneMat) {
    [-5.6, -2.8, 0, 2.8, 5.6].forEach(x => addBox(1.18, 1.05, 3.45, x, y, z, stoneMat, parent));
  }

  function addBattlementsZ(parent, x, y, stoneMat) {
    [-5.6, -2.8, 0, 2.8, 5.6].forEach(z => addBox(3.45, 1.05, 1.18, x, y, z, stoneMat, parent));
  }

  function buildCastleWall(parent, p, part, idx, x, z) {
    const cm = getCastleSkinMaterials(p);
    const st = castlePartMaterial(part, p);
    const damaged = part.hp / part.max <= 0.5;

    if (idx === 0 || idx === 1) {
      const faceSign = Math.sign(z) || 1;
      addBox(13, 5, 3, 0, 2.5, z, st, parent);
      addBox(13.55, 0.48, 3.55, 0, 5.22, z, cm.light, parent);
      addBattlementsX(parent, z, 5.95, st);
      addWallStoneLines(parent, 13, z, damaged, faceSign);
      addBox(1.0, 1.45, 0.12, 0, 2.15, z + faceSign * 1.58, mat.windowDark, parent);
      addBox(1.35, 0.24, 0.14, 0, 2.92, z + faceSign * 1.59, cm.dark, parent);
      if (idx === 0) addBox(2.4, 1.2, 0.14, 0, 4.35, z + faceSign * 1.60, castleBannerMaterial(p), parent);
    } else {
      const faceSign = Math.sign(x) || 1;
      addBox(3, 5, 13, x, 2.5, 0, st, parent);
      addBox(3.55, 0.48, 13.55, x, 5.22, 0, cm.light, parent);
      addBattlementsZ(parent, x, 5.95, st);
      addSideWallStoneLines(parent, x, damaged, faceSign);
    }
  }

  function buildCastleTower(parent, p, part, x, z, central = false) {
    const cm = getCastleSkinMaterials(p);
    const st = castlePartMaterial(part, p);
    const roofDamaged = roofIsDamaged(part);
    const criticalRoof = roofIsCritical(part);
    const roof = roofDamaged ? cm.roofDamaged : castleRoofMaterial(p);
    const damaged = part.hp / part.max <= 0.5;
    const r = central ? 3.05 : 2.15;
    const bodyH = central ? 10.6 : 8.55;
    const bodyY = bodyH / 2;
    const topY = bodyH + 0.2;

    addCyl(r + 0.35, 0.55, x, 0.28, z, cm.dark, parent, central ? 36 : 28);
    addCyl(r, bodyH, x, bodyY, z, st, parent, central ? 36 : 28);
    addCyl(r + 0.12, 0.32, x, 2.1, z, cm.light, parent, central ? 36 : 28);
    addCyl(r + 0.12, 0.34, x, topY - 0.35, z, cm.light, parent, central ? 36 : 28);

    const battlementCount = central ? 10 : 8;
    for (let i = 0; i < battlementCount; i++) {
      const a = (i / battlementCount) * Math.PI * 2;
      const bx = x + Math.cos(a) * (r * 0.88);
      const bz = z + Math.sin(a) * (r * 0.88);
      const merlon = addBox(0.62, 0.85, 0.62, bx, topY + 0.25, bz, st, parent);
      merlon.rotation.y = -a;
    }

    [-0.55, 0.55].forEach(off => addBox(0.36, 1.12, 0.10, x + off, central ? 5.1 : 4.15, z + r + 0.03, mat.windowDark, parent));
    if (damaged) addDamageCrack(parent, x + r * 0.28, central ? 5.4 : 4.35, z + r + 0.06, 'z');

    const roofMesh = addCone(r + 0.42, central ? 4.15 : 3.45, x, topY + (central ? 2.4 : 2.0), z, roof, parent, central ? 36 : 28);
    if (roofDamaged) {
      roofMesh.rotation.x = criticalRoof ? 0.16 : 0.08;
      roofMesh.rotation.z = criticalRoof ? -0.14 : -0.06;
      roofMesh.scale.set(criticalRoof ? 0.92 : 0.97, criticalRoof ? 0.86 : 0.94, criticalRoof ? 0.96 : 0.99);
      addDamagedRoofDetails(parent, p, x, topY + (central ? 2.95 : 2.42), z, r + 0.42, central, criticalRoof);
    }
    addCyl(r + 0.48, 0.18, x, topY + 0.72, z, cm.trim, parent, central ? 36 : 28);
    const flag = addCastleFlag(parent, p, x, topY + (central ? 4.75 : 4.05), z, p === 1 ? 1 : -1);
    if (roofDamaged) flag.rotation.z = (p === 1 ? -1 : 1) * (criticalRoof ? 0.34 : 0.18);
  }

  function createCastlePartMesh(p, idx) {
    const pl = players[p-1];
    const part = pl.castle[idx];
    if (!pl.castleKeep || part.hp <= 0) return null;

    removeCastlePartVisual(part);

    const g = new THREE.Group();
    const fz = castleFrontZ(p), rz = castleRearZ(p);

    if (idx === 0) buildCastleWall(g, p, part, idx, 0, fz);
    else if (idx === 1) buildCastleWall(g, p, part, idx, 0, rz);
    else if (idx === 2) buildCastleWall(g, p, part, idx, -6, 0);
    else if (idx === 3) buildCastleWall(g, p, part, idx, 6, 0);
    else if (idx >= 4 && idx <= 7) {
      const x = idx === 4 || idx === 6 ? -7 : 7;
      const z = idx === 4 || idx === 5 ? fz + Math.sign(fz) : rz + Math.sign(rz);
      buildCastleTower(g, p, part, x, z, false);
    } else if (idx === 8) {
      buildCastleTower(g, p, part, 0, 0, true);
    }

    pl.castleKeep.add(g);
    part.mesh = g;
    part.built = true;
    return g;
  }

  function updateCastlePartVisual(defender, idx) {
    const part = players[defender-1].castle[idx];
    if (part.hp <= 0) {
      part.hp = 0;
      part.built = false;
      removeCastlePartVisual(part);
      return;
    }
    createCastlePartMesh(defender, idx);
  }

  function makeCastle(p) {
    const g = new THREE.Group();
    g.position.set(castleX(p), 2.4, castleZ(p));
    scene.add(g);
    players[p-1].castleGroup = g;

    // Butte du château : couleur dédiée pour créer un vrai contraste avec le tapis.
    addBox(BUTTE.w, BUTTE.h, BUTTE.d, 0, -BUTTE.h / 2, 0, mat.butte, g);

    // Le château est volontairement légèrement plus petit que la butte.
    const keep = new THREE.Group();
    keep.scale.set(0.84, 0.90, 0.84);
    keep.position.z = castleKeepOffsetZ(p);
    g.add(keep);
    players[p-1].castleKeep = keep;

    const fz = castleFrontZ(p), rz = castleRearZ(p);
    const parts = players[p-1].castle;

    setCastleHitBox(parts[0], { type: 'box',    x: 0,  z: fz, w: 13.8, d: 3.8 }, p);
    setCastleHitBox(parts[1], { type: 'box',    x: 0,  z: rz, w: 13.8, d: 3.8 }, p);
    setCastleHitBox(parts[2], { type: 'box',    x: -6, z: 0,  w: 3.8,  d: 13.8 }, p);
    setCastleHitBox(parts[3], { type: 'box',    x:  6, z: 0,  w: 3.8,  d: 13.8 }, p);
    setCastleHitBox(parts[4], { type: 'circle', x: -7, z: fz + Math.sign(fz), r: 3.0 }, p);
    setCastleHitBox(parts[5], { type: 'circle', x:  7, z: fz + Math.sign(fz), r: 3.0 }, p);
    setCastleHitBox(parts[6], { type: 'circle', x: -7, z: rz + Math.sign(rz), r: 3.0 }, p);
    setCastleHitBox(parts[7], { type: 'circle', x:  7, z: rz + Math.sign(rz), r: 3.0 }, p);
    setCastleHitBox(parts[8], { type: 'circle', x: 0,  z: 0,  r: 3.9 }, p);

    parts.forEach((_, idx) => createCastlePartMesh(p, idx));
  }

  function findCastleContact(defender) {
    const lx = ball.position.x - castleX(defender);
    const lz = ball.position.z - castleZ(defender);
    const live = players[defender-1].castle.filter(part => part.hp > 0 && part.hit);
    let best = null;

    live.forEach(part => {
      const h = part.hit;
      let inside = false;
      let score = Math.hypot(lx - h.x, lz - h.z);

      if (h.type === 'box') {
        const dx = Math.abs(lx - h.x), dz = Math.abs(lz - h.z);
        inside = dx <= h.w / 2 + CFG.ballR * 0.9 && dz <= h.d / 2 + CFG.ballR * 0.9;
      } else {
        inside = score <= h.r + CFG.ballR * 0.9;
      }

      if (inside && (!best || score < best.score)) best = { part, score };
    });

    return best ? best.part : null;
  }

  function rebuildCastlePart(p, idx) {
    const pl = players[p-1];
    const part = pl.castle[idx];

    if (p !== active) { showToast('Ce n’est pas ton château'); return; }
    if (setupMode || phase !== 'defense' || turnLocked) { showToast('Réparation/reconstruction en défense uniquement'); return; }
    if (part.hp >= part.max) { showToast('Partie déjà intacte'); return; }

    const wasDestroyed = part.hp <= 0;
    const cost = wasDestroyed ? part.rebuildCost : part.cost;
    if (!pay(pl.res, cost)) {
      showToast((wasDestroyed ? 'Reconstruction' : 'Réparation') + ' impossible<br>Il manque des ressources');
      return;
    }

    part.hp = part.max;
    part.built = true;
    createCastlePartMesh(p, idx);
    updateHUD();
    openCastle(p);
    playSfx(wasDestroyed ? 'build' : 'repair', 1.1);
    showToast(part.icon + ' ' + part.name + '<br>' + (wasDestroyed ? 'Reconstruit' : 'Réparé') + ' ' + part.hp + '/' + part.max + ' PV');
  }

  makeCastle(1); makeCastle(2);

  /* ── Tours de défense ── */
  function towerMesh(p, t) {
    if (t.mesh) scene.remove(t.mesh);
    const g = new THREE.Group();
    const cm = getCastleSkinMaterials(p);
    const roofDamaged = roofIsDamaged(t);
    const criticalRoof = roofIsCritical(t);
    const roof = roofDamaged ? cm.roofDamaged : castleRoofMaterial(p);
    const banner = castleBannerMaterial(p);
    const st = t.hp / t.max > 0.35 ? cm.wall : cm.damaged;
    const damaged = t.hp / t.max <= 0.5;
    g.position.copy(t.pos);
    // Les détails de face de la tour (meurtrières / fissures) doivent regarder vers le couloir adverse.
    // Sans cette rotation, les tours rouges regardaient vers l'arrière du joueur 1.
    if (p === 1) g.rotation.y = Math.PI;

    // Tour de défense plus lisible : socle, fût, bandeaux, créneaux, toit, fanion.
    addCyl(2.15, 0.55, 0, 0.28, 0, cm.dark, g, 28);
    addCyl(1.72, 7.05, 0, 3.55, 0, st, g, 28);
    addCyl(1.88, 0.28, 0, 1.65, 0, cm.light, g, 28);
    addCyl(1.92, 0.32, 0, 6.75, 0, cm.light, g, 28);

    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const bx = Math.cos(a) * 1.48;
      const bz = Math.sin(a) * 1.48;
      const m = addBox(0.48, 0.72, 0.48, bx, 7.25, bz, st, g);
      m.rotation.y = -a;
    }

    [-0.42, 0.42].forEach(x => addBox(0.25, 0.9, 0.08, x, 3.8, 1.77, mat.windowDark, g));
    if (damaged) addDamageCrack(g, 0.45, 4.25, 1.83, 'z');

    const roofMesh = addCone(2.18, 3.35, 0, 9.08, 0, roof, g, 28);
    if (roofDamaged) {
      roofMesh.rotation.x = criticalRoof ? 0.18 : 0.09;
      roofMesh.rotation.z = criticalRoof ? -0.16 : -0.07;
      roofMesh.scale.set(criticalRoof ? 0.90 : 0.96, criticalRoof ? 0.84 : 0.94, criticalRoof ? 0.95 : 0.99);
      addDamagedRoofDetails(g, p, 0, 9.55, 0, 2.18, false, criticalRoof);
    }
    addCyl(2.22, 0.16, 0, 7.48, 0, cm.trim, g, 28);
    const pole = addCyl(0.07, 1.25, 0, 11.05, 0, cm.trim, g, 10);
    const flag = addBox(0.86, 0.38, 0.07, p === 1 ? 0.43 : -0.43, 11.42, 0, banner, g);
    if (roofDamaged) { pole.rotation.z = (p === 1 ? -1 : 1) * (criticalRoof ? 0.28 : 0.14); flag.rotation.z = pole.rotation.z; }

    scene.add(g); t.mesh = g; return g;
  }

  function rampSlotPosition(attacker, slot) {
    const defender = enemy(attacker);

    // Les 4 rampes restent dans le couloir d'attaque actif.
    // Leur sortie est calculée à partir de la vraie face de la butte adverse.
    const x = attackX(attacker) + [-5.4, -1.8, 1.8, 5.4][slot];
    const butteFrontZ = castleZ(defender) - dir(attacker) * (BUTTE.d / 2);
    const exitZ = butteFrontZ + dir(attacker) * RAMP.exitOverlap;
    const z = exitZ - dir(attacker) * RAMP.halfLength;

    return new THREE.Vector3(x, 0.34, z);
  }

  function createRampVisualAt(attacker, pos, material, ghost = false, width = RAMP.width) {
    const g = new THREE.Group();
    g.position.copy(pos);

    const length = RAMP.length;
    const slopeAngle = -dir(attacker) * Math.atan2(RAMP.surfaceEndY - RAMP.surfaceStartY, RAMP.length);
    const railMat = ghost ? material : mat.wood;
    const midY = (RAMP.surfaceStartY + RAMP.surfaceEndY) / 2;

    const main = addBox(width, .34, length, 0, midY, 0, material, g);
    main.rotation.x = slopeAngle;

    const entry = addBox(width + .35, .16, 3.0, 0, RAMP.surfaceStartY, -dir(attacker) * (RAMP.halfLength - 1.35), material, g);
    entry.rotation.x = slopeAngle * .25;

    const r1 = addBox(.30, .85, length, -width/2-.30, midY + .46, 0, railMat, g);
    const r2 = addBox(.30, .85, length,  width/2+.30, midY + .46, 0, railMat, g);
    r1.rotation.x = slopeAngle; r2.rotation.x = slopeAngle;

    const exit = addBox(width + .75, .18, 1.5, 0, RAMP.surfaceEndY, dir(attacker) * (RAMP.halfLength - .55), material, g);
    exit.rotation.x = slopeAngle;
    return g;
  }

  function createRampVisual(attacker, slot, material, ghost = false) {
    return createRampVisualAt(attacker, rampSlotPosition(attacker, slot), material, ghost, RAMP.width);
  }

  function createSideRampVisual(attacker, sideIndex = 0, material, ghost = false) {
    return createRampVisualAt(attacker, sideRampPosition(attacker, sideIndex), material, ghost, SIDE_RIDGE.width);
  }

  function focusCameraOnRampArea(attacker, slot) {
    const defender = enemy(attacker);
    const rampPos = rampSlotPosition(attacker, slot);
    const frontZ = castleZ(defender) - dir(attacker) * (BUTTE.d / 2);
    const target = new THREE.Vector3(rampPos.x, 2.8, frontZ + dir(attacker) * 1.5);
    const pos = new THREE.Vector3(rampPos.x, 20, frontZ - dir(attacker) * 30);
    rampCameraFocus = { target, pos, until: Date.now() + 2800 };
  }

  function focusCameraOnSideRampArea(attacker, sideIndex = 0) {
    const rampPos = sideRampPosition(attacker, sideIndex);
    const ridgeZ = sideRidgeStartZ(attacker);
    const sideSign = sideRidgeSideSign(attacker, sideIndex);
    const target = new THREE.Vector3(rampPos.x, 2.8, ridgeZ + dir(attacker) * 2.5);
    const pos = new THREE.Vector3(rampPos.x - sideSign * 7.0, 19, ridgeZ - dir(attacker) * 27);
    rampCameraFocus = { target, pos, until: Date.now() + 2800 };
  }

  function focusCameraOnDebrisList(debrisList, duration = DEBRIS_FOCUS_DURATION) {
    const visible = (debrisList || []).filter(d => d && Number.isFinite(d.x) && Number.isFinite(d.z));
    if (!visible.length) return false;

    const avg = visible.reduce((acc, d) => {
      acc.x += d.x;
      acc.z += d.z;
      acc.y += Number.isFinite(d.y) ? d.y : 0.34;
      return acc;
    }, { x: 0, y: 0, z: 0 });

    const x = avg.x / visible.length;
    const z = avg.z / visible.length;
    const y = avg.y / visible.length;
    const attacker = visible[0].attacker || active;
    const target = new THREE.Vector3(x, Math.max(2.4, y + 1.9), z);
    const pos = target.clone().add(new THREE.Vector3(0, 17.5, -dir(attacker) * 26));
    rampCameraFocus = { target, pos, until: Date.now() + duration };
    return true;
  }

  function introPose(target, player, height = 34, distance = 38, xOffset = 0) {
    return {
      target: target.clone(),
      pos: target.clone().add(new THREE.Vector3(xOffset, height, -dir(player) * distance))
    };
  }

  function startTurnIntroCamera(player = active) {
    const now = Date.now();
    const opponent = enemy(player);
    const attackLaneX = attackX(player);
    const defenseLaneX = defenseX(player);

    // Survol de début de tour plus lent et moins zoomé :
    // château adverse → haut du couloir → bas du couloir → défense du joueur actif → château actif → vue générale.
    const enemyCastleTarget = new THREE.Vector3(attackLaneX, 4.0, castleZ(opponent));
    const attackLaneHighTarget = new THREE.Vector3(attackLaneX, 2.0, dir(player) * 38);
    const attackLaneLowTarget = new THREE.Vector3(attackLaneX, 1.8, -dir(player) * 28);
    const ownDefenseMidTarget = new THREE.Vector3(defenseLaneX, 2.0, -dir(player) * 24);
    const ownCastleTarget = new THREE.Vector3(defenseLaneX, 4.0, castleZ(player));
    const generalTarget = new THREE.Vector3(0, 1.2, 0);
    const generalPos = new THREE.Vector3(0, 112, player === 1 ? 118 : -118);

    const a = introPose(enemyCastleTarget, player, 32, 42);
    const b = introPose(attackLaneHighTarget, player, 42, 34);
    const c = introPose(attackLaneLowTarget, player, 44, 36);
    const d = introPose(ownDefenseMidTarget, player, 42, 36);
    const e = introPose(ownCastleTarget, player, 34, 45);

    turnIntroCamera = {
      started: now,
      until: now + TURN_INTRO_CAMERA_DURATION,
      points: [
        { at: 0.00, pos: a.pos, target: a.target },
        { at: 0.22, pos: b.pos, target: b.target },
        { at: 0.46, pos: c.pos, target: c.target },
        { at: 0.66, pos: d.pos, target: d.target },
        { at: 0.84, pos: e.pos, target: e.target },
        { at: 1.00, pos: generalPos, target: generalTarget }
      ]
    };
  }

  function stopTurnIntroCamera() {
    turnIntroCamera = null;
  }

  function sampleTurnIntroCamera() {
    if (!turnIntroCamera) return null;
    const now = Date.now();
    if (now >= turnIntroCamera.until) {
      turnIntroCamera = null;
      return null;
    }
    const duration = Math.max(1, turnIntroCamera.until - turnIntroCamera.started);
    const raw = THREE.MathUtils.clamp((now - turnIntroCamera.started) / duration, 0, 1);
    const points = Array.isArray(turnIntroCamera.points) && turnIntroCamera.points.length >= 2
      ? turnIntroCamera.points
      : [
        { at: 0, pos: turnIntroCamera.startPos, target: turnIntroCamera.startTarget },
        { at: 1, pos: turnIntroCamera.endPos, target: turnIntroCamera.endTarget }
      ];

    let a = points[0], b = points[points.length - 1];
    for (let i = 0; i < points.length - 1; i++) {
      if (raw >= points[i].at && raw <= points[i + 1].at) {
        a = points[i];
        b = points[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, b.at - a.at);
    const localRaw = THREE.MathUtils.clamp((raw - a.at) / span, 0, 1);
    const t = localRaw * localRaw * (3 - 2 * localRaw);
    return {
      target: a.target.clone().lerp(b.target, t),
      pos: a.pos.clone().lerp(b.pos, t)
    };
  }

  function updateTowerGhosts() {
    players.forEach((pl, pi) => {
      const player = pi + 1;
      (pl.sideRamps || []).forEach(sideRamp => {
        if (sideRamp.ghost) { scene.remove(sideRamp.ghost); sideRamp.ghost = null; }
        if (!sideRamp.built) {
          const g = createSideRampVisual(player, sideRamp.sideIndex, mat.ghost, true);
          scene.add(g); sideRamp.ghost = g;
        }
      });
      pl.ramps.forEach((r, slot) => {
        if (r.ghost) { scene.remove(r.ghost); r.ghost = null; }
        if (r.unlocked && !r.built) {
          const g = createRampVisual(player, slot, mat.ghost, true);
          scene.add(g); r.ghost = g;
        }
      });
    });
  }

  function classicRampOptionsForActive() {
    const pl = players[active - 1];
    return pl.ramps
      .map((r, slot) => ({ slot, ramp: r, cost: rampCost[slot], affordable: canPay(pl.res, rampCost[slot]) }))
      .filter(item => item.ramp.unlocked && !item.ramp.built);
  }

  function sideRampOptionsForActive() {
    const pl = players[active - 1];
    return (pl.sideRamps || [])
      .map((r, sideSlot) => ({ sideSlot, ramp: r, cost: SIDE_RIDGE.cost, affordable: canPay(pl.res, SIDE_RIDGE.cost) }))
      .filter(item => !item.ramp.built);
  }

  function openRampChoice(kind = 'classic') {
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || dragging || isAITurn()) return;
    const options = kind === 'side' ? sideRampOptionsForActive() : classicRampOptionsForActive();
    if (!options.length) {
      showToast(kind === 'side' ? 'Toutes les rampes latérales sont déjà construites' : 'Aucun emplacement débloqué');
      return;
    }
    if (!rampChoiceOverlay || !rampChoiceList) return;
    if (rampChoiceTitle) rampChoiceTitle.textContent = kind === 'side' ? '🪵 Choisir une rampe latérale' : '🪵 Choisir une rampe château';
    if (rampChoiceSubtitle) rampChoiceSubtitle.textContent = kind === 'side'
      ? 'Les rampes latérales donnent accès au couloir haut et au trou de vol.'
      : 'Choisis quel emplacement débloqué tu veux construire.';
    rampChoiceList.innerHTML = options.map(item => {
      if (kind === 'side') {
        return `<button type="button" data-ramp-kind="side" data-ramp-slot="${item.sideSlot}" ${item.affordable ? '' : 'disabled'}>
          <b>Rampe latérale ${item.sideSlot + 1}</b>
          <span>${sideRidgeLabel(item.ramp.sideIndex)} · ${costTxt(item.cost)}</span>
          <small>${item.affordable ? 'Construire ici' : 'Ressources insuffisantes'}</small>
        </button>`;
      }
      return `<button type="button" data-ramp-kind="classic" data-ramp-slot="${item.slot}" ${item.affordable ? '' : 'disabled'}>
        <b>Rampe château ${item.slot + 1}</b>
        <span>Emplacement débloqué · ${costTxt(item.cost)}</span>
        <small>${item.affordable ? 'Construire cette rampe' : 'Ressources insuffisantes'}</small>
      </button>`;
    }).join('');
    rampChoiceList.querySelectorAll('[data-ramp-slot]').forEach(btn => {
      btn.onclick = () => {
        const slot = Number(btn.dataset.rampSlot);
        const selectedKind = btn.dataset.rampKind;
        closeRampChoice();
        if (selectedKind === 'side') beginRampBuildSelection('side', slot);
        else beginRampBuildSelection('classic', slot);
      };
    });
    rampChoiceOverlay.classList.add('show');
  }

  function beginRampBuildSelection(kind, slot) {
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || dragging || isAITurn()) return;
    if (kind === 'side') {
      const pl = players[active - 1];
      const r = (pl.sideRamps || [])[slot];
      if (!r || r.built) { showToast('Rampe latérale indisponible'); return; }
      const pos = sideRampPosition(active, r.sideIndex);
      focusCameraOnSideRampArea(active, r.sideIndex);
      setPendingWorldAction({
        type: 'build-side-ramp',
        title: '🪵 Rampe latérale ' + (slot + 1),
        text: 'Clique directement sur l’emplacement fantôme pour construire cette rampe.',
        x: pos.x,
        z: pos.z,
        radius: 5.2,
        refocus: () => focusCameraOnSideRampArea(active, r.sideIndex),
        execute: () => buildSideRampForActive(slot)
      });
      return;
    }

    const pl = players[active - 1];
    const r = pl.ramps[slot];
    if (!r || !r.unlocked || r.built) { showToast('Rampe château indisponible'); return; }
    const pos = rampSlotPosition(active, slot);
    focusCameraOnRampArea(active, slot);
    setPendingWorldAction({
      type: 'build-classic-ramp',
      title: '🪵 Rampe château ' + (slot + 1),
      text: 'Clique directement sur l’emplacement fantôme pour construire cette rampe.',
      x: pos.x,
      z: pos.z,
      radius: 5.4,
      refocus: () => focusCameraOnRampArea(active, slot),
      execute: () => buildRampForActive(slot)
    });
  }

  function buildSideRampForActive(sideSlotOverride = null) {
    // Rampes latérales libres : indépendantes des rampes classiques et des tours adverses.
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || dragging) return;
    const p = active, pl = players[p-1];
    const sideSlot = Number.isInteger(sideSlotOverride) ? sideSlotOverride : (pl.sideRamps || []).findIndex(r => !r.built);
    const sideList = pl.sideRamps || [];
    if (sideSlot < 0 || !sideList[sideSlot] || sideList[sideSlot].built) { showToast('Toutes les rampes latérales sont déjà construites'); return; }
    const cost = SIDE_RIDGE.cost;
    if (!pay(pl.res, cost)) { showToast('Ressources insuffisantes'); return; }
    const r = sideList[sideSlot];
    r.built = true; r.hp = r.max; r.usedThisShot = false;
    if (r.ghost) { scene.remove(r.ghost); r.ghost = null; }
    const g = createSideRampVisual(p, r.sideIndex, mat.ramp, false);
    scene.add(g); r.mesh = g;
    focusCameraOnSideRampArea(p, r.sideIndex);
    updateHUD();
    playSfx('build', 1.1);
    bigMessage('RAMPE LATÉRALE CONSTRUITE', sideRidgeLabel(r.sideIndex) + '<br>Couloir haut vers un trou de vol', 'gain', 1250);
    showToast('Rampe latérale construite<br>' + costTxt(cost));
  }

  function buildRampForActive(slotOverride = null) {
    // Rampes classiques : indépendantes des rampes latérales, mais liées aux tours adverses.
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || dragging) return;
    const p = active, pl = players[p-1];
    const slot = Number.isInteger(slotOverride) ? slotOverride : pl.ramps.findIndex(r => r.unlocked && !r.built);
    if (slot < 0 || !pl.ramps[slot] || !pl.ramps[slot].unlocked || pl.ramps[slot].built) { showToast('Aucun emplacement débloqué'); return; }
    const cost = rampCost[slot];
    if (!pay(pl.res, cost)) { showToast('Ressources insuffisantes'); return; }
    const r = pl.ramps[slot]; r.built = true; r.hp = r.max; r.usedThisShot = false;
    if (r.ghost) { scene.remove(r.ghost); r.ghost = null; }
    const g = createRampVisual(p, slot, mat.ramp, false);
    scene.add(g); r.mesh = g;
    focusCameraOnRampArea(p, slot);
    updateHUD();
    playSfx('build', 1.1);
    bigMessage('RAMPE CONSTRUITE', 'Rampe château ' + (slot + 1) + '<br>Caméra sur le devant du château', 'gain', 950);
    showToast('Rampe construite<br>' + costTxt(cost));
  }

  function buySecondBallForActive(options = {}) {
    // Achat au marché : la seconde bille reste une action d'assaut, mais plus un bouton séparé.
    const fromMarket = !!options.fromMarket;
    if (turnLocked || setupMode || phase !== 'attack' || shotStarted || dragging) return false;
    if (fromMarket && marketTradeUsedThisTurn) return false;

    const pl = players[active-1];
    if (pl.secondBallTurns > 0) {
      showToast('Seconde bille déjà active<br>' + pl.secondBallTurns + ' tour(s)');
      return false;
    }

    const secondBallCost = getSecondBallCost();
    if (!pay(pl.res, secondBallCost)) {
      showToast('Ressources insuffisantes');
      return false;
    }

    pl.secondBallTurns = 3;
    pl.extraShotsLeft = 1;
    pl.secondBallActiveThisTurn = true;

    if (fromMarket) {
      marketTradeUsedThisTurn = true;
      turnSummary.push('Marché : seconde bille achetée (-' + costTxt(secondBallCost) + ')');
    }

    updateHUD();
    if (fromMarket) playRandomSfx('marketButton', 'marketExchange', 1.15);
    else playSfx('confirm', 1);
    bigMessage('SECONDE BILLE', 'Achetée au marché · disponible pour cet assaut', 'second', 1200);
    showToast('Seconde bille achetée<br>Elle sera jouée après ce lancer');
    return true;
  }

  function buySecondBallFromMarket() {
    const bought = buySecondBallForActive({ fromMarket: true });
    refreshMarket();
    if (bought) {
      setTimeout(() => closeMarket(), 250);
    }
  }

  /* ── Bille ivoire ── */
  const ball = new THREE.Mesh(new THREE.SphereGeometry(CFG.ballR, 48, 48), mat.ivory);
  ball.castShadow = true;
  scene.add(ball);

  // Légère lumière sur la bille pour la faire briller
  const ballLight = new THREE.PointLight(0xfff8e8, 0.5, 8);
  ball.add(ballLight);

  const ballPulseAura = new THREE.Mesh(
    new THREE.SphereGeometry(CFG.ballR * 1.42, 32, 18),
    new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  ballPulseAura.visible = false;
  ball.add(ballPulseAura);

  function updateBallPulseColors(player = active) {
    if (!ballPulseAura) return;
    const skin = findBallSkin(getSelectedBallSkinId(player));
    const color = skin.accent !== undefined ? skin.accent : skin.color;
    ballPulseAura.material.color.setHex(color);
  }

  function updateBallPulseEffect() {
    const effectId = getSelectedBallEffectId(active);
    const pulseActive = gameStarted && !gamePaused && effectId === 'pulse';
    if (!pulseActive) {
      ballPulseAura.visible = false;
      ballPulseAura.material.opacity = 0;
      ballLight.intensity = 0.5;
      return;
    }

    const beat = (Math.sin(_t * 6.2) + 1) * 0.5;
    const softBeat = Math.pow(beat, 2.2);
    const size = 1.02 + softBeat * 0.34;
    ballPulseAura.visible = true;
    ballPulseAura.scale.setScalar(size);
    ballPulseAura.material.opacity = 0.10 + softBeat * 0.24;
    ballLight.intensity = 0.55 + softBeat * 0.55;
  }

  // Traînée cosmétique de bille : purement visuelle, aucun effet sur la physique.
  // Effet récupéré de la version fournie : nuage léger, plus doux et mieux coloré.
  const BALL_TRAIL_COUNT = 40;
  const BALL_TRAIL_MIN_SPEED = 0.06;
  const BALL_TRAIL_SAMPLE_DIST_SQ = 0.06;
  const BALL_TRAIL_SIDE_SPREAD = 0.18;
  let ballTrail = [];
  let ballTrailSamples = [];

  const ballSkinMaterials = {};
  function getBallSkinMaterial(skinId) {
    const skin = findBallSkin(skinId);
    if (!ballSkinMaterials[skin.id]) {
      const matOptions = {
        color: skin.color,
        roughness: skin.roughness,
        metalness: skin.metalness,
        envMapIntensity: 1.2
      };
      if (skin.emissive !== undefined) {
        matOptions.emissive = new THREE.Color(skin.emissive);
        matOptions.emissiveIntensity = skin.emissiveIntensity || 0.05;
      }
      if (skin.transparent || skin.opacity !== undefined) {
        matOptions.transparent = true;
        matOptions.opacity = skin.opacity ?? 0.86;
      }
      ballSkinMaterials[skin.id] = new THREE.MeshStandardMaterial(matOptions);
    }
    return ballSkinMaterials[skin.id];
  }

  function applyActiveBallSkin(player = active) {
    const skin = findBallSkin(getSelectedBallSkinId(player));
    ball.material = getBallSkinMaterial(skin.id);
    ballLight.color.setHex(skin.color);
    updateBallTrailColors(player);
    updateBallPulseColors(player);
  }
  applyActiveBallSkin(active);

  function getBallTrailColor(player = active) {
    const skin = findBallSkin(getSelectedBallSkinId(player));
    return skin.accent !== undefined ? skin.accent : skin.color;
  }

  function updateBallTrailColors(player = active) {
    if (!ballTrail || !ballTrail.length) return;
    const baseCol = new THREE.Color(getBallTrailColor(player));
    // Teinte éclaircie pour les étincelles : même couleur que la bille, pas blanc pur.
    const sparkCol = baseCol.clone().lerp(new THREE.Color(0xffffff), 0.45);
    ballTrail.forEach(layers => {
      if (!Array.isArray(layers)) { layers.material.color.copy(baseCol); return; }
      layers.forEach(p => {
        p.material.color.copy(p.userData.isSpark ? sparkCol : baseCol);
      });
    });
  }

  function createBallTrailTexture() {
    // Conservé pour compatibilité mais non utilisé directement.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    return new THREE.CanvasTexture(canvas);
  }

  /* ── Génération des textures canvas pour chaque couche ── */
  function makeTrailTex(stops) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    stops.forEach(([t, a]) => g.addColorStop(t, `rgba(255,255,255,${a})`));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }

  // Cœur : net et intense au centre.
  const _texCore  = makeTrailTex([[0,0.92],[0.15,0.72],[0.40,0.25],[0.68,0.05],[1,0]]);
  // Halo : large et très doux.
  const _texHalo  = makeTrailTex([[0,0.35],[0.28,0.18],[0.60,0.06],[0.86,0.01],[1,0]]);
  // Étincelle : concentrée, petite.
  const _texSpark = makeTrailTex([[0,1.0],[0.10,0.78],[0.30,0.15],[0.58,0.02],[1,0]]);

  function _makeSpriteMat(tex, color) {
    return new THREE.SpriteMaterial({
      color, map: tex, transparent: true, opacity: 0,
      depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending
    });
  }

  function buildBallTrail() {
    const baseCol  = new THREE.Color(getBallTrailColor(active));
    const sparkCol = baseCol.clone().lerp(new THREE.Color(0xffffff), 0.45);

    for (let i = 0; i < BALL_TRAIL_COUNT; i++) {
      const layers = [];

      // Couche 1 — cœur lumineux.
      const core = new THREE.Sprite(_makeSpriteMat(_texCore, baseCol.clone()));
      core.renderOrder = 5;
      core.visible = false;
      core.userData.isCore = true;
      scene.add(core);
      layers.push(core);

      // Couche 2 — halo large sur les segments proches.
      if (i < 22) {
        const halo = new THREE.Sprite(_makeSpriteMat(_texHalo, baseCol.clone()));
        halo.renderOrder = 4;
        halo.visible = false;
        halo.userData.isHalo = true;
        scene.add(halo);
        layers.push(halo);
      }

      // Couche 3 — petites étincelles latérales proches de la bille.
      if (i < 8) {
        [-1, 1].forEach(sv => {
          const spark = new THREE.Sprite(_makeSpriteMat(_texSpark, sparkCol.clone()));
          spark.renderOrder = 6;
          spark.visible = false;
          spark.userData.isSpark = true;
          spark.userData.sv = sv;
          scene.add(spark);
          layers.push(spark);
        });
      }

      ballTrail.push(layers);
    }
  }

  function clearBallTrail() {
    ballTrailSamples = [];
    ballTrail.forEach(layers => {
      const arr = Array.isArray(layers) ? layers : [layers];
      arr.forEach(p => { p.visible = false; p.material.opacity = 0; });
    });
  }

  function updateBallTrail() {
    const speed = velocity.length();
    const moving = gameStarted && !gamePaused && phase === 'attack' && shotStarted && !canShoot && !ballInHole && !turnLocked && speed > BALL_TRAIL_MIN_SPEED;

    if (moving) {
      const last = ballTrailSamples[0];
      if (!last || last.distanceToSquared(ball.position) > BALL_TRAIL_SAMPLE_DIST_SQ) {
        const sample = ball.position.clone();
        sample._spd = speed;
        ballTrailSamples.unshift(sample);
        if (ballTrailSamples.length > BALL_TRAIL_COUNT + 10) ballTrailSamples.length = BALL_TRAIL_COUNT + 10;
      }
    } else if (ballTrailSamples.length) {
      ballTrailSamples.pop();
    }

    const moveDir = speed > 0.001 ? velocity.clone().setY(0).normalize() : new THREE.Vector3(0, 0, 1);
    const sideVec = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
    const sFull   = Math.min(1.0, speed / 0.85);

    const baseCol  = new THREE.Color(getBallTrailColor(active));
    const brightCol = baseCol.clone().lerp(new THREE.Color(0xffffff), sFull * 0.28);
    const sparkCol  = baseCol.clone().lerp(new THREE.Color(0xffffff), 0.45 + sFull * 0.15);

    const maxVisible = BALL_TRAIL_COUNT - 1;

    for (let i = 0; i < ballTrail.length; i++) {
      const sample = ballTrailSamples[i + 1];
      const layers = Array.isArray(ballTrail[i]) ? ballTrail[i] : [ballTrail[i]];

      if (!sample) {
        layers.forEach(p => { p.visible = false; p.material.opacity = 0; });
        continue;
      }

      const age    = i / maxVisible;
      const decay  = Math.pow(Math.max(0, 1 - age), 1.5);
      const spd_i  = Math.min(1, (sample._spd ?? speed) / 0.85);

      // Ondulation organique : la traînée reste derrière la bille, sans faire un trait rigide.
      const wave = Math.sin(i * 1.9 + _t * 2.1) * BALL_TRAIL_SIDE_SPREAD * decay;
      const lift = Math.cos(i * 1.35) * 0.06 * decay;
      const bx   = sample.x + sideVec.x * wave;
      const by   = sample.y + 0.08 + lift;
      const bz   = sample.z + sideVec.z * wave;

      layers.forEach(p => {
        if (p.userData.isCore) {
          const sz = (0.28 + 1.05 * decay) * (0.82 + spd_i * 0.30);
          p.position.set(bx, by, bz);
          p.scale.set(sz * 1.12, sz, 1);
          p.material.color.copy(brightCol);
          p.material.opacity = 0.58 * decay * (0.58 + spd_i * 0.42);
          p.visible = true;

        } else if (p.userData.isHalo) {
          const sz = (0.65 + 2.2 * decay) * (0.62 + spd_i * 0.42);
          p.position.set(bx, by, bz);
          p.scale.set(sz, sz * 0.80, 1);
          p.material.color.copy(brightCol);
          p.material.opacity = 0.18 * decay * spd_i;
          p.visible = decay > 0.09 && spd_i > 0.25;

        } else if (p.userData.isSpark) {
          const sv  = p.userData.sv;
          const off = sv * (0.18 + 0.22 * decay);
          const sz  = (0.09 + 0.28 * decay) * spd_i;
          p.position.set(
            bx + sideVec.x * off + (Math.random() - 0.5) * 0.06,
            by + 0.04 + Math.random() * 0.08,
            bz + sideVec.z * off + (Math.random() - 0.5) * 0.06
          );
          p.scale.set(sz, sz, 1);
          p.material.color.copy(sparkCol);
          p.material.opacity = 0.72 * decay * spd_i * (0.45 + Math.random() * 0.55);
          p.visible = spd_i > 0.40 && decay > 0.30;
        }
      });
    }
  }

  buildBallTrail();
  updateBallTrailColors(active);

  /* ── Marqueurs et ligne de visée ── */
  const aimMat = new THREE.LineDashedMaterial({
    color: 0xf7d46a,
    transparent: true,
    opacity: 0.86,
    dashSize: 1.25,
    gapSize: 0.55
  });
  const aimLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), aimMat);
  scene.add(aimLine); aimLine.visible = false;

  const aimEndRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.055, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xffdf6b, transparent: true, opacity: 0.9, depthWrite: false })
  );
  aimEndRing.rotation.x = Math.PI / 2;
  aimEndRing.visible = false;
  scene.add(aimEndRing);

  const aimDots = [];
  for (let i = 0; i < 7; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.10 + i * 0.015, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.72 - i * 0.055, depthWrite: false })
    );
    dot.visible = false;
    scene.add(dot);
    aimDots.push(dot);
  }

  function setAimVisualsVisible(value) {
    aimLine.visible = value;
    aimEndRing.visible = value;
    aimDots.forEach(dot => dot.visible = value);
  }

  const launchLine = addBox(CFG.laneW - 3, 0.07, 0.5, attackX(active), 0.35, startZ(active),
    new THREE.MeshBasicMaterial({ color: 0xb87820, transparent: true, opacity: 0.7 }));

  // Ancien repère blanc sous la bille supprimé : il gênait la lecture visuelle avec la bille réduite.
  const selectMarker = addBox(1.1, 0.08, 1.8, attackX(active), 0.41, startZ(active),
    new THREE.MeshBasicMaterial({ color: 0xf5ead8, transparent: true, opacity: 0 }));
  selectMarker.visible = false;

  /* ── Étincelles & feedback visuel ── */
  const sparks = [];
  const fxRings = [];
  for (let i = 0; i < 34; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0 }));
    s.position.y = -999; s.userData.v = new THREE.Vector3(); s.userData.life = 0;
    scene.add(s); sparks.push(s);
  }

  function worldToScreen(pos) {
    const rect = canvas.getBoundingClientRect();
    const v = pos.clone().project(camera);
    return {
      x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-v.y * 0.5 + 0.5) * rect.height
    };
  }

  function floatText(html, pos = ball.position, variant = 'neutral') {
    const p = worldToScreen(pos);
    const node = document.createElement('div');
    node.className = 'fx-float ' + variant;
    node.innerHTML = html;
    node.style.left = p.x + 'px';
    node.style.top = p.y + 'px';
    fxLayer.appendChild(node);
    setTimeout(() => node.remove(), 1150);
  }

  function hideBigMessage() {
    clearTimeout(bigFx._t);
    bigFx.classList.remove('show');
  }

  function bigMessage(title, text = '', variant = 'gold', duration = 1900) {
    // Si un écran de transition/récap/victoire est déjà ouvert, on n'ajoute pas un second panneau au centre.
    if (turnOverlay.classList.contains('show') && variant !== 'victory') {
      showToast(title + (text ? '<br>' + text : ''));
      return;
    }
    bigFx.className = '';
    bigFxTitle.textContent = title;
    bigFxText.innerHTML = text;
    void bigFx.offsetWidth;
    bigFx.classList.add('show', variant);
    clearTimeout(bigFx._t);
    bigFx._t = setTimeout(() => bigFx.classList.remove('show'), duration);
  }

  function battleNotice(title, text = '', variant = 'damage', duration = 2200) {
    let stack = document.getElementById('battleNoticeStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'battleNoticeStack';
      document.body.appendChild(stack);
    }
    const item = document.createElement('div');
    item.className = 'battle-notice ' + variant;
    item.innerHTML = `<strong>${title}</strong>${text ? `<span>${text}</span>` : ''}`;
    stack.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    setTimeout(() => {
      item.classList.remove('show');
      setTimeout(() => item.remove(), 260);
    }, duration);
  }

  const ACTION_CAMERA_ZOOM_ENABLED = false;

  function focusEventCameraOn(pos, duration = 1250, height = 13, distance = 19) {
    // Désactivé volontairement : les zooms automatiques pendant les actions donnaient
    // l'impression que la bille disparaissait. On garde les effets, textes, tremblements
    // et particules, mais la caméra reste stable pendant le lancer.
    if (!ACTION_CAMERA_ZOOM_ENABLED) return;
    if (!pos || gameOver || gamePaused) return;
    const target = pos.clone ? pos.clone() : new THREE.Vector3(pos.x || 0, pos.y || 0, pos.z || 0);
    target.y = Math.max(1.8, target.y || 1.8);
    const viewPos = target.clone().add(new THREE.Vector3(0, height, -dir(active) * distance));
    rampCameraFocus = { target, pos: viewPos, until: Date.now() + duration };
  }

  function showShotTitle(title, text = '', variant = 'combo', pos = ball.position, duration = 2300) {
    bigMessage(title, text, variant, duration);
    battleNotice(title, text, variant, Math.max(2500, duration + 400));
    if (pos && pos.clone) {
      floatText(title.replace(/\s+/g, '<br>'), pos.clone().add(new THREE.Vector3(0, 2.4, 0)), variant);
    }
  }

  function progressStory(title, text = '', icon = '🏆') {
    battleNotice(icon + ' ' + title, text, 'progress-fun', 3300);
  }

  function aiIntentLabel(type) {
    return {
      classicRamp: 'ouvre une route vers le château',
      sideTheft: 'tente un trou de vol',
      tower: 'attaque une tour',
      kit: 'cherche un kit utile',
      bonusHole: 'vise un trou bonus',
      hole: 'cherche des ressources',
      lane: 'prépare un tir libre'
    }[type] || 'prépare un tir varié';
  }

  function showAIIntent(plan, label) {
    const txt = label || aiIntentLabel(plan && plan.type);
    battleNotice('🤖 INTENTION IA', txt, 'ai-intent', 3200);
    bigMessage('INTENTION IA', '🤖 ' + txt, 'second', 1550);
  }

  function setButtonHint(btn, reason, readyText) {
    if (!btn) return;
    if (btn.disabled && reason) {
      btn.title = reason;
      btn.dataset.lockReason = reason;
    } else {
      btn.title = readyText || btn.title || '';
      delete btn.dataset.lockReason;
    }
  }

  function pulseResource(type) {
    const target = UI[type];
    if (!target) return;
    target.classList.remove('resource-bump');
    void target.offsetWidth;
    target.classList.add('resource-bump');
  }

  function resourceIcon(type) {
    return { stone: '🪨', wood: '🪵', gold: '🪙', relic: '🏺' }[type] || '✨';
  }

  function resourceClass(type) {
    return { stone: 'stone', wood: 'wood', gold: 'gold', relic: 'relic' }[type] || 'gain';
  }

  function playResourceGainSfx(reward, total = 0) {
    const entries = Object.entries(reward || {}).filter(([, amount]) => Number(amount) > 0);
    if (!entries.length) return;
    const dominant = entries.slice().sort((a, b) => Number(b[1]) - Number(a[1]))[0][0];
    if (entries.length >= 2 || total >= 12) {
      playRandomSfx('combo', 'jackpot', total >= 12 ? 1.35 : 1.05);
      return;
    }
    if (dominant === 'wood') playRandomSfx('gainWood', 'gain', 1.0);
    else if (dominant === 'stone') playRandomSfx('gainStone', 'gain', 1.0);
    else if (dominant === 'gold') playRandomSfx('gainGold', 'jackpot', 1.08);
    else playSfx('gain', 1.0);
  }

  function getResourceTarget(type) {
    const counter = UI[type];
    if (!counter) return null;
    return counter.closest('span') || counter;
  }

  function flyResourceToHud(type, amount, fromWorldPos, tokenIndex = 0) {
    const target = getResourceTarget(type);
    if (!target || !fromWorldPos) {
      setTimeout(() => pulseResource(type), 220);
      return;
    }
    const start = worldToScreen(fromWorldPos);
    const endRect = target.getBoundingClientRect();
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;
    const jitterX = (Math.random() - .5) * 54;
    const jitterY = (Math.random() - .5) * 32;
    const node = document.createElement('div');
    node.className = 'resource-fly-token ' + resourceClass(type);
    node.innerHTML = '<span>' + resourceIcon(type) + '</span><b>+' + amount + '</b>';
    node.style.left = (start.x + jitterX) + 'px';
    node.style.top = (start.y + jitterY) + 'px';
    node.style.setProperty('--tx', (endX - start.x - jitterX) + 'px');
    node.style.setProperty('--ty', (endY - start.y - jitterY) + 'px');
    node.style.animationDelay = (tokenIndex * 0.025) + 's';
    document.body.appendChild(node);
    setTimeout(() => {
      pulseResource(type);
      node.remove();
    }, 760 + tokenIndex * 25);
  }

  function spawnResourceSplash(type, amount, fromWorldPos) {
    if (!fromWorldPos) return;
    const p = worldToScreen(fromWorldPos);
    const count = Math.min(14, Math.max(5, Math.ceil(Number(amount || 1) * 0.9)));
    for (let i = 0; i < count; i++) {
      const node = document.createElement('div');
      node.className = 'resource-splash-token ' + resourceClass(type);
      node.textContent = resourceIcon(type);
      node.style.left = p.x + 'px';
      node.style.top = p.y + 'px';
      node.style.setProperty('--sx', ((Math.random() - .5) * 110).toFixed(1) + 'px');
      node.style.setProperty('--sy', (-28 - Math.random() * 86).toFixed(1) + 'px');
      node.style.animationDelay = (i * 0.018).toFixed(3) + 's';
      document.body.appendChild(node);
      setTimeout(() => node.remove(), 880);
    }
  }

  function animateResourceReward(reward, fromWorldPos) {
    Object.entries(reward || {}).forEach(([type, amount], index) => {
      amount = Number(amount) || 0;
      if (!amount) return;
      spawnResourceSplash(type, amount, fromWorldPos);
      // Plus généreux visuellement : davantage de jetons partent vers la barre.
      const tokenCount = Math.min(12, Math.max(2, Math.ceil(amount / 1.45)));
      const perToken = Math.max(1, Math.floor(amount / tokenCount));
      for (let i = 0; i < tokenCount; i++) {
        const value = i === tokenCount - 1 ? Math.max(1, amount - perToken * (tokenCount - 1)) : perToken;
        setTimeout(() => flyResourceToHud(type, value, fromWorldPos, i), index * 105 + i * 48);
      }
    });
  }

  function screenBurst(title, html = '', variant = 'gain', duration = 1700) {
    if (!fxLayer) return;
    const node = document.createElement('div');
    node.className = 'screen-burst ' + variant;
    node.innerHTML = '<strong>' + title + '</strong>' + (html ? '<span>' + html + '</span>' : '');
    document.body.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 320);
    }, duration);
  }

  function spawnRewardConfetti(reward, fromWorldPos, boost = 1) {
    const entries = Object.entries(reward || {}).filter(([, amount]) => Number(amount) > 0);
    if (!entries.length) return;
    const source = fromWorldPos ? worldToScreen(fromWorldPos) : { x: innerWidth / 2, y: innerHeight / 2 };
    entries.forEach(([type, amount], entryIndex) => {
      const count = Math.min(26, Math.max(7, Math.ceil(Number(amount) * 1.25 * boost)));
      for (let i = 0; i < count; i++) {
        const node = document.createElement('div');
        node.className = 'reward-confetti ' + resourceClass(type);
        node.textContent = resourceIcon(type);
        node.style.left = source.x + 'px';
        node.style.top = source.y + 'px';
        const angle = Math.random() * Math.PI * 2;
        const radius = 70 + Math.random() * (145 + 40 * boost);
        node.style.setProperty('--cx', (Math.cos(angle) * radius).toFixed(1) + 'px');
        node.style.setProperty('--cy', (Math.sin(angle) * radius - 38 - Math.random() * 80).toFixed(1) + 'px');
        node.style.animationDelay = (entryIndex * 0.05 + i * 0.012).toFixed(3) + 's';
        document.body.appendChild(node);
        setTimeout(() => node.remove(), 1300);
      }
    });
  }

  function showGainCelebration(reward, total, fromWorldPos) {
    const html = rewardHtml(reward);
    const big = total >= 12;
    const mid = total >= 8 || Object.keys(reward || {}).length >= 2;
    spawnRewardConfetti(reward, fromWorldPos, big ? 1.55 : (mid ? 1.18 : 0.92));
    if (big) {
      screenBurst('GROS BUTIN !', html, 'jackpot', 2100);
      battleNotice('PLUIE DE RESSOURCES', html.replace(/<br>/g, ' · '), 'jackpot', 2800);
    } else if (mid) {
      screenBurst('BELLE RÉCOLTE !', html, 'gain', 1550);
      battleNotice('RÉCOLTE', html.replace(/<br>/g, ' · '), 'gain', 2200);
    } else {
      battleNotice('GAIN RÉCOLTÉ', html.replace(/<br>/g, ' · '), 'gain', 1800);
    }
  }

  function triggerShake(power = 1, duration = 0.18) {
    screenShakePower = Math.max(screenShakePower, power);
    screenShakeTime = Math.max(screenShakeTime, duration);
  }

  function spawnRing(pos, color = 0xffdd66, intensity = 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.035, 8, 46),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y += 0.04;
    ring.userData.life = 1;
    ring.userData.intensity = intensity;
    scene.add(ring);
    fxRings.push(ring);
  }

  function impact(pos, color = 0xffdd66, intensity = 1) {
    playSfx('impact', intensity);
    const count = Math.min(sparks.length, Math.max(10, Math.floor(12 + intensity * 10)));
    sparks.forEach((s, i) => {
      if (i >= count) return;
      s.position.copy(pos);
      s.userData.v.set(
        (Math.random() - .5) * (.28 + intensity * .16),
        Math.random() * (.34 + intensity * .16) + .06,
        (Math.random() - .5) * (.28 + intensity * .16)
      );
      s.userData.life = 1;
      s.material.opacity = 1;
      s.material.color.setHex(color);
    });
    spawnRing(pos, color, intensity);
    triggerShake(0.10 * intensity, Math.min(.55, .12 + intensity * .08));
    UI.flash.classList.add('show');
    clearTimeout(UI.flash._t);
    UI.flash._t = setTimeout(() => UI.flash.classList.remove('show'), Math.min(180, 70 + intensity * 30));
  }

  function showToast(txt, duration = 2400) {
    // Interface épurée : les petits messages latéraux polluaient la vue.
    // Les informations importantes restent affichées via bigMessage, les overlays et les récapitulatifs.
    return;
  }

  function pay(res, cost) {
    for (const k in cost) if ((res[k] || 0) < cost[k]) return false;
    for (const k in cost) res[k] -= cost[k]; return true;
  }

  function rewardLine(rew) {
    return Object.entries(rew || {}).map(([k, v]) => '+' + v + ' ' + RESOURCE_ICONS[k]).join('  ');
  }

  function rewardHtml(rew) {
    return Object.entries(rew || {}).map(([k, v]) => '+' + v + ' ' + RESOURCE_ICONS[k]).join('<br>');
  }

  function rewardTotal(rew) {
    return Object.values(rew || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }

  function statForPlayer(player = active) {
    return matchStats[player - 1];
  }

  function collectRelicFromHole(h) {
    if (!h || h.relicFound) return;

    h.relicFound = true;
    h.relicKnown = true;
    h.trap = false;
    h.reward = null;
    h.kind = 'relique trouvée';

    const res = players[active - 1].res;
    animateResourceReward({ relic: 1 }, ball.position.clone().add(new THREE.Vector3(0, 1.1, 0)));
    res.relic = (res.relic || 0) + 1;
    statForPlayer(active).relicsFound++;

    turnSummary.push('Relique trouvée : +1 🏺');
    impact(ball.position, 0xfff06a, 2.1);
    playRandomSfx('relic', 'jackpot', 1.35);
    floatText('RELIQUE<br>+1 🏺', ball.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 'jackpot');
    bigMessage('RELIQUE TROUVÉE !', '🏺 À vendre au marché contre ' + RELIC_MARKET_GOLD_VALUE + ' or', 'jackpot', 2600);
    setTimeout(updateHUD, 520);
  }

  function drawRandomTurnEvent() {
    if (!turnEventDeck.length) turnEventDeck = shuffle(TURN_EVENTS);
    return turnEventDeck.shift();
  }

  function rollTurnEventForCurrentRound() {
    // Un "tour" = une manche complète : Joueur 1 joue, puis Joueur 2 joue le même numéro de tour.
    // L'événement est donc tiré au début du tour du Joueur 1 et reste actif aussi pour le Joueur 2.
    activeTurnEvent = null;
    clearMudZones();
    if (matchTurns > 0 && matchTurns % TURN_EVENT_INTERVAL === 0) {
      activeTurnEvent = drawRandomTurnEvent();
      if (activeTurnEvent && activeTurnEvent.mud) spawnMudZonesForEvent();
      updateEventBanner(true);
      // L'événement reste visible dans un bandeau compact : pas de gros panneau central qui masque le plateau.
    } else {
      updateEventBanner();
    }
  }

  function updateEventBanner(flash = false) {
    if (!eventBanner) return;
    if (!activeTurnEvent || setupMode || gameOver) {
      eventBanner.className = 'hidden';
      eventBanner.innerHTML = '';
      return;
    }
    eventBanner.className = flash ? 'show flash' : 'show';
    eventBanner.innerHTML = '<b>' + activeTurnEvent.icon + ' ' + activeTurnEvent.title + '</b><span>' + activeTurnEvent.desc + '</span>';
    if (flash) {
      playRandomSfx('event', 'confirm', 1.05);
      showMomentBanner(activeTurnEvent.icon + ' ÉVÉNEMENT !', activeTurnEvent.desc, 'combo', 2400);
      pulseScreen('gold');
      clearTimeout(eventBanner._flashTimer);
      eventBanner._flashTimer = setTimeout(() => {
        if (activeTurnEvent && !setupMode && !gameOver) eventBanner.className = 'show compact';
      }, 3200);
    }
  }

  function applyTurnEventToReward(reward) {
    const out = { ...(reward || {}) };
    if (!activeTurnEvent) return { reward: out, applied: false };

    let applied = false;
    RESOURCE_TYPES.forEach(type => {
      const shouldDouble = activeTurnEvent.allResources || activeTurnEvent.resource === type;
      if (shouldDouble && out[type]) {
        out[type] *= 2;
        applied = true;
      }
    });

    return { reward: out, applied };
  }

  function applyTurnEventToDamage(amount) {
    let out = amount;

    if (activeTurnEvent && activeTurnEvent.damage) {
      if (!currentShot.damageEventUsed) {
        currentShot.damageEventUsed = true;
        turnSummary.push('Événement : dégâts doublés');
        bigMessage('DÉGÂTS DOUBLÉS !', 'Impact x2', 'damage', 1150);
        floatText('DÉGÂTS x2', ball.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'combo');
      }
      out *= 2;
    }

    const pl = players[active - 1];
    if (pl && pl.bonusDoubleDamageThisTurn) {
      if (!currentShot.bonusDamageUsed) {
        currentShot.bonusDamageUsed = true;
        turnSummary.push('Trou bonus : dégâts doublés');
        bigMessage('BONUS DÉGÂTS !', 'Impact x2', 'damage', 1150);
        floatText('BONUS x2', ball.position.clone().add(new THREE.Vector3(0, 2.7, 0)), 'combo');
      }
      out *= 2;
    }

    return out;
  }

  function gain(rew) {
    const eventReward = applyTurnEventToReward(rew);
    rew = eventReward.reward;
    const r = players[active-1].res;
    const gainOrigin = ball.position.clone().add(new THREE.Vector3(0, 1.0, 0));

    // Effet stylé de récolte : explosion au trou + jetons qui volent vers la barre de ressources.
    animateResourceReward(rew, gainOrigin);

    Object.keys(rew || {}).forEach(k => {
      r[k] = (r[k] || 0) + rew[k];
    });

    const txt = rewardLine(rew);
    const total = Object.values(rew || {}).reduce((a, b) => a + b, 0);
    const resourceCount = Object.keys(rew || {}).filter(k => Number(rew[k]) > 0).length;

    statForPlayer().resources += rewardTotal(rew);
    turnSummary.push(txt);
    if (eventReward.applied) turnSummary.push('Événement : ' + activeTurnEvent.short);

    impact(ball.position, resourceCount >= 3 ? 0xfff06a : 0xffdd66, total >= 12 ? 1.9 : 1.25);
    playResourceGainSfx(rew, total);
    floatText(rewardHtml(rew), ball.position.clone().add(new THREE.Vector3(0, 1.2, 0)), total >= 12 ? 'jackpot' : 'gain');
    showGainCelebration(rew, total, gainOrigin);
    celebrateMicroMoment(
      total >= 12 ? 'GROS BUTIN !' : (resourceCount >= 2 || total >= 8 ? 'BELLE RÉCOLTE !' : 'RÉCOLTE !'),
      rewardHtml(rew),
      total >= 12 ? 'jackpot' : 'gain',
      gainOrigin,
      Object.keys(rew || {}).flatMap(k => [resourceIcon(k), resourceIcon(k)]),
      total >= 12 ? 28 : (total >= 8 ? 18 : 10)
    );
    playJuiceChord(total >= 12 ? 'victory' : 'gain', total >= 12 ? 1.45 : 0.85);

    if (typeof showObjectiveProgress === 'function') showObjectiveProgress('resources', active, total >= 12);

    if (eventReward.applied) {
      showShotTitle(activeTurnEvent.icon + ' ' + activeTurnEvent.title, rewardHtml(rew), 'jackpot', ball.position, 1850);
    } else if (total >= 12) {
      showShotTitle('GROS BUTIN !', rewardHtml(rew), 'jackpot', ball.position, 2600);
    } else if (resourceCount >= 2 || total >= 10) {
      showShotTitle('BELLE RÉCOLTE', rewardHtml(rew), 'gain', ball.position, 2100);
    }

    setTimeout(updateHUD, 520);
  }

  function loseRandomResources(hole = null) {
    const newlyRevealed = !!(hole && hole.baseTrap && !hole.trapKnown);
    if (hole && hole.baseTrap) {
      hole.trapKnown = true;
      hole.kind = 'piège révélé';
      updateHoleTrapVisual(hole);
    }

    const r = players[active-1].res;
    const available = RESOURCE_TYPES.filter(k => (r[k] || 0) > 0);
    impact(ball.position, 0xff3333, 1.45);
    playSfx('trap', 1.2);
    if (newlyRevealed) {
      turnSummary.push('Piège révélé');
      bigMessage('PIÈGE RÉVÉLÉ !', 'Ce trou restera marqué en rouge jusqu’à la fin de la partie', 'damage', 1800);
    }
    if (!available.length) {
      turnSummary.push('Piège sans effet');
      floatText('PIÈGE<br>0', ball.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 'trap');
      showToast('PIÈGE<br>Aucune ressource à perdre');
      return;
    }
    const type = available[randInt(0, available.length - 1)];
    const amount = Math.min(randInt(1, 4), r[type] || 0);
    r[type] -= amount;
    pulseResource(type);
    const txt = '-' + amount + ' ' + RESOURCE_ICONS[type];
    turnSummary.push('Piège ' + txt);
    floatText(txt, ball.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 'trap');
    showToast('PIÈGE<br>' + txt);
    updateHUD();
  }

  function loseRandomResourcesFromPlayer(player, min = 1, max = 3, label = 'Rebord adverse') {
    const r = players[player - 1].res;
    const available = RESOURCE_TYPES.filter(k => (r[k] || 0) > 0);
    if (!available.length) {
      turnSummary.push(label + ' : J' + player + ' sans ressource');
      floatText('PILLAGE<br>0', ball.position.clone().add(new THREE.Vector3(0, 1.6, 0)), 'trap');
      showToast(label + '<br>J' + player + ' n’a rien à perdre');
      return 0;
    }

    const type = available[randInt(0, available.length - 1)];
    const amount = Math.min(randInt(min, max), r[type] || 0);
    r[type] -= amount;

    const txt = 'J' + player + ' -' + amount + ' ' + RESOURCE_ICONS[type];
    turnSummary.push(label + ' : ' + txt);
    statForPlayer(active).edgeSteals++;
    impact(ball.position, 0xffc24b, 1.6);
    floatText('PILLAGE<br>' + txt, ball.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 'combo');
    showToast(label + '<br>' + txt);
    updateHUD();
    return amount;
  }

  function handleBackEdgePenalty() {
    if (currentShot.backEdgePenalty || gameOver) return;
    currentShot.backEdgePenalty = true;
    loseRandomResourcesFromPlayer(enemy(active), 1, 3, 'Rebord adverse');
  }



  function stealRandomResourcesFromPlayer(victim, min = 3, max = 8, label = 'Vol de ressources') {
    const thief = active;
    const victimRes = players[victim - 1].res;
    const thiefRes = players[thief - 1].res;
    const availableTotal = RESOURCE_TYPES.reduce((sum, type) => sum + (victimRes[type] || 0), 0);

    if (!availableTotal) {
      turnSummary.push(label + ' : adversaire sans ressource');
      impact(ball.position, 0xffc24b, 1.35);
      floatText('VOL<br>0', ball.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 'trap');
      showToast(label + '<br>L’adversaire n’a rien à voler');
      return 0;
    }

    const amountToSteal = Math.min(randInt(min, max), availableTotal);
    const stolen = {};
    let remaining = amountToSteal;

    while (remaining > 0) {
      const available = RESOURCE_TYPES.filter(type => (victimRes[type] || 0) > 0);
      if (!available.length) break;
      const type = available[randInt(0, available.length - 1)];
      victimRes[type] -= 1;
      thiefRes[type] = (thiefRes[type] || 0) + 1;
      stolen[type] = (stolen[type] || 0) + 1;
      remaining--;
    }

    const stolenTotal = rewardTotal(stolen);
    Object.keys(stolen).forEach(type => pulseResource(type));
    statForPlayer(thief).resources += stolenTotal;
    statForPlayer(thief).edgeSteals++;

    const line = rewardLine(stolen);
    turnSummary.push(label + ' : +' + line + ' volé à J' + victim);
    impact(ball.position, 0xffc24b, 2.0);
    floatText('VOL<br>' + rewardHtml(stolen), ball.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 'combo');
    bigMessage('VOL DE RESSOURCES', '+' + stolenTotal + ' ressource' + (stolenTotal > 1 ? 's' : '') + '<br>' + rewardHtml(stolen), 'jackpot', 2600);
    showToast(label + '<br>' + line);
    updateHUD();
    return stolenTotal;
  }

  function randomRepairCandidates(player) {
    const pl = players[player - 1];
    const list = [];

    pl.castle.forEach((part, idx) => {
      if (part.hp > 0 && part.hp < part.max) {
        list.push({ kind: 'castle', idx, name: part.name, current: part.hp, max: part.max });
      }
    });

    pl.towers.forEach((tower, idx) => {
      if (tower.placed && tower.hp > 0 && tower.hp < tower.max) {
        list.push({ kind: 'tower', idx, name: 'Tour ' + (idx + 1), current: tower.hp, max: tower.max });
      }
    });

    return list;
  }

  function affordableRepairCosts(player = active) {
    const res = players[player - 1].res;
    return REPAIR_COST_OPTIONS.filter(option => canPay(res, option.cost));
  }

  function canOpenRepairChoice() {
    return gameStarted && !gamePaused && !isAITurn() && !gameOver && !turnLocked && !setupMode && phase === 'defense' && !randomRepairUsedThisTurn;
  }

  function refreshRepairChoice() {
    const res = players[active - 1].res;
    const candidates = randomRepairCandidates(active);
    repairStock.innerHTML = `Joueur ${active} — ${res.stone} 🪨 pierre(s) · ${res.wood} 🪵 bois · ${res.gold || 0} 🪙 or · ${res.relic || 0} 🏺 relique(s)<br>${candidates.length} structure(s) réparable(s)`;
    repairActions.innerHTML = '';

    REPAIR_COST_OPTIONS.forEach(option => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'market-trade repair-trade';
      const canRepair = canOpenRepairChoice() && candidates.length > 0 && canPay(res, option.cost);
      btn.disabled = !canRepair;
      btn.innerHTML = `<strong>${option.icon}</strong><span>→</span><strong>+${REGULAR_REPAIR_AMOUNT} PV</strong><small>Payer ${option.label} pour réparer une structure au hasard</small>`;
      btn.onclick = () => {
        closeRepairChoice();
        repairRandomStructureForActive(option);
      };
      repairActions.appendChild(btn);
    });
  }

  function openRepairChoice() {
    if (!canOpenRepairChoice()) {
      showToast(setupMode ? 'Réparation indisponible<br>Termine d’abord la préparation' : 'Réparation indisponible<br>Disponible en défense uniquement');
      return;
    }
    if (!randomRepairCandidates(active).length) {
      showToast('Aucune structure abîmée<br>Réparation inutile');
      return;
    }
    if (!affordableRepairCosts(active).length) {
      showToast('Réparation impossible<br>Il faut 2 🪨 ou 2 🪵 ou 1 🪨 + 1 🪵');
      return;
    }
    refreshRepairChoice();
    repairOverlay.classList.add('open');
  }

  function closeRepairChoice() {
    repairOverlay.classList.remove('open');
  }

  function repairRandomStructureForActive(costOption = null, forcedChoice = null) {
    if (turnLocked || setupMode || phase !== 'defense' || gameOver) return;
    if (randomRepairUsedThisTurn) {
      showToast('Réparation déjà utilisée<br>Une fois par tour');
      return;
    }

    const options = randomRepairCandidates(active);
    if (!options.length) {
      showToast('Aucune structure abîmée<br>Réparation inutile');
      return;
    }

    const pl = players[active - 1];
    const selectedCost = costOption || affordableRepairCosts(active)[0];
    if (!selectedCost) {
      showToast('Réparation impossible<br>Il faut 2 🪨 ou 2 🪵 ou 1 🪨 + 1 🪵');
      return;
    }
    if (!pay(pl.res, selectedCost.cost)) {
      showToast('Réparation impossible<br>Ressources insuffisantes');
      return;
    }

    const choice = forcedChoice || options[randInt(0, options.length - 1)];
    let repaired = 0;
    let fxPos = new THREE.Vector3(castleX(active), 4.2, castleZ(active));

    if (choice.kind === 'castle') {
      const part = pl.castle[choice.idx];
      const before = part.hp;
      part.hp = Math.min(part.max, part.hp + REGULAR_REPAIR_AMOUNT);
      repaired = part.hp - before;
      updateCastlePartVisual(active, choice.idx);
      if (part.hit) {
        fxPos = new THREE.Vector3(castleX(active) + part.hit.x, 4.4, castleZ(active) + part.hit.z);
      }
    } else {
      const tower = pl.towers[choice.idx];
      const before = tower.hp;
      tower.hp = Math.min(tower.max, tower.hp + REGULAR_REPAIR_AMOUNT);
      repaired = tower.hp - before;
      towerMesh(active, tower);
      if (tower.pos) fxPos = tower.pos.clone().add(new THREE.Vector3(0, 4, 0));
    }

    randomRepairUsedThisTurn = true;
    turnSummary.push('Réparation : -' + selectedCost.label + ' / +' + repaired + ' PV sur ' + choice.name);
    impact(fxPos, 0x74ff9b, 1.5);
    playSfx('repair', 1.2);
    floatText('+' + repaired + ' PV', fxPos, 'gain');
    bigMessage('RÉPARATION', choice.name + '<br>+' + repaired + ' PV<br><small>Coût : ' + selectedCost.label + '</small>', 'gain', 3000);
    showToast('Réparation effectuée<br>' + choice.name + ' +' + repaired + ' PV<br>Coût : ' + selectedCost.label);
    updateHUD();
    if (UI.modal.classList.contains('open')) openCastle(active);
  }

  function isAITurn() {
    return gameStarted && gameMode === 'solo' && active === 2 && !gameOver;
  }

  function canPay(res, cost) {
    return Object.entries(cost || {}).every(([k, v]) => (res[k] || 0) >= v);
  }

  function clearAIActionTimers() {
    aiActionTimers.forEach(id => clearTimeout(id));
    aiActionTimers = [];
  }

  function scheduleAIAction(fn, delay = 500) {
    const id = setTimeout(() => {
      aiActionTimers = aiActionTimers.filter(x => x !== id);
      if (!isAITurn() || gameOver) return;
      if (gamePaused || turnLocked) {
        scheduleAIAction(fn, 450);
        return;
      }
      fn();
    }, delay);
    aiActionTimers.push(id);
    return id;
  }

  function launchNewMode(mode, event = null) {
    showDifficultyChoice(mode);
  }

  function launchModeWithDifficulty(mode, difficultyId, event = null) {
    if (!DIFFICULTIES[difficultyId]) return;
    closeCustomization();
    closeProgression();
    closeProfiles();

    const normalizedMode = mode === 'solo' ? 'solo' : 'duo';
    const difficultyChanged = difficultyId !== currentDifficultyId;
    if (difficultyChanged) setDifficultyId(difficultyId);

    // Si la difficulté change, on recharge pour reconstruire proprement les trous et la taille physique de la bille.
    // Si une partie a déjà commencé, on recharge aussi pour repartir sans états fantômes.
    if (difficultyChanged || gameStarted) {
      sessionStorage.setItem('BDS_START_MODE', normalizedMode);
      location.reload();
      return;
    }

    // Premier lancement avec la difficulté déjà chargée : pas de rechargement, sinon Android coupe l'audio autorisé par le clic.
    beginGame(normalizedMode, event);
  }

  function openMainMenu(paused = false, event = null) {
    clearPendingTowerPlacement();
    if (!mainMenuOverlay) return;
    if (gameStarted && paused && !gameOver) {
      gamePaused = true;
      pauseTurnTimer();
      closeMarket();
      closeCustomization();
      closeProgression();
      closeProfiles();
      if (UI.modal) UI.modal.classList.remove('open');
      dragging = false;
      setAimVisualsVisible(false);
      resetPowerGauge();
      mainResume.style.display = '';
    } else {
      mainResume.style.display = gameStarted && !gameOver ? '' : 'none';
    }
    updateMainMenuProgress();
    showMainMenuHome();
    mainMenuOverlay.classList.add('show');
    syncMusicForScreen(event, 'menu');
    if (UI.btnPause) UI.btnPause.classList.add('hidden');
  }

  function closeMainMenuAndResume(event = null) {
    if (!gameStarted || gameOver) return;
    mainMenuOverlay.classList.remove('show');
    syncMusicForScreen(event, 'game');
    closeCustomization();
    closeProgression();
    closeProfiles();
    gamePaused = false;
    if (UI.btnPause) UI.btnPause.classList.remove('hidden');
    if (!setupMode && !turnLocked && !shotStarted) resumeTurnTimer();
    syncMusicForScreen(event, 'game');
    if (isAITurn()) resumeAIActionAfterPause();
    updateHUD();
  }

  function beginGame(mode = 'duo', event = null) {
    gameMode = mode === 'solo' ? 'solo' : 'duo';
    gameStarted = true;
    gamePaused = false;
    clearAIActionTimers();
    mainMenuOverlay.classList.remove('show');
    syncMusicForScreen(event, 'game');
    closeCustomization();
    if (UI.btnPause) UI.btnPause.classList.remove('hidden');
    startInitialSetup();
    updateTowerGhosts();
    showToast((gameMode === 'solo' ? 'Mode 1 joueur<br>Joueur 2 contrôlé par l’IA' : 'Mode 2 joueurs<br>Duel local') + '<br>Difficulté : ' + currentDifficulty.label + (gameMode === 'solo' ? '<br>IA : ' + aiProfile().label : ''));
  }

  function aiFindSetupTowerPosition(player) {
    const pl = players[player - 1];
    const placed = pl.towers.filter(t => t.placed).length;
    const profile = aiProfile ? aiProfile() : { aimNoise: 1 };
    const fineZones = defenseTowerFineBuildZones(player);
    const mainZone = defenseTowerMainBuildZone(player);
    const zonePool = fineZones.length ? fineZones : [mainZone];

    // L'IA répartit maintenant ses tours par bandes de profondeur avec un hasard contrôlé.
    // Elle ajoute aussi de vrais candidats dans la grande zone du fond, pas seulement dans les petites bandes.
    const spacingTargets = zonePool.length >= 4
      ? [0, Math.floor((zonePool.length - 1) * 0.34), Math.floor((zonePool.length - 1) * 0.68), zonePool.length - 1]
      : zonePool.map((_, i) => i);
    const desiredZoneIndex = spacingTargets[Math.min(placed, spacingTargets.length - 1)] ?? (placed % zonePool.length);
    const existing = pl.towers.filter(t => t.placed && t.pos).map(t => t.pos);
    const jitter = currentDifficulty.id === 'easy' ? 2.2 : (currentDifficulty.id === 'medium' ? 1.35 : 0.9);
    const sidePreference = (Math.random() < 0.5 ? -1 : 1) * (0.30 + Math.random() * 0.45);
    const candidates = [];

    zonePool.forEach((zone, zi) => {
      const zoneCenterX = (zone.xMin + zone.xMax) / 2;
      const maxSide = Math.max(1.8, (zone.xMax - zone.xMin) * 0.42);
      const preferredXs = shuffle([
        zoneCenterX + sidePreference * maxSide,
        zoneCenterX - sidePreference * maxSide,
        zoneCenterX,
        zoneCenterX - maxSide * 0.72,
        zoneCenterX + maxSide * 0.72
      ]);
      const preferredZs = shuffle([
        zone.z,
        zone.zMin + (zone.zMax - zone.zMin) * 0.28,
        zone.zMax - (zone.zMax - zone.zMin) * 0.28
      ]);

      preferredZs.forEach((z, zRank) => {
        preferredXs.forEach((x, xRank) => {
          const px = THREE.MathUtils.clamp(x + (Math.random() - 0.5) * jitter, zone.xMin + 1.5, zone.xMax - 1.5);
          const pz = THREE.MathUtils.clamp(z + (Math.random() - 0.5) * jitter, zone.zMin + 1.4, zone.zMax - 1.4);
          const spreadPenalty = existing.reduce((sum, pos) => {
            const d = Math.hypot(pos.x - px, pos.z - pz);
            return sum + Math.max(0, 9.5 - d) * 1.8;
          }, 0);
          candidates.push({
            x: px,
            z: pz,
            score:
              Math.abs(zi - desiredZoneIndex) * (currentDifficulty.id === 'hard' ? 1.15 : 0.78) +
              xRank * 0.10 +
              zRank * 0.06 +
              spreadPenalty +
              Math.random() * (profile.aimNoise || 1) * (currentDifficulty.id === 'hard' ? 0.22 : 0.75)
          });
        });
      });
    });

    // Candidats dans la grande zone principale, notamment au fond côté château.
    // Ça évite que l'IA place toujours ses tours uniquement sur les petites zones intermédiaires.
    const fondZ = player === 1 ? mainZone.zMax - 1.8 : mainZone.zMin + 1.8;
    const midZ = (mainZone.zMin + mainZone.zMax) / 2;
    const wantsFond = placed === 0 || placed === 2 || currentDifficulty.id === 'hard';
    for (let i = 0; i < 34; i++) {
      const px = THREE.MathUtils.lerp(mainZone.xMin + 2, mainZone.xMax - 2, Math.random());
      const pzBase = i < 18 ? fondZ : midZ;
      const pz = THREE.MathUtils.clamp(pzBase + (Math.random() - 0.5) * (i < 18 ? 14 : 28), mainZone.zMin + 1.7, mainZone.zMax - 1.7);
      const nearestExisting = existing.reduce((min, pos) => Math.min(min, Math.hypot(pos.x - px, pos.z - pz)), 999);
      const fondBonus = (i < 18 && wantsFond) ? -3.6 : 0.4;
      candidates.push({
        x: px,
        z: pz,
        score: fondBonus + 2.5 - Math.min(2.4, nearestExisting * 0.20) + Math.random() * (currentDifficulty.id === 'hard' ? 0.45 : 1.05)
      });
    }

    candidates.sort((a, b) => a.score - b.score);
    for (const pos of candidates) {
      const c = towerCandidate(player, pos.x, pos.z);
      if (c.ok) return { x: c.x, z: c.z };
    }
    return null;
  }

  function aiPlaceSetupTowerOnce() {
    if (!isAITurn() || !setupMode) return;
    const pl = players[1];
    if (pl.towers.every(t => t.placed)) return;

    const pos = aiFindSetupTowerPosition(2);
    if (pos) placeTowerAt(pos.x, pos.z);

    // Sécurité anti-blocage : si une position est refusée, l'IA réessaie avec une autre.
    if (!pl.towers.every(t => t.placed)) {
      scheduleAIAction(aiPlaceSetupTowerOnce, 560);
    }
  }

  function maybeStartAISetup() {
    if (!isAITurn() || !setupMode) return;
    showToast('IA<br>Placement automatique des 4 tours');
    [0, 1, 2, 3].forEach(i => {
      scheduleAIAction(aiPlaceSetupTowerOnce, 650 + i * 520);
    });
  }


  const AI_PROFILES = {
    easy: {
      label: 'facile',
      aimNoise: 1.18,
      powerNoise: 1.02,
      attackBias: 0.92,
      resourceBias: 1.25,
      kitBias: 0.72,
      clearDebrisChance: 0.48,
      clearDebrisSeverityBoost: 0.070,
      marketAttackChance: 0.46,
      marketDefenseChance: 0.12,
      buildClassicRampChance: 0.52,
      buildSideRampChance: 0.30,
      secondBallChance: 0.18,
      secondBallRampBonus: 0.16,
      rebuildCastleChance: 0.36,
      rebuildTowerRelockChance: 0.45,
      rebuildTowerLooseChance: 0.10,
      repairRatio: 0.34,
      emergencyRepairRatio: 0.22,
      repairChance: 0.38,
      useRepairKitChance: 0.52,
      useBuildKitChance: 0.52,
      reserve: { stone: 0, wood: 0, gold: 0 }
    },
    medium: {
      label: 'moyenne',
      aimNoise: 0.70,
      powerNoise: 0.66,
      attackBias: 1.12,
      resourceBias: 1.00,
      kitBias: 1.00,
      clearDebrisChance: 0.82,
      clearDebrisSeverityBoost: 0.105,
      marketAttackChance: 0.72,
      marketDefenseChance: 0.25,
      buildClassicRampChance: 0.76,
      buildSideRampChance: 0.46,
      secondBallChance: 0.30,
      secondBallRampBonus: 0.22,
      rebuildCastleChance: 0.52,
      rebuildTowerRelockChance: 0.68,
      rebuildTowerLooseChance: 0.18,
      repairRatio: 0.28,
      emergencyRepairRatio: 0.18,
      repairChance: 0.56,
      useRepairKitChance: 0.74,
      useBuildKitChance: 0.76,
      reserve: { stone: 1, wood: 1, gold: 0 }
    },
    hard: {
      label: 'difficile',
      aimNoise: 0.36,
      powerNoise: 0.42,
      attackBias: 1.42,
      resourceBias: 0.78,
      kitBias: 1.18,
      clearDebrisChance: 0.96,
      clearDebrisSeverityBoost: 0.145,
      marketAttackChance: 0.88,
      marketDefenseChance: 0.38,
      buildClassicRampChance: 0.92,
      buildSideRampChance: 0.58,
      secondBallChance: 0.42,
      secondBallRampBonus: 0.30,
      rebuildCastleChance: 0.58,
      rebuildTowerRelockChance: 0.82,
      rebuildTowerLooseChance: 0.24,
      repairRatio: 0.24,
      emergencyRepairRatio: 0.15,
      repairChance: 0.68,
      useRepairKitChance: 0.88,
      useBuildKitChance: 0.90,
      reserve: { stone: 2, wood: 2, gold: 1 }
    }
  };

  function aiProfile() {
    return AI_PROFILES[currentDifficulty.id] || AI_PROFILES.medium;
  }

  function aiCostValue(cost = {}) {
    return (cost.stone || 0) + (cost.wood || 0) + (cost.gold || 0) * 2.6 + (cost.relic || 0) * 4.2;
  }

  function aiResourceTotal(player = active) {
    const r = players[player - 1].res;
    return (r.stone || 0) + (r.wood || 0) + (r.gold || 0) * 2.2 + (r.relic || 0) * 4.0;
  }

  function aiCanSpendForDefense(cost = {}, urgency = 0) {
    const profile = aiProfile();
    const res = players[active - 1].res;
    if (!canPay(res, cost)) return false;
    if (urgency >= 90) return true;
    const reserve = profile.reserve || {};
    const stoneAfter = (res.stone || 0) - (cost.stone || 0);
    const woodAfter = (res.wood || 0) - (cost.wood || 0);
    const goldAfter = (res.gold || 0) - (cost.gold || 0);
    if (stoneAfter < (reserve.stone || 0)) return false;
    if (woodAfter < (reserve.wood || 0)) return false;
    if (goldAfter < (reserve.gold || 0)) return false;
    return true;
  }

  function aiDebrisSeverity(player = active) {
    const laneX = attackX(player);
    return laneDebris(player).reduce((sum, debris) => {
      const stage = Math.max(1, Math.min(3, debris.stage || 1));
      const centerPenalty = Math.max(0, 1 - Math.abs((debris.x || laneX) - laneX) / (CFG.laneW / 2));
      return sum + stage * (1 + centerPenalty * 0.65);
    }, 0);
  }

  function aiChooseRepairCostOption(urgent = false) {
    const profile = aiProfile();
    const options = affordableRepairCosts(active);
    if (!options.length) return null;
    return options
      .map(option => {
        const isGold = !!option.cost.gold;
        const keepReserve = aiCanSpendForDefense(option.cost, urgent ? 95 : 55);
        const goldPenalty = isGold && !urgent ? 3.4 : 0;
        const reservePenalty = keepReserve ? 0 : 7.5;
        const preference = option.id === 'mix' ? -0.35 : option.id === 'wood2' ? 0.15 : option.id === 'stone2' ? 0.20 : 0.75;
        return { option, score: aiCostValue(option.cost) + goldPenalty + reservePenalty + preference + Math.random() * (profile.aimNoise || 1) };
      })
      .filter(o => urgent || aiCanSpendForDefense(o.option.cost, 55))
      .sort((a, b) => a.score - b.score)[0]?.option || null;
  }

  function aiEnemyAssaultThreat() {
    const opponent = enemy(active);
    const enemyRamps = players[opponent - 1].ramps || [];
    const builtClassic = enemyRamps.filter(r => r.built).length;
    const unlockedClassic = enemyRamps.filter(r => r.unlocked && !r.built).length;
    const sideBuilt = (players[opponent - 1].sideRamps || []).filter(r => r.built).length;
    return builtClassic * 2.2 + unlockedClassic * 1.15 + sideBuilt * 0.55;
  }

  function aiBestSideRampSlot(pl = players[active - 1]) {
    const list = (pl.sideRamps || [])
      .map((r, sideSlot) => ({ r, sideSlot, score: Math.random() * 10 - (aiShotMemory.lastSideIndex === r.sideIndex ? 16 : 0) }))
      .filter(o => !o.r.built)
      .sort((a, b) => b.score - a.score);
    return list.length ? list[0].sideSlot : -1;
  }

  function aiChooseKitTarget() {
    if (!Array.isArray(activeKits) || !activeKits.length) return null;
    const pl = players[active - 1];
    const destroyedCastle = pl.castle.some(c => c.hp <= 0);
    const damaged = randomRepairCandidates(active).length > 0;
    const candidates = activeKits
      .filter(k => k.player === active)
      .map(k => {
        const dz = Math.abs(k.z - startZ(active));
        const typeBonus = k.type === 'build'
          ? (destroyedCastle ? 28 : 7)
          : (damaged ? 18 : 5);
        const repeatPenalty = aiRepeatPenalty('kit', k.x, k.z);
        return { k, score: typeBonus + Math.random() * 12 - dz * 0.012 - repeatPenalty };
      })
      .sort((a, b) => b.score - a.score);
    return candidates.length ? candidates[0].k : null;
  }

  function runAITurn() {
    if (!isAITurn() || setupMode || gameOver) return;
    if (phase !== 'choice') return;
    showToast('IA<br>Analyse stratégique...');

    scheduleAIAction(() => {
      if (!isAITurn() || phase !== 'choice') return;
      enterDefense();
    }, 650);

    scheduleAIAction(() => {
      if (!isAITurn() || phase !== 'defense') return;
      aiDefenseStep();
    }, 1300);

    scheduleAIAction(() => {
      if (!isAITurn()) return;
      enterAttack();
    }, 2100);

    scheduleAIAction(() => {
      if (!isAITurn() || phase !== 'attack') return;
      prepareAIAttack();
    }, 3000);
  }

  function resumeAIActionAfterPause() {
    if (!isAITurn() || gameOver) return;
    clearAIActionTimers();
    if (setupMode) {
      scheduleAIAction(aiPlaceSetupTowerOnce, 450);
      return;
    }
    if (phase === 'choice') {
      scheduleAIAction(runAITurn, 420);
      return;
    }
    if (phase === 'defense') {
      scheduleAIAction(() => {
        if (!isAITurn() || phase !== 'defense') return;
        aiDefenseStep();
      }, 420);
      scheduleAIAction(() => {
        if (!isAITurn() || phase !== 'defense') return;
        enterAttack();
      }, 1150);
      scheduleAIAction(() => {
        if (!isAITurn() || phase !== 'attack') return;
        prepareAIAttack();
      }, 1850);
      return;
    }
    if (phase === 'attack' && !shotStarted && !turnLocked) {
      scheduleAIAction(prepareAIAttack, 520);
    }
  }

  function aiCanPayAfterMarket(cost, purpose = 'attack', urgent = false) {
    const res = players[active - 1].res;
    if (canPay(res, cost)) return true;
    if (marketTradeUsedThisTurn) return false;
    const profile = aiProfile();
    const chance = purpose === 'defense'
      ? (urgent ? Math.max(0.78, profile.marketDefenseChance) : profile.marketDefenseChance)
      : profile.marketAttackChance;
    if (!urgent && Math.random() > chance) return false;
    aiTryMarketForCost(cost);
    return canPay(res, cost);
  }

  function aiRebuildCastlePartIfPossible(urgent = false) {
    const pl = players[active - 1];
    const destroyed = pl.castle
      .map((part, idx) => ({ part, idx }))
      .filter(o => o.part.hp <= 0)
      .sort((a, b) => {
        const priorityA = a.idx === 8 ? 120 : (a.idx >= 4 ? 62 : 42);
        const priorityB = b.idx === 8 ? 120 : (b.idx >= 4 ? 62 : 42);
        return priorityB - priorityA + (Math.random() - 0.5) * 8;
      });

    for (const item of destroyed) {
      const cost = item.part.rebuildCost;
      const priority = urgent || item.idx === 8 ? 95 : (item.idx >= 4 ? 78 : 64);
      if (!aiCanPayAfterMarket(cost, 'defense', urgent || item.idx === 8)) continue;
      if (!aiCanSpendForDefense(cost, priority)) continue;
      if (!pay(pl.res, cost)) continue;
      item.part.hp = item.part.max;
      item.part.built = true;
      createCastlePartMesh(active, item.idx);
      turnSummary.push('IA : reconstruction ' + item.part.name);
      impact(new THREE.Vector3(castleX(active), 4.2, castleZ(active)), 0x74ff9b, 1.35);
      updateHUD();
      return true;
    }
    return false;
  }

  function aiRebuildTowerIfPossible(urgent = false) {
    const profile = aiProfile();
    const opponent = enemy(active);
    const pl = players[active - 1];
    const missing = pl.towers
      .map((tower, idx) => ({ tower, idx }))
      .filter(o => !o.tower.placed && o.tower.pos)
      .sort((a, b) => {
        const rampA = players[opponent - 1].ramps[a.idx];
        const rampB = players[opponent - 1].ramps[b.idx];
        const relockA = rampA && rampA.unlocked && !rampA.built ? 85 : 0;
        const relockB = rampB && rampB.unlocked && !rampB.built ? 85 : 0;
        const builtThreatA = rampA && rampA.built ? 25 : 0;
        const builtThreatB = rampB && rampB.built ? 25 : 0;
        return (relockB + builtThreatB + b.tower.max) - (relockA + builtThreatA + a.tower.max) + (Math.random() - 0.5) * 10;
      });

    for (const item of missing) {
      const enemyRamp = players[opponent - 1].ramps[item.idx];
      const canRelock = !!(enemyRamp && enemyRamp.unlocked && !enemyRamp.built);
      const looseChance = canRelock ? profile.rebuildTowerRelockChance : profile.rebuildTowerLooseChance;
      if (!urgent && Math.random() > looseChance) continue;
      const blockingDebris = item.tower.pos ? findDefenseDebrisAt(active, item.tower.pos, 1.7) : null;
      if (blockingDebris) continue;
      const cost = towerRebuildCost[item.idx];
      const priority = urgent || canRelock ? 92 : 52;
      if (!aiCanPayAfterMarket(cost, 'defense', urgent || canRelock)) continue;
      if (!aiCanSpendForDefense(cost, priority)) continue;
      if (!pay(pl.res, cost)) continue;

      item.tower.placed = true;
      item.tower.hp = item.tower.max;
      towerMesh(active, item.tower);

      if (enemyRamp && !enemyRamp.built) {
        enemyRamp.unlocked = false;
        updateTowerGhosts();
      }

      turnSummary.push('IA : tour ' + (item.idx + 1) + ' reconstruite');
      impact(item.tower.pos.clone().add(new THREE.Vector3(0, 4, 0)), 0x74ff9b, 1.25);
      updateHUD();
      return true;
    }
    return false;
  }

  function aiDefenseStep() {
    const profile = aiProfile();
    const pl = players[active - 1];
    const destroyedCastleCount = pl.castle.filter(c => c.hp <= 0).length;
    const hasDestroyedCastle = destroyedCastleCount > 0;
    const hasDestroyedTower = pl.towers.some(t => !t.placed && t.pos);
    const candidates = repairKitCandidates(active);
    const worst = candidates[0] || null;
    const worstRatio = worst ? worst.current / worst.max : 1;
    const destroyedDonjon = pl.castle[8] && pl.castle[8].hp <= 0;
    const assaultThreat = aiEnemyAssaultThreat();
    const emergency = destroyedDonjon || destroyedCastleCount >= 2 || worstRatio <= profile.emergencyRepairRatio || assaultThreat >= 3.2;

    // Les kits sont gratuits : l'IA les utilise intelligemment avant de dépenser ses ressources.
    if (!kitUsedThisTurn && hasDestroyedCastle && playerKits(active).build > 0 && constructionKitCandidates(active).length && hasBuildKitDebrisForPlayer(active)) {
      if (emergency || Math.random() < profile.useBuildKitChance) {
        if (useBuildKitForActive()) return;
      }
    }
    if (!kitUsedThisTurn && worst && playerKits(active).repair > 0) {
      if (worstRatio <= profile.repairRatio || Math.random() < profile.useRepairKitChance * 0.35) {
        if (useRepairKitForActive()) return;
      }
    }

    // Reconstruction : utile, mais l'IA évite maintenant de vider toutes ses ressources défensivement.
    if (hasDestroyedCastle && (emergency || Math.random() < profile.rebuildCastleChance)) {
      if (aiRebuildCastlePartIfPossible(emergency)) return;
    }

    if (hasDestroyedTower) {
      const opponent = enemy(active);
      const canRelock = pl.towers.some((t, idx) => !t.placed && t.pos && players[opponent - 1].ramps[idx] && players[opponent - 1].ramps[idx].unlocked && !players[opponent - 1].ramps[idx].built);
      if (canRelock || emergency || Math.random() < profile.rebuildTowerLooseChance) {
        if (aiRebuildTowerIfPossible(emergency || canRelock)) return;
      }
    }

    // Réparation payante : seulement sur vraie faiblesse, pas à chaque petite égratignure.
    if (worst && worstRatio <= profile.repairRatio && Math.random() < profile.repairChance) {
      const selectedCost = aiChooseRepairCostOption(emergency);
      if (selectedCost) {
        repairRandomStructureForActive(selectedCost, worst);
        return;
      }
    }
  }

  function aiTrade(trade) {
    const res = players[active - 1].res;
    if (!trade || (res[trade.from] || 0) < trade.cost) return false;
    if (marketTradeUsedThisTurn) return false;
    res[trade.from] -= trade.cost;
    res[trade.to] = (res[trade.to] || 0) + trade.gain;
    marketTradeUsedThisTurn = true;
    playSfx('marketExchange', 0.9);
    turnSummary.push('IA marché' + (isMarketSaleActive() ? ' soldé' : '') + ' : -' + trade.cost + ' ' + trade.fromLabel + ' / +' + trade.gain + ' ' + trade.toLabel);
    showToast('IA Marché<br>' + trade.cost + ' ' + trade.fromIcon + ' → ' + trade.gain + ' ' + trade.toIcon);
    updateHUD();
    return true;
  }

  function findMarketTrade(from, to) {
    return getCurrentMarketTrades().find(trade => trade.from === from && trade.to === to) || null;
  }

  function aiTryTrade(from, to) {
    return aiTrade(findMarketTrade(from, to));
  }

  function aiTryMarketForCost(cost) {
    const res = players[active - 1].res;
    let changed = false;

    for (let guard = 0; guard < 5 && !canPay(res, cost); guard++) {
      if (marketTradeUsedThisTurn) break;

      const needStone = Math.max(0, (cost.stone || 0) - (res.stone || 0));
      const needWood  = Math.max(0, (cost.wood  || 0) - (res.wood  || 0));
      const needGold  = Math.max(0, (cost.gold  || 0) - (res.gold  || 0));

      if (needStone > 0 && (res.gold || 0) >= 1) { changed = aiTryTrade('gold', 'stone') || changed; continue; }
      if (needWood  > 0 && (res.gold || 0) >= 1) { changed = aiTryTrade('gold', 'wood')  || changed; continue; }
      if (needGold  > 0 && (res.relic || 0) >= 1) { changed = aiTryTrade('relic', 'gold') || changed; continue; }
      if (needGold  > 0 && (res.stone || 0) >= (isMarketSaleActive() ? 2 : 3)) { changed = aiTryTrade('stone', 'gold') || changed; continue; }
      if (needGold  > 0 && (res.wood  || 0) >= (isMarketSaleActive() ? 2 : 3)) { changed = aiTryTrade('wood', 'gold')  || changed; continue; }

      // En marché normal uniquement, l'IA peut convertir indirectement bois ↔ pierre via l'or, au prix d'une perte.
      if (!isMarketSaleActive() && needStone > 0 && (res.wood || 0) >= 3) { changed = aiTryTrade('wood', 'gold') || changed; continue; }
      if (!isMarketSaleActive() && needWood  > 0 && (res.stone || 0) >= 3) { changed = aiTryTrade('stone', 'gold') || changed; continue; }
      break;
    }

    return changed;
  }

  function aiBestUnlockedRampSlot(pl) {
    let best = -1;
    let bestScore = -Infinity;
    pl.ramps.forEach((r, i) => {
      if (!r.unlocked || r.built) return;
      const cost = rampCost[i];
      const affordableBonus = canPay(pl.res, cost) ? 22 : 0;
      const totalCost = aiCostValue(cost);
      const repeatPenalty = aiShotMemory.lastClassicSlot === i ? 18 : 0;
      const score = 80 + affordableBonus - totalCost * 5 - repeatPenalty + Math.random() * 14;
      if (score > bestScore) { best = i; bestScore = score; }
    });
    return best;
  }

  function prepareAIAttack() {
    const profile = aiProfile();
    const pl = players[active - 1];

    // Déblayage : l'IA nettoie réellement quand le couloir devient gênant.
    // En difficile elle peut retirer deux tas avant de tirer si elle a l'or nécessaire.
    let debrisSeverity = aiDebrisSeverity(active);
    const maxClears = currentDifficulty.id === 'hard' ? 2 : 1;
    for (let i = 0; i < maxClears && debrisSeverity > 0; i++) {
      const threshold = currentDifficulty.id === 'hard' ? 1.35 : (currentDifficulty.id === 'medium' ? 2.0 : 3.0);
      const clearChance = THREE.MathUtils.clamp(profile.clearDebrisChance + debrisSeverity * profile.clearDebrisSeverityBoost, 0, 0.99);
      const shouldClear = debrisSeverity >= threshold || Math.random() < clearChance;
      if (!shouldClear) break;
      if (!canPay(pl.res, DEBRIS_CLEAR_COST) && debrisSeverity >= threshold && Math.random() < profile.marketAttackChance) {
        aiTryMarketForCost(DEBRIS_CLEAR_COST);
      }
      if (canPay(pl.res, DEBRIS_CLEAR_COST) && clearActiveAttackDebris()) {
        debrisSeverity = aiDebrisSeverity(active);
      } else {
        break;
      }
    }

    // Priorité d'assaut : rampes château d'abord, rampes latérales ensuite.
    let builtSomething = false;
    let slot = aiBestUnlockedRampSlot(pl);
    if (slot >= 0) {
      const cost = rampCost[slot];
      if (!canPay(pl.res, cost) && Math.random() < profile.marketAttackChance) aiTryMarketForCost(cost);
      if (canPay(pl.res, cost) && Math.random() < profile.buildClassicRampChance) {
        buildRampForActive(slot);
        builtSomething = true;
      }
    }

    const sideSlot = aiBestSideRampSlot(pl);
    if (sideSlot >= 0 && (!builtSomething || Math.random() < 0.28)) {
      const cost = SIDE_RIDGE.cost;
      if (!canPay(pl.res, cost) && Math.random() < profile.marketAttackChance * 0.72) aiTryMarketForCost(cost);
      if (canPay(pl.res, cost) && Math.random() < profile.buildSideRampChance) {
        buildSideRampForActive(sideSlot);
        builtSomething = true;
      }
    }

    // Si l'IA vient de construire une rampe, une caméra de présentation est active.
    const aiRampFocusWait = rampCameraFocus
      ? Math.max(0, rampCameraFocus.until - Date.now()) + 1400
      : 0;

    // La seconde bille est une action marché : l'IA l'achète seulement si elle peut payer directement.
    const hasBuiltRamp = pl.ramps.some(r => r.built) || (pl.sideRamps || []).some(r => r.built);
    const secondBallCost = getSecondBallCost();
    const canBuyDirectly = !marketTradeUsedThisTurn && canPay(pl.res, secondBallCost);
    const secondChance = profile.secondBallChance + (hasBuiltRamp ? profile.secondBallRampBonus : 0) + (aiResourceTotal(active) > 18 ? 0.10 : 0);
    if (pl.secondBallTurns <= 0 && !shotStarted && canBuyDirectly && Math.random() < secondChance) {
      buySecondBallForActive({ fromMarket: true });
    }

    scheduleAIAction(aiLaunchBall, Math.max(900, aiRampFocusWait || 0));
  }

  function aiRepeatPenalty(type, x, z) {
    if (aiShotMemory.type !== type) return 0;
    const d = Math.hypot((aiShotMemory.x || 0) - x, (aiShotMemory.z || 0) - z);
    return d < 8 ? 14 + aiShotMemory.repeat * 10 : 0;
  }

  function aiRememberShot(plan) {
    const d = Math.hypot((aiShotMemory.x || 0) - plan.x, (aiShotMemory.z || 0) - plan.z);
    if (aiShotMemory.type === plan.type && d < 8) aiShotMemory.repeat++;
    else aiShotMemory.repeat = 0;
    aiShotMemory.type = plan.type;
    aiShotMemory.x = plan.x;
    aiShotMemory.z = plan.z;
    if (Number.isInteger(plan.sideIndex)) aiShotMemory.lastSideIndex = plan.sideIndex;
    if (Number.isInteger(plan.slot)) aiShotMemory.lastClassicSlot = plan.slot;
  }

  function aiPathDebrisPenalty(player, startX, targetX, targetZ) {
    const list = laneDebris(player).filter(d => d && d.mesh);
    if (!list.length) return 0;
    const z0 = startZ(player);
    const z1 = targetZ;
    const dz = z1 - z0;
    if (Math.abs(dz) < 1) return 0;
    let penalty = 0;
    list.forEach(debris => {
      const t = (debris.z - z0) / dz;
      if (t <= -0.04 || t >= 1.04) return;
      const expectedX = startX + (targetX - startX) * t;
      const dist = Math.abs((debris.x || attackX(player)) - expectedX);
      const danger = (debris.radius || DEBRIS_RADIUS) + 2.8 + (debris.stage || 1) * 0.65;
      if (dist < danger) {
        penalty += (danger - dist) * (9 + (debris.stage || 1) * 4);
      }
    });
    return penalty;
  }

  function aiOptimizeShotLine(plan, laneX) {
    const laneMin = laneX - CFG.laneW / 2 + 2.2;
    const laneMax = laneX + CFG.laneW / 2 - 2.2;
    const baseTargetX = Number.isFinite(plan.x) ? plan.x : laneX;
    const targetZ = Number.isFinite(plan.z) ? plan.z : (startZ(active) + dir(active) * 90);
    const preferredStart = Number.isFinite(plan.startX) ? plan.startX : baseTargetX;
    const preciseTarget = ['hole', 'bonusHole', 'kit', 'sideTheft'].includes(plan.type);
    const targetOffsets = preciseTarget ? [0] : [0, -1.6, 1.6, -3.2, 3.2];
    const startOffsets = [-8.8, -6.2, -3.8, -1.8, 0, 1.8, 3.8, 6.2, 8.8];
    let best = null;
    targetOffsets.forEach(to => {
      const tx = THREE.MathUtils.clamp(baseTargetX + to, laneMin, laneMax);
      startOffsets.forEach(so => {
        const sx = THREE.MathUtils.clamp(preferredStart + so, laneMin, laneMax);
        const debrisPenalty = aiPathDebrisPenalty(active, sx, tx, targetZ);
        const sidePenalty = Math.abs(sx - preferredStart) * (plan.type === 'classicRamp' || plan.type === 'tower' ? 0.20 : 0.32);
        const targetPenalty = Math.abs(to) * (preciseTarget ? 3.0 : 0.44);
        const straightPenalty = Math.abs(tx - sx) < 1.2 && debrisPenalty > 0 ? 10 : 0;
        const score = debrisPenalty + sidePenalty + targetPenalty + straightPenalty + Math.random() * 0.35;
        if (!best || score < best.score) best = { startX: sx, targetX: tx, targetZ, debrisPenalty, score };
      });
    });
    return best || { startX: THREE.MathUtils.clamp(preferredStart, laneMin, laneMax), targetX: baseTargetX, targetZ, debrisPenalty: 0, score: 0 };
  }

  function aiPowerBoostForPlan(plan, optimizedLine) {
    const distance = Math.abs((plan.z || startZ(active)) - startZ(active));
    const farBoost = Math.max(0, Math.min(0.72, (distance - 80) * 0.0048));
    const debrisBoost = optimizedLine && optimizedLine.debrisPenalty > 0 ? 0.16 : 0;
    const hardBoost = currentDifficulty.id === 'hard' ? 0.16 : (currentDifficulty.id === 'medium' ? 0.08 : 0);
    const attackTypes = ['classicRamp', 'tower', 'sideTheft', 'lane'];
    const typeBoost = attackTypes.includes(plan.type) ? 0.22 : 0;
    return farBoost + debrisBoost + hardBoost + typeBoost;
  }


  function aiLaneHoles() {
    const laneX = attackX(active);
    return holes.filter(h => Math.abs(h.x - laneX) < CFG.laneW / 2);
  }

  function aiChooseResourceHole() {
    // L'IA reste honnête : elle ne lit pas les pièges ni les gains cachés.
    // En facile elle cherche davantage les trous, en difficile elle privilégie l'assaut.
    const profile = aiProfile();
    const visibleHoles = aiLaneHoles();
    if (!visibleHoles.length) return null;

    const ranked = visibleHoles
      .map(h => {
        const distance = Math.abs(h.z - startZ(active));
        const laneCenterBonus = 1.4 - Math.abs(h.x - attackX(active)) * 0.045;
        const reachPenalty = distance * 0.0036;
        const repeatPenalty = aiRepeatPenalty('hole', h.x, h.z);
        const knownTrapPenalty = h.trapKnown ? 50 : 0;
        return { h, s: Math.random() * 12 + laneCenterBonus - reachPenalty - repeatPenalty - knownTrapPenalty + profile.resourceBias * 2.2 };
      })
      .sort((a, b) => b.s - a.s);

    const top = ranked.slice(0, Math.min(5, ranked.length));
    return top[randInt(0, top.length - 1)].h;
  }

  function aiChooseBonusHoleTarget() {
    const profile = aiProfile();
    const h = bonusHoles.find(item => item.attacker === active);
    if (!h) return null;
    const hasQueued = !!players[active - 1].queuedBonusNextTurn;
    const appeal = 18 + profile.resourceBias * 10 + profile.attackBias * 4 - (hasQueued ? 14 : 0);
    if (Math.random() * 100 > appeal) return null;
    return h;
  }

  function aiChooseTowerTarget() {
    const defender = enemy(active);
    const enemyTowers = players[defender - 1].towers
      .filter(t => t.placed && t.hp > 0 && t.pos && Math.abs(t.pos.x - attackX(active)) < CFG.laneW / 2 + 1)
      .map(t => {
        const damagedBonus = (1 - t.hp / t.max) * 24;
        const weakBonus = t.hp < 45 ? 16 : 0;
        const repeatPenalty = aiRepeatPenalty('tower', t.pos.x, t.pos.z);
        return { t, value: damagedBonus + weakBonus + Math.random() * 10 - repeatPenalty };
      })
      .sort((a, b) => b.value - a.value);
    if (!enemyTowers.length) return null;
    return enemyTowers.slice(0, Math.min(3, enemyTowers.length))[randInt(0, Math.min(2, enemyTowers.length - 1))].t;
  }

  function aiClassicRampTarget() {
    const pl = players[active - 1];
    const built = pl.ramps
      .map((r, i) => ({ r, i, p: rampSlotPosition(active, i) }))
      .filter(o => o.r.built && o.r.mesh)
      .map(o => ({ ...o, score: o.r.hp + Math.random() * 28 - (aiShotMemory.lastClassicSlot === o.i ? 22 : 0) }))
      .sort((a, b) => b.score - a.score);
    if (!built.length) return null;
    const choice = built[0];
    const lateralOffset = (Math.random() - 0.5) * 0.95;
    return {
      type: 'classicRamp',
      slot: choice.i,
      x: choice.p.x + lateralOffset,
      z: choice.p.z + dir(active) * (0.6 + Math.random() * 1.2),
      power: 3.75 + Math.random() * 0.55,
      accuracy: 0.55,
      xFactor: 0.046,
      xNoise: 0.035,
      zNoise: 0.18
    };
  }

  function aiSideTheftTarget() {
    const pl = players[active - 1];
    const builtSide = (pl.sideRamps || [])
      .filter(r => r.built && r.mesh)
      .map(r => {
        const hole = sideTheftHoles.find(h => h.attacker === active && h.sideIndex === r.sideIndex);
        const rampPos = sideRampPosition(active, r.sideIndex);
        return hole ? { r, hole, rampPos, score: r.hp + Math.random() * 30 - (aiShotMemory.lastSideIndex === r.sideIndex ? 18 : 0) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    if (!builtSide.length) return null;
    const choice = builtSide[0];
    return {
      type: 'sideTheft',
      sideIndex: choice.r.sideIndex,
      // La cible visée est proche du trou, mais le départ est aligné sur la rampe latérale.
      x: choice.hole.x + (Math.random() - 0.5) * 0.42,
      z: choice.hole.z - dir(active) * (1.8 + Math.random() * 1.2),
      startX: choice.rampPos.x + (Math.random() - 0.5) * 0.34,
      power: 3.38 + Math.random() * 0.42,
      accuracy: 0.36,
      xFactor: 0.034,
      xNoise: 0.025,
      zNoise: 0.12
    };
  }

  function aiShotPlan() {
    const profile = aiProfile();
    const classicRamp = aiClassicRampTarget();
    const sideTheft = aiSideTheftTarget();
    const towerTarget = aiChooseTowerTarget();
    const kitTarget = aiChooseKitTarget();
    const bonusHoleTarget = aiChooseBonusHoleTarget();
    const holeTarget = aiChooseResourceHole();

    const plans = [];
    if (classicRamp) plans.push({ plan: classicRamp, weight: (62 * profile.attackBias) - aiRepeatPenalty('classicRamp', classicRamp.x, classicRamp.z) });
    if (sideTheft) plans.push({ plan: sideTheft, weight: (28 * profile.attackBias) - aiRepeatPenalty('sideTheft', sideTheft.x, sideTheft.z) });
    if (towerTarget) {
      const tx = towerTarget.pos.x + (Math.random() - 0.5) * 1.05;
      const tz = towerTarget.pos.z - dir(active) * (0.3 + Math.random() * 0.9);
      plans.push({
        plan: {
          type: 'tower',
          x: tx,
          z: tz,
          power: 3.88 + Math.random() * 0.65,
          accuracy: 0.72,
          xFactor: 0.048,
          xNoise: 0.045,
          zNoise: 0.22
        },
        weight: (classicRamp ? 22 : 58) * profile.attackBias
      });
    }
    if (kitTarget) {
      const dz = Math.abs(kitTarget.z - startZ(active));
      const calibrated = THREE.MathUtils.clamp(0.58 + dz * 0.0112, 0.82, 1.82);
      plans.push({
        plan: {
          type: 'kit',
          x: kitTarget.x + (Math.random() - 0.5) * 0.35,
          z: kitTarget.z,
          power: calibrated,
          accuracy: 1.05,
          xFactor: 0.017,
          xNoise: 0.060,
          zNoise: 0.11
        },
        weight: 20 * profile.kitBias
      });
    }
    if (bonusHoleTarget) {
      const dz = Math.abs(bonusHoleTarget.z - startZ(active));
      const calibrated = THREE.MathUtils.clamp(0.56 + dz * 0.0113, 0.84, 1.78);
      plans.push({
        plan: {
          type: 'bonusHole',
          x: bonusHoleTarget.x + (Math.random() - 0.5) * 0.55,
          z: bonusHoleTarget.z,
          power: calibrated,
          accuracy: 1.10,
          xFactor: 0.017,
          xNoise: 0.070,
          zNoise: 0.14
        },
        weight: ((classicRamp || towerTarget) ? 12 : 36) * profile.resourceBias
      });
    }
    if (holeTarget) {
      const dz = Math.abs(holeTarget.z - startZ(active));
      const calibrated = THREE.MathUtils.clamp(0.55 + dz * 0.0115, 0.82, 1.72);
      plans.push({
        plan: {
          type: 'hole',
          x: holeTarget.x + (Math.random() - 0.5) * 0.5,
          z: holeTarget.z,
          power: calibrated,
          accuracy: 1.35,
          xFactor: 0.017,
          xNoise: 0.075,
          zNoise: 0.12
        },
        weight: ((classicRamp || towerTarget) ? 14 : 44) * profile.resourceBias
      });
    }

    const valid = plans.filter(p => p.weight > 0);
    if (valid.length) {
      const total = valid.reduce((sum, p) => sum + p.weight, 0);
      let roll = Math.random() * total;
      for (const item of valid) {
        roll -= item.weight;
        if (roll <= 0) return item.plan;
      }
      return valid[0].plan;
    }

    return {
      type: 'lane',
      x: attackX(active) + (Math.random() - 0.5) * 8,
      z: startZ(active) + dir(active) * (95 + Math.random() * 35),
      power: 3.20 + Math.random() * 0.48,
      accuracy: 1.4,
      xFactor: 0.040,
      xNoise: 0.08,
      zNoise: 0.25
    };
  }

  function aiLaunchBall() {
    if (!isAITurn() || gamePaused || turnLocked || gameOver || setupMode || phase !== 'attack' || shotStarted) return;

    const laneX = attackX(active);
    const profile = aiProfile();
    const plan = aiShotPlan();
    const optimizedLine = aiOptimizeShotLine(plan, laneX);
    const startX = optimizedLine.startX;
    const targetX = optimizedLine.targetX;

    ball.position.x = startX;
    ball.position.z = startZ(active);
    ball.position.y = CFG.ballR + .18;
    selectMarker.position.x = ball.position.x;

    const xFactor = plan.xFactor ?? (plan.type === 'hole' ? 0.020 : 0.040);
    const xNoise = plan.xNoise ?? (plan.type === 'hole' ? 0.060 : 0.050);
    const zNoise = plan.zNoise ?? (plan.type === 'hole' ? 0.10 : 0.22);
    const power = plan.power + aiPowerBoostForPlan(plan, optimizedLine);
    velocity.x = (targetX - startX) * xFactor + (Math.random() - 0.5) * xNoise * profile.aimNoise;
    velocity.z = dir(active) * (power + (Math.random() - 0.5) * zNoise * profile.powerNoise);

    const memoryPlan = { ...plan, x: targetX };
    aiRememberShot(memoryPlan);
    canShoot = false;
    shotStarted = true;
    secondShotReady = false;
    pauseTurnTimer();
    const label = plan.type === 'classicRamp' ? 'vers rampe château'
      : plan.type === 'sideTheft' ? 'vers trou de vol'
      : plan.type === 'tower' ? 'puissant sur tour'
      : plan.type === 'kit' ? 'vers kit utile'
      : plan.type === 'bonusHole' ? 'vers trou bonus'
      : plan.type === 'hole' ? 'sur trou visible'
      : 'libre varié';
    turnSummary.push('IA : tir ' + label);
    showAIIntent(plan, label);
    updateHUD();
  }

  function scheduleFinishTurn(reason, delay = 650) {
    if (finishTimer) return;
    finishTimer = setTimeout(() => {
      finishTimer = null;
      if (gamePaused) { scheduleFinishTurn(reason, 500); return; }
      finishTurn(reason);
    }, delay);
  }

  function resetBall() {
    const x = attackX(active), z = startZ(active);
    applyActiveBallSkin(active);
    clearBallTrail();
    ball.position.set(x, CFG.ballR + .18, z); velocity.set(0, 0, 0);
    canShoot = (phase === 'attack' && !turnLocked && gameStarted && !gamePaused && !isAITurn());
    shotStarted = false; autoSwitchStarted = false;
    holeResolved = false; ballInHole = false; castleHitThisShot = false; castleAccessThisShot = false; sideRidgeAccessThisShot = false;
    currentShot = createShotState();
    holes.forEach(h => h.last = false);
    bonusHoles.forEach(h => { h.last = false; });
    activeMudZones.forEach(zone => { zone.notedForShot = false; });
    players.forEach(pl => {
      pl.ramps.forEach(r => r.usedThisShot = false);
      (pl.sideRamps || []).forEach(r => r.usedThisShot = false);
    });
    launchLine.position.set(x, .36, z);
    selectMarker.position.set(x, .42, z);
    setAimVisualsVisible(false); resetPowerGauge(); updateHUD();
  }

  function updateTurnTimerDisplay() {
    if (!UI.timer || !UI.timerValue) return;
    if (!gameStarted || setupMode || gameOver) {
      UI.timer.classList.add('hidden');
      UI.timer.classList.remove('warning', 'danger');
      return;
    }
    const ms = turnTimerRunning ? Math.max(0, turnTimerDeadline - Date.now()) : Math.max(0, turnTimerPausedMs);
    const sec = Math.ceil(ms / 1000);
    UI.timerValue.textContent = String(sec).padStart(2, '0');
    UI.timer.classList.remove('hidden');
    UI.timer.classList.toggle('warning', sec <= 15 && sec > 5);
    UI.timer.classList.toggle('danger', sec <= 5);
  }

  function ensureTurnTimerLoop() {
    if (turnTimerId) return;
    turnTimerId = setInterval(() => {
      if (!gameStarted || gamePaused || !turnTimerRunning || setupMode || gameOver) { updateTurnTimerDisplay(); return; }
      turnTimerPausedMs = Math.max(0, turnTimerDeadline - Date.now());
      updateTurnTimerDisplay();
      if (turnTimerPausedMs <= 0 && !turnTimerExpired) {
        turnTimerExpired = true;
        turnTimerRunning = false;
        turnTimerPausedMs = 0;
        updateTurnTimerDisplay();
        if (!turnLocked && !gameOver && !setupMode && !shotStarted) {
          finishTurn('Temps écoulé.');
        }
      }
    }, 200);
  }

  function startTurnTimer(ms = 60000) {
    turnTimerPausedMs = ms;
    turnTimerDeadline = Date.now() + turnTimerPausedMs;
    turnTimerRunning = true;
    turnTimerExpired = false;
    ensureTurnTimerLoop();
    updateTurnTimerDisplay();
  }

  function pauseTurnTimer() {
    if (!turnTimerRunning) return;
    turnTimerPausedMs = Math.max(0, turnTimerDeadline - Date.now());
    turnTimerRunning = false;
    updateTurnTimerDisplay();
  }

  function resumeTurnTimer() {
    if (!gameStarted || gamePaused || setupMode || gameOver || turnLocked || turnTimerPausedMs <= 0) return;
    turnTimerDeadline = Date.now() + turnTimerPausedMs;
    turnTimerRunning = true;
    ensureTurnTimerLoop();
    updateTurnTimerDisplay();
  }

  function stopTurnTimer(hide = false) {
    turnTimerRunning = false;
    turnTimerExpired = false;
    if (hide && UI.timer) {
      UI.timer.classList.add('hidden');
      UI.timer.classList.remove('warning', 'danger');
    } else {
      updateTurnTimerDisplay();
    }
  }

  function startTurnChoice() {
    clearPendingTowerPlacement();
    clearPendingWorldAction();
    phase = 'choice';
    setupMode = false;
    placingTower = false;

    // Le compteur de tour avance uniquement quand le Joueur 1 commence une nouvelle manche.
    // Le Joueur 2 joue ensuite le même numéro de tour avec le même événement actif.
    const newRound = active === 1 || matchTurns === 0;
    if (newRound) {
      matchTurns++;
      rollTurnEventForCurrentRound();
    } else {
      updateEventBanner();
    }

    statForPlayer(active).turns++;
    secondShotReady = false;
    rerollHoleRewards();
    turnLocked = false;
    canShoot = false;
    turnSummary = [];
    applyQueuedBonusForPlayer(active);
    shotStarted = false;
    randomRepairUsedThisTurn = false;
    marketTradeUsedThisTurn = false;
    kitUsedThisTurn = false;
    maybeSpawnKitForPlayer(active);
    resetDefenseCamera();
    resetBall();
    shotCreatedDebris = [];
    startTurnIntroCamera(active);
    startTurnTimer(60000);
    updateHUD();
    showMomentBanner('TOUR ' + matchTurns + ' · JOUEUR ' + active, activeTurnEvent ? ('Événement : ' + activeTurnEvent.short) : 'Prépare ton coup', 'gold', 1900);
    setHype(6, 'Nouveau tour', 'gold');
    showToast('Tour ' + matchTurns + ' · Joueur ' + active + '<br>Choisis ta vue' + (activeTurnEvent ? '<br>Événement : ' + activeTurnEvent.short : ''));
    if (isAITurn()) scheduleAIAction(runAITurn, 900);
  }

  function startInitialSetup() {
    clearPendingTowerPlacement();
    clearPendingWorldAction();
    phase = 'setup'; setupMode = true; active = 1; placingTower = true;
    activeTurnEvent = null;
    rampCameraFocus = null;
    turnIntroCamera = null;
    shotCreatedDebris = [];
    updateEventBanner();
    stopTurnTimer(true);
    resetDefenseCamera();
    players.forEach((pl, idx) => {
      clearDebrisForPlayer(idx + 1);
      pl.kits = { repair: 0, build: 0 };
      pl.queuedBonusNextTurn = null;
      pl.bonusSecondShotThisTurn = false;
      pl.bonusDoubleDamageThisTurn = false;
      pl.freeTowerBuilds = 0;
    });
    clearAllKits();
    clearMudZones();
    turnLocked = false; canShoot = false; turnSummary = []; randomRepairUsedThisTurn = false; marketTradeUsedThisTurn = false; kitUsedThisTurn = false; resetRelicHolesForMatch(); resetBall(); updateHUD();
    showToast('Préparation<br>Joueur 1 : place tes 4 tours');
  }

  function enterDefense() {
    clearPendingTowerPlacement();
    clearPendingWorldAction();
    if (turnLocked || setupMode || gameOver) return;
    if (phase === 'attack' && shotStarted) return;
    const wasChoiceView = phase === 'choice';
    stopTurnIntroCamera();
    phase = 'defense';
    if (wasChoiceView) resetDefenseCamera();
    placingTower = false;
    canShoot = false;
    secondShotReady = false;
    resetBall();
    resumeTurnTimer();
    updateHUD();
    showMomentBanner('PHASE DÉFENSE', 'Construis, répare, prépare ton prochain tir', 'cyan', 1450);
    showToast('Défense<br>Tours, château, réparations et kits');
  }

  function enterAttack() {
    clearPendingTowerPlacement();
    clearPendingWorldAction();
    if (turnLocked || setupMode || gameOver) return;
    if (phase === 'attack' && shotStarted) return;
    const pl = players[active-1];
    stopTurnIntroCamera();
    phase = 'attack';
    placingTower = false;
    turnSummary = [];
    const bonusSecondShot = !!pl.bonusSecondShotThisTurn;
    pl.extraShotsLeft = (pl.secondBallTurns > 0 || bonusSecondShot) ? 1 : 0;
    pl.secondBallActiveThisTurn = pl.secondBallTurns > 0;
    resetBall();
    resumeTurnTimer();
    showMomentBanner('PHASE ATTAQUE', 'Choisis ta trajectoire et fais exploser le tour', 'red', 1450);
    setHype(5, 'Attaque', 'red');
    showToast('Attaque<br>Marché, seconde bille et rampes d’accès disponibles ici');
  }

  function showTurnPause(title, text) {
    if (gameOver) return;
    stopTurnTimer(true);
    turnLocked = true; dragging = false; canShoot = false; velocity.set(0, 0, 0);
    hideBigMessage();
    turnOverlay.classList.remove('victory-mode');
    turnTitle.textContent = title; turnText.innerHTML = text;
    turnOverlay.classList.add('show');
    const advanceAfterPause = () => {
      if (gameOver) return;
      if (gamePaused) { setTimeout(advanceAfterPause, 500); return; }
      turnOverlay.classList.remove('show');
      active = enemy(active); resetDefenseCamera(); startTurnChoice();
    };
    setTimeout(advanceAfterPause, 3600);
  }

  function medalForPlayerStats(s, winner) {
    const medals = [];
    if (winner) medals.push('🏆 Vainqueur');
    if ((s.damage || 0) >= 120) medals.push('💥 Destructeur');
    if ((s.resources || 0) >= 80) medals.push('💰 Collectionneur');
    if ((s.holesHit || 0) >= 18) medals.push('🕳️ Explorateur');
    if ((s.combos || 0) >= 2) medals.push('🔥 Comboteur');
    if ((s.relicsFound || 0) >= 1) medals.push('🏺 Archéologue');
    if (!medals.length) medals.push('🎱 Stratège prudent');
    return medals;
  }

  function bestStatLabel(s) {
    const entries = [
      ['PV retirés', s.damage || 0],
      ['Ressources', s.resources || 0],
      ['Trous', s.holesHit || 0],
      ['Combos', s.combos || 0],
      ['Vols', s.edgeSteals || 0],
      ['Reliques', s.relicsFound || 0]
    ].sort((a, b) => b[1] - a[1]);
    return entries[0][0] + ' : ' + entries[0][1];
  }

  function buildVictoryScoreHtml(winner) {
    const rows = [1, 2].map(player => {
      const s = statForPlayer(player);
      const destroyedTotal = s.partsDestroyed + s.towersDestroyed;
      const medals = medalForPlayerStats(s, player === winner).map(m => '<span>' + m + '</span>').join('');
      return `
        <div class="victory-player-report ${player === winner ? 'winner' : ''}">
          <h3>${getProfileAvatar(player)} J${player} · ${gameMode === 'solo' && player === 2 ? 'IA' : getProfileName(player)}</h3>
          <div class="victory-medals">${medals}</div>
          <div class="victory-stats compact">
            <div><b>${s.resources}</b><span>ressources</span></div>
            <div><b>${s.damage}</b><span>PV retirés</span></div>
            <div><b>${destroyedTotal}</b><span>détruits</span></div>
            <div><b>${s.holesHit}</b><span>trous</span></div>
            <div><b>${s.combos}</b><span>combos</span></div>
            <div><b>${s.secondShots}</b><span>2e tirs</span></div>
          </div>
          <small>Meilleur domaine : ${bestStatLabel(s)}</small>
        </div>`;
    }).join('');
    return `
      <div class="victory-score-title">Récapitulatif de bataille</div>
      <div class="victory-battle-report">
        <div class="victory-match-line"><b>${matchTurns}</b><span>manches jouées</span></div>
        ${rows}
      </div>
    `;
  }

function buildVictoryHeroHtml(winner, report) {
    const winnerReport = report && report.reports ? report.reports.find(r => r.player === winner) : null;
    const score = winnerReport ? (winnerReport.baseScore || 0) : 0;
    const total = winnerReport ? (winnerReport.points || 0) : 0;
    const target = winnerReport ? (winnerReport.previousScoreToBeat || SCORE_TO_BEAT_DEFAULT) : SCORE_TO_BEAT_DEFAULT;
    const record = winnerReport && winnerReport.recordBroken;
    const subtitle = record
      ? `Nouveau record battu : ${score} pts · bonus +${winnerReport.highScoreBonus}`
      : `Score à battre : ${target} pts`;
    return `
      <div class="victory-hero ${record ? 'record' : ''}">
        <div class="victory-crown">${record ? '👑' : '🏆'}</div>
        <div class="victory-hero-main">
          <span>Score de partie</span>
          <b>${score}</b>
          <small>${subtitle}</small>
        </div>
        <div class="victory-hero-total">
          <span>Gain total</span>
          <b>+${total}</b>
          <small>points de victoire</small>
        </div>
      </div>`;
  }
function buildVictoryActionsHtml() {
    return `
      <div class="victory-actions">
        <button id="btnReplayVictory" class="victory-replay">↻ Rejouer</button>
        <button id="btnVictoryCustomize" type="button">🎨 Décoration</button>
        <button id="btnVictoryProgression" type="button">🏆 Progression</button>
        <button id="btnVictoryProfiles" type="button">👤 Profils</button>
      </div>`;
  }
function clearVictoryCelebration() {
    document.querySelectorAll('.victory-confetti, .victory-ray').forEach(node => node.remove());
  }
function spawnVictoryCelebration(report) {
    clearVictoryCelebration();
    const record = !!(report && report.recordBroken);
    const ray = document.createElement('div');
    ray.className = 'victory-ray';
    turnOverlay.appendChild(ray);

    const count = record ? 46 : 30;
    const symbols = record ? ['✦', '◆', '✶', '✹', '★'] : ['✦', '◆', '✶'];
    for (let i = 0; i < count; i++) {
      const node = document.createElement('i');
      node.className = 'victory-confetti' + (record ? ' record' : '');
      node.textContent = symbols[i % symbols.length];
      node.style.left = (6 + Math.random() * 88).toFixed(2) + 'vw';
      node.style.setProperty('--dx', ((Math.random() - 0.5) * 160).toFixed(1) + 'px');
      node.style.setProperty('--rot', ((Math.random() * 720) - 360).toFixed(1) + 'deg');
      node.style.animationDelay = (Math.random() * 0.75).toFixed(2) + 's';
      node.style.animationDuration = (2.0 + Math.random() * 1.2).toFixed(2) + 's';
      turnOverlay.appendChild(node);
    }
    setTimeout(() => {
      document.querySelectorAll('.victory-confetti').forEach(node => node.remove());
    }, 3900);
  }

  function buildVictoryPointHtml(report) {
    if (!report) return '';
    const playerRows = report.reports.map(r => {
      const baseLine = `<li class="vp-score-line"><span>Score de partie</span><b>${r.baseScore || 0} pts</b></li>`;
      const detail = r.lines.length
        ? r.lines.map(line => `<li><span>${line.label}</span><b>+${line.points}</b></li>`).join('')
        : '<li><span>Aucun palier atteint</span><b>+0</b></li>';
      const recordLine = r.recordBroken
        ? `<small>🏆 Record battu : ${r.baseScore} pts · bonus +${r.highScoreBonus}</small>`
        : `<small>Score à battre : ${r.bestScoreToBeat} pts</small>`;
      return `
        <div class="vp-player-card ${r.highScoreBonus ? 'record' : ''}">
          <h3>J${r.player} · ${r.profileName} <strong>+${r.points}</strong></h3>
          <ul>${baseLine}${detail}</ul>
          ${recordLine}
          <small>Solde du profil : ${r.balance} pts</small>
        </div>`;
    }).join('');
    return `
      <div class="victory-score-title">Points de victoire</div>
      <div class="victory-points-box">
        <div class="vp-total"><b>+${report.total}</b><span>gagnés cette partie</span><small>Les points sont enregistrés sur les profils actifs.</small></div>
        <div class="vp-players">${playerRows}</div>
      </div>`;
  }

    function showVictory(winner) {
    gameOver = true;
    clearAIActionTimers();
    if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
    players.forEach(pl => { pl.extraShotsLeft = 0; pl.secondBallActiveThisTurn = false; });
    secondShotReady = false;
    activeTurnEvent = null;
    rampCameraFocus = null;
    updateEventBanner();
    stopTurnTimer(true);
    turnLocked = true; dragging = false; canShoot = false; velocity.set(0, 0, 0);
    const defeated = enemy(winner);
    victoryFocus = new THREE.Vector3(castleX(defeated), 4.2, castleZ(defeated));
    victoryCameraOffset = new THREE.Vector3(0, 17, castleZ(defeated) > 0 ? 30 : -30);
    impact(victoryFocus, 0xffcc55, 3.2);
    playVictoryAudio();
    triggerShake(0.55, 0.75);
    hideBigMessage();
    const victoryPointReport = awardVictoryPoints(winner);
    turnOverlay.classList.add('victory-mode');
    turnTitle.textContent = '🏆 ' + getProfileName(winner) + ' — Victoire';
    turnText.innerHTML = buildVictoryHeroHtml(winner, victoryPointReport) + buildVictoryScoreHtml(winner) + buildVictoryPointHtml(victoryPointReport) + buildVictoryActionsHtml();
    turnOverlay.classList.add('show');
    spawnVictoryCelebration(victoryPointReport);
    celebrateMicroMoment('VICTOIRE !', getProfileName(winner) + ' domine le siège', 'jackpot', victoryFocus, ['🏆','👑','✨','🎉','⚔️'], 46);
    playJuiceChord('victory', 1.65);
    setTimeout(() => {
      const replay = document.getElementById('btnReplayVictory');
      const prog = document.getElementById('btnVictoryProgression');
      const custom = document.getElementById('btnVictoryCustomize');
      const prof = document.getElementById('btnVictoryProfiles');
      if (replay) replay.onclick = () => returnToMainMenuAfterVictory();
      if (prog) prog.onclick = () => openProgression();
      if (custom) custom.onclick = () => openCustomization();
      if (prof) prof.onclick = () => openProfiles();
    }, 0);
    updateHUD();
  }

  function returnToMainMenuAfterVictory() {
    clearAIActionTimers();
    clearPendingWorldAction();
    if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
    stopTurnTimer(true);
    hideBigMessage();
    turnIntroCamera = null;
    shotCreatedDebris = [];
    clearVictoryCelebration();
    closeMarket();
    closeKitChoice();
    closeCustomization();
    if (UI.modal) UI.modal.classList.remove('open');
    tutorialOverlay.classList.remove('show');
    turnOverlay.classList.remove('show', 'victory-mode');
    dragging = false;
    canShoot = false;
    turnLocked = true;
    velocity.set(0, 0, 0);
    mainResume.style.display = 'none';
    updateMainMenuProgress();
    showMainMenuHome();
    mainMenuOverlay.classList.add('show');
    syncMusicForScreen(null, 'menu');
    if (UI.btnPause) UI.btnPause.classList.add('hidden');
  }

  function showSetupPause(title, text, nextFn) {
    stopTurnTimer(true);
    turnLocked = true; dragging = false; canShoot = false; velocity.set(0, 0, 0);
    hideBigMessage();
    turnOverlay.classList.remove('victory-mode');
    turnTitle.textContent = title; turnText.innerHTML = text;
    turnOverlay.classList.add('show');
    const setupAdvance = () => {
      if (gamePaused) { setTimeout(setupAdvance, 500); return; }
      turnOverlay.classList.remove('show'); turnLocked = false; nextFn();
    };
    setTimeout(setupAdvance, 3000);
  }

  function showSecondShotNotice() {
    if (gameOver) return;
    turnLocked = true;
    canShoot = false;
    hideBigMessage();
    turnOverlay.classList.remove('victory-mode');
    if (UI.btnSecondBall) {
      UI.btnSecondBall.classList.add('second-ready');
      setTimeout(() => UI.btnSecondBall.classList.remove('second-ready'), 1800);
    }
    turnTitle.textContent = '⚪ Second lancé';
    turnText.innerHTML = 'Joueur ' + active + '<br>Ta seconde bille est prête.<br>Tire maintenant.';
    turnOverlay.classList.add('show');
    setTimeout(() => {
      if (gameOver || phase !== 'attack') return;
      turnOverlay.classList.remove('show');
      turnLocked = false;
      canShoot = true;
      resumeTurnTimer();
      updateHUD();
      if (isAITurn()) scheduleAIAction(aiLaunchBall, 450);
    }, 2400);
  }

  function compactTurnSummary(items) {
    const groups = new Map();
    const out = [];

    function ensureGroup(label) {
      const key = label.trim();
      if (!groups.has(key)) {
        const group = { label: key, damage: 0, statuses: [], order: out.length };
        groups.set(key, group);
        out.push({ type: 'group', key });
      }
      return groups.get(key);
    }

    function addStatus(group, status) {
      if (status && !group.statuses.includes(status)) group.statuses.push(status);
    }

    (items || []).forEach(item => {
      let m;
      if ((m = item.match(/^Toit de la tour (\d+) endommagé$/))) {
        addStatus(ensureGroup('Tour ' + m[1]), 'toit endommagé');
        return;
      }
      if ((m = item.match(/^Toit endommagé\s*:\s*(.+)$/))) {
        addStatus(ensureGroup(m[1]), 'toit endommagé');
        return;
      }
      if ((m = item.match(/^(.+?) détruite? \(-(\d+) PV\)$/))) {
        const group = ensureGroup(m[1]);
        group.damage += Number(m[2] || 0);
        addStatus(group, item.includes('détruite') ? 'détruite' : 'détruit');
        return;
      }
      if ((m = item.match(/^(.+?) -(\d+) PV$/))) {
        const group = ensureGroup(m[1]);
        group.damage += Number(m[2] || 0);
        return;
      }
      if ((m = item.match(/^(.+?) détruit(?:e)?$/))) {
        addStatus(ensureGroup(m[1]), item.includes('détruite') ? 'détruite' : 'détruit');
        return;
      }
      out.push({ type: 'raw', value: item });
    });

    return out.map(entry => {
      if (entry.type === 'raw') return entry.value;
      const group = groups.get(entry.key);
      if (!group) return '';
      const parts = [];
      if (group.damage > 0) parts.push('-' + group.damage + ' PV');
      parts.push(...group.statuses);
      return group.label + ' : ' + (parts.length ? parts.join(' · ') : 'touché');
    }).filter(Boolean);
  }

  function classifyShotRecap(items) {
    const joined = (items || []).join(' ').toLowerCase();
    const hasCombo = joined.includes('combo');
    const hasDestroy = joined.includes('détruit') || joined.includes('détruite');
    const hasDamage = joined.includes('pv') || hasDestroy;
    const hasGain = /\+\d+/.test(joined) && (joined.includes('🪙') || joined.includes('🪵') || joined.includes('🪨') || joined.includes('ressource'));
    const hasHole = joined.includes('trou') || joined.includes('relique') || joined.includes('piège');
    if (hasCombo || (hasDamage && hasGain)) return { icon: '👑', title: 'TIR ROYAL', cls: 'royal' };
    if (hasDestroy) return { icon: '💥', title: 'DÉMOLITION', cls: 'destroy' };
    if (hasDamage) return { icon: '⚔️', title: 'COUP BRUTAL', cls: 'damage' };
    if (hasGain) return { icon: '💰', title: 'BELLE RÉCOLTE', cls: 'gain' };
    if (hasHole) return { icon: '🕳️', title: 'EXPLORATION', cls: 'hole' };
    return { icon: '🎱', title: 'LANCER TERMINÉ', cls: 'neutral' };
  }

  function buildShotRecapHtml(items) {
    const recap = classifyShotRecap(items);
    const rows = items && items.length
      ? items.map(item => '<div class="shot-recap-row">' + item + '</div>').join('')
      : '<div class="shot-recap-row muted">Aucun gain / aucun dégât</div>';
    return '<div class="shot-recap-card ' + recap.cls + '">' +
      '<div class="shot-recap-head"><span>' + recap.icon + '</span><b>' + recap.title + '</b><small>Résumé du lancer</small></div>' +
      '<div class="shot-recap-body">' + rows + '</div>' +
      '</div>';
  }

  function finishTurn(reason = '') {
    pauseTurnTimer();
    if (finishTimer) {
      clearTimeout(finishTimer);
      finishTimer = null;
    }
    if (autoSwitchStarted) return;

    const pl = players[active-1];
    if (phase === 'attack' && shotStarted && pl.extraShotsLeft > 0) {
      pl.extraShotsLeft--;
      statForPlayer(active).secondShots++;
      secondShotReady = true;
      const summaryKeep = turnSummary;
      resetBall();
      turnSummary = summaryKeep;
      updateHUD();
      showSecondShotNotice();
      return;
    }

    autoSwitchStarted = true;
    if (phase === 'attack' && pl.secondBallActiveThisTurn) {
      pl.secondBallTurns = Math.max(0, pl.secondBallTurns - 1);
      pl.secondBallActiveThisTurn = false;
      pl.extraShotsLeft = 0;
    }
    if (phase === 'attack') {
      pl.bonusSecondShotThisTurn = false;
      pl.bonusDoubleDamageThisTurn = false;
    }

    const recapItems = compactTurnSummary(turnSummary);
    const recapType = classifyShotRecap(recapItems);
    const gains = buildShotRecapHtml(recapItems);

    const debrisToShow = Array.isArray(shotCreatedDebris)
      ? shotCreatedDebris.filter(d => d && d.mesh)
      : [];
    shotCreatedDebris = [];

    if (debrisToShow.length && focusCameraOnDebrisList(debrisToShow)) {
      hideBigMessage();
      const wait = DEBRIS_FOCUS_DURATION + 220;
      setTimeout(() => {
        if (!gameOver) showTurnPause(recapType.icon + ' ' + recapType.title, gains);
      }, wait);
      return;
    }

    showTurnPause(recapType.icon + ' ' + recapType.title, gains);
  }

  function isReservedRampZoneForDefender(defender, x, z) {
    const attacker = enemy(defender);
    for (const sideIndex of sideRidgeIndexes()) {
      const sideRp = sideRampPosition(attacker, sideIndex);
      const sideRelX = x - sideRp.x;
      const sideRelZ = (z - sideRp.z) * dir(attacker);
      if (Math.abs(sideRelX) < SIDE_RIDGE.width / 2 + 1.9 &&
          sideRelZ > -RAMP.halfLength - 2.2 &&
          sideRelZ <  RAMP.halfLength + 2.2) return true;
    }

    return [0, 1, 2, 3].some(slot => {
      const rp = rampSlotPosition(attacker, slot);
      const relX = x - rp.x;
      const relZ = (z - rp.z) * dir(attacker);
      return Math.abs(relX) < RAMP.width / 2 + 1.9 &&
             relZ > -RAMP.halfLength - 2.2 &&
             relZ <  RAMP.halfLength + 2.2;
    });
  }

  function isInsideDefenseZone(player, x, z) {
    const b = defenseZoneBounds(player);
    return Math.abs(x - b.x) <= DEFENSE_ZONE.halfWidth && z >= b.zMin && z <= b.zMax;
  }

  function isOnButte(x, z) {
    return [1, 2].some(player =>
      (Math.abs(x - castleX(player)) < BUTTE.w / 2 + 1.6 && Math.abs(z - castleZ(player)) < BUTTE.d / 2 + 1.6) ||
      isOnSideRidgeForAttacker(enemy(player), x, z, 1.1)
    );
  }

  function isOnHole(x, z) {
    return holes.some(h => Math.hypot(h.x - x, h.z - z) < 3.0);
  }

  function isTooCloseToDefenseTower(player, x, z) {
    return players[player-1].towers.some(t => t.placed && t.pos && Math.hypot(t.pos.x - x, t.pos.z - z) < 6.6);
  }

  function towerCandidate(player, x, z) {
    const pl = players[player-1];
    const slot = pl.towers.findIndex(t => !t.placed);
    if (slot < 0) return { ok: false, reason: '4 tours déjà placées' };

    // Les nouvelles petites zones de tour sont parfois en dehors de l'ancienne grande zone.
    // On valide donc le clic par rapport aux zones réellement dessinées, pas seulement au vieux rectangle DEFENSE_ZONE.
    const clickedZone = towerBuildZoneAt(player, x, z);
    if (!clickedZone) {
      return { ok: false, reason: 'Zone interdite<br>Place la tour dans une zone bleue' };
    }

    const px = THREE.MathUtils.clamp(x, clickedZone.xMin + 1.3, clickedZone.xMax - 1.3);
    const pz = THREE.MathUtils.clamp(z, clickedZone.zMin + 1.2, clickedZone.zMax - 1.2);

    if (!towerBuildZoneAt(player, px, pz)) return { ok: false, reason: 'Zone interdite<br>Choisis une zone de construction bleue' };
    if (isOnButte(px, pz)) return { ok: false, reason: 'Zone interdite<br>Impossible sur la butte' };
    if (isOnHole(px, pz)) return { ok: false, reason: 'Zone interdite<br>Impossible sur un trou' };
    if (isReservedRampZoneForDefender(player, px, pz)) return { ok: false, reason: 'Zone interdite<br>Emplacement réservé aux rampes' };
    if (isOnDefenseDebris(player, px, pz)) return { ok: false, reason: 'Zone encombrée<br>Déblaye les gravats ou utilise un kit construction' };

    const tower = pl.towers[slot];
    if (isTooCloseToDefenseTower(player, px, pz)) return { ok: false, reason: 'Zone trop proche<br>Écarte davantage les tours' };
    return { ok: true, slot, x: px, z: pz };
  }

  function createTowerPreviewMesh(player, x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.1, z);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9deec4, transparent: true, opacity: 0.46, roughness: 0.6, metalness: 0.0 });
    const roofMat = new THREE.MeshStandardMaterial({ color: player === 1 ? 0xe34b44 : 0x4c76ff, transparent: true, opacity: 0.62, roughness: 0.55, metalness: 0.02 });
    addCyl(1.8, 7.0, 0, 3.5, 0, bodyMat, g, 28);
    addCone(2.05, 3.2, 0, 8.75, 0, roofMat, g, 28);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.08, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xaaffcf, transparent: true, opacity: 0.72 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    g.add(ring);
    scene.add(g);
    return g;
  }

  function clearPendingTowerPlacement() {
    if (pendingTowerPlacement && pendingTowerPlacement.mesh) scene.remove(pendingTowerPlacement.mesh);
    pendingTowerPlacement = null;
    towerConfirmOverlay.classList.remove('show');
  }

  function previewTowerAt(x, z) {
    if (gamePaused || !gameStarted || isAITurn()) return;
    const candidate = towerCandidate(active, x, z);
    if (!candidate.ok) { showToast(candidate.reason); return; }
    clearPendingTowerPlacement();
    pendingTowerPlacement = {
      player: active,
      slot: candidate.slot,
      x: candidate.x,
      z: candidate.z,
      mesh: createTowerPreviewMesh(active, candidate.x, candidate.z)
    };
    towerConfirmText.innerHTML = `Joueur ${active} · tour ${candidate.slot + 1}<br>Position prête à valider.`;
    towerConfirmOverlay.classList.add('show');
    bigMessage('TOUR EN PRÉVISUALISATION', 'Valide pour la placer définitivement', 'gain', 1800);
  }

  function confirmPendingTowerPlacement() {
    if (!pendingTowerPlacement) return;
    const saved = pendingTowerPlacement;
    const x = saved.x, z = saved.z;
    clearPendingTowerPlacement();
    placeTowerAt(x, z);
  }

  towerConfirmOk.onclick = confirmPendingTowerPlacement;
  towerConfirmCancel.onclick = clearPendingTowerPlacement;

  function placeTowerAt(x, z) {
    const p = active, pl = players[p-1];
    const slot = pl.towers.findIndex(t => !t.placed);
    if (slot < 0) { showToast('4 tours déjà placées'); return; }

    const candidate = towerCandidate(p, x, z);
    if (!candidate.ok) { showToast(candidate.reason); return; }
    const px = candidate.x;
    const pz = candidate.z;

    const t = pl.towers[slot];
    let usedFreeTower = false;
    if (!setupMode && t.pos) {
      // Reconstruction normale : le joueur peut reconstruire la tour ailleurs.
      // Les anciens gravats restent sur le couloir et continuent de gêner tant qu'ils ne sont pas déblayés.
      if ((pl.freeTowerBuilds || 0) > 0) {
        pl.freeTowerBuilds--;
        usedFreeTower = true;
        turnSummary.push('Tour gratuite utilisée');
      } else if (!pay(pl.res, towerRebuildCost[slot])) {
        showToast('Ressources insuffisantes'); return;
      }
      const attacker = enemy(p);
      if (!players[attacker-1].ramps[slot].built) {
        players[attacker-1].ramps[slot].unlocked = false; updateTowerGhosts();
      }
    }
    t.placed = true; t.hp = t.max; t.pos = new THREE.Vector3(px, .1, pz);
    towerMesh(p, t); updateHUD();
    playSfx('build', 1);
    showToast(`${setupMode ? 'Tour' : 'Tour reconstruite'} ${slot+1}<br>${t.hp}/${t.max} PV${usedFreeTower ? '<br>🗼 Bonus ligne : gratuit' : ''}`);
    if (pl.towers.every(t => t.placed)) {
      placingTower = false;
      if (setupMode && active === 1) {
        showSetupPause('Préparation terminée', 'Joueur 1 a placé ses tours.<br>Au Joueur 2.', () => {
          active = 2; phase = 'setup'; setupMode = true; placingTower = true;
          resetDefenseCamera(); resetBall(); updateHUD();
          showToast(gameMode === 'solo' ? 'Préparation IA<br>Le Joueur 2 place ses 4 tours' : 'Préparation<br>Joueur 2 : place tes 4 tours');
          maybeStartAISetup();
        });
      } else if (setupMode && active === 2) {
        showSetupPause('Début de partie', 'Les défenses sont prêtes.<br>Joueur 1 commence.', () => {
          active = 1; setupMode = false; resetDefenseCamera(); startTurnChoice();
        });
      }
    }
  }

    function damageTower(defender, slot, amount) {
    const t = players[defender-1].towers[slot]; if (!t.placed) return;
    amount = applyTurnEventToDamage(amount);
    const oldHp = t.hp;
    const oldRatio = t.max ? oldHp / t.max : 1;
    t.hp -= amount;
    const newRatio = t.max ? Math.max(0, t.hp) / t.max : 0;
    const realDamage = Math.min(amount, Math.max(0, oldHp));
    statForPlayer(active).damage += realDamage;
    const towerFxPos = t.pos ? t.pos.clone().add(new THREE.Vector3(0, 3.9, 0)) : ball.position.clone();
    impact(towerFxPos, 0xffaa33, 1.55);
    playSfx('damage', 1);
    floatText('-' + realDamage + ' PV', towerFxPos.clone().add(new THREE.Vector3(0, 1.1, 0)), 'damage');

    const roofJustDamaged = oldRatio > 0.65 && newRatio <= 0.65 && t.hp > 0;
    if (roofJustDamaged) {
      impact(towerFxPos.clone().add(new THREE.Vector3(0, 2.0, 0)), 0xff7a33, 2.0);
      turnSummary.push('Toit de la tour ' + (slot + 1) + ' endommagé');
      battleNotice('TOIT ENDOMMAGÉ', 'Tour ' + (slot + 1) + ' fragilisée', 'damage', 2200);
    }

    if (t.hp <= 0) {
      t.hp = 0; t.placed = false;
      if (t.mesh) { scene.remove(t.mesh); t.mesh = null; }
      spawnDebrisInAttackLane(active, t.pos || ball.position, 'Tour ' + (slot + 1), { sourceType: 'tower', sourcePlayer: defender, sourceIndex: slot });
      currentShot.towerDestroyed = true;
      statForPlayer(active).towersDestroyed++;
      const attacker = enemy(defender);
      players[attacker-1].ramps[slot].unlocked = true; updateTowerGhosts();
      impact(towerFxPos, 0xff5522, 2.85);
      playSfx('destroy', 1.5);
      turnSummary.push('Tour ' + (slot+1) + ' détruite (-' + realDamage + ' PV)');
      focusEventCameraOn(towerFxPos, 1550, 12, 17);
      showShotTitle('PERCÉE !', 'Tour détruite · rampe ' + (slot+1) + ' débloquée', 'destroy', towerFxPos, 2800);
      celebrateMicroMoment('PERCÉE !', 'Rampe ' + (slot + 1) + ' débloquée', 'destroy', towerFxPos, ['💥','🧱','🪵','⚔️'], 26);
      playJuiceChord('damage', 1.25);
      floatText('RAMPE DÉBLOQUÉE', ball.position.clone().add(new THREE.Vector3(0, 2.2, 0)), 'destroy');
    } else {
      towerMesh(defender, t);
      if (realDamage > 0) {
        turnSummary.push('Tour ' + (slot+1) + ' -' + realDamage + ' PV');
        if (realDamage >= 10) celebrateMicroMoment('GROS IMPACT', 'Tour ' + (slot+1) + ' · -' + realDamage + ' PV', 'damage', towerFxPos, ['💥','🧱','⚡'], 16);
        showToast('Tour ' + (slot+1) + '<br>-' + realDamage + ' PV');
      }
    }
    updateHUD();
  }

    function damageCastle(defender, amount, target) {
    if (!target || target.hp <= 0) return false;


    let comboBonus = 0;
    if (currentShot.towerDestroyed && !currentShot.comboSiegeUsed) {
      comboBonus = 2;
      currentShot.comboSiegeUsed = true;
      statForPlayer(active).combos++;
      focusEventCameraOn(ball.position.clone().add(new THREE.Vector3(0, 1.6, 0)), 1500, 12, 16);
      showShotTitle('COMBO DE SIÈGE !', 'Tour détruite + château touché · +2 dégâts', 'combo', ball.position, 2600);
      celebrateMicroMoment('COMBO DE SIÈGE !', 'Tour détruite + château touché', 'combo', ball.position.clone().add(new THREE.Vector3(0, 1.4, 0)), ['🔥','👑','💥','⚔️'], 34);
      playJuiceChord('victory', 1.35);
      floatText('COMBO +2', ball.position.clone().add(new THREE.Vector3(0, 2.6, 0)), 'combo');
      turnSummary.push('Combo de siège : +2 dégâts');
    }
    amount += comboBonus;
    amount = applyTurnEventToDamage(amount);

    const oldHp = target.hp;
    const oldRatio = target.max ? oldHp / target.max : 1;
    const idx = players[defender-1].castle.indexOf(target);
    target.hp = Math.max(0, target.hp - amount);
    const newRatio = target.max ? target.hp / target.max : 0;
    const realDamage = Math.min(amount, oldHp);
    statForPlayer(active).damage += realDamage;
    const castleFxPos = target.hit
      ? new THREE.Vector3(castleX(defender) + target.hit.x, 4.4, castleZ(defender) + target.hit.z)
      : ball.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const hitPos = castleFxPos.clone().add(new THREE.Vector3(0, 1.1, 0));
    const destroyed = target.hp <= 0;
    const wasFragile = oldHp / target.max > 0.5 && target.hp > 0 && target.hp / target.max <= 0.5;

    impact(castleFxPos, destroyed ? 0xff5522 : 0xff3333, destroyed ? 2.95 : 1.95);
    playSfx(destroyed ? 'destroy' : 'damage', destroyed ? 1.6 : 1.1);
    floatText('-' + realDamage + ' PV', hitPos, destroyed ? 'destroy' : 'damage');

    const roofTarget = idx >= 4;
    const roofJustDamaged = roofTarget && oldRatio > 0.65 && newRatio <= 0.65 && target.hp > 0;
    if (roofJustDamaged) {
      impact(castleFxPos.clone().add(new THREE.Vector3(0, 2.2, 0)), 0xff7a33, 2.15);
      turnSummary.push('Toit endommagé : ' + target.name);
      battleNotice('TOIT ENDOMMAGÉ', target.icon + ' ' + target.name, 'damage', 2200);
    }

    if (destroyed) {
      statForPlayer(active).partsDestroyed++;
      spawnDebrisInAttackLane(active, castleFxPos, target.name, { sourceType: 'castle', sourcePlayer: defender, sourceIndex: idx });
      updateCastlePartVisual(defender, idx);
      turnSummary.push(target.name + ' détruit (-' + realDamage + ' PV)');
      focusEventCameraOn(castleFxPos, 1650, 12, 18);
      showShotTitle('DÉMOLITION !', target.icon + ' ' + target.name, 'destroy', castleFxPos, 3000);
      celebrateMicroMoment('DÉMOLITION !', target.icon + ' ' + target.name, 'destroy', castleFxPos, ['💥','🧱','🏰','🔥'], 32);
      playJuiceChord('damage', 1.35);
    } else {
      updateCastlePartVisual(defender, idx);
      turnSummary.push(target.name + ' -' + realDamage + ' PV');
      if (wasFragile) battleNotice('STRUCTURE FRAGILISÉE', target.icon + ' ' + target.name + ' · ' + target.hp + '/' + target.max + ' PV', 'damage', 2200);
      if (realDamage >= 10) {
        showShotTitle('COUP BRUTAL', target.icon + ' ' + target.name + '<br>-' + realDamage + ' PV', 'damage', castleFxPos, 2100);
        celebrateMicroMoment('COUP BRUTAL', '-' + realDamage + ' PV', 'damage', castleFxPos, ['💥','⚔️','🧱'], 18);
      }
      else battleNotice('⚔️ Touché', target.icon + ' ' + target.name + ' · -' + realDamage + ' PV', 'damage', 2200);
    }

    updateHUD();
    if (players[defender-1].castle.every(p => p.hp <= 0)) {
      gameOver = true;
      showVictory(enemy(defender));
    }
    return true;
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();

  function worldFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, hitPt);
    return { screen: { x: e.clientX, y: e.clientY }, world: hitPt.clone() };
  }

  canvas.addEventListener('wheel', e => {
    if (phase === 'defense' || phase === 'setup' || placingTower) {
      e.preventDefault();
      zoomDefenseCamera(e.deltaY * 0.09);
    }
  }, { passive: false });

  canvas.addEventListener('pointerdown', e => {
    if (gamePaused || !gameStarted || isAITurn()) return;
    if (isCameraControlPhase()) {
      rampCameraFocus = null;
      activeCameraPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeCameraPointers.size >= 2) {
        pointerMode = 'camera';
        downData = { screen: { x: e.clientX, y: e.clientY }, world: new THREE.Vector3(), moved: true };
        pinchState = null;
        return;
      }
    }
    if (gameOver || turnLocked) return;
    const p = worldFromEvent(e);
    if (handlePendingWorldActionClick(p)) {
      e.preventDefault();
      downData = null;
      pointerMode = 'none';
      return;
    }
    downData = { screen: p.screen, world: p.world, moved: false };
    pointerMode = 'none';
    if (phase === 'attack' && canShoot) {
      const laneX = attackX(active), z = startZ(active);
      const nearBall = Math.hypot(p.world.x - ball.position.x, p.world.z - ball.position.z) < 4.6;
      const onLaunchLine = Math.abs(p.world.z - z) < 8.5;

      // Sécurité de lancement : toucher la ligne ne déclenche jamais un tir immédiatement.
      // Le geste décide ensuite : horizontal = positionnement, vertical franc = visée / tir.
      if (onLaunchLine || nearBall) {
        if (onLaunchLine && !nearBall) {
          ball.position.x = THREE.MathUtils.clamp(p.world.x, laneX - CFG.laneW/2 + 2, laneX + CFG.laneW/2 - 2);
          ball.position.z = z;
          ball.position.y = CFG.ballR + .18;
          selectMarker.position.x = ball.position.x;
        }
        pointerMode = 'launchPending';
        dragStart = p.screen;
        dragNow = p.screen;
        return;
      }
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (activeCameraPointers.has(e.pointerId)) activeCameraPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (isCameraControlPhase() && activeCameraPointers.size >= 2) {
      const pts = [...activeCameraPointers.values()].slice(0, 2);
      const a = pts[0], b = pts[1];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchState) {
        // Deux doigts = zoom uniquement. Pas de déplacement parasite.
        zoomDefenseCamera(-(dist - pinchState.dist) * 0.36);
      }
      pinchState = { dist };
      if (downData) downData.moved = true;
      pointerMode = 'camera';
      return;
    }
    if (!downData) return;
    const p = worldFromEvent(e);
    const dx = p.screen.x - downData.screen.x, dy = p.screen.y - downData.screen.y;
    if (pointerMode === 'launchPending') {
      const dist = Math.hypot(dx, dy);
      const absX = Math.abs(dx), absY = Math.abs(dy);
      dragNow = p.screen;
      if (dist > AIM_ARM_DISTANCE) {
        // Geste vertical franc : on arme le tir.
        // Le seuil horizontal reste souple pour ne pas bloquer les tirs naturels.
        if (absY > AIM_VERTICAL_MIN && absY > absX * 0.72) {
          pointerMode = 'aim';
          dragging = true;
          setAimVisualsVisible(true);
        } else if (absX > 8 || absX > absY * 1.15) {
          pointerMode = 'placeBall';
        }
      }
    }
    if (pointerMode === 'placeBall') {
      const absX = Math.abs(dx), absY = Math.abs(dy);
      // Si le joueur commence par placer la bille puis tire franchement,
      // on bascule en visée au lieu de rester bloqué en déplacement.
      if (absY > 30 && absY > absX * 0.78) {
        pointerMode = 'aim';
        dragging = true;
        dragNow = p.screen;
        setAimVisualsVisible(true);
        return;
      }
      const laneX = attackX(active), z = startZ(active);
      ball.position.x = THREE.MathUtils.clamp(p.world.x, laneX - CFG.laneW/2 + 2, laneX + CFG.laneW/2 - 2);
      ball.position.z = z; ball.position.y = CFG.ballR + .18;
      selectMarker.position.x = ball.position.x; downData.moved = true; return;
    }
    if ((phase === 'defense' || phase === 'setup' || placingTower) && pointerMode !== 'aim') {
      if (Math.hypot(dx, dy) > 6) {
        downData.moved = true; pointerMode = 'camera';
        moveDefenseCamera(dx, dy);
        downData.screen = p.screen;
      }
      return;
    }
    if (pointerMode === 'aim' && dragging) {
      dragNow = p.screen;
      const ax = dragNow.x - dragStart.x, ay = dragNow.y - dragStart.y;
      UI.power.style.height = Math.min(100, Math.hypot(ax, ay) / 260 * 100) + '%';
    }
  });

  canvas.addEventListener('pointerup', e => {
    activeCameraPointers.delete(e.pointerId);
    if (activeCameraPointers.size < 2) pinchState = null;
    if (!downData) { pointerMode = 'none'; return; }
    if (pointerMode === 'launchPending' || pointerMode === 'placeBall') { downData = null; pointerMode = 'none'; return; }
    if ((phase === 'defense' || phase === 'setup') && placingTower && !downData.moved && pointerMode !== 'camera') {
      previewTowerAt(downData.world.x, downData.world.z); downData = null; pointerMode = 'none'; return;
    }
    if (pointerMode === 'aim' && dragging) {
      const dx = dragNow.x - dragStart.x, dy = dragNow.y - dragStart.y;
      dragging = false; setAimVisualsVisible(false); resetPowerGauge();
      const power = Math.hypot(dx, dy);
      const armed = power >= AIM_MIN_POWER && Math.abs(dy) >= AIM_VERTICAL_MIN;
      if (armed) {
        // Contrôle type lance-pierre cohérent pour les deux joueurs :
        // tirer le doigt vers la droite envoie/visualise la bille vers la gauche, et inversement.
        const aimX = (active === 1 ? -dx : dx) * .014;
        velocity.x = aimX; velocity.z = dir(active) * Math.abs(dy) * .024;
        playSfx('launch', Math.min(2.2, Math.max(0.8, power / 115)));
        canShoot = false; shotStarted = true; secondShotReady = false; pauseTurnTimer(); updateHUD();
      } else {
        showToast('Tir annulé<br>Glisse franchement vers l’arrière pour lancer');
      }
    }
    downData = null; pointerMode = 'none';
  });

  canvas.addEventListener('pointercancel', e => {
    activeCameraPointers.delete(e.pointerId);
    if (activeCameraPointers.size < 2) pinchState = null;
    dragging = false;
    downData = null;
    pointerMode = 'none';
    setAimVisualsVisible(false);
    resetPowerGauge();
  });

  camRotateLeft.onclick = () => { rotateDefenseCamera(-0.24); updateCameraControlsVisibility(); };
  camRotateRight.onclick = () => { rotateDefenseCamera(0.24); updateCameraControlsVisibility(); };
  camZoomOut.onclick = () => { zoomDefenseCamera(26); updateCameraControlsVisibility(); };
  camZoomIn.onclick = () => { zoomDefenseCamera(-26); updateCameraControlsVisibility(); };
  camReset.onclick = () => { resetDefenseCamera(); updateCameraControlsVisibility(); };

  function canUseMarket() {
    return gameStarted && !gamePaused && !isAITurn() && !gameOver && !turnLocked && !setupMode && !shotStarted;
  }

  function isMarketSaleActive() {
    return !!(activeTurnEvent && activeTurnEvent.marketSale);
  }

  function getCurrentMarketTrades() {
    return isMarketSaleActive() ? MARKET_TRADES_SALE : MARKET_TRADES_NORMAL;
  }

  function refreshMarket() {
    const res = players[active-1].res;
    const sale = isMarketSaleActive();
    const marketLimitReached = marketTradeUsedThisTurn;
    marketStock.innerHTML = `Joueur ${active} — ${res.stone} 🪨 pierre(s) · ${res.wood} 🪵 bois · ${res.gold || 0} 🪙 or · ${res.relic || 0} 🏺 relique(s)<br>` +
      (sale
        ? '<b class="market-sale-label">🏷️ Solde active : taux améliorés. 1 seul échange marché ce tour.</b>'
        : '<span class="market-normal-label">Taux normal. 1 seul échange marché ce tour.</span>');
    marketActions.innerHTML = '';

    getCurrentMarketTrades().forEach(trade => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'market-trade' + (sale ? ' sale' : '');
      const canTrade = canUseMarket() && !marketLimitReached && (res[trade.from] || 0) >= trade.cost;
      btn.disabled = !canTrade;
      btn.innerHTML = `<strong>${trade.cost} ${trade.fromIcon}</strong><span>→</span><strong>${trade.gain} ${trade.toIcon}</strong><small>${trade.cost} ${trade.fromLabel} contre ${trade.gain} ${trade.toLabel}</small>`;
      btn.onclick = () => doMarketTrade(trade);
      marketActions.appendChild(btn);
    });

    const secondBallCost = getSecondBallCost();
    const secondAlreadyActive = players[active-1].secondBallTurns > 0;
    const secondBallBtn = document.createElement('button');
    secondBallBtn.type = 'button';
    secondBallBtn.className = 'market-trade market-second-ball' + (sale ? ' sale' : '');
    const canBuySecondBall = canUseMarket() && !marketLimitReached && phase === 'attack' && !secondAlreadyActive && canPay(res, secondBallCost);
    secondBallBtn.disabled = !canBuySecondBall;
    let secondHint = 'Achat spécial : seconde bille pour cet assaut';
    if (phase !== 'attack') secondHint = 'Disponible uniquement en attaque avant le lancer';
    else if (secondAlreadyActive) secondHint = 'Seconde bille déjà active';
    else if (!canPay(res, secondBallCost)) secondHint = 'Ressources insuffisantes';
    secondBallBtn.innerHTML = `<strong>${costTxt(secondBallCost)}</strong><span>→</span><strong>⚪</strong><small>${secondHint}</small>`;
    secondBallBtn.onclick = buySecondBallFromMarket;
    marketActions.appendChild(secondBallBtn);

    if (marketLimitReached) {
      const msg = document.createElement('div');
      msg.className = 'market-limit-msg';
      msg.textContent = 'Échange marché déjà utilisé pour ce tour.';
      marketActions.appendChild(msg);
    }
  }

  function openMarket(event = null) {
    if (marketTradeUsedThisTurn) {
      showToast('Marché<br>Échange déjà utilisé ce tour');
      return;
    }
    if (!canUseMarket()) {
      showToast(setupMode ? 'Marché indisponible<br>Termine d’abord la préparation' : 'Marché indisponible<br>Impossible pendant un lancer');
      return;
    }
    placingTower = false;
    canShoot = phase === 'attack' && !shotStarted;
    refreshMarket();
    marketOverlay.classList.add('open');
    syncMusicForScreen(event, 'market');
  }

  function closeMarket() {
    marketOverlay.classList.remove('open');
    syncMusicForScreen(null);
  }

  function doMarketTrade(trade) {
    if (!canUseMarket()) return;
    const res = players[active-1].res;
    if (marketTradeUsedThisTurn) {
      showToast('Marché<br>Un seul échange autorisé ce tour');
      refreshMarket();
      return;
    }
    if ((res[trade.from] || 0) < trade.cost) {
      showToast('Échange impossible<br>Ressources insuffisantes');
      refreshMarket();
      return;
    }
    res[trade.from] -= trade.cost;
    res[trade.to] = (res[trade.to] || 0) + trade.gain;
    marketTradeUsedThisTurn = true;
    playRandomSfx('marketButton', 'marketExchange', isMarketSaleActive() ? 1.35 : 1.15);
    turnSummary.push('Marché' + (isMarketSaleActive() ? ' soldé' : '') + ' : -' + trade.cost + ' ' + trade.fromLabel + ' / +' + trade.gain + ' ' + trade.toLabel);
    showToast('Marché<br>' + trade.cost + ' ' + trade.fromIcon + ' → ' + trade.gain + ' ' + trade.toIcon);
    celebrateMicroMoment('MARCHÉ CONCLU', trade.cost + ' ' + trade.fromIcon + ' → ' + trade.gain + ' ' + trade.toIcon, 'market', { x: window.innerWidth * 0.5, y: window.innerHeight * 0.42 }, ['🪙','⚖️','✨'], 12);
    playJuiceChord('market', 0.9);
    updateHUD();
    refreshMarket();
  }

  marketClose.onclick = closeMarket;
  marketOverlay.addEventListener('pointerdown', (ev) => {
    if (ev.target === marketOverlay) closeMarket();
  });

  repairClose.onclick = closeRepairChoice;
  kitClose.onclick = closeKitChoice;
  repairOverlay.addEventListener('pointerdown', (ev) => {
    if (ev.target === repairOverlay) closeRepairChoice();
  });
  kitOverlay.addEventListener('pointerdown', (ev) => {
    if (ev.target === kitOverlay) closeKitChoice();
  });

  /* ── Boutons ── */
  UI.btnAttack.onclick  = () => { if (!gamePaused && !isAITurn()) enterAttack(); };
  UI.btnDefense.onclick = () => { if (!gamePaused && !isAITurn()) enterDefense(); };
  if (UI.btnMarket) UI.btnMarket.onclick = (event) => { if (!gamePaused && !isAITurn()) openMarket(event); };
  if (UI.btnEnd) UI.btnEnd.onclick = () => { if (!turnLocked && !setupMode) finishTurn('Tour terminé.'); };
  UI.btnPlaceTower.onclick = () => { if (gamePaused || isAITurn() || turnLocked || (!setupMode && phase !== 'defense')) return; clearPendingWorldAction(); phase = setupMode ? 'setup' : 'defense'; canShoot = false; placingTower = true; updateHUD(); showToast(setupMode ? 'Place tes tours initiales' : 'Vue tours : déplace, zoome, puis valide la tour fantôme'); };
  if (UI.btnCastleBuild) UI.btnCastleBuild.onclick = () => { if (gamePaused || isAITurn() || turnLocked || setupMode || phase !== 'defense') return; placingTower = false; canShoot = false; updateHUD(); openCastle(active); };
  if (UI.btnRandomRepair) UI.btnRandomRepair.onclick = () => { if (!gamePaused && !isAITurn()) openRepairChoice(); };
  if (UI.btnRepairKit) UI.btnRepairKit.onclick = () => { if (!gamePaused && !isAITurn()) openKitChoice(); };
  if (UI.btnBuildKit) UI.btnBuildKit.onclick = () => { if (!gamePaused && !isAITurn()) openKitChoice(); };
  if (UI.btnClearDebris) UI.btnClearDebris.onclick = () => { if (!gamePaused && !isAITurn()) openDebrisChoice(); };
  if (UI.btnSideRamp) UI.btnSideRamp.onclick = () => { if (!gamePaused && !isAITurn()) openRampChoice('side'); };
  UI.btnRamp.onclick = () => { if (!gamePaused && !isAITurn()) openRampChoice('classic'); };
  if (UI.btnSecondBall) UI.btnSecondBall.onclick = null;
  UI.pill1.onclick = () => openCastle(1); UI.pill2.onclick = () => openCastle(2);
  UI.close.onclick = () => UI.modal.classList.remove('open');
  if (UI.btnPause) UI.btnPause.onclick = (ev) => openMainMenu(true, ev);
  mainResume.onclick = (ev) => closeMainMenuAndResume(ev);
  mainSolo.onclick = () => launchNewMode('solo');
  mainDuo.onclick = () => launchNewMode('duo');
  if (mainSettings) mainSettings.onclick = () => showGameSettings();
  if (mainBackDifficulty) mainBackDifficulty.onclick = () => showMainMenuHome();
  if (mainBackSettings) mainBackSettings.onclick = () => showMainMenuHome();
  difficultyButtons.forEach(btn => {
    btn.onclick = (ev) => {
      const id = btn.dataset.difficulty;
      if (!DIFFICULTIES[id]) return;
      launchModeWithDifficulty(pendingDifficultyMode || 'duo', id, ev);
    };
  });
  mainTutorial.onclick = () => openTutorial();
  if (mainProfiles) mainProfiles.onclick = () => openProfiles();
  if (mainProgression) mainProgression.onclick = () => openProgression();
  if (mainCustomize) mainCustomize.onclick = () => openCustomization();

  function costTxt(cost) {
    return Object.entries(cost || {}).map(([k, v]) => v + ' ' + ({ stone: '🪨', wood: '🪵', gold: '🪙', relic: '🏺' }[k] || k)).join(' ');
  }

  function openCastle(p) {
    UI.modalTitle.textContent = `Joueur ${p} — Château & Tours`;
    UI.details.innerHTML = '';

    const sub1 = document.createElement('h3');
    sub1.textContent = 'Château — 9 parties';
    sub1.className = 'modal-subtitle';
    UI.details.appendChild(sub1);

    players[p-1].castle.forEach((c, i) => {
      const pct = Math.max(0, Math.round(c.hp / c.max * 100));
      const canRebuild = p === active && !setupMode && phase === 'defense' && !turnLocked && !gameOver && c.hp < c.max;
      const btnText = c.hp <= 0 ? 'Rebâtir' : (c.hp < c.max ? 'Réparer' : 'OK');

      const row = document.createElement('div');
      row.className = 'part-row ' + (c.hp <= 0 ? 'dead' : '');
      const actionCost = c.hp <= 0 ? c.rebuildCost : c.cost;
      const actionLabel = c.hp <= 0 ? 'Reconstruction' : 'Réparation';
      row.innerHTML = `<span>${c.icon} ${c.name}<small>${actionLabel} ${costTxt(actionCost)}</small></span><span class="bar"><i style="width:${pct}%"></i></span><span>${c.hp}/${c.max}</span><button class="mini-action" ${canRebuild ? '' : 'disabled'}>${btnText}</button>`;

      if (canRebuild) {
        row.querySelector('button').onclick = () => rebuildCastlePart(p, i);
      }

      UI.details.appendChild(row);
    });

    const sub2 = document.createElement('h3');
    sub2.textContent = 'Tours de défense';
    sub2.className = 'modal-subtitle';
    UI.details.appendChild(sub2);

    players[p-1].towers.forEach((t, i) => {
      const pct = Math.max(0, Math.round(t.hp / t.max * 100));
      const row = document.createElement('div');
      row.className = 'part-row ' + (!t.placed ? 'dead' : '');
      row.innerHTML = `<span>🗼 Tour ${i+1}<small>Reconstruction ${costTxt(towerRebuildCost[i])}</small></span><span class="bar"><i style="width:${pct}%"></i></span><span>${t.placed ? t.hp : 0}/${t.max}</span><span></span>`;
      UI.details.appendChild(row);
    });

    const sub3 = document.createElement('h3');
    sub3.textContent = 'Rampes amovibles';
    sub3.className = 'modal-subtitle';
    UI.details.appendChild(sub3);

    (players[p-1].sideRamps || []).forEach((sideRamp, i) => {
      const pct = Math.max(0, Math.round(sideRamp.hp / sideRamp.max * 100));
      const state = sideRamp.built ? 'Construite' : 'Libre';
      const row = document.createElement('div');
      row.className = 'part-row ' + (!sideRamp.built ? 'dead' : '');
      row.innerHTML = `<span>🪵 Rampe latérale ${i+1}<small>Coût ${costTxt(SIDE_RIDGE.cost)} · ${state} · côté ${sideRidgeLabel(sideRamp.sideIndex)} · sans tour détruite</small></span><span class="bar"><i style="width:${pct}%"></i></span><span>${sideRamp.built ? sideRamp.hp : 0}/${sideRamp.max}</span><span></span>`;
      UI.details.appendChild(row);
    });

    players[p-1].ramps.forEach((r, i) => {
      const pct = Math.max(0, Math.round(r.hp / r.max * 100));
      const state = r.built ? 'Construite' : (r.unlocked ? 'Débloquée' : 'Verrouillée');
      const row = document.createElement('div');
      row.className = 'part-row ' + (!r.built ? 'dead' : '');
      row.innerHTML = `<span>🪵 Rampe ${i+1}<small>Coût ${costTxt(rampCost[i])} · ${state}</small></span><span class="bar"><i style="width:${pct}%"></i></span><span>${r.built ? r.hp : 0}/${r.max}</span><span></span>`;
      UI.details.appendChild(row);
    });

    UI.modal.classList.add('open');
  }

  function updateHUD() {
    const r = players[active-1].res;
    UI.stone.textContent = r.stone; UI.wood.textContent = r.wood; UI.gold.textContent = r.gold || 0; if (UI.relic) UI.relic.textContent = r.relic || 0;
    const aiTurn = isAITurn();
    UI.p1Card.classList.toggle('dim', active !== 1);
    UI.p2Card.classList.toggle('dim', active !== 2);
    const p1NameEl = UI.p1Card ? UI.p1Card.querySelector('b') : null;
    const p2NameEl = UI.p2Card ? UI.p2Card.querySelector('b') : null;
    if (p1NameEl) p1NameEl.textContent = getProfileAvatar(1) + ' ' + getProfileName(1);
    if (p2NameEl) p2NameEl.textContent = gameMode === 'solo' ? '🤖 IA' : (getProfileAvatar(2) + ' ' + getProfileName(2));
    UI.p1State.textContent = active === 1 ? 'Actif' : 'En attente';
    UI.p2State.textContent = gameMode === 'solo' ? (active === 2 ? 'IA active' : 'IA') : (active === 2 ? 'Actif' : 'En attente');
    if (UI.roundTitle) {
      if (!gameStarted) UI.roundTitle.textContent = 'Menu principal';
      else if (gameOver) UI.roundTitle.textContent = 'Fin de partie';
      else if (setupMode) UI.roundTitle.textContent = 'Préparation';
      else UI.roundTitle.textContent = `Tour ${Math.max(1, matchTurns)}`;
    }
    if (UI.phase) {
      UI.phase.className = (phase === 'setup' || placingTower) ? 'placement' : (phase === 'attack' ? 'attack' : 'defense');
      const placedNow = players[active-1].towers.filter(t => t.placed).length;
      if (setupMode) UI.phase.textContent = `JOUEUR ${active} — PLACE TES 4 TOURS ${placedNow}/4`;
      else if (placingTower) UI.phase.textContent = `TOUR / CONSTRUCTION ${placedNow}/4`;
      else UI.phase.textContent = phase === 'attack' ? 'ATTAQUE' : (phase === 'choice' ? 'CHOISIS TA VUE' : 'DÉFENSE');
    }
    const showDefenseActions = setupMode || phase === 'defense';
    const showAttackActions = phase === 'attack';
    const showCastleActions = !setupMode && phase === 'defense';
    if (UI.btnMarket) UI.btnMarket.classList.toggle('action-hidden', setupMode);
    if (UI.btnPlaceTower) UI.btnPlaceTower.classList.toggle('action-hidden', !showDefenseActions);
    if (UI.btnCastleBuild) UI.btnCastleBuild.classList.toggle('action-hidden', !showCastleActions);
    if (UI.btnRandomRepair) UI.btnRandomRepair.classList.toggle('action-hidden', !showCastleActions);
    if (UI.btnRepairKit) UI.btnRepairKit.classList.toggle('action-hidden', !showCastleActions);
    if (UI.btnBuildKit) UI.btnBuildKit.classList.add('action-hidden');
    if (UI.btnClearDebris) UI.btnClearDebris.classList.toggle('action-hidden', !showAttackActions);
    if (UI.btnSideRamp) UI.btnSideRamp.classList.toggle('action-hidden', !showAttackActions);
    if (UI.btnRamp) UI.btnRamp.classList.toggle('action-hidden', !showAttackActions);
    if (UI.btnSecondBall) UI.btnSecondBall.classList.add('action-hidden');

    UI.btnAttack.classList.toggle('active', phase === 'attack' && !placingTower);
    UI.btnDefense.classList.toggle('active', phase === 'defense' || placingTower || phase === 'setup');
    UI.btnAttack.classList.toggle('choice-ready', phase === 'choice');
    UI.btnDefense.classList.toggle('choice-ready', phase === 'choice');
    UI.btnAttack.disabled  = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || setupMode || (phase === 'attack' && shotStarted);
    UI.btnDefense.disabled = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || setupMode || (phase === 'attack' && shotStarted);
    if (UI.btnMarket) UI.btnMarket.disabled = !canUseMarket() || aiTurn || gamePaused || marketTradeUsedThisTurn;
    if (UI.btnEnd) UI.btnEnd.disabled = true;
    UI.btnPlaceTower.disabled = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || (!setupMode && phase !== 'defense');
    if (UI.btnCastleBuild) UI.btnCastleBuild.disabled = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || setupMode || phase !== 'defense';
    if (UI.btnRandomRepair) UI.btnRandomRepair.disabled = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || setupMode || phase !== 'defense' || randomRepairUsedThisTurn || !randomRepairCandidates(active).length || !affordableRepairCosts(active).length;
    if (UI.btnRepairKit) UI.btnRepairKit.disabled = !canOpenKitChoice(active);
    if (UI.btnBuildKit) UI.btnBuildKit.disabled = true;
    if (UI.btnClearDebris) UI.btnClearDebris.disabled = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || setupMode || phase !== 'attack' || shotStarted || activeDebrisCount() <= 0 || !canPay(players[active-1].res, DEBRIS_CLEAR_COST);
    if (UI.btnSideRamp) UI.btnSideRamp.disabled = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || setupMode || phase !== 'attack' || shotStarted || !(players[active-1].sideRamps || []).some(r => !r.built) || !canPay(players[active-1].res, SIDE_RIDGE.cost);
    UI.btnRamp.disabled       = !gameStarted || gamePaused || aiTurn || gameOver || turnLocked || setupMode || phase !== 'attack' || shotStarted || !players[active-1].ramps.some(r => r.unlocked && !r.built);
    if (UI.btnSecondBall) UI.btnSecondBall.disabled = true;

    setButtonHint(UI.btnAttack, 'Attaque impossible : termine la préparation, attends la fin du lancer ou laisse l’IA jouer.', 'Passer en phase attaque');
    setButtonHint(UI.btnDefense, 'Défense impossible : tu es déjà en lancer, en pause ou dans une phase verrouillée.', 'Passer en phase défense');
    setButtonHint(UI.btnMarket, marketTradeUsedThisTurn ? 'Marché déjà utilisé ce tour.' : 'Marché indisponible pendant un lancer, une pause ou la préparation.', 'Ouvrir le marché');
    setButtonHint(UI.btnPlaceTower, setupMode ? 'Place tes tours initiales sur les zones bleues.' : 'Tours disponibles uniquement en phase défense.', 'Placer / reconstruire une tour');
    setButtonHint(UI.btnCastleBuild, 'Construction du château disponible uniquement en défense.', 'Réparer ou reconstruire le château');
    setButtonHint(UI.btnRandomRepair, randomRepairUsedThisTurn ? 'Réparation déjà utilisée ce tour.' : 'Aucune pièce réparable ou ressources insuffisantes.', 'Réparer une pièce de château');
    setButtonHint(UI.btnRepairKit, 'Aucun kit utilisable pour le moment.', 'Utiliser un kit');
    setButtonHint(UI.btnClearDebris, activeDebrisCount() <= 0 ? 'Aucun décombre gênant dans ton couloir.' : 'Déblayage possible seulement en attaque avant le lancer, avec 1 or.', 'Déblayer un décombre');
    setButtonHint(UI.btnSideRamp, 'Rampe latérale possible seulement en attaque avant le lancer avec les ressources nécessaires.', 'Construire une rampe latérale');
    setButtonHint(UI.btnRamp, 'Détruis une tour adverse pour débloquer une rampe château, puis construis-la en attaque.', 'Construire une rampe château');

    const pt = players[active-1].towers.filter(t => t.placed).length;
    const freeTowerText = (!setupMode && (players[active - 1].freeTowerBuilds || 0) > 0) ? ` · gratuit x${players[active - 1].freeTowerBuilds}` : '';
    UI.btnPlaceTower.textContent = setupMode ? `🗼 Tours initiales ${pt}/4` : `🗼 Zones tours ${pt}/4${freeTowerText}`;
    if (UI.btnCastleBuild) UI.btnCastleBuild.textContent = '🏰 Château / construction';
    if (UI.btnRandomRepair) UI.btnRandomRepair.textContent = randomRepairUsedThisTurn ? '🔧 Réparation utilisée' : '🔧 Réparation +40 PV · coût';
    const activeKitsStock = playerKits(active);
    if (UI.btnRepairKit) UI.btnRepairKit.textContent = kitUsedThisTurn ? '🧰 Kit utilisé' : `🧰 Kits R${activeKitsStock.repair || 0} / C${activeKitsStock.build || 0}`;
    if (UI.btnBuildKit) UI.btnBuildKit.textContent = '🏗️ Kit construction';
    if (UI.btnClearDebris) {
      const debrisCount = activeDebrisCount();
      UI.btnClearDebris.textContent = debrisCount > 0
        ? `🧹 Déblayer ${debrisCount} · 1 🪙 / décombre`
        : '🧹 Couloir propre';
    }
    const sideRamps = players[active-1].sideRamps || [];
    const sideBuilt = sideRamps.filter(r => r.built).length;
    const nextSideRamp = sideRamps.findIndex(r => !r.built);
    if (UI.btnSideRamp) UI.btnSideRamp.textContent = nextSideRamp >= 0
      ? `🪵 Rampes latérales ${sideBuilt}/2 · ${costTxt(SIDE_RIDGE.cost)}`
      : `🪵 Rampes latérales ${sideBuilt}/2`;
    const rb = players[active-1].ramps.filter(r => r.built).length;
    const nextRamp = players[active-1].ramps.findIndex(r => r.unlocked && !r.built);
    UI.btnRamp.textContent = nextRamp >= 0
      ? `🪵 Rampes château ${rb}/4 · ${costTxt(rampCost[nextRamp])}`
      : `🪵 Rampes château ${rb}/4`;
    const sb = players[active-1].secondBallTurns;
    if (UI.btnSecondBall) UI.btnSecondBall.textContent = sb > 0 ? `⚪ Seconde bille ${sb}T` : `⚪ Seconde bille · ${costTxt(getSecondBallCost())}`;

    // Au début du tour, les deux gros boutons servent de choix de vue.
    // Les phases internes restent inchangées pour ne pas casser le moteur.
    UI.btnAttack.textContent = phase === 'choice' ? '🎯 Choisir attaque' : '🎯 Attaque';
    UI.btnDefense.textContent = phase === 'choice' ? '🛡 Choisir défense' : '🛡 Défense';
    if (UI.btnMarket) UI.btnMarket.textContent = marketTradeUsedThisTurn ? '⚖️ Marché utilisé' : '⚖️ Marché';

    if (UI.btnSecondBall) UI.btnSecondBall.classList.toggle('second-ready', phase === 'attack' && secondShotReady);
    [1, 2].forEach(p => {
      const pl = players[p-1];
      const hp = pl.castle.reduce((a, c) => a + c.hp, 0), mx = pl.castle.reduce((a, c) => a + c.max, 0);
      const tw = pl.towers.filter(t => t.placed).length;
      UI['pill' + p].innerHTML = `<span>🏰 J${p}</span><b>${Math.round(hp/mx*100)}%</b><small>${tw}/4 tours</small>`;
    });
    const setupPlaced = players[active-1].towers.filter(t => t.placed).length;
    const setupLeft = Math.max(0, 4 - setupPlaced);
    const queuedBonus = players[active - 1] && players[active - 1].queuedBonusNextTurn;
    const queuedBonusText = queuedBonus ? ' · Bonus prochain tour : ' + queuedBonus.icon + ' ' + queuedBonus.label : '';
    UI.info.textContent = setupMode
      ? `JOUEUR ${active} : place tes 4 tours. Tape une zone bleue, puis valide. vue haute · glisse = déplacer · +/− = zoom · ↶/↷ = tourner. ${setupPlaced}/4 placées · ${setupLeft} restante${setupLeft > 1 ? 's' : ''}.`
      : phase === 'choice'
        ? 'Choisis une vue avec les boutons. Le chrono tourne.' + queuedBonusText
        : placingTower
          ? 'Tape dans la zone bleue pour prévisualiser une tour, puis valide. glisse = déplacer la vue · +/− = zoom · ↶/↷ = tourner.'
          : phase === 'defense'
            ? 'Défense : tours, château/construction, réparation et kits récupérés sur le plateau.' + queuedBonusText
            : (secondShotReady ? 'Ta seconde bille est prête : positionne-la puis tire.' : 'Attaque : positionne la bille, récupère les kits, vise le trou bonus mobile si l’occasion se présente, évite les décombres et utilise le marché si besoin.' + queuedBonusText);
    updateCameraControlsVisibility();
    updateEventBanner();
    updateTurnTimerDisplay();
    updateZoneMarkerVisibility();
  }


  function circleBoxCollisionInfo(cx, cz, boxX, boxZ, halfW, halfD, extra = 0) {
    const nearestX = THREE.MathUtils.clamp(cx, boxX - halfW, boxX + halfW);
    const nearestZ = THREE.MathUtils.clamp(cz, boxZ - halfD, boxZ + halfD);
    let dx = cx - nearestX;
    let dz = cz - nearestZ;
    let dist = Math.hypot(dx, dz);
    const radius = CFG.ballR + extra;
    if (dist > 0 && dist < radius) return { nx: dx / dist, nz: dz / dist, penetration: radius - dist };

    // Centre à l'intérieur du rectangle : on repousse vers le bord le plus proche.
    if (cx > boxX - halfW && cx < boxX + halfW && cz > boxZ - halfD && cz < boxZ + halfD) {
      const left = cx - (boxX - halfW);
      const right = (boxX + halfW) - cx;
      const down = cz - (boxZ - halfD);
      const up = (boxZ + halfD) - cz;
      const min = Math.min(left, right, down, up);
      if (min === left) return { nx: -1, nz: 0, penetration: radius + left };
      if (min === right) return { nx: 1, nz: 0, penetration: radius + right };
      if (min === down) return { nx: 0, nz: -1, penetration: radius + down };
      return { nx: 0, nz: 1, penetration: radius + up };
    }
    return null;
  }

  function pushBallOutOfSolidBox(boxX, boxZ, halfW, halfD, extra = 0, bounce = 0.72, impactColor = 0x77ccff, impactPower = 0.8) {
    const info = circleBoxCollisionInfo(ball.position.x, ball.position.z, boxX, boxZ, halfW, halfD, extra);
    if (!info) return false;
    ball.position.x += info.nx * info.penetration;
    ball.position.z += info.nz * info.penetration;
    const vn = velocity.x * info.nx + velocity.z * info.nz;
    if (vn < 0) {
      velocity.x -= (1 + bounce) * vn * info.nx;
      velocity.z -= (1 + bounce) * vn * info.nz;
    }
    velocity.multiplyScalar(0.76);
    impact(ball.position, impactColor, impactPower);
    return true;
  }

  function blockSolidButtesAndRampSides() {
    // Butte du château : volume plein.
    // Correction importante : les buttes latérales longent la butte du château.
    // Une fois la rampe latérale franchie, la bille est autorisée à circuler sur ce
    // couloir haut jusqu'au trou de vol. Le bloc solide de la butte château ne doit
    // donc plus repousser la bille pendant ce trajet, sinon elle se retrouve bloquée
    // avant d'arriver au bout de la butte latérale.
    const defender = enemy(active);
    const authorisedSideRidgeRoute = sideRidgeAccessThisShot &&
      isOnSideRidgeForAttacker(active, ball.position.x, ball.position.z, 1.55);

    const authorisedCastleRampRoute = (players[active - 1].ramps || []).some(r => {
      if (!r.built || !r.mesh) return false;
      const rp = r.mesh.position;
      const relX = ball.position.x - rp.x;
      const relZ = (ball.position.z - rp.z) * dir(active);
      return Math.abs(relX) < RAMP.width / 2 + CFG.ballR * 1.60 &&
             relZ > -RAMP.halfLength - CFG.ballR * 1.15 &&
             relZ <  RAMP.halfLength + 4.0;
    });

    if (!castleAccessThisShot && !authorisedSideRidgeRoute && !authorisedCastleRampRoute) {
      const hitCastleButte = pushBallOutOfSolidBox(
        castleX(defender), castleZ(defender),
        BUTTE.w / 2 + 0.08, BUTTE.d / 2 + 0.08,
        0.04, 0.74, 0x77ccff, 0.9
      );
      if (hitCastleButte) showToast('Butte : il faut une rampe');
    }

    // Buttes latérales : volumes pleins tant que la rampe latérale n'a pas été franchie.
    // Petite marge de sécurité : si la bille est encore sur une rampe latérale construite,
    // on ne la repousse pas brutalement hors de la butte au moment de la transition.
    const onSideRampTransition = (players[active-1].sideRamps || []).some(r => {
      if (!r.built || !r.mesh) return false;
      const rp = r.mesh.position;
      const relX = ball.position.x - rp.x;
      const relZ = (ball.position.z - rp.z) * dir(active);
      return Math.abs(relX) < SIDE_RIDGE.width / 2 + CFG.ballR * 1.25 &&
             relZ > -RAMP.halfLength - CFG.ballR * 0.8 &&
             relZ <  RAMP.halfLength + 4.8;
    });

    sideRidgeIndexes().forEach(sideIndex => {
      const b = sideRidgeBounds(active, sideIndex);
      if (!sideRidgeAccessThisShot && !onSideRampTransition) {
        const hit = pushBallOutOfSolidBox(
          b.x, (b.zMin + b.zMax) / 2,
          SIDE_RIDGE.width / 2 + 0.06, (b.zMax - b.zMin) / 2 + 0.06,
          0.03, 0.72, 0x77ccff, 0.85
        );
        if (hit) showToast('Butte latérale : il faut une rampe');
      }
    });
  }

  /* ── Physique ── */
  function physics() {
    if (gameOver || turnLocked || phase !== 'attack' || canShoot) return;
    ball.position.add(velocity); velocity.multiplyScalar(.986);
    ball.rotation.x += velocity.z * .35; ball.rotation.z -= velocity.x * .35;
    const lx = attackX(active), margin = CFG.ballR + 1.1;
    if (ball.position.x < lx - CFG.laneW/2 + margin || ball.position.x > lx + CFG.laneW/2 - margin) {
      velocity.x *= -.72;
      ball.position.x = THREE.MathUtils.clamp(ball.position.x, lx - CFG.laneW/2 + margin, lx + CFG.laneW/2 - margin);
      impact(ball.position, 0xe0d0a0);
    }
    if (ball.position.z < -CFG.laneL/2 + margin || ball.position.z > CFG.laneL/2 - margin) {
      const hitBackEdge = active === 1
        ? ball.position.z <= -CFG.laneL / 2 + margin
        : ball.position.z >=  CFG.laneL / 2 - margin;
      if (hitBackEdge && !sideRidgeAccessThisShot) handleBackEdgePenalty();
      velocity.z *= -.65;
      ball.position.z = THREE.MathUtils.clamp(ball.position.z, -CFG.laneL/2 + margin, CFG.laneL/2 - margin);
      impact(ball.position, hitBackEdge ? 0xffc24b : 0xe0d0a0, hitBackEdge ? 1.4 : 1);
    }
    updateMudPhysics(1);
    updateDebrisPhysics(1);
    updateKitPhysics();
    bonusHoles.forEach(h => {
      if (holeResolved || h.attacker !== active) return;
      const d = Math.hypot(ball.position.x - h.x, ball.position.z - h.z);
      const speed = velocity.length();
      if (d < BONUS_HOLE_CAPTURE_R && !h.last) {
        h.last = true;
        if (speed < 0.78) {
          holeResolved = true;
          ballInHole = true;
          ball.position.set(h.x, 0.62, h.z);
          velocity.set(0, 0, 0);
          impact(ball.position, 0x62f7ff, 1.45);
          playSfx('confirm', 1.05);
          statForPlayer().holesHit++;
          queueBonusForNextTurn(active, rollBonusHoleOption());
          scheduleFinishTurn('La bille est tombée dans le trou bonus.', 950);
        } else {
          impact(ball.position, 0x62f7ff, 1.0);
          showToast('Trou bonus<br>Trop vite !');
        }
      }
      if (d > HOLE_R + 1.55) h.last = false;
    });
    holes.forEach(h => {
      if (holeResolved || Math.abs(h.x - lx) > CFG.laneW/2) return;
      const d = Math.hypot(ball.position.x - h.x, ball.position.z - h.z), speed = velocity.length();
      if (d < MAIN_HOLE_CAPTURE_R && !h.last) {
        h.last = true;
        if (speed < 0.62) {
          holeResolved = true; ballInHole = true;
          ball.position.set(h.x, .55, h.z); velocity.set(0, 0, 0);
          impact(ball.position, h.trap ? 0xff3333 : 0xffdd66);
          markHoleDiscovered(h);
          focusEventCameraOn(ball.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 1150, 10, 15);
          statForPlayer().holesHit++;
          if (h.relic && !h.relicFound) {
            collectRelicFromHole(h);
            scheduleFinishTurn('La bille a trouvé une relique.', 900);
          } else if (h.trap) {
            loseRandomResources(h);
            scheduleFinishTurn('La bille est tombée dans un piège.', 900);
          } else {
            gain(h.reward);
            scheduleFinishTurn('La bille est tombée dans un trou.', 900);
          }
        } else { impact(ball.position, 0x999999); showToast('Trop vite !'); }
      }
      if (d > HOLE_R + 1.45) h.last = false;
    });
    sideTheftHoles.forEach(h => {
      if (holeResolved || !sideRidgeAccessThisShot || h.attacker !== active) return;
      const d = Math.hypot(ball.position.x - h.x, ball.position.z - h.z);
      const speed = velocity.length();
      if (d < SIDE_THEFT_HOLE_CAPTURE_R && !h.last && ball.position.y > BUTTE.h + CFG.ballR * 0.45) {
        h.last = true;
        if (speed < 1.12) {
          holeResolved = true;
          ballInHole = true;
          ball.position.set(h.x, BUTTE.h + 0.55, h.z);
          velocity.set(0, 0, 0);
          statForPlayer().holesHit++;
          stealRandomResourcesFromPlayer(enemy(active), 3, 8, 'Trou de vol latéral');
          scheduleFinishTurn('La bille est tombée dans le trou de vol.', 900);
        } else {
          impact(ball.position, 0xffc24b, 1.05);
          showToast('Trou de vol<br>Un peu trop vite');
        }
      }
      if (d > HOLE_R + 1.55) h.last = false;
    });

    if (!ballInHole) {
      let groundY = CFG.ballR + .18;
      slopes.forEach(sl => {
        if (Math.abs(ball.position.x - sl.x) < sl.halfX && Math.abs(ball.position.z - sl.z) < sl.halfZ) {
          const local = (ball.position.z - sl.z) * sl.dir;
          const h = THREE.MathUtils.clamp((local + sl.halfZ) / (sl.halfZ * 2), 0, 1) * 1.35;
          groundY = Math.max(groundY, CFG.ballR + .18 + h);
        }
      });
      const defenderForButte = enemy(active);
      const onSideRidgePath = isOnSideRidgeForAttacker(active, ball.position.x, ball.position.z, sideRidgeAccessThisShot ? 1.15 : 0.15);
      if (sideRidgeAccessThisShot && onSideRidgePath) {
        groundY = Math.max(groundY, CFG.ballR + .18 + BUTTE.h);
        velocity.multiplyScalar(.997);
      }
      const onOpponentButte = Math.abs(ball.position.x - castleX(defenderForButte)) < BUTTE.w / 2 + 0.6 &&
                              Math.abs(ball.position.z - castleZ(defenderForButte)) < BUTTE.d / 2 + 0.8;
      if (castleAccessThisShot && onOpponentButte) {
        groundY = Math.max(groundY, CFG.ballR + .18 + BUTTE.h);
        velocity.multiplyScalar(.996);
      }
      ball.position.y += (groundY - ball.position.y) * .35;
    }
    let onBuiltRamp = false, rampExitReached = false;

    (players[active-1].sideRamps || []).forEach((r) => {
      if (!r.built || !r.mesh) return;
      const rp = r.mesh.position;
      const relX = ball.position.x - rp.x;
      const relZ = (ball.position.z - rp.z) * dir(active);
      const usableWidth = SIDE_RIDGE.width / 2 - CFG.ballR * 0.04;
      const railWidth   = SIDE_RIDGE.width / 2 + CFG.ballR * 0.95;
      const bridgeLength = 4.4;
      const forwardSpeed = velocity.z * dir(active);
      const exitSpeedNeeded = 0.070;
      const rawTForBounds = (relZ + RAMP.halfLength) / RAMP.length;
      const canEnterBridge = rawTForBounds > 1 && forwardSpeed >= exitSpeedNeeded;
      const inRampLength = relZ > -RAMP.halfLength - CFG.ballR * 0.55 &&
                           relZ < RAMP.halfLength + (canEnterBridge ? bridgeLength : 0.15);
      const absRelX = Math.abs(relX);
      const touchesRampWidth = absRelX < railWidth;
      const hitsRampSide = inRampLength && touchesRampWidth && absRelX >= usableWidth;
      if (hitsRampSide) {
        const side = Math.sign(relX) || 1;
        const nearEntry = relZ < -RAMP.halfLength + 4.8 && forwardSpeed > 0.025;
        if (nearEntry) {
          // Rampe latérale plus permissive : elle guide légèrement la bille vers l'entrée
          // au lieu de la rejeter systématiquement sur le flanc.
          ball.position.x += (rp.x - ball.position.x) * 0.18;
          velocity.x += (rp.x - ball.position.x) * 0.006;
          velocity.z *= 0.985;
        } else {
          ball.position.x = rp.x + side * (usableWidth + CFG.ballR * 0.08);
          velocity.x = Math.abs(velocity.x || 0.025) * side * 0.56;
          velocity.z *= 0.90;
          impact(ball.position, 0xd8c070, 0.45);
        }
      }
      const canUseRampSurface = relZ < -RAMP.halfLength + 5.2 || r.usedThisShot || (sideRidgeAccessThisShot && ball.position.y > CFG.ballR + 1.15);
      const inRamp = inRampLength && absRelX < usableWidth && canUseRampSurface;
      if (inRampLength && absRelX < usableWidth && !canUseRampSurface) {
        velocity.x *= 0.72;
        velocity.z *= -0.42;
        ball.position.z = rp.z - dir(active) * (RAMP.halfLength + CFG.ballR * 0.75);
        impact(ball.position, 0xd8c070, 0.65);
      }

      if (inRamp) {
        onBuiltRamp = true;
        const rawT = (relZ + RAMP.halfLength) / RAMP.length;
        const t = THREE.MathUtils.clamp(rawT, 0, 1);
        const atBridge = rawT > 1 && forwardSpeed >= exitSpeedNeeded;
        const rampSurfaceY = CFG.ballR + .18 + (atBridge ? RAMP.ballRise : t * RAMP.ballRise);

        if (Math.abs(relX) > usableWidth) {
          const side = Math.sign(relX) || 1;
          ball.position.x = rp.x + side * usableWidth;
          velocity.x = -Math.abs(velocity.x || 0.02) * side * 0.78;
          impact(ball.position, 0xd8c070, 0.65);
        }

        ball.position.y += (rampSurfaceY - ball.position.y) * (atBridge ? 0.78 : 0.62);

        const nearTop = t > 0.78;
        const slopeGravity = atBridge ? 0.0018 : (0.0062 + t * 0.0032 + (nearTop ? 0.0020 : 0));
        velocity.z -= dir(active) * slopeGravity;
        velocity.multiplyScalar(atBridge ? 0.994 : 0.989);

        if (nearTop && forwardSpeed < exitSpeedNeeded && !sideRidgeAccessThisShot) {
          const topLimitZ = rp.z + dir(active) * (RAMP.halfLength - 0.18);
          if ((ball.position.z - topLimitZ) * dir(active) > 0) ball.position.z = topLimitZ;
          const rollback = Math.max(0.018, (exitSpeedNeeded - Math.max(0, forwardSpeed)) * 0.22);
          velocity.z = -dir(active) * rollback;
          velocity.x *= 0.82;
        }

        if ((t > .86 || atBridge) && forwardSpeed >= exitSpeedNeeded && ball.position.y > CFG.ballR + 1.70) {
          rampExitReached = true;
          sideRidgeAccessThisShot = true;
          const targetTopY = CFG.ballR + .18 + BUTTE.h;
          ball.position.y += (targetTopY - ball.position.y) * 0.72;
        }

        if (!r.usedThisShot && t > 0.06) {
          r.usedThisShot = true;
          const wear = Math.min(r.hp, SIDE_RIDGE.wearPerPassage);
          r.hp = Math.max(0, r.hp - wear);
          turnSummary.push('Rampe latérale ' + (r.sideIndex + 1) + ' usure -' + wear + ' PV');
          if (r.hp <= 0) {
            r.built = false;
            if (r.mesh) { scene.remove(r.mesh); r.mesh = null; }
            showToast('Rampe latérale usée détruite');
            updateTowerGhosts();
          }
          updateHUD();
        }
      }
    });

    players[active-1].ramps.forEach((r, slot) => {
      if (!r.built || !r.mesh) return;
      const rp = r.mesh.position;
      const relX = ball.position.x - rp.x;
      const relZ = (ball.position.z - rp.z) * dir(active);

      // Physique rampe : la rampe n'aspire pas la bille, mais elle la porte réellement.
      // La fin de rampe a une zone de transition vers la butte pour éviter que la bille
      // retombe ou tape dans la face verticale alors qu'elle a bien réussi la montée.
      const usableWidth = RAMP.width / 2 - CFG.ballR * 0.18;
      const railWidth   = RAMP.width / 2 + CFG.ballR * 0.78;
      const bridgeLength = 3.4;
      const forwardSpeed = velocity.z * dir(active);
      const exitSpeedNeeded = 0.092;
      const rawTForBounds = (relZ + RAMP.halfLength) / RAMP.length;
      const canEnterBridge = rawTForBounds > 1 && forwardSpeed >= exitSpeedNeeded;
      const entryAssist = forwardSpeed > 0.012 &&
                          relZ > -RAMP.halfLength - CFG.ballR * 1.9 &&
                          relZ < -RAMP.halfLength + 4.4 &&
                          Math.abs(relX) < railWidth + 1.10;
      const inRampLength = relZ > -RAMP.halfLength - CFG.ballR * 0.85 &&
                           relZ < RAMP.halfLength + (canEnterBridge ? bridgeLength : 0.35);
      const touchesRampWidth = Math.abs(relX) < railWidth;
      const inRamp = (inRampLength && touchesRampWidth) || entryAssist;

      if (inRamp) {
        onBuiltRamp = true;
        const rawT = (relZ + RAMP.halfLength) / RAMP.length;
        const t = THREE.MathUtils.clamp(rawT, 0, 1);
        const atBridge = rawT > 1 && forwardSpeed >= exitSpeedNeeded;
        const rampSurfaceY = CFG.ballR + .18 + (atBridge ? RAMP.ballRise : t * RAMP.ballRise);

        // Rebords latéraux : à l'entrée, on guide doucement la bille sur la rampe
        // au lieu de la faire rebondir comme si elle tapait un mur invisible.
        if (Math.abs(relX) > usableWidth) {
          const side = Math.sign(relX) || 1;
          if (t < 0.30 && forwardSpeed > 0.012) {
            const guidedX = rp.x + side * usableWidth * 0.88;
            ball.position.x += (guidedX - ball.position.x) * 0.48;
            velocity.x *= 0.42;
          } else {
            ball.position.x = rp.x + side * usableWidth;
            velocity.x = -Math.abs(velocity.x || 0.02) * side * 0.58;
            impact(ball.position, 0xd8c070, 0.45);
          }
        }

        // La bille est portée par la surface inclinée. Pas de recentrage automatique,
        // mais une correction verticale forte pour qu'elle roule visuellement dessus.
        ball.position.y += (rampSurfaceY - ball.position.y) * (atBridge ? 0.78 : 0.62);

        // Gravité de pente : si la bille n'a pas assez d'élan en haut, elle ralentit,
        // s'arrête puis redescend naturellement au lieu d'être acceptée sur la butte.
        const nearTop = t > 0.78;
        const slopeGravity = atBridge ? 0.0025 : (0.0095 + t * 0.0055 + (nearTop ? 0.004 : 0));
        velocity.z -= dir(active) * slopeGravity;
        velocity.multiplyScalar(atBridge ? 0.994 : 0.989);

        // Si la bille arrive trop mollement au sommet, on l'empêche de passer la lèvre
        // de la butte et on la renvoie doucement dans le sens de la descente.
        if (nearTop && forwardSpeed < exitSpeedNeeded && !castleAccessThisShot) {
          const topLimitZ = rp.z + dir(active) * (RAMP.halfLength - 0.18);
          if ((ball.position.z - topLimitZ) * dir(active) > 0) ball.position.z = topLimitZ;
          const rollback = Math.max(0.018, (exitSpeedNeeded - Math.max(0, forwardSpeed)) * 0.22);
          velocity.z = -dir(active) * rollback;
          velocity.x *= 0.82;
        }

        // Accès à la butte uniquement si la bille arrive vraiment en haut avec assez d'élan.
        if ((t > .86 || atBridge) && forwardSpeed >= exitSpeedNeeded && ball.position.y > CFG.ballR + 1.70) {
          rampExitReached = true;
          castleAccessThisShot = true;
          const targetTopY = CFG.ballR + .18 + BUTTE.h;
          ball.position.y += (targetTopY - ball.position.y) * 0.72;
        }

        if (!r.usedThisShot && t > 0.06) {
          r.usedThisShot = true;
          const wear = Math.min(r.hp, RAMP.wearPerPassage);
          r.hp = Math.max(0, r.hp - wear);
          turnSummary.push('Rampe ' + (slot+1) + ' usure -' + wear + ' PV');
          if (r.hp <= 0) {
            r.built = false;
            if (r.mesh) { scene.remove(r.mesh); r.mesh = null; }
            r.unlocked = true;
            showToast('Rampe usée détruite');
            updateTowerGhosts();
          }
          updateHUD();
        }
      }
    });

    blockSolidButtesAndRampSides();

    // Les buttes latérales sont des couloirs hauts avec rebord intérieur :
    // - sans rampe latérale réussie, elles bloquent la bille ;
    // - avec rampe, elles guident la bille vers le fond et son trou de vol, sans accès au château.
    const sideRidgeHit = sideRidgeHitForAttacker(active, ball.position.x, ball.position.z, sideRidgeAccessThisShot ? 1.15 : 0.12);
    if (sideRidgeAccessThisShot && sideRidgeHit) {
      const safeHalf = SIDE_RIDGE.width / 2 - CFG.ballR * 0.10;
      const minX = sideRidgeHit.x - safeHalf;
      const maxX = sideRidgeHit.x + safeHalf;
      if (ball.position.x < minX || ball.position.x > maxX) {
        const before = ball.position.x;
        ball.position.x = THREE.MathUtils.clamp(ball.position.x, minX, maxX);
        velocity.x *= -0.42;
        if (Math.abs(before - ball.position.x) > 0.03) impact(ball.position, 0xd8c070, 0.45);
      }
    } else if (!sideRidgeAccessThisShot && !castleAccessThisShot && !onBuiltRamp && sideRidgeHit) {
      const start = sideRidgeHit.zStart;
      ball.position.z = start - dir(active) * 2.2;
      velocity.z *= -.70;
      velocity.x *= .68;
      impact(ball.position, 0x77ccff, 0.9);
      showToast('Butte latérale : il faut une rampe');
    }

    const def = enemy(active);
    players[def-1].towers.forEach((t, slot) => {
      if (!t.placed || !t.pos) return;
      if (Math.hypot(ball.position.x - t.pos.x, ball.position.z - t.pos.z) < 2.8) {
        velocity.z *= -.72; velocity.x += (ball.position.x - t.pos.x) * .06;
        damageTower(def, slot, Math.max(8, Math.floor(velocity.length() * 15)));
      }
    });
    const defender = enemy(active);
    const butteFrontZ = castleZ(defender) - dir(active) * (BUTTE.d / 2);

    // Transition rampe -> butte : si la rampe a été franchie, la bille reste portée
    // au niveau du dessus de la butte avant d'entrer sur le plateau du château.
    if (castleAccessThisShot && Math.abs(ball.position.x - attackX(active)) < CFG.laneW/2) {
      const approachingButte = Math.abs(ball.position.z - butteFrontZ) < 5.2;
      if (approachingButte) {
        const topY = CFG.ballR + .18 + BUTTE.h;
        ball.position.y += (topY - ball.position.y) * 0.68;
      }
    }

    const nearBuiltCastleRampTop = players[active-1].ramps.some(r => {
      if (!r.built || !r.mesh) return false;
      const rp = r.mesh.position;
      const relX = ball.position.x - rp.x;
      const relZ = (ball.position.z - rp.z) * dir(active);
      return Math.abs(relX) < RAMP.width / 2 + CFG.ballR * 1.55 &&
             relZ > RAMP.halfLength - 2.4 &&
             relZ < RAMP.halfLength + 3.4;
    });

    if (Math.abs(ball.position.z - butteFrontZ) < 2.0 && Math.abs(ball.position.x - attackX(active)) < CFG.laneW/2 && !castleAccessThisShot && !sideRidgeAccessThisShot && !rampExitReached && !onBuiltRamp && !nearBuiltCastleRampTop) {
      ball.position.z = butteFrontZ - dir(active) * 2.6;
      velocity.z *= -.74;
      impact(ball.position, 0x77ccff);
      showToast('Butte : il faut une rampe');
    }

    if (castleAccessThisShot && !castleHitThisShot && Math.abs(ball.position.x - attackX(active)) < CFG.laneW/2) {
      const target = findCastleContact(defender);
      if (target) {
        castleHitThisShot = true;
        const dmg = Math.min(14, Math.max(6, Math.floor(velocity.length() * 11)));
        damageCastle(defender, dmg, target);
        velocity.z *= -.48;
        velocity.x *= .55;
        ball.position.z -= dir(active) * 2.2;
      }
    }
    updateRollingSound(velocity.length(), onBuiltRamp || castleAccessThisShot || sideRidgeAccessThisShot);

    if (shotStarted && !holeResolved && velocity.length() < .035) {
      velocity.set(0, 0, 0);
      stopRollingSound(false);
      scheduleFinishTurn('La bille s\'est arrêtée.', 650);
    }
  }

  /* ── Caméra ── */
  function cameraUpdate() {
    let target, pos;
    if (rampCameraFocus && Date.now() >= rampCameraFocus.until) rampCameraFocus = null;
    const introCam = sampleTurnIntroCamera();
    if (victoryFocus) {
      target = victoryFocus.clone();
      pos = victoryFocus.clone().add(victoryCameraOffset || new THREE.Vector3(0, 17, 30));
    } else if (rampCameraFocus) {
      target = rampCameraFocus.target.clone();
      pos = rampCameraFocus.pos.clone();
    } else if (introCam) {
      target = introCam.target;
      pos = introCam.pos;
    } else if (phase === 'choice') {
      target = new THREE.Vector3(0, 1.2, 0);
      pos = new THREE.Vector3(0, 112, active === 1 ? 118 : -118);
    } else if (phase === 'defense' || phase === 'setup' || placingTower) {
      const p = active;
      clampDefenseCamera();
      // Cible de base = château du joueur. La caméra démarre au-dessus de la zone de tours,
      // donc elle regarde naturellement vers le château dès le placement initial.
      target = new THREE.Vector3(defenseX(p) + defenseCamPanX, 2.2, castleZ(p) + defenseCamPanZ);
      const backward = new THREE.Vector3(Math.sin(defenseCamYaw) * defenseCamDist, defenseCamHeight, dir(p) * Math.cos(defenseCamYaw) * defenseCamDist);
      pos = target.clone().add(backward);
    } else if (!canShoot) {
      target = ball.position.clone();
      pos = ball.position.clone().add(new THREE.Vector3(0, 11, -dir(active) * 24));
    } else {
      target = new THREE.Vector3(attackX(active), 1.5, 0);
      pos = new THREE.Vector3(attackX(active), 18, startZ(active) - dir(active) * 34);
    }
    const cameraEase = victoryFocus ? .075 : (rampCameraFocus ? .15 : (introCam ? .085 : .10));
    camera.position.lerp(pos, cameraEase);
    if (screenShakeTime > 0) {
      camera.position.x += (Math.random() - .5) * screenShakePower;
      camera.position.y += (Math.random() - .5) * screenShakePower * .55;
      camera.position.z += (Math.random() - .5) * screenShakePower;
      screenShakeTime -= 0.016;
      screenShakePower *= 0.93;
    }
    camera.lookAt(target);
  }

  /* ── Nuages de particules animés (lampes oscillantes) ── */
  let _t = 0;
  function animateLamps() {
    // Optimisation mobile : lampes fixes, pas de parcours de scène à chaque frame.
  }

  function animateHoleGlow() {
    holes.forEach(h => {
      if (!h.holeGlow) return;
      const phase = _t * 3.4 + h.x * 0.17 + h.z * 0.055;
      const pulse = 1 + Math.sin(phase) * 0.075;
      h.holeGlow.scale.setScalar(pulse);
      h.holeGlow.material.opacity = 0.22 + (Math.sin(phase) + 1) * 0.10;
      if (h.ring && h.ring.scale) h.ring.scale.setScalar(1 + Math.sin(phase) * 0.018);
    });
    sideTheftHoles.forEach(h => {
      if (!h.holeGlow) return;
      const phase = _t * 3.8 + h.x * 0.13 + h.z * 0.047;
      const pulse = 1 + Math.sin(phase) * 0.09;
      h.holeGlow.scale.setScalar(pulse);
      h.holeGlow.material.opacity = 0.24 + (Math.sin(phase) + 1) * 0.11;
      if (h.ring && h.ring.scale) h.ring.scale.setScalar(1 + Math.sin(phase) * 0.022);
    });
  }

  /* ── Loop principale ── */
  function animate() {
    requestAnimationFrame(animate);
    _t += 0.016;
    if (gameStarted && !gamePaused) physics();
    else updateRollingSound(0, false);
    if (!gameStarted || gamePaused || gameOver || phase !== 'attack' || canShoot) updateRollingSound(0, false);
    updateBallTrail();
    updateBallPulseEffect();
    updateBonusHoles(1);
    cameraUpdate(); animateLamps(); animateHoleGlow(); updateKitAnimations();
    if (!gamePaused && dragging && canShoot) {
      const dx = dragNow.x - dragStart.x, dy = dragNow.y - dragStart.y;
      const vx = (active === 1 ? -dx : dx) * .014, vz = dir(active) * Math.abs(dy) * .024;
      const start = ball.position.clone().add(new THREE.Vector3(0, 0.18, 0));
      const end = ball.position.clone().add(new THREE.Vector3(vx * 24, 0.18, vz * 24));
      aimLine.geometry.setFromPoints([start, end]);
      aimLine.computeLineDistances();
      aimEndRing.position.set(end.x, 0.42, end.z);
      const power = THREE.MathUtils.clamp(Math.hypot(dx, dy) / 260, 0.12, 1.20);
      aimEndRing.scale.setScalar(power);
      aimDots.forEach((dot, i) => {
        const t = (i + 1) / (aimDots.length + 1);
        dot.position.lerpVectors(start, end, t);
        dot.position.y = 0.46 + Math.sin(t * Math.PI) * 0.14;
        dot.scale.setScalar(0.9 + t * 0.9);
      });
    }
    sparks.forEach(s => {
      if (s.userData.life > 0) {
        s.userData.life -= .045; s.position.add(s.userData.v);
        s.userData.v.y -= .018; s.material.opacity = s.userData.life;
        if (s.userData.life <= 0) s.position.y = -999;
      }
    });
    for (let i = fxRings.length - 1; i >= 0; i--) {
      const r = fxRings[i];
      r.userData.life -= .035;
      const scale = 1 + (1 - r.userData.life) * (1.8 + r.userData.intensity * 1.4);
      r.scale.set(scale, scale, scale);
      r.material.opacity = Math.max(0, r.userData.life) * .72;
      if (r.userData.life <= 0) {
        scene.remove(r);
        r.geometry.dispose();
        r.material.dispose();
        fxRings.splice(i, 1);
      }
    }
    renderer.render(scene, camera);
  }

  buildAmbientSparkles();
  updateTowerGhosts();
  window.__BDS_BOOT_OK = true;
  const pendingMode = sessionStorage.getItem('BDS_START_MODE');
  if (pendingMode) {
    sessionStorage.removeItem('BDS_START_MODE');
    beginGame(pendingMode, null);
  } else {
    if (UI.btnPause) UI.btnPause.classList.add('hidden');
    openMainMenu(false);
  }
  animate();
})();

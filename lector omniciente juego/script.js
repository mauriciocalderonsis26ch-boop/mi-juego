// --- SISTEMA DE AUDIO SINTETIZADO (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
  }
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playSlash() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playCoin() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playHit() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playSkill() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

const audio = new SoundController();

// --- ESTADO Y VARIABLES DEL JUEGO ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let gameState = 'START';
let coins = 200;
let level = 1;
let currentScenario = 1;

// Estadísticas del Jugador (Kim Dokja)
const player = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  radius: 22,
  speed: 4.5,
  hp: 100,
  maxHp: 100,
  mp: 100,
  maxMp: 100,
  str: 10,
  agi: 10,
  con: 10,
  mag: 10,
  isDodging: false,
  dodgeTimer: 0,
  dodgeCooldown: 0,
  attackCooldown: 0,
  skill1CD: 0,
  skill2CD: 0,
  skill3CD: 0,
  bookmarkIndex: 0,
  hasWeapon: false,
  facingAngle: 0
};

const bookmarks = [
  { name: 'Corte Celestial', cost: 20, cd: 3, color: '#00f0ff' },
  { name: 'Llamas de Retribución', cost: 35, cd: 6, color: '#ff3355' },
  { name: 'Escudo de Acero Puro', cost: 25, cd: 8, color: '#00e676' },
  { name: 'Camino del Viento', cost: 15, cd: 4, color: '#ffd700' }
];

let statUpgradeCost = 100;

// Arrays de Entidades
let enemies = [];
let particles = [];
let damageTexts = [];
let companions = [];

// Teclas presionadas
const keys = {};

// Transmisión de Mensajes de las Constelaciones
const constellationMessages = [
  { name: 'Juez del Fuego similar al Demonio', msg: 'mira con ojos compasivos.', coins: 100 },
  { name: 'Conspirador Secreto', msg: 'mantiene la mirada intrigada en tus acciones.', coins: 150 },
  { name: 'Prisionero del Ceñidor Dorado', msg: 'da saltos de emoción ante la batalla.', coins: 200 },
  { name: 'Dragón Negro de la Llama Abisal', msg: 'sonríe satisfecho con la destrucción.', coins: 300 }
];

function addConstellationMessage(textOverride) {
  const ticker = document.getElementById('ticker-messages');
  const rand = constellationMessages[Math.floor(Math.random() * constellationMessages.length)];
  const coinsGained = rand.coins;
  
  coins += coinsGained;
  audio.playCoin();
  updateUI();

  const msgSpan = document.createElement('span');
  msgSpan.className = 'ticker-msg';
  msgSpan.innerHTML = textOverride || `[La constelación '<span class="ticker-constellation">${rand.name}</span>' ${rand.msg} <span class="ticker-coin">+${coinsGained} Monedas</span>]`;
  ticker.appendChild(msgSpan);

  if (ticker.children.length > 5) {
    ticker.removeChild(ticker.children[0]);
  }
}

setInterval(() => {
  if (gameState === 'PLAYING') {
    addConstellationMessage();
  }
}, 12000);

// --- LÓGICA DE ENEMIGOS Y ESCENARIOS ---
function spawnEnemy(type = 'rat') {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * canvas.width; y = -30; }
  else if (edge === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; }
  else { x = -30; y = Math.random() * canvas.height; }

  let hp = 40, speed = 2, radius = 20, name = 'Sub-criatura Canal';
  if (type === 'zombie') { hp = 80; speed = 1.4; radius = 22; name = 'Infección Zombi'; }
  if (type === 'boss') { hp = 650; speed = 1.1; radius = 55; name = 'Ictiosaurio Comandante'; }

  enemies.push({ x, y, hp, maxHp: hp, speed, radius, name, type, hitTimer: 0 });
}

function initScenario(scen) {
  enemies = [];
  currentScenario = scen;
  const scenTitle = document.getElementById('scenario-name');
  const scenObj = document.getElementById('scenario-objective');
  const bossContainer = document.getElementById('boss-hp-container');

  if (scen === 1) {
    scenTitle.textContent = "Escenario Principal #1 - Prueba de Valor";
    scenObj.textContent = "Elimina a las criaturas del canal (0/8)";
    bossContainer.classList.add('hidden');
    for (let i = 0; i < 8; i++) spawnEnemy('rat');
  } else if (scen === 2) {
    scenTitle.textContent = "Escenario Principal #2 - Invasión Zombi";
    scenObj.textContent = "Sobrevive a las encarnaciones infectadas";
    bossContainer.classList.add('hidden');
    for (let i = 0; i < 12; i++) spawnEnemy('zombie');
  } else if (scen === 3) {
    scenTitle.textContent = "Escenario Principal #3 - Enfrentamiento a la Calamidad";
    scenObj.textContent = "Derrota al Ictiosaurio Comandante";
    bossContainer.classList.remove('hidden');
    spawnEnemy('boss');
  }
}

// --- CONTROLES TECLADO Y TÁCTIL ---
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyQ') useSkill1();
  if (e.code === 'KeyE') cycleBookmark();
  if (e.code === 'KeyR') summonCompanion();
  if (e.code === 'Space') performDodge();
  if (e.code === 'KeyJ') performAttack();
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousedown', (e) => {
  if (gameState === 'PLAYING') performAttack();
});

// Controles Táctiles
document.getElementById('btn-up').addEventListener('touchstart', (e) => { e.preventDefault(); keys['KeyW'] = true; });
document.getElementById('btn-up').addEventListener('touchend', (e) => { e.preventDefault(); keys['KeyW'] = false; });
document.getElementById('btn-down').addEventListener('touchstart', (e) => { e.preventDefault(); keys['KeyS'] = true; });
document.getElementById('btn-down').addEventListener('touchend', (e) => { e.preventDefault(); keys['KeyS'] = false; });
document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); keys['KeyA'] = true; });
document.getElementById('btn-left').addEventListener('touchend', (e) => { e.preventDefault(); keys['KeyA'] = false; });
document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); keys['KeyD'] = true; });
document.getElementById('btn-right').addEventListener('touchend', (e) => { e.preventDefault(); keys['KeyD'] = false; });

document.getElementById('touch-attack').addEventListener('click', () => performAttack());
document.getElementById('touch-dodge').addEventListener('click', () => performDodge());
document.getElementById('touch-skill1').addEventListener('click', () => useSkill1());
document.getElementById('touch-skill2').addEventListener('click', () => cycleBookmark());

// --- ACCIONES DE COMBATE ---
function performAttack() {
  if (player.attackCooldown > 0 || gameState !== 'PLAYING') return;
  player.attackCooldown = 0.25;
  audio.playSlash();

  const dmg = player.str * 2.5 * (player.hasWeapon ? 1.3 : 1.0);
  const reach = 65;

  for (let i = 0; i < 10; i++) {
    particles.push({
      x: player.x + Math.cos(player.facingAngle) * 20,
      y: player.y + Math.sin(player.facingAngle) * 20,
      vx: Math.cos(player.facingAngle + (Math.random() - 0.5)) * 9,
      vy: Math.sin(player.facingAngle + (Math.random() - 0.5)) * 9,
      life: 0.2,
      maxLife: 0.2,
      color: '#00f0ff'
    });
  }

  enemies.forEach(enemy => {
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < reach + enemy.radius) {
      enemy.hp -= dmg;
      enemy.hitTimer = 0.12;
      audio.playHit();
      addDamageText(enemy.x, enemy.y - 20, Math.round(dmg), '#00f0ff');
    }
  });
}

function performDodge() {
  if (player.dodgeCooldown > 0 || gameState !== 'PLAYING') return;
  player.isDodging = true;
  player.dodgeTimer = 0.3;
  player.dodgeCooldown = 1.2;
  audio.playSkill();
}

function useSkill1() {
  if (player.skill1CD > 0 || player.mp < bookmarks[player.bookmarkIndex].cost || gameState !== 'PLAYING') return;
  const mark = bookmarks[player.bookmarkIndex];
  player.mp -= mark.cost;
  player.skill1CD = mark.cd;
  audio.playSkill();

  const baseDmg = player.mag * 3.8;
  enemies.forEach(enemy => {
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < 160) {
      enemy.hp -= baseDmg;
      enemy.hitTimer = 0.2;
      addDamageText(enemy.x, enemy.y - 25, Math.round(baseDmg), mark.color);
    }
  });

  for (let i = 0; i < 28; i++) {
    const angle = (Math.PI * 2 / 28) * i;
    particles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * 11, vy: Math.sin(angle) * 11,
      life: 0.45, maxLife: 0.45, color: mark.color
    });
  }
}

function cycleBookmark() {
  player.bookmarkIndex = (player.bookmarkIndex + 1) % bookmarks.length;
  document.getElementById('stat-stigma').textContent = bookmarks[player.bookmarkIndex].name;
  document.querySelector('#skill-1 .skill-name').textContent = bookmarks[player.bookmarkIndex].name;
  audio.playSkill();
}

function summonCompanion() {
  if (player.skill3CD > 0 || player.mp < 40 || gameState !== 'PLAYING') return;
  player.mp -= 40;
  player.skill3CD = 15;
  audio.playSkill();

  addConstellationMessage(`[La encarnación 'Yoo Joonghyuk' aparece y desata un corte estelar masivo]`);
  
  companions.push({
    x: player.x, y: player.y,
    life: 2.2,
    angle: player.facingAngle
  });

  enemies.forEach(e => {
    e.hp -= 180;
    addDamageText(e.x, e.y - 30, 180, '#ffd700');
  });
}

function addDamageText(x, y, text, color) {
  damageTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
}

// --- DIBUJO DE PERSONAJES (SPRITES VECTORIALES) ---

// 1. Kim Dokja
function drawKimDokja(ctx, x, y, angle, isDodging, hasWeapon) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (isDodging) ctx.globalAlpha = 0.4;

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Abrigo Blanco (White Coat)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(-20, 18);
  ctx.lineTo(-4, 14);
  ctx.lineTo(0, 20);
  ctx.lineTo(4, 14);
  ctx.lineTo(20, 18);
  ctx.lineTo(12, -8);
  ctx.closePath();
  ctx.fill();

  // Traje Interior Negro
  ctx.fillStyle = '#111827';
  ctx.fillRect(-8, -10, 16, 20);

  // Cabeza y Cabello
  ctx.fillStyle = '#ffe0bd';
  ctx.beginPath();
  ctx.arc(0, -12, 9, 0, Math.PI * 2);
  ctx.fill();

  // Pelo Negro característico
  ctx.fillStyle = '#1e1e1e';
  ctx.beginPath();
  ctx.arc(0, -14, 10, Math.PI, Math.PI * 2);
  ctx.lineTo(8, -10);
  ctx.lineTo(4, -8);
  ctx.lineTo(0, -10);
  ctx.lineTo(-4, -8);
  ctx.lineTo(-8, -10);
  ctx.closePath();
  ctx.fill();

  // Espada (Fe Inquebrantable)
  ctx.strokeStyle = hasWeapon ? '#00f0ff' : '#cccccc';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.lineTo(28, 2);
  ctx.stroke();

  // Empuñadura
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(6, -1, 3, 6);

  // Brillo de espada
  if (hasWeapon) {
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(9, 2);
    ctx.lineTo(27, 2);
    ctx.stroke();
  }

  ctx.restore();
}

// 2. Enemigos
function drawEnemy(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  if (enemy.hitTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (enemy.type === 'rat') {
    // Sub-criatura (Rata del canal)
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabeza & Dientes
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.arc(12, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Ojos Rojos
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(14, -3, 2.5, 0, Math.PI * 2);
    ctx.arc(14, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Cola
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-24, -8, -28, 4);
    ctx.stroke();

  } else if (enemy.type === 'zombie') {
    // Encarnación Infectada (Zombi)
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(0, -6, 10, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo harapiento
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-10, 0, 20, 16);

    // Ojos Amarillos Sin Vida
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(2, -8, 3, 3);
    ctx.fillRect(-5, -8, 3, 3);

    // Aura oscura
    ctx.strokeStyle = 'rgba(123, 31, 162, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

  } else if (enemy.type === 'boss') {
    // Ictiosaurio Comandante (Jefe Calamidad)
    ctx.fillStyle = '#004d40';
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Escamas / Cresta
    ctx.fillStyle = '#00bfa5';
    for (let i = -30; i <= 30; i += 15) {
      ctx.beginPath();
      ctx.arc(i, -20, 8, 0, Math.PI, true);
      ctx.fill();
    }

    // Ojos Gigantes del Vaciado
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(22, -10, 6, 0, Math.PI * 2);
    ctx.arc(22, 10, 6, 0, Math.PI * 2);
    ctx.fill();

    // Mandíbula y Mandíbulas
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.moveTo(30, -12);
    ctx.lineTo(48, 0);
    ctx.lineTo(30, 12);
    ctx.closePath();
    ctx.fill();
  }

  // Barra de Vida
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(-enemy.radius, -enemy.radius - 14, enemy.radius * 2, 6);
  ctx.fillStyle = '#ff3355';
  ctx.fillRect(-enemy.radius, -enemy.radius - 14, (enemy.radius * 2) * (enemy.hp / enemy.maxHp), 6);

  ctx.restore();
}

// 3. Yoo Joonghyuk (Compañero Invocado)
function drawYooJoonghyuk(ctx, companion) {
  ctx.save();
  ctx.translate(companion.x, companion.y);
  ctx.rotate(companion.angle);

  // Abrigo Negro Emblemático
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.lineTo(-24, 20);
  ctx.lineTo(0, 15);
  ctx.lineTo(24, 20);
  ctx.lineTo(14, -10);
  ctx.closePath();
  ctx.fill();

  // Cabeza
  ctx.fillStyle = '#ffe0bd';
  ctx.beginPath();
  ctx.arc(0, -12, 9, 0, Math.PI * 2);
  ctx.fill();

  // Pelo Negro
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(0, -14, 10, Math.PI, Math.PI * 2);
  ctx.fill();

  // Gran Corte Dorado
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 8;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(0, 0, 85, -0.8, 0.8);
  ctx.stroke();

  ctx.restore();
}

// --- BUCLE PRINCIPAL DEL JUEGO ---
let lastTime = performance.now();

function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (gameState === 'PLAYING') {
    update(dt);
  }
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  // Regeneración de MP
  if (player.mp < player.maxMp) player.mp = Math.min(player.maxMp, player.mp + dt * 5);

  // Cooldowns
  if (player.dodgeCooldown > 0) player.dodgeCooldown -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.skill1CD > 0) player.skill1CD -= dt;
  if (player.skill3CD > 0) player.skill3CD -= dt;

  if (player.dodgeTimer > 0) {
    player.dodgeTimer -= dt;
    if (player.dodgeTimer <= 0) player.isDodging = false;
  }

  // Movimiento del Jugador
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    const speedMultiplier = player.isDodging ? 2.5 : 1.0;
    player.x += (dx / len) * player.speed * speedMultiplier;
    player.y += (dy / len) * player.speed * speedMultiplier;
    player.facingAngle = Math.atan2(dy, dx);
  }

  // Mantener dentro del mapa
  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  // Actualizar Enemigos
  enemies.forEach(enemy => {
    if (enemy.hitTimer > 0) enemy.hitTimer -= dt;

    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed;
    enemy.y += Math.sin(angle) * enemy.speed;

    // Colisión con el Jugador
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < player.radius + enemy.radius && !player.isDodging) {
      const dmg = 10 * dt;
      player.hp -= dmg;
      if (player.hp <= 0) {
        player.hp = 0;
        triggerGameOver();
      }
    }
  });

  // Limpiar Enemigos Muertos
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      coins += enemies[i].type === 'boss' ? 500 : 35;
      audio.playCoin();
      enemies.splice(i, 1);
    }
  }

  // Comprobar avance de escenario
  if (enemies.length === 0) {
    if (currentScenario < 3) {
      initScenario(currentScenario + 1);
      addConstellationMessage(`[¡Has completado el Escenario Principal #${currentScenario - 1}! Se abre un nuevo canal]`);
    } else {
      triggerWin();
    }
  }

  // Actualizar Partículas y Textos
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= dt; });
  particles = particles.filter(p => p.life > 0);

  damageTexts.forEach(t => { t.y -= 20 * dt; t.life -= dt; });
  damageTexts = damageTexts.filter(t => t.life > 0);

  companions.forEach(c => { c.life -= dt; });
  companions = companions.filter(c => c.life > 0);

  updateUI();
}

// --- RENDERIZADO EN CANVAS ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fondo Grid de Arena
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  if (gameState !== 'PLAYING' && gameState !== 'GAMEOVER') return;

  // Dibujar Invocaciones
  companions.forEach(c => drawYooJoonghyuk(ctx, c));

  // Dibujar Jugador (Kim Dokja)
  drawKimDokja(ctx, player.x, player.y, player.facingAngle, player.isDodging, player.hasWeapon);

  // Dibujar Enemigos
  enemies.forEach(e => drawEnemy(ctx, e));

  // Dibujar Partículas
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  // Dibujar Textos de Daño
  damageTexts.forEach(t => {
    ctx.fillStyle = t.color;
    ctx.font = 'bold 16px Rajdhani';
    ctx.fillText(t.text, t.x, t.y);
  });
}

// --- ACTUALIZACIÓN DE INTERFAZ DE USUARIO ---
function updateUI() {
  document.getElementById('hp-bar').style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById('hp-text').textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  document.getElementById('mp-bar').style.width = `${(player.mp / player.maxMp) * 100}%`;
  document.getElementById('mp-text').textContent = `${Math.ceil(player.mp)} / ${player.maxMp}`;

  document.getElementById('coin-display').textContent = coins;
  document.getElementById('level-display').textContent = `Nivel ${level}`;

  // Cooldowns UI
  const cd1 = document.getElementById('cd-1');
  if (player.skill1CD > 0) { cd1.classList.remove('hidden'); cd1.textContent = player.skill1CD.toFixed(1) + 's'; }
  else cd1.classList.add('hidden');

  const cd3 = document.getElementById('cd-3');
  if (player.skill3CD > 0) { cd3.classList.remove('hidden'); cd3.textContent = player.skill3CD.toFixed(1) + 's'; }
  else cd3.classList.add('hidden');

  const cd4 = document.getElementById('cd-4');
  if (player.dodgeCooldown > 0) { cd4.classList.remove('hidden'); cd4.textContent = player.dodgeCooldown.toFixed(1) + 's'; }
  else cd4.classList.add('hidden');

  // Jefe HP
  const boss = enemies.find(e => e.type === 'boss');
  if (boss) {
    document.getElementById('boss-hp-bar').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  }
}

// --- MEJORAS DE ATRIBUTOS Y TIENDA ---
function upgradeStat(type) {
  if (coins < statUpgradeCost) return;
  coins -= statUpgradeCost;
  if (type === 'str') player.str += 3;
  if (type === 'agi') { player.agi += 3; player.speed += 0.2; }
  if (type === 'con') { player.con += 3; player.maxHp += 20; player.hp += 20; }
  if (type === 'mag') { player.mag += 3; player.maxMp += 15; player.mp += 15; }

  statUpgradeCost = Math.round(statUpgradeCost * 1.3);
  document.getElementById('stat-str').textContent = player.str;
  document.getElementById('stat-agi').textContent = player.agi;
  document.getElementById('stat-con').textContent = player.con;
  document.getElementById('stat-mag').textContent = player.mag;
  document.getElementById('stat-cost').textContent = statUpgradeCost;
  updateUI();
}

function buyShopItem(item, price) {
  if (coins < price) return;
  coins -= price;
  if (item === 'weapon') player.hasWeapon = true;
  if (item === 'potion') { player.hp = player.maxHp; player.mp = player.maxMp; }
  updateUI();
  audio.playCoin();
}

function triggerGameOver() {
  gameState = 'GAMEOVER';
  document.getElementById('gameover-title').textContent = "HAS MUERTO";
  document.getElementById('gameover-desc').textContent = "Tu historia ha finalizado en este escenario...";
  document.getElementById('overlay-gameover').classList.remove('hidden');
}

function triggerWin() {
  gameState = 'WIN';
  document.getElementById('gameover-title').textContent = "¡ESCENARIOS COMPLETADOS!";
  document.getElementById('gameover-title').className = "game-title";
  document.getElementById('gameover-desc').textContent = "Has alcanzado el epílogo de esta demostración con la atención de la Corriente Estelar.";
  document.getElementById('overlay-gameover').classList.remove('hidden');
}

// --- EVENTOS DE BOTONES DE UI ---
document.getElementById('btn-start-game').addEventListener('click', () => {
  audio.init();
  document.getElementById('overlay-start').classList.add('hidden');
  gameState = 'PLAYING';
  initScenario(1);
});

document.getElementById('btn-restart').addEventListener('click', () => {
  document.getElementById('overlay-gameover').classList.add('hidden');
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  gameState = 'PLAYING';
  initScenario(1);
});

document.getElementById('btn-status').addEventListener('click', () => {
  document.getElementById('modal-status').classList.remove('hidden');
});
document.getElementById('close-status').addEventListener('click', () => {
  document.getElementById('modal-status').classList.add('hidden');
});

document.getElementById('btn-shop').addEventListener('click', () => {
  document.getElementById('modal-shop').classList.remove('hidden');
});
document.getElementById('close-shop').addEventListener('click', () => {
  document.getElementById('modal-shop').classList.add('hidden');
});

// Iniciar bucle principal
requestAnimationFrame(gameLoop);
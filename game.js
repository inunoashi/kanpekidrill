// ===============================
//   Three.js 基本セットアップ
// ===============================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7f7fFF); // 水色の空

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ===============================
//   地面（草テクスチャ）
// ===============================
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x00aa00 }); // ← 緑
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ===============================
//   プレイヤー（箱）
// ===============================
const playerGeo = new THREE.BoxGeometry(1, 1.6, 0.6);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xAABB90 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 0.8;
player.vy = 0;
player.hp = 100;
player.onGround = false;
scene.add(player);

// ===============================
//   敵（プレイヤーと同じ形）×2
// ===============================
const enemies = [];

function createEnemy(x, z) {
  const enemyGeo = new THREE.BoxGeometry(1, 1.6, 0.6);
  const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
  const enemy = new THREE.Mesh(enemyGeo, enemyMat);

  enemy.position.set(x, 0.8, z);
  enemy.hp = 100;

  enemy.moveTimer = 0;
  enemy.moveDir = new THREE.Vector3();

  scene.add(enemy);
  enemies.push(enemy);
}

// 敵を2体スポーン
createEnemy(5, 0);   // 1体目
createEnemy(-5, -3); // 2体目

// ===============================
//   ダメージテキスト
// ===============================
const damageTexts = [];

function createDamageText(value, position) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.font = "48px Arial";
  ctx.textAlign = "center";
  ctx.fillText(value, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);

  // ★ 距離による縮小を無効化（常に一定サイズ）
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    sizeAttenuation: false   // ← これが重要！
  });

  const sprite = new THREE.Sprite(mat);

  sprite.position.copy(position);
  sprite.position.y += 2.0;

  // ★ ここは固定サイズでOK
  sprite.scale.set(0.5, 0.25, 1);

  sprite.life = 1.0;

  scene.add(sprite);
  damageTexts.push(sprite);
}


// ===============================
//   ライト
// ===============================
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 5);
scene.add(dir);
scene.add(new THREE.AmbientLight(0x666666));

// ===============================
//   入力
// ===============================
const keys = { w: false, a: false, s: false, d: false, " ": false };

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (keys[k] !== undefined) keys[k] = true;
});
window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (keys[k] !== undefined) keys[k] = false;
});

// ===============================
//   iPadユーザー限定 Bキー射撃
// ===============================
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

window.addEventListener("keydown", (e) => {
  if (isIOS && e.key.toLowerCase() === "b") {
    shoot();
  }
});

// ===============================
//   マウス視点回転 + 射撃
// ===============================
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let cameraYaw = 0;
let cameraPitch = 0;

const MOUSE_SENS = 0.005;

window.addEventListener("mousedown", (e) => {
  // 右クリックで射撃
  if (e.button === 2) {
    shoot();
    return; // 射撃だけして視点回転はしない
  }

  // 左クリックで視点回転
  if (e.button === 0) {
    isMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    isMouseDown = false;
  }
});

// 視点回転（左ドラッグのみ）
window.addEventListener("mousemove", (e) => {
  if (!isMouseDown) return;

  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;

  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  cameraYaw += dx * MOUSE_SENS;
  cameraPitch -= dy * MOUSE_SENS;

  const limit = Math.PI / 3;
  cameraPitch = Math.max(-limit, Math.min(limit, cameraPitch));
});

// 右クリックのメニューを出さないようにする
window.addEventListener("contextmenu", (e) => e.preventDefault());

// ===============================
//   タッチ操作（iPad / スマホ用）
// ===============================
let lastTouchX = 0;
let lastTouchY = 0;

window.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  lastTouchX = t.clientX;
  lastTouchY = t.clientY;
});

window.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const t = e.touches[0];

  const dx = t.clientX - lastTouchX;
  const dy = t.clientY - lastTouchY;

  lastTouchX = t.clientX;
  lastTouchY = t.clientY;

  cameraYaw += dx * MOUSE_SENS;
  cameraPitch -= dy * MOUSE_SENS;

  const limit = Math.PI / 3;
  cameraPitch = Math.max(-limit, Math.min(limit, cameraPitch));
}, { passive: false });

// ===============================
//   移動ベクトル
// ===============================
function getCameraForward() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  return dir.normalize();
}

function getCameraRight() {
  const forward = getCameraForward();
  return new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
}

// ===============================
//   木の生成
// ===============================
const trees = [];

function createTree(x, z) {
  const tree = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.5;
  tree.add(trunk);

  const leafGeo = new THREE.SphereGeometry(1.5, 12, 12);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const leaves = new THREE.Mesh(leafGeo, leafMat);
  leaves.position.y = 3.5;
  tree.add(leaves);

  tree.position.set(x, 0, z);

  scene.add(tree);
  trees.push(tree);
}

for (let i = 0; i < 10; i++) {
  const x = (Math.random() - 0.5) * 150;
  const z = (Math.random() - 0.5) * 150;
  createTree(x, z);
}

// ===============================
//   当たり判定
// ===============================
function isCollidingWithTree(nextPos) {
  for (const tree of trees) {
    const dist = tree.position.distanceTo(nextPos);
    if (dist < 1.0) return true;
  }
  return false;
}

// ===============================
//   弾システム
// ===============================
const bullets = [];

function shoot() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.normalize();

  const bulletGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);

  bullet.position.copy(player.position);
  bullet.position.y += 1.0;
  bullet.position.add(dir.clone().multiplyScalar(0.5));

  bullet.velocity = dir.clone().multiplyScalar(0.6);

  bullets.push(bullet);
  scene.add(bullet);
}

// ===============================
//   更新処理
// ===============================
function update() {
  const speed = 0.12;

  const forward = getCameraForward();
  const right = getCameraRight();

  const move = new THREE.Vector3();

  if (keys.w) move.add(forward);
  if (keys.s) move.sub(forward);
  if (keys.a) move.add(right);
  if (keys.d) move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed);

    const nextPos = player.position.clone().add(move);

    if (!isCollidingWithTree(nextPos)) {
      player.position.copy(nextPos);
    }

    const angle = Math.atan2(move.x, move.z);
    player.rotation.y = angle;
  }

  player.vy -= 0.03;
  player.position.y += player.vy;

  const groundY = 0.8;
  if (player.position.y <= groundY) {
    player.position.y = groundY;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (keys[" "] && player.onGround) {
    player.vy = 0.5;
    player.onGround = false;
  }

  const distance = 5;
  const height = 1.8;

  const cosPitch = Math.cos(cameraPitch);
  const offset = new THREE.Vector3(
    Math.sin(cameraYaw) * cosPitch * distance,
    Math.sin(cameraPitch) * distance,
    Math.cos(cameraYaw) * cosPitch * distance
  );

  camera.position.copy(player.position).sub(offset);
  camera.position.y = player.position.y + height + offset.y;

  const lookAtPos = player.position.clone();
  lookAtPos.y += 1.0;
  camera.lookAt(lookAtPos);

// ===== 敵のランダム移動 =====
for (const enemy of enemies) {

  // 一定時間ごとにランダム方向を決める
  enemy.moveTimer -= 1;
  if (enemy.moveTimer <= 0) {
    enemy.moveTimer = 60 + Math.random() * 60; // 1〜2秒ごと
    const angle = Math.random() * Math.PI * 2;
    enemy.moveDir.set(Math.sin(angle), 0, Math.cos(angle));
  }

  // 移動処理
  const speed = 0.03;
  const nextPos = enemy.position.clone().add(enemy.moveDir.clone().multiplyScalar(speed));

  // 木にぶつからないようにする
  let blocked = false;
  for (const tree of trees) {
    const dist = tree.position.distanceTo(nextPos);
    if (dist < 1.5) {
      blocked = true;
      break;
    }
  }

  if (!blocked) {
    enemy.position.copy(nextPos);
  }

  // 向きを移動方向に合わせる
  enemy.rotation.y = Math.atan2(enemy.moveDir.x, enemy.moveDir.z);
}

// ===== 弾の更新 =====
for (let i = bullets.length - 1; i >= 0; i--) {
  const b = bullets[i];
  b.position.add(b.velocity);

// --- 敵に当たったらダメージ ---
for (const enemy of enemies) {
  const dist = b.position.distanceTo(enemy.position);
  if (dist < 1.0) {

    // ★ ダメージテキストを表示
    createDamageText(36, enemy.position);

    enemy.hp -= 36;

    if (enemy.hp <= 0) {
      scene.remove(enemy);
      enemies.splice(enemies.indexOf(enemy), 1);
    }

    scene.remove(b);
    bullets.splice(i, 1);
    break;
  }
}


  // --- 木に当たったら消す ---
  for (const tree of trees) {
    const dist = b.position.distanceTo(tree.position);
    if (dist < 1.5) {
      scene.remove(b);
      bullets.splice(i, 1);
      break;
    }
  }

  // --- 遠すぎたら消す ---
  if (b.position.distanceTo(player.position) > 80) {
    scene.remove(b);
    bullets.splice(i, 1);
  }
}

// ===== ダメージテキストの更新 =====
for (let i = damageTexts.length - 1; i >= 0; i--) {
  const t = damageTexts[i];

  t.position.y += 0.02;   // 上にふわっと移動
  t.material.opacity -= 0.02; // 徐々に透明に

  t.life -= 0.02;
  if (t.life <= 0) {
    scene.remove(t);
    damageTexts.splice(i, 1);
  }
}

}


// ===============================
//   メインループ
// ===============================
function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}
animate();

// ===============================
//   リサイズ対応
// ===============================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

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
player.onGround = false;
scene.add(player);

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
//   マウス視点回転
// ===============================
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let cameraYaw = 0;
let cameraPitch = 0;

const MOUSE_SENS = 0.005;

window.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});
window.addEventListener("mouseup", () => {
  isMouseDown = false;
});
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
  e.preventDefault(); // ← これが必須（Safariのスクロールを止める）

  const t = e.touches[0];

  const dx = t.clientX - lastTouchX;
  const dy = t.clientY - lastTouchY;

  lastTouchX = t.clientX;
  lastTouchY = t.clientY;

  cameraYaw += dx * MOUSE_SENS;
  cameraPitch -= dy * MOUSE_SENS;

  const limit = Math.PI / 3;
  cameraPitch = Math.max(-limit, Math.min(limit, cameraPitch));
}, { passive: false }); //


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

  // 幹
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.5;
  tree.add(trunk);

  // 葉
  const leafGeo = new THREE.SphereGeometry(1.5, 12, 12);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const leaves = new THREE.Mesh(leafGeo, leafMat);
  leaves.position.y = 3.5;
  tree.add(leaves);

  // 木の位置
  tree.position.set(x, 0, z);

  scene.add(tree);
  trees.push(tree);
}

// ランダムに5本生成
for (let i = 0; i < 5; i++) {
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

    // 木にぶつからないときだけ移動
    if (!isCollidingWithTree(nextPos)) {
      player.position.copy(nextPos);
    }

    const angle = Math.atan2(move.x, move.z);
    player.rotation.y = angle;
  }

  // ===== 重力 =====
  player.vy -= 0.03;
  player.position.y += player.vy;

  // ===== 地面判定 =====
  const groundY = 0.8;
  if (player.position.y <= groundY) {
    player.position.y = groundY;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // ===== ジャンプ =====
  if (keys[" "] && player.onGround) {
    player.vy = 0.5;
    player.onGround = false;
  }

  // ===== TPS カメラ追従 =====
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

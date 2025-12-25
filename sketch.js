// 清爽可執行版：全螢幕畫布 + 兩個並排的精靈動畫

let sheet1, sheet2;
let anim1, anim2;
 
// 三朵雲
let clouds = [];

// 角色設定（放大）
const chars = [
  { frameW:81.4, frameH:78, frames:9, scale:2.4, x:0, y:0, done:false, correct:0, angle:0, vx:0, vy:0, rotating:false, rotateStart:0, rotateDuration:900, alive:true },
  { frameW:60.375, frameH:103, frames:8, scale:2.4, x:0, y:0, done:false, correct:0, angle:0, vx:0, vy:0, rotating:false, rotateStart:0, rotateDuration:900, alive:true }
];

// 圓點（縮小、螢光粉色）
let balloon = { x:0, y:0, r:14, speed:6 };

// 題庫
const questions = [
  { q:'1. 下列哪個英文句子最符合 “我昨天去看電影” 的意思？', choices:['A. I go to the movies yesterday.','B. I am going to the movies yesterday.','C. I went to the movies yesterday.','D. I goes to the movies yesterday.'], ans:'c' },
  { q:'2. 哪個英文單字不是動物？', choices:['A. Tiger','B. Elephant','C. Table','D. Lion'], ans:'c' },
  { q:'3. 下列哪個片語表示“開始做某事”？', choices:['A. Give up','B. Take off','C. Set about','D. Look after'], ans:'c' },
  { q:'4. “He can’t stand spicy food.” 最接近哪個意思？', choices:['A. 他喜歡吃辣的食物','B. 他偶爾吃辣的食物','C. 他受不了辣的食物','D. 他常常做辣菜'], ans:'c' },
  { q:'5. 哪個單字最能填入空格："I\'m really tired, I need to ___."', choices:['A. eat','B. run','C. sleep','D. study'], ans:'c' }
];

// quiz state & DOM
let activeQuiz = null; // { charIndex, qIndex }
let qDiv = null, inputEl = null, msgDiv = null;
let inputWrap = null;
let rulesDiv = null;

// game state
let started = false;
let startBtn = null;
let lastAsked = null; // index of last asked char

// effects
let flames = []; // {x,y,start}
let waves = [];  // {x,y,start,maxR}
let startTxt = null;
let gameEnded = false;

function preload() {
  sheet1 = loadImage('資料夾1/all_1.png');
  sheet2 = loadImage('資料夾2/all_2.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  // 建立 animator：參數為 (image, frameWidth, frameHeight, frameCount, fps)
  anim1 = new SpriteAnimator(sheet1, 81.4, 78, 9, 10);
  anim2 = new SpriteAnimator(sheet2, 60.375, 103, 8, 10);

  // 角色位置
  const centerX = width/2;
  const centerY = height/2;
  const gap = 240; // 增加角色間距
  chars[0].x = centerX - (chars[0].frameW*chars[0].scale)/2 - gap/2;
  chars[0].y = centerY;
  chars[1].x = centerX + (chars[1].frameW*chars[1].scale)/2 + gap/2;
  chars[1].y = centerY;

  // 氣球起始於畫面中央
  balloon.x = width/2; balloon.y = height/2 - 150;
  // 初始化三朵雲（中間偏上，平均分開）
  const cloudGap = min(360, width * 0.30);
  clouds = [
    { x: width/2 - cloudGap*1.1, y: height * 0.18, w: 180, h: 70 },
    { x: width/2,                 y: height * 0.12, w: 260, h: 90 },
    { x: width/2 + cloudGap*1.1, y: height * 0.18, w: 160, h: 60 }
  ];

  // 開始遊戲按鈕（畫面中央）
  startBtn = createButton('開始遊戲');
  startBtn.style('position','fixed');
  startBtn.style('left','50%');
  startBtn.style('top','50%');
  startBtn.style('transform','translate(-50%,-50%)');
  startBtn.style('font-size','26px');
  startBtn.style('padding','14px 22px');
  startBtn.style('background','rgba(255,182,193,0.85)');
  startBtn.style('color','#fff');
  startBtn.style('border','1px solid rgba(255,255,255,0.35)');
  startBtn.style('border-radius','16px');
  startBtn.style('box-shadow','0 8px 18px rgba(255,119,187,0.18)');
  startBtn.style('cursor','pointer');
  startBtn.style('font-weight','700');
  startBtn.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  // 下方顯示文字
  startTxt = createDiv('41xxx0078');
  startTxt.style('position','fixed'); startTxt.style('left','50%'); startTxt.style('top','58%'); startTxt.style('transform','translate(-50%,-50%)'); startTxt.style('color','#333'); startTxt.style('font-size','14px'); startTxt.style('font-weight','700'); startTxt.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  startBtn.mousePressed(()=>{ showRules(); });
}

function draw() {
  background('#ADD8E6'); // 淡藍

  // 畫三朵雲（中間偏上）
  noStroke(); fill(255, 255, 255, 200);
  for (let c of clouds){
    ellipse(c.x - c.w*0.2, c.y, c.w*0.6, c.h*0.7);
    ellipse(c.x, c.y, c.w, c.h);
    ellipse(c.x + c.w*0.2, c.y, c.w*0.6, c.h*0.7);
  }

  // 底部尖刺（深灰/淺灰交錯）
  const spikeW = 48;
  const spikeH = min(120, height * 0.12);
  for (let x = 0; x < width; x += spikeW){
    const isEven = ((x / spikeW) % 2) === 0;
    fill(isEven ? '#444' : '#bbb');
    noStroke();
    triangle(x, height, x + spikeW/2, height - spikeH, x + spikeW, height);
  }

  // 檢查氣球是否碰到底部尖刺
  const spikeIndex = floor(balloon.x / spikeW);
  const spikeX = spikeIndex * spikeW;
  if(balloon.y + balloon.r >= height - spikeH){
    // only if horizontally within a spike
    if(balloon.x >= spikeX && balloon.x <= spikeX + spikeW){
      explode();
      return;
    }
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const gap = 240; // 增加角色間距
  const scale1 = 1.9;
  const scale2 = 1.9;

  // 若還沒按開始鈕，暫停互動但仍繪製場景
  if(!started){
    return;
  }

  const w1 = anim1.frameW * scale1;
  const w2 = anim2.frameW * scale2;

  // 更新並以 chars 的位置繪製角色（支援旋轉/飛行/縮放）
  anim1.update(); anim2.update();
  for(let i=0;i<chars.length;i++){
    const c = chars[i];
    // rotating animation
    if(c.rotating){
      const t = (millis() - c.rotateStart) / c.rotateDuration;
      c.angle = min(1, t) * TWO_PI; // 0 -> 2PI
      if(t >= 1){
        c.rotating = false;
        c.alive = false;
        c.vx = (i===0? -8 : 8);
        c.vy = -12;
      }
    }
    // flying out
    if(!c.alive){ c.x += c.vx; c.y += c.vy; c.vy += 0.6; }

    push(); translate(c.x, c.y); rotate(c.angle); scale(c.scale);
    if(i===0){ anim1.draw(0,0); } else { anim2.draw(0,0); }
    pop();
  }

  // 圓點控制：上下左右鍵，並使背景雲朝相反方向平移
  let vx = 0, vy = 0;
  if (keyIsDown(LEFT_ARROW)) vx = -balloon.speed;
  if (keyIsDown(RIGHT_ARROW)) vx = balloon.speed;
  if (keyIsDown(UP_ARROW)) vy = -balloon.speed;
  if (keyIsDown(DOWN_ARROW)) vy = balloon.speed;
  balloon.x += vx; balloon.y += vy;
  balloon.x = constrain(balloon.x, 0, width);
  balloon.y = constrain(balloon.y, 0, height);

  // 雲往相反方向移動（視差比例）
  const parallax = 0.25;
  for (let c of clouds){
    c.x += -vx * parallax;
    c.y += -vy * (parallax*0.6);
    // wrap around horizontally
    if(c.x < -c.w) c.x = width + c.w;
    if(c.x > width + c.w) c.x = -c.w;
    if(c.y < -c.h) c.y = height + c.h;
    if(c.y > height + c.h) c.y = -c.h;
  }

  // 畫半透明粉紅氣球（有高光、繩子與小結）
  push();
  noStroke();
  // 氣球身（半透明粉色）
  fill(255,182,193,180);
  ellipse(balloon.x, balloon.y, balloon.r*2, balloon.r*2*1.15);
  // 高光
  fill(255,230,240,160);
  ellipse(balloon.x - balloon.r*0.35, balloon.y - balloon.r*0.45, balloon.r*0.6, balloon.r*0.45);
  // 小結
  fill(230,120,140);
  triangle(balloon.x - 6, balloon.y + balloon.r*0.55, balloon.x + 6, balloon.y + balloon.r*0.55, balloon.x, balloon.y + balloon.r*0.75);
  pop();
  // 繩子
  push(); stroke(180); strokeWeight(1.2); noFill(); line(balloon.x, balloon.y + balloon.r*0.78, balloon.x, balloon.y + balloon.r*1.9); pop();

  // draw flames
  for(let i=flames.length-1;i>=0;i--){
    const f = flames[i];
    const t = (millis()-f.start)/1000;
    if(t>1.2){ flames.splice(i,1); continue; }
    const alpha = map(1-t,0,1,0,200);
    noStroke(); fill(255,120,10,alpha); ellipse(f.x, f.y - t*40, 14*(1-t)+4, 22*(1-t)+6);
    fill(255,200,40,alpha*0.8); ellipse(f.x+4, f.y - t*44, 8*(1-t)+2, 12*(1-t)+2);
  }

  // draw waves
  for(let i=waves.length-1;i>=0;i--){
    const w = waves[i];
    const t = (millis()-w.start)/1000;
    if(t> w.duration){ waves.splice(i,1); continue; }
    const r = easeOutQuad(t/w.duration) * w.maxR;
    const alpha = map(1 - t/w.duration,0,1,0,160);
    noFill(); stroke(80,180,255,alpha); strokeWeight(3*(1 - t/w.duration)+0.5);
    ellipse(w.x, w.y, r*2, r*2);
  }

  // 碰撞檢查（若沒有正在作答）
  if (!activeQuiz) {
    for (let i=0;i<chars.length;i++){
      const c = chars[i];
      const hitR = max(c.frameW*c.scale, c.frameH*c.scale)/2;
      const dx = balloon.x - c.x; const dy = balloon.y - c.y; const dist = sqrt(dx*dx + dy*dy);
      if (dist <= balloon.r + hitR){
        triggerQuiz(i);
        break;
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class SpriteAnimator {
  constructor(img, frameW, frameH, frames, fps = 10) {
    this.img = img;
    this.frameW = frameW;
    this.frameH = frameH;
    this.frames = frames;
    this.fps = fps;
    this.current = 0;
    this.last = millis();
    this.interval = 1000 / this.fps;
  }

  update() {
    if (!this.img) return;
    const now = millis();
    if (now - this.last >= this.interval) {
      this.current = (this.current + 1) % this.frames;
      this.last = now;
    }
  }

  draw(x, y, scale = 1) {
    if (!this.img) return;
    const sx = Math.round(this.current * this.frameW);
    const sy = 0;
    const sW = Math.round(this.frameW);
    const sH = Math.round(this.frameH);
    const dw = sW * scale;
    const dh = sH * scale;
    push();
    imageMode(CENTER);
    image(this.img, x, y, dw, dh, sx, sy, sW, sH);
    pop();
  }
}

// ---------- Quiz UI / logic ----------
function triggerQuiz(charIndex){
  if (gameEnded) return;
  if (activeQuiz) return;
  // non-consecutive rule: if same as lastAsked and other still needs questions, skip
  const otherRemaining = chars.some((c,idx)=> idx!==charIndex && c.correct < 2);
  if(lastAsked === charIndex && otherRemaining){ return; }

  const qIndex = floor(random(0, questions.length));
  activeQuiz = { charIndex, qIndex };
  lastAsked = charIndex;

  // 建立角色對話框（題目由角色說出）
  if(qDiv) qDiv.remove();
  qDiv = createDiv(); qDiv.style('position','absolute'); qDiv.style('background','#fff'); qDiv.style('color','#000'); qDiv.style('padding','10px'); qDiv.style('border-radius','12px'); qDiv.style('box-shadow','0 6px 18px rgba(0,0,0,0.12)');
  qDiv.style('font-weight','700'); qDiv.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  const q = questions[qIndex];
  qDiv.html('<strong>'+q.q+'</strong><br/>' + q.choices.join('<br/>'));

  // 建立圓點的回答泡泡（只有輸入框，無額外文字）
  if(inputWrap) inputWrap.remove();
  inputWrap = createDiv(); inputWrap.style('position','absolute'); inputWrap.style('background','rgba(255,230,255,0.92)'); inputWrap.style('padding','6px'); inputWrap.style('border-radius','12px'); inputWrap.style('box-shadow','0 6px 18px rgba(0,0,0,0.12)');
  inputWrap.style('font-weight','700'); inputWrap.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  inputEl = createInput(''); inputEl.parent(inputWrap); // 不要 placeholder
  inputEl.elt.addEventListener('keydown', (e)=>{ if(e.key==='Enter') submitAnswer(); });

  // 位置：角色上方顯示題目；圓點泡泡靠近圓點
  const cx = chars[charIndex].x; const cy = chars[charIndex].y;
  qDiv.position(cx - 160, cy - chars[charIndex].frameH*chars[charIndex].scale/2 - 140);
  inputWrap.position(balloon.x - 40, balloon.y + balloon.r + 6);
  inputEl.elt.focus();
}

function submitAnswer(){
  if (!activeQuiz) return;
  const q = questions[activeQuiz.qIndex];
  const val = inputEl.value().trim().toLowerCase();
  if (!val){ // show small tip near balloon
    showTip('請輸入答案'); return;
  }
  const letter = val[0];
  if (letter === q.ans){
    // 答對
    const idx = activeQuiz.charIndex; chars[idx].correct++;
    const s = createDiv('太聰明啦！');
    s.style('position','absolute'); s.style('background','rgba(200,255,200,0.9)'); s.style('color','#083'); s.style('padding','8px 12px'); s.style('border-radius','10px'); s.style('font-weight','700'); s.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
    s.position(chars[idx].x - 60, chars[idx].y - chars[idx].frameH*chars[idx].scale/2 - 60);
    setTimeout(()=>s.remove(),1500);
    // effect: blue wave
    waves.push({ x: chars[idx].x, y: chars[idx].y, start: millis(), duration: 0.9, maxR: 160 });
    // first correct: retreat and shrink
    if(chars[idx].correct === 1){
      chars[idx].x += (idx===0? -80 : 80);
      chars[idx].scale *= 0.75;
    }
    // second correct: rotate and fly out
    if(chars[idx].correct === 2){
      chars[idx].rotating = true; chars[idx].rotateStart = millis();
    }
    cleanupQuiz();
    // check victory: total correct answers >= 4
    const totalCorrect = chars.reduce((a,b)=>a+b.correct,0);
    if(totalCorrect >= 4 && !gameEnded){
      gameEnded = true;
      const f = createDiv('<div style="font-size:28px;font-weight:700;text-align:center;">恭喜闖關成功</div><div style="text-align:center;margin-top:8px;">遊戲結束!</div>');
      f.style('position','fixed'); f.style('left','50%'); f.style('top','36%'); f.style('transform','translate(-50%,-50%)'); f.style('background','rgba(255,255,255,0.95)'); f.style('padding','18px'); f.style('border-radius','10px'); f.style('font-weight','700'); f.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
        // restart button -> 返回開始畫面
        const rb = createButton('重新開始'); rb.style('position','fixed'); rb.style('left','50%'); rb.style('top','52%'); rb.style('transform','translate(-50%,-50%)'); rb.style('padding','10px 14px'); rb.style('background','rgba(255,182,193,0.9)'); rb.style('color','#fff'); rb.style('border','1px solid rgba(255,255,255,0.3)'); rb.style('border-radius','10px'); rb.style('font-weight','700'); rb.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
        rb.mousePressed(()=>{ f.remove(); rb.remove(); resetToStart(); });
    }
  } else {
    // show triangle + tip box near character without overlapping existing UI
    const idx = activeQuiz.charIndex;
    const hint = getHint(activeQuiz.qIndex);
    placeTriangleAndTip(idx, '再想想 這很簡單欸==<br/>' + hint);
    // spawn flames above character
    flames.push({ x: chars[idx].x, y: chars[idx].y - chars[idx].frameH*chars[idx].scale/2, start: millis() });
  }
}

function cleanupQuiz(){
  if (qDiv) { qDiv.remove(); qDiv = null; }
  if (inputEl) { inputEl.remove(); inputEl = null; }
  if (msgDiv) { msgDiv.remove(); msgDiv = null; }
  if (inputWrap) { inputWrap.remove(); inputWrap = null; }
  activeQuiz = null;
}

// 臨時提示框（顯示在圓點上方）
function showTip(text){
  const tip = createDiv(text); tip.style('position','absolute'); tip.style('background','#333'); tip.style('color','#fff'); tip.style('padding','6px 8px'); tip.style('border-radius','6px'); tip.style('font-size','14px');
  tip.position(balloon.x - 40, balloon.y - balloon.r - 36);
  setTimeout(()=>{ tip.remove(); }, 1400);
}

// place triangle and tip near character avoiding overlap with existing UI
function placeTriangleAndTip(charIndex, text){
  // remove old if exists
  let tri = createDiv(''); tri.style('position','absolute'); tri.style('width','0'); tri.style('height','0'); tri.style('border-left','10px solid transparent'); tri.style('border-right','10px solid transparent'); tri.style('border-bottom','16px solid #ffcc00');
  let tip = createDiv(text); tip.style('position','absolute'); tip.style('background','#333'); tip.style('color','#fff'); tip.style('padding','8px 10px'); tip.style('border-radius','6px'); tip.style('font-size','14px');
  tip.style('font-weight','700'); tip.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  // candidate positions around character
  const cx = chars[charIndex].x; const cy = chars[charIndex].y; const w = 120; const h = 40;
  const candidates = [
    {tx: cx + chars[charIndex].frameW*chars[charIndex].scale/2 + 12, ty: cy - 30},
    {tx: cx - chars[charIndex].frameW*chars[charIndex].scale/2 - 132, ty: cy - 30},
    {tx: cx - 60, ty: cy - chars[charIndex].frameH*chars[charIndex].scale/2 - 80},
    {tx: cx - 60, ty: cy + chars[charIndex].frameH*chars[charIndex].scale/2 + 12}
  ];
  // try placing without overlapping qDiv or inputWrap
  let placed = false;
  for (const c of candidates){
    tri.position(c.tx, c.ty);
    tip.position(c.tx - 10, c.ty - 40);
    const triBox = tri.elt.getBoundingClientRect();
    const tipBox = tip.elt.getBoundingClientRect();
    const overlaps = (el)=> el && el.elt && !(el.elt.getBoundingClientRect().right < tipBox.left || el.elt.getBoundingClientRect().left > tipBox.right || el.elt.getBoundingClientRect().bottom < tipBox.top || el.elt.getBoundingClientRect().top > tipBox.bottom);
    if(overlaps(qDiv) || overlaps(inputWrap)) continue;
    placed = true; break;
  }
  if(!placed){ tri.position(cx + 10, cy - 40); tip.position(cx + 10 - 10, cy - 80); }
  // auto remove after 2s
  setTimeout(()=>{ if(tri) tri.remove(); if(tip) tip.remove(); }, 2000);
}

// 根據題目索引回傳提示文字（答錯時顯示）
function getHint(qIndex){
  switch(qIndex){
    case 0:
      return '想一想「昨天」是過去發生的事情，英文動詞要用哪一種時態呢？';
    case 1:
      return '仔細看看選項，有一個不是生物，也不會動。';
    case 2:
      return '先排除意思是「放棄」和「照顧」的片語，剩下的再想想哪個和「開始」有關。';
    case 3:
      return '“can’t stand” 並不是「站不起來」，而是用來形容一件你很受不了的事。';
    case 4:
      return '前面說「我真的很累」，想一想累的時候最需要做的是什麼。';
    default:
      return '';
  }
}

function easeOutQuad(t){ return t*(2-t); }

// 遊戲結束：爆炸（尖刺）或其他原因
function explode(){
  if(gameEnded) return;
  gameEnded = true;
  started = false;
  // 顯示遊戲結束訊息
  const over = createDiv('遊戲結束💀'); over.style('position','fixed'); over.style('left','50%'); over.style('top','40%'); over.style('transform','translate(-50%,-50%)'); over.style('background','rgba(0,0,0,0.8)'); over.style('color','#fff'); over.style('padding','18px'); over.style('border-radius','10px'); over.style('font-weight','700'); over.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  // 重新開始按鈕
  const rb = createButton('重新開始'); rb.style('position','fixed'); rb.style('left','50%'); rb.style('top','54%'); rb.style('transform','translate(-50%,-50%)'); rb.style('padding','8px 12px'); rb.style('background','#ff77bb'); rb.style('color','#fff'); rb.style('border','none'); rb.style('border-radius','10px'); rb.style('font-weight','700'); rb.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  rb.mousePressed(()=>{ over.remove(); rb.remove(); resetToStart(); });
}

function resetToStart(){
  // 清理狀態
  gameEnded = false; started = false; activeQuiz = null; lastAsked = null;
  // 清除 UI
  if(qDiv){ qDiv.remove(); qDiv=null; }
  if(inputWrap){ inputWrap.remove(); inputWrap=null; }
  if(rulesDiv){ rulesDiv.remove(); rulesDiv = null; }
  // 清除 effects
  flames = []; waves = [];
  // reset characters
  const centerX = width/2; const centerY = height/2; const gap = 240;
  chars[0].correct = 0; chars[1].correct = 0;
  chars[0].scale = 2.4; chars[1].scale = 2.4;
  chars[0].angle = 0; chars[1].angle = 0; chars[0].vx=0; chars[1].vx=0; chars[0].vy=0; chars[1].vy=0; chars[0].alive=true; chars[1].alive=true; chars[0].rotating=false; chars[1].rotating=false;
  chars[0].x = centerX - (chars[0].frameW*chars[0].scale)/2 - gap/2; chars[0].y = centerY;
  chars[1].x = centerX + (chars[1].frameW*chars[1].scale)/2 + gap/2; chars[1].y = centerY;
  // show start UI
  createStartUI();
}

function createStartUI(){
  if(startBtn) { startBtn.remove(); startBtn=null; }
  if(startTxt) { startTxt.remove(); startTxt=null; }
  startBtn = createButton('開始遊戲');
  startBtn.style('position','fixed'); startBtn.style('left','50%'); startBtn.style('top','50%'); startBtn.style('transform','translate(-50%,-50%)');
  startBtn.style('font-size','26px'); startBtn.style('padding','14px 22px'); startBtn.style('background','rgba(255,182,193,0.85)'); startBtn.style('color','#fff'); startBtn.style('border','1px solid rgba(255,255,255,0.35)'); startBtn.style('border-radius','16px'); startBtn.style('box-shadow','0 8px 18px rgba(255,119,187,0.18)'); startBtn.style('cursor','pointer'); startBtn.style('font-weight','700'); startBtn.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  startTxt = createDiv('41xxx0078'); startTxt.style('position','fixed'); startTxt.style('left','50%'); startTxt.style('top','58%'); startTxt.style('transform','translate(-50%,-50%)'); startTxt.style('color','#333'); startTxt.style('font-size','14px'); startTxt.style('font-weight','700'); startTxt.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif');
  startBtn.mousePressed(()=>{ showRules(); });
}

// 顯示遊戲規則，按確認才開始遊戲
function showRules(){
  if(rulesDiv) return;
  rulesDiv = createDiv();
  rulesDiv.style('position','fixed'); rulesDiv.style('left','50%'); rulesDiv.style('top','50%'); rulesDiv.style('transform','translate(-50%,-50%)');
  rulesDiv.style('background','rgba(255,255,255,0.98)'); rulesDiv.style('padding','18px'); rulesDiv.style('border-radius','12px'); rulesDiv.style('width','min(720px,90%)'); rulesDiv.style('box-shadow','0 10px 30px rgba(0,0,0,0.18)');
  rulesDiv.style('font-family','"Comic Sans MS", "Chalkboard", sans-serif'); rulesDiv.style('font-weight','700');
  const rulesHtml = `
  <div style="font-size:22px;margin-bottom:10px;text-align:center;">遊戲規則</div>
  <div style="font-size:16px;line-height:1.6;">
  * 使用鍵盤↑ ↓ ← →鍵控制粉色氣球在畫面中移動<br/>
  * 當氣球碰到鹹蛋超人時 會觸發一個問題<br/>
  * 每成功回答一題 即算通過關卡的一部分<br/>
  * 四個問題全部回答正確後即闖關成功 遊戲結束<br/>
  * 若氣球不慎碰到下方尖刺 遊戲將立即結束並重新開始
  </div>
  `;
  rulesDiv.html(rulesHtml);
  const btnWrap = createDiv(); btnWrap.parent(rulesDiv); btnWrap.style('text-align','center'); btnWrap.style('margin-top','12px');
  const ok = createButton('開始'); ok.parent(btnWrap); ok.style('padding','8px 12px'); ok.style('background','rgba(255,182,193,0.95)'); ok.style('color','#fff'); ok.style('border','none'); ok.style('border-radius','10px'); ok.style('font-weight','700'); ok.style('margin-right','8px');
  const cancel = createButton('取消'); cancel.parent(btnWrap); cancel.style('padding','8px 12px'); cancel.style('background','#ddd'); cancel.style('color','#333'); cancel.style('border','none'); cancel.style('border-radius','10px'); cancel.style('font-weight','700');
  ok.mousePressed(()=>{
    // 正式開始遊戲
    started = true;
    if(startBtn){ startBtn.remove(); startBtn = null; }
    if(startTxt){ startTxt.remove(); startTxt = null; }
    if(rulesDiv){ rulesDiv.remove(); rulesDiv = null; }
  });
  cancel.mousePressed(()=>{ if(rulesDiv){ rulesDiv.remove(); rulesDiv = null; } });
}


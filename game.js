(() => {
  const teams = window.NBA_TEAMS;
  const canvas = document.getElementById('court');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  let view = 'play', selectSide = 'home', homeTeam = teams[19], awayTeam = teams[9], rosterTeam = homeTeam;
  let running = false, paused = false, ended = false, lastFrame = 0, gameTime = 120, shotClock = 14, homeScore = 0, awayScore = 0;
  let actors = [], ball = {x:500,y:300,z:0,vx:0,vy:0,vz:0,holder:0}, charge = 0, charging = false, keys = {}, lastAiShot = 0, toastTimer = 0, sound = true;
  let width = 0, height = 0, dpr = 1, courtBox = {x:0,y:0,w:0,h:0};
  const colors = ['#d4f36d','#a9d465','#d8cc78','#9fc3a0','#d3c88e','#c29a68'];
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function resize(){dpr=Math.min(devicePixelRatio||1,2);width=innerWidth;height=innerHeight;canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);courtBox={x:width*.075,y:height*.19,w:width*.85,h:height*.66};if(height<620)courtBox={x:width*.05,y:height*.17,w:width*.9,h:height*.7};}
  addEventListener('resize',resize);resize();
  const coord=(x,y)=>({x:courtBox.x+x/1000*courtBox.w,y:courtBox.y+y/600*courtBox.h});
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function court(){
    const {x,y,w,h}=courtBox;ctx.save();
    // arena glow and hardwood floor
    ctx.shadowColor='#000';ctx.shadowBlur=30;ctx.shadowOffsetY=14;roundRect(x-9,y-7,w+18,h+14,4);ctx.fillStyle='#171d19';ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    const grad=ctx.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,'#bf9665');grad.addColorStop(.48,'#d4ad79');grad.addColorStop(1,'#b98557');roundRect(x,y,w,h,2);ctx.fillStyle=grad;ctx.fill();
    ctx.save();roundRect(x,y,w,h,2);ctx.clip();
    for(let i=0;i<32;i++){const sy=y+i*h/32;ctx.fillStyle=i%2?'rgba(75,44,21,.035)':'rgba(255,235,184,.07)';ctx.fillRect(x,sy,w,h/32+1);ctx.strokeStyle='rgba(78,47,24,.13)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,sy);ctx.lineTo(x+w,sy);ctx.stroke();}
    for(let i=0;i<40;i++){const sx=x+(i*137%1000)/1000*w;ctx.strokeStyle='rgba(255,235,200,.035)';ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(sx,h+y);ctx.stroke();}
    ctx.restore();
    const sx=w/1000, sy=h/600;ctx.translate(x,y);ctx.scale(sx,sy);ctx.lineWidth=3.1;ctx.strokeStyle='rgba(71,43,27,.73)';
    ctx.strokeRect(2,2,996,596);ctx.beginPath();ctx.moveTo(500,2);ctx.lineTo(500,598);ctx.stroke();ctx.beginPath();ctx.arc(500,300,65,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(500,300,8,0,Math.PI*2);ctx.fillStyle='rgba(71,43,27,.7)';ctx.fill();
    // painted keys
    ctx.fillStyle='rgba(45,99,94,.22)';ctx.fillRect(2,195,180,210);ctx.fillRect(818,195,180,210);ctx.strokeRect(2,195,180,210);ctx.strokeRect(818,195,180,210);
    ctx.beginPath();ctx.arc(182,300,66,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.beginPath();ctx.arc(818,300,66,Math.PI/2,Math.PI*1.5);ctx.stroke();
    ctx.beginPath();ctx.arc(73,300,7,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(927,300,7,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(45,225);ctx.lineTo(45,375);ctx.stroke();ctx.beginPath();ctx.moveTo(955,225);ctx.lineTo(955,375);ctx.stroke();
    ctx.beginPath();ctx.arc(73,300,236,-1.17,1.17);ctx.stroke();ctx.beginPath();ctx.arc(927,300,236,Math.PI-1.17,Math.PI+1.17);ctx.stroke();
    // restricted zones / dashes
    ctx.setLineDash([6,7]);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(73,300,42,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.beginPath();ctx.arc(927,300,42,Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.setLineDash([]);
    // hoops and glass backboards
    ctx.lineWidth=4;ctx.strokeStyle='#e6e1d1';ctx.beginPath();ctx.moveTo(34,267);ctx.lineTo(34,333);ctx.moveTo(966,267);ctx.lineTo(966,333);ctx.stroke();ctx.fillStyle='#e87146';ctx.beginPath();ctx.arc(73,300,10,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(927,300,10,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.32)';ctx.font='700 18px Arial';ctx.textAlign='center';ctx.fillText('FULL COURT',500,288);ctx.font='700 8px Arial';ctx.fillText('PRO RUN  •  26',500,310);
    ctx.restore();
    // arena edge lighting
    const glow=ctx.createRadialGradient(width*.5,height*.09,5,width*.5,height*.1,width*.6);glow.addColorStop(0,'rgba(226,240,201,.09)');glow.addColorStop(1,'rgba(226,240,201,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height*.3);
  }
  function drawActor(a){
    const p=coord(a.x,a.y), scale=Math.max(.65,courtBox.h/470), team=a.team===0?homeTeam:awayTeam, jersey=a.team===0?colors[a.index]:'#e7e8e2';
    const bob=Math.sin(a.anim)*1.8*scale, r=13*scale;
    // floor shadow
    ctx.beginPath();ctx.ellipse(p.x+2,p.y+8*scale,13*scale,5*scale,0,0,Math.PI*2);ctx.fillStyle='rgba(18,19,14,.32)';ctx.fill();
    if(a.index===0&&a.team===0){ctx.beginPath();ctx.ellipse(p.x,p.y+10*scale,18*scale,8*scale,0,0,Math.PI*2);ctx.strokeStyle='#d2f36b';ctx.lineWidth=1.6;ctx.stroke();}
    // legs
    ctx.strokeStyle='#171918';ctx.lineWidth=4*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-4*scale,p.y+3*scale+bob);ctx.lineTo(p.x-5*scale,p.y+10*scale);ctx.moveTo(p.x+4*scale,p.y+3*scale+bob);ctx.lineTo(p.x+6*scale,p.y+10*scale);ctx.stroke();
    // jersey body and arms
    const shirt=team.color;ctx.fillStyle=shirt;ctx.beginPath();ctx.ellipse(p.x,p.y-2*scale,9*scale,12*scale,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=jersey;ctx.beginPath();ctx.ellipse(p.x,p.y+2*scale,7*scale,8*scale,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=shirt;ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo(p.x-7*scale,p.y-6*scale);ctx.lineTo(p.x-12*scale,p.y+1*scale);ctx.moveTo(p.x+7*scale,p.y-6*scale);ctx.lineTo(p.x+12*scale,p.y+1*scale);ctx.stroke();
    // head and hair
    const skin=['#a86d50','#c88968','#81533d','#d29a76'][a.index%4];ctx.fillStyle=skin;ctx.beginPath();ctx.arc(p.x,p.y-15*scale+bob,6*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#181918';ctx.beginPath();ctx.arc(p.x,p.y-17*scale+bob,5.5*scale,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font=`700 ${7*scale}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(team.players[a.index][2]).replace('00','0'),p.x,p.y+1*scale);
    if(a===actors[0]&&running){ctx.fillStyle='#d2f36b';ctx.beginPath();ctx.moveTo(p.x,p.y-31*scale);ctx.lineTo(p.x-4*scale,p.y-37*scale);ctx.lineTo(p.x+4*scale,p.y-37*scale);ctx.closePath();ctx.fill();}
  }
  function drawBall(){const p=coord(ball.x,ball.y),scale=Math.max(.65,courtBox.h/470),r=5.5*scale+ball.z*.012;ctx.beginPath();ctx.ellipse(p.x+2,p.y+6*scale,r*1.1,r*.48,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,.24)';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y-ball.z*scale*.43,r,0,Math.PI*2);const g=ctx.createRadialGradient(p.x-r*.3,p.y-ball.z*scale*.43-r*.5,1,p.x,p.y-ball.z*scale*.43,r);g.addColorStop(0,'#ffb366');g.addColorStop(1,'#c45b2e');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#6b3321';ctx.lineWidth=.8;ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-r,p.y-ball.z*scale*.43);ctx.lineTo(p.x+r,p.y-ball.z*scale*.43);ctx.moveTo(p.x,p.y-ball.z*scale*.43-r);ctx.lineTo(p.x,p.y-ball.z*scale*.43+r);ctx.stroke();}
  function drawMenuAtmosphere(){const now=performance.now()/1000;for(let i=0;i<70;i++){let x=(i*173+now*4)%width,y=(i*83+Math.sin(now*.5+i)*22)%height;ctx.fillStyle=`rgba(222,239,198,${.08+(i%3)*.035})`;ctx.fillRect(x,y,1,1);}}
  function render(){ctx.clearRect(0,0,width,height);if(running||view==='play'||view==='roster'||view==='controls'){court();if(running){actors.slice().sort((a,b)=>a.y-b.y).forEach(drawActor);drawBall();}else drawMenuAtmosphere();}requestAnimationFrame(render)}requestAnimationFrame(render);
  function buildTeams(){const grid=$('teamGrid');grid.innerHTML='';teams.forEach(t=>{const b=document.createElement('button');b.className='team-option';b.innerHTML=`<span class="mini-emblem" style="background:${t.color};color:#fff">${t.abbr}</span><span><strong>${t.name.toUpperCase()}</strong><small>${t.city.toUpperCase()}</small></span>`;b.onclick=()=>{if(selectSide==='home')homeTeam=t;else awayTeam=t;updateTeams();$('teamModal').classList.remove('visible');$('teamModal').setAttribute('aria-hidden','true');};grid.appendChild(b);});}
  function updateTeams(){ $('homeEmblem').textContent=homeTeam.abbr.replace('W','');$('homeEmblem').style.background=homeTeam.color;$('homeEmblem').style.color='#fff';$('homeTeamName').textContent=homeTeam.city.toUpperCase();$('homeTeamSub').textContent=homeTeam.name.toUpperCase();$('awayEmblem').textContent=awayTeam.abbr;$('awayEmblem').style.background=awayTeam.color;$('awayEmblem').style.color='#fff';$('awayTeamName').textContent=awayTeam.city.toUpperCase();$('awayTeamSub').textContent=awayTeam.name.toUpperCase();$('featuredName').textContent=homeTeam.players[0][0];$('featuredMeta').textContent=`${homeTeam.players[0][1]} · ${homeTeam.city.toUpperCase()} ${homeTeam.name.toUpperCase()}`;}
  function showView(name){view=name;document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));$(name==='play'?'homeView':name==='roster'?'rosterView':name==='controls'?'controlsView':'gameView').classList.add('active');document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='roster')renderRoster();}
  function startGame(){homeScore=awayScore=0;gameTime=120;shotClock=14;ended=false;paused=false;running=true;$('pauseOverlay').classList.remove('visible');$('gameEnd').classList.remove('visible');$('homeScore').textContent='00';$('awayScore').textContent='00';$('gameHomeName').textContent=homeTeam.abbr;$('gameAwayName').textContent=awayTeam.abbr;$('gameHomeIcon').textContent=homeTeam.abbr;$('gameHomeIcon').style.background=homeTeam.color;$('gameAwayIcon').textContent=awayTeam.abbr;$('gameAwayIcon').style.background=awayTeam.color; $('periodLabel').textContent='1ST QUARTER';actors=[];
    // User is the first home player; two teammates and three defenders complete the half-court run.
    [[330,300],[285,205],[285,395]].forEach((p,i)=>actors.push({x:p[0],y:p[1],team:0,index:i,anim:0,tx:p[0],ty:p[1]}));
    [[620,285],[680,205],[680,395]].forEach((p,i)=>actors.push({x:p[0],y:p[1],team:1,index:i,anim:0,tx:p[0],ty:p[1]}));
    ball={x:actors[0].x,y:actors[0].y-4,z:0,vx:0,vy:0,vz:0,holder:0};charge=0;charging=false;lastAiShot=0;lastFrame=performance.now();$('shotClock').textContent='14';$('shotMeter').classList.remove('visible');showView('game');toast('YOUR POSSESSION');}
  function toast(txt){const el=$('gameToast');el.textContent=txt;el.classList.add('show');toastTimer=1.5;}
  function nearestOpponent(a){return actors.filter(x=>x.team!==a.team).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];}
  function releaseShot(){if(!charging)return;charging=false;$('shotMeter').classList.remove('visible');const shooter=actors[ball.holder];if(!shooter||shooter.team!==0){if(shooter&&shooter.team===1){attemptSteal();}return;}
    const timing=Math.abs(charge-.78),dist=Math.hypot(927-shooter.x,300-shooter.y);const defender=nearestOpponent(shooter),pressure=defender?Math.max(0,1-Math.hypot(defender.x-shooter.x,defender.y-shooter.y)/95):0;let chance=clamp(.77-dist/1000-timing*.75-pressure*.19,.12,.87);const hit=Math.random()<chance;const points=dist>315?3:2;ball.holder=-1;ball.shooterTeam=0;ball.x=shooter.x;ball.y=shooter.y;ball.z=25;ball.vx=(927-shooter.x)*.025;ball.vy=(300-shooter.y)*.025;ball.vz=6.9;ball.targetX=927;ball.targetY=300;ball.outcome=hit?'make':'miss';ball.points=points;ball.flight=0;shotClock=14;toast(hit?(points===3?'GREEN RELEASE!':'LET IT FLY!'):'SHOT UP');}
  function attemptSteal(){const carrier=actors[ball.holder];if(!carrier||carrier.team!==1)return;const d=Math.hypot(actors[0].x-carrier.x,actors[0].y-carrier.y);if(d<55&&Math.random()<.54){ball.holder=0;toast('STEAL!');shotClock=14;}else if(d<80)toast('CONTEST!');}
  function update(dt){if(!running||paused||ended)return;gameTime-=dt;shotClock-=dt;const user=actors[0];let speed=keys.Shift?210:145,dx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),dy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0),norm=Math.hypot(dx,dy)||1;user.x=clamp(user.x+dx/norm*speed*dt,35,965);user.y=clamp(user.y+dy/norm*speed*dt,40,560);user.anim+=dt*12;
    actors.forEach((a,i)=>{if(i===0)return;a.anim+=dt*9;const carrier=actors[ball.holder];if(a.team===0){const target=[[330,300],[300,185],[300,415]][a.index];a.tx=target[0];a.ty=target[1];}else if(carrier&&carrier.team===1){if(i===3){a.tx=carrier.x+48;a.ty=clamp(carrier.y,215,385);}else{a.tx=carrier.x+70;a.ty=a.index===1?175:425;}}else{const target=actors[a.index===0?0:a.index];a.tx=target.x+(a.index===0?65:35);a.ty=target.y+(a.index===0?0:a.index===1?-55:55);}
      const dd=Math.hypot(a.tx-a.x,a.ty-a.y)||1,sp=a.team===1?80:48;a.x+=((a.tx-a.x)/dd)*Math.min(dd,sp*dt);a.y+=((a.ty-a.y)/dd)*Math.min(dd,sp*dt);a.x=clamp(a.x,30,970);a.y=clamp(a.y,35,565);
    });
    if(ball.holder>=0){const h=actors[ball.holder];ball.x=h.x+6;ball.y=h.y-4+Math.abs(Math.sin(performance.now()/90))*3;ball.z=0;}
    else{ball.flight+=dt;ball.x+=ball.vx;ball.y+=ball.vy;ball.z+=ball.vz;ball.vz-=.34;ball.vx*=.986;ball.vy*=.986;if(ball.z<=0){const outcome=ball.outcome;const goesIn=outcome==='make';if(goesIn){const shooterTeam=ball.shooterTeam??0;if(shooterTeam===0)homeScore+=ball.points;else awayScore+=ball.points;}else{const nearest=actors.slice().sort((a,b)=>Math.hypot(a.x-ball.x,a.y-ball.y)-Math.hypot(b.x-ball.x,b.y-ball.y))[0];ball.holder=nearest?.team===1?3:0;}
      if(goesIn){$('homeScore').textContent=String(homeScore).padStart(2,'0');$('awayScore').textContent=String(awayScore).padStart(2,'0');const poss=awayScore>homeScore?3:0;ball.holder=poss;actors[poss].x=poss===0?330:670;actors[poss].y=300;actors[0].x=poss===0?330:650;actors[0].y=300;shotClock=14;toast(poss===0?'YOUR BALL':'THEY ANSWER');}else{ball.x=actors[ball.holder].x;ball.y=actors[ball.holder].y;shotClock=14;toast('REBOUND');}
      if(homeScore>=21||awayScore>=21){finishGame();}
    }}
    // Defensive AI occasionally drives then releases toward its basket.
    if(ball.holder>=3){const carrier=actors[ball.holder];carrier.x=Math.max(95,carrier.x-35*dt);carrier.y+=Math.sin(performance.now()/650)*18*dt;if(performance.now()-lastAiShot>7500&&carrier.x<430){lastAiShot=performance.now();ball.holder=-1;ball.x=carrier.x;ball.y=carrier.y;ball.vx=-9;ball.vy=(300-carrier.y)*.06;ball.vz=7;ball.targetX=73;ball.outcome=Math.random()<.38?'make':'miss';ball.points=2;ball.shooterTeam=1;ball.flight=0;toast('DEFEND THE RIM');}}
    if(ball.holder===0){if(charging){charge=clamp(charge+dt*.72,0,1);$('meterFill').style.width=`${charge*100}%`;$('meterFeedback').textContent=charge>.7&&charge<.86?'GREEN WINDOW':charge>=1?'RELEASE!':'TIMING';$('shotMeter').classList.add('visible');}}
    else if(ball.holder>=3){const dist=Math.hypot(actors[0].x-actors[ball.holder].x,actors[0].y-actors[ball.holder].y);if(keys.Space&&dist<68)attemptSteal();}
    if(ball.holder>=0&&ball.holder<3&&ball.holder!==0&&user.x>650&&Math.hypot(user.x-actors[ball.holder].x,user.y-actors[ball.holder].y)<65&&keys.Space)ball.holder=0;
    $('gameClock').textContent=`${Math.floor(Math.max(0,gameTime)/60)}:${String(Math.floor(Math.max(0,gameTime)%60)).padStart(2,'0')}`;$('shotClock').textContent=String(Math.max(0,Math.ceil(shotClock))).padStart(2,'0');$('gameHint').innerHTML=ball.holder===0?'YOUR POSSESSION <span>·</span> ATTACK THE RIM':'DEFENSE <span>·</span> STAY IN FRONT';if(shotClock<=0){shotClock=14;if(ball.holder===0){ball.holder=3;toast('SHOT CLOCK VIOLATION');}}
    if(gameTime<=0){if(homeScore===awayScore){gameTime=30;$('periodLabel').textContent='OVERTIME';$('gameClock').textContent='0:30';}else finishGame();}if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('gameToast').classList.remove('show');}
  }
  function finishGame(){if(ended)return;ended=true;running=false;$('finalTitle').textContent=homeScore===awayScore?'OVERTIME.':homeScore>awayScore?'YOU OWNED IT.':'RUN IT BACK.';$('finalSummary').textContent=`${homeTeam.name} ${homeScore} — ${awayScore} ${awayTeam.name}. ${homeScore>awayScore?'A statement win.':homeScore===awayScore?'All tied up. Next bucket wins.':'There’s always another game.'}`;$('gameEnd').classList.add('visible');}
  function renderRoster(){const list=$('rosterTeams');list.innerHTML='';teams.forEach(t=>{const b=document.createElement('button');b.className='roster-team'+(t===rosterTeam?' active':'');b.innerHTML=`<span class="mini-emblem">${t.abbr}</span><strong>${t.name.toUpperCase()}</strong>`;b.onclick=()=>{rosterTeam=t;renderRoster()};list.appendChild(b)});const detail=$('rosterDetail');detail.innerHTML=`<div class="roster-title"><span class="mini-emblem">${rosterTeam.abbr}</span><div><h3>${rosterTeam.city.toUpperCase()} ${rosterTeam.name.toUpperCase()}</h3><small>PRO RUN · PLAYER LINEUP</small></div></div>`+rosterTeam.players.map((p,i)=>`<div class="player-row"><span class="jersey">${String(p[2]).replace('00','0')}</span><strong>${p[0]}</strong><small>${p[1]}</small><span>${i===0?'STARTER':i<5?'ROTATION':'BENCH'}</span></div>`).join('');}
  $('homeButton').onclick=()=>showView('play');document.querySelectorAll('.nav-link').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('playButton').onclick=startGame;$('matchPlay').onclick=startGame;$('controlsPlay').onclick=startGame;$('homeTeamSelect').onclick=()=>openTeam('home');$('awayTeamSelect').onclick=()=>openTeam('away');$('closeModal').onclick=()=>{$('teamModal').classList.remove('visible');$('teamModal').setAttribute('aria-hidden','true')};function openTeam(side){selectSide=side;buildTeams();$('teamModal').classList.add('visible');$('teamModal').setAttribute('aria-hidden','false');}
  $('pauseButton').onclick=()=>{paused=true;$('pauseOverlay').classList.add('visible')};$('resumeButton').onclick=()=>{paused=false;$('pauseOverlay').classList.remove('visible');lastFrame=performance.now()};$('exitGame').onclick=$('pauseExit').onclick=()=>{running=false;paused=false;$('pauseOverlay').classList.remove('visible');showView('play')};$('rematchButton').onclick=startGame;$('endHome').onclick=()=>{ $('gameEnd').classList.remove('visible');showView('play')};$('soundButton').onclick=()=>{sound=!sound;$('soundButton').innerHTML=sound?'♫ <span>SOUND ON</span>':'♫ <span>SOUND OFF</span>';};
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys[k===' '?'Space':k]=true;if(k===' '&&!charging){charging=true;charge=0;}});
  addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k===' '?'Space':k]=false;if(k===' '){if(ball.holder===0)releaseShot();else attemptSteal();}});
  function bindTouch(el,down,up){el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);down()});el.addEventListener('pointerup',e=>{e.preventDefault();up()});el.addEventListener('pointercancel',up)}
  bindTouch($('mobileShoot'),()=>{charging=true;charge=0},()=>{if(ball.holder===0)releaseShot();else attemptSteal()});bindTouch($('mobileSprint'),()=>keys.Shift=true,()=>keys.Shift=false);
  // On touch, drag anywhere on the court to steer the active player.
  let touchOrigin=null;canvas.addEventListener('pointerdown',e=>{if(!running||e.pointerType==='mouse')return;touchOrigin={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!touchOrigin||!running)return;const dx=e.clientX-touchOrigin.x,dy=e.clientY-touchOrigin.y;keys.d=dx>8;keys.a=dx< -8;keys.s=dy>8;keys.w=dy< -8});canvas.addEventListener('pointerup',()=>{touchOrigin=null;keys.w=keys.a=keys.s=keys.d=false});
  function loop(now){const dt=Math.min(.04,(now-lastFrame)/1000||0);lastFrame=now;update(dt);requestAnimationFrame(loop)}requestAnimationFrame(loop);updateTeams();renderRoster();
})();

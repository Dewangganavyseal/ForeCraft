'use strict';
/* SFX prosedural WebAudio */
const Sfx={
  ctx:null,master:null,rainGain:null,ok:false,
  init(){
    if(this.ctx)return;
    try{
      this.ctx=new(window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain();this.master.gain.value=0.5;
      this.master.connect(this.ctx.destination);
      this.makeRain();this.ok=true;
    }catch(e){}
  },
  /* ---------- SUARA BERBASIS JARAK ----------
     Dulu semua SFX dimainkan dengan volume penuh, jadi pukulan NPC yang
     bertarung 40 blok jauhnya tetap terdengar sekencang pukulan kita sendiri.
     `vs` adalah pengali volume sementara: diisi oleh at()/near() sebelum
     memanggil SFX, lalu dikembalikan ke 1.

     REF = jarak "volume penuh", MAX = jarak di mana suara hilang total. */
  vs:1,SND_REF:6,SND_MAX:26,
  /* pengali volume untuk sumber suara di posisi `pos` (0 = tak terdengar) */
  falloff(pos){
    if(!pos||typeof Player==='undefined'||!Player.pos)return 1;
    const d=Math.hypot(pos.x-Player.pos.x,pos.y-Player.pos.y,pos.z-Player.pos.z);
    if(d<=this.SND_REF)return 1;
    if(d>=this.SND_MAX)return 0;
    /* peredaman kuadratik: terasa cepat menjauh tapi tidak terpotong kasar */
    const k=1-(d-this.SND_REF)/(this.SND_MAX-this.SND_REF);
    return k*k;
  },
  /* mainkan SFX apa pun dengan peredaman jarak:
       Sfx.at(mob.pos,'hit')  atau  Sfx.at(pos,'swing',2)  */
  at(pos,name,...args){
    if(!this.ok||typeof this[name]!=='function')return;
    const k=this.falloff(pos);
    if(k<=0.02)return;                 // terlalu jauh: lewati sama sekali
    const prev=this.vs;this.vs=prev*k;
    try{this[name](...args);}finally{this.vs=prev;}
  },
  tone(f,dur,type='sine',vol=0.2,slide=0){
    if(!this.ok)return;const c=this.ctx,t=c.currentTime;
    vol*=this.vs;
    if(vol<=0.0005)return;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.linearRampToValueAtTime(Math.max(20,f+slide),t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);

    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+0.02);
  },
  noiseBurst(dur,vol,freq=900){
    if(!this.ok)return;const c=this.ctx,t=c.currentTime;
    vol*=this.vs;
    if(vol<=0.0005)return;
    const len=Math.max(1,(dur*c.sampleRate)|0);

    const buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
    const s=c.createBufferSource();s.buffer=buf;
    const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;
    const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t);
  },
  makeRain(){
    const c=this.ctx,len=2*c.sampleRate;
    const buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const s=c.createBufferSource();s.buffer=buf;s.loop=true;
    const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=650;
    this.rainGain=c.createGain();this.rainGain.gain.value=0;
    s.connect(f);f.connect(this.rainGain);this.rainGain.connect(this.master);s.start();
  },
  setRain(v){if(this.ok&&this.rainGain)this.rainGain.gain.value=v*0.22;},
  swing(i){this.noiseBurst(0.1,0.09,1300+i*280);this.tone(320-i*25,0.09,'triangle',0.05,-180);},
  /* pukulan tangan kosong: desing angin frekuensi rendah + 'thud' tumpul,
     berbeda jelas dari swing() pedang yang tinggi & tajam */
  punch(i){
    this.noiseBurst(0.07,0.06,420+i*90);
    this.tone(150-i*10,0.1,'sine',0.09,-70);
  },
  hit(){this.noiseBurst(0.07,0.24,950);this.tone(150,0.11,'square',0.13,-50);},
  hurt(){this.tone(120,0.24,'sawtooth',0.22,-50);this.noiseBurst(0.15,0.12,500);},
  splash(big){this.noiseBurst(big?0.5:0.16,big?0.32:0.12,650);},
  /* semburan asam lizard: desis basah + cipratan */
  cast(){this.noiseBurst(0.2,0.2,720);this.tone(280,0.16,'sawtooth',0.1,-130);},
  chop(){this.noiseBurst(0.09,0.2,420);this.tone(180,0.08,'square',0.08,-60);},
  rock(){this.noiseBurst(0.12,0.22,300);},
  eat(){this.tone(400,0.07,'sine',0.14);setTimeout(()=>this.tone(300,0.08,'sine',0.12),90);},
  craft(){this.tone(330,0.09,'triangle',0.15);setTimeout(()=>this.tone(440,0.09,'triangle',0.15),90);setTimeout(()=>this.tone(550,0.12,'triangle',0.15),180);},
  levelup(){[392,494,587,784].forEach((f,i)=>setTimeout(()=>this.tone(f,0.22,'triangle',0.2),i*110));},
  smash(){this.noiseBurst(0.6,0.5,280);this.tone(55,0.5,'sine',0.4,-20);},
  /* raungan singa: dengung rendah berlapis + desau napas kuat */
  roar(){this.noiseBurst(0.55,0.45,240);this.tone(90,0.65,'sawtooth',0.30,-45);
    this.tone(58,0.75,'square',0.20,-18);this.tone(140,0.3,'sawtooth',0.12,-60);},
  thunder(){this.noiseBurst(1.6,0.45,180);},
  pickup(){this.tone(660,0.07,'sine',0.12,200);},

  /* ===================== SFX tambahan per-aksi ===================== */

  /* lompat: whoosh naik nada */
  jump(){
    this.tone(300,0.13,'sine',0.10,240);
    this.noiseBurst(0.07,0.05,1500);
  },
  /* mendarat: intensitas mengikuti kecepatan jatuh */
  land(power=1){
    const p=clamp(power,0,1);
    this.noiseBurst(0.09+p*0.09,0.10+p*0.22,260+p*180);
    this.tone(90-p*25,0.13,'sine',0.09+p*0.13,-35);
  },
  /* langkah kaki: frekuensi diacak agar tidak monoton */
  step(inWater){
    if(inWater){this.noiseBurst(0.1,0.10,520);return;}
    this.noiseBurst(0.05,0.055,340+Math.random()*220);
  },
  /* dash / roll: sapuan udara cepat (bandpass sweep) */
  dash(){
    if(!this.ok)return;const c=this.ctx,t=c.currentTime;
    const len=Math.max(1,(0.26*c.sampleRate)|0);
    const buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++){
      const k=i/len;
      d[i]=(Math.random()*2-1)*Math.sin(Math.PI*k)*0.9;
    }
    const s=c.createBufferSource();s.buffer=buf;
    const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=1.1;
    f.frequency.setValueAtTime(420,t);
    f.frequency.linearRampToValueAtTime(1900,t+0.26);
    const g=c.createGain();g.gain.setValueAtTime(0.20,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.26);
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t);
  },
  /* serangan kritikal: lebih tajam + berdentang */
  crit(){
    this.noiseBurst(0.09,0.30,2600);
    this.tone(880,0.14,'square',0.14,-360);
    setTimeout(()=>this.tone(1320,0.1,'triangle',0.10,-200),35);
  },
  /* pedang mengenai benda keras */
  parry(){
    this.tone(1500,0.09,'square',0.12,-700);
    this.noiseBurst(0.06,0.14,3000);
  },
  /* monster mati */
  monsterDie(){
    this.tone(190,0.3,'sawtooth',0.18,-140);
    this.noiseBurst(0.26,0.18,420);
    setTimeout(()=>this.tone(90,0.24,'sine',0.12,-40),110);
  },
  /* geraman monster saat mendeteksi pemain */
  growl(pitch=1){
    this.tone(88*pitch,0.42,'sawtooth',0.14,26*pitch);
    this.noiseBurst(0.3,0.07,240);
  },
  /* pemain mati */
  die(){
    [330,262,196,131].forEach((f,i)=>
      setTimeout(()=>this.tone(f,0.4,'triangle',0.2,-30),i*170));
    this.noiseBurst(0.7,0.2,300);
  },
  /* HP kritis */
  lowHp(){
    this.tone(720,0.1,'sine',0.10);
    setTimeout(()=>this.tone(720,0.1,'sine',0.10),160);
  },
  /* stamina tidak cukup */
  noStamina(){this.tone(180,0.14,'square',0.07,-70);},
  /* UI */
  click(){this.tone(700,0.04,'square',0.055);},
  open(){this.tone(420,0.08,'sine',0.09,180);},
  close(){this.tone(600,0.08,'sine',0.09,-180);},
  /* ambil skill */
  skill(){
    [523,659,784].forEach((f,i)=>
      setTimeout(()=>this.tone(f,0.16,'triangle',0.16),i*70));
  },
  /* minum */
  drink(){
    this.tone(240,0.1,'sine',0.11,90);
    setTimeout(()=>this.tone(320,0.12,'sine',0.10,120),110);
  },
  /* serangan tertahan armor */
  armorHit(){this.noiseBurst(0.08,0.2,1800);this.tone(260,0.1,'square',0.1,-90);},
};

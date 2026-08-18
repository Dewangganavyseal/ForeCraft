'use strict';
/* ---------------------------------------------------------------------------
   PENGEMBARA LANGKA (RARE NPC)
   ---------------------------------------------------------------------------
   Penyihir Elf & Raksasa Batu bukan penduduk desa: mereka berjalan dari satu
   desa ke desa lain sambil "mengerjakan quest" mereka sendiri. Supaya murah,
   yang selalu disimulasi hanyalah TITIK POSISI di dunia (x,z) — mesh 3D baru
   dibuat saat pemain masuk CFG.RARE.SHOW_R dan dilepas kembali di HIDE_R.

   Siklus hidup satu pengembara:
     travel → berjalan menuju desa tujuan (di luar pandangan: garis lurus)
     rest   → berhenti di desa, digambarkan sedang menerima permintaan
     quest  → "mengerjakan quest" (jalan memutar di sekitar desa)
     lalu memilih desa tujuan berikutnya, begitu terus sampai:
       - direkrut pemain (dikeluarkan dari sistem ini, jadi rekan biasa), atau
       - tewas, atau
       - pemain menjauh > CFG.RARE.ROAM_R (pengembara dilepas, nanti muncul lagi).
--------------------------------------------------------------------------- */
const RareNPC={
  list:[],        // daftar pengembara (data ringan, tidak selalu punya mesh)
  cd:8,           // hitung mundur kemunculan berikutnya (awal lebih cepat)

  /* judul "quest" yang sedang dikerjakan pengembara — hanya untuk rasa dunia
     hidup: ditampilkan lewat celetukan saat pemain berada di dekatnya */
  QUESTS:[
    'mengantar surat tetua',
    'mencari kristal yang hilang',
    'memetakan sarang monster',
    'menukar ramuan langka',
    'mengawal pedagang',
    'menyelidiki reruntuhan tua',
  ],

  /* ---------- utilitas desa ----------
     Desa dihasilkan prosedural (WGEN.villageInCell), jadi daftar desa di
     sekitar sebuah titik bisa dihitung kapan pun tanpa chunk termuat. */
  villagesAround(x,z,cells){
    const G=WGEN.VILLAGE_GRID,out=[];
    const gx=Math.floor(x/G),gz=Math.floor(z/G);
    const R=cells||3;
    for(let dz=-R;dz<=R;dz++)for(let dx=-R;dx<=R;dx++){
      const v=WGEN.villageInCell(gx+dx,gz+dz);
      if(v)out.push(v);
    }
    return out;
  },
  /* desa tujuan berikutnya: bukan desa saat ini, dan masih dalam jangkauan
     jelajah supaya pengembara tidak berjalan keluar dunia yang diamati */
  nextVillage(from){
    const pool=this.villagesAround(from.x,from.z,2).filter(v=>
      (v.x!==from.x||v.z!==from.z)&&
      Math.hypot(v.x-Player.pos.x,v.z-Player.pos.z)<CFG.RARE.ROAM_R);
    if(!pool.length)return null;
    /* desa yang lebih dekat lebih sering dipilih supaya perjalanannya wajar */
    pool.sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z));
    const i=Math.min(pool.length-1,Math.floor(Math.random()*Math.min(3,pool.length)));
    return pool[i];
  },

  /* ---------- kemunculan ---------- */
  roles(){return NPC_ROLES.filter(r=>r.rare);},
  activeCount(){
    /* pengembara yang sudah direkrut tidak dihitung lagi */
    return this.list.filter(w=>!w.gone).length;
  },
  trySpawn(){
    if(this.activeCount()>=CFG.RARE.MAX)return;
    if(Math.random()>=CFG.RARE.SPAWN_CHANCE)return;
    /* mulai dari desa yang agak jauh dari pemain: pengembara harus terasa
       datang dari kejauhan, bukan muncul tiba-tiba di depan mata.
       BUGFIX: bila tidak ada desa yang memenuhi syarat jarak (mis. pemain
       sedang jauh dari semua desa), dulu spawn dibatalkan total sehingga NPC
       langka nyaris tidak pernah muncul. Sekarang ada fallback: pakai desa
       terjauh yang ada dalam jangkauan jelajah. */
    const all=this.villagesAround(Player.pos.x,Player.pos.z,2);
    if(!all.length)return;
    let pool=all.filter(v=>{
      const d=Math.hypot(v.x-Player.pos.x,v.z-Player.pos.z);
      return d>CFG.RARE.SHOW_R+8&&d<CFG.RARE.ROAM_R*0.8;
    });
    if(!pool.length){
      /* fallback: desa dalam jangkauan jelajah, diurutkan dari yang terjauh */
      pool=all.filter(v=>Math.hypot(v.x-Player.pos.x,v.z-Player.pos.z)<CFG.RARE.ROAM_R)
        .sort((a,b)=>Math.hypot(b.x-Player.pos.x,b.z-Player.pos.z)-
                     Math.hypot(a.x-Player.pos.x,a.z-Player.pos.z));
      if(!pool.length)return;
      pool=pool.slice(0,2);
    }
    const start=pool[Math.floor(Math.random()*pool.length)];
    /* pilih role yang BELUM aktif supaya percobaan spawn tidak terbuang dan
       semua arketipe langka bergantian muncul */
    const roles=this.roles().filter(r=>!this.list.some(w=>!w.gone&&w.role.id===r.id));
    if(!roles.length)return;
    const role=roles[Math.floor(Math.random()*roles.length)];
    const dest=this.nextVillage(start)||start;   // fallback: berdiam di desa asal
    /* sebagian besar pengembara "mampir ke tavern" desa tujuan: ia menunggu di
       dalam tavern sehingga pemain bisa menemuinya di sana, bukan hanya di
       jalan antar desa. */
    const toTavern=Math.random()<0.65;
    this.list.push({
      role,
      x:start.x+rand(-6,6),z:start.z+rand(-6,6),
      from:start,dest,
      phase:toTavern?'travel':'travel',t:0,
      tavernVisit:toTavern,
      quest:this.QUESTS[Math.floor(Math.random()*this.QUESTS.length)],
      npc:null,gone:false,sayT:rand(4,12),
    });
  },

  /* ---------- mesh: tampil & sembunyi ----------
     Entitas NPC sesungguhnya (yang bisa diajak bicara, direkrut, dilukai)
     hanya ada selama pemain dekat. `home` diarahkan ke desa tujuan supaya AI
     patroli bawaan NPCS menuntunnya berjalan ke sana. */
  show(w){
    if(w.npc)return;
    const gx=Math.floor(w.x),gz=Math.floor(w.z);
    let y=World.topY(gx,gz);
    if(y===undefined||y===null||!isFinite(y))return;   // chunk belum termuat
    /* BUGFIX atap: bila posisi pengembara ada DI DALAM bangunan (mis. tavern),
       topY mengenai GENTENG sehingga mesh muncul berdiri di atas atap. Interior
       desa selalu rata CFG.SEA, jadi pakai itu sebagai lantai spawn. */
    if(typeof WGEN!=='undefined'&&WGEN.buildingAt&&WGEN.buildingAt(w.x,w.z,0))y=CFG.SEA;
    const lvl=6+Math.floor(Math.random()*6);           // pengembara relatif kuat
    const n=NPCS.make(w.role,w.x,y,w.z,{x:w.dest.x,z:w.dest.z},lvl);
    n.wander=true;                                     // jangan dibuang update NPCS
    n.rareRef=w;
    NPCS.list.push(n);
    w.npc=n;
    UI.toast(`${w.role.e} ${w.role.name} sedang melintas — dekati dan tekan G`);
    FX.debris(n.pos.clone().add(new THREE.Vector3(0,1.4,0)),0xbfe4ff,10,2.2);
  },
  hide(w){
    if(!w.npc)return;
    const i=NPCS.list.indexOf(w.npc);
    if(i>=0)NPCS.despawn(i);
    w.npc=null;
  },
  /* pengembara dilepas total (terlalu jauh / sudah tewas / direkrut) */
  drop(w){
    if(!w.gone)this.hide(w);
    w.gone=true;
  },

  /* =========================================================================
     SIMULASI DI LUAR PANDANGAN
     -------------------------------------------------------------------------
     Tanpa mesh & tanpa fisika: posisi digeser lurus ke desa tujuan dengan
     SIM_SPEED blok/detik. Ini cukup karena pemain tidak bisa melihatnya, dan
     hasilnya tetap konsisten — saat pemain mendekat, pengembara memang sudah
     berada di tengah perjalanan.
     ========================================================================= */
  simulate(w,dt){
    if(w.phase==='tavern'){
      /* menunggu di dalam tavern: posisi dijaga di titik tengah tavern
         (sedikit acak) supaya pemain bisa menemuinya di sana */
      w.t-=dt;
      if(w.t<=0)this.nextLeg(w);
      return;
    }
    if(w.phase==='rest'){
      w.t-=dt;
      if(w.t<=0){
        /* pengembara yang berencana mampir ke tavern langsung masuk ke tavern
           desa tujuan; sisanya mengerjakan quest berputar di sekitar desa */
        if(w.tavernVisit&&w.dest&&w.dest.tavern)this.beginTavern(w);
        else this.beginQuest(w);
      }
      return;
    }
    if(w.phase==='quest'){
      w.t-=dt;
      /* berputar di sekitar desa selama mengerjakan quest */
      const a=(CFG.RARE.QUEST_TIME-w.t)*0.6;
      w.x=w.dest.x+Math.cos(a)*(w.dest.r+6);
      w.z=w.dest.z+Math.sin(a)*(w.dest.r+6);
      if(w.t<=0)this.nextLeg(w);
      return;
    }
    /* travel */
    const dx=w.dest.x-w.x,dz=w.dest.z-w.z;
    const d=Math.hypot(dx,dz);
    if(d<3){this.arrive(w);return;}
    const step=Math.min(d,CFG.RARE.SIM_SPEED*dt);
    w.x+=dx/d*step;w.z+=dz/d*step;
  },
  arrive(w){
    w.phase='rest';w.t=CFG.RARE.REST;
    w.from=w.dest;
  },
  /* ---------- mampir ke TAVERN desa tujuan ----------
     Pengembara duduk/berdiri di dalam tavern selama TAVERN_STAY detik. Selama
     itu pemain bisa menemuinya di dalam tavern (selain di jalan antar desa). */
  beginTavern(w){
    const tv=w.dest&&w.dest.tavern;
    if(!tv){this.beginQuest(w);return;}
    w.phase='tavern';w.t=CFG.RARE.TAVERN_STAY;
    /* titik berdiri di dalam tavern (acak kecil di sekitar tengah) */
    w.x=tv.cx+rand(-2.5,2.5);
    w.z=tv.cz+rand(-2.5,2.5);
    if(w.npc){w.npc.pos.set(w.x,CFG.SEA,w.z);
      w.npc.vel.set(0,0,0);w.npc.onGround=true;
      w.npc.home={x:w.x,z:w.z};
      w.npc.tavernSpot={x:w.x,z:w.z};   // patrol radius kecil → tetap di tavern
      w.npc.state='patrol';}
  },
  beginQuest(w){
    w.phase='quest';w.t=CFG.RARE.QUEST_TIME;
    w.quest=this.QUESTS[Math.floor(Math.random()*this.QUESTS.length)];
  },
  nextLeg(w){
    const dest=this.nextVillage(w.from);
    if(!dest){this.drop(w);return;}
    w.dest=dest;w.phase='travel';w.t=0;
    w.tavernVisit=Math.random()<0.65;      // undi ulang tiap perjalanan
    if(w.npc){w.npc.home={x:dest.x,z:dest.z};w.npc.tavernSpot=null;}
  },

  /* ---------- celetukan saat pemain berada di dekatnya ---------- */
  chatter(w,dt){
    if(!w.npc||w.npc.dead)return;
    w.sayT-=dt;
    if(w.sayT>0)return;
    w.sayT=rand(9,18);
    if(w.npc.pos.distanceTo(Player.pos)>14)return;
    const line=w.phase==='quest'
      ?`Aku sedang ${w.quest}. Jangan menghalangi jalanku.`
      :w.phase==='tavern'
      ?'Aku singgah di kedai ini untuk melepas lelah. Duduklah.'
      :npcLine(w.role.id,'chat');
    NPCS.say(w.npc,line,3.4);
  },

  update(dt){
    /* kemunculan berkala */
    this.cd-=dt;
    if(this.cd<=0){this.cd=CFG.RARE.SPAWN_CD;this.trySpawn();}

    for(let i=this.list.length-1;i>=0;i--){
      const w=this.list[i];
      if(w.gone){this.list.splice(i,1);continue;}

      /* sudah direkrut pemain → jadi rekan biasa, lepas dari sistem ini */
      if(w.npc&&NPCS.isTeam(w.npc)){w.npc.wander=false;w.gone=true;continue;}
      /* tewas → hilang dari dunia, kelak muncul pengembara baru */
      if(w.npc&&w.npc.dead){w.npc=null;w.gone=true;continue;}

      const dp=Math.hypot(w.x-Player.pos.x,w.z-Player.pos.z);
      if(dp>CFG.RARE.ROAM_R){this.drop(w);continue;}

      if(w.npc){
        /* ada mesh: AI & fisika NPCS yang menggerakkannya, di sini cukup
           menyalin posisinya kembali ke data simulasi + urus fase quest */
        w.x=w.npc.pos.x;w.z=w.npc.pos.z;
        const d=Math.hypot(w.dest.x-w.x,w.dest.z-w.z);
        if(w.phase==='travel'&&d<w.dest.r)this.arrive(w);
        else if(w.phase!=='travel'){
          w.t-=dt;
          if(w.t<=0){
            if(w.phase==='rest'){
              if(w.tavernVisit&&w.dest&&w.dest.tavern)this.beginTavern(w);
              else this.beginQuest(w);
            }else this.nextLeg(w);
          }
        }
        this.chatter(w,dt);
        if(dp>CFG.RARE.HIDE_R)this.hide(w);
      }else{
        this.simulate(w,dt);
        if(dp<CFG.RARE.SHOW_R)this.show(w);
      }
    }
  },
};

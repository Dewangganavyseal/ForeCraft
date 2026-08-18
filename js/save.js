/* =========================================================================
   SAVE — tombol simpan manual + penyimpanan anggota tim
   -------------------------------------------------------------------------
   RPG.save() sudah menyimpan statistik, tas, dan posisi pemain, tapi rekan
   yang direkrut sebelumnya ikut hilang karena tidak pernah dicatat. Modul ini
   menambahkan dua hal:
     1. NPCS.serializeTeam()/restoreTeam() — mengubah rekan jadi data biasa
        dan membangunnya kembali saat permainan dimuat.
     2. Tombol 💾 di layar supaya pemain bisa menyimpan kapan saja, tidak
        hanya menunggu simpan otomatis tiap 8 detik (yang sering tidak sempat
        jalan saat aplikasi ditutup mendadak di ponsel).
   ========================================================================= */
const SaveGame={

  /* ---------- tombol simpan ---------- */
  init(){
    if(document.getElementById('btn-save'))return;
    const b=document.createElement('button');
    b.id='btn-save';b.title='Simpan permainan';b.textContent='💾';
    /* ditempel di blok bar HP/stamina supaya kecil & tidak menutupi layar */
    (document.getElementById('stats')||document.body).appendChild(b);
    b.addEventListener('click',e=>{e.preventDefault();this.now();});
    this.btn=b;
  },

  /* Simpan sekarang juga lalu beri umpan balik singkat. */
  now(){
    if(typeof RPG==='undefined')return;
    RPG.save();
    if(typeof Furni!=='undefined'&&Furni.save)Furni.save();
    if(this.btn){
      this.btn.classList.add('ok');
      setTimeout(()=>this.btn.classList.remove('ok'),700);
    }
    const team=(typeof NPCS!=='undefined'&&NPCS.list)
      ? NPCS.list.filter(n=>!n.dead&&NPCS.isTeam(n)).length : 0;
    UI.toast(team?`💾 Tersimpan — ${team} rekan ikut disimpan`:'💾 Permainan tersimpan');
  },
};

/* =========================================================================
   Penyimpanan anggota tim
   ------------------------------------------------------------------------
   Hanya rekan (bukan penduduk desa biasa) yang disimpan: penduduk desa akan
   muncul lagi sendiri dari generator desa, sedangkan rekan adalah hasil kerja
   pemain sehingga harus bertahan antar sesi.
   ========================================================================= */
if(typeof NPCS!=='undefined'){

  NPCS.serializeTeam=function(){
    const out=[];
    for(const n of this.list){
      if(n.dead||!this.isTeam(n))continue;
      out.push({
        /* roleId = pengenal stabil untuk restore; role (nama) tetap disimpan
           agar save lama & tampilan tetap kompatibel */
        roleId:n.role.id,
        role:n.role.name,name:n.name,level:n.level,xp:n.xp,hp:n.hp,
        state:n.state,order:n.order,aggr:n.aggr!==false,
        bag:n.bag,gear:n.gear,
        pos:[n.pos.x,n.pos.y,n.pos.z],
      });
    }
    return out;
  };

  NPCS.restoreTeam=function(arr){
    if(!Array.isArray(arr)||!arr.length)return;
    for(const d of arr){
      /* cari arketipe: utamakan roleId (save baru), fallback nama (save lama) */
      const role=NPC_ROLES.find(r=>r.id===d.roleId)||
        NPC_ROLES.find(r=>r.name===d.role)||NPC_ROLES[0];
      /* BUGFIX: dulu selalu makeMesh() (villager generik), sehingga Penyihir
         Elf, Raksasa Batu, dan Manusia Singa berubah wujud setelah load game.
         buildModel() memilih model yang sama dengan saat NPC pertama dibuat. */
      const {mesh,parts}=this.buildModel(role);
      /* Rekan selalu dimunculkan di dekat pemain, bukan di koordinat lamanya:
         chunk tempat ia berdiri dulu belum tentu sudah dimuat, dan pemain
         tentu berharap timnya ada di sisinya begitu permainan dibuka. */
      const x=Player.pos.x+rand(-2.5,2.5),z=Player.pos.z+rand(-2.5,2.5);
      const y=World.groundAt(x,z);
      mesh.position.set(x,y,z);
      Game.scene.add(mesh);
      const n={
        id:this.uid++,role,name:d.name||role.name,mesh,parts,
        home:{x:d.pos?d.pos[0]:x,z:d.pos?d.pos[2]:z},
        pos:new THREE.Vector3(x,y,z),vel:new THREE.Vector3(),
        level:d.level||1,xp:d.xp||0,baseDmg:role.dmg,speed:role.speed,
        target:null,atkCd:0,swing:0,flash:0,
        state:d.state==='wait'?'wait':(d.state==='gather'?'gather':'follow'),
        order:d.order||'follow',
        aggr:d.aggr!==false,focus:false,
        dir:Math.random()*Math.PI*2,t:rand(0.5,2),
        dead:false,deathT:0,onGround:false,inWater:false,
        bag:Array.isArray(d.bag)?d.bag:new Array(CFG.NPC.BAG).fill(null),
        gear:Object.assign({weapon:null,helm:null,chest:null,boots:null},d.gear||{}),
        demand:null,
        mineT:0,mineAt:null,healT:0,
      };
      n.maxhp=this.npcMaxHp(n);
      n.hp=clamp(d.hp||n.maxhp,1,n.maxhp);
      this.list.push(n);
      /* WAJIB: tanpa ini rekan berjalan mengikuti pemain tetapi tidak
         terdaftar di tim, sehingga ikonnya hilang dari HUD dan panel G
         tampak kosong seolah rekannya tidak ada. */
      if(!this.teamFull())this.team.push(n);
      else{n.state='patrol';n.home={x:n.pos.x,z:n.pos.z};
        n.demand=this.rollDemand(role);}
    }
    if(typeof UI!=='undefined'&&UI.renderTeam)UI.renderTeam();
    if(typeof UI!=='undefined'&&UI.renderNpcPanel)UI.renderNpcPanel();
    UI.toast(`🤝 ${arr.length} rekan bergabung kembali`);
  };
}

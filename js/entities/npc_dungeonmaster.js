'use strict';
/* =============================================================================
   ENTITAS NPC: DUNGEON MASTER (🧙)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI (animate). Diadaptasi dari
   NEW MODEL/Dungeon Master.html — penyihir berjubah ungu tua berkerah tinggi,
   bercape, memegang BUKU mantra terbuka di tangan kiri (ciri khasnya: halaman
   dibolak-balik tiap beberapa detik) dan tongkat kristal di tangan kanan.
   Skala & gaya voxel mengikuti js/entities/npc_merchant.js.
   ============================================================================= */

const NPC_Dungeonmaster={

  /* ---------- MODEL 3D ----------
     Dipanggil NPCS.buildModel(role) -> {mesh,parts}. */
  build(){
    const g=new THREE.Group();
    const box=(w,h,d,c)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshLambertMaterial({color:c}));
      m.castShadow=!IS_MOBILE;return m;
    };
    const at=(m,x,y,z)=>{m.position.set(x,y,z);return m;};
    const ROT=(m,rx,ry,rz)=>{if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;return m;};
    /* palet jubah ungu mistik + aksen emas (selaras role.robe/hood di config) */
    const ROBE=0x4a2a6a,HOOD=0x2a1a3a,
          ROBE_D=0x33194c,ROBE_L=0x5e3a84,TRIM=0x8a5ac2,CAPE=0x3a1f56,
          GOLD=0xd9a531,BELT=0x3a2a4a,SKIN=0xc98b5e,SKIN_D=0xb0764c,
          BOOT=0x241a30,CRYSTAL=0xb48aff,
          BOOK=0x5a3a20,BOOK_D=0x402614,PAGE=0xf0e8d0,PAGE_D=0xd8ccb0;
    const BODY_Y=0.78;

    /* --- kaki detail: paha, tulang kering, sepatu runcing penyihir --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.18,0.14,0.20,ROBE_D),0,-0.07,0));
      lg.add(at(box(0.165,0.20,0.185,ROBE_D),0,-0.22,0));
      lg.add(at(box(0.15,0.14,0.17,BOOT),0,-0.36,0.01));
      lg.add(at(box(0.17,0.09,0.22,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.18,0.035,0.25,0x171020),0,-0.49,0.04));
      lg.add(at(box(0.155,0.04,0.175,0x171020),0,-0.30,0.01));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: jubah berkerah tinggi, sabuk emas, cape ungu di belakang --- */
    const body=box(0.50,0.44,0.34,ROBE);body.position.y=BODY_Y;g.add(body);
    body.add(at(box(0.54,0.12,0.38,ROBE_D),0,-0.20,0));
    body.add(at(box(0.46,0.10,0.35,ROBE_L),0,0.12,0));
    body.add(at(box(0.42,0.08,0.36,BELT),0,0.02,0));
    body.add(at(box(0.10,0.10,0.37,GOLD),0,0.02,0));
    body.add(at(box(0.05,0.05,0.02,0xffe9a0),0,0.02,0.19));
    /* kerah tinggi khas Dungeon Master (tegak di belakang leher) */
    body.add(at(box(0.56,0.12,0.40,HOOD),0,0.22,0));
    body.add(at(box(0.46,0.16,0.08,HOOD),0,0.30,-0.17));
    body.add(at(box(0.08,0.14,0.30,HOOD),0.22,0.28,-0.05));
    body.add(at(box(0.08,0.14,0.30,HOOD),-0.22,0.28,-0.05));
    /* jahitan vertikal + kancing emas */
    body.add(at(box(0.03,0.28,0.02,ROBE_D),0,0.02,0.175));
    body.add(at(box(0.04,0.04,0.02,GOLD),0,0.10,0.18));
    body.add(at(box(0.04,0.04,0.02,GOLD),0,-0.04,0.18));
    /* CAPE ungu gelap (ciri khas) — dianimasikan berkibar di animate() */
    const cape=new THREE.Group();cape.position.set(0,0.20,-0.19);body.add(cape);
    cape.add(at(box(0.46,0.34,0.04,CAPE),0,-0.16,-0.02));
    cape.add(at(box(0.40,0.34,0.04,ROBE_D),0,-0.48,-0.03));
    cape.add(at(box(0.32,0.26,0.04,HOOD),0,-0.76,-0.04));
    /* peniti cape emas di kedua bahu */
    body.add(at(box(0.09,0.09,0.05,GOLD),0.22,0.22,0.13));
    body.add(at(box(0.09,0.09,0.05,GOLD),-0.22,0.22,0.13));

    /* --- kepala: wajah, tudung gelap, janggut pendek, mata ungu menyala --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.10,0.30,SKIN_D),0,-0.14,0));
    head.add(at(box(0.40,0.16,0.38,HOOD),0,0.16,-0.02));
    head.add(at(box(0.42,0.10,0.14,HOOD),0,0.06,-0.16));
    head.add(at(box(0.36,0.06,0.10,ROBE_D),0,0.22,0.10));
    head.add(at(box(0.10,0.14,0.10,SKIN_D),0,-0.02,0.18));
    head.add(at(box(0.04,0.02,0.02,0xdba273),0,-0.01,0.235));
    /* janggut tipis + alis tegas mistik */
    head.add(at(box(0.24,0.14,0.09,0x6a6474),0,-0.21,0.11));
    head.add(at(box(0.16,0.08,0.07,0x544c5e),0,-0.30,0.13));
    head.add(at(box(0.20,0.05,0.08,0x6a6474),0,-0.10,0.14));
    /* mata ungu menyala (basic material: tampak bercahaya di malam) */
    for(const side of[1,-1]){
      head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.075,0.06,0.02),
        new THREE.MeshBasicMaterial({color:CRYSTAL})),0.08*side,0.0,0.165));
      head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.045,0.06,0.02),
        new THREE.MeshBasicMaterial({color:0x2a1a4a})),0.08*side,0.0,0.175));
      head.add(at(box(0.09,0.03,0.02,0x544c5e),0.08*side,0.06,0.17));
    }

    /* --- lengan kiri: memegang BUKU mantra terbuka --- */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.17,0.09,0.18,HOOD),0,0.0,0));
    armL.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armL.add(at(box(0.13,0.06,0.13,ROBE_D),0,-0.26,0));
    armL.add(at(box(0.145,0.10,0.145,SKIN_D),0,-0.34,0));
    armL.add(at(box(0.13,0.09,0.13,SKIN),0,-0.42,0));
    g.add(armL);
    /* BUKU di telapak tangan kiri: sampul + halaman + lembar yang bisa
       dibalik (rig flipPage, dianimasikan di animate tiap ~4 detik) */
    const book=new THREE.Group();book.position.set(0,-0.48,0.10);armL.add(book);
    book.add(at(box(0.30,0.05,0.22,BOOK),0,-0.02,0));          /* sampul bawah */
    book.add(at(box(0.05,0.06,0.22,BOOK_D),0,0,-0.11));         /* punggung buku */
    book.add(at(box(0.13,0.03,0.20,PAGE),-0.075,0.015,0));      /* halaman kiri */
    book.add(at(box(0.13,0.03,0.20,PAGE),0.075,0.015,0));       /* halaman kanan */
    /* garis teks di kedua halaman */
    book.add(at(box(0.09,0.012,0.012,PAGE_D),-0.075,0.035,-0.05));
    book.add(at(box(0.10,0.012,0.012,PAGE_D),-0.075,0.035,0.01));
    book.add(at(box(0.09,0.012,0.012,PAGE_D),0.075,0.035,-0.03));
    book.add(at(box(0.10,0.012,0.012,PAGE_D),0.075,0.035,0.03));
    /* lembar halaman yang dibalik-balik (berayun dari kanan ke kiri) */
    const flip=new THREE.Group();flip.position.set(0,0.028,0);book.add(flip);
    flip.add(at(box(0.12,0.008,0.19,PAGE),0.06,0,0));
    /* emblem emas di sampul + bookmark pita ungu */
    book.add(at(box(0.06,0.02,0.06,GOLD),0,-0.045,0.05));
    book.add(at(box(0.03,0.02,0.12,TRIM),0,-0.045,-0.02));

    /* --- lengan kanan: tongkat kristal ungu (pengganti garu pedagang) --- */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.17,0.09,0.18,HOOD),0,0.0,0));
    armR.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armR.add(at(box(0.13,0.06,0.13,ROBE_D),0,-0.26,0));
    armR.add(at(box(0.145,0.10,0.145,SKIN_D),0,-0.34,0));
    armR.add(at(box(0.13,0.09,0.13,SKIN),0,-0.42,0));
    const grip=new THREE.Group();grip.position.set(0,-0.44,0.06);armR.add(grip);
    grip.add(at(box(0.055,0.85,0.055,0x4a3828),0,-0.30,0));     /* gagang tongkat */
    grip.add(at(box(0.065,0.10,0.065,0x352618),0,0.06,0));
    /* kristal ungu menyala di ujung tongkat */
    const tip=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.16,0.13),
      new THREE.MeshBasicMaterial({color:CRYSTAL}));
    tip.position.set(0,-0.80,0);tip.rotation.y=Math.PI/4;grip.add(tip);
    grip.add(at(box(0.09,0.05,0.09,GOLD),0,-0.70,0));
    ROT(grip,0.24,0,0.08);
    g.add(armR);

    return {mesh:g,parts:{body,head,armL,armR,legs,bodyY:BODY_Y,cape,book,flip,tip,pageT:0,flipT:0}};
  },

  /* ---------- ANIMASI ----------
     Jalan (kaki & lengan mengayun), ayunan tongkat saat menyerang, cape
     berkibar, dan kebiasaan khasnya: kepala menunduk MEMBACA BUKU saat diam,
     dengan halaman yang dibalik tiap ~4 detik. */
  animate(n,dt){
    const t=performance.now()*0.001;
    const sp=Math.hypot(n.vel.x,n.vel.z);
    const em=n.flash>0?0xaa2222:0x000000;
    n.mesh.traverse(o=>{if(o.material&&o.material.emissive)
      o.material.emissive.setHex(em);});
    const P=n.parts;
    const step=Math.sin(t*9)*0.5*Math.min(1,sp/2);
    if(P.legs){
      P.legs[0].rotation.x=step;
      P.legs[1].rotation.x=-step;
    }
    const sw=n.swing>0?1-n.swing/0.25:0;
    P.armR.rotation.x=lerp(step*0.6,-1.5,sw);
    P.body.position.y=P.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    P.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;

    /* --- khas Dungeon Master: MEMBACA BUKU saat diam & tidak bertarung --- */
    const reading=sp<0.25&&!n.target;
    if(reading){
      P.head.rotation.x=0.30+Math.sin(t*0.8)*0.03;   /* menunduk ke buku */
      P.armL.rotation.x=-1.15+Math.sin(t*1.4)*0.02;  /* buku diangkat ke dada */
      /* balik halaman tiap ~4 detik: lembar berayun dari kanan ke kiri */
      P.pageT=(P.pageT||0)+dt;
      if(P.pageT>4){P.pageT=0;P.flipT=1;}
      P.flipT=(P.flipT||0)*Math.exp(-6*dt);
      if(P.flip){
        const on=P.flipT>0.02;
        P.flip.visible=on;
        if(on){
          P.flip.rotation.y=-(1-P.flipT)*Math.PI*0.92;
          P.flip.rotation.z=Math.sin((1-P.flipT)*Math.PI)*0.18;
        }
      }
      /* buku sedikit miring menghadap wajah */
      if(P.book)P.book.rotation.x=-0.5+Math.sin(t*1.4)*0.02;
    }else{
      P.head.rotation.x=0;
      P.armL.rotation.x=-step*0.6;
      if(P.flip)P.flip.visible=false;
      if(P.book)P.book.rotation.x=-0.15;             /* buku diturunkan saat jalan */
      P.pageT=0;P.flipT=0;
    }

    /* cape berkibar halus, lebih lebar saat berlari/bertarung */
    if(P.cape){
      const wind=0.04+Math.min(1,sp/2.5)*0.14+(n.target?0.08:0);
      P.cape.rotation.x=Math.sin(t*1.8)*0.05+wind;
      P.cape.rotation.z=Math.sin(t*1.2)*0.04;
    }
    /* kristal tongkat berdenyut (ukuran) — tetap menyala lewat MeshBasic */
    if(P.tip)P.tip.scale.setScalar(1+Math.sin(t*3.2)*0.12);
  },
};
window.NPC_Dungeonmaster=NPC_Dungeonmaster;

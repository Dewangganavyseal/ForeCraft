'use strict';
/* =============================================================================
   LANDASAN TEMPA (ANVIL) — enchant equipment
   -----------------------------------------------------------------------------
   Menaikkan LEVEL equipment (pedang, armor, tameng). Sementara ini efek
   level sederhana: damage senjata +8%/Lv dan pertahanan armor/tameng +6%/Lv
   (dihitung RPG.weaponDmg & RPG.defense).

   Biaya = KOIN (mengikuti rarity, makin tinggi level makin mahal)
         + BAHAN yang relevan dengan equipment-nya:
             tier leather -> kulit, iron -> batang besi,
             gold -> batang emas, crystal -> kristal;
             pedang mengikuti bahannya sendiri (kayu/besi/emas/racun/kristal/inti boss).

   Panel dibuka lewat interaksi furnitur 'anvil' (Furni.DEFS) — UI.toggle('anvil').
   ============================================================================= */
const Anvil={
  MAX_LV:10,
  DMG_PER_LV:0.08,
  DEF_PER_LV:0.06,
  COIN_BASE:{common:15,uncommon:30,rare:60,epic:120,legendary:250},
  /* bahan tempa per pedang */
  SWORD_MAT:{sword_wood:'wood',sword_iron:'iron_ingot',sword_storm:'gold_ingot',
    sword_venom:'venom',sword_frost:'crystal',sword_titan:'boss_core'},
  /* bahan tempa per tier armor/tameng */
  TIER_MAT:{leather:'leather',iron:'iron_ingot',gold:'gold_ingot',crystal:'crystal'},

  sel:null,   // {kind:'equip',slot} | {kind:'held'} | {kind:'stack',g,i}

  matFor(id){
    const it=ITEMS[id];
    if(!it)return null;
    if(it.weapon)return this.SWORD_MAT[id]||'iron_ingot';
    if(it.armor)return this.TIER_MAT[it.armor.tier]||'iron_ingot';
    return null;
  },

  cost(id,lvl){
    const it=ITEMS[id];
    const rar=(it&&it.rarity)||'common';
    return {
      coin:(this.COIN_BASE[rar]||30)*(lvl+1),
      matId:this.matFor(id),
      matN:1+Math.floor(lvl/3),
    };
  },

  /* baca id & level dari target yang dipilih */
  resolve(sel){
    if(!sel)return null;
    if(sel.kind==='equip'){
      const id=RPG.equipId(sel.slot);
      return id?{id,lvl:RPG.equipLv(sel.slot),label:'Dipakai'}:null;
    }
    if(sel.kind==='held'){
      const s=RPG.hotbar[RPG.sel];
      if(s&&ITEMS[s.id]&&ITEMS[s.id].weapon)return {id:s.id,lvl:s.lvl||0,label:'Digenggam'};
      return null;
    }
    const arr=sel.g===0?RPG.hotbar:RPG.bag;
    const s=arr[sel.i];
    if(!s)return null;
    const it=ITEMS[s.id];
    if(!it||!(it.weapon||it.armor))return null;
    return {id:s.id,lvl:s.lvl||0,label:sel.g===0?'Hotbar':'Tas'};
  },

  /* kumpulkan semua equipment yang bisa ditempa: terpakai + di tas */
  targets(){
    const out=[];
    for(const s of PLAYER_GEAR_SLOTS)
      if(RPG.equipId(s.id))out.push({kind:'equip',slot:s.id});
    const held=RPG.hotbar[RPG.sel];
    if(held&&ITEMS[held.id]&&ITEMS[held.id].weapon)out.push({kind:'held'});
    for(let g=0;g<2;g++){
      const arr=g===0?RPG.hotbar:RPG.bag;
      for(let i=0;i<arr.length;i++){
        const s=arr[i];
        if(!s)continue;
        const it=ITEMS[s.id];
        if(it&&(it.weapon||it.armor))out.push({kind:'stack',g,i});
      }
    }
    return out;
  },

  enchant(){
    const sel=this.sel;
    const r=this.resolve(sel);
    if(!r){UI.toast('Pilih equipment dulu');return;}
    if(r.lvl>=this.MAX_LV){UI.toast('⚒️ Sudah level maksimum!');return;}
    const c=this.cost(r.id,r.lvl);
    if(RPG.coin<c.coin){UI.toast(`🪙 Koin kurang — butuh ${c.coin}`);return;}
    if(c.matId&&RPG.countItem(c.matId)<c.matN){
      UI.toast(`${ITEMS[c.matId].e} ${ITEMS[c.matId].n} kurang — butuh ${c.matN}`);return;
    }
    RPG.spendCoin(c.coin);
    if(c.matId)RPG.removeItems({[c.matId]:c.matN});

    if(sel.kind==='equip'){
      RPG.equip[sel.slot]={id:r.id,lvl:r.lvl+1};
      Player.refreshArmor();
    }else if(sel.kind==='held'){
      const s=RPG.hotbar[RPG.sel];
      if(s)s.lvl=(s.lvl||0)+1;
    }else{
      const arr=sel.g===0?RPG.hotbar:RPG.bag;
      const s=arr[sel.i];
      if(s)s.lvl=(s.lvl||0)+1;
    }
    Sfx.craft();
    Player.addXP(4);
    if(typeof Prof!=='undefined')Prof.gain('crafting',20,2);
    UI.toast(`⚒️ ${ITEMS[r.id].e} ${ITEMS[r.id].n} → Level ${r.lvl+1}!`);
    UI.renderAll();
    this.render();
  },

  /* ---------- render panel ---------- */
  render(){
    const el=document.getElementById('anvil-body');
    if(!el)return;
    el.innerHTML='';

    /* validasi pilihan lama (item bisa saja sudah pindah) */
    if(this.sel&&!this.resolve(this.sel))this.sel=null;

    /* ===== daftar equipment ===== */
    const list=document.createElement('div');
    list.className='anvil-list';
    const tgs=this.targets();
    if(!tgs.length){
      list.innerHTML='<p class="tip">Tidak ada equipment. Buat pedang/armor/tameng dulu, atau pakai dari tas.</p>';
    }
    for(const t of tgs){
      const r=this.resolve(t);
      if(!r)continue;
      const it=ITEMS[r.id];
      const isSel=this.sel&&this.sel.kind===t.kind&&
        (t.kind==='equip'?this.sel.slot===t.slot:
         t.kind==='held'?true:
         (this.sel.g===t.g&&this.sel.i===t.i));
      const d=document.createElement('div');
      d.className='anvil-item'+(isSel?' sel':'');
      if(it.rarity&&RARITY[it.rarity])d.style.borderColor=RARITY[it.rarity].css;
      d.innerHTML=`<span class="ai-ico">${(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(r.id):it.e}</span>
        <span class="ai-nm">${it.n}${r.lvl?` <b class="ai-lv">Lv ${r.lvl}</b>`:''}<br><i>${t.kind==='equip'?'Dipakai':t.kind==='held'?'Digenggam':(t.g===0?'Hotbar':'Tas')}</i></span>`;
      d.addEventListener('click',()=>{this.sel=t;Sfx.click&&Sfx.click();this.render();});
      list.appendChild(d);
    }
    el.appendChild(list);

    /* ===== detail & biaya ===== */
    const det=document.createElement('div');
    det.className='anvil-detail';
    const r=this.sel?this.resolve(this.sel):null;
    if(!r){
      det.innerHTML='<p class="tip">Klik salah satu equipment di atas untuk menempa.</p>';
    }else{
      const it=ITEMS[r.id];
      const c=this.cost(r.id,r.lvl);
      const maxed=r.lvl>=this.MAX_LV;
      const haveC=RPG.coin,haveM=c.matId?RPG.countItem(c.matId):0;
      const ok=!maxed&&haveC>=c.coin&&(!c.matId||haveM>=c.matN);
      /* perkiraan stat sekarang -> berikutnya */
      let statNow='',statNext='';
      if(it.weapon){
        const base=it.weapon.dmg*RPG.rarityMul(r.id);
        statNow=`⚔️ ATK ${Math.round(base*(1+this.DMG_PER_LV*r.lvl))}`;
        statNext=`→ ${Math.round(base*(1+this.DMG_PER_LV*(r.lvl+1)))}`;
      }else if(it.armor){
        const base=it.armor.def*RPG.rarityMul(r.id);
        statNow=`🛡️ DEF +${Math.round(base*(1+this.DEF_PER_LV*r.lvl)*100)}%`;
        statNext=`→ +${Math.round(base*(1+this.DEF_PER_LV*(r.lvl+1))*100)}%`;
      }
      det.innerHTML=`
        <div class="ad-head">${(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(r.id):it.e} <b>${it.n}</b> ${r.lvl?`<span class="ai-lv">Lv ${r.lvl}</span>`:'<i>belum ditempa</i>'}</div>
        <div class="ad-stat">${maxed?'⚒️ Level maksimum':statNow+' '+statNext}</div>
        ${maxed?'':`<div class="ad-cost">
          <span class="${haveC>=c.coin?'ok':'no'}">🪙 ${c.coin} (punya ${haveC})</span>
          ${c.matId?`<span class="${haveM>=c.matN?'ok':'no'}">${(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(c.matId):ITEMS[c.matId].e} ${ITEMS[c.matId].n} ×${c.matN} (punya ${haveM})</span>`:''}
        </div>
        <button class="big anvil-go" ${ok?'':'disabled'}>⚒️ Tempa → Lv ${r.lvl+1}</button>`}
        <p class="tip">Level menambah damage senjata (+${Math.round(this.DMG_PER_LV*100)}%/Lv) atau pertahanan armor & tameng (+${Math.round(this.DEF_PER_LV*100)}%/Lv). Koin didapat dari quest, monster, dan berdagang.</p>`;
      if(!maxed&&ok){
        det.querySelector('.anvil-go').addEventListener('click',()=>this.enchant());
      }
    }
    el.appendChild(det);
  },
};

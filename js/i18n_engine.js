'use strict';
/* =============================================================================
   I18N ENGINE — menerapkan bahasa ke DATA GAME + seluruh DOM
   -----------------------------------------------------------------------------
   apply(lang):
     1. patchData()  → menukar nama/deskripsi di ITEMS, MOB_NAME, NPC_ROLES,
        SKILLS, SUBSKILLS, RARITY, EFFECTS, BIOME_INFO, NPC_DIALOG, BAG_ITEM,
        dan nama pet yang sudah tersimpan.
     2. localizeDOM() → menyusuri text-node + atribut title/placeholder lalu
        menukar frasa Indonesia ke bahasa aktif.
   Teks asli (id) disimpan di WeakMap sehingga berpindah bahasa berulang kali
   tetap akurat (selalu diterjemahkan dari sumber Indonesia).
   ============================================================================= */
const I18N={
  lang:'id',
  _origData:null,
  _origText:new WeakMap(),
  _origAttr:new WeakMap(),
  _busy:false,
  _observer:null,
  _phraseCache:null,

  /* ---------------- simpan nilai asli (bahasa Indonesia) ---------------- */
  snapshot(){
    if(this._origData)return;
    const d={items:{},mobs:{},roles:{},roleSkills:{},skills:{},subskills:{},
      rarity:{},effects:{},biomes:{},bagItem:null,slots:{},recipes:{}};

    if(typeof ITEMS!=='undefined')
      for(const id in ITEMS)d.items[id]=ITEMS[id].n;
    if(typeof MOB_NAME!=='undefined')
      for(const id in MOB_NAME)d.mobs[id]=MOB_NAME[id];
    if(typeof NPC_ROLES!=='undefined')
      for(const r of NPC_ROLES){
        d.roles[r.id]=r.name;
        if(r.skill)d.roleSkills[r.skill.id]=[r.skill.name,r.skill.desc];
      }
    if(typeof SKILLS!=='undefined')
      for(const s of SKILLS)d.skills[s.id]=[s.name,s.desc];
    if(typeof SUBSKILLS!=='undefined')
      for(const id in SUBSKILLS)d.subskills[id]=SUBSKILLS[id].name;
    if(typeof RARITY!=='undefined')
      for(const id in RARITY)d.rarity[id]=RARITY[id].n;
    if(typeof EFFECTS!=='undefined')
      for(const id in EFFECTS)d.effects[id]=[EFFECTS[id].n,EFFECTS[id].desc];
    if(typeof BIOME_INFO!=='undefined')
      for(const k in BIOME_INFO)d.biomes[k]=BIOME_INFO[k].name;
    if(typeof BAG_ITEM!=='undefined')d.bagItem=BAG_ITEM.n;

    /* slot perlengkapan: objeknya dibagikan antar ARMOR_SLOTS /
       PLAYER_GEAR_SLOTS / NPC_GEAR_SLOTS, jadi cukup dicatat per id. */
    const slotArrays=[];
    if(typeof ARMOR_SLOTS!=='undefined')slotArrays.push(ARMOR_SLOTS);
    if(typeof PLAYER_GEAR_SLOTS!=='undefined')slotArrays.push(PLAYER_GEAR_SLOTS);
    if(typeof NPC_GEAR_SLOTS!=='undefined')slotArrays.push(NPC_GEAR_SLOTS);
    for(const arr of slotArrays)
      for(const s of arr)if(d.slots[s.id]===undefined)d.slots[s.id]=s.name;
    this._slotArrays=slotArrays;

    /* nama resep: dipakai crafting bila item tidak punya nama */
    if(typeof RECIPES!=='undefined')
      for(const r of RECIPES)d.recipes[r.out]=r.name;

    /* quest: nama & deskripsi 57 quest */
    if(typeof Quest!=='undefined'&&Array.isArray(Quest.DEFS)){
      d.quests={};
      for(const q of Quest.DEFS)d.quests[q.id]=[q.name,q.desc];
    }

    this._origData=d;
  },

  pick(entry,lang,idx){
    if(!entry)return null;
    const v=entry[lang];
    if(v===undefined)return null;
    return Array.isArray(v)?v[idx||0]:v;
  },

  /* ---------------- patch data game ---------------- */
  patchData(lang){
    this.snapshot();
    const O=this._origData;
    const id=(lang==='id');

    if(typeof ITEMS!=='undefined'){
      for(const key in O.items){
        if(!ITEMS[key])continue;
        ITEMS[key].n=id?O.items[key]:(this.pick(I18N_ITEMS[key],lang)||O.items[key]);
      }
    }
    if(typeof BAG_ITEM!=='undefined'&&O.bagItem!==null){
      BAG_ITEM.n=id?O.bagItem:(this.pick(I18N_ITEMS.bag,lang)||O.bagItem);
    }
    if(typeof MOB_NAME!=='undefined'){
      for(const key in O.mobs){
        MOB_NAME[key]=id?O.mobs[key]:(this.pick(I18N_MOBS[key],lang)||O.mobs[key]);
      }
    }
    if(typeof NPC_ROLES!=='undefined'){
      for(const r of NPC_ROLES){
        const on=O.roles[r.id];
        if(on)r.name=id?on:(this.pick(I18N_ROLES[r.id],lang)||on);
        if(r.skill){
          const os=O.roleSkills[r.skill.id];
          if(os){
            r.skill.name=id?os[0]:(this.pick(I18N_ROLE_SKILLS[r.skill.id],lang,0)||os[0]);
            r.skill.desc=id?os[1]:(this.pick(I18N_ROLE_SKILLS[r.skill.id],lang,1)||os[1]);
          }
        }
      }
    }
    if(typeof SKILLS!=='undefined'){
      for(const s of SKILLS){
        const os=O.skills[s.id];
        if(!os)continue;
        s.name=id?os[0]:(this.pick(I18N_SKILLS[s.id],lang,0)||os[0]);
        s.desc=id?os[1]:(this.pick(I18N_SKILLS[s.id],lang,1)||os[1]);
      }
    }
    if(typeof SUBSKILLS!=='undefined'){
      for(const key in O.subskills){
        if(!SUBSKILLS[key])continue;
        SUBSKILLS[key].name=id?O.subskills[key]:(this.pick(I18N_SUBSKILLS[key],lang)||O.subskills[key]);
      }
    }
    if(typeof RARITY!=='undefined'){
      for(const key in O.rarity){
        if(!RARITY[key])continue;
        RARITY[key].n=id?O.rarity[key]:(this.pick(I18N_RARITY[key],lang)||O.rarity[key]);
      }
    }
    if(typeof EFFECTS!=='undefined'){
      for(const key in O.effects){
        if(!EFFECTS[key])continue;
        const oe=O.effects[key];
        EFFECTS[key].n=id?oe[0]:(this.pick(I18N_EFFECTS[key],lang,0)||oe[0]);
        EFFECTS[key].desc=id?oe[1]:(this.pick(I18N_EFFECTS[key],lang,1)||oe[1]);
      }
    }
    if(typeof BIOME_INFO!=='undefined'){
      for(const key in O.biomes){
        if(!BIOME_INFO[key])continue;
        const ob=O.biomes[key];
        BIOME_INFO[key].name=id?ob:(this.pick(I18N_BIOMES[ob],lang)||ob);
      }
    }

    /* slot perlengkapan pemain & rekan */
    if(this._slotArrays){
      for(const arr of this._slotArrays){
        for(const s of arr){
          const os=O.slots[s.id];
          if(os===undefined)continue;
          s.name=id?os:(this.pick(I18N_SLOTS[s.id],lang)||os);
        }
      }
    }

    /* nama resep mengikuti nama item bahasa aktif */
    if(typeof RECIPES!=='undefined'&&typeof ITEMS!=='undefined'){
      for(const r of RECIPES){
        const or=O.recipes[r.out];
        if(or===undefined)continue;
        r.name=(ITEMS[r.out]&&ITEMS[r.out].n)?ITEMS[r.out].n:or;
      }
    }

    /* nama pet tersimpan mengikuti nama mob bahasa aktif */
    if(typeof RPG!=='undefined'&&Array.isArray(RPG.mobSlots)&&typeof MOB_NAME!=='undefined'){
      for(const p of RPG.mobSlots){
        if(p&&p.type&&MOB_NAME[p.type])p.name=MOB_NAME[p.type];
      }
    }

    /* quest: nama & deskripsi mengikuti bahasa aktif */
    if(typeof Quest!=='undefined'&&Array.isArray(Quest.DEFS)&&typeof I18N_QUESTS!=='undefined'){
      for(const q of Quest.DEFS){
        const o=O.quests?O.quests[q.id]:null;
        if(!o)continue;
        q.name=id?o[0]:(this.pick(I18N_QUESTS[q.id],lang,0)||o[0]);
        q.desc=id?o[1]:(this.pick(I18N_QUESTS[q.id],lang,1)||o[1]);
      }
    }
  },

  /* ---------------- terjemahan frasa DOM ---------------- */
  phrases(){
    if(this._phraseCache)return this._phraseCache;
    const keys=Object.keys(I18N_PHRASE).sort((a,b)=>b.length-a.length);
    this._phraseCache=keys;
    return keys;
  },

  translateText(txt,lang){
    if(lang==='id'||!txt)return txt;
    let out=txt;
    /* dialog NPC diterjemahkan utuh (kalimat penuh) */
    const trimmed=out.trim();
    if(I18N_DIALOG[trimmed]){
      const t=this.pick(I18N_DIALOG[trimmed],lang);
      if(t)return out.replace(trimmed,t);
    }
    const li=(lang==='en')?0:(lang==='zh')?1:2;
    for(const key of this.phrases()){
      if(out.indexOf(key)<0)continue;
      const rep=I18N_PHRASE[key][li];
      if(!rep)continue;
      /* kunci satu kata ditukar hanya bila berdiri sebagai kata utuh, supaya
         "Makan" tidak ikut mengubah "Makanan", dan "tas" tidak mengubah
         "batas". Frasa (mengandung spasi) ditukar apa adanya. */
      out=(key.indexOf(' ')<0)?this.replaceWord(out,key,rep):out.split(key).join(rep);
    }
    return out;
  },

  LETTER:/[A-Za-z0-9\u00C0-\u024F]/,
  replaceWord(text,key,rep){
    let out='',i=0;
    for(;;){
      const at=text.indexOf(key,i);
      if(at<0){out+=text.slice(i);break;}
      const before=at>0?text[at-1]:'';
      const after=(at+key.length<text.length)?text[at+key.length]:'';
      const bad=(before&&this.LETTER.test(before))||(after&&this.LETTER.test(after));
      out+=text.slice(i,at)+(bad?key:rep);
      i=at+key.length;
    }
    return out;
  },

  localizeTextNode(n,lang){
    /* rec.src = teks sumber (bahasa Indonesia), rec.out = hasil terjemahan
       terakhir yang kita tulis. Bila nodeValue berubah oleh kode game (mis.
       jam/HUD), nilai baru itu dipakai sebagai sumber baru — sehingga teks
       dinamis tidak pernah "terbeku" ke nilai lama. */
    let rec=this._origText.get(n);
    if(!rec||n.nodeValue!==rec.out){
      rec={src:n.nodeValue,out:n.nodeValue};
      this._origText.set(n,rec);
    }
    if(!rec.src||!rec.src.trim())return;
    const out=this.translateText(rec.src,lang);
    rec.out=out;
    if(n.nodeValue!==out)n.nodeValue=out;
  },

  localizeAttrs(el,lang){
    const ATTRS=['title','placeholder'];
    let store=this._origAttr.get(el);
    if(!store){store={};this._origAttr.set(el,store);}
    for(const a of ATTRS){
      if(!el.hasAttribute||!el.hasAttribute(a))continue;
      const cur=el.getAttribute(a);
      let rec=store[a];
      if(!rec||cur!==rec.out){rec={src:cur,out:cur};store[a]=rec;}
      const out=this.translateText(rec.src,lang);
      rec.out=out;
      if(cur!==out)el.setAttribute(a,out);
    }
  },

  SKIP_TAGS:{SCRIPT:1,STYLE:1,CANVAS:1,TEXTAREA:1},

  localizeTree(root,lang){
    if(!root)return;
    if(root.nodeType===3){this.localizeTextNode(root,lang);return;}
    if(root.nodeType!==1)return;
    if(this.SKIP_TAGS[root.tagName])return;
    this.localizeAttrs(root,lang);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
      acceptNode:node=>{
        if(node.nodeType===1&&this.SKIP_TAGS[node.tagName])return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while((n=walker.nextNode())){
      if(n.nodeType===3)this.localizeTextNode(n,lang);
      else this.localizeAttrs(n,lang);
    }
  },

  localizeDOM(lang){
    if(!document.body)return;
    this._busy=true;
    try{ this.localizeTree(document.body,lang); }
    finally{ this._busy=false; }
  },

  /* ---------------- observer: panel yang digambar ulang ---------------- */
  startObserver(){
    if(this._observer||typeof MutationObserver==='undefined'||!document.body)return;
    let queue=[];
    let scheduled=false;
    const flush=()=>{
      scheduled=false;
      const items=queue;queue=[];
      if(this.lang==='id')return;
      this._busy=true;
      try{
        for(const n of items){
          if(!n||!n.isConnected)continue;
          this.localizeTree(n,this.lang);
        }
      }finally{this._busy=false;}
    };
    this._observer=new MutationObserver(muts=>{
      if(this._busy||this.lang==='id')return;
      for(const m of muts){
        if(m.type==='childList'){
          m.addedNodes.forEach(n=>{
            if(n.nodeType===1||n.nodeType===3)queue.push(n);
          });
        }else if(m.type==='characterData'){
          queue.push(m.target);
        }
      }
      if(queue.length&&!scheduled){
        scheduled=true;
        requestAnimationFrame(flush);
      }
    });
    this._observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  },

  /* ---------------- API utama ---------------- */
  apply(lang){
    if(typeof locales!=='undefined'&&!locales[lang])lang='id';
    this.lang=lang;
    this.patchData(lang);
    this.startObserver();
    this.localizeDOM(lang);
    if(typeof Quest!=='undefined'&&Quest.refresh)Quest.refresh();
    if(typeof UI!=='undefined'&&UI.open==='char'&&typeof CharView!=='undefined')CharView.renderStats();
  },

  /* dipanggil setelah UI menggambar ulang secara manual */
  refresh(){
    if(this.lang==='id')return;
    this.localizeDOM(this.lang);
    if(typeof Quest!=='undefined'&&Quest.refresh)Quest.refresh();
  },
};
window.I18N=I18N;

/* terapkan bahasa tersimpan saat halaman siap */
(function(){
  if(typeof document==='undefined')return;
  const boot=()=>{
    try{ I18N.apply(typeof CURRENT_LANG!=='undefined'?CURRENT_LANG:'id'); }catch(e){}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();

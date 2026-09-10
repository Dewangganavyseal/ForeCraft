'use strict';
/* =============================================================================
   I18N — pelokalan penuh: nama item, mob, NPC, skill, dialog, dan teks UI
   -----------------------------------------------------------------------------
   Cara kerja:
   1. DATA GAME (ITEMS, MOB_NAME, NPC_ROLES, SKILLS, SUBSKILLS, RARITY, EFFECTS,
      NPC_DIALOG, BIOME_INFO) di-patch langsung saat bahasa diganti. Semua kode
      lama yang memakai `ITEMS[id].n`, `role.name`, dsb otomatis ikut berubah
      tanpa perlu diubah satu per satu.
   2. TEKS UI STATIS & HASIL RENDER dilokalkan lewat pemetaan frasa
      (I18N_PHRASE). localizeDOM() menyusuri text-node + atribut title/
      placeholder, lalu menukar frasa Indonesia ke bahasa aktif.
   3. MutationObserver memantau panel yang digambar ulang supaya teks baru
      langsung ikut terlokalkan.
   Bahasa dasar tetap 'id' — nilai asli disimpan agar bisa dikembalikan.
   ============================================================================= */

/* ---------------------------------------------------------------- ITEM NAMES */
const I18N_ITEMS={
  wood:{en:'Wood',zh:'木头',ja:'木材'},
  stone:{en:'Stone',zh:'石头',ja:'石'},
  fiber:{en:'Fiber',zh:'纤维',ja:'繊維'},
  berry:{en:'Berry',zh:'浆果',ja:'ベリー'},
  mush:{en:'Mushroom',zh:'蘑菇',ja:'キノコ'},
  gel:{en:'Slime Gel',zh:'史莱姆凝胶',ja:'スライムゼリー'},
  meat:{en:'Raw Meat',zh:'生肉',ja:'生肉'},
  cmeat:{en:'Cooked Meat',zh:'烤肉',ja:'焼き肉'},
  bread:{en:'Bread',zh:'面包',ja:'パン'},
  salad:{en:'Fruit Salad',zh:'水果沙拉',ja:'フルーツサラダ'},
  pie:{en:'Berry Pie',zh:'浆果派',ja:'ベリーパイ'},
  sugar_cane:{en:'Sugar Cane',zh:'甘蔗',ja:'サトウキビ'},
  sugar:{en:'Sugar',zh:'糖',ja:'砂糖'},
  cake:{en:'Cake',zh:'蛋糕',ja:'ケーキ'},
  bandage:{en:'Bandage',zh:'绷带',ja:'包帯'},
  potion_stam:{en:'Stamina Potion',zh:'耐力药水',ja:'スタミナポーション'},
  fish:{en:'Fresh Fish',zh:'新鲜鱼',ja:'新鮮な魚'},
  cfish:{en:'Grilled Fish',zh:'烤鱼',ja:'焼き魚'},
  resin:{en:'Tree Resin',zh:'树脂',ja:'樹脂'},
  leather:{en:'Leather',zh:'皮革',ja:'革'},
  hoe:{en:'Hoe',zh:'锄头',ja:'クワ'},
  log_pass:{en:'Log Pass',zh:'定位牌',ja:'ログパス'},
  rope:{en:'Rope',zh:'绳子',ja:'ロープ'},
  saddle:{en:'Saddle',zh:'鞍',ja:'サドル'},
  pet_charm:{en:'Tamer Charm',zh:'驯兽护符',ja:'テイマーの護符'},
  seed_wheat:{en:'Wheat Seed',zh:'小麦种子',ja:'小麦の種'},
  seed_carrot:{en:'Carrot Seed',zh:'胡萝卜种子',ja:'ニンジンの種'},
  seed_cabbage:{en:'Cabbage Seed',zh:'白菜种子',ja:'キャベツの種'},
  seed_tomato:{en:'Tomato Seed',zh:'番茄种子',ja:'トマトの種'},
  seed_watermelon:{en:'Watermelon Seed',zh:'西瓜种子',ja:'スイカの種'},
  wheat:{en:'Wheat',zh:'小麦',ja:'小麦'},
  carrot:{en:'Carrot',zh:'胡萝卜',ja:'ニンジン'},
  cabbage:{en:'Cabbage',zh:'白菜',ja:'キャベツ'},
  tomato:{en:'Tomato',zh:'番茄',ja:'トマト'},
  watermelon:{en:'Watermelon',zh:'西瓜',ja:'スイカ'},
  sand:{en:'Sand',zh:'沙子',ja:'砂'},
  coal:{en:'Coal',zh:'煤',ja:'石炭'},
  iron_ore:{en:'Iron Ore',zh:'铁矿石',ja:'鉄鉱石'},
  gold_ore:{en:'Gold Ore',zh:'金矿石',ja:'金鉱石'},
  crystal:{en:'Frozen Crystal',zh:'冰晶',ja:'氷結クリスタル'},
  iron_ingot:{en:'Iron Ingot',zh:'铁锭',ja:'鉄インゴット'},
  gold_ingot:{en:'Gold Ingot',zh:'金锭',ja:'金インゴット'},
  pelt:{en:'Wolf Pelt',zh:'狼毛皮',ja:'狼の毛皮'},
  venom:{en:'Scorpion Venom',zh:'蝎毒',ja:'サソリの毒'},
  centipede_shell:{en:'Centipede Shell',zh:'蜈蚣壳',ja:'ムカデの殻'},
  insect_leg:{en:'Insect Leg',zh:'昆虫腿',ja:'虫の脚'},
  hard_shell:{en:'Hard Shell',zh:'坚硬甲壳',ja:'硬い甲殻'},
  green_blood:{en:'Green Blood',zh:'绿色血液',ja:'緑の血'},
  toxic_venom:{en:'Toxic Venom',zh:'剧毒毒液',ja:'猛毒'},
  boss_core:{en:'Boss Core',zh:'首领核心',ja:'ボスコア'},
  soul_shard:{en:'Soul Shard',zh:'灵魂碎片',ja:'魂の破片'},
  dungeon_changer:{en:'Dungeon Changer',zh:'地牢变换器',ja:'ダンジョンチェンジャー'},
  helm_gold:{en:'Gold Helm',zh:'黄金头盔',ja:'黄金の兜'},
  plate_gold:{en:'Gold Armor',zh:'黄金铠甲',ja:'黄金の鎧'},
  greaves_gold:{en:'Gold Greaves',zh:'黄金护腿',ja:'黄金のグリーヴ'},
  helm_crystal:{en:'Crystal Helm',zh:'水晶头盔',ja:'クリスタルの兜'},
  plate_crystal:{en:'Crystal Armor',zh:'水晶铠甲',ja:'クリスタルの鎧'},
  greaves_crystal:{en:'Crystal Greaves',zh:'水晶护腿',ja:'クリスタルのグリーヴ'},
  cap_leather:{en:'Leather Cap',zh:'皮帽',ja:'革の帽子'},
  vest_leather:{en:'Leather Vest',zh:'皮背心',ja:'革のベスト'},
  boots_leather:{en:'Leather Boots',zh:'皮靴',ja:'革のブーツ'},
  helm_iron:{en:'Iron Helm',zh:'铁头盔',ja:'鉄の兜'},
  plate_iron:{en:'Iron Armor',zh:'铁铠甲',ja:'鉄の鎧'},
  greaves_iron:{en:'Iron Greaves',zh:'铁护腿',ja:'鉄のグリーヴ'},
  sword_wood:{en:'Wooden Sword',zh:'木剑',ja:'木の剣'},
  sword_iron:{en:'Serrated Iron Blade',zh:'锯齿铁刃',ja:'鋸歯の鉄刃'},
  sword_storm:{en:'Storm Sword',zh:'风暴之剑',ja:'嵐の剣'},
  sword_venom:{en:'Venom Fang',zh:'毒牙',ja:'毒牙'},
  sword_frost:{en:'Frost Dawn Sword',zh:'霜晓之剑',ja:'氷暁の剣'},
  sword_titan:{en:'Titan Breaker',zh:'泰坦破坏者',ja:'タイタンブレイカー'},
  cloak_swift:{en:'Wind Cloak',zh:'疾风斗篷',ja:'風のマント'},
  helm_guard:{en:'Guardian Helm',zh:'守卫头盔',ja:'守衛の兜'},
  boots_greed:{en:'Treasure Hunter Boots',zh:'寻宝者之靴',ja:'宝探しのブーツ'},
  plate_regen:{en:'Crystal Pulse Armor',zh:'水晶脉动铠甲',ja:'クリスタル脈動の鎧'},
  helm_thorns:{en:'Titan Thorn Crown',zh:'泰坦棘冠',ja:'タイタン茨の王冠'},
  shield_wood:{en:'Wooden Shield',zh:'木盾',ja:'木の盾'},
  shield_iron:{en:'Iron Knight Shield',zh:'铁骑士盾',ja:'鉄騎士の盾'},
  shield_flame:{en:'Ember Shield',zh:'炭火之盾',ja:'燠火の盾'},
  shield_venom:{en:'Toxin Shield',zh:'毒素之盾',ja:'毒の盾'},
  shield_storm:{en:'Storm Shield',zh:'风暴之盾',ja:'嵐の盾'},
  shield_frost:{en:'Frost Dawn Shield',zh:'霜晓之盾',ja:'氷暁の盾'},
  shield_dark:{en:'Shadow Shield',zh:'暗影之盾',ja:'影の盾'},
  helm_carapace:{en:'Centipede Carapace Helm',zh:'蜈蚣甲盔',ja:'ムカデ甲の兜'},
  plate_carapace:{en:'Centipede Carapace Armor',zh:'蜈蚣甲铠',ja:'ムカデ甲の鎧'},
  shield_carapace:{en:'Centipede Carapace Shield',zh:'蜈蚣甲盾',ja:'ムカデ甲の盾'},
  bag:{en:'Large Leather Bag',zh:'大皮背包',ja:'大きな革のバッグ'},
  /* ---- perabot yang bisa dibuat & diletakkan (ITEMS f_*) ---- */
  f_table:{en:'Wooden Table',zh:'木桌',ja:'木のテーブル'},
  f_chair:{en:'Wooden Chair',zh:'木椅',ja:'木の椅子'},
  f_bed:{en:'Bed',zh:'床',ja:'ベッド'},
  f_chest:{en:'Storage Chest',zh:'储物箱',ja:'収納チェスト'},
  f_boat:{en:'Wooden Boat',zh:'木船',ja:'木のボート'},
  f_board:{en:'Quest Board',zh:'任务板',ja:'クエスト掲示板'},
  f_workbench:{en:'Workbench',zh:'工作台',ja:'作業台'},
  f_anvil:{en:'Anvil',zh:'铁砧',ja:'金床'},
  f_stove:{en:'Cooking Stove',zh:'炉灶',ja:'かまど'},
  f_campfire:{en:'Campfire',zh:'营火',ja:'焚き火'},
  f_house:{en:'Wooden House',zh:'木屋',ja:'木の家'},
};

/* ----------------------------------------------------------------- MOB NAMES */
const I18N_MOBS={
  slime:{en:'Slime',zh:'史莱姆',ja:'スライム'},
  boar:{en:'Wild Boar',zh:'野猪',ja:'イノシシ'},
  golem:{en:'Golem',zh:'石魔像',ja:'ゴーレム'},
  wolf:{en:'Wolf',zh:'狼',ja:'オオカミ'},
  scorpion:{en:'Scorpion',zh:'蝎子',ja:'サソリ'},
  rabbit:{en:'Rabbit',zh:'兔子',ja:'ウサギ'},
  dragon:{en:'Dragon',zh:'龙',ja:'ドラゴン'},
  lizard:{en:'Swamp Lizard',zh:'沼泽蜥蜴',ja:'沼のトカゲ'},
  cow:{en:'Cow',zh:'牛',ja:'牛'},
  horse:{en:'Horse',zh:'马',ja:'馬'},
  kelabang:{en:'Giant Centipede',zh:'巨型蜈蚣',ja:'大ムカデ'},
  /* potongan ruas kelabang yang terlepas saat induknya mati */
  kelabang_part:{en:'Centipede Segment',zh:'蜈蚣体节',ja:'ムカデの体節'},
  kumbang:{en:'Horned Beetle',zh:'独角甲虫',ja:'カブトムシ'},
  yeti:{en:'Yeti',zh:'雪人',ja:'イエティ'},
  semut:{en:'Giant Ant',zh:'巨蚁',ja:'大アリ'},
  /* penjaga hantu bersabit khas reruntuhan/dungeon */
  reaper:{en:'Reaper',zh:'死神',ja:'リーパー'},
};

/* --------------------------------------------------------------- BIOME NAMES */
const I18N_BIOMES={
  'Hutan Rimba':{en:'Deep Forest',zh:'密林',ja:'深い森'},
  'Gurun Pasir':{en:'Sand Desert',zh:'沙漠',ja:'砂漠'},
  'Tundra Salju':{en:'Snow Tundra',zh:'雪原苔原',ja:'雪のツンドラ'},
  'Pegunungan':{en:'Mountains',zh:'山脉',ja:'山岳'},
  'Laut':{en:'Ocean',zh:'海洋',ja:'海'},
  'Pantai':{en:'Beach',zh:'海滩',ja:'浜辺'},
  'Tanah Merah':{en:'Redlands',zh:'赤红之地',ja:'赤土の地'},
};

/* -------------------------------------------------------------------- RARITY */
const I18N_RARITY={
  common:{en:'Common',zh:'普通',ja:'コモン'},
  uncommon:{en:'Uncommon',zh:'不凡',ja:'アンコモン'},
  rare:{en:'Rare',zh:'稀有',ja:'レア'},
  epic:{en:'Epic',zh:'史诗',ja:'エピック'},
  legendary:{en:'Legendary',zh:'传说',ja:'レジェンダリー'},
};

/* ------------------------------------------------------- EQUIPMENT EFFECTS */
const I18N_EFFECTS={
  bleed:{en:['Open Wound','25% chance to make the target bleed (3 follow-up hits)'],
    zh:['裂伤','25% 概率使目标流血（3 次追加伤害）'],
    ja:['裂傷','25%の確率で対象を出血させる（追加ダメージ3回）']},
  shock:{en:['Lightning Sting','Lightning jumps to 2 nearby enemies (50% damage)'],
    zh:['雷击','闪电跳跃至附近 2 个敌人（50% 伤害）'],
    ja:['雷撃','近くの敵2体に電撃が跳ねる（ダメージ50%）']},
  venomB:{en:['Venom Blade','Every hit poisons the target (stacking damage)'],
    zh:['毒刃','每次命中都会使目标中毒（伤害叠加）'],
    ja:['毒の刃','攻撃ごとに対象を毒にする（累積ダメージ）']},
  frost:{en:['Frost Bite','Slows the target 45% for 2.5 seconds'],
    zh:['冰咬','使目标减速 45%，持续 2.5 秒'],
    ja:['氷の噛みつき','対象を2.5秒間45%減速']},
  quake:{en:['Earth Slam','Finishing blow triggers an area shockwave'],
    zh:['大地重击','终结技引发范围冲击波'],
    ja:['大地の一撃','フィニッシュ攻撃が範囲衝撃波を発生']},
  crush:{en:['Jolting Fist','Bare-handed hit staggers the enemy (0.9s slow)'],
    zh:['震拳','空手攻击使敌人踉跄（减速 0.9 秒）'],
    ja:['衝撃の拳','素手攻撃で敵をよろめかせる（0.9秒減速）']},
  swift:{en:['Light Step','+8% movement speed'],
    zh:['轻步','+8% 移动速度'],ja:['軽い足取り','移動速度 +8%']},
  guard:{en:['Steady Stance','-25% stamina cost'],
    zh:['稳固架势','-25% 体力消耗'],ja:['堅固な構え','スタミナ消費 -25%']},
  greed:{en:['Golden Blessing','+25% XP from monsters'],
    zh:['黄金祝福','怪物经验 +25%'],ja:['黄金の祝福','モンスターからのXP +25%']},
  regen:{en:['Crystal Pulse','Recover 1.2 HP per second'],
    zh:['水晶脉动','每秒恢复 1.2 生命'],ja:['クリスタルの脈動','毎秒1.2HP回復']},
  thorns:{en:['Titan Thorns','Reflect 30% damage to the attacker'],
    zh:['泰坦之棘','反弹 30% 伤害给攻击者'],ja:['タイタンの茨','攻撃者に30%ダメージを反射']},
};

/* --------------------------------------------------------------- SUBSKILLS */
const I18N_SUBSKILLS={
  logging:{en:'Logging',zh:'伐木',ja:'伐採'},
  mining:{en:'Mining',zh:'采矿',ja:'採掘'},
  harvesting:{en:'Harvesting',zh:'采集',ja:'採取'},
  combat:{en:'Combat',zh:'战斗',ja:'戦闘'},
  blocking:{en:'Blocking',zh:'格挡',ja:'受け'},
  crafting:{en:'Crafting',zh:'制作',ja:'クラフト'},
  cooking:{en:'Cooking',zh:'烹饪',ja:'料理'},
  farming:{en:'Farming',zh:'农耕',ja:'農業'},
  agility:{en:'Agility',zh:'敏捷',ja:'敏捷'},
};

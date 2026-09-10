'use strict';
/* =============================================================================
   I18N DATA 2 — skill tree, NPC role/skill, dialog, dan frasa UI
   Dipakai oleh js/i18n_engine.js.
   ============================================================================= */

/* ------------------------------------------------------------- SKILL TREE */
const I18N_SKILLS={
  dmg:{en:['Sharp Blade','+10% damage / rank'],
    zh:['锋利之刃','+10% 伤害 / 等级'],ja:['鋭い刃','ダメージ +10% / ランク']},
  combo:{en:['Combo Flow','Attacks 6% faster / rank'],
    zh:['连击流','攻击速度 +6% / 等级'],ja:['コンボの流れ','攻撃速度 +6% / ランク']},
  slam:{en:['Heavy Slam','5th hit +20% damage / rank · unlocks Earth Slam'],
    zh:['重击','第 5 击 +20% 伤害 / 等级 · 解锁大地重击'],
    ja:['ヘビースラム','5撃目 +20%ダメージ / ランク · 大地の一撃を解放']},
  vamp:{en:['Vampiric Blade','Recover HP 2.7% of damage dealt / rank'],
    zh:['吸血之刃','恢复所造成伤害的 2.7% 生命 / 等级'],ja:['吸血の刃','与ダメージの2.7%HP回復 / ランク']},
  whirl:{en:['Whirlwind Slash','Spin and slash all enemies around (radius 3.6) · 30 stamina'],
    zh:['旋风斩','旋转斩击周围所有敌人（半径 3.6）· 30 体力'],
    ja:['旋風斬','周囲の敵を回転斬り（半径3.6）· スタミナ30']},
  roar:{en:['War Cry','Nearby monsters recoil in fear · +35% damage for 8s'],
    zh:['战吼','附近怪物惊惧后退 · +35% 伤害持续 8 秒'],
    ja:['戦の叫び','周囲のモンスターが怯む · 8秒間ダメージ+35%']},
  blk_guard:{en:['Defensive Stance','+3% block chance / rank while using a shield'],
    zh:['防御架势','装备盾牌时格挡率 +3% / 等级'],
    ja:['防御の構え','盾装備時にブロック率 +3% / ランク']},
  blk_solid:{en:['Solid Shield','Blocks absorb +5% more damage / rank'],
    zh:['坚固之盾','格挡吸收伤害 +5% / 等级'],
    ja:['堅固な盾','ブロックの吸収ダメージ +5% / ランク']},
  blk_bastion:{en:['Unshaken Bastion','Successful blocks cause no knockback · +8% block chance'],
    zh:['不动堡垒','格挡成功不再被击退 · 格挡率 +8%'],
    ja:['不動の砦','ブロック成功で吹き飛ばされない · ブロック率 +8%']},
  run:{en:['Runner','+3% movement speed / rank'],
    zh:['疾行者','+3% 移动速度 / 等级'],ja:['ランナー','移動速度 +3% / ランク']},
  stam:{en:['Endurance','Stamina cost -7.5% / rank'],
    zh:['耐力','体力消耗 -7.5% / 等级'],ja:['持久力','スタミナ消費 -7.5% / ランク']},
  swim:{en:['Swimmer','Swim much faster'],
    zh:['泳者','游泳速度大幅提升'],ja:['泳ぎ手','泳ぎがかなり速くなる']},
  djump:{en:['Double Jump','Press jump again mid-air for a second jump · reach ~3 blocks · no cooldown'],
    zh:['二段跳','空中再次跳跃 · 可达约 3 格 · 无冷却'],
    ja:['二段ジャンプ','空中で再度ジャンプ · 約3ブロック · クールダウンなし']},
  harv:{en:['Harvester','+15% harvest yield / rank'],
    zh:['收割者','+15% 采集产量 / 等级'],ja:['収穫者','収穫量 +15% / ランク']},
  axe:{en:['Lumberjack','Chop trees +18% faster & +9% extra wood chance / rank'],
    zh:['伐木工','砍树速度 +18%，额外木材机率 +9% / 等级'],
    ja:['木こり','伐採速度 +18%・木材追加確率 +9% / ランク']},
  cook:{en:['Cook','Unlock Salad · food +25% hunger'],
    zh:['厨师','解锁沙拉 · 食物饱食 +25%'],ja:['コック','サラダ解放 · 食料の満腹 +25%']},
  smith:{en:['Blacksmith','Unlock iron armor set'],
    zh:['铁匠','解锁铁质护甲套装'],ja:['鍛冶師','鉄防具セットを解放']},
  gourmet:{en:['Gourmet','Unlock Berry Pie & Cake (speed buff)'],
    zh:['美食家','解锁浆果派与蛋糕（速度加成）'],ja:['グルメ','ベリーパイとケーキ解放（速度バフ）']},
  alchem:{en:['Healer','Unlock healing Bandage'],
    zh:['医者','解锁治疗绷带'],ja:['医療者','回復用の包帯を解放']},
  herb:{en:['Herbal Potion','Instantly recover 35 HP without items (+13% / rank)'],
    zh:['草药药剂','无需道具立即恢复 35 生命（+13% / 等级）'],ja:['ハーブ薬','アイテムなしで即座に35HP回復（+13% / ランク）']},
  groot:{en:['Gatherer Instinct','Opens the gatherer path · +5% all gathering yield'],
    zh:['采集本能','开启采集路线 · 所有采集产量 +5%'],
    ja:['採集の本能','採集ルート解放 · 全採集量 +5%']},
  logm:{en:['Skilled Lumberjack','+5% chance of extra wood / rank'],
    zh:['熟练伐木工','额外木材概率 +5% / 等级'],ja:['熟練の木こり','追加木材の確率 +5% / ランク']},
  minm:{en:['Skilled Miner','+5% chance of extra stone & ore / rank'],
    zh:['熟练矿工','额外石头与矿石概率 +5% / 等级'],
    ja:['熟練の採掘者','追加の石・鉱石確率 +5% / ランク']},
  wildm:{en:['Skilled Forager','+5% chance of extra fiber, berry & mushroom / rank'],
    zh:['熟练拾荒者','额外纤维、浆果与蘑菇概率 +5% / 等级'],
    ja:['熟練の採取者','追加の繊維・ベリー・キノコ確率 +5% / ランク']},
  greenthumb:{en:['Green Thumb','+6% chance of extra farm yield / rank'],
    zh:['绿手指','额外农田产量概率 +6% / 等级'],ja:['緑の指','追加の農作物確率 +6% / ランク']},
  mgather:{en:['Nature Master','+25% all gathering yield'],
    zh:['自然大师','所有采集产量 +25%'],ja:['自然の達人','全採集量 +25%']},
  catcher:{en:['Novice Tamer','+10% stamina drain & -10% rope tension · unlocks Saddle recipe'],
    zh:['新手驯兽师','+10% 体力消耗 与 -10% 绳索张力 · 解锁鞍配方'],
    ja:['見習いテイマー','スタミナ減少 +10%・ロープ張力 -10% · サドルのレシピ解放']},
  catch_pow:{en:['Strong Pull','+10% monster stamina drain while tugging / rank'],
    zh:['强力拉拽','拉锯时怪物体力消耗 +10% / 等级'],
    ja:['強い引き','綱引き中のスタミナ減少 +10% / ランク']},
  catch_rope:{en:['Flexible Rope','-7.5% rope tension buildup / rank'],
    zh:['柔韧绳索','绳索张力增长 -7.5% / 等级'],ja:['柔軟なロープ','張力の上昇 -7.5% / ランク']},
  catch_calm:{en:['Calm Voice','Monsters flee 7.5% slower while being caught / rank'],
    zh:['平静之声','捕捉时怪物逃跑速度 -7.5% / 等级'],
    ja:['穏やかな声','捕獲中のモンスターの逃走が7.5%遅くなる / ランク']},
  catch_master:{en:['Grand Tamer','+25% stamina drain & -10% tension · easier to catch bosses/dragons'],
    zh:['伟大驯兽师','+25% 体力消耗 与 -10% 张力 · 更易捕捉首领/龙'],
    ja:['偉大なテイマー','スタミナ減少 +25%・張力 -10% · ボス/ドラゴンの捕獲が容易']},
};

/* --------------------------------------------------------- NPC ROLE & SKILL */
const I18N_ROLES={
  guard:{en:'Village Guard',zh:'村庄守卫',ja:'村の衛兵'},
  hunter:{en:'Hunter',zh:'猎人',ja:'狩人'},
  miner:{en:'Miner',zh:'矿工',ja:'鉱夫'},
  farmer:{en:'Farmer',zh:'农夫',ja:'農夫'},
  herbal:{en:'Village Healer',zh:'村庄医者',ja:'村の医者'},
  warrior:{en:'Fighter',zh:'战士',ja:'戦士'},
  guardian:{en:'Guardian',zh:'护卫者',ja:'ガーディアン'},
  lionknight:{en:'Lion Knight',zh:'狮人骑士',ja:'獅子の騎士'},
  elfmage:{en:'Elf Mage',zh:'精灵法师',ja:'エルフの魔術師'},
  stonegiant:{en:'Stone Giant',zh:'石巨人',ja:'岩の巨人'},
  rabbitwarrior:{en:'Claw Rabbit',zh:'利爪兔',ja:'爪のウサギ'},
  goblin:{en:'Gold Goblin',zh:'黄金哥布林',ja:'黄金のゴブリン'},
  merchant:{en:'Merchant',zh:'商人',ja:'商人'},
  dungeonmaster:{en:'Dungeon Master',zh:'地牢大师',ja:'ダンジョンマスター'},
};

const I18N_ROLE_SKILLS={
  bulwark:{en:['Village Bulwark','Damage taken -20%'],
    zh:['村庄壁垒','受到伤害 -20%'],ja:['村の防壁','被ダメージ -20%']},
  keen:{en:['Hunter Eye','+25% damage & longer attack reach'],
    zh:['猎人之眼','+25% 伤害且攻击距离更远'],ja:['狩人の眼','ダメージ +25%・攻撃範囲が長い']},
  digger:{en:['Mining Hands','Mines 2× faster & sometimes extra materials'],
    zh:['采矿之手','挖掘速度 2 倍且偶得额外材料'],
    ja:['採掘の手','採掘速度2倍・時々追加素材']},
  green:{en:['Green Thumb','Faster farming & +1 harvest'],
    zh:['绿手指','农耕更快且收获 +1'],ja:['緑の指','農作業が速く収穫 +1']},
  mend:{en:['Healing Hands','Restores 1.5 HP/s to nearby player'],
    zh:['治疗之手','为附近玩家每秒恢复 1.5 生命'],
    ja:['癒しの手','近くのプレイヤーに毎秒1.5HP回復']},
  taunt:{en:['Living Shield','Draws monster attention onto itself'],
    zh:['活体护盾','吸引怪物攻击自身'],ja:['生きた盾','モンスターの注意を引きつける']},
  aegis:{en:['Protective Aegis','Damage taken by whole team & player -18% · lures monsters'],
    zh:['守护神盾','全队与玩家受到伤害 -18% · 吸引怪物'],
    ja:['守りのイージス','味方とプレイヤーの被ダメージ -18% · モンスターを誘引']},
  lionclaw:{en:['Lion Roar','Passive Lion Claw: +20% damage · longer sword reach · lures monsters · Active LION ROAR: two-wave 360° roar (1.3× + 0.7×) damaging and pushing all monsters around'],
    zh:['狮吼','被动狮爪：+20% 伤害 · 剑刃距离更远 · 吸引怪物 · 主动狮吼：360° 双波咆哮（1.3× + 0.7×）伤害并击退周围所有怪物'],
    ja:['獅子の咆哮','パッシブ獅子の爪：ダメージ+20%・剣の範囲延長・モンスター誘引 · アクティブ獅子の咆哮：360°二段咆哮（1.3倍＋0.7倍）で周囲のモンスターにダメージと吹き飛ばし']},
  arcane:{en:['Arcane Blessing','+18% damage for the whole team · player stamina recovers faster'],
    zh:['秘法祝福','全队 +18% 伤害 · 玩家体力恢复更快'],
    ja:['アルケインの祝福','味方全体のダメージ +18%・プレイヤーのスタミナ回復が速い']},
  quake:{en:['Earth Slam','Mace slam shakes the ground · big damage & lures monsters'],
    zh:['大地重击','锤击震动大地 · 高伤害并吸引怪物'],
    ja:['大地の一撃','メイスの一撃が地を揺らす · 大ダメージとモンスター誘引']},
  rapidclaw:{en:['Rapid Claw','5 lightning claw strikes · 3rd combo claw +30% damage'],
    zh:['迅爪','5 次闪电爪击 · 第 3 击 +30% 伤害'],
    ja:['ラピッドクロー','5連続の爪撃 · 3撃目 +30%ダメージ']},
  backstab:{en:['Backstab Leap','Leaps onto a monster back · 5 consecutive stabs (total 5× damage) · the mounted monster cannot retaliate'],
    zh:['背刺跃击','跃上怪物背部 · 连续 5 次刺击（总计 5 倍伤害）· 被骑乘的怪物无法反击'],
    ja:['バックスタブリープ','モンスターの背に飛び乗り5連続刺突（合計5倍ダメージ）· 乗られたモンスターは反撃不能']},
  support:{en:['Arcane Support','Healing Aura gradually restores the team · Shield Aura adds team DEF · Star Shower erodes enemy HP'],
    zh:['秘法支援','治疗光环持续恢复全队 · 护盾光环提升全队防御 · 星辰之雨侵蚀敌人生命'],
    ja:['アルケイン支援','ヒーリングオーラで味方を継続回復 · シールドオーラで味方の防御UP · 星の雨で敵のHPを削る']},
  trade:{en:['Trader Soul','Sells goods & buys your loot'],
    zh:['商魂','出售商品并收购你的战利品'],ja:['商人の魂','商品を売り、戦利品を買い取る']},
  dchange:{en:['Ruins Keeper','Sells Dungeon Changers — changes dungeon level'],
    zh:['遗迹守护者','出售地牢变换器——改变地牢等级'],
    ja:['遺跡の守り手','ダンジョンチェンジャーを販売——ダンジョンのLvを変更']},
};

/* ------------------------------------------------------------- NPC DIALOG */
/* Kunci = baris asli bahasa Indonesia (dipakai sebagai id terjemahan). */
const I18N_DIALOG={
  'Desa ini berdiri sejak kakekku masih muda. Aku tak akan membiarkannya jatuh.':
    {en:'This village has stood since my grandfather was young. I will not let it fall.',
     zh:'这座村庄自我祖父年轻时便已存在。我不会让它陷落。',
     ja:'この村は祖父が若い頃から立っている。倒れさせはしない。'},
  'Malam hari jangan jauh-jauh dari obor. Yang berkeliaran di luar bukan rusa.':
    {en:'At night, stay near the torches. What roams out there is not deer.',
     zh:'夜里别离火把太远。外面游荡的可不是鹿。',
     ja:'夜は松明から離れるな。外を歩くものは鹿じゃない。'},
  'Aku terikat sumpah menjaga gerbang, jadi aku tak bisa ikut denganmu.':
    {en:'I am sworn to guard the gate, so I cannot travel with you.',
     zh:'我立誓守卫大门，无法与你同行。',
     ja:'私は門を守る誓いを立てている。共には行けない。'},
  'Kalau kau dengar lolongan dari arah bukit, cepat masuk ke rumah.':
    {en:'If you hear howling from the hills, get inside quickly.',
     zh:'若听见山丘方向的狼嚎，快回屋里。',
     ja:'丘の方から遠吠えが聞こえたら、すぐ家に入れ。'},
  'Jejak rusa di utara makin sedikit belakangan ini.':
    {en:'Deer tracks in the north have grown scarce lately.',
     zh:'最近北边的鹿迹越来越少了。',
     ja:'最近、北の鹿の足跡が少なくなった。'},
  'Aku pemburu desa ini. Sudah lama aku ingin melihat hutan yang lebih jauh.':
    {en:'I am this village hunter. I have long wanted to see farther forests.',
     zh:'我是这村的猎人。我一直想看看更远的森林。',
     ja:'俺はこの村の狩人だ。もっと遠くの森を見たいと思っていた。'},
  'Panahku jarang meleset. Sayangnya berburu sendirian itu membosankan.':
    {en:'My arrows rarely miss. Sadly, hunting alone is dull.',
     zh:'我的箭很少射空。可惜独自狩猎太乏味。',
     ja:'俺の矢は外さない。だが一人の狩りは退屈だ。'},
  'Terowongan lama di bawah desa sudah kututup. Terlalu berbahaya.':
    {en:'I sealed the old tunnel beneath the village. Far too dangerous.',
     zh:'我已封闭村下的旧隧道。太危险了。',
     ja:'村の下の古い坑道は封じた。危険すぎる。'},
  'Aku menggali batu sejak kecil. Beri aku beliung, aku ikut ke mana pun.':
    {en:'I have dug stone since childhood. Give me a pick and I will follow anywhere.',
     zh:'我从小就挖石头。给我一把镐，我哪儿都跟。',
     ja:'子供の頃から石を掘ってきた。ツルハシがあればどこへでも行く。'},
  'Katanya ada urat besi di balik bukit itu. Aku butuh teman perjalanan.':
    {en:'They say there is an iron vein beyond that hill. I need a travel companion.',
     zh:'听说那山后有铁脉。我需要旅伴。',
     ja:'あの丘の向こうに鉄脈があるらしい。旅の仲間が必要だ。'},
  'Jamur merah itu jangan dimakan mentah, percayalah padaku.':
    {en:'Do not eat that red mushroom raw, trust me.',
     zh:'那红蘑菇别生吃，相信我。',
     ja:'あの赤いキノコは生で食べるな、信じてくれ。'},
  'Aku tabib desa. Lukamu itu... biar kuobati kalau kita berjalan bersama.':
    {en:'I am the village healer. That wound... let me treat it if we travel together.',
     zh:'我是村里的医者。你的伤……若我们同行，让我医治。',
     ja:'私は村の医者だ。その傷…共に行くなら治してやる。'},
  'Ramuanku bisa menahan racun, tapi aku tak bisa mengayunkan pedang.':
    {en:'My brew can hold back poison, but I cannot swing a sword.',
     zh:'我的药能抑制毒性，但我不会挥剑。',
     ja:'私の薬は毒を抑えられるが、剣は振れない。'},
  'Pedangku sudah lama tidak mencicipi monster.':
    {en:'My sword has not tasted a monster in a long time.',
     zh:'我的剑很久没尝过怪物了。',
     ja:'俺の剣は長らくモンスターを味わっていない。'},
  'Aku petarung tanpa perang. Bawalah aku, biar tubuh ini berguna lagi.':
    {en:'I am a fighter without a war. Take me along so this body is useful again.',
     zh:'我是无战可打的战士。带我走，让这身躯再有用处。',
     ja:'俺は戦のない戦士だ。連れて行け、この体を再び役立たせろ。'},
  'Kalau kau butuh perisai hidup di garis depan, akulah orangnya.':
    {en:'If you need a living shield on the front line, I am your man.',
     zh:'若你需要前线的活体护盾，我就是那个人。',
     ja:'前線に生きた盾が必要なら、俺が適任だ。'},
  'Perisaiku menahan tiga serangan golem. Ia masih utuh.':
    {en:'My shield held three golem blows. It is still intact.',
     zh:'我的盾挡下三次石魔像的攻击，依然完好。',
     ja:'俺の盾はゴーレムの三撃を受け止めた。まだ無傷だ。'},
  'Selama aku berdiri, tak ada yang lewat.':
    {en:'As long as I stand, nothing gets through.',
     zh:'只要我站着，谁也过不去。',
     ja:'俺が立つ限り、誰も通れない。'},
  'Aku Guardian. Aku tak pandai menyerang, tapi tak ada yang tumbang di belakangku.':
    {en:'I am a Guardian. I am poor at attacking, but no one falls behind me.',
     zh:'我是护卫者。我不擅攻击，但我身后无人倒下。',
     ja:'私はガーディアンだ。攻撃は苦手だが、私の後ろで倒れる者はいない。'},
  'Bawa aku, dan biarkan mereka memukulku, bukan dirimu.':
    {en:'Take me, and let them strike me instead of you.',
     zh:'带上我，让他们打我而不是你。',
     ja:'私を連れて行け。奴らには私を殴らせろ。'},
};

/* ------------------------------------------------- SLOT PERLENGKAPAN PLAYER */
/* Nama slot di ARMOR_SLOTS / PLAYER_GEAR_SLOTS / NPC_GEAR_SLOTS */
/* ------------------------------------------------------------- QUEST (57) ---- */
const I18N_QUESTS={
  q_wood:{
    en:["Wood Stash","The village needs wood to repair house roofs."],
    zh:["木材储备","村庄需要木材修补房屋屋顶。"],
    ja:["木材の備蓄","村の屋根を修繕するために木材が必要です。"]
  },
  q_stone:{
    en:["Foundation Stones","Stone to reinforce the village well walls."],
    zh:["地基石料","需要石料加固村庄水井的井壁。"],
    ja:["基礎の石","村の井戸の壁を補強するための石が必要です。"]
  },
  q_slime:{
    en:["Clear the Slimes","Slimes are roaming the fields and ruining crops."],
    zh:["清理史莱姆","史莱姆在田间徘徊并破坏农作物。"],
    ja:["スライム退治","スライムが畑を荒らして作物を傷つけています。"]
  },
  q_berry:{
    en:["Berry Basket","The tavern is preparing pies and ran out of berries."],
    zh:["浆果提篮","酒馆正在烘焙浆果派，浆果用完了。"],
    ja:["ベリーの籠","酒場でパイを作っていますがベリーが切れてしまいました。"]
  },
  q_boar:{
    en:["Crop-Trashing Boars","Packs of wild boars are trampling the berry gardens."],
    zh:["毁田野猪","野猪群正在践踏浆果园。"],
    ja:["畑荒らしのイノシシ","イノシシの群れがベリー畑を踏み荒らしています。"]
  },
  q_cook:{
    en:["Hunter's Provisions","Cook grilled meat as rations for village guards."],
    zh:["猎人补给","烤制烤肉作为村庄守卫的军粮。"],
    ja:["狩人の食料","村の守衛の食料として焼き肉を料理してください。"]
  },
  q_hoe:{
    en:["Farmer's Hoe","A farmer lost their hoe — craft a replacement."],
    zh:["农夫的锄头","村里的农夫弄丢了锄头——制作一把新的。"],
    ja:["農民のクワ","村の農民がクワを紛失しました — 新しいものを作ってください。"]
  },
  q_fish:{
    en:["River Catch","The tavern chef wants fresh fish from the river."],
    zh:["河边渔获","酒馆大厨需要从河里抓来的新鲜鱼。"],
    ja:["川の獲物","酒場の料理人が川の新鮮な魚を求めています。"]
  },
  q_pelt:{
    en:["Fur for Winter","The tailor needs wolf pelts to sew winter coats."],
    zh:["御寒毛皮","村里的裁缝需要狼皮来制作冬日大衣。"],
    ja:["冬用の毛皮","村の仕立て屋がコート用にオオカミの毛皮を求めています。"]
  },
  q_wolf:{
    en:["Pack on the Forest Edge","Wolves have begun preying on livestock at night."],
    zh:["森林边缘的狼群","狼群开始在夜间捕食村里的家畜。"],
    ja:["森の端の群れ","オオカミが夜間に家畜を襲い始めました。"]
  },
  q_wheat:{
    en:["First Wheat Harvest","Till the ground, sow seeds, and deliver wheat to the tavern."],
    zh:["初次小麦收获","耕耘土地，播下种子，然后将小麦送到酒馆。"],
    ja:["初めての小麦収穫","地面を耕し、種をまき、収穫した小麦を酒場へ届けてください。"]
  },
  q_grill:{
    en:["Tavern Grilled Fish","The tavern is out of meat dishes — grill fish on a campfire or stove."],
    zh:["酒馆烤鱼","酒馆荤菜断货了——在营火或炉灶上烤些鱼。"],
    ja:["酒場の焼き魚","酒場の主菜が切れました — 焚き火かコンロで魚を焼いてください。"]
  },
  q_rope:{
    en:["Tamer's Rope","The village tamer ordered ropes to tame wild creatures."],
    zh:["驯兽师绳索","村里的驯兽师订购绳子来驯服野生怪物。"],
    ja:["調教用のロープ","村の調教師が野生動物を手懐けるためのロープを注文しました。"]
  },
  q_veggie:{
    en:["Vegetables for Tavern","Carrots from your farm purchased for tavern stew."],
    zh:["酒馆蔬菜","酒馆想收购你农田里的胡萝卜来煮汤。"],
    ja:["酒場への野菜","酒場がシチュー用に畑のニンジンを買い取ります。"]
  },
  q_lizard:{
    en:["Swamp Lizards on Riverbank","Swamp lizards spit acid at anyone drawing water."],
    zh:["河边湿地蜥蜴","沼泽蜥蜴向任何靠近取水的人喷吐酸液。"],
    ja:["水辺の沼トカゲ","水を汲む者に沼トカゲが酸を吐きかけてきます。"]
  },
  q_coal:{
    en:["Furnace Fuel","The blacksmith ran out of coal for the forge."],
    zh:["炉灶燃料","铁匠的熔炉缺少煤炭作为燃料。"],
    ja:["かまどの燃料","鍛冶屋の炉の石炭が切れてしまいました。"]
  },
  q_bench:{
    en:["Village Workbench","The carpenter wants another workbench for the workshop."],
    zh:["村庄工作台","木匠想在工坊里再添一张工作台。"],
    ja:["村の作業台","大工が工房にもう一台の作業台を欲しがっています。"]
  },
  q_ingot:{
    en:["Blacksmith's Order","Smelt iron ore into forge-ready bars."],
    zh:["铁匠的订单","将铁矿石熔炼为可锻造的铁锭。"],
    ja:["鍛冶屋の注文","鉄鉱石を精錬して鍛造用のインゴットにしてください。"]
  },
  q_saddle:{
    en:["Rider's Saddle","The tamer needs a saddle to ride captured pets."],
    zh:["骑行马鞍","驯兽师需要马鞍来骑乘捕获的战宠。"],
    ja:["騎乗用の鞍","調教師が捕獲したペットに乗るための鞍を求めています。"]
  },
  q_golem:{
    en:["Forest Golem","Golems are wrecking the road to the neighboring village."],
    zh:["森林魔像","魔像正在破坏通往隔壁村庄的道路。"],
    ja:["森林ゴーレム","ゴーレムが隣村へ続く道を破壊しています。"]
  },
  q_cake:{
    en:["Harvest Festival Cake","Harvest complete — tavern ordered a cake for celebration."],
    zh:["庆典蛋糕","丰收结束——酒馆订购了庆祝用的蛋糕。"],
    ja:["収穫祭のケーキ","収穫完了 — 酒場がお祝い用のケーキを注文しました。"]
  },
  q_yeti:{
    en:["Tundra Snow Giant","The yeti chased hunters away from the northern snow trail."],
    zh:["苔原雪原巨怪","雪人将猎人们赶出了北方的雪山小径。"],
    ja:["ツンドラの雪巨人","イエティが北部の雪道から狩人を追い払っています。"]
  },
  q_crystal:{
    en:["Frost Crystal","Village elders require crystals for protective wards."],
    zh:["冰霜水晶","村里长者需要水晶来制作守护护符。"],
    ja:["霜の結晶","村の長老が守護の護符に水晶を必要としています。"]
  },
  q_anvil:{
    en:["Blacksmith Anvil","The smithy needs a second anvil for enchanting."],
    zh:["锻造铁砧","铁匠工坊需要第二台铁砧来进行附魔。"],
    ja:["鍛冶の金床","工房でエンチャント用にもう一つの金床が必要です。"]
  },
  q_reaper:{
    en:["Ruins Guardian","Scythe-wielding reapers guard chests in the ruins — clear the way."],
    zh:["遗迹守卫","手持镰刀的死神守卫着遗迹宝箱——扫清通路。"],
    ja:["遺跡の番人","大鎌を持つ死神が遺跡のチェストを守っています — 道を切り開きましょう。"]
  },
  q_soul:{
    en:["Soul Shard","Elders study soul shards gathered from deep inside the ruins."],
    zh:["灵魂碎片","长者正在研究从遗迹深处带回的灵魂碎片。"],
    ja:["魂の欠片","長老が遺跡の深部から持ち帰った魂の欠片を研究しています。"]
  },
  q_shell:{
    en:["Carapace for Armor","Blacksmith is forging carapace plate for village guards."],
    zh:["甲壳护甲","铁匠正在为村庄守卫锻造甲壳重铠。"],
    ja:["甲殻の鎧","鍛冶屋が村の守衛のために甲殻の鎧を鍛造しています。"]
  },
  q_scorp:{
    en:["Scorpion Nest","Desert scorpions are menacing trading caravans."],
    zh:["蝎子巢穴","沙漠毒蝎正在袭扰来往的商队。"],
    ja:["サソリの巣","砂漠のサソリが隊商を脅かしています。"]
  },
  q_venom:{
    en:["Venom for Blades","The smith brews Venom Fang — needs desert scorpion venom."],
    zh:["淬毒毒液","铁匠正在调配剧毒獠牙——需要沙漠蝎毒。"],
    ja:["刃用の毒液","毒牙の剣を調合するため — 砂漠のサソリの毒が必要です。"]
  },
  q_sand:{
    en:["Desert Glass Sand","Village artisans smelt desert sand into window glass."],
    zh:["沙漠玻璃沙","村中工匠将沙漠细沙熔制成窗户玻璃。"],
    ja:["砂漠のガラス砂","村の職人が砂漠の砂を溶かして窓ガラスを作ります。"]
  },
  q_desgolem:{
    en:["Desert Stone Golem","Desert golems collapsed the well on the caravan route."],
    zh:["沙漠岩石魔像","沙漠魔像摧毁了商道旁的绿洲水井。"],
    ja:["砂漠の岩石ゴーレム","砂漠のゴーレムが隊商路の井戸を崩壊させました。"]
  },
  q_scorp2:{
    en:["Grand Nest Extermination","All scorpion nests must be cleansed before trade season."],
    zh:["巢穴彻底清理","商贸季开始前必须彻底清除所有蝎子巢穴。"],
    ja:["大巣穴の掃討","交易シーズンが始まる前に全てのサソリの巣を掃討せよ。"]
  },
  q_gold:{
    en:["Desert Gold Ore","Desert mines are rich in gold — collect for village treasury."],
    zh:["沙漠金矿","沙漠矿坑富含黄金——为村庄金库进行采集。"],
    ja:["砂漠の金鉱石","砂漠の鉱山は金が豊富です — 村の金庫のために集めてください。"]
  },
  q_frost:{
    en:["Frost Dawn Sword","Forge a legendary frost blade for the village champions."],
    zh:["霜晨之剑","为村庄勇士锻造一把散发冰霜气息的传奇宝剑。"],
    ja:["霜の夜明けの剣","村の勇士のために冷気を纏う伝説の剣を鍛造してください。"]
  },
  q_kumbang:{
    en:["Redlands Beetles","Horned beetles hurl boulder fragments onto trade pathways."],
    zh:["红土甲虫","巨角甲虫正在向商道投掷巨石碎块。"],
    ja:["赤土のカブトムシ","角甲虫が交易路に岩の塊を投げつけています。"]
  },
  q_semut:{
    en:["Giant Ant Colony","Giant ants dug tunnels straight into the village warehouse."],
    zh:["巨蚁群落","巨蚁挖通了直达村庄仓库的地底隧道。"],
    ja:["巨大アリのコロニー","巨大アリが村の倉庫までトンネルを掘り進めました。"]
  },
  q_shell2:{
    en:["Redlands Carapace","High-tier carapace armor requires shells from the Redlands."],
    zh:["红土厚壳","高级甲壳重铠需要来自红土荒原的虫壳。"],
    ja:["赤土の重甲殻","高位の甲殻鎧には赤土の荒野の殻が必要です。"]
  },
  q_kumbang2:{
    en:["Grand Beetle Hunt","Swarms of beetles block all pathways into the Redlands."],
    zh:["巨型甲虫狩猎","大群甲虫封锁了通往红土荒原的所有通道。"],
    ja:["大甲虫の狩猟","甲虫の群れが赤土への全ての通路を塞いでいます。"]
  },
  q_core:{
    en:["Boss Core","Cores from colossal foes are used to forge crystal gear."],
    zh:["领主核心","巨兽的核心可用于锻造晶体神装。"],
    ja:["ボスコア","巨大ボスのコアはクリスタル装備の鍛造に使用されます。"]
  },
  q_ritual:{
    en:["Altar Ritual Materials","Altar ritual components drop exclusively from Redlands foes — extremely rare."],
    zh:["祭坛仪式材料","祭坛仪式材料仅掉落自红土地带的魔物——极为稀有。"],
    ja:["祭壇の儀式素材","祭壇の儀式素材は赤土の魔物からのみドロップします — 非常に希少です。"]
  },
  q_semut2:{
    en:["Deepest Ant Nest","The deepest ant nest in the Redlands must be brought down."],
    zh:["最深蚁巢","必须彻底摧毁红土深处的蚁巢核心。"],
    ja:["最深部のアリの巣","赤土の最深部にあるアリの巣を壊滅させなければなりません。"]
  },
  q_titan:{
    en:["Titan Crusher","Forge the ultimate blade from a Redlands boss core."],
    zh:["泰坦粉碎者","用红土霸主的核心锻造最强大的神兵。"],
    ja:["タイタンクラッシャー","赤土のボスコアから最強の剣を鍛造してください。"]
  },
  q_dragon:{
    en:["Mountain Dragon","The mountain dragon scorches forests every time it takes flight. Mountains are now Lv 50–75 zone."],
    zh:["高山巨龙","高山巨龙每次掠空都会点燃森林。山脉现为 Lv 50–75 高危区域。"],
    ja:["高山のドラゴン","山岳のドラゴンが飛ぶたびに森を焼き払っています。山岳は現在 Lv 50-75 ゾーンです。"]
  },
  q_toxic:{
    en:["Deadly Centipede Venom","The most lethal venom in the Redlands — harvested only from creatures there."],
    zh:["剧毒蜈蚣毒素","红土最为致命的剧毒——唯有那里的魔物才会产出。"],
    ja:["大百足の猛毒","赤土で最も強力な猛毒 — そこに生息する魔物からのみ採取できます。"]
  },
  q_kelabang:{
    en:["Centipede of the Altar","Summon the giant centipede through the Altar ritual, then vanquish it."],
    zh:["祭坛巨蜈蚣","通过祭坛仪式召唤巨型蜈蚣，并将其讨伐。"],
    ja:["祭壇の大百足","祭壇の儀式で大百足を召喚し、討伐してください。"]
  },
  q_reaper2:{
    en:["Ruins Reaper Legion","Reapers in Lv 11+ dungeons are far more vicious — purge an entire fortress."],
    zh:["遗迹死神军团","Lv 11+ 地牢中的死神更为凶残——肃清一整座要塞。"],
    ja:["遺跡の死神軍団","Lv 11以上のダンジョンの死神は極めて凶暴です — 要塞を一つ制圧せよ。"]
  },
  q_soul2:{
    en:["Soul Shard Harvest","Deep dungeons hold immense reserves of soul shards."],
    zh:["收割灵魂碎片","深层地牢中埋藏着大量灵魂碎片。"],
    ja:["魂の欠片の収穫","深層ダンジョンには膨大な魂の欠片が眠っています。"]
  },
  q_dguard:{
    en:["Inner Fortress Guardians","Lv 20+ dungeon fortresses are guarded by tireless elite reapers."],
    zh:["要塞内廷守卫","Lv 20+ 地牢要塞由不知疲倦的精英死神把守。"],
    ja:["要塞内部の番人","Lv 20以上のダンジョン要塞は屈強なエリート死神が守護しています。"]
  },
  q_crystal2:{
    en:["Deep Crystal Mines","Crystal veins deep in dungeons are far richer than surface deposits."],
    zh:["深层水晶矿脉","深层地牢的水晶矿脉远比地表丰富。"],
    ja:["深層クリスタル鉱脈","ダンジョン深部の水晶脈は地表よりも遥かに豊かです。"]
  },
  q_dboss1:{
    en:["First Grand Guardian","Challenge and conquer the Grand Guardian of a dungeon."],
    zh:["初战大守护者","挑战并击溃一座地牢的大守护者。"],
    ja:["最初の大守護者","ダンジョンの大守護者に挑み、撃破してください。"]
  },
  q_core2:{
    en:["Dual Boss Cores","Collect boss cores from multiple dungeons for the pinnacle forgings."],
    zh:["双重领主核心","从多座地牢收集领主核心，用于至高锻造。"],
    ja:["二重のボスコア","最高峰の鍛造のため、複数のダンジョンからボスコアを集めてください。"]
  },
  q_dguard2:{
    en:["Reaper Legion Cleansing","Lv 40+ dungeons are overrun with reapers — exterminate a whole legion."],
    zh:["死神军团湮灭","Lv 40+ 地牢遍布死神——彻底歼灭整个军团。"],
    ja:["死神軍団の壊滅","Lv 40以上のダンジョンは死神に満ちています — 軍団を壊滅させよ。"]
  },
  q_dboss2:{
    en:["Ruins Vanquisher","Defeat the Grand Guardian of a high-level dungeon."],
    zh:["遗迹征服者","击败高阶地牢的大守护者。"],
    ja:["遺跡の征服者","高レベルダンジョンの大守護者を倒してください。"]
  },
  q_soul3:{
    en:["Massive Soul Stockpile","Supplying soul shards for grand rituals demands an extensive expedition."],
    zh:["巨量灵魂储备","为宏大仪式储备灵魂碎片需要长途远征。"],
    ja:["大量の魂の備蓄","大儀式のための魂の欠片を集めるには、過酷な遠征が必要です。"]
  },
  q_dboss3:{
    en:["God of the Ruins","Only the mightiest warriors can bring down a Lv 60+ dungeon Grand Guardian."],
    zh:["废墟主宰","唯有最强的斗士能够斩杀 Lv 60+ 地牢大守护者。"],
    ja:["遺跡の主宰者","最強の戦士のみが Lv 60以上のダンジョン大守護者を討ち取れます。"]
  },
  q_core3:{
    en:["Vault of Boss Cores","Ten boss cores — testament to complete dungeon mastery."],
    zh:["领主核心宝库","十枚领主核心——彻底掌控所有地牢的铁证。"],
    ja:["ボスコアの宝物庫","10個のボスコア — 全てのダンジョンを完全制覇した証。"]
  },
  q_dboss4:{
    en:["Pinnacle of Ruins","The ultimate challenge: the Grand Guardian of a Lv 100 dungeon awaits."],
    zh:["遗迹巅峰绝顶","终极考验：Lv 100 终极地牢大守护者静候挑战。"],
    ja:["遺跡の頂点","究極の試練: Lv 100 ダンジョンの大守護者が待ち受けています。"]
  },
};

const I18N_SLOTS={
  helm:{en:'Head',zh:'头部',ja:'頭'},
  chest:{en:'Body',zh:'身体',ja:'胴'},
  boots:{en:'Feet',zh:'脚部',ja:'足'},
  shield:{en:'Shield',zh:'盾牌',ja:'盾'},
  weapon:{en:'Weapon',zh:'武器',ja:'武器'},
};

/* ------------------------------------------------------- FRASA UI (DOM) ----
   Peta frasa Indonesia -> [en, zh, ja]. Dipakai localizeDOM() untuk menukar
   teks statis maupun hasil render panel. Urutan panjang diproses lebih dulu
   agar frasa panjang tidak terpotong oleh frasa pendek. */
const I18N_PHRASE={
  /* HUD & umum */
  'Pengaturan':['Settings','设置','設定'],
  'Hari':['Day','天','日目'],
  'Koin':['Coins','金币','コイン'],
  'Koinmu:':['Your coins:','你的金币：','所持コイン：'],
  'Kosong':['Empty','空','空'],
  'Tas':['Bag','背包','バッグ'],
  'Kantong':['Pouch','口袋','ポーチ'],
  'Perlengkapan':['Equipment','装备','装備'],
  'Pertahanan':['Defense','防御','防御'],
  'Damage':['Damage','伤害','ダメージ'],
  'Hotbar':['Hotbar','快捷栏','ホットバー'],
  'Skill Tree':['Skill Tree','技能树','スキルツリー'],
  'Skill Points:':['Skill Points:','技能点：','スキルポイント：'],
  'Proficiency':['Proficiency','熟练度','熟練度'],
  'Crafting':['Crafting','制作','クラフト'],
  'Peti Penyimpanan':['Storage Chest','储物箱','収納チェスト'],
  'Isi Peti':['Chest Contents','箱内物品','チェストの中身'],
  'Rekan Tim':['Team Mates','队伍成员','仲間'],
  /* judul panel daftar rekan (dibuka tombol G) — nama panelnya memang "Party" */
  'Party':['Party','队伍','パーティ'],
  'Pedagang Desa':['Village Merchant','村庄商人','村の商人'],
  'Landasan Tempa':['Anvil','铁砧','金床'],
  'Bantuan':['Help','帮助','ヘルプ'],
  'Beli':['Buy','购买','購入'],
  'Jual':['Sell','出售','売却'],
  'Slot Mob':['Mob Slots','宠物栏','モブスロット'],
  'Pet':['Pet','宠物','ペット'],
  'Bag':['Bag','背包','バッグ'],

  /* Panel Karakter (potret HUD → stat detail) */
  'Karakter':['Character','角色','キャラクター'],
  'Geser untuk memutar':['Drag to rotate','拖动旋转','ドラッグで回転'],
  'Monster dikalahkan':['Monsters defeated','击败的怪物','倒したモンスター'],
  'Vital':['Vitals','生命状态','バイタル'],
  'Regenerasi':['Regeneration','生命回复','再生'],
  'Serangan':['Attack','攻击','攻撃'],
  'Senjata':['Weapon','武器','武器'],
  'Kecepatan serang':['Attack speed','攻击速度','攻撃速度'],
  'Critical':['Critical','暴击','クリティカル'],
  'Jangkauan':['Reach','攻击范围','リーチ'],
  'Lifesteal':['Life steal','吸血','吸血'],
  'Balasan duri':['Thorns reflect','荆棘反弹','茨の反射'],
  'Tangan kosong':['Bare hands','空手','素手'],
  'Reduksi armor':['Armor reduction','护甲减伤','防具軽減'],
  'Tameng':['Shield','盾牌','盾'],
  'tidak memakai':['not equipped','未装备','未装備'],
  'Peluang block':['Block chance','格挡率','ブロック率'],
  'Kekuatan block':['Block power','格挡强度','ブロック強度'],
  'Rata-rata damage ditahan':['Average damage blocked','平均格挡伤害','平均ブロックダメージ'],
  'Benteng Tak Goyah':['Unshaken Bastion','不动堡垒','不動の砦'],
  'tidak terpental':['no knockback','不被击退','吹き飛ばされない'],
  'Gerak':['Movement','移动','移動'],
  'Kecepatan gerak':['Movement speed','移动速度','移動速度'],
  'Biaya stamina':['Stamina cost','体力消耗','スタミナ消費'],
  'Dodge cooldown':['Dodge cooldown','闪避冷却','回避クールダウン'],
  'Lompat ganda':['Double jump','二段跳','二段ジャンプ'],
  'Perenang':['Swimmer','泳者','泳ぎ手'],
  'Efek Perlengkapan':['Equipment Effects','装备效果','装備効果'],

  /* Panel pet */
  'hanya 1 pet yang bisa deploy':['only 1 pet can be deployed','只能派出 1 只宠物','出せるペットは1体のみ'],
  'Slot kosong':['Empty slot','空栏位','空きスロット'],
  'Tangkap mob memakai Tali':['Catch a mob using Rope','使用绳子捕捉怪物','ロープでモブを捕まえる'],
  'Aktif':['Active','出战中','出撃中'],
  'Simpan':['Store','收回','しまう'],
  'Deploy':['Deploy','派出','出す'],
  'Naik':['Level Up','升级','レベルアップ'],
  'Makan':['Feed','喂食','餌をあげる'],
  'Sadel':['Saddle','鞍','サドル'],
  'Lepas':['Release','放生','放す'],
  'Tangkap':['Catch','捕捉','捕獲'],
  'Turun':['Dismount','下来','降りる'],
  'Naiki':['Ride','骑乘','乗る'],
  'Tarik! Jangan sampai tali putus!':['Pull! Do not let the rope snap!','拉！别让绳子断掉！','引け！ロープを切らすな！'],
  'Stamina Monster':['Monster Stamina','怪物体力','モンスターのスタミナ'],
  'Ketegangan Tali':['Rope Tension','绳索张力','ロープの張力'],

  /* Settings */
  'Setelan tersimpan otomatis.':['Settings are saved automatically.','设置会自动保存。','設定は自動的に保存されます。'],

  /* Menu utama */
  'Load Game':['Load Game','读取游戏','ロード'],
  'New Game':['New Game','新游戏','新しいゲーム'],
  'Musik':['Music','音乐','音楽'],
  'pilih slot':['choose a slot','选择存档位','スロットを選択'],
  'Putar musik':['Play music','播放音乐','音楽を再生'],
  'Volume':['Volume','音量','音量'],
  'Perubahan disimpan otomatis.':['Changes are saved automatically.','更改会自动保存。','変更は自動的に保存されます。'],
  'Kembali':['Back','返回','戻る'],
  'Slot':['Slot','存档','スロット'],
  'Voxel Survival':['Voxel Survival','体素生存','ボクセルサバイバル'],
  'Memuat dunia...':['Loading world...','正在加载世界...','ワールドを読み込み中...'],
  'KAMU MATI':['YOU DIED','你已死亡','あなたは死んだ'],
  'Respawn':['Respawn','重生','リスポーン'],

  /* Tutorial */
  'PANDUAN DASAR':['BASIC GUIDE','基础指南','基本ガイド'],
  'Mengerti':['Got it','明白','了解'],

  /* ---------------- ALTAR RITUAL ---------------- */
  'Altar Ritual':['Ritual Altar','仪式祭坛','儀式の祭壇'],
  'Isi seluruh ingredient untuk memulai ritual pemanggilan boss.':
    ['Fill every ingredient to begin the boss summoning ritual.',
     '填满所有材料以开始召唤首领的仪式。',
     'すべての材料を満たしてボス召喚の儀式を始める。'],
  'Tidak ada altar aktif.':['No active altar.','没有启用的祭坛。','有効な祭壇はありません。'],
  'MULAI RITUAL':['START RITUAL','开始仪式','儀式を開始'],
  'Ritual memanggil BOSS raksasa setelah hitung mundur 10 detik, lalu altar hancur. Pastikan kamu siap bertarung!':
    ['The ritual summons a giant BOSS after a 10 second countdown, then the altar crumbles. Make sure you are ready to fight!',
     '倒数 10 秒后仪式将召唤巨型首领，随后祭坛崩塌。请确保你已准备好战斗！',
     '10秒のカウントダウン後に巨大なBOSSを召喚し、祭壇は崩れる。戦う準備を整えて！'],
  'Ingredient belum lengkap':['Ingredients are incomplete','材料尚不齐全','材料が揃っていない'],
  'Ritual dimulai! Boss akan muncul dalam 10 detik...':
    ['Ritual started! The boss will appear in 10 seconds...',
     '仪式开始！首领将在 10 秒后出现……',
     '儀式開始！ボスは10秒後に現れる…'],
  'Raksasa terpanggil dari altar!':['the Giant is summoned from the altar!','巨兽已从祭坛被召唤！','巨大なものが祭壇から召喚された！'],

  /* ---------------- LOG PASS (penanda lokasi) ---------------- */
  'Turun dulu untuk menandai lokasi':['Dismount first to mark a location','请先下坐骑再标记位置','位置を記すにはまず降りて'],
  'Log Pass sudah tidak dipegang':['The Log Pass is no longer held','已不再手持定位牌','ログパスを持っていない'],
  'Log Pass kosong — klik untuk menandai lokasi':
    ['Log Pass is empty — click to mark a location','定位牌为空 — 点击标记位置','ログパスは空 — クリックで位置を記す'],
  'Lokasi ditandai:':['Location marked:','已标记位置：','位置を記録：'],
  'belum ditandai':['not marked yet','尚未标记','未記録'],
  'Nama lokasi':['Location name','位置名称','場所の名前'],
  'Tandai lokasi kamu sekarang:':['Mark your current location:','标记你当前的位置：','現在の位置を記す：'],
  'Ganti tanda':['Replace the mark','替换标记','記録を置き換える'],
  'dengan lokasi di sini?':['with the location here?','为此处的位置？','ここの位置に？'],
  'Titik':['Point','地点','地点'],

  /* ---------------- CAPTURE (tambahan) ---------------- */
  'Kelabang tidak bisa ditangkap!':['The Centipede cannot be caught!','蜈蚣无法被捕捉！','ムカデは捕獲できない！'],

  /* ---------------- BUBBLE NPC (tambahan) ---------------- */
  'Tidak ingin ikut siapa pun':['Does not want to join anyone','不愿加入任何人','誰にも従うつもりはない'],

  /* ---------------- TOAST & PESAN SISTEM ---------------- */
  'Tas penuh, item dijatuhkan':['Bag full, item dropped','背包已满，物品掉落','バッグが満杯、アイテムを落とした'],
  'Tas sudah maksimum':['Bag is already maxed','背包已达上限','バッグは最大です'],
  'Tas diperluas!':['Bag expanded!','背包已扩容！','バッグを拡張した！'],
  'Tas penuh — item dijatuhkan, koin kembali':['Bag full — item dropped, coins refunded','背包已满 — 物品掉落，金币退回','バッグ満杯 — アイテムを落とし、コインを返却'],
  'Tas penuh!':['Bag full!','背包已满！','バッグが満杯！'],
  'Peti penuh!':['Chest full!','箱子已满！','チェストが満杯！'],
  'Peti ini sudah kosong':['This chest is already empty','这个箱子已经空了','このチェストは空です'],
  'Koin tidak cukup':['Not enough coins','金币不足','コインが足りません'],
  'Koin kurang — butuh':['Not enough coins — need','金币不足 — 需要','コイン不足 — 必要'],
  'kurang — butuh':['missing — need','不足 — 需要','不足 — 必要'],
  'Membuang':['Dropping','丢弃','捨てる'],
  'dari peti':['from the chest','从箱子','チェストから'],
  'diambil kembali':['taken back','已取回','取り戻した'],
  'Membeli':['Bought','购买','購入'],
  'Menjual':['Sold','出售','売却'],
  'Membuat':['Crafted','制作','製作'],
  'Bahan tidak cukup':['Not enough materials','材料不足','素材が足りません'],
  'Belum terbuka — butuh':['Not unlocked — needs','尚未解锁 — 需要','未解放 — 必要'],
  'Butuh skill sebelumnya!':['Requires the previous skill!','需要前置技能！','前提スキルが必要！'],
  'Butuh proficiency':['Requires proficiency','需要熟练度','熟練度が必要'],
  'Skill point kurang!':['Not enough skill points!','技能点不足！','スキルポイントが足りません！'],
  'Belum ada skill aktif di slot ini — pelajari di':['No active skill in this slot — learn it in','该栏位还没有主动技能 — 请在此学习','このスロットにアクティブスキルがありません — 習得してください'],
  'Stamina kurang!':['Not enough stamina!','体力不足！','スタミナが足りません！'],
  'Terlalu lelah!':['Too tired!','太累了！','疲れすぎている！'],
  'HP sudah penuh':['HP is already full','生命值已满','HPは満タンです'],
  'Sudah kenyang!':['Already full!','已经吃饱了！','もう満腹だ！'],
  'Buff kecepatan 20 detik!':['Speed buff for 20 seconds!','速度加成 20 秒！','20秒間のスピードバフ！'],
  'Pilih makanan di hotbar dulu!':['Select food in the hotbar first!','请先在快捷栏选择食物！','まずホットバーで食料を選んでください！'],
  'Itu bukan makanan!':['That is not food!','那不是食物！','それは食べ物ではない！'],
  'Item ini tidak bisa dipakai!':['This item cannot be equipped!','该物品无法装备！','このアイテムは装備できません！'],
  'Senjata dipakai dari hotbar':['Weapons are used from the hotbar','武器从快捷栏使用','武器はホットバーから使用します'],
  'dilepas':['unequipped','已卸下','外した'],
  'dipakai · Pertahanan':['equipped · Defense','已装备 · 防御','装備 · 防御'],
  'mentah — HP':['raw — HP','生的 — 生命','生 — HP'],
  'Panggang dulu di api unggun.':['Cook it at a campfire first.','请先在营火烤熟。','まず焚き火で焼こう。'],
  'Selamat datang di hutan! Waspadai malam...':['Welcome to the forest! Beware the night...','欢迎来到森林！小心夜晚……','森へようこそ！夜に注意…'],

  /* Farming */
  'Ladang terlalu besar':['Farmland is too large','农田太大了','農地が大きすぎる'],
  'Ladang sudah siap — pilih benih':['Farmland ready — pick a seed','农田已就绪 — 选择种子','農地の準備完了 — 種を選ぶ'],
  'Tanaman masih tumbuh':['The crop is still growing','作物还在生长','作物はまだ育っている'],
  'Tidak ada lahan di sini — cangkul tanah dulu':['No farmland here — till the ground first','这里没有农田 — 请先耕地','ここに農地はない — まず耕そう'],

  /* Capture / pet */
  'Slot mob penuh — jual/lepaskan dulu':['Mob slots full — sell or release first','宠物栏已满 — 请先出售或放生','モブスロット満杯 — 売却か放生を'],
  'Slot mob penuh!':['Mob slots full!','宠物栏已满！','モブスロットが満杯！'],
  'Pegang Tali di hotbar!':['Hold a Rope in the hotbar!','请在快捷栏手持绳子！','ホットバーでロープを持って！'],
  'melawan! Tarik saat ia lelah.':['resists! Pull when it tires.','在反抗！趁它疲惫时拉。','抵抗している！疲れたら引け。'],
  'Tali putus! Monster mengamuk dan tidak bisa ditangkap lagi.':['The rope snapped! The monster rages and can no longer be caught.','绳子断了！怪物暴怒，再也无法被捕捉。','ロープが切れた！モンスターは激怒し、もう捕獲できない。'],
  'dikeluarkan!':['deployed!','已派出！','出した！'],
  'Mob disimpan kembali.':['Mob stored again.','宠物已收回。','モブをしまった。'],
  'melemah dan kembali ke slot.':['weakened and returned to its slot.','虚弱并回到栏位。','弱ってスロットに戻った。'],
  'Sudah memakai Sadel.':['Already wearing a Saddle.','已装上鞍。','すでにサドルを付けている。'],
  'Butuh Sadel! Buat dari Kulit & Kayu.':['Need a Saddle! Craft it from Leather & Wood.','需要鞍！用皮革和木头制作。','サドルが必要！革と木材で作ろう。'],
  'Pasang Sadel dulu dari tas mob.':['Attach a Saddle first from the pet tab.','请先在宠物页装上鞍。','まずペットタブでサドルを付けよう。'],
  'Sadel dipasang ke':['Saddle attached to','鞍已装到','サドルを装着：'],
  'Tekan F untuk naik.':['Press F to ride.','按 F 骑乘。','Fキーで乗る。'],
  'Menunggangi':['Riding','正在骑乘','騎乗中'],
  'Turun dari tunggangan.':['Dismounted.','已下坐骑。','降りた。'],
  'Turun dulu untuk menyerang':['Dismount first to attack','请先下坐骑才能攻击','攻撃するには降りて'],
  'Tidak bisa memakai skill saat menunggangi':['Cannot use skills while riding','骑乘时无法使用技能','騎乗中はスキルを使えない'],
  'butuh XP':['needs XP','需要经验','必要XP'],
  'dulu.':['first.','。','まず。'],
  'Butuh':['Need','需要','必要'],
  'untuk naik level.':['to level up.','来升级。','レベルアップに。'],
  'naik ke Lv':['reached Lv','升到等级','レベル'],
  'Gagal menaikkan':['Failed to level up','升级失败','レベルアップ失敗'],
  'Bahan habis, XP berkurang.':['Materials consumed, XP reduced.','材料消耗，经验减少。','素材を消費し、XPが減った。'],
  'makan! +':['ate! +','进食！+','食べた！+'],
  'dijual +':['sold +','出售 +','売却 +'],
  'koin.':['coins.','金币。','コイン。'],
  'dilepaskan kembali ke alam.':['released back into the wild.','已放归自然。','自然に返した。'],
  'Kemari!':['Come here!','过来！','こっちへ！'],

  /* NPC */
  'Tidak ada penduduk desa di dekatmu':['No villager nearby','附近没有村民','近くに村人はいない'],
  'Ada penduduk desa di sekitar sini — dekati dan tekan F':['There are villagers around — approach and press F','附近有村民 — 靠近并按 F','近くに村人がいる — 近づいてFを押す'],
  'Seorang pedagang membuka lapak di desa ini':['A merchant opened a stall in this village','有商人在此村开设摊位','商人がこの村で店を開いた'],
  'bergabung ke timmu!':['joined your team!','加入了你的队伍！','あなたの仲間になった！'],
  'keluar dari tim':['left the team','离开了队伍','チームを離れた'],
  'Tas rekan penuh':['Companion bag is full','同伴背包已满','仲間のバッグが満杯'],
  'masuk ke tas bekal':['added to the supply bag of','放入补给背包：','の物資バッグに入れた'],
  'memakai':['uses','使用','使用'],
  'kelaparan dan mencari makanan sendiri':['is hungry and looks for food','饥饿并自行寻找食物','空腹で自ら食料を探している'],
  'sendiri (+':['on its own (+','自行 (+','自分で (+'],
  'butuh benih di tasnya untuk farming':['needs seeds in its bag to farm','需要背包里有种子才能耕作','農作業には袋に種が必要'],
  'penuh — ambil isinya dulu':['is full — take the contents first','已满 — 请先取出物品','満杯 — 中身を先に取って'],
  'Mengambil':['Taking','取得','取得'],
  'sedang melintas — dekati dan tekan F':['is passing by — approach and press F','正在经过 — 靠近并按 F','通り過ぎている — 近づいてFを押す'],
  'rekan bergabung kembali':['companions rejoined','名同伴重新加入','人の仲間が再合流'],

  /* Furni */
  'Meja kerja — panel crafting terbuka':['Workbench — crafting panel opened','工作台 — 已打开制作面板','作業台 — クラフト画面を開いた'],
  'Landasan tempa — pilih equipment yang akan ditempa':['Anvil — choose the equipment to forge','铁砧 — 选择要锻造的装备','金床 — 鍛造する装備を選ぶ'],
  'Tungku menyala — waktunya memasak':['Furnace lit — time to cook','熔炉点燃 — 开始烹饪','かまどに火 — 料理の時間'],
  'Apinya masih hangat — istirahat lagi nanti':['The fire is still warm — rest again later','火还温着 — 稍后再休息','火はまだ暖かい — 後で休もう'],
  'Kamu menghangatkan diri':['You warm yourself up','你取暖了','暖を取った'],
  'Terlalu jauh — mendekatlah':['Too far — come closer','太远了 — 靠近一点','遠すぎる — 近づいて'],
  'diletakkan':['placed','已放置','設置した'],
  'Duduk — stamina pulih lebih cepat. Bergerak untuk berdiri.':['Sitting — stamina recovers faster. Move to stand up.','坐下 — 体力恢复更快。移动即起身。','座った — スタミナ回復が速い。動けば立つ。'],
  'Berdiri':['Stand','起身','立つ'],
  'Berlayar — gunakan gerak untuk mengayuh. Tekan aksi untuk turun.':['Sailing — use movement to row. Press action to disembark.','航行 — 使用移动划桨。按动作键下船。','航行中 — 移動で漕ぐ。アクションで降りる。'],
  'Hanya bisa tidur saat malam hari':['You can only sleep at night','只能在夜晚睡觉','夜だけ眠れる'],
  'Ada monster di dekat sini — tidak bisa tidur!':['Monsters are nearby — cannot sleep!','附近有怪物 — 无法睡觉！','近くにモンスターがいる — 眠れない！'],
  'Kau tidur nyenyak':['You slept well','你睡得很好','よく眠れた'],
  'dimulai':['begins','开始','が始まる'],
  'Tidak ada yang bisa diinteraksi di sini':['Nothing to interact with here','这里没有可互动的东西','ここに操作できるものはない'],

  /* Quest & dungeon */
  'Maksimal':['Maximum','最多','最大'],
  'quest aktif — selesaikan dulu salah satunya':['active quests — finish one first','个进行中的任务 — 请先完成一个','個の進行中クエスト — まず一つ完了して'],
  'Quest diambil:':['Quest accepted:','已接受任务：','クエストを受注：'],
  'Quest dilepas:':['Quest abandoned:','已放弃任务：','クエストを破棄：'],
  'Tujuan quest belum selesai':['Quest objective is not complete','任务目标尚未完成','クエスト目標が未達成'],
  'selesai!':['complete!','完成！','完了！'],
  'tujuan tercapai, lapor ke papan quest':['objective reached, report to the quest board','目标达成，请前往任务板汇报','目標達成、クエスト掲示板へ報告'],
  'Kau meninggalkan reruntuhan':['You left the ruins','你离开了遗迹','遺跡を離れた'],
  'Penjaga Agung reruntuhan tingkat':['Grand Guardian of ruins level','遗迹守护者 等级','遺跡の大守護者 レベル'],
  'terbangun!':['awakens!','苏醒了！','目覚めた！'],
  'Reruntuhan Tingkat':['Ruins Level','遗迹等级','遺跡レベル'],
  'DITAKLUKKAN!':['CONQUERED!','已征服！','制圧！'],
  'HP pulih':['HP restored','生命恢复','HP回復'],
  'Hadiah:':['Reward:','奖励：','報酬：'],
  'Harta tingkat':['Treasure level','宝藏等级','宝レベル'],

  /* ---- DUNGEON BERJENIS (benteng / gua) & BANNER "DUNGEON CLEAR" ----
     Kunci panjang didahulukan otomatis (phrases() mengurut per panjang), jadi
     'Penjaga Agung Dungeon Lv' menang atas 'Dungeon Lv', dan 'Buka Peti Emas'
     menang atas 'Buka Peti'. */
  'DUNGEON CLEAR':['DUNGEON CLEAR','地牢已清除','ダンジョン クリア'],
  'BENTENG LV':['FORTRESS LV','要塞 LV','要塞 LV'],
  'GUA LV':['CAVERN LV','洞穴 LV','洞窟 LV'],
  'Benteng Lv':['Fortress Lv','要塞 Lv','要塞 Lv'],
  'Gua Lv':['Cavern Lv','洞穴 Lv','洞窟 Lv'],
  'Dungeon Lv':['Dungeon Lv','地牢 Lv','ダンジョン Lv'],
  'sudah ditaklukkan':['has been conquered','已被征服','制圧済み'],
  'Semua peti terkuras — tempat ini aman':
    ['All chests looted — this place is safe',
     '所有宝箱已搜刮 — 此地安全',
     '全てのチェストを回収 — ここは安全だ'],
  'Penjaga Agung tumbang · masih ada peti tersisa':
    ['Grand Guardian has fallen · chests still remain',
     '大守护者已倒下 · 仍有宝箱未开',
     '大守護者は倒れた · チェストがまだ残っている'],
  'Untuk pemain Lv':['For players Lv','适用玩家 Lv','対象プレイヤー Lv'],
  'untuk pemain Lv':['for players Lv','适用玩家 Lv','対象プレイヤー Lv'],
  'Terlalu kuat untukmu':['Too strong for you','对你来说太强','あなたには強すぎる'],
  'Di bawah levelmu':['Below your level','低于你的等级','あなたのレベル以下'],
  'Levelmu':['Your level','你的等级','あなたのレベル'],
  'sepadan':['a fair match','实力相当','互角'],
  'Kau meninggalkan dungeon':['You left the dungeon','你离开了地牢','ダンジョンを離れた'],
  'Penjaga Agung sudah tumbang, sisa peti belum dikuras':
    ['Grand Guardian has fallen, remaining chests not yet looted',
     '大守护者已倒下，剩余宝箱尚未搜刮',
     '大守護者は倒れたが、残りのチェストは未回収'],
  'Penjaga Agung Dungeon Lv':['Grand Guardian of Dungeon Lv','地牢守护者 Lv','ダンジョンの大守護者 Lv'],
  'dikalahkan! Kuras semua peti untuk menaklukkannya.':
    ['defeated! Loot every chest to conquer it.',
     '已击败！搜刮所有宝箱即可征服。',
     'を倒した！全てのチェストを回収して制圧しよう。'],
  'Penjaga Agung':['Grand Guardian','大守护者','大守護者'],

  /* ---- PETI EMAS HADIAH BOSS ---- */
  'Peti Emas Penjaga Agung':['Grand Guardian Golden Chest','大守护者黄金宝箱','大守護者の黄金チェスト'],
  'Buka Peti Emas':['Open Golden Chest','打开黄金宝箱','黄金チェストを開く'],
  'Peti Harta':['Treasure Chest','宝藏箱','宝のチェスト'],
  'Buka Peti':['Open Chest','打开宝箱','チェストを開く'],
  'Peti Penjaga Agung sudah kosong':
    ['The Grand Guardian chest is already empty','大守护者宝箱已空','大守護者のチェストは空だ'],
  'PETI PENJAGA AGUNG':['GRAND GUARDIAN CHEST','大守护者宝箱','大守護者のチェスト'],
  'Temuan langka:':['Rare find:','稀有发现：','レアな発見：'],
  'Peti emas muncul di arena Penjaga Agung!':
    ['A golden chest appeared in the Grand Guardian arena!',
     '大守护者竞技场中出现了黄金宝箱！',
     '大守護者の闘技場に黄金チェストが現れた！'],
  'Harta Dungeon Lv':['Dungeon treasure Lv','地牢宝藏 Lv','ダンジョンの宝 Lv'],
  /* teks mengambang saat rekan/pet ikut mendapat XP */
  'XP tim':['team XP','队伍经验','チームXP'],

  /* ---- TEKS MENGAMBANG DI DUNIA 3D (FX.text) ----
     Digambar ke canvas, jadi tidak terjangkau localizeDOM; FX.text kini
     memanggil I18N.translateText sendiri (lihat js/effects.js). */
  'mundur!':['retreating!','撤退！','退却！'],
  'siap lagi':['ready again','再次准备','再び戦える'],
  'racun':['poison','中毒','毒'],
  'asam':['acid','酸液','酸'],
  'meronta!':['thrashing!','挣扎！','暴れている！'],

  /* Anvil */
  'Pilih equipment dulu':['Select equipment first','请先选择装备','まず装備を選択'],
  'Sudah level maksimum!':['Already at max level!','已达最高等级！','すでに最大レベル！'],
  'Level':['Level','等级','レベル'],

  /* Monster */
  'Raksasa muncul!':['Giant has appeared!','巨型出现了！','巨大個体が現れた！'],
  'Raksasa dikalahkan!':['Giant defeated!','巨型已被击败！','巨大個体を倒した！'],

  /* Perintah rekan (toast setOrder/setMode) */
  'mengikutimu':['is following you','正在跟随你','あなたに従っている'],
  'mencari resource di sekitarmu':['is gathering resources around you','正在你周围采集资源','周囲で資源を集めている'],
  'menunggu di tempat':['is waiting in place','正在原地等待','その場で待っている'],
  'mengerjakan ladang':['is working the farmland','正在耕作农田','農地で作業している'],

  /* Bubble percakapan NPC (bagian statis) */
  'Bekalku kurang:':['My provisions are short:','我的补给不足：','私の物資が足りない：'],
  'Mau merekrutku ikut bersamamu?':['Would you recruit me to join you?','愿意招募我同行吗？','私を仲間に誘うか？'],
  'Timmu sudah penuh (maks':['Your team is full (max','你的队伍已满（最多','チームが満杯だ（最大'],
  'rekan). ':['members). ','名同伴）。','人）。'],
  'Bubarkan salah satu dulu, baru aku ikut.':['Dismiss one first, then I will join.','请先解散一人，我才加入。','まず一人を解散させれば、私も加わる。'],
  'Aku masih butuh':['I still need','我还需要','まだ必要だ'],
  'Bawakan itu, baru aku ikut.':['Bring that, then I will join.','带来那个，我才加入。','それを持ってこい、そうすれば加わる。'],
  'Ya':['Yes','是','はい'],
  'Tidak':['No','否','いいえ'],
  'Beri':['Give','给予','渡す'],
  'Batal':['Cancel','取消','キャンセル'],
  'Bubarkan':['Dismiss','解散','解散'],
  'Ikuti aku':['Follow me','跟随我','ついてこい'],
  'Cari resource':['Gather resources','采集资源','資源を集める'],
  'Tunggu di sini':['Wait here','在此等待','ここで待て'],
  'Tas rekan (klik untuk ambil)':['Companion bag (click to take)','同伴背包（点击取出）','仲間のバッグ（クリックで取る）'],
  'Beri item (klik item milikmu)':['Give item (click your item)','给予物品（点击你的物品）','アイテムを渡す（自分のアイテムをクリック）'],
  'mode AGRESIF':['mode AGGRESSIVE','模式 攻击','モード 攻撃的'],
  'mode PASIF':['mode PASSIVE','模式 被动','モード 受動的'],
  'Berapa':['How many','数量','いくつ'],
  'untuk':['for','给','へ'],
  'Stok pedagang ini kosong.':['This merchant stock is empty.','此商人没有存货。','この商人の在庫は空だ。'],
  'Tasmu kosong — tidak ada yang bisa dijual.':['Your bag is empty — nothing to sell.','你的背包是空的 — 没有可出售的东西。','バッグが空 — 売るものがない。'],
  'Habis':['Sold out','售罄','売り切れ'],
  'slot tas':['bag slots','背包栏位','バッグスロット'],
  'Buang':['Drop','丢弃','捨てる'],
  'ke tanah?':['on the ground?','到地面上？','地面へ？'],
  'milik':['owned by','属于','の所有'],
  'dari peti ke tanah?':['from the chest to the ground?','从箱子丢到地面？','チェストから地面へ？'],

  /* Crafting & slot perlengkapan */
  'Belum ada resep di kategori ini.':['No recipes in this category yet.','此类别暂无配方。','このカテゴリにレシピはまだありません。'],
  'kosong · klik kanan item di tas untuk memakainya':['empty · right-click an item in the bag to equip it','空 · 右键背包中的物品即可装备','空 · バッグのアイテムを右クリックで装備'],
  'Makanan':['Food','食物','食料'],
  'Senjata':['Weapon','武器','武器'],
  'Armor':['Armor','护甲','防具'],
  'Furnitur':['Furniture','家具','家具'],
  'Bahan & Lainnya':['Materials & Others','材料与其他','素材とその他'],
  'Bahan':['Materials','材料','素材'],
  'Buat':['Craft','制作','作る'],
  'butuh':['needs','需要','必要'],

  /* Tooltip item & kartu resep */
  'Klik kanan untuk memakai':['Right-click to equip','右键装备','右クリックで装備'],
  'Klik untuk melepas':['Click to unequip','点击卸下','クリックで外す'],
  /* ---- baris bawah tooltip slot di panel PETI ----
     Kunci ditulis UTUH (bukan potongan 'Klik' / 'Seret ke tas') supaya tidak
     tercampur dengan frasa lain, dan didahulukan karena lebih panjang. */
  'Klik = ambil · Seret ke tas = titip/ambil':
    ['Click = take · Drag to bag = store/take',
     '点击 = 取出 · 拖到背包 = 存入/取出',
     'クリック = 取り出す · バッグへドラッグ = 預ける/取り出す'],
  'Klik = titip · Seret ke peti = titip':
    ['Click = store · Drag to chest = store',
     '点击 = 存入 · 拖到箱子 = 存入',
     'クリック = 預ける · チェストへドラッグ = 預ける'],
  'kecepatan':['speed','速度','速度'],
  'kritikal · jangkauan':['critical · reach','暴击 · 距离','クリティカル · 射程'],
  'pertahanan':['defense','防御','防御'],
  'Level tempa':['Forge level','锻造等级','鍛造レベル'],
  'Klik item lalu klik slot lain untuk memindahkan.':['Click an item then another slot to move it.','点击物品再点击其他栏位以移动。','アイテムをクリックし別スロットで移動。'],
  'Tekan':['Press','按','押す'],
  'untuk makan item hotbar terpilih.':['to eat the selected hotbar item.','以食用所选快捷栏物品。','選択中のホットバーのアイテムを食べる。'],
  'Pet tidak bisa di-drop. Pet bisa diberi makan, dipasang Sadel, dijual, atau dilepaskan.':
    ['Pets cannot be dropped. Pets can be fed, saddled, sold, or released.',
     '宠物无法丢弃。可以喂食、装鞍、出售或放生。',
     'ペットは捨てられません。餌・サドル・売却・放生が可能です。'],
  'klik untuk menjual':['click to sell','点击出售','クリックで売却'],
  'punya':['have','拥有','所持'],
  'Kosong — beri item dari daftar bawah':['Empty — give an item from the list below','空 — 从下方列表给予物品','空 — 下のリストからアイテムを渡す'],
  'Naik otomatis saat kamu melakukan aksinya. Makin tinggi, makin besar peluang hasil tambahan.':
    ['Rises automatically as you perform the action. The higher it is, the greater the chance of bonus yields.',
     '随着你进行相应行动自动提升。等级越高，额外收获概率越大。',
     '行動するほど自動的に上がる。高いほど追加成果の確率が上がる。'],
  'Isi peti tetap tersimpan walau kamu keluar dari permainan.':
    ['Chest contents stay saved even after you quit the game.',
     '即使退出游戏，箱内物品也会保存。',
     'ゲームを終了してもチェストの中身は保存されます。'],
  'Klik item di peti untuk mengambilnya, klik item di tasmu untuk menitipkannya.':
    ['Click an item in the chest to take it, click an item in your bag to store it.',
     '点击箱内物品取出，点击背包物品存入。',
     'チェストのアイテムをクリックで取り出し、バッグのアイテムをクリックで預ける。'],
  'Tasmu — klik untuk menitipkan':['Your bag — click to store','你的背包 — 点击存入','あなたのバッグ — クリックで預ける'],
  'Titip Semua Resource':['Store All Resources','存入所有资源','資源をすべて預ける'],
  'Harga beli tetap; harga jual setengah harga beli.':['Buy prices are fixed; sell price is half the buy price.','买价固定；卖价为买价的一半。','購入価格は固定、売却は半額。'],
  'Koin didapat dari quest, mengalahkan monster, dan menjual barang.':['Coins come from quests, defeating monsters, and selling goods.','金币来自任务、击败怪物与出售物品。','コインはクエスト・モンスター討伐・売却で得られる。'],
  'Tempa equipment untuk menaikkan Levelnya':['Forge equipment to raise its Level','锻造装备以提升等级','装備を鍛造してレベルを上げる'],
  'bayar dengan':['pay with','支付','支払い'],
  'dan bahan yang relevan dengan equipment-nya.':['and materials relevant to the equipment.','以及与该装备相关的材料。','その装備に関連する素材。'],
  'belum ditempa':['not forged yet','尚未锻造','未鍛造'],
  'Dipakai':['Equipped','已装备','装備中'],
  'Digenggam':['Held','手持','手持ち'],

  /* Hint bar & help */
  'gerak':['move','移动','移動'],
  'lari':['sprint','疾跑','ダッシュ'],
  'dodge':['dodge','翻滚','回避'],
  'serang/makan':['attack/eat','攻击/进食','攻撃/食事'],
  'lompat':['jump','跳跃','ジャンプ'],
  'skill':['skill','技能','スキル'],
  'tas':['bag','背包','バッグ'],
  'crafting':['crafting','制作','クラフト'],
  'rekan':['companions','同伴','仲間'],
  'kamera':['camera','镜头','カメラ'],
  'bantu':['help','帮助','ヘルプ'],

  /* ------ Tambahan cakupan toast/UI (audit i18n) ------ */
  /* frasa penuh — diprioritaskan karena lebih panjang */
  'Pelajari skill Pawang Pemula dulu!':['Learn the Novice Tamer skill first!','请先学习驯兽初学者技能！','まず初級テイマーのスキルを習得しよう！'],
  'Memasang':['Placing','正在放置','設置中'],
  'klik tanah utk geser':['click ground to move','点击地面以移动','地面をクリックで移動'],
  'Putar/Pasang/Batal di bawah':['Rotate/Place/Cancel below','下方 旋转/放置/取消','下で 回転/設置/キャンセル'],
  'Pohon tumbang!':['A tree falls!','树倒了！','木が倒れた！'],
  'Hujan turun...':['Rain begins...','开始下雨……','雨が降ってきた…'],
  'Hujan reda':['Rain stops','雨停了','雨が止んだ'],
  'Layout UI tersimpan':['UI layout saved','界面布局已保存','UIレイアウトを保存した'],
  'Perubahan dibatalkan':['Changes discarded','更改已撤销','変更を取り消した'],
  'js/ui_layout.js berhasil diupdate':['js/ui_layout.js updated successfully','js/ui_layout.js 更新成功','js/ui_layout.js を更新しました'],
  'ui_layout.js tersimpan':['ui_layout.js saved','ui_layout.js 已保存','ui_layout.js を保存した'],
  'ui_layout.js diunduh':['ui_layout.js downloaded','ui_layout.js 已下载','ui_layout.js をダウンロードした'],
  'ditangkap!':['captured!','已捕获！','捕獲した！'],
  '(+12% stat)':['(+12% stats)','（+12% 属性）','（+12% ステータス）'],
  'Error:':['Error:','错误：','エラー：'],
  /* kata tunggal — hanya ditukar bila berdiri sebagai kata utuh */
  'muncul':['appeared','出现了','現れた'],
  'Raksasa':['Giant','巨型','巨大個体'],
  'memakan':['eats','吃掉了','食べた'],
  'koin':['coins','金币','コイン'],
  'blok':['blocks','格','ブロック'],
  'maks':['max','最多','最大'],
  'lagi':['left','剩余','残り'],
  'Rank':['Rank','等级','ランク'],
  'dari':['from','从','から'],
  'Panel':['Panel','面板','パネル'],
  'bermasalah':['has a problem','出现问题','に問題が発生'],
  'Jumlah:':['Amount:','数量：','数量：'],

  /* ------ Tambahan cakupan panel/tutorial/statis (audit i18n penuh) ------ */
  /* Anvil */
  'Tidak ada equipment. Buat pedang/armor/tameng dulu, atau pakai dari tas.':
    ['No equipment. Craft a sword/armor/shield first, or use one from your bag.',
     '没有装备。请先制作剑/护甲/盾牌，或从背包中使用。',
     '装備がありません。まず剣/防具/盾を作るか、バッグから使いましょう。'],
  'Klik salah satu equipment di atas untuk menempa.':
    ['Click one of the equipment above to forge.','点击上方任一装备进行锻造。','上の装備をクリックして鍛造します。'],
  /* Capture */
  'Slot Mob (tidak bisa di-drop)':['Mob Slots (cannot be dropped)','宠物栏（无法丢弃）','モブスロット（捨てられない）'],
  /* Chat / terminal */
  'Kamu:':['You:','你：','あなた：'],
  'Jumlah':['Amount','数量','数量'],
  'Varian Boss (monster)':['Boss Variant (monster)','首领变种（怪物）','ボス種（モンスター）'],
  'item masuk tas otomatis (lebihan dijatuhkan ke tanah)':
    ['items go to your bag automatically (extras dropped on the ground)',
     '物品自动进入背包（多余的掉落到地面）',
     'アイテムは自動でバッグへ（あふれは地面に落ちる）'],
  /* Furni */
  'Putar':['Rotate','旋转','回転'],
  /* UI rekan */
  'Tidak ada rekan yang dipilih.':['No companion selected.','未选择同伴。','仲間が選択されていません。'],
  /* UI Studio */
  'Klik elemen untuk memilih':['Click an element to select','点击元素进行选择','要素をクリックして選択'],
  /* Tutorial (PANDUAN DASAR) */
  'Bergerak: WASD / joystick (mobile).':['Move: WASD / joystick (mobile).','移动：WASD / 摇杆（移动端）。','移動：WASD / ジョイスティック（モバイル）。'],
  'Klik / tombol serang: menyerang, makan saat memegang makanan, mencangkul, menanam, memanen.':
    ['Click / attack button: attack, eat while holding food, till, plant, harvest.',
     '点击/攻击键：攻击、手持食物时进食、耕地、种植、收获。',
     'クリック/攻撃ボタン：攻撃、食料所持中は食事、耕す、植える、収穫。'],
  'tas · ':['bag · ','背包 · ','バッグ · '],
  'skill · ':['skill · ','技能 · ','スキル · '],
  'Cangkul rumput menjadi ladang, lalu tanam benih.':
    ['Till grass into farmland, then plant seeds.','把草地耕成农田，然后种下种子。','草を耕して農地にし、種を植えよう。'],
  'Dekati penduduk lalu tekan F / tombol':['Approach a villager then press F / button','靠近村民然后按 F / 按钮','村人に近づいてF / ボタンを押す'],
  'untuk bicara atau rekrut.':['to talk or recruit.','以交谈或招募。','話す・勧誘する。'],
  'Malam berbahaya — siapkan makanan dan senjata.':
    ['Night is dangerous — prepare food and weapons.','夜晚危险 — 准备好食物和武器。','夜は危険 — 食料と武器を用意しよう。'],

  /* Rumah modular */
  'Sudah ada rumah di petak ini':['A house already occupies this plot','此格已有房屋','この区画にはすでに家がある'],
  'Rumah digabung — total':['House merged — total','房屋已合并 — 共','家を合体 — 合計'],
  'petak':['plots','格','区画'],
  'Petak ini sudah jadi rumah':['This plot is already a house','此格已是房屋','この区画はすでに家だ'],
  'Tidak bisa membangun di air':['Cannot build on water','无法在水上建造','水上には建てられない'],
  'Satu petak rumah dibongkar':['One house plot dismantled','拆除了一格房屋','家を一区画取り壊した'],
  'Ada halangan di petak ini (tebang dulu)':['Something blocks this plot (clear it first)','此格有障碍物（请先清除）','この区画に障害物がある（先に取り除け）'],
  'Daratan tidak rata — ratakan dulu':['Uneven ground — flatten it first','地面不平 — 请先整平','地面が平らでない — 先に整えよう'],

  /* ===========================================================================
     PERBAIKAN CAMPUR BAHASA (audit panel Tas / Crafting / Skill / Party)
     ---------------------------------------------------------------------------
     Beberapa kunci di atas berupa KATA FUNGSI pendek ('untuk', 'dari', 'punya',
     'butuh', 'lagi', 'dulu.'). Karena localizeDOM menukar frasa apa pun yang
     cocok, kata-kata itu menerjemahkan SEBAGIAN kalimat dan menghasilkan
     campuran seperti "Klik for mempelajari".

     Kunci diurutkan dari yang TERPANJANG (lihat I18N.phrases()), jadi solusinya
     adalah menyediakan FRASA UTUH untuk setiap teks UI yang memuat kata-kata
     itu. Dengan begitu frasa panjang menang lebih dulu dan kata fungsi tidak
     pernah kebagian memotong kalimat.
     =========================================================================== */

  /* ---------- Panel SKILL: node, tooltip, status ---------- */
  'Tempur':['Combat','战斗','戦闘'],
  'Kerajinan':['Crafting','制作','クラフト'],
  'Pengumpul':['Gatherer','采集','採集'],
  'Pawang':['Tamer','驯兽','テイマー'],
  '✔ Maks':['✔ Max','✔ 已满','✔ 最大'],
  '✔ Sudah maksimal':['✔ Already maxed','✔ 已达上限','✔ 最大まで習得済み'],
  '🔒 Terkunci — penuhi syarat dulu':['🔒 Locked — meet the requirements first','🔒 已锁定 — 请先满足条件','🔒 ロック中 — まず条件を満たそう'],
  '✅ Klik untuk mempelajari':['✅ Click to learn','✅ 点击学习','✅ クリックで習得'],
  '⚠ Skill Point kurang':['⚠ Not enough Skill Points','⚠ 技能点不足','⚠ スキルポイント不足'],
  '⚡ AKTIF':['⚡ ACTIVE','⚡ 主动','⚡ アクティブ'],
  '🔷 Pasif':['🔷 Passive','🔷 被动','🔷 パッシブ'],
  'Butuh skill:':['Requires skill:','需要技能：','必要スキル：'],
  'Biaya:':['Cost:','消耗：','コスト：'],
  'Skill Point':['Skill Point','技能点','スキルポイント'],
  'Lv MAX':['Lv MAX','等级 满','Lv 最大'],
  /* deskripsi skill memakai satuan ini */
  'kerusakan':['damage','伤害','ダメージ'],
  'Pukulan ke-5':['5th hit','第 5 击','5撃目'],
  'drain stamina':['stamina drain','体力消耗','スタミナ消費'],
  'ketegangan':['tension','张力','張力'],
  'tarik-tarikan':['the tug of war','拉锯','綱引き'],
  'memudahkan menangkap boss/naga':['makes catching bosses/dragons easier','更易捕捉首领/龙','ボス/ドラゴンの捕獲が容易'],
  'membuka resep Sadel':['unlocks the Saddle recipe','解锁鞍配方','サドルのレシピを解放'],
  'membuka Hantam Bumi':['unlocks Earth Slam','解锁大地重击','大地の一撃を解放'],
  'Buka set armor besi':['Unlock the iron armor set','解锁铁质护甲套装','鉄防具セットを解放'],
  'Buka Pai Beri & Kue (buff lari)':['Unlock Berry Pie & Cake (speed buff)','解锁浆果派与蛋糕（速度加成）','ベリーパイとケーキを解放（速度バフ）'],
  'Buka Salad · makanan +25% hunger':['Unlock Salad · food +25% hunger','解锁沙拉 · 食物饱食 +25%','サラダを解放 · 食料の満腹 +25%'],
  'Buka Perban penyembuh':['Unlock the healing Bandage','解锁治疗绷带','回復用の包帯を解放'],
  'Pulihkan 35 HP seketika tanpa memakai item':
    ['Instantly restore 35 HP without using an item','无需道具立即恢复 35 生命（+13% / 等级）','アイテムなしで即座に35HP回復（+13% / ランク）'],
  'Tekan lompat sekali lagi di udara untuk melompat kedua · capai ~3 blok · tanpa cooldown':
    ['Press jump again in mid-air for a second jump · reach ~3 blocks · no cooldown',
     '空中再次跳跃可进行二段跳 · 可达约 3 格 · 无冷却',
     '空中で再度ジャンプすると二段ジャンプ · 約3ブロック · クールダウンなし'],

  /* ---------- Panel CRAFTING ---------- */
  ' — butuh ':[' — needs ',' — 需要 ',' — 必要 '],
  '🔒 Belum terbuka — butuh':['🔒 Not unlocked — needs','🔒 尚未解锁 — 需要','🔒 未解放 — 必要'],
  '🔒 Butuh skill sebelumnya!':['🔒 Requires the previous skill!','🔒 需要前置技能！','🔒 前提スキルが必要！'],
  '🔒 Butuh proficiency':['🔒 Requires proficiency','🔒 需要熟练度','🔒 熟練度が必要'],

  /* ---------- Panel PARTY / REKAN ---------- */
  'Belum ada anggota party. Dekati penduduk desa lalu':
    ['No party members yet. Approach a villager then','队伍中还没有成员。靠近村民然后','パーティメンバーがいない。村人に近づいて'],
  'untuk merekrut, atau tangkap monster untuk dijadikan peliharaan.':
    ['to recruit, or catch a monster to make it a pet.',
     '进行招募，或捕捉怪物作为宠物。',
     '勧誘するか、モンスターを捕まえてペットにしよう。'],
  'Dekati penduduk desa lalu tekan':['Approach a villager then press','靠近村民然后按','村人に近づいて押す'],
  'untuk merekrut':['to recruit','进行招募','勧誘する'],
  'Rekan:':['Companions:','同伴：','仲間：'],
  'Mode bertarung':['Combat mode','战斗模式','戦闘モード'],
  'Perlengkapan rekan':['Companion equipment','同伴装备','仲間の装備'],
  'Perintah':['Orders','命令','命令'],
  'Agresif: menyerang monster yang mendekatimu.':
    ['Aggressive: attacks monsters that approach you.','攻击：攻击靠近你的怪物。','攻撃的：近づくモンスターを攻撃する。'],
  'Pasif: tidak menyerang sendiri; hanya mengejar target yang kamu serang sampai target mati.':
    ['Passive: never attacks on its own; only chases the target you attack until it dies.',
     '被动：不会主动攻击；只追击你攻击的目标直到其死亡。',
     '受動的：自分から攻撃せず、あなたが攻撃した相手のみ倒れるまで追う。'],
  'Saat diperintah mencari resource, rekan hanya memanen':
    ['When ordered to gather, companions only harvest','当命令采集时，同伴只会采集','採集を命じると、仲間は次のみ収集する'],
  'kayu, batu, dan bijih dalam radius':['wood, stone, and ore within a radius of','木材、石头与矿石，半径','木材・石・鉱石を半径'],
  'blok dari posisimu.':['blocks from your position.','格以内，以你的位置为中心。','ブロック内であなたの位置から。'],
  'Untuk farming, beri benih di tas rekan.':
    ['For farming, put seeds in the companion bag.','若要耕作，请在同伴背包放入种子。','農作業には仲間のバッグに種を入れよう。'],
  'Anggota tim & peliharaanmu — ketuk untuk mengatur.':
    ['Your team members & pets — tap to manage.','你的队伍成员与宠物 — 点击管理。','チームメンバーとペット — タップで管理。'],

  /* ---------- Panel TAS / SHOP / PETI ---------- */
  'klik untuk menjual':['click to sell','点击出售','クリックで売却'],
  'kamu punya':['you have','你拥有','所持'],
  'Tas rekan (klik untuk ambil)':['Companion bag (click to take)','同伴背包（点击取出）','仲間のバッグ（クリックで取る）'],
  'Slot Mob · hanya 1 pet yang bisa deploy':
    ['Mob Slots · only 1 pet can be deployed','宠物栏 · 只能派出 1 只宠物','モブスロット · 出せるペットは1体のみ'],
  'Tekan lompat':['Press jump','按跳跃','ジャンプを押す'],

  /* ---------- Quest board (deskripsi quest) ---------- */
  'Desa perlu kayu untuk memperbaiki atap rumah.':
    ['The village needs wood to repair house roofs.','村子需要木材来修补屋顶。','村は屋根の修理に木材が必要だ。'],
  'Batu untuk memperkuat dinding sumur desa.':
    ['Stone to reinforce the village well wall.','用石头加固村井的井壁。','村の井戸の壁を補強する石。'],
  'Penjahit desa butuh bulu serigala untuk mantel.':
    ['The village tailor needs wolf pelts for a coat.','村里的裁缝需要狼皮做外套。','村の仕立て屋がコート用に狼の毛皮を必要としている。'],
  'Pandai besi kehabisan batu bara untuk tanurnya.':
    ['The blacksmith ran out of coal for the furnace.','铁匠的熔炉没有煤了。','鍛冶屋がかまど用の石炭を切らした。'],
  'Tetua desa memerlukan kristal untuk jimat pelindung.':
    ['The village elder needs crystals for a protective charm.','村长需要水晶制作护身符。','村の長老が護符用の水晶を必要としている。'],
  'Aku singgah di kedai ini untuk melepas lelah. Duduklah.':
    ['I stopped by this tavern to rest. Have a seat.','我在这家酒馆歇脚。坐下吧。','この酒場で一休みしている。座りなよ。'],
  'Ambil quest dari papan di desa, penuhi tujuannya, lalu':
    ['Take a quest from a village board, complete its objective, then','从村里的公告板接取任务，完成目标，然后','村の掲示板でクエストを受け、目標を達成し、それから'],
  'kembali ke papan mana pun untuk mengambil hadiah.':
    ['return to any board to claim the reward.','回到任意公告板领取奖励。','どの掲示板でも報酬を受け取れる。'],
  'Belum ada quest aktif. Ambil dari daftar di bawah.':
    ['No active quests. Take one from the list below.','没有进行中的任务。请从下方列表接取。','進行中のクエストはない。下のリストから受けよう。'],
  'Tidak ada tawaran baru untuk saat ini — naikkan level atau selesaikan quest yang berjalan.':
    ['No new offers right now — level up or finish your ongoing quests.',
     '目前没有新委托 — 请提升等级或完成进行中的任务。',
     '今は新しい依頼がない — レベルを上げるか進行中のクエストを終えよう。'],
  'Papan Pengumuman Desa':['Village Notice Board','村庄公告板','村の掲示板'],
  'Quest Aktif':['Active Quests','进行中的任务','進行中のクエスト'],
  'Papan Quest':['Quest Board','任务板','クエスト掲示板'],

  /* ---------- Anvil ---------- */
  'Level menambah damage senjata':['Level adds weapon damage','等级提升武器伤害','レベルは武器ダメージを上げる'],
  'atau pertahanan armor & tameng':['or armor & shield defense','或护甲与盾牌的防御','または防具と盾の防御'],
  'Koin didapat dari quest, monster, dan berdagang.':
    ['Coins come from quests, monsters, and trading.','金币来自任务、怪物与交易。','コインはクエスト・モンスター・取引で得られる。'],
  '🪙 Koin kurang — butuh':['🪙 Not enough coins — need','🪙 金币不足 — 需要','🪙 コイン不足 — 必要'],

  /* ---------- Toast lain yang memuat kata fungsi ---------- */
  '⚔️ Senjata dipakai dari hotbar':['⚔️ Weapons are used from the hotbar','⚔️ 武器从快捷栏使用','⚔️ 武器はホットバーから使用する'],
  '🐴 Turun dulu untuk menyerang':['🐴 Dismount first to attack','🐴 请先下坐骑才能攻击','🐴 攻撃するにはまず降りよう'],
  '🐴 Turun dulu untuk menandai lokasi':['🐴 Dismount first to mark a location','🐴 请先下坐骑再标记位置','🐴 位置を記すにはまず降りよう'],
  '🐴 Tidak bisa memakai skill saat menunggangi':
    ['🐴 Cannot use skills while riding','🐴 骑乘时无法使用技能','🐴 騎乗中はスキルを使えない'],
  '🐴 Butuh Sadel! Buat dari Kulit & Kayu.':
    ['🐴 Need a Saddle! Craft it from Leather & Wood.','🐴 需要鞍！用皮革和木头制作。','🐴 サドルが必要！革と木材で作ろう。'],
  '🐴 Pasang Sadel dulu dari tas mob.':
    ['🐴 Attach a Saddle first from the pet tab.','🐴 请先在宠物页装上鞍。','🐴 まずペットタブでサドルを付けよう。'],
  '🌾 Tidak ada lahan di sini — cangkul tanah dulu':
    ['🌾 No farmland here — till the ground first','🌾 这里没有农田 — 请先耕地','🌾 ここに農地はない — まず耕そう'],
  '🌾 butuh benih di tasnya untuk farming':
    ['🌾 needs seeds in its bag to farm','🌾 需要背包里有种子才能耕作','🌾 農作業には袋に種が必要'],
  '🌊 Tidak bisa memasang di dalam air':
    ['🌊 Cannot place underwater','🌊 无法在水中放置','🌊 水中には設置できない'],
  '🌊 Tidak bisa membangun di air':['🌊 Cannot build on water','🌊 无法在水上建造','🌊 水上には建てられない'],
  '🔥 Apinya masih hangat — istirahat lagi nanti':
    ['🔥 The fire is still warm — rest again later','🔥 火还温着 — 稍后再休息','🔥 火はまだ暖かい — 後で休もう'],
  '💺 Duduk — stamina pulih lebih cepat. Bergerak untuk berdiri.':
    ['💺 Sitting — stamina recovers faster. Move to stand up.','💺 坐下 — 体力恢复更快。移动即起身。','💺 座った — スタミナ回復が速い。動けば立つ。'],
  '🛶 Berlayar — gunakan gerak untuk mengayuh. Tekan aksi untuk turun.':
    ['🛶 Sailing — use movement to row. Press action to disembark.',
     '🛶 航行 — 使用移动划桨。按动作键下船。',
     '🛶 航行中 — 移動で漕ぐ。アクションで降りる。'],
  '🧍 Turun dari Perahu':['🧍 Leave the Boat','🧍 下船','🧍 ボートから降りる'],
  '🧍 Turun dari tunggangan.':['🧍 Dismounted.','🧍 已下坐骑。','🧍 降りた。'],
  '🧭 Log Pass kosong — klik untuk menandai lokasi':
    ['🧭 Log Pass is empty — click to mark a location','🧭 定位牌为空 — 点击标记位置','🧭 ログパスは空 — クリックで位置を記す'],
  'Tidak ada resource untuk dititipkan':
    ['Nothing to store','没有可存放的资源','預ける資源がない'],
  'Tidak ada permukaan di sini':['No surface here','这里没有平面','ここに面がない'],
  'Terlalu jauh dari pemain (maks':['Too far from the player (max','离玩家太远（最多','プレイヤーから遠すぎる（最大'],
  'Buang':['Drop','丢弃','捨てる'],
  'dari peti ke tanah?':['from the chest to the ground?','从箱子丢到地面？','チェストから地面へ？'],
  '🗑️ Membuang':['🗑️ Dropping','🗑️ 丢弃','🗑️ 捨てる'],
  'dari peti':['from the chest','从箱子','チェストから'],
  'Berapa':['How many','数量','いくつ'],
  '⭐ butuh XP':['⭐ needs XP','⭐ 需要经验','⭐ XPが必要'],
  'Butuh untuk naik level.':['Needed to level up.','升级所需。','レベルアップに必要。'],
  '⚔ siap lagi':['⚔ ready again','⚔ 已就绪','⚔ 再び準備完了'],
  '❌ Tali putus! Monster mengamuk dan tidak bisa ditangkap lagi.':
    ['❌ The rope snapped! The monster rages and can no longer be caught.',
     '❌ 绳子断了！怪物暴怒，再也无法被捕捉。',
     '❌ ロープが切れた！モンスターは激怒し、もう捕獲できない。'],
  'Tidak Biasa':['Uncommon','罕见','アンコモン'],

  /* ---------------------------------------------------------------------------
     SISA CAMPUR BAHASA — potongan TEXT NODE
     ---------------------------------------------------------------------------
     Teks yang di HTML-nya dipisah tag (<b>, <span>) menjadi BEBERAPA text node,
     dan localizeDOM menerjemahkan per node. Jadi potongannya harus punya kunci
     sendiri — kalimat penuh tidak akan pernah cocok.
     Contoh: "... lalu <b>F</b> untuk merekrut" → node "tekan " terpisah.
     --------------------------------------------------------------------------- */
  'tekan ':['press ','按 ','押す '],
  'Tekan ':['Press ','按 ','押す '],
  'Klik':['Click','点击','クリック'],
  'klik':['click','点击','クリック'],
  'Klik Kiri':['Left Click','左键','左クリック'],
  'Klik Kanan':['Right Click','右键','右クリック'],
  'Klik saat memegang makanan':['Click while holding food','手持食物时点击','食料を持って クリック'],
  'Lari':['Sprint','疾跑','ダッシュ'],
  'tekan 2× = roll/dodge':['press 2× = roll/dodge','按 2 次 = 翻滚/闪避','2回押す = ローリング/回避'],
  'tasmu':['your bag','你的背包','あなたのバッグ'],
  'Jual (klik item di tasmu)':['Sell (click an item in your bag)','出售（点击背包中的物品）','売却（バッグのアイテムをクリック）'],

  /* Quest */
  '🏅 Ambil Hadiah':['🏅 Claim Reward','🏅 领取奖励','🏅 報酬を受け取る'],
  '⏳ Belum Selesai':['⏳ Not Finished','⏳ 未完成','⏳ 未完了'],

  /* Menu & slot */
  'Slot sudah berisi data.':['This slot already contains data.','该存档位已有数据。','このスロットにはすでにデータがある。'],
  'Overwrite save lama?':['Overwrite the old save?','要覆盖旧存档吗？','古いセーブを上書きする？'],

  /* Capture */
  'Monster tidak valid':['Invalid monster','无效的怪物','無効なモンスター'],
  'XP penuh, peluang':['XP full, chance','经验已满，概率','XP満タン、確率'],
  'Jimat Pawang menambah +30% peluang (dipakai otomatis bila ada).':
    ['The Tamer Charm adds +30% chance (used automatically when available).',
     '驯兽护符增加 +30% 概率（拥有时自动使用）。',
     'テイマーの護符が確率+30%（所持時は自動使用）。'],

  /* Terminal / chat */
  '⚔️ Equipment — senjata':['⚔️ Equipment — weapons','⚔️ 装备 — 武器','⚔️ 装備 — 武器'],
  'NPC & monster muncul di tanah kosong sekitarmu · Esc menutup terminal':
    ['NPCs & monsters appear on empty ground around you · Esc closes the terminal',
     'NPC 与怪物出现在你周围的空地 · Esc 关闭终端',
     'NPCとモンスターは周囲の空き地に出現 · Escで端末を閉じる'],
  'dijatuhkan (tas penuh)':['dropped (bag full)','已掉落（背包已满）','落とした（バッグ満杯）'],

  /* Furni */
  '📏 Terlalu tinggi/rendah — dekati permukaannya':
    ['📏 Too high/low — get closer to the surface','📏 太高/太低 — 请靠近该表面','📏 高すぎ/低すぎ — 面に近づこう'],
  'Sudah ada perabot di situ':['There is already furniture there','那里已经有家具了','そこにはすでに家具がある'],
  'item dititipkan ke peti':['items stored in the chest','件物品已存入箱子','個のアイテムをチェストに預けた'],
  '❌ Posisi belum valid':['❌ Position is not valid yet','❌ 位置尚不可用','❌ 位置がまだ有効でない'],

  /* Hint bar & panel bantuan (potongan antar <b>) */
  'WASD gerak':['WASD move','WASD 移动','WASD 移動'],
  'SHIFT lari':['SHIFT sprint','SHIFT 疾跑','SHIFT ダッシュ'],
  'KLIK serang/makan':['CLICK attack/eat','点击 攻击/进食','クリック 攻撃/食事'],
  'SPACE lompat':['SPACE jump','SPACE 跳跃','SPACE ジャンプ'],
  'B tas':['B bag','B 背包','B バッグ'],
  'C crafting':['C crafting','C 制作','C クラフト'],
  'G rekan':['G companions','G 同伴','G 仲間'],
  'P karakter':['P character','P 角色','P キャラクター'],
  'H bantu':['H help','H 帮助','H ヘルプ'],
  ' di hutan: penduduknya bisa direkrut jadi rekan (maks 3) bila kamu membawa bahan yang mereka minta. Rekan ikut bertarung, punya level dan skill pasif sendiri, bisa diberi makanan/senjata/armor, dan bisa diperintah ':
    [' in the forest: its people can be recruited as companions (max 3) if you bring the materials they ask for. Companions fight alongside you, have their own level and passive skill, can be given food/weapons/armor, and can be ordered to ',
     ' 在森林中：如果你带来他们要求的材料，村民可被招募为同伴（最多 3 名）。同伴会一同战斗，拥有自己的等级与被动技能，可获得食物/武器/护甲，也可被命令 ',
     ' 森の中：求める素材を持っていけば村人を仲間にできる（最大3人）。仲間は共に戦い、独自のレベルとパッシブスキルを持ち、食料/武器/防具を渡せ、命令もできる '],
  ' di sekitarmu. Klik ikon rekan di kanan atas untuk mengatur mereka.':
    [' around you. Click the companion icon at the top right to manage them.',
     ' 在你周围。点击右上角的同伴图标来管理他们。',
     ' 周囲で。右上の仲間アイコンをクリックして管理しよう。'],
  '⚠️ Hati-hati dengan Golem Hutan raksasa — hantamannya ':
    ['⚠️ Beware the giant Forest Golem — its slam ','⚠️ 小心巨型森林魔像 — 它的重击 ','⚠️ 巨大なフォレストゴーレムに注意 — その一撃は '],
  'Lubang dekat air akan perlahan tergenang. Tebang pohon (pukul batang) untuk kayu, panen semak beri, dan masak daging agar hunger pulih.':
    ['Holes near water slowly flood. Chop trees (hit the trunk) for wood, harvest berry bushes, and cook meat to restore hunger.',
     '靠近水的坑洞会慢慢积水。砍树（击打树干）取木材，采集浆果丛，烤肉以恢复饱食度。',
     '水辺の穴はゆっくり水没する。木を伐って（幹を叩く）木材を得て、ベリーの茂みを収穫し、肉を焼いて満腹度を回復しよう。'],
  'Cari':['Find','寻找','探そう'],
  'desa':['a village','村庄','村'],
  'menghancurkan tanah':['destroys the ground','会破坏地面','地面を破壊する'],
  'mencari resource':['gather resources','采集资源','資源を集める'],
  /* ------ TAMBAHAN AUDIT POPUP, MODAL, TOAST, CONTROLS & QUEST ------ */
  "Beli berapa":["How many to buy","购买数量","購入数"],
  "Jual berapa":["How many to sell","出售数量","売却数"],
  "Ambil berapa":["How many to take","取出数量","取り出す数"],
  "Berapa":["How many","数量","いくつ"],
  "💰 Semua":["💰 All","💰 全部","💰 すべて"],
  "Semua":["All","全部","すべて"],
  "Beri nama tanda lokasi ini:":["Name this location waypoint:","为此地标命名：","この場所の目印に名前を付ける:"],
  "mis. Basis, Tambang...":["e.g. Base, Mine...","例如：基地、矿坑……","例: 拠点、鉱山…"],
  "ke tanah?":["on the ground?","在地面上？","地面へ？"],
  "ke tanah":["to the ground","到地面","地面へ"],
  "dari peti":["from the chest","从箱子","チェストから"],
  "milik":["owned by","属于","の所有"],
  "untuk":["for","给","へ"],
  "Jumlah:":["Amount:","数量：","数量:"],
  "✔ Buang":["✔ Drop","✔ 丢弃","✔ 捨てる"],
  "✖ Batal":["✖ Cancel","✖ 取消","✖ キャンセル"],
  "✔ Beri":["✔ Give","✔ 给予","✔ 渡す"],
  "✔ Beli":["✔ Buy","✔ 购买","✔ 購入"],
  "✔ Jual":["✔ Sell","✔ 出售","✔ 売却"],
  "✔ Ambil":["✔ Take","✔ 取出","✔ 取る"],
  "✔ Simpan":["✔ Store","✔ 收回","✔ しまう"],
  "Ambil":["Take","取出","取る"],
  "Simpan":["Store","存放","保存"],
  "💺 Duduk":["💺 Sit","💺 坐下","💺 座る"],
  "Duduk":["Sit","坐下","座る"],
  "🛏️ Tidur":["🛏️ Sleep","🛏️ 睡觉","🛏️ 眠る"],
  "Tidur":["Sleep","睡觉","眠る"],
  "🧰 Buka Peti":["🧰 Open Chest","🧰 打开宝箱","🧰 チェストを開く"],
  "Buka Peti":["Open Chest","打开宝箱","チェストを開く"],
  "🛶 Naiki Perahu":["🛶 Board Boat","🛶 乘船","🛶 ボートに乗る"],
  "Naiki Perahu":["Board Boat","乘船","ボートに乗る"],
  "🔨 Meja Kerja":["🔨 Workbench","🔨 工作台","🔨 作業台"],
  "Meja Kerja":["Workbench","工作台","作業台"],
  "⚒️ Tempa Equipment":["⚒️ Forge Equipment","⚒️ 锻造装备","⚒️ 装備を鍛造"],
  "Tempa Equipment":["Forge Equipment","锻造装备","装備を鍛造"],
  "🍲 Masak di Tungku":["🍲 Cook at Stove","🍲 在炉灶烹饪","🍲 コンロで料理"],
  "Masak di Tungku":["Cook at Stove","在炉灶烹饪","コンロで料理"],
  "🔥 Hangatkan Diri":["🔥 Warm Up","🔥 烤火取暖","🔥 暖を取る"],
  "Hangatkan Diri":["Warm Up","烤火取暖","暖を取る"],
  "✔ Terapkan posisi pintu":["✔ Apply Door Position","✔ 应用门位置","✔ ドアの位置を適用"],
  "Terapkan posisi pintu":["Apply Door Position","应用门位置","ドアの位置を適用"],
  "🧍 Turun dari Perahu":["🧍 Leave Boat","🧍 下船","🧍 ボートから降りる"],
  "Turun dari Perahu":["Leave Boat","下船","ボートから降りる"],
  "🧍 Berdiri":["🧍 Stand","🧍 起身","🧍 立つ"],
  "Berdiri":["Stand","起身","立つ"],
  "🐾 Turun":["🐾 Dismount","🐾 下来","🐾 降りる"],
  "Turun":["Dismount","下来","降りる"],
  "🔮 Isi Altar Ritual":["🔮 Fill Ritual Altar","🔮 填充仪式祭坛","🔮 儀式の祭壇を満たす"],
  "Isi Altar Ritual":["Fill Ritual Altar","填充仪式祭坛","儀式の祭壇を満たす"],
  "🚪 Atur Pintu":["🚪 Set Door","🚪 设置门","🚪 ドアを設定"],
  "Atur Pintu":["Set Door","设置门","ドアを設定"],
  "🐾 Naiki":["🐾 Ride","🐾 骑乘","🐾 乗る"],
  "Naiki":["Ride","骑乘","乗る"],
  "📜 Papan Quest":["📜 Quest Board","📜 任务板","📜 クエスト掲示板"],
  "Papan Quest":["Quest Board","任务板","クエスト掲示板"],
  "💬 Bicara":["💬 Talk","💬 交谈","💬 話す"],
  "Bicara":["Talk","交谈","話す"],
  "👑 Buka Peti Emas":["👑 Open Golden Chest","👑 打开黄金宝箱","👑 黄金チェストを開く"],
  "Buka Peti Emas":["Open Golden Chest","打开黄金宝箱","黄金チェストを開く"],
  "Pulih kembali dalam":["Restores in","复原剩余时间","復旧まであと"],
  "Permainan tersimpan":["Game saved","游戏已保存","ゲームを保存しました"],
  "Tersimpan":["Saved","已保存","保存完了"],
  "rekan ikut disimpan":["companions saved as well","名同伴一同保存","人の仲間も保存されました"],
  "rekan bergabung kembali":["companions rejoined","名同伴重新加入","人の仲間が再加入しました"],
  "Hantam Bumi!":["Earth Slam!","震地重击！","アーススラム！"],
  "Tebasan Angin Puyuh!":["Whirlwind Slash!","旋风斩！","ワールウィンドスラッシュ！"],
  "Teriakan Perang!":["Battle Cry!","战斗怒吼！","ウォークライ！"],
  "Ramuan Herbal":["Herbal Brew","草药药剂","ハーバルブリュー"],
  "item dijatuhkan, koin kembali":["items dropped, coins refunded","物品掉落，金币退还","アイテムがドロップされ、コインが返却されました"],
  "Belum ada skill aktif di slot ini - pelajari di Skill":["No active skill in this slot - learn it in Skills","此槽位未装备主动技能 - 在技能中学习","このスロットにアクティブスキルがありません - スキルで習得してください"],
  "Dungeon akan pulih dalam":["Dungeon resets in","地牢重置剩余时间","ダンジョン復旧まであと"],
  "menit dengan level acak baru":["minutes with a new random level","分钟，将拥有新的随机等级","分（新しいランダムレベル）"],
  "Sebuah dungeon pulih kembali — kini Lv":["A dungeon has reset — now Lv","一座地牢已重置 — 当前 Lv","ダンジョンが復帰しました — 現在 Lv"],
  "Berdirilah di rumahmu dulu":["Stand inside your house first","请先站在自己的房子里","まず自宅の中に立ってください"],
  "Pintu dipindahkan":["Door relocated","门已移动","ドアを移動しました"],
  "Tidak ada dinding yang bisa dijadikan pintu":["No suitable wall found for a door","没有可用作门的墙壁","ドアにできる壁がありません"],
  "Tubuh kelabang terbelah menjadi dua!":["The centipede's body splits in two!","蜈蚣的身体分裂为二！","大百足の体が真っ二つに分裂した！"],
  "menolak: levelmu":["refuses: your level","拒绝了：你的等级","拒否: あなたのレベル"],
  "terlalu rendah!":["is too low!","太低了！","が低すぎます！"],
  "meminum":["drank","饮用了","を飲んだ"],
  "Hanya Royal Guard yang bisa memakai tameng!":["Only Royal Guard can equip shields!","只有皇家守卫可以使用盾牌！","ロイヤルガードのみが盾を装備できます！"],
  "merapal":["casts","施放了","詠唱:"],
  "Hujan Es!":["Ice Storm!","冰雹风暴！","氷の嵐！"],
  "Hujan Meteor!":["Meteor Shower!","流星雨！","流星群！"],
  "Hujan Es":["Ice Storm","冰雹风暴","氷の嵐"],
  "Hujan Meteor":["Meteor Shower","流星雨","流星群"],
  "Backstab Leap!":["Backstab Leap!","背刺跳击！","バックスタブ・リープ！"],
  "AUMAN SINGA!":["LION'S ROAR!","狮子咆哮！","獅子の咆哮！"],
  "HEALING AURA!":["HEALING AURA!","治愈光环！","ヒーリングオーラ！"],
  "AURA PERISAI!":["SHIELD AURA!","护盾光环！","シールドオーラ！"],
  "HUJAN BINTANG SPIRIT!":["SPIRIT STAR RAIN!","灵星之雨！","スピリットスターレイン！"],
  "RAPID CLAW!":["RAPID CLAW!","迅捷之爪！","ラピッドクロー！"],
  "mengguncang bumi!":["shakes the earth!","震击地面！","大地を揺るがす！"],
  "Kau terbangun di tempat yang belum kau kenal...":["You awaken in an unfamiliar place...","你在一个陌生的地方醒来……","見知らぬ場所で目が覚めた…"],
  "Memasak makanan harus menggunakan kompor/tungku masak!":["Cooking food requires a stove!","烹饪食物必须使用炉灶！","料理にはコンロや調理台が必要です！"],
  "Hanya bisa digunakan di dalam dungeon":["Can only be used inside a dungeon","只能在地牢内使用","ダンジョン内でのみ使用できます"],
  "Dungeon Changer: level dungeon ini berubah menjadi Lv":["Dungeon Changer: this dungeon's level changed to Lv","地牢变换器：该地牢等级变为 Lv","ダンジョンチェンジャー: このダンジョンのレベルが Lv"],
  "diminum (+30% Stamina)!":["consumed (+30% Stamina)!","已饮用（+30%体力）！","を飲みました（スタミナ+30%）！"],
  "sudah mencapai level maksimum":["has reached the maximum level","已达到最高等级","最大レベルに達しました"],
  "Bahan habis, XP berkurang sedikit":["Materials depleted, small XP penalty","材料耗尽，扣除少量经验","素材を消費し、XPがわずかに減少"],
  "Gagal menaikkan":["Failed to level up","升级失败","レベルアップ失敗"],
  "Penjaga Agung tumbang, sisa peti belum dikuras":["Grand Guardian defeated, unopened chests remain","大守护者已倒下，尚有宝箱未开启","大守護者を撃破、未開封のチェストが残っています"],
  "Kelabang Raksasa":["Giant Centipede","巨型蜈蚣","大百足"],
  "setara Lv":["is Lv","相当于 Lv","Lv相当"],
  "perkuat dirimu dulu atau siapkan tim!":["strengthen yourself first or prepare a team!","先提升实力或召集队伍！","まず自身を強化するかチームを準備してください！"],
  "ui_layout.js berhasil diupdate":["ui_layout.js updated successfully","ui_layout.js 更新成功","ui_layout.js の更新に成功しました"],
  "ui_layout.js tersimpan":["ui_layout.js saved","ui_layout.js 已保存","ui_layout.js を保存しました"],
  "ui_layout.js diunduh":["ui_layout.js downloaded","ui_layout.js 已下载","ui_layout.js をダウンロードしました"],
  "Panel":["Panel","面板","パネル"],
  "bermasalah":["encountered an issue","发生错误","にエラーが発生しました"],
  "Ladang terlalu besar":["Farmland too large","农田过大","農地が大きすぎます"],
  "Ladang sudah siap — pilih benih":["Farmland ready — select seeds","农田准备就绪 — 选择种子","農地の準備完了 — 種を選択してください"],
  "Tanaman masih tumbuh":["Crops still growing","作物仍在生长","作物はまだ成長中です"],
  "Tidak ada lahan di sini — cangkul tanah dulu":["No farmland here — till the ground first","此处无可用耕地 — 先用锄头耕地","ここに農地がありません — まず地面を耕してください"],
  "Pohon tumbang!":["Tree fallen!","树木倒下！","木が倒れた！"],
  "Ingredient belum lengkap":["Ingredients incomplete","配方材料未齐","素材が揃っていません"],
  "Ritual dimulai! Boss akan muncul dalam 10 detik...":["Ritual started! Boss will appear in 10 seconds...","仪式开始！Boss将在10秒内出现……","儀式開始！ボスは10秒後に出現します…"],
  "terpanggil dari altar!":["summoned from the altar!","从祭坛中被召唤出来！","が祭壇から召喚された！"],
  "Seorang Dungeon Master singgah di desa ini":["A Dungeon Master is visiting this village","一位地牢大师造访了这座村庄","ダンジョンマスターがこの村に立ち寄っています"],
  "Peti Penjaga Agung sudah kosong":["Grand Guardian Chest is already empty","大守护者宝箱已空","大守護者のチェストはすでに空です"],
  "PETI PENJAGA AGUNG":["GRAND GUARDIAN CHEST","大守护者宝箱","大守護者の宝箱"],
  "Temuan langka:":["Rare find:","稀有发现：","レア発見:"],
  "Harta Dungeon":["Dungeon Treasure","地牢宝藏","ダンジョンの財宝"],
  "dikalahkan! Kuras semua peti untuk menaklukkannya.":["defeated! Loot all chests to conquer it.","已被击败！开启全部宝箱以彻底征服。","撃破！全てのチェストを開けて制覇せよ。"],
  "DITAKLUKKAN!":["CONQUERED!","已征服！","制覇！"],
  "HP pulih":["HP restored","生命值已恢复","HP回復"],
  "Peti ini sudah kosong":["This chest is already empty","该宝箱已空","このチェストはすでに空です"],
  "Kau meninggalkan dungeon":["You left the dungeon","你离开了地牢","ダンジョンを離れました"],
  "WASD / Panah":["WASD / Arrows","WASD / 方向键","WASD / 矢印キー"],
  "Lompat / berenang naik":["Jump / Swim up","跳跃 / 向上游泳","ジャンプ / 浮上"],
  "Interaksi: bicara/rekrut penduduk, pakai perabot, isi altar":["Interact: talk/recruit villagers, use furniture, fill altar","交互：对话/招募村民、使用家具、充能祭坛","インタラクト: 会話/勧誘、家具を使用、祭壇を満たす"],
  "Pilih slot hotbar":["Select hotbar slot","选择快捷栏槽位","ホットバースロット選択"],
  "Pakai skill aktif slot 1–4 (lihat bar skill)":["Use active skills slot 1–4 (see skill bar)","使用快捷技能 1–4（查看技能栏）","アクティブスキル使用 1-4（スキルバー参照）"],
  "Serang pedang (rantai sampai 5 combo)":["Sword attack (chain up to 5 combos)","剑击（最多5连击）","剣攻撃（最大5コンボ）"],
  "Hati-hati dengan Golem Hutan raksasa — hantamannya":["Beware of the giant Forest Golem — its slam","小心巨大的森林魔像——它的重击","巨大な森林ゴーレムに注意 — その一撃は"],
  "Ketik pesan...":["Type a message...","输入消息...","メッセージを入力..."],
  "Kirim":["Send","发送","送信"],
  "Ajak bicara / rekrut":["Talk / Recruit","交谈 / 招募","話す / 勧誘"],
  "Dash / Hindar":["Dash / Dodge","冲刺 / 闪避","ダッシュ / 回避"],
  "Lompat":["Jump","跳跃","ジャンプ"],
  "Serang":["Attack","攻击","攻撃"],
  "Respawn":["Respawn","重生","リスポーン"],
  "PANDUAN DASAR":["BASIC GUIDE","基础指南","基本ガイド"],
  "Bergerak: WASD / joystick (mobile).":["Move: WASD / mobile joystick.","移动：WASD / 虚拟摇杆。","移動: WASD / ジョイスティック（モバイル）。"],
  "Klik / tombol serang: menyerang, makan saat memegang makanan, mencangkul, menanam, memanen.":["Click / attack button: attack, eat when holding food, till, plant, harvest.","点击 / 攻击按钮：攻击、持食物时进食、耕地、播种、收获。","クリック / 攻撃ボタン: 攻撃、食料所持で食事、耕起、種まき、収穫。"],
  "B: tas · K: skill · C: crafting · G: party.":["B: bag · K: skills · C: crafting · G: party.","B: 背包 · K: 技能 · C: 制作 · G: 队伍。","B: バッグ · K: スキル · C: 製作 · G: パーティ。"],
  "Cangkul rumput menjadi ladang, lalu tanam benih.":["Till grass into farmland, then sow seeds.","将草地耕成农田，然后播下种子。","草地を耕して農地に変え、種をまきます。"],
  "Dekati penduduk lalu tekan F / tombol 🤝 untuk bicara atau rekrut.":["Approach villagers and press F / 🤝 button to talk or recruit.","靠近村民并按 F / 🤝 按钮进行交谈或招募。","村人に近づき Fキー / 🤝ボタンで会話や勧誘を行います。"],
  "Malam berbahaya — siapkan makanan dan senjata.":["Night is dangerous — prepare food and weapons.","黑夜危险——备好食物和武器。","夜は危険です — 食料と武器を準備しましょう。"],
  "Mengerti":["Got it","明白了","了解"],
  "pilih slot":["choose a slot","选择槽位","スロット選択"],
  "sudah berisi data.":["already contains data.","已有存档数据。","には既にデータがあります。"],
  "Overwrite save lama?":["Overwrite old save?","覆盖旧存档？","古いセーブを上書きしますか？"],
  "Slot kosong":["Empty slot","空存档位","空きスロット"],
  "Putar musik":["Play music","播放音乐","音楽を再生"],
  "Perubahan disimpan otomatis.":["Changes are saved automatically.","更改会自动保存。","変更は自動保存されます。"],
  "Ambil Quest":["Accept Quest","接取任务","クエスト受注"],
  "Ambil Hadiah":["Claim Reward","领取奖励","報酬受取"],
  "Batalkan":["Abandon","放弃","放棄"],
  "Quest Selesai":["Quest Completed","任务完成","クエスト完了"],
  "Quest harian selesai! Kembali besok untuk quest baru.":["Daily quests completed! Return tomorrow for new quests.","每日任务已完成！明天再来接取新任务。","本日のクエスト完了！明日新しいクエストを確認してください。"],
  "Belum ada quest yang diambil. Kunjungi papan quest di desa untuk mengambil tugas.":["No active quests. Visit the quest board in the village to take on tasks.","尚未接取任务。前往村庄的任务板接取任务。","受注中のクエストはありません。村の掲示板で任務を受け取ってください。"],
  "Papan Quest Desa":["Village Quest Board","村庄任务板","村のクエスト掲示板"],
  "Papan Pengumuman Desa":["Village Notice Board","村庄公告栏","村の掲示板"],
  "Klaim Hadiah":["Claim Reward","领取奖励","報酬受取"],
  "Quest Dituntaskan":["Quests Completed","已完成任务","完了したクエスト"],
  "Lapor ke Papan Quest":["Report to Quest Board","返回任务板报告","クエスト掲示板に報告"],
  "tujuan tercapai, lapor ke papan quest":["objective completed, report to quest board","目标达成，向任务板报告","目標達成、掲示板に報告してください"],
  "Kumpulkan":["Gather","收集","集める"],
  "Kalahkan":["Defeat","击败","倒す"],
  "Buat":["Craft","制作","製作"],
  "Lepas":["Abandon","放弃","放棄"],
  "Belum Selesai":["In Progress","未完成","未完了"],
  "Ambil quest dari papan, penuhi tujuannya, lalu kembali ke papan mana pun untuk mengambil hadiah.":["Accept quests from the board, fulfill objectives, then return to any board to claim rewards.","从任务板接取任务，完成目标后返回任意任务板领取奖励。","掲示板からクエストを受注し、目標を達成したら掲示板に戻って報酬を受け取ります。"],
  "Ini jurnal quest yang sedang kamu jalani. Untuk mengambil hadiah & quest baru, kunjungi papan quest di tavern desa.":["This is your active quest log. To claim rewards & accept new quests, visit the quest board in the village tavern.","这是你正在进行的任务日志。若要领取奖励和新任务，请访问村庄酒馆的任务板。","進行中のクエスト日誌です。報酬の受取や新しい任務は村の酒場の掲示板を訪れてください。"],
  "Belum ada quest aktif. Ambil dari daftar di bawah.":["No active quests. Pick one from the list below.","暂无进行中的任务。从下方列表中接取。","アクティブなクエストはありません。下のリストから選んでください。"],
  "Belum ada quest aktif. Kunjungi papan quest di tavern desa untuk mengambilnya.":["No active quests. Visit the quest board in the village tavern to accept them.","暂无进行中的任务。前往村庄酒馆的任务板接取。","アクティブなクエストはありません。村の酒場の掲示板で受注してください。"],
  "Tidak ada tawaran baru untuk saat ini — naikkan level atau selesaikan quest yang berjalan.":["No new offers right now — level up or complete current quests.","目前没有新任务——提升等级或完成当前任务。","現在新しい依頼はありません — レベルを上げるか進行中のクエストを完了してください。"],
  "Kembali ke papan quest di tavern untuk mengambil hadiah":["Return to the quest board in the tavern to claim your reward","返回酒馆任务板领取奖励","報酬を受け取るため酒場の掲示板に戻る"],

};


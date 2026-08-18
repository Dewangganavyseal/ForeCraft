'use strict';
/* =================================================================
   FORECRAFT 3D - ARMOR MANAGER
   File: js/player/armors/armor_manager.js
   ================================================================= */

const ArmorManager = {
  sets: {
    leather: typeof LeatherArmorSet !== 'undefined' ? LeatherArmorSet : null,
    iron:    typeof IronArmorSet !== 'undefined' ? IronArmorSet : null,
    gold:    typeof GoldArmorSet !== 'undefined' ? GoldArmorSet : null,
    crystal: typeof CrystalArmorSet !== 'undefined' ? CrystalArmorSet : null
  },

  getSet(tier = 'iron') {
    if (tier === 'leather') return window.LeatherArmorSet || this.sets.leather;
    if (tier === 'gold')    return window.GoldArmorSet || this.sets.gold;
    if (tier === 'crystal') return window.CrystalArmorSet || this.sets.crystal;
    return window.IronArmorSet || this.sets.iron;
  },

  buildHelmet(tier = 'iron', id = '') {
    const s = this.getSet(tier);
    return s ? s.buildHelmet(id) : new THREE.Group();
  },

  buildChestplate(tier = 'iron', id = '') {
    const s = this.getSet(tier);
    return s ? s.buildChestplate(id) : new THREE.Group();
  },

  buildPauldron(tier = 'iron') {
    const s = this.getSet(tier);
    return s ? s.buildPauldron() : new THREE.Group();
  },

  buildBoots(tier = 'iron', id = '') {
    const s = this.getSet(tier);
    return s ? s.buildBoots(id) : new THREE.Group();
  },

  attachFullSet(characterParts, tier = 'gold', items = {}) {
    if (!characterParts || !characterParts.armorG) return;
    const armorG = characterParts.armorG;

    for (const k in armorG) {
      const group = armorG[k];
      while (group.children.length) {
        const c = group.children.pop();
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    }

    armorG.helm.add(this.buildHelmet(tier, items.helm || ''));
    armorG.chest.add(this.buildChestplate(tier, items.chest || ''));
    armorG.pauldL.add(this.buildPauldron(tier));
    armorG.pauldR.add(this.buildPauldron(tier));
    armorG.bootL.add(this.buildBoots(tier, items.boots || ''));
    armorG.bootR.add(this.buildBoots(tier, items.boots || ''));
  }
};

window.ArmorManager = ArmorManager;
window.Armor3DModels = ArmorManager; // Backwards compatibility
if (typeof module !== 'undefined') module.exports = ArmorManager;

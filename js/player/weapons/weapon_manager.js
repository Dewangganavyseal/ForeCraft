'use strict';
/* =================================================================
   FORECRAFT 3D - WEAPON MANAGER
   File: js/player/weapons/weapon_manager.js
   ================================================================= */

const WeaponManager = {
  weapons: {
    sword_wood:  typeof WeaponSwordWood  !== 'undefined' ? WeaponSwordWood  : null,
    sword_iron:  typeof WeaponSwordIron  !== 'undefined' ? WeaponSwordIron  : null,
    sword_storm: typeof WeaponSwordStorm !== 'undefined' ? WeaponSwordStorm : null,
    sword_venom: typeof WeaponSwordVenom !== 'undefined' ? WeaponSwordVenom : null,
    sword_frost: typeof WeaponSwordFrost !== 'undefined' ? WeaponSwordFrost : null,
    sword_titan: typeof WeaponSwordTitan !== 'undefined' ? WeaponSwordTitan : null
  },

  getWeapon(id = 'sword_iron') {
    if (id === 'sword_wood'  && window.WeaponSwordWood)  return window.WeaponSwordWood;
    if (id === 'sword_iron'  && window.WeaponSwordIron)  return window.WeaponSwordIron;
    if (id === 'sword_storm' && window.WeaponSwordStorm) return window.WeaponSwordStorm;
    if (id === 'sword_venom' && window.WeaponSwordVenom) return window.WeaponSwordVenom;
    if (id === 'sword_frost' && window.WeaponSwordFrost) return window.WeaponSwordFrost;
    if (id === 'sword_titan' && window.WeaponSwordTitan) return window.WeaponSwordTitan;
    return this.weapons[id] || window.WeaponSwordIron || this.weapons.sword_iron;
  },

  buildWeapon(weaponId = 'sword_frost') {
    const w = this.getWeapon(weaponId);
    return w ? w.build() : new THREE.Group();
  },

  attachToCharacterHand(characterParts, weaponId = 'sword_frost') {
    if (!characterParts || !characterParts.armR) return;
    const fore = characterParts.armR.userData ? characterParts.armR.userData.fore : null;
    if (!fore) return;

    // Bersihkan senjata lama dari tangan
    const old = fore.children.find(c => c.name && c.name.startsWith('Weapon_'));
    if (old) fore.remove(old);

    // Buat dan pasang senjata baru
    const weaponMesh = this.buildWeapon(weaponId);
    fore.add(weaponMesh);
    characterParts.sword = weaponMesh;
  }
};

window.WeaponManager = WeaponManager;
window.Weapon3DModels = WeaponManager; // Backwards compatibility
if (typeof module !== 'undefined') module.exports = WeaponManager;

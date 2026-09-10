# Project Forecraft — Agent Instructions

## Git & Versioning Rules
Whenever pushing changes or updating the GitHub repository (`https://github.com/Dewangganavyseal/ForeCraft`):
1. **Always increment the project version**:
   - Default: Bump patch version (e.g. `0.2.3` -> `0.2.4`).
   - Major/minor update: Bump minor or major as requested.
2. **Update version in code**:
   - `js/config.js`: `CFG.VERSION = '0.2.x'`
   - `package.json`: `"version": "0.2.x"`
3. **Rebuild web assets**:
   - Run `npm run build`
4. **Commit and Tag**:
   - Commit message: `release: v0.2.x - <short update description>`
   - Tag: `git tag v0.2.x`
   - Push: `git push origin main && git push origin --tags`
5. **Clean Repository Policy**:
   - Never commit non-game files (`3D Studio`, `Button UI`, `NEW MODEL`, `Modeling`, tools, `.bat`, `.py` generators).
   - Only commit pure game assets and runtime code.

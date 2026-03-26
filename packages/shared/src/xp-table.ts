/**
 * Pre-computed XP thresholds for levels 1–99 using the RuneScape formula:
 *   xpForLevel(L) = floor(sum for i=1..L-1 of floor(i + 300 * 2^(i/7)) / 4)
 *
 * Index 0 = level 1 (0 XP), index 1 = level 2 (83 XP), ..., index 98 = level 99.
 */
const XP_TABLE: number[] = buildXpTable();

function buildXpTable(): number[] {
  const table: number[] = [0]; // level 1 = 0 XP
  let cumulative = 0;

  for (let level = 1; level < 99; level++) {
    cumulative += Math.floor(level + 300 * 2 ** (level / 7)) / 4;
    table.push(Math.floor(cumulative));
  }

  return table;
}

/** Total XP required to reach `level` (1-indexed, 1–99). */
export function xpForLevel(level: number): number {
  if (level < 1) return 0;
  if (level > 99) return XP_TABLE[98]!;
  return XP_TABLE[level - 1]!;
}

/** Current level for the given total XP (returns 1–99). */
export function levelForXp(xp: number): number {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]!) return i + 1;
  }
  return 1;
}

/** XP remaining until the next level, or 0 if already 99. */
export function xpToNextLevel(skill: { level: number; xp: number }): number {
  if (skill.level >= 99) return 0;
  return xpForLevel(skill.level + 1) - skill.xp;
}

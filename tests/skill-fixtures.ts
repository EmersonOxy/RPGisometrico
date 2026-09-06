import type { Character } from "../src/core/types";
import { classRegistry } from "../src/data/classes";
/** Combat fixtures model an already learned kit, independently of level-up UI. */
export function giveTestKit(c:Character) {
  c.skillNodes=[...new Set([...(c.skillNodes??[]),...classRegistry[c.classId].abilities.map((_,i)=>c.classId+":foundation:"+i)])];
  c.loadout=[...classRegistry[c.classId].abilities];return c;
}

import { BM } from "./battle";
import { EntityFactory } from "./entity-factory";

const player = EntityFactory.createPlayer("player");
const enemy = EntityFactory.createEnemy();
const enemy2 = EntityFactory.createEnemy();

const battleManager = new BM([player, enemy, enemy2]);

battleManager.fight();

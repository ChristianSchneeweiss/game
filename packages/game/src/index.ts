import { BM } from "./battle";
import { EntityFactory } from "../../server/src/game-usecases/entity-factory";

const player = EntityFactory.createPlayer("player", db);
const enemy = EntityFactory.createEnemy();
const enemy2 = EntityFactory.createEnemy();

const battleManager = new BM([player, enemy, enemy2]);

battleManager.fight();

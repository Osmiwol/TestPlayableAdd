import Phaser from "phaser";
import { GameScene } from "./game/GameScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  backgroundColor: "#000000",
  scene: [GameScene]
});
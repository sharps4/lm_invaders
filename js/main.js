import PreloaderScene from './scenes/PreloaderScene.js';
import GameScene from './scenes/GameScene.js';
import MenuScene from './scenes/MenuScene.js';

const config = {
    type: Phaser.AUTO, 
    width: 1400,
    height: 800,
    parent: 'game-container', 
    physics: {
        default: 'arcade', 
        arcade: {
            gravity: { y: 0 }, 
            debug: false 
        }
    },
    scene: [PreloaderScene, GameScene, MenuScene]
};

const game = new Phaser.Game(config);
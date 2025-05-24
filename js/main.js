import PreloaderScene from './scenes/PreloaderScene.js';
import GameScene from './scenes/GameScene.js';
import MenuScene from './scenes/MenuScene.js';
import CharacterSelectScene from './scenes/CharacterSelectScene.js';
import ResultsScene from './scenes/ResultsScene.js'; 

const config = {
    type: Phaser.AUTO,
    width: 1400,
    height: 800,
    parent: 'game-container',
    pixelArt: true, 
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false 
        }
    },
    scene: [PreloaderScene, MenuScene, CharacterSelectScene, GameScene, ResultsScene] 
};

const game = new Phaser.Game(config); 
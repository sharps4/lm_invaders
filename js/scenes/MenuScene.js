import { GAME_VERSION } from '../version.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#0D47A1'); 

        let titleText = this.add.text(
            this.cameras.main.width / 2,
            150,
            'LaManu Invaders',
            { font: '48px PixelFont', fill: '#fff' }
        ).setOrigin(0.5);


        let playButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 0, 
            `JOUER`,
            { font: '32px PixelFont', fill: '#FFD700', backgroundColor: '#333333', padding: { x: 20, y: 10 } }
        )
        .setOrigin(0.5)
        .setInteractive();

        playButton.on('pointerdown', () => {
            this.scene.start('CharacterSelectScene'); 
        });
        playButton.on('pointerover', () => playButton.setStyle({ fill: '#FFF' }));
        playButton.on('pointerout', () => playButton.setStyle({ fill: '#FFD700' }));

        this.add.text(
            this.cameras.main.width - 20, 
            this.cameras.main.height - 20, 
            `v${GAME_VERSION}`,
            { font: '16px PixelFont', fill: '#888' }
        ).setOrigin(1, 1); 

    }
}
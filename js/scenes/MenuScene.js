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

        const gameData = this.registry.get('gameData');
        const leoData = gameData.characters.find(char => char.id === 'leo');

        // Bouton pour jouer avec Léo
        let playButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 50,
            `Jouer avec ${leoData.name}`,
            { font: '32px PixelFont', fill: '#FFD700', backgroundColor: '#333', padding: { x: 20, y: 10 } }
        )
        .setOrigin(0.5)
        .setInteractive();

        playButton.on('pointerdown', () => {
            this.scene.start('GameScene', { characterId: 'leo' });
        });

        playButton.on('pointerover', () => playButton.setStyle({ fill: '#FFF' }));
        playButton.on('pointerout', () => playButton.setStyle({ fill: '#FFD700' }));

    }
}
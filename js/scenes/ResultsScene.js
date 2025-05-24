import { GAME_VERSION } from '../version.js'; 

export default class ResultsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultsScene' });
        this.finalScore = 0;
        this.coinsEarned = 0;
        this.totalCoins = 0;
        this.isVictory = false;
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.isVictory = data.victory || false;
        console.log("ResultsScene init. Score:", this.finalScore, "Victory:", this.isVictory);
    }

    create() {
        this.cameras.main.setBackgroundColor('#1B2631'); 

        this.coinsEarned = Math.floor(this.finalScore * 0.1);
        if (this.coinsEarned > 0) {
            let currentTotalInStorage = parseInt(localStorage.getItem('manuCoins')) || 0;
            this.totalCoins = currentTotalInStorage + this.coinsEarned;
            localStorage.setItem('manuCoins', this.totalCoins.toString());
            console.log(`${this.coinsEarned} ManuCoins ajoutés. Nouveau total: ${this.totalCoins}`);
        } else {
            this.totalCoins = parseInt(localStorage.getItem('manuCoins')) || 0;
        }

        let titleStr = this.isVictory ? "VICTOIRE !" : "GAME OVER";
        let titleColor = this.isVictory ? '#00FF00' : '#FF0000';
        this.add.text(this.cameras.main.width / 2, 150, titleStr, {
            font: '64px Arial', fill: titleColor, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(this.cameras.main.width / 2, 250, `Score Final: ${this.finalScore}`, {
            font: '32px Arial', fill: '#FFFFFF'
        }).setOrigin(0.5);

        if (this.coinsEarned > 0) {
            this.add.text(this.cameras.main.width / 2, 300, `ManuCoins Gagnés: +${this.coinsEarned}`, {
                font: '28px Arial', fill: '#FFD700'
            }).setOrigin(0.5);
        }

        this.add.text(this.cameras.main.width / 2, 350, `Total ManuCoins: ${this.totalCoins}`, {
            font: '28px Arial', fill: '#FFD700'
        }).setOrigin(0.5);


        let backButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height - 150,
            'RETOUR AU MENU',
            { font: '32px Arial', fill: '#FFF', backgroundColor: '#333', padding: { x: 20, y: 10 } }
        )
        .setOrigin(0.5)
        .setInteractive();

        backButton.on('pointerdown', () => {
            console.log("ResultsScene: Back button clicked.");
            const menuSceneInstance = this.scene.manager.getScene('MenuScene');
            console.log("ResultsScene: MenuScene instance from manager BEFORE stop/start:", menuSceneInstance);
            console.log("ResultsScene: Is MenuScene active?", this.scene.manager.isActive('MenuScene'));
            console.log("ResultsScene: Is MenuScene sleeping?", this.scene.manager.isSleeping('MenuScene'));

            this.scene.stop();
            console.log("ResultsScene: Requesting MenuScene start AFTER stopping current scene.");
            this.scene.manager.start('MenuScene');
        });
        backButton.on('pointerover', () => backButton.setStyle({ fill: '#FFD700' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#FFF' }));

        this.add.text(this.cameras.main.width - 20, this.cameras.main.height - 20, `v${GAME_VERSION}`,
            { font: '16px Arial', fill: '#888' }
        ).setOrigin(1, 1);
    }

    shutdown() {
        console.log("ResultsScene shutdown() EXECUTED - This MUST appear when going to MenuScene");
        this.tweens.killAll(); 
        console.log("ResultsScene cleanup finished.");
    }
}
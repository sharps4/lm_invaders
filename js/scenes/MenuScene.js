import { GAME_VERSION } from '../version.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.menuButtons = [];
        this.manuCoinsText = null;
    }

    create() {
        this.cameras.main.setBackgroundColor('#0A0E2F'); 
        let bgGraphics = this.add.graphics();
        bgGraphics.fillGradientStyle(0x0A0E2F, 0x0A0E2F, 0x1A1F4F, 0x1A1F4F, 1); 
        bgGraphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        let titleText = this.add.text(
            this.cameras.main.width / 2,
            150, 
            'LaManu Invaders',
            {
                font: '72px Arial', 
                fill: '#fff',
                stroke: '#6A0DAD',
                strokeThickness: 6,
                shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, stroke: true, fill: true }
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: titleText,
            scaleX: 1.05,
            scaleY: 1.03,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const buttonStartY = this.cameras.main.height / 2 - 50; 
        const buttonSpacing = 80; 

        this.menuButtons = []; 

        this.createMenuButton(
            'JOUER',
            buttonStartY,
            () => { this.scene.start('CharacterSelectScene'); },
            true 
        );

        this.createMenuButton(
            'MODES DE JEU',
            buttonStartY + buttonSpacing,
            () => { console.log("Modes de jeu - à implémenter"); },
            false 
        );

        this.createMenuButton(
            'BOUTIQUE',
            buttonStartY + buttonSpacing * 2,
            () => { console.log("Boutique - à implémenter"); },
            false 
        );

        this.createMenuButton(
            'OPTIONS',
            buttonStartY + buttonSpacing * 3,
            () => { console.log("Options - à implémenter"); },
            false 
        );

        this.menuButtons.forEach((button, index) => {
            button.setAlpha(0); 
            button.x -= 100;    
            this.tweens.add({
                targets: button,
                alpha: 1,
                x: button.getData('originalX'), 
                duration: 500,
                ease: 'Power2',
                delay: 100 + index * 150 
            });
        });

        this.add.text(
            this.cameras.main.width - 20,
            this.cameras.main.height - 20,
            `v${GAME_VERSION}`,
            { font: '16px Arial', fill: '#666' } 
        ).setOrigin(1, 1);

        this.displayManuCoins();
    }

    displayManuCoins() {
        let currentCoins = parseInt(localStorage.getItem('manuCoins')) || 0;

        if (this.manuCoinsText) {
            this.manuCoinsText.setText(`ManuCoins: ${currentCoins}`);
        } else {
            this.manuCoinsText = this.add.text(
                this.cameras.main.width - 20, 
                20,                             
                `ManuCoins: ${currentCoins}`,
                {
                    font: '24px Arial',
                    fill: '#FFD700', 
                    align: 'right'
                }
            ).setOrigin(1, 0) 
             .setScrollFactor(0);
        }
        // if (this.manuCoinIcon) this.manuCoinIcon.destroy();
        // this.manuCoinIcon = this.add.image(this.manuCoinsText.x - this.manuCoinsText.width - 5, this.manuCoinsText.y + this.manuCoinsText.height/2, 'manucoin_icon').setOrigin(1, 0.5).setScale(0.8).setScrollFactor(0);
    }


    createMenuButton(text, y, callback, enabled = true) {
        const buttonStyle = {
            font: '36px Arial',
            fill: enabled ? '#FFD700' : '#555', 
            backgroundColor: enabled ? '#333333' : '#222222',
            padding: { x: 30, y: 15 },
            align: 'center',
            fixedWidth: 350 
        };

        let button = this.add.text(
            this.cameras.main.width / 2,
            y,
            text,
            buttonStyle
        )
        .setOrigin(0.5)
        .setData('originalX', this.cameras.main.width / 2); 

        if (enabled) {
            button.setInteractive();
            button.on('pointerdown', callback);

            button.on('pointerover', () => {
                button.setStyle({ fill: '#FFF', fontSize: '38px' }); 
                this.tweens.add({ targets: button, scale: 1.05, duration: 100, ease: 'Power1' });
            });
            button.on('pointerout', () => {
                button.setStyle({ fill: '#FFD700', fontSize: '36px' });
                this.tweens.add({ targets: button, scale: 1, duration: 100, ease: 'Power1' });
            });
            button.on('pointerup', () => { 
                 this.tweens.add({ targets: button, scale: 1.05, duration: 50, ease: 'Power1' });
            });
        } else {
            button.setAlpha(0.6); 
        }

        this.menuButtons.push(button); 
        return button;
    }

    shutdown() {
        console.log("MenuScene shutdown called");
        if (this.manuCoinsText && this.manuCoinsText.active) { 
            this.manuCoinsText.destroy();
            this.manuCoinsText = null;
        }
        // if (this.manuCoinIcon && this.manuCoinIcon.active) { this.manuCoinIcon.destroy(); this.manuCoinIcon = null; }
        if (this.titleText && this.titleText.active) { this.titleText.destroy(); this.titleText = null; }
        this.menuButtons.forEach(button => {
            if (button && button.active) button.destroy();
        });
        this.menuButtons = [];
        if (this.versionText && this.versionText.active) {this.versionText.destroy(); this.versionText = null;}

        this.tweens.killAll(); 

        super.shutdown(); 
    }
}
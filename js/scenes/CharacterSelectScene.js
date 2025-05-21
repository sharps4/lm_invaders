export default class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
        this.charactersData = [];
        this.selectedCharacterIndex = 0;
        this.characterSprites = [];
        this.characterNameText = null;
        this.characterDescriptionText = null; 
        this.selectedCharacterImage = null;
    }

    preload() {
    }

    create() {
        this.cameras.main.setBackgroundColor('#1A237E'); 
        const gameData = this.registry.get('gameData');
        this.charactersData = gameData.characters.filter(char => char.playableInSelectScreen !== false); 

        if (this.charactersData.length === 0) {
            console.error("Aucun personnage disponible pour la sélection !");
            this.scene.start('MenuScene');
            return;
        }

        this.add.text(this.cameras.main.width / 2, 80, 'CHOISIS TON PERSONNAGE', {
            font: '40px PixelFont', fill: '#fff'
        }).setOrigin(0.5);

        this.showCharacterSelection();

        let selectButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height - 100,
            'SÉLECTIONNER CE PERSONNAGE',
            { font: '28px PixelFont', fill: '#00FF00', backgroundColor: '#222', padding: { x: 15, y: 8 } }
        )
        .setOrigin(0.5)
        .setInteractive();

        selectButton.on('pointerdown', () => {
            const selectedChar = this.charactersData[this.selectedCharacterIndex];
            this.scene.start('GameScene', { characterId: selectedChar.id });
        });
        selectButton.on('pointerover', () => selectButton.setStyle({ fill: '#FFF' }));
        selectButton.on('pointerout', () => selectButton.setStyle({ fill: '#00FF00' }));


        let backButton = this.add.text(100, this.cameras.main.height - 50, '< RETOUR', {
            font: '24px PixelFont', fill: '#ccc'
        }).setOrigin(0.5).setInteractive();
        backButton.on('pointerdown', () => this.scene.start('MenuScene'));
        backButton.on('pointerover', () => backButton.setStyle({ fill: '#fff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#ccc' }));

        if (this.charactersData.length > 1) {
            let prevButton = this.add.text(this.cameras.main.width / 2 - 200, this.cameras.main.height / 2, '<', {
                font: '48px PixelFont', fill: '#fff'
            }).setOrigin(0.5).setInteractive();
            prevButton.on('pointerdown', () => this.changeCharacter(-1));

            let nextButton = this.add.text(this.cameras.main.width / 2 + 200, this.cameras.main.height / 2, '>', {
                font: '48px PixelFont', fill: '#fff'
            }).setOrigin(0.5).setInteractive();
            nextButton.on('pointerdown', () => this.changeCharacter(1));
        }
    }

    showCharacterSelection() {
        if (this.selectedCharacterImage) this.selectedCharacterImage.destroy();
        if (this.characterNameText) this.characterNameText.destroy();
        if (this.characterDescriptionText) this.characterDescriptionText.destroy();

        const character = this.charactersData[this.selectedCharacterIndex];

        this.selectedCharacterImage = this.add.sprite(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50, 
            character.spriteKey 
        ).setScale(3); 

        this.characterNameText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 80, 
            character.name.toUpperCase(),
            { font: '32px PixelFont', fill: '#FFD700', align: 'center' }
        ).setOrigin(0.5);

        if (character.description) {
            this.characterDescriptionText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 + 120,
                character.description,
                { font: '18px PixelFont', fill: '#eee', align: 'center', wordWrap: { width: 500 } }
            ).setOrigin(0.5);
        }
    }

    changeCharacter(direction) {
        this.selectedCharacterIndex += direction;

        if (this.selectedCharacterIndex < 0) {
            this.selectedCharacterIndex = this.charactersData.length - 1;
        } else if (this.selectedCharacterIndex >= this.charactersData.length) {
            this.selectedCharacterIndex = 0;
        }
        this.showCharacterSelection();  
    }
}
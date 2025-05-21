export default class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
        this.charactersData = [];
        this.selectedCharacterIndex = 0;

        this.topRowPortraits = [];
        this.spotlight = null;
        this.largeFullBodySprite = null;

        this.characterNameText = null;
        this.characterDescriptionText = null;
        this.skillTitleText = null;
        this.skillTexts = [];

        this.largeSpriteX = 0;
        this.largeSpriteY = 0; 
        this.textBlockStartX = 0;
        this.textBlockStartY = 0;
    }

    create() {
        this.cameras.main.setBackgroundColor('#1A1A1A');
        const gameData = this.registry.get('gameData');
        this.charactersData = gameData.characters.filter(char => char.id && char.spriteKey && char.portraitKey);

        if (this.charactersData.length === 0) {
            console.error("Aucun personnage avec spriteKey et portraitKey défini dans gameData !");
            this.scene.start('MenuScene');
            return;
        }

        this.add.text(this.cameras.main.width / 2, 50, 'CHOISIS TON PERSONNAGE', {
            font: '32px PixelFont', fill: '#FFFFFF'
        }).setOrigin(0.5);

        let redPlatform = this.add.graphics();
        redPlatform.fillStyle(0xCC0000, 0.7);
        const platformHeight = 100;
        const platformY = 150; 
        redPlatform.fillRect(0, platformY - platformHeight / 2, this.cameras.main.width, platformHeight);

        this.spotlight = this.add.graphics();

        this.largeSpriteX = this.cameras.main.width * 0.28;

        const topUIBoundary = platformY + platformHeight / 2 + 50; 
        const bottomUIBoundary = this.cameras.main.height - 150; 
        const availableHeightForSpriteAndText = bottomUIBoundary - topUIBoundary;
        
        this.largeSpriteY = topUIBoundary + availableHeightForSpriteAndText * 0.8; 
                                                                                


        this.displayTopRowPortraits(platformY);
        this.updateCharacterDisplay();

        if (this.charactersData.length > 1) {
            const arrowY = platformY;
            let prevButton = this.add.text(80, arrowY, '<', { font: '60px PixelFont', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setInteractive();
            prevButton.on('pointerdown', () => this.changeCharacterSelection(-1));
            prevButton.on('pointerover', () => prevButton.setStyle({ fill: '#FFD700' }));
            prevButton.on('pointerout', () => prevButton.setStyle({ fill: '#FFF' }));

            let nextButton = this.add.text(this.cameras.main.width - 80, arrowY, '>', { font: '60px PixelFont', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setInteractive();
            nextButton.on('pointerdown', () => this.changeCharacterSelection(1));
            nextButton.on('pointerover', () => nextButton.setStyle({ fill: '#FFD700' }));
            nextButton.on('pointerout', () => nextButton.setStyle({ fill: '#FFF' }));
        }

        let selectButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 70, 'CHOISIR', { font: '32px PixelFont', fill: '#00FF00', backgroundColor: '#111', padding: { x: 25, y: 12 } }).setOrigin(0.5).setInteractive();
        selectButton.on('pointerdown', () => {
            const selectedChar = this.charactersData[this.selectedCharacterIndex];
            this.scene.start('GameScene', { characterId: selectedChar.id });
        });
        selectButton.on('pointerover', () => selectButton.setStyle({ fill: '#FFF' }));
        selectButton.on('pointerout', () => selectButton.setStyle({ fill: '#00FF00' }));

        let backButton = this.add.text(80, this.cameras.main.height - 50, '< RETOUR', { font: '24px PixelFont', fill: '#ccc' }).setOrigin(0, 1).setInteractive();
        backButton.on('pointerdown', () => this.scene.start('MenuScene'));
        backButton.on('pointerover', () => backButton.setStyle({ fill: '#fff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#ccc' }));
    }

    displayTopRowPortraits(platformY) {
        this.topRowPortraits.forEach(p => p.destroy());
        this.topRowPortraits = [];

        const characterCount = this.charactersData.length;
        const totalRowWidth = this.cameras.main.width - 300;
        const spacing = totalRowWidth / Math.max(1, characterCount);
        const startX = 150 + spacing / 2;

        this.charactersData.forEach((character, index) => {
            const x = startX + index * spacing;
            const y = platformY;
            let portraitSprite = this.add.sprite(x, y, character.portraitKey)
                .setOrigin(0.5, 0.5)
                .setDisplaySize(64, 64); 
            this.topRowPortraits.push(portraitSprite);
        });
    }

    updateCharacterDisplay() {
        if (this.largeFullBodySprite) this.largeFullBodySprite.destroy();
        if (this.characterNameText) this.characterNameText.destroy();
        if (this.characterDescriptionText) this.characterDescriptionText.destroy();
        if (this.skillTitleText) this.skillTitleText.destroy();
        this.skillTexts.forEach(text => text.destroy());
        this.skillTexts = [];
        this.spotlight.clear();

        const character = this.charactersData[this.selectedCharacterIndex];

        this.topRowPortraits.forEach((portrait, index) => {
            if (index === this.selectedCharacterIndex) {
                portrait.setTint(0xffffff);
                portrait.setDepth(1);
                this.spotlight.fillStyle(0xffffff, 0.2);
                this.spotlight.fillRect(portrait.x - portrait.displayWidth/2 - 5, portrait.y - portrait.displayHeight/2 - 5, portrait.displayWidth + 10, portrait.displayHeight + 10);
            } else {
                portrait.setTint(0x777777);
                portrait.setDepth(0);
            }
        });

        this.largeFullBodySprite = this.add.sprite(
            this.largeSpriteX,
            this.largeSpriteY,
            character.spriteKey
        )
        .setOrigin(0.5, 1) 
        .setScale(5);     

        this.textBlockStartY = (this.largeFullBodySprite.y - this.largeFullBodySprite.displayHeight) + 10; 
        
        const minTextBlockY = 150 + 100/2 + 30; 
        this.textBlockStartY = Math.max(minTextBlockY, this.textBlockStartY);


        this.textBlockStartX = this.largeSpriteX + (this.largeFullBodySprite.displayWidth / 2) + 40; 

        this.characterNameText = this.add.text(
            this.textBlockStartX,
            this.textBlockStartY,
            character.name.toUpperCase(),
            { font: '36px PixelFont', fill: '#FF6347', align: 'left' }
        ).setOrigin(0, 0);

        let currentY = this.textBlockStartY + this.characterNameText.height + 15; 

        if (character.description) {
            this.characterDescriptionText = this.add.text(
                this.textBlockStartX,
                currentY,
                character.description,
                { font: '20px PixelFont', fill: '#FFFFFF', align: 'left', wordWrap: { width: this.cameras.main.width - this.textBlockStartX - 50 } }
            ).setOrigin(0, 0);
            currentY += this.characterDescriptionText.height + 20; 
        } else {
            currentY += 20;
        }

        if (character.skills && character.skills.length > 0) {
            this.skillTitleText = this.add.text(this.textBlockStartX, currentY, "Compétences:", {font: '22px PixelFont', fill: '#FFD700'}).setOrigin(0,0);
            currentY += 25;

            character.skills.forEach((skill) => {
                const skillNameText = this.add.text(
                    this.textBlockStartX,
                    currentY,
                    `- ${skill.name}`,
                    { font: '18px PixelFont', fill: '#FFF0A0'}
                ).setOrigin(0,0);
                this.skillTexts.push(skillNameText);
                currentY += skillNameText.height + 3; 

                const skillDescText = this.add.text(
                    this.textBlockStartX + 20,
                    currentY,
                    skill.description,
                    { font: '16px PixelFont', fill: '#B0B0B0', wordWrap: { width: this.cameras.main.width - (this.textBlockStartX + 20) - 50 }, lineSpacing: 2 } 
                ).setOrigin(0,0);
                this.skillTexts.push(skillDescText);
                currentY += skillDescText.height + 10; 
            });
        }
    }

    changeCharacterSelection(direction) {
        this.selectedCharacterIndex += direction;
        if (this.selectedCharacterIndex < 0) this.selectedCharacterIndex = this.charactersData.length - 1;
        else if (this.selectedCharacterIndex >= this.charactersData.length) this.selectedCharacterIndex = 0;
        this.updateCharacterDisplay();
    }
}
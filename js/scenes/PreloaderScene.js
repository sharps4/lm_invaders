export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloaderScene' });
    }

    preload() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        let progressBar = this.add.graphics();
        let loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'CHARGEMENT...',
            style: { font: '20px PixelFont', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);
        let percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: { font: '18px PixelFont', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);
        this.load.on('progress', function (value) {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        this.load.json('gameData', 'assets/data/gameData.json');

        this.load.image('leo_portrait', 'assets/images/leo_portrait.png');
        // this.load.image('leo_full_body', 'assets/images/leo_full_body.png');

        // this.createPlaceholderTexture('player_leo', 32, 32, '#00FF00');
        this.createPlaceholderTexture('bullet_leo', 8, 16, '#FFFF00');  
        this.createPlaceholderTexture('enemy_cliche1', 32, 32, '#FF0000');
        this.createPlaceholderTexture('boss_clementine', 64, 64, '#FF00FF'); 
        this.createPlaceholderTexture('coffee_cup', 12, 12, '#A0522D');  


        this.createPlaceholderTexture('player', 32, 32, '#00FFFF'); 
        this.createPlaceholderTexture('bullet', 8, 16, '#FFFFFF');  
        this.createPlaceholderTexture('enemy', 32, 32, '#FFA500'); 
    }

    createPlaceholderTexture(key, width, height, colorHex) {
        let graphics = this.make.graphics({ add: false });
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colorHex).color, 1);
        graphics.fillRect(0, 0, width, height);
        graphics.generateTexture(key, width, height);
        graphics.destroy();
        console.log(`Placeholder texture created: ${key}`);
    }

    create() {
        this.registry.set('gameData', this.cache.json.get('gameData'));
        console.log("Game data loaded and set in registry:", this.registry.get('gameData'));

        if (this.scene.manager.keys.MenuScene) {
            console.log("MenuScene found, starting it.");
            this.scene.start('MenuScene');
        } else {
            console.error("MenuScene key not found in scene manager. Check main.js and MenuScene.js import/export.");
            this.add.text(100, 100, "ERREUR: MenuScene introuvable!", { font: "24px Arial", fill: "#ff0000" });
        }
    }
}
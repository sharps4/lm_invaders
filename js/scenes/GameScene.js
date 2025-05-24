import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Bullet from '../entities/Bullet.js';
import Boss from '../entities/Boss.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.playerData = null;
        this.cursors = null;
        this.shootKey = null;
        this.skillKeys = [];
        this.bullets = null;
        this.enemies = null;
        this.enemyBullets = null;
        this.boss = null;
        this.bossProjectiles = null; 
        this.score = 0;
        this.scoreText = null;
        this.waveText = null;
        // this.skillTexts = [];
        this.skillUIElements = [];
        this.gameData = null;

        this.currentWorldData = null;
        this.currentWaveIndex = -1;
        this.currentWaveData = null;

        this.waveTimer = null; 
        this.survivalWaveActive = false; 
        this.enemiesToKillInWave = 0;
        this.enemiesKilledInWave = 0;

        this.bossSpawned = false; 

        this.playerHealthBarBg = null;      
        this.playerHealthBar = null;       
        this.playerHealthText = null;

        this.bossHealthBarBg = null;
        this.bossHealthBar = null;
        this.bossNameText = null;

        this.gameEnded = false;
    }

    init(data) {
        this.selectedCharacterId = data.characterId || 'leo';
    }

    create() {
        console.log("GameScene CREATE called. Attempting camera reset FIRST."); 
        this.cameras.resetAll(); 
        this.gameEnded = false;
        this.gameData = this.registry.get('gameData');
        this.playerData = this.gameData.characters.find(char => char.id === this.selectedCharacterId);

        if (!this.playerData) {
            console.error("Données du personnage non trouvées pour :", this.selectedCharacterId);
            this.scene.start('MenuScene');
            return;
        }

        this.currentWorldData = this.gameData.worlds.find(world => world.id === "cafeteria"); 

        if (!this.currentWorldData) {
            console.error("Données du monde 'cafeteria' non trouvées !");
            this.scene.start('MenuScene');
            return;
        }

        this.cameras.main.setBackgroundColor('#2c3e50');

        this.player = new Player(this, this.cameras.main.width / 2, this.cameras.main.height - 50, this.playerData);

        if (this.player) { 
            this.player.setActive(true); 
            this.player.setVisible(true); 
        }

        this.cursors = this.input.keyboard.createCursorKeys();
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        if (this.playerData && this.playerData.skills) {
            const skillKeyCodes = [
                Phaser.Input.Keyboard.KeyCodes.A,
                Phaser.Input.Keyboard.KeyCodes.Z,
                Phaser.Input.Keyboard.KeyCodes.E
            ];
            this.playerData.skills.forEach((skill, index) => {
                if (skillKeyCodes[index]) {
                    this.skillKeys[index] = this.input.keyboard.addKey(skillKeyCodes[index]);
                }
            });
        }

        this.createPlayerHealthBar();

        this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 30, runChildUpdate: true });
        this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
        this.enemyBullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 50, runChildUpdate: true }); 
        this.bossProjectiles = this.physics.add.group({ defaultKey: 'coffee_cup', maxSize: 50, runChildUpdate: true }); 

        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.playerHitByEnemyBullet, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.playerCollideWithEnemy, null, this);

        this.scoreText = this.add.text(16, 16, 'SCORE: 0', { font: '24px Arial', fill: '#fff' });
        this.waveText = this.add.text(this.cameras.main.width - 16, 16, `VAGUE: -`, { font: '24px Arial', fill: '#fff' }).setOrigin(1, 0);
        // this.createSkillUI();
        this.createModernSkillUI();

        this.currentWaveIndex = -1;
        this.boss = null;
        this.bossSpawned = false;
        this.survivalWaveActive = false;
        if (this.waveTimer) this.waveTimer.remove();


        this.startNextWave();
    }

    endGameSequence(isVictory = false) {
        if (this.gameEnded) {
            console.log("GameScene endGameSequence: Already called, exiting.");
            return;
        }
        this.gameEnded = true;
        console.log("GameScene endGameSequence: Processing. Victory:", isVictory, "Final Score:", this.score);

        if (this.player && this.player.active) this.player.active = false;

        this.time.delayedCall(1500, () => { 
            console.log("GameScene: Starting ResultsScene.");
            if (this.scene && this.scene.systems && this.scene.systems.isActive()) {
                this.scene.start('ResultsScene', { score: this.score, victory: isVictory });
            } else {
                console.warn("GameScene is no longer active, cannot start ResultsScene reliably.");
            }
        }, [], this);
    }

    startNextWave() {
        if (this.gameEnded) return;
        if (this.bossSpawned && this.boss && this.boss.active) { 
            console.log("Boss principal actif, pas de nouvelle vague normale.");
            return;
        }
        this.survivalWaveActive = false; 

        this.currentWaveIndex++;
        if (this.currentWaveIndex >= this.currentWorldData.waves.length) {
            console.log("Toutes les vagues du monde terminées !");
            if(this.player.active) this.player.active = false;
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height/2, "MONDE TERMINE!", {font: '48px Arial', fill: '#0f0'}).setOrigin(0.5);
            this.time.delayedCall(3000, () => this.scene.start('MenuScene'));
            this.endGameSequence(true);
            return;
        }

        this.currentWaveData = this.currentWorldData.waves[this.currentWaveIndex];
        this.waveText.setText(`VAGUE ${this.currentWaveIndex + 1}: ${this.currentWaveData.type.toUpperCase()}`);
        console.log(`Début Vague ${this.currentWaveIndex + 1}: Type - ${this.currentWaveData.type}`);

        if (this.waveTimer) this.waveTimer.remove(false); 
        this.enemiesKilledInWave = 0;
        this.enemiesToKillInWave = 0;

        switch (this.currentWaveData.type) {
            case 'kill_count':
                this.enemiesToKillInWave = this.currentWaveData.count;
                this.spawnEnemiesForKillCountWave(this.currentWaveData);
                break;
            case 'timed_survival':
                this.startTimedSurvivalWave(this.currentWaveData);
                break;
            case 'boss_fight':
                this.spawnBoss(this.currentWaveData.bossId);
                break;
            default:
                console.warn("Type de vague inconnu:", this.currentWaveData.type);
                this.time.delayedCall(1000, this.startNextWave, [], this);
                break;
        }
    }

    spawnEnemiesForKillCountWave(waveData) {
        const enemyConfig = this.gameData.enemies[waveData.enemyType] || this.gameData.enemies.cliche_iceberg_1;
        const count = waveData.count;
        const spawnDelay = waveData.spawnDelay || 800;

        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * spawnDelay, () => {
                if ((this.boss && this.boss.active) || this.bossSpawned) return;
                const x = Phaser.Math.Between(100, this.cameras.main.width - 100);
                const y = Phaser.Math.Between(-80, -40);
                let enemy = this.enemies.get(x, y, enemyConfig.spriteKey);
                if (enemy) {
                    let modifiedConfig = {...enemyConfig};
                    if (waveData.elite) modifiedConfig.hp = (modifiedConfig.hp || 20) * 1.5;
                    let currentEnemyConfig = { ...this.gameData.enemies[waveData.enemyType] };
                    if (waveData.enemyConfig) { 
                        currentEnemyConfig = { ...currentEnemyConfig, ...waveData.enemyConfig };
                    }
                    enemy.spawn(currentEnemyConfig, this.player);
                }
            }, [], this);
        }
    }

    startTimedSurvivalWave(waveData) {
        this.waveText.setText(`VAGUE ${this.currentWaveIndex + 1}: SURVIE - SPAWN`);
        const enemyConfig = this.gameData.enemies[waveData.enemyType] || this.gameData.enemies.cliche_iceberg_1;
        const spawnDuration = waveData.duration; 
        const spawnInterval = waveData.spawnInterval || 2000;
        const enemiesPerInterval = waveData.enemiesPerInterval || 1;
        this.survivalWaveActive = true;

        let spawnTimerDisplay = this.add.text(this.cameras.main.width / 2, 30, '', { font: '20px Arial', fill: '#FFD700' }).setOrigin(0.5);
        let spawnUpdateTimer = null; 

        const spawnPhaseStartTime = this.time.now; 

        this.waveTimer = this.time.addEvent({
            delay: spawnInterval,
            callback: () => {
                if (this.time.now >= spawnPhaseStartTime + spawnDuration) {
                    if (this.waveTimer) this.waveTimer.remove(false);
                    return;
                }

                for (let i = 0; i < enemiesPerInterval; i++) {
                    if ((this.boss && this.boss.active) || this.bossSpawned) {
                        if (this.waveTimer) this.waveTimer.remove(); return;
                    }
                    const x = Phaser.Math.Between(100, this.cameras.main.width - 100);
                    const y = Phaser.Math.Between(-80, -40);
                    let enemy = this.enemies.get(x, y, enemyConfig.spriteKey);
                    let currentEnemyConfig = { ...this.gameData.enemies[waveData.enemyType] };
                    if (waveData.enemyConfig) { 
                        currentEnemyConfig = { ...currentEnemyConfig, ...waveData.enemyConfig };
                    }
                    enemy.spawn(currentEnemyConfig, this.player);
                }
            },
            callbackScope: this,
            loop: true 
        });

        spawnUpdateTimer = this.time.addEvent({
            delay: 100, 
            callback: () => {
                const currentTime = this.time.now;
                const elapsedTimeInSpawnPhase = currentTime - spawnPhaseStartTime;
                let timeLeftInSpawnPhaseMs = spawnDuration - elapsedTimeInSpawnPhase;

                if (timeLeftInSpawnPhaseMs <= 0 || !spawnTimerDisplay.active || (this.waveTimer && this.waveTimer.destroyed)) {
                    if (spawnTimerDisplay.active) spawnTimerDisplay.destroy();
                    if (spawnUpdateTimer) spawnUpdateTimer.remove();
                    return;
                }
                spawnTimerDisplay.setText(`SPAWN EN COURS: ${(timeLeftInSpawnPhaseMs / 1000).toFixed(1)}s`);
            },
            loop: true
        });

        if (this.endSpawnPhaseDelayedCall) {
            this.endSpawnPhaseDelayedCall.remove(false);
            this.endSpawnPhaseDelayedCall = null;
        }
        this.endSpawnPhaseDelayedCall = this.time.delayedCall(spawnDuration, () => {
            console.log("Phase de spawn de la vague de survie terminée (via delayedCall).");
            if (this.waveTimer && !this.waveTimer.destroyed) {
                this.waveTimer.remove(false);
                this.waveTimer = null;
            }
            if (spawnTimerDisplay && spawnTimerDisplay.active) spawnTimerDisplay.destroy();
            if (spawnUpdateTimer && !spawnUpdateTimer.paused) { spawnUpdateTimer.remove(); spawnUpdateTimer = null; }


            this.waveText.setText(`VAGUE ${this.currentWaveIndex + 1}: SURVIE - NETTOYAGE`);
            if (this.enemies.countActive(true) === 0) { 
                this.survivalWaveActive = false;
                this.startNextWave();
            } else {
                console.log("Ennemis restants à nettoyer.");
            }
            this.endSpawnPhaseDelayedCall = null; 
        }, [], this);

        const endSpawnPhaseTimer = this.time.delayedCall(spawnDuration, () => {
            console.log("Phase de spawn de la vague de survie terminée.");
            if (this.waveTimer) this.waveTimer.remove(false); 

            this.waveText.setText(`VAGUE ${this.currentWaveIndex + 1}: SURVIE - NETTOYAGE`);
            if (this.enemies.countActive(true) === 0) {
                console.log("Aucun ennemi restant après la phase de spawn.");
                this.survivalWaveActive = false;
                this.startNextWave();
            } else {
                console.log("Ennemis restants à nettoyer.");
            }
        }, [], this);
    }

    spawnBoss(bossIdToSpawn) {
        if (this.bossSpawned && this.boss && this.boss.active) return;

        this.bossSpawned = true;

        const bossData = this.gameData.bosses.find(b => b.id === bossIdToSpawn);
        this.createBossHealthBar(bossData); 
        if (bossData) {
            console.log(`SPAWNING BOSS ${bossData.name}`);
            this.enemies.clear(true, true);

            if (this.waveTimer && !this.waveTimer.destroyed) {
                this.waveTimer.remove(false);
            }

            this.survivalWaveActive = false;

            this.boss = new Boss(this, this.cameras.main.width / 2, 150, bossData, this.bossProjectiles);
            this.bossSpawned = true;

            if (!this.physics.world.colliders.getActive().find(collider => collider.object1 === this.bullets && collider.object2 === this.boss)) {
                this.physics.add.overlap(this.bullets, this.boss, this.bulletHitBoss, null, this);
            }
            this.waveText.setText(`BOSS: ${bossData.name.toUpperCase()}`);
        } else {
            console.error("Données du boss non trouvées pour l'ID:", bossIdToSpawn);
            this.startNextWave();
        }
    }

    bulletHitEnemy(bullet, enemy) {
        if (this.gameEnded) return;
        if (!bullet.active || !enemy.active) return;
        let damageToDeal = this.player.currentBulletDamage;

        if (bullet.isSpecialProjectile && bullet.texture.key === 'sandwich_projectile' && bullet.skillEffect) {
            damageToDeal = bullet.skillEffect.baseDamage * bullet.skillEffect.impactDamageBonus;
            console.log("Sandwich hit! Damage:", damageToDeal);
            if (typeof enemy.applyDoT === 'function') {
                enemy.applyDoT({
                    damage: bullet.skillEffect.dotDamage,
                    duration: bullet.skillEffect.dotDuration,
                    ticks: bullet.skillEffect.dotTicks,
                    startTime: this.time.now 
                });
            }
        }

        bullet.setActive(false).setVisible(false);
        const points = enemy.takeHit(damageToDeal);

        if (points > 0) {
            this.score += points;
            this.scoreText.setText('SCORE: ' + this.score);

            if (this.currentWaveData && !(this.boss && this.boss.active) && !this.bossSpawned ) { 
                if (this.currentWaveData.type === 'kill_count') {
                    this.enemiesKilledInWave++;
                    if (this.enemiesKilledInWave >= this.enemiesToKillInWave && this.enemies.countActive(true) === 0) {
                        console.log(`Vague "kill_count" ${this.currentWaveIndex + 1} terminée.`);
                        this.time.delayedCall(1500, this.startNextWave, [], this);
                    }
                } else if (this.currentWaveData.type === 'timed_survival' && this.survivalWaveActive) {
                    if ((!this.waveTimer || this.waveTimer.destroyed || this.waveTimer.paused) && this.enemies.countActive(true) === 0) {
                        console.log(`Vague "timed_survival" (nettoyage) ${this.currentWaveIndex + 1} terminée.`);
                        this.survivalWaveActive = false;
                        this.time.delayedCall(1500, this.startNextWave, [], this);
                    }
                }
            }
        }
    }

    bulletHitBoss(bossInstance, bullet) { 
        if (!bossInstance.active || !bullet.active) return;
        bullet.setActive(false).setVisible(false);
        const hitSuccess = bossInstance.takeHit(this.player.currentBulletDamage);   
        this.updateBossHealthBar();

        if (hitSuccess && !bossInstance.active) { 
            this.updateBossHealthBar();
            this.score += bossInstance.scoreValue || 1000;
            this.scoreText.setText('SCORE: ' + this.score);
            this.boss = null; 
            console.log("Boss vaincu, passage à la vague suivante (ou fin de monde).");
            this.time.delayedCall(1000, this.startNextWave, [], this);

            if (this.currentWaveIndex >= this.currentWorldData.waves.length -1) {
                console.log("C'était le boss final du monde.");
                 this.add.text(this.cameras.main.width / 2, this.cameras.main.height/2 + 60, "BOSS VAINCU!", {font: '40px Arial', fill: '#0f0'}).setOrigin(0.5);
                this.endGameSequence(true); 
            } else {
                this.time.delayedCall(1000, this.startNextWave, [], this); 
            }
        }
    }

    playerHitByEnemyBullet(player, enemyBullet) {
        if (!player.active || !enemyBullet.active) return;
        player.takeDamage(enemyBullet.damage || 5);
        enemyBullet.setActive(false).setVisible(false);
    }

    playerCollideWithEnemy(player, enemy) {
        if (!player.active || !enemy.active) return;
        player.takeDamage(15);
        const enemyDiedFromCollision = enemy.takeHit(1000);         

        if (enemyDiedFromCollision > 0 && this.currentWaveData && !(this.boss && this.boss.active) && !this.bossSpawned) {
            if (this.currentWaveData.type === 'kill_count') {
                this.enemiesKilledInWave++;
                if (this.enemiesKilledInWave >= this.enemiesToKillInWave && this.enemies.countActive(true) === 0) {
                    this.time.delayedCall(1500, this.startNextWave, [], this);
                }
            } else if (this.currentWaveData.type === 'timed_survival' && this.survivalWaveActive) {
                if ((!this.waveTimer || this.waveTimer.destroyed || this.waveTimer.paused) && this.enemies.countActive(true) === 0) {
                    this.survivalWaveActive = false;
                    this.time.delayedCall(1500, this.startNextWave, [], this);
                }
            }
        }
    }

    createModernSkillUI() {
        this.skillUIElements = [];
        if (!this.playerData || !this.playerData.skills) return;

        const skillIconSize = 40; 
        const spacing = 10;
        const startX = 20 + 200 + 20;
        const yPos = this.cameras.main.height - 45; 

        this.playerData.skills.forEach((skillData, index) => {
            const skillX = startX + index * (skillIconSize + spacing);

            const icon = this.add.sprite(skillX, yPos, skillData.iconKey || 'bullet') 
                .setOrigin(0, 0.5) 
                .setDisplaySize(skillIconSize, skillIconSize)
                .setScrollFactor(0);

            const cooldownGraphics = this.add.graphics({ x: skillX, y: yPos - skillIconSize / 2}); 
            cooldownGraphics.setScrollFactor(0);

            let keyDisplayName = `SKILL ${index + 1}`;
            const phaserKeyObject = this.skillKeys[index];
            if (phaserKeyObject && typeof phaserKeyObject.key === 'string' && phaserKeyObject.key.length > 0) {
                keyDisplayName = phaserKeyObject.key.toUpperCase();
                if (keyDisplayName === " ") keyDisplayName = "SPACE";
            }
            const keyText = this.add.text(skillX + skillIconSize / 2, yPos + skillIconSize / 2 + 5, keyDisplayName, {
                font: '12px Arial', fill: '#000', backgroundColor: '#fff', padding: {x:2, y:0}
            }).setOrigin(0.5, 0).setScrollFactor(0);


            this.skillUIElements[index] = {
                icon: icon,
                cooldownGraphics: cooldownGraphics,
                keyText: keyText,
                skillData: skillData 
            };
        });
    }

    updateSkillUI(time) { 
        if (!this.player || !this.player.skills || this.skillUIElements.length === 0) return;

        this.player.skills.forEach((skillState, index) => { 
            const uiElement = this.skillUIElements[index];
            if (!uiElement) return;

            uiElement.cooldownGraphics.clear();

            if (skillState.isActive) {
                uiElement.icon.setTint(0x00ff00); 
                const remainingDuration = Math.max(0, ((skillState.activationTime + skillState.duration) - time));
                const durationProgress = remainingDuration / skillState.duration;
                
                uiElement.cooldownGraphics.fillStyle(0x00aa00, 0.7); 
                uiElement.cooldownGraphics.fillRect(0, uiElement.icon.displayHeight * (1 - durationProgress) , uiElement.icon.displayWidth, uiElement.icon.displayHeight * durationProgress);

            } else if (time < skillState.lastUsedTime + skillState.cooldown) {
                uiElement.icon.setTint(0x555555); 
                const timePassed = time - skillState.lastUsedTime;
                const cooldownProgress = timePassed / skillState.cooldown;

                uiElement.cooldownGraphics.fillStyle(0xffffff, 0.4); 
                uiElement.cooldownGraphics.fillRect(0, uiElement.icon.displayHeight * (1 - cooldownProgress) , uiElement.icon.displayWidth, uiElement.icon.displayHeight * cooldownProgress);

            } else {
                uiElement.icon.clearTint(); 
            }
        });
    }

    createPlayerHealthBar() {
    const barWidth = 200;
    const barHeight = 20;
    const x = 20;
    const y = this.cameras.main.height - 40;
    const initialHpText = (this.player) ? `${Math.max(0, Math.ceil(this.player.currentHp))} / ${this.player.maxHp}` : 'HP: --/--';

    if (this.playerHealthBarBg && this.playerHealthBarBg.scene) this.playerHealthBarBg.destroy();
    if (this.playerHealthBar && this.playerHealthBar.scene) this.playerHealthBar.destroy();
    if (this.playerHealthText && this.playerHealthText.scene) this.playerHealthText.destroy();
    this.playerHealthBarBg = null;
    this.playerHealthBar = null;
    this.playerHealthText = null;

    this.playerHealthBarBg = this.add.graphics(); 
    this.playerHealthBarBg.fillStyle(0x555555, 0.8);
    this.playerHealthBarBg.fillRect(x, y, barWidth, barHeight);
    this.playerHealthBarBg.setScrollFactor(0);

    this.playerHealthBar = this.add.graphics();
    this.playerHealthBar.setScrollFactor(0);

    try {
        console.log("GameScene createPlayerHealthBar: Attempting to create playerHealthText with content:", initialHpText);
        this.playerHealthText = this.add.text(
            x + barWidth / 2, y + barHeight / 2,
            initialHpText,
            { font: '14px Arial', fill: '#fff' }
        ).setOrigin(0.5).setScrollFactor(0);
        console.log("GameScene createPlayerHealthBar: playerHealthText CREATED.");
    } catch (e) {
        console.error("ERROR creating playerHealthText in createPlayerHealthBar:", e);
    }

    this.updatePlayerHealthBar();
}

    createBossHealthBar(bossData) {
        if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();
        if (this.bossHealthBar) this.bossHealthBar.destroy();
        if (this.bossNameText) this.bossNameText.destroy();

        const barWidth = this.cameras.main.width * 0.6; 
        const barHeight = 25;
        const x = this.cameras.main.width / 2 - barWidth / 2; 
        const y = 30;

        this.bossHealthBarBg = this.add.graphics();
        this.bossHealthBarBg.fillStyle(0x330033, 0.8); 
        this.bossHealthBarBg.fillRect(x, y, barWidth, barHeight);
        this.bossHealthBarBg.setScrollFactor(0);

        this.bossHealthBar = this.add.graphics();
        this.bossHealthBar.setScrollFactor(0);

        this.bossNameText = this.add.text(x + barWidth / 2, y - 15, bossData.name.toUpperCase(), {
            font: '18px Arial', fill: '#fff'
        }).setOrigin(0.5).setScrollFactor(0);

        this.updateBossHealthBar(); 
    }

    update(time, delta) {
        if (this.gameEnded) { 
            return;
        }

        if (this.player && this.player.active) {
            this.player.update(this.cursors, this.shootKey, this.skillKeys, time);
        } else if (this.player && !this.player.active && !this.gameEnded) {
            console.log("Player not active during game update");
        }

        if (this.boss && this.boss.active) {
            this.boss.update(time, delta);
        }

        this.updateSkillUI(time); 
    }

    updateBossHealthBar() {
        if (!this.boss || !this.boss.active || !this.bossHealthBar || !this.bossHealthBarBg) {
            if (this.bossHealthBarBg) this.bossHealthBarBg.setVisible(false);
            if (this.bossHealthBar) this.bossHealthBar.setVisible(false);
            if (this.bossNameText) this.bossNameText.setVisible(false);
            return;
        }
        
        this.bossHealthBarBg.setVisible(true);
        this.bossHealthBar.setVisible(true);
        this.bossNameText.setVisible(true);


        const barWidth = this.cameras.main.width * 0.6;
        const barHeight = 25;
        const x = this.cameras.main.width / 2 - barWidth / 2;
        const y = 30;

        this.bossHealthBar.clear();
        const healthPercentage = this.boss.currentHp / this.boss.maxHp;
        const currentBarWidth = barWidth * healthPercentage;

        this.bossHealthBar.fillStyle(0xff00ff, 1); 
        this.bossHealthBar.fillRect(x, y, currentBarWidth, barHeight);
    }


    updatePlayerHealthBar() {
        if (!this.player || !this.playerHealthBarBg || !this.playerHealthBar) {
            console.warn("updatePlayerHealthBar: Player or health bar elements missing."); // Décommente pour déboguer si besoin
            return;
        }

        this.playerHealthBarBg.setVisible(this.player.active); 
        this.playerHealthBar.setVisible(this.player.active);
        if (this.playerHealthText) this.playerHealthText.setVisible(this.player.active);


        const barWidth = 200;
        const barHeight = 20;
        const x = 20;
        const y = this.cameras.main.height - 40;

        this.playerHealthBar.clear(); 
        const healthPercentage = Math.max(0, this.player.currentHp) / this.player.maxHp; 
        const currentBarWidth = barWidth * healthPercentage;

        if (healthPercentage > 0.6) {
            this.playerHealthBar.fillStyle(0x00ff00, 1); 
        } else if (healthPercentage > 0.3) {
            this.playerHealthBar.fillStyle(0xffff00, 1); 
        } else {
            this.playerHealthBar.fillStyle(0xff0000, 1); 
        }
        this.playerHealthBar.fillRect(x, y, currentBarWidth, barHeight);

        if (this.playerHealthText && this.playerHealthText.active) {
            const hpText = (this.player) ? `${Math.max(0, Math.ceil(this.player.currentHp))} / ${this.player.maxHp}` : 'HP: --/--';
            if (this.playerHealthText.text !== hpText) {
            this.playerHealthText.setText(hpText);
            }
        } else if (this.playerHealthText && !this.playerHealthText.active) {
            console.warn("updatePlayerHealthBar: playerHealthText exists but is not active.");
        }
    }

    shutdown() {
        console.log("CharacterSelectScene shutdown() EXECUTED.");
        if (this.largeFullBodySprite && this.largeFullBodySprite.active) this.largeFullBodySprite.destroy();
        if (this.characterNameText && this.characterNameText.active) this.characterNameText.destroy();
        if (this.characterDescriptionText && this.characterDescriptionText.active) this.characterDescriptionText.destroy();
        if (this.skillTitleText && this.skillTitleText.active) this.skillTitleText.destroy();
        this.skillTexts.forEach(text => { if (text && text.active) text.destroy(); });
        this.skillTexts = [];
        this.topRowPortraits.forEach(p => { if (p && p.active) p.destroy(); });
        this.topRowPortraits = [];
        if (this.spotlight) this.spotlight.destroy(); 

        this.tweens.killAll(); 

        console.log("CharacterSelectScene: Resetting cameras.");
        this.cameras.resetAll();

        console.log("CharacterSelectScene shutdown completed.");
    }
}
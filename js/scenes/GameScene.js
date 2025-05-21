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
        this.skillTexts = [];
        this.gameData = null;

        this.currentWorldData = null;
        this.currentWaveIndex = -1;
        this.currentWaveData = null;

        this.waveTimer = null; 
        this.survivalWaveActive = false; 
        this.enemiesToKillInWave = 0;
        this.enemiesKilledInWave = 0;

        this.bossSpawned = false; 
    }

    init(data) {
        this.selectedCharacterId = data.characterId || 'leo';
    }

    create() {
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

        this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 30, runChildUpdate: true });
        this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
        this.enemyBullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 50, runChildUpdate: true }); 
        this.bossProjectiles = this.physics.add.group({ defaultKey: 'coffee_cup', maxSize: 50, runChildUpdate: true }); 

        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.playerHitByEnemyBullet, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.playerCollideWithEnemy, null, this);

        this.scoreText = this.add.text(16, 16, 'SCORE: 0', { font: '24px PixelFont', fill: '#fff' });
        this.waveText = this.add.text(this.cameras.main.width - 16, 16, `VAGUE: -`, { font: '24px PixelFont', fill: '#fff' }).setOrigin(1, 0);
        this.createSkillUI();

        this.currentWaveIndex = -1;
        this.boss = null;
        this.bossSpawned = false;
        this.survivalWaveActive = false;
        if (this.waveTimer) this.waveTimer.remove();


        this.startNextWave();
    }

    update(time, delta) {
        if (this.player && this.player.active) {
            this.player.update(this.cursors, this.shootKey, this.skillKeys, time);
        }
        this.updateSkillUI(time);

        if (this.boss && this.boss.active) {
            this.boss.update(time, delta);
        }
    }

    startNextWave() {
        if (this.bossSpawned && this.boss && this.boss.active) { 
            console.log("Boss principal actif, pas de nouvelle vague normale.");
            return;
        }
        this.survivalWaveActive = false; 

        this.currentWaveIndex++;
        if (this.currentWaveIndex >= this.currentWorldData.waves.length) {
            console.log("Toutes les vagues du monde terminées !");
            if(this.player.active) this.player.active = false;
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height/2, "MONDE TERMINE!", {font: '48px PixelFont', fill: '#0f0'}).setOrigin(0.5);
            this.time.delayedCall(3000, () => this.scene.start('MenuScene'));
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
                    enemy.spawn(modifiedConfig, this.player);
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

        let spawnTimerDisplay = this.add.text(this.cameras.main.width / 2, 30, '', { font: '20px PixelFont', fill: '#FFD700' }).setOrigin(0.5);
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
                    if (enemy) enemy.spawn(enemyConfig, this.player);
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

        const bossData = this.gameData.bosses.find(b => b.id === bossIdToSpawn);
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
        if (!bullet.active || !enemy.active) return;
        bullet.setActive(false).setVisible(false);
        const points = enemy.takeHit(this.player.currentBulletDamage);

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

        if (hitSuccess && !bossInstance.active) { 
            this.score += bossInstance.scoreValue || 1000;
            this.scoreText.setText('SCORE: ' + this.score);
            this.boss = null; 
            console.log("Boss vaincu, passage à la vague suivante (ou fin de monde).");
            this.time.delayedCall(1000, this.startNextWave, [], this);
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

    createSkillUI() {
        this.skillTexts = [];
        if (this.playerData && this.playerData.skills) {
            this.playerData.skills.forEach((skill, index) => {
                let keyDisplayName = `SKILL ${index + 1}`;
                const phaserKeyObject = this.skillKeys[index];
                if (phaserKeyObject && typeof phaserKeyObject.key === 'string' && phaserKeyObject.key.length > 0) {
                    keyDisplayName = phaserKeyObject.key.toUpperCase();
                    if (keyDisplayName === " ") keyDisplayName = "SPACE";
                } else if (phaserKeyObject && phaserKeyObject.keyCode) {
                    const keyMap = { 32: 'SPACE', 65: 'A', 69: 'E', 81: 'Q', 87: 'W', 90: 'Z' };
                    if (keyMap[phaserKeyObject.keyCode]) keyDisplayName = keyMap[phaserKeyObject.keyCode];
                }
                let yPos = 50 + index * 30;
                this.skillTexts[index] = this.add.text(16, yPos, `${keyDisplayName}: ${skill.name} (Prêt)`,
                    { font: '18px PixelFont', fill: '#fff' }
                );
            });
        }
    }

    updateSkillUI(time) {
        if (this.player && this.player.skills && this.skillTexts.length > 0) {
            this.player.skills.forEach((skillState, index) => {
                if (this.skillTexts[index] && this.skillKeys[index]) {
                    let keyDisplayName = `SKILL ${index + 1}`;
                    const phaserKeyObject = this.skillKeys[index];
                     if (phaserKeyObject && typeof phaserKeyObject.key === 'string' && phaserKeyObject.key.length > 0) {
                        keyDisplayName = phaserKeyObject.key.toUpperCase();
                        if (keyDisplayName === " ") keyDisplayName = "SPACE";
                    } else if (phaserKeyObject && phaserKeyObject.keyCode) {
                        const keyMap = { 32: 'SPACE', 65: 'A', 69: 'E', 81: 'Q', 87: 'W', 90: 'Z' };
                        if (keyMap[phaserKeyObject.keyCode]) keyDisplayName = keyMap[phaserKeyObject.keyCode];
                    }
                    let statusText = "";
                    if (skillState.isActive) {
                        const remainingDuration = Math.max(0, ( (skillState.activationTime + skillState.duration) - time ) / 1000).toFixed(1);
                        statusText = `Actif: ${remainingDuration}s`;
                        this.skillTexts[index].setFill('#0f0');
                    } else if (time < skillState.lastUsedTime + skillState.cooldown) {
                        const remainingCooldown = Math.max(0, ( (skillState.lastUsedTime + skillState.cooldown) - time ) / 1000).toFixed(1);
                        statusText = `CD: ${remainingCooldown}s`;
                        this.skillTexts[index].setFill('#f00');
                    } else {
                        statusText = "Prêt";
                        this.skillTexts[index].setFill('#fff');
                    }
                    this.skillTexts[index].setText(`${keyDisplayName}: ${skillState.name} (${statusText})`);
                }
            });
        }
    }
}
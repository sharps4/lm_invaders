import Bullet from './Bullet.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, playerData) {
        super(scene, x, y, playerData.spriteKey); 

        this.playerData = playerData; 
        this.scene = scene;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setActive(true); 
        this.setVisible(true);

        this.setCollideWorldBounds(true);
        this.body.setAllowGravity(false);

        this.currentHp = playerData.baseStats.hp;
        this.maxHp = playerData.baseStats.hp;
        this.speed = playerData.baseStats.speed;
        this.shootCooldown = playerData.baseStats.shootCooldown;
        this.lastShotTime = 0;
        this.currentBulletDamage = 10; 

        this.isInvulnerable = false; 
        this.isDashing = false;      
        this.originalSpeed = playerData.baseStats.speed; 
        this.originalShootCooldown = playerData.baseStats.shootCooldown; 
        this.originalScale = this.scale; 

        this.skills = playerData.skills.map(skillData => ({
            ...skillData, 
            lastUsedTime: 0,
            isActive: false,
            activationTime: 0,
        }));

        this.damageReductionFactor = 0; 

        this.upperMoveLimit = this.scene.cameras.main.height / 2;
        this.lowerMoveLimit = this.scene.cameras.main.height - (this.displayHeight / 2) - 10;

        scene.add.existing(this); 

        if (this.scene.updatePlayerHealthBar) { 
            this.scene.updatePlayerHealthBar();
        }
    }

    update(cursors, shootKey, skillKeys, time) {
        // console.log("Player update called. Active:", this.active); 
        if (!this.active) return;

        this.skills.forEach((skill, index) => {
            if (skillKeys[index] && skillKeys[index].isDown) {
                console.log(`Touche pour ${skill.id} pressée. Time: ${time}, LastUsed+CD: ${skill.lastUsedTime + skill.cooldown}, isActive: ${skill.isActive}`);
                if (time > skill.lastUsedTime + skill.cooldown && !skill.isActive) {
                    this.activateSkill(skill, time);
                }
            }
        });

        if (this.isDashing) {
            this.skills.forEach(skill => {
                if (skill.isActive && skill.id === 'dash') {
                    if (time > skill.activationTime + skill.duration) {
                        skill.isActive = false;
                        this.isDashing = false; 
                        this.setVelocity(0); 
                        console.log(`Fin du dash, vitesse réinitialisée.`);
                    }
                }
            });
        } else {
            this.setVelocityX(0);
            if (cursors.left.isDown) this.setVelocityX(-this.speed);
            else if (cursors.right.isDown) this.setVelocityX(this.speed);

            this.setVelocityY(0);
            if (cursors.up.isDown) {
                if (this.y - (this.displayHeight / 2) > this.upperMoveLimit) this.setVelocityY(-this.speed);
                else { this.setVelocityY(0); this.y = this.upperMoveLimit + (this.displayHeight / 2); }
            } else if (cursors.down.isDown) {
                if (this.y + (this.displayHeight / 2) < this.scene.cameras.main.height - 10) this.setVelocityY(this.speed);
                else { this.setVelocityY(0); this.y = this.scene.cameras.main.height - (this.displayHeight / 2) - 10; }
            }
        }


        if (shootKey.isDown && time > this.lastShotTime + this.shootCooldown) {
            this.shoot(time);
        }

        this.skills.forEach((skill, index) => {
            if (skillKeys[index] && skillKeys[index].isDown) {
                if (time > skill.lastUsedTime + skill.cooldown && !skill.isActive) {
                    this.activateSkill(skill, time);
                }
            }
        });
        this.updateActiveSkills(time);
    }

    shoot(time) {
        let bullet = this.scene.bullets.get(this.x, this.y - this.height / 2, this.playerData.bulletSpriteKey);
        if (bullet) {
            bullet.fire(this.x, this.y - this.height / 2, this.currentBulletDamage); 
            this.lastShotTime = time;
        }
    }

    activateSkill(skill, time) {
        console.log(`Activation de la compétence: ${skill.name} (ID: ${skill.id})`);
        this.scene.cameras.main.flash(50, 255, 255, 0);
        this.scene.cameras.main.flash(50, 255, 255, 0);
        skill.lastUsedTime = time;
        skill.isActive = true;
        skill.activationTime = time; 

        switch (skill.id) {
            case 'gif_calin':
                this.scene.enemies.getChildren().forEach(enemy => {
                    if (enemy.active) {
                        enemy.stun(skill.duration);
                    }
                });
                let calinEffect = this.scene.add.text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, 'GIF CALIN!', { font: '60px Arial', fill: '#FF69B4', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
                this.scene.time.delayedCall(1000, () => calinEffect.destroy());
                skill.isActive = false; 
                break;

            case 'analyse':
                skill.isActive = true;
                this.damageReductionFactor = skill.effect.damageReduction;
                this.setTint(0x00ff00); 
                skill.isActive = false;
                break;

            case 'tour_de_piste': 
                skill.isActive = true;
                this.isInvulnerable = true;
                this.isDashing = true;
                const angleToMouse = Phaser.Math.Angle.Between(this.x, this.y, this.scene.input.activePointer.worldX, this.scene.input.activePointer.worldY);
                this.scene.physics.velocityFromRotation(angleToMouse, skill.effect.dashSpeed, this.body.velocity);
                this.setTint(0xFFFF00);
                this.setAlpha(0.7);
                break;

            case 'le_pilote': 
                skill.isActive = true;
                this.shootCooldown = this.originalShootCooldown / skill.effect.fireRateMultiplier;
                // this.setTexture('player_clement_avion'); // Si tu as un sprite d'avion
                this.setTint(0xADD8E6); 
                console.log("Clément - Le Pilote: Nouveau shootCooldown:", this.shootCooldown);
                break;

            case 'cornichon_rosette': 
                let sandwich = this.scene.bullets.get(this.x, this.y - this.height / 2, skill.effect.projectileKey);
                if (sandwich) {
                    sandwich.isSpecialProjectile = true;
                    sandwich.skillEffect = skill.effect; 

                    sandwich.setActive(true).setVisible(true);
                    if(!sandwich.body) this.scene.physics.add.existing(sandwich); 
                    sandwich.body.setAllowGravity(false);
                    let aimAngle = Phaser.Math.DegToRad(-90); 
                    if(this.scene.enemies.countActive(true) > 0) { 
                        let closestEnemy = null;
                        let minDistance = Infinity;
                        this.scene.enemies.getChildren().forEach(enemy => {
                            if (enemy.active) {
                                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    closestEnemy = enemy;
                                }
                            }
                        });
                        if(closestEnemy) aimAngle = Phaser.Math.Angle.Between(this.x, this.y, closestEnemy.x, closestEnemy.y);
                    }
                    this.scene.physics.velocityFromRotation(aimAngle, 400, sandwich.body.velocity);
                }
                skill.isActive = false;
                break;

            case 'l_homme_timide': 
                skill.isActive = true;  
                this.isInvulnerable = true; 
                this.setAlpha(0.2); 
                skill.isActive = false;
                break;

            case 'fiddlesticks': 
                skill.isActive = true;
                this.scene.enemies.getChildren().forEach(enemy => {
                    if (enemy.active) {
                        enemy.stun(skill.duration); // Stun
                        if (typeof enemy.silence === 'function') enemy.silence(skill.duration); 
                        else if (enemy.shootTimer) enemy.shootTimer.paused = true; 
                    }
                });
                this.speed = this.originalSpeed * skill.effect.speedMultiplier;
                this.setScale(this.originalScale * skill.effect.sizeMultiplier);
                this.setTint(0x8B0000); 
                skill.isActive = false;
                break;

            case 'le_cagibi':
                const enemiesToAffect = this.scene.enemies.getChildren().filter(e => e.active);
                if (enemiesToAffect.length > 0) {
                    const isBossNico = (this.scene.boss && this.scene.boss.active && this.scene.boss.bossData.id === 'nico');

                    if (isBossNico) {
                        console.log("Cagibi vs Nico - Le joueur est buffé");
                        this.originalShootCooldownTemp = this.originalShootCooldown;
                        this.shootCooldown = this.originalShootCooldown / (skill.effect.playerFireRateBuffVsNico || 1.7); 
                    } else {
                        const keptEnemyIndex = Phaser.Math.Between(0, enemiesToAffect.length - 1);
                        const keptEnemy = enemiesToAffect[keptEnemyIndex];

                        enemiesToAffect.forEach((enemy) => {
                            if (enemy !== keptEnemy) {
                                enemy.takeHit(enemy.hp * 2); 
                            }
                        });

                        if (keptEnemy && keptEnemy.active) {
                            console.log(`Cagibi: Ennemi gardé: ${keptEnemy.texture.key}`);
                            keptEnemy.becomeCagibiEnraged(skill.effect); 
                        }
                    }
                }
                skill.isActive = false;
                break;

            case 'malveillance': 
                this.scene.enemies.getChildren().forEach(enemy => {
                    if (enemy.active && typeof enemy.applyDoT === 'function') {
                        enemy.applyDoT({
                            damage: skill.effect.dotDamage,
                            duration: skill.effect.dotDuration,
                            ticks: skill.effect.dotTicks,
                            startTime: time
                        });
                    }
                });
                skill.isActive = false;
                break;

            default:
                if (!skill.duration || skill.duration <= 0) { 
                    skill.isActive = false;
                } else {
                    skill.isActive = true; 
                }
                break;
        }
    }

    updateActiveSkills(time) {
        this.skills.forEach(skill => {
            if (skill.isActive) {
                if (time > skill.activationTime + skill.duration) {
                    console.log(`Fin de la compétence: ${skill.name} (ID: ${skill.id})`);
                    skill.isActive = false;
                    switch (skill.id) {
                        case 'analyse': 
                            this.damageReductionFactor = 0;
                            this.clearTint();
                            break;
                        case 'tour_de_piste': 
                            this.isInvulnerable = false;
                            this.isDashing = false;
                            this.setVelocity(0,0); 
                            this.setAlpha(1);
                            break;
                        case 'le_pilote':
                            this.shootCooldown = this.originalShootCooldown;
                            this.clearTint();
                            console.log("Clément - Fin Le Pilote: shootCooldown restauré:", this.shootCooldown);
                            break;
                        case 'l_homme_timide': 
                            this.isInvulnerable = false;
                            this.setAlpha(1);
                            break;
                        case 'fiddlesticks': 
                            this.speed = this.originalSpeed;
                            this.setScale(this.originalScale);
                            this.clearTint();
                            this.scene.enemies.getChildren().forEach(enemy => {
                                if (enemy.shootTimer) enemy.shootTimer.paused = false; 
                            });
                            break;
                        case 'le_cagibi':
                            if (this.scene.boss && this.scene.boss.active && this.scene.boss.bossData.id === 'nico') {
                                if (skill.effect && skill.effect.playerBuffDurationVsNico === skill.duration) {
                                    this.shootCooldown = this.originalShootCooldown;
                                    console.log("Fin du buff de cadence de tir Cagibi vs Nico (via updateActiveSkills)");
                                }
                            }
                            break;
                    }
                }
            }
        });
    }

    takeDamage(amount) {
        if (!this.active) return;

        if (!this.active || this.isInvulnerable) return;

        const actualDamage = amount * (1 - this.damageReductionFactor);
        console.log(`takeDamage called. Amount: ${amount}, ReductionFactor: ${this.damageReductionFactor}`);
        this.currentHp -= actualDamage;
        console.log(`Player took ${actualDamage} damage, HP: ${this.currentHp}`);

        this.scene.cameras.main.flash(100, 255, 0, 0); 
        this.setAlpha(0.5);
        this.scene.time.delayedCall(100, () => {
            this.setAlpha(1);
        });

        if (this.scene.updatePlayerHealthBar) {
            this.scene.updatePlayerHealthBar();
        }

        if (this.currentHp <= 0) {
            this.die();
        }
    }

    die() {
        console.log("Player died!");
        this.setActive(false);
        this.setVisible(false);
        this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            'GAME OVER',
            { font: '64px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setScrollFactor(0);

        if (this.scene.endGameSequence) {
            this.scene.endGameSequence(false);
        } else { 
            this.scene.time.delayedCall(3000, () => {
                this.scene.scene.start('MenuScene');
            });
        }
    }
}
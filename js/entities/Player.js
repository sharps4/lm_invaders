import Bullet from './Bullet.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, playerData) {
        super(scene, x, y, playerData.spriteKey); 

        this.playerData = playerData; 
        this.scene = scene;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setAllowGravity(false);

        this.currentHp = playerData.baseStats.hp;
        this.maxHp = playerData.baseStats.hp;
        this.speed = playerData.baseStats.speed;
        this.shootCooldown = playerData.baseStats.shootCooldown;
        this.lastShotTime = 0;
        this.currentBulletDamage = 10; 

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
        if (!this.active) return;

        this.setVelocityX(0);
        if (cursors.left.isDown) {
            this.setVelocityX(-this.speed);
        } else if (cursors.right.isDown) {
            this.setVelocityX(this.speed);
        }

        this.setVelocityY(0); 
        if (cursors.up.isDown) {
            if (this.y - (this.displayHeight / 2) > this.upperMoveLimit) {
                this.setVelocityY(-this.speed);
            } else {
                this.setVelocityY(0); 
                this.y = this.upperMoveLimit + (this.displayHeight / 2); 
            }
        } else if (cursors.down.isDown) {
             if (this.y + (this.displayHeight / 2) < this.scene.cameras.main.height - 10) { 
                this.setVelocityY(this.speed);
            } else {
                this.setVelocityY(0); 
                this.y = this.scene.cameras.main.height - (this.displayHeight / 2) - 10; 
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
        console.log(`Activation de la compétence: ${skill.name}`);
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
                let calinEffect = this.scene.add.text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, 'GIF CALIN!', { font: '60px PixelFont', fill: '#FF69B4', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
                this.scene.time.delayedCall(1000, () => calinEffect.destroy()); 
                break;

            case 'analyse':
                this.damageReductionFactor = skill.effect.damageReduction;
                this.setTint(0x00ff00); 
                break;
        }
    }

    updateActiveSkills(time) {
        this.skills.forEach(skill => {
            if (skill.isActive) {
                if (time > skill.activationTime + skill.duration) {
                    skill.isActive = false;
                    console.log(`Fin de la compétence: ${skill.name}`);
                    switch (skill.id) {
                        case 'analyse':
                            this.damageReductionFactor = 0;
                            this.clearTint(); 
                            break;
                    }
                }
            }
        });
    }

    takeDamage(amount) {
        if (!this.active) return;

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
        this.scene.add.text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, 'GAME OVER', { font: '64px PixelFont', fill: '#ff0000' }).setOrigin(0.5);
        this.scene.time.delayedCall(3000, () => {
            this.scene.scene.start('MenuScene');
        });
    }
}
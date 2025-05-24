export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'enemy_cliche1') {
        super(scene, x, y, texture);
        this.scene = scene;
        this.enemyData = null;
        this.hp = 1;
        this.speedY = 50;
        this.speedX = 0;
        this.scoreValue = 10;
        this.playerTarget = null;

        this.isStunned = false;
        this.stunTimer = null;

        this.shootTimer = null;
        this.shootCooldown = 2000;
        this.moveTimer = null;
        this.canMove = true;

        this.minYPosition = 50;
        this.maxYPosition = 350; 

        this.originalShootCooldown = 2000;
        this.isSilenced = false;
        this.silenceTimer = null;

        this.activeDoTs = [];

        this.isCagibiEnraged = false; 
        this.originalMaxHp = 20;      
        this.originalContactDamage = 0; 
    }

    spawn(enemyData, player) {
        this.originalMaxHp = enemyData.hp || 20; 
        this.hp = this.originalMaxHp;
        this.originalShootCooldown = enemyData.shootCooldown || Phaser.Math.Between(1500, 3000);
        this.enemyData = enemyData;
        this.isCagibiEnraged = false;
        this.setTexture(enemyData.spriteKey);
        this.hp = enemyData.hp || 20;
        this.speedY = enemyData.speedY || Phaser.Math.Between(40, 80);
        this.speedX = 0; 
         if (enemyData.speedXRange && enemyData.speedXRange.length === 2) {
            this.speedX = Phaser.Math.Between(enemyData.speedXRange[0], enemyData.speedXRange[1]) * (Math.random() < 0.5 ? 1 : -1);
        } else {
            this.speedX = Phaser.Math.Between(50, 100) * (Math.random() < 0.5 ? 1 : -1);
        }

        this.scoreValue = enemyData.scoreValue || 10;
        this.playerTarget = player;
        this.shootCooldown = enemyData.shootCooldown || Phaser.Math.Between(1500, 3000);

        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
             this.maxYPosition = (this.scene.cameras.main.height / 2) + (enemyData.maxYOffset || 50) ;
             this.minYPosition = enemyData.minYOffset || 50;
        }

        if (!this.body) { 
            this.scene.physics.add.existing(this);
        }

        this.clearTint();

        this.originalShootCooldown = enemyData.shootCooldown || Phaser.Math.Between(1500, 3000);
        this.shootCooldown = this.originalShootCooldown;
        if (this.shootTimer) {
            this.shootTimer.delay = this.shootCooldown + Phaser.Math.Between(-500, 500);
        }

        this.body.setAllowGravity(false);
        this.setCollideWorldBounds(true);
        this.body.onWorldBounds = true; 
        this.body.setBounce(1, 0.2); 

        this.setVelocity(this.speedX, this.speedY);
        this.setActive(true);
        this.setVisible(true);
        this.canMove = true;
        this.isStunned = false;
        this.isSilenced = false;
        if (this.silenceTimer) this.silenceTimer.remove();
        if (this.fireRateBuffTimer) this.fireRateBuffTimer.remove(); 

        if (this.stunTimer) this.stunTimer.remove();
        if (this.shootTimer) this.shootTimer.remove(); 
        if (this.moveTimer) this.moveTimer.remove();

        if (this.playerTarget) {
            if (this.shootTimer) {
                console.log(`Enemy ${this.texture.key} removing old shootTimer`);
                this.shootTimer.remove();
            }
            this.shootTimer = this.scene.time.addEvent({
                delay: this.shootCooldown + Phaser.Math.Between(-500, 500),
                callback: this.tryToShoot,
                callbackScope: this,
                loop: true
            });
            console.log(`Enemy ${this.texture.key} shootTimer CREATED. Delay: ${this.shootTimer.delay}, Paused: ${this.shootTimer.paused}`);
            if (this.isSilenced) {
                this.shootTimer.paused = true;
                console.log(`Enemy ${this.texture.key} shootTimer immediately paused due to isSilenced.`);
            }
        }

        this.moveTimer = this.scene.time.addEvent({
            delay: Phaser.Math.Between(1000, 2500),
            callback: this.changeHorizontalMovement,
            callbackScope: this,
            loop: true
        });
        this.changeHorizontalMovement(); 
    }

    becomeCagibiEnraged(cagibiEffect) {
        if (!this.active) return;

        console.log(`Enemy ${this.texture.key} becomes CAGIBI ENRAGED!`);
        this.isCagibiEnraged = true;

        this.hp = Math.ceil(this.originalMaxHp * 1.10);
        console.log(`Cagibi Enraged: HP set to ${this.hp} (original max was ${this.originalMaxHp})`);

        const fireRateMultiplier = cagibiEffect.targetFireRateMultiplier || 1.5;
        this.shootCooldown = this.originalShootCooldown / fireRateMultiplier;
        if (this.shootTimer) {
            this.shootTimer.delay = this.shootCooldown + Phaser.Math.Between(-100, 100); 
        }
        console.log(`Cagibi Enraged: Fire rate increased. New shootCooldown: ${this.shootCooldown}`);

        this.setTint(0xFF0000); 
        this.setScale(1.2); 
    }

    changeHorizontalMovement() {
        if (!this.active || this.isStunned || !this.canMove) return;
        let targetSpeedX = 0;
        if (Math.random() < 0.6 && this.playerTarget && this.y < this.playerTarget.y - 50) { 
            if (this.playerTarget.x < this.x - 10) { 
                targetSpeedX = -(this.enemyData.speedXRange ? Phaser.Math.Between(this.enemyData.speedXRange[0], this.enemyData.speedXRange[1]) : Phaser.Math.Between(40,80));
            } else if (this.playerTarget.x > this.x + 10) {
                targetSpeedX = (this.enemyData.speedXRange ? Phaser.Math.Between(this.enemyData.speedXRange[0], this.enemyData.speedXRange[1]) : Phaser.Math.Between(40,80));
            }
        } else {
            targetSpeedX = Phaser.Math.Between(50, 100) * (Math.random() < 0.5 ? 1 : -1);
        }
        this.speedX = targetSpeedX;
        this.setVelocityX(this.speedX);
    }

    tryToShoot() {
        console.log(`Enemy ${this.texture.key} tryToShoot. Active: ${this.active}, Stunned: ${this.isStunned}, Silenced: ${this.isSilenced}, Player: ${!!this.playerTarget}, Player Active: ${this.playerTarget ? this.playerTarget.active : 'N/A'}`);
        if (!this.active || this.isStunned || this.isSilenced || !this.playerTarget || !this.playerTarget.active) {
            console.log("Condition not met for shooting.");
            return;
        }
        console.log(`Enemy ${this.texture.key} IS SHOOTING NOW.`);

        if (!this.scene.enemyBullets) { 
            console.error("ENEMY SHOOTING: this.scene.enemyBullets group is MISSING!");
            return;
        }

        let bullet = this.scene.enemyBullets.get(this.x, this.y + this.displayHeight / 2);
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            if (!bullet.body) {
                console.log(`Enemy ${this.texture.key}: Bullet has no body, adding physics.`);
                this.scene.physics.add.existing(bullet); 
            } 
            bullet.body.setAllowGravity(false);
            bullet.body.setCircle(bullet.width/2 * 0.8); 
            bullet.damage = this.enemyData.bulletDamage || 5;

            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.playerTarget.x, this.playerTarget.y);
            this.scene.physics.velocityFromRotation(angle, 300 + Phaser.Math.Between(-30, 30), bullet.body.velocity);
        }
    }

    silence(duration) {
        if (!this.active || this.isCagibiEnraged) {
            if(this.isCagibiEnraged) console.log("Cagibi Enraged enemy is immune to silence!");
            return;
        }
        if (!this.active) return;
        console.log(`Enemy ${this.texture.key} silenced for ${duration}ms`);
        this.isSilenced = true;
        if (this.shootTimer) {
            this.shootTimer.paused = true;
        }
        this.setTint(0xAAAAFF); 

        if (this.silenceTimer) this.silenceTimer.remove();
        this.silenceTimer = this.scene.time.delayedCall(duration, () => {
            if (this.active) {
                this.isSilenced = false;
                if (this.shootTimer) {
                    this.shootTimer.paused = false;
                }
                // if (!this.isStunned) this.clearTint(); // Ne pas effacer la teinte du stun
                // else this.setTint(0xffff00); // Rétablir la teinte de stun
                console.log(`Enemy ${this.texture.key} silence ended.`);
            }
        }, [], this);
    }

    setFireRateMultiplier(multiplier, duration) {
        if (!this.active) return;
        console.log(`Enemy ${this.texture.key} fire rate multiplied by ${multiplier} for ${duration}ms`);

        this.shootCooldown = this.originalShootCooldown / multiplier;
        if (this.shootTimer) {
            this.shootTimer.delay = this.shootCooldown + Phaser.Math.Between(-200, 200); 
        }
        this.setTint(0xFF8888); 

        if (this.fireRateBuffTimer) this.fireRateBuffTimer.remove();
        this.fireRateBuffTimer = this.scene.time.delayedCall(duration, () => {
            if (this.active) {
                this.shootCooldown = this.originalShootCooldown; 
                if (this.shootTimer) {
                    this.shootTimer.delay = this.shootCooldown + Phaser.Math.Between(-500, 500);
                }
                // if (!this.isStunned && !this.isSilenced) this.clearTint();
                // else if (this.isStunned) this.setTint(0xffff00);
                // else if (this.isSilenced) this.setTint(0xAAAAFF);
                console.log(`Enemy ${this.texture.key} fire rate buff ended.`);
            }
        }, [], this);
    }

    takeHit(damage = 1, isDotDamage = false) {
        if (!this.active) return 0;
        this.hp -= damage;

        if (isDotDamage) { 
            this.scene.tweens.add({
                targets: this,
                alpha: 0.5,
                duration: 50,
                yoyo: true,
                repeat: 0
            });
         }

         if (isDotDamage && this.hp > 0) {
             this.scene.tweens.add({
                targets: this, tint: 0xff00ff, 
                duration: 80, yoyo: true, repeat: 0,
                onComplete: () => {
                    if (this.active && !this.isStunned && !this.isSilenced) this.clearTint(); 
                    else if (this.active && this.isStunned) this.setTint(0xffff00);
                    else if (this.active && this.isSilenced) this.setTint(0xAAAAFF);
                }
            });
        }

        if (this.hp <= 0) {
            this.setActive(false);
            this.setVisible(false);
            if (this.shootTimer) this.shootTimer.remove();
            if (this.moveTimer) this.moveTimer.remove();
            if (this.stunTimer) this.stunTimer.remove();
            if (this.silenceTimer) this.silenceTimer.remove();
            if (this.fireRateBuffTimer) this.fireRateBuffTimer.remove();
            this.activeDoTs = []; 
            if (this.isCagibiEnraged) this.setScale(this.originalScale || 1);

            return this.scoreValue;                
        } else {
            if (!isDotDamage) {
                this.scene.tweens.add({
                    targets: this, alpha: 0.5, duration: 60, yoyo: true, repeat: 0
                });
            }
            return 0; 
        }
    }

    stun(duration) {
        if (!this.active || this.isCagibiEnraged) { 
            if(this.isCagibiEnraged) console.log("Cagibi Enraged enemy is immune to stun!");
            return;
        }
        if (!this.active) return;
        this.isStunned = true;
        this.canMove = false;
        this.setVelocity(0, 0);
        this.setTint(0xffff00);

        if (this.shootTimer) this.shootTimer.paused = true;
        if (this.moveTimer) this.moveTimer.paused = true;

        if (this.silenceTimer && this.isSilenced) this.silenceTimer.paused = true; 
        if (this.fireRateBuffTimer) this.fireRateBuffTimer.paused = true; 

        if (this.stunTimer) this.stunTimer.remove();
        this.stunTimer = this.scene.time.delayedCall(duration, () => {
            if (this.active) {
                this.isStunned = false;
                this.canMove = true;
                this.clearTint();
                if(this.body) this.setVelocity(this.speedX, this.speedY);

                if (this.shootTimer && !this.isSilenced) this.shootTimer.paused = false;
                if (this.moveTimer) this.moveTimer.paused = false;
                if (this.silenceTimer && this.isSilenced) this.silenceTimer.paused = false;
                if (this.fireRateBuffTimer) this.fireRateBuffTimer.paused = false;

                if (this.isSilenced) this.setTint(0xAAAAFF); 
            }
        }, [], this);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        if (this.isStunned) {
            this.setVelocity(0,0); 
            return;
        }

        if (this.y >= this.maxYPosition && this.body.velocity.y > 0) {
            this.setVelocityY(-Math.abs(this.speedY) * Phaser.Math.FloatBetween(0.4, 0.7)); 
            this.changeHorizontalMovement(); 
            if(this.moveTimer) this.moveTimer.reset({ delay: Phaser.Math.Between(300, 1000), callback: this.changeHorizontalMovement, callbackScope: this, loop: true });

        } else if (this.y <= this.minYPosition && this.body.velocity.y < 0) {
            this.setVelocityY(Math.abs(this.speedY)); 
        }

        if (this.body.onWorldBounds) {
            if (this.x <= this.width / 2 && this.body.velocity.x < 0) {
                this.speedX = Math.abs(this.speedX || 50); 
                this.setVelocityX(this.speedX);
            } else if (this.x >= this.scene.cameras.main.width - this.width / 2 && this.body.velocity.x > 0) {
                this.speedX = -Math.abs(this.speedX || 50);
                this.setVelocityX(this.speedX);
            }
        }

        if (this.y > this.scene.cameras.main.height + this.height + 20) { 
            this.setActive(false);
            this.setVisible(false);
            if (this.shootTimer) this.shootTimer.remove();
            if (this.moveTimer) this.moveTimer.remove();
            if (this.stunTimer) this.stunTimer.remove();
        }

        if (this.activeDoTs.length > 0) {
            for (let i = this.activeDoTs.length - 1; i >= 0; i--) {
                const dot = this.activeDoTs[i];
                if (time > dot.startTime + dot.duration) {
                    this.activeDoTs.splice(i, 1); 
                    continue;
                }

                const tickInterval = dot.duration / Math.max(1, dot.ticks); 
                if (time > dot.lastTickTime + tickInterval) {
                    const diedFromDot = this.takeHit(dot.damage, true); 
                    dot.lastTickTime = time;

                    if (diedFromDot > 0 && this.scene && typeof this.scene.checkWaveCompletion === 'function') {
                        console.log("Enemy died from DoT, checking wave completion.");
                        this.scene.checkWaveCompletion(false);
                    }
                }
            }
        }
    }

    applyDoT(dotEffect) { 
        this.activeDoTs.push({...dotEffect, lastTickTime: dotEffect.startTime});
    }
}
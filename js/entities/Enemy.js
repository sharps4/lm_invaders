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
    }

    spawn(enemyData, player) {
        this.enemyData = enemyData;
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
        this.body.setAllowGravity(false);
        this.setCollideWorldBounds(true);
        this.body.onWorldBounds = true; 
        this.body.setBounce(1, 0.2); 

        this.setVelocity(this.speedX, this.speedY);
        this.setActive(true);
        this.setVisible(true);
        this.canMove = true;
        this.isStunned = false;

        if (this.stunTimer) this.stunTimer.remove();
        if (this.shootTimer) this.shootTimer.remove(); 
        if (this.moveTimer) this.moveTimer.remove();

        if (this.playerTarget) {
            this.shootTimer = this.scene.time.addEvent({
                delay: this.shootCooldown + Phaser.Math.Between(-500, 500), 
                callback: this.tryToShoot,
                callbackScope: this,
                loop: true
            });
        }

        this.moveTimer = this.scene.time.addEvent({
            delay: Phaser.Math.Between(1000, 2500),
            callback: this.changeHorizontalMovement,
            callbackScope: this,
            loop: true
        });
        this.changeHorizontalMovement(); 
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
        if (!this.active || this.isStunned || !this.playerTarget || !this.playerTarget.active) return;

        let bullet = this.scene.enemyBullets.get(this.x, this.y + this.height / 2, 'bullet');
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            if(!bullet.body) this.scene.physics.add.existing(bullet); 
            bullet.body.setAllowGravity(false);
            bullet.body.setCircle(bullet.width/2 * 0.8); 
            bullet.damage = this.enemyData.bulletDamage || 5;

            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.playerTarget.x, this.playerTarget.y);
            this.scene.physics.velocityFromRotation(angle, 300 + Phaser.Math.Between(-30, 30), bullet.body.velocity);
        }
    }

    takeHit(damage = 1) {
        if (!this.active) return 0;
        this.hp -= damage;
        if (this.hp <= 0) {
            this.setActive(false);
            this.setVisible(false);
            if (this.shootTimer) this.shootTimer.remove();
            if (this.moveTimer) this.moveTimer.remove();
            if (this.stunTimer) this.stunTimer.remove();
            return this.scoreValue;
        } else {
            this.scene.tweens.add({ targets: this, alpha: 0.5, duration: 60, yoyo: true, repeat: 0 });
            return 0;
        }
    }

    stun(duration) {
        if (!this.active) return;
        this.isStunned = true;
        this.canMove = false;
        this.setVelocity(0, 0);
        this.setTint(0xffff00);

        if (this.shootTimer) this.shootTimer.paused = true;
        if (this.moveTimer) this.moveTimer.paused = true;

        if (this.stunTimer) this.stunTimer.remove();
        this.stunTimer = this.scene.time.delayedCall(duration, () => {
            if (this.active) { 
                this.isStunned = false;
                this.canMove = true;
                this.clearTint();
                if(this.body) this.setVelocity(this.speedX, this.speedY);
                if (this.shootTimer) this.shootTimer.paused = false;
                if (this.moveTimer) this.moveTimer.paused = false;
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
            this.setVelocityY(Math.abs(this.speedY)); // Redescend
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
    }
}
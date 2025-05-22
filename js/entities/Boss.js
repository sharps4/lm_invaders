import Player from './Player.js';

export default class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, bossData, projectileGroup) {
        super(scene, x, y, bossData.spriteKey || 'boss_clementine');
        this.scene = scene;
        this.bossData = bossData;
        this.projectileGroup = projectileGroup; 

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setAllowGravity(false);
        this.setCollideWorldBounds(true);
        this.setImmovable(true); 

        this.currentHp = bossData.hp || 500;
        this.maxHp = bossData.hp || 500;
        this.scoreValue = bossData.scoreValue || 1000;

        this.setActive(true);
        this.setVisible(true);

        this.activeAttacks = []; 

        this.playerTarget = this.scene.player; 

        this.movementData = bossData.movement; 
        this.movementSpeed = this.movementData?.speed || 80;
        this.patrolDirection = 1;
        this.patrolOriginX = x;
        this.nextMoveTime = 0; 

        this.setupMovement();

        if (bossData.attacks && Array.isArray(bossData.attacks)) {
            this.activeAttacks = bossData.attacks.map(attack => ({
                ...attack,
                lastUsedTime: 0 
            }));
        } else {
            this.activeAttacks = [];
            console.warn(`Boss ${this.bossData.name} n'a pas d'attaques définies dans gameData.json!`);
        }
        console.log(`${this.bossData.name} active attacks:`, this.activeAttacks);

        if (this.projectileGroup && this.playerTarget) {
            if (!this.scene.physics.world.colliders.getActive().find(c => c.object1 === this.projectileGroup && c.object2 === this.playerTarget)) {
                this.scene.physics.add.overlap(this.projectileGroup, this.playerTarget, this.projectileHitPlayer, null, this);
            }
        }
        console.log(`Boss ${this.bossData.name} initialisé. HP: ${this.currentHp}.`);
    }

    setupMovement() {
        this.patrolOriginX = this.x; 
        this.nextMoveTime = 0; 
        this.setVelocity(0,0); 

        if (!this.movementData) return;

        switch (this.movementData.type) {
            case 'patrol_horizontal':
                this.setVelocityX(this.movementSpeed * this.patrolDirection);
                break;
            
            case 'random_burst':
            case 'random_burst_aggressive':
                
                break;
        }
    }

    update(time, delta) {
        if (!this.active) return;

        this.updateMovement(time);
        this.tryToUseSkills(time);
    }

    updateMovement(time) {
        if (!this.movementData || !this.active) {
            this.setVelocity(0,0); 
            return;
        }

        switch (this.movementData.type) {
            case 'patrol_horizontal':
                const patrolDist = this.movementData.patrolDistance || 200;
                if (this.patrolDirection === 1 && this.x >= this.patrolOriginX + patrolDist / 2) {
                    this.patrolDirection = -1;
                    this.setVelocityX(this.movementSpeed * this.patrolDirection);
                } else if (this.patrolDirection === -1 && this.x <= this.patrolOriginX - patrolDist / 2) {
                    this.patrolDirection = 1;
                    this.setVelocityX(this.movementSpeed * this.patrolDirection);
                }
                 
                if ((this.x < this.width / 2 && this.body.velocity.x < 0) || (this.x > this.scene.cameras.main.width - this.width / 2 && this.body.velocity.x > 0)) {
                    this.patrolDirection *= -1;
                    this.setVelocityX(this.movementSpeed * this.patrolDirection);
                }
                break;

            case 'random_burst':
            case 'random_burst_aggressive':
                if (time > this.nextMoveTime) {
                    if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) { 
                        this.setVelocity(0, 0);
                        this.nextMoveTime = time + (this.movementData.pauseDuration || 1000);
                    } else { 
                        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                        let speed = this.movementSpeed;
                        if(this.movementData.type === 'random_burst_aggressive' && this.playerTarget){
                            
                            const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.playerTarget.x, this.playerTarget.y);
                            
                            const finalAngle = Phaser.Math.Angle.RotateTo(angle, angleToPlayer, Phaser.Math.DegToRad(45)); 
                            this.scene.physics.velocityFromRotation(finalAngle, speed, this.body.velocity);
                        } else {
                            this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
                        }
                        this.nextMoveTime = time + (this.movementData.burstDuration || 500);
                    }
                }
                break;
        }
    }

    tryToUseSkills(time) {
        if (!this.active || !this.activeAttacks || this.activeAttacks.length === 0) {
            console.log("Boss not active or no attacks defined, skipping skills.");
            return;
        }
        console.log(`Boss trying to use skills at time: ${time}`);

        this.activeAttacks.forEach(attack => {
            console.log(`Checking attack: ${attack.id}, LastUsed: ${attack.lastUsedTime}, Cooldown: ${attack.cooldown}, Ready in: ${ (attack.lastUsedTime + attack.cooldown) - time }`);
            if (time > attack.lastUsedTime + attack.cooldown) {
                console.log(`Attempting to perform skill: ${attack.id}`);
                this.performSkill(attack, time);
                attack.lastUsedTime = time;
            }
        });
    }

    performSkill(attackData, time) {
        console.log(`${this.bossData.name} utilise ${attackData.name || attackData.id}!`);

        switch (attackData.type) {
            case 'projectile_spray':
                const count = attackData.projectileCount || 5;
                const spread = Phaser.Math.DegToRad(attackData.spreadAngle || 60);
                const angleBetween = spread / Math.max(1, count - 1);
                let baseAngleToPlayer = 0;
                if (this.playerTarget) {
                     baseAngleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.playerTarget.x, this.playerTarget.y);
                } else {
                    baseAngleToPlayer = Phaser.Math.DegToRad(-90); 
                }


                for (let i = 0; i < count; i++) {
                    let projectile = this.projectileGroup.get(this.x, this.y, attackData.projectileSpriteKey);
                    if (projectile) {
                        projectile.setActive(true).setVisible(true);
                        if(!projectile.body) this.scene.physics.add.existing(projectile);
                        projectile.body.setAllowGravity(false);
                        projectile.body.setCircle(projectile.width * 0.4); 
                        projectile.damage = attackData.damage || 10;

                        const currentAngle = baseAngleToPlayer - spread / 2 + i * angleBetween;
                        this.scene.physics.velocityFromRotation(currentAngle, attackData.projectileSpeed || 250, projectile.body.velocity);
                    }
                }
                break;

            case 'special_projectile_large':
                let largeProjectile = this.projectileGroup.get(this.x, this.y, attackData.projectileSpriteKey);
                if (largeProjectile) {
                    largeProjectile.setActive(true).setVisible(true);
                    if(!largeProjectile.body) this.scene.physics.add.existing(largeProjectile);
                    largeProjectile.body.setAllowGravity(false);
                    largeProjectile.body.setSize(largeProjectile.width * 0.8, largeProjectile.height * 0.8); 
                    largeProjectile.damage = attackData.damage || 30;

                    let angleToPlayer = Phaser.Math.DegToRad(-90); 
                    if (this.playerTarget) {
                        angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.playerTarget.x, this.playerTarget.y);
                    }
                    this.scene.physics.velocityFromRotation(angleToPlayer, attackData.projectileSpeed || 150, largeProjectile.body.velocity);
                }
                break;
            
            case 'projectile_barrage':
                const barrageCount = attackData.barrageCount || 3;
                const barrageDelay = attackData.barrageDelay || 300;
                for(let b=0; b < barrageCount; b++){
                    this.scene.time.delayedCall(b * barrageDelay, () => {
                        if(!this.active) return; 
                        const numProj = attackData.projectileCount || 3;
                        for (let i = 0; i < numProj; i++) {
                            let p = this.projectileGroup.get(this.x + Phaser.Math.Between(-20,20), this.y, attackData.projectileSpriteKey);
                            if(p){
                                p.setActive(true).setVisible(true);
                                if(!p.body) this.scene.physics.add.existing(p);
                                p.body.setAllowGravity(false);
                                p.body.setCircle(p.width * 0.4);
                                p.damage = attackData.damage || 8;
                                let angleToPlayer = Phaser.Math.DegToRad(-90);
                                if (this.playerTarget) {
                                    angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.playerTarget.x, this.playerTarget.y);
                                }
                                
                                const finalAngle = angleToPlayer + Phaser.Math.DegToRad(Phaser.Math.Between(-10, 10));
                                this.scene.physics.velocityFromRotation(finalAngle, attackData.projectileSpeed || 300, p.body.velocity);
                            }
                        }
                    }, [], this);
                }
                break;

            
        }
    }

    projectileHitPlayer(obj1, obj2) { 
        let actualPlayer;
        let actualProjectile;

        
        
        if (obj1 instanceof Player) { 
            actualPlayer = obj1;
            actualProjectile = obj2;
        } else if (obj2 instanceof Player) { 
            actualPlayer = obj2;
            actualProjectile = obj1;
        } else {
            
            
            console.error("Collision error: Neither object is an instance of Player!", obj1, obj2);
            
            
            return; 
        }

        if (!actualPlayer || !actualProjectile) {
            console.error("Could not identify player or projectile in collision.", obj1, obj2);
            return;
        }

        if (!actualPlayer.active || !actualProjectile.active) {
            
            return;
        }
        
        actualPlayer.takeDamage(actualProjectile.damage || 5); 

        actualProjectile.setActive(false).setVisible(false);
        
    }

    takeHit(damage) {
        if (!this.active) return false;
        this.currentHp -= damage;
        console.log(`Boss ${this.bossData.name} HP: ${this.currentHp}/${this.maxHp}`);

        this.scene.tweens.add({
            targets: this, alpha: 0.7, duration: 80, yoyo: true,
            onComplete: () => { if(this.active) this.setAlpha(1); }
        });

        if (this.currentHp <= 0) {
            this.die();
            return true;
        }
        return true;
    }

    die() {
        console.log(`Boss ${this.bossData.name} vaincu!`);
        this.setActive(false);
        this.setVisible(false);
        this.setVelocity(0,0); 

        if (this.projectileGroup) {
            this.projectileGroup.getChildren().forEach(proj => {
                if(proj.active) proj.setActive(false).setVisible(false);
            });
        }
        
    }
}

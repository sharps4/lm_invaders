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

        this.actionDecisionCooldown = Phaser.Math.Between(1500, 3000);
        this.nextActionDecisionTime = 0;

        this.movementData = bossData.movement;
        this.baseMovementSpeed = this.movementData?.baseSpeed || 60; 
        this.minYBoss = 50;
        const approxSpriteHeight = 64; 
        this.maxYBoss = scene.cameras.main.height / 2 - (this.height || approxSpriteHeight) / 2 - 20;

        this.isBursting = false;
        this.burstEndTime = 0;
        this.lastBurstTime = 0;

        this.nextPatrolMoveTime = 0; 
        this.currentPatrolTarget = new Phaser.Math.Vector2(this.x, this.y); 
        this.patrolDirectionX = (Math.random() < 0.5 ? 1 : -1); 

        if (bossData.attacks && Array.isArray(bossData.attacks)) {
            this.activeAttacks = bossData.attacks.map(attack => ({ ...attack, lastUsedTime: 0 }));
        } else {
            console.warn(`Boss ${this.bossData.name} n'a pas d'attaques définies.`);
        }

        if (this.projectileGroup && this.playerTarget) {
            if (!this.scene.physics.world.colliders.getActive().find(c => c.object1 === this.projectileGroup && c.object2 === this.playerTarget)) {
                this.scene.physics.add.overlap(this.projectileGroup, this.playerTarget, this.projectileHitPlayer, null, this);
            }
        }
        console.log(`Boss ${this.bossData.name} initialisé. HP: ${this.currentHp}.`);
    }

    update(time, delta) {
        if (!this.active) return;

        if (this.displayHeight > 0 && this.maxYBoss < this.minYBoss + this.displayHeight) { 
             this.maxYBoss = this.scene.cameras.main.height / 2 - this.displayHeight / 2 - 20;
        }

        this.updateMovement(time, delta);

        if (time > this.nextActionDecisionTime) {
            this.decideAndUseSkill(time);
            this.nextActionDecisionTime = time + this.actionDecisionCooldown;
            this.actionDecisionCooldown = Phaser.Math.Between(1500, 4000);
        }
    }

    updateMovement(time, delta) {
        if (!this.movementData || !this.active) {
            this.setVelocity(0, 0);
            return;
        }

        if (this.isBursting) {
            if (time > this.burstEndTime) {
                this.isBursting = false;
                this.setVelocity(0, 0);
                this.nextPatrolMoveTime = time; 
            }
            this.constrainToMovementArea();
            return;
        }

        const burstConfig = this.movementData.burst;
        if (burstConfig && time > this.lastBurstTime + (burstConfig.cooldown || 2500)) {
            const chanceToBurstThisFrame = (burstConfig.chancePerSecond || 0.1) * (delta / 1000);
            if (Math.random() < chanceToBurstThisFrame) {
                this.initiateBurst(time, burstConfig);
                return; 
            }
        }

        if (this.movementData.type === 'dynamic_patrol_burst' || this.movementData.type === 'patrol_horizontal') {
            if (time > this.nextPatrolMoveTime) {
                if (this.movementData.type === 'dynamic_patrol_burst' && this.movementData.patrolArea) {
                    const patrolAreaWidth = this.movementData.patrolArea.width || this.scene.cameras.main.width * 0.7;
                    const patrolAreaHeight = this.movementData.patrolArea.height || (this.maxYBoss - this.minYBoss) * 0.8;
                    const centerX = this.scene.cameras.main.width / 2;
                    const centerY = this.minYBoss + (this.maxYBoss - this.minYBoss) / 2;

                    this.currentPatrolTarget.x = Phaser.Math.Clamp(
                        centerX + Phaser.Math.FloatBetween(-patrolAreaWidth / 2, patrolAreaWidth / 2),
                        this.displayWidth / 2 + 10, this.scene.cameras.main.width - this.displayWidth / 2 - 10
                    );
                    this.currentPatrolTarget.y = Phaser.Math.Clamp(
                        centerY + Phaser.Math.FloatBetween(-patrolAreaHeight / 2, patrolAreaHeight / 2),
                        this.minYBoss, this.maxYBoss
                    );
                } else { // Simple patrouille horizontale
                    const patrolDistance = this.movementData.patrolDistance || 200;
                    if ((this.patrolDirectionX === 1 && this.x >= (this.xInitial || this.x) + patrolDistance / 2) ||
                        (this.patrolDirectionX === -1 && this.x <= (this.xInitial || this.x) - patrolDistance / 2) ||
                        (this.x <= this.displayWidth / 2 && this.patrolDirectionX === -1) ||
                        (this.x >= this.scene.cameras.main.width - this.displayWidth/2 && this.patrolDirectionX === 1) ) {
                        this.patrolDirectionX *= -1;
                    }
                     this.currentPatrolTarget.x = this.x + this.patrolDirectionX * 100; 
                     this.currentPatrolTarget.y = this.y; 
                }
                this.nextPatrolMoveTime = time + Phaser.Math.Between(2000, 4000); 
            }

            this.scene.physics.moveToObject(this, this.currentPatrolTarget, this.baseMovementSpeed);

            if (Phaser.Math.Distance.Between(this.x, this.y, this.currentPatrolTarget.x, this.currentPatrolTarget.y) < this.baseMovementSpeed * (delta / 1000) * 2) {
                this.setVelocity(0, 0);
                this.nextPatrolMoveTime = time; 
            }

        } else if (this.movementData.type === 'random_burst' || this.movementData.type === 'random_burst_aggressive') {
            if (time > this.nextMoveTime) { 
                 if (this.body.velocity.x === 0 && this.body.velocity.y === 0) { 
                    this.initiateBurst(time, {
                        speed: this.movementData.speed || this.baseMovementSpeed * 2, 
                        durationMin: this.movementData.burstDuration || 300,
                        durationMax: this.movementData.burstDuration || 600,
                        targetPlayerChance: (this.movementData.type === 'random_burst_aggressive' ? 0.8 : 0.1) 
                    });
                    this.nextMoveTime = this.burstEndTime + (this.movementData.pauseDuration || 1000);
                 }
            }
        }
        this.constrainToMovementArea();
    }

    initiateBurst(time, burstConfig) {
        this.isBursting = true;
        this.lastBurstTime = time; 

        let angle;
        const burstSpeed = burstConfig.speed || 350;
        const burstDuration = Phaser.Math.Between(burstConfig.durationMin || 200, burstConfig.durationMax || 500);
        this.burstEndTime = time + burstDuration;

        if (this.playerTarget && this.playerTarget.active && Math.random() < (burstConfig.targetPlayerChance || 0.6)) {
            angle = Phaser.Math.Angle.Between(this.x, this.y, this.playerTarget.x, this.playerTarget.y);
        } else {
            angle = Phaser.Math.FloatBetween(0, Math.PI * 2); 
        }

        let endX = this.x + Math.cos(angle) * burstSpeed * (burstDuration / 1000);
        let endY = this.y + Math.sin(angle) * burstSpeed * (burstDuration / 1000);

        let adjustedAngle = angle;
        let bounced = false;

        if (endX < this.displayWidth / 2) {
            adjustedAngle = Math.PI - angle; 
            bounced = true;
        } else if (endX > this.scene.cameras.main.width - this.displayWidth / 2) {
            adjustedAngle = Math.PI - angle; 
            bounced = true;
        }

        adjustedAngle = Phaser.Math.Angle.Wrap(adjustedAngle);

        endY = this.y + Math.sin(adjustedAngle) * burstSpeed * (burstDuration / 1000); 
        if (endY < this.minYBoss) {
            adjustedAngle = -adjustedAngle; 
            bounced = true;
        } else if (endY > this.maxYBoss) {
            adjustedAngle = -adjustedAngle; 
            bounced = true;
        }
        adjustedAngle = Phaser.Math.Angle.Wrap(adjustedAngle);


        console.log(`Boss initiates burst. Original Angle: ${Phaser.Math.RadToDeg(angle).toFixed(0)}, Adjusted Angle: ${Phaser.Math.RadToDeg(adjustedAngle).toFixed(0)}, Bounced: ${bounced}`);
        this.scene.physics.velocityFromRotation(adjustedAngle, burstSpeed, this.body.velocity);

        this.scene.time.delayedCall(burstDuration, () => {
            if (this.active && this.isBursting) {
                this.setVelocity(0, 0);
                this.isBursting = false;
                this.nextPatrolMoveTime = this.scene.time.now;
            }
        }, [], this);
    }
    
    constrainToMovementArea() {
        let constrained = false;
        if (this.x < this.displayWidth / 2) { this.x = this.displayWidth / 2; if(this.body.velocity.x < 0) this.body.velocity.x *= -0.5; constrained = true;}
        if (this.x > this.scene.cameras.main.width - this.displayWidth / 2) { this.x = this.scene.cameras.main.width - this.displayWidth / 2; if(this.body.velocity.x > 0) this.body.velocity.x *= -0.5; constrained = true;}
        if (this.y < this.minYBoss) { this.y = this.minYBoss; if(this.body.velocity.y < 0) this.body.velocity.y *= -0.5; constrained = true;}
        if (this.y > this.maxYBoss) { this.y = this.maxYBoss; if(this.body.velocity.y > 0) this.body.velocity.y *= -0.5; constrained = true;}
        
        if (constrained && this.isBursting) {
            this.isBursting = false; 
            this.setVelocity(0,0);
            this.nextPatrolMoveTime = this.scene.time.now;
        }
    }

    decideAndUseSkill(time) {
        if (!this.active || !this.activeAttacks || this.activeAttacks.length === 0) {
            return;
        }
        const readySkills = this.activeAttacks.filter(attack => time > attack.lastUsedTime + attack.cooldown);

        if (readySkills.length === 0) {
            return;
        }
        let totalWeight = readySkills.reduce((sum, skill) => sum + (skill.weight || 1), 0); 
        let randomPick = Math.random() * totalWeight;
        let skillToUse = null;

        for (let skill of readySkills) {
            randomPick -= (skill.weight || 1);
            if (randomPick <= 0) {
                skillToUse = skill;
                break;
            }
        }
        if (!skillToUse && readySkills.length > 0) {
             skillToUse = readySkills[Phaser.Math.Between(0, readySkills.length - 1)]; 
        }
        if (skillToUse) {
            console.log(`Boss decided to use skill (weighted): ${skillToUse.id}`);
            this.performSkill(skillToUse, time);

            const originalSkill = this.activeAttacks.find(s => s.id === skillToUse.id);
            if (originalSkill) {
                originalSkill.lastUsedTime = time;
            }
        }
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

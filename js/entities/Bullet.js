export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'bullet_leo') { 
        super(scene, x, y, texture);
        this.damage = 10; 
    }

    fire(x, y, damage = 10, textureKey) {
        if (textureKey) this.setTexture(textureKey); 
        this.damage = damage;
        this.setPosition(x, y);
        this.setVelocityY(-600);
        this.setActive(true);
        this.setVisible(true);
        this.body.setAllowGravity(false); 
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.y < -this.height) { 
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
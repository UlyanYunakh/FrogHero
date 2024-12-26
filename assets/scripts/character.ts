import { CharacterEvent } from "./eventTypes";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Character extends cc.Component {
    @property
    movementSpeed: number = 50;

    private input: cc.Vec2 = new cc.Vec2();

    private targetPosition: cc.Vec3 = new cc.Vec3();

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start () {
        this.node.zIndex = 1; // to make visible when falling near platform
    }

    update (deltaTime: number): void {
        this.movementUpdate(deltaTime);

        if (this.input.len() !== 0) {
            const rigidbody = this.node.getComponent(cc.RigidBody);
            
            if (rigidbody.linearVelocity.y < -1) { // looks like it's posible for linearVelocity.y be negative 0
                this.input = new cc.Vec2();
                this.node.getComponent(cc.Animation).play("fall");
                this.node.emit(CharacterEvent.OnFallingState);
                this.node.getComponent(cc.AudioSource).play();
            }

            if (this.node.position.x >= this.targetPosition.x) {
                this.input = new cc.Vec2();
                this.node.position = this.targetPosition;
                this.node.getComponent(cc.Animation).play("idle");
                this.node.emit(CharacterEvent.OnTargetPosition);
            }
        }
    }

    movementUpdate(deltaTime: number): void {
        const { position: newPosition } = this.node;

        newPosition.x += this.input.x * this.movementSpeed * deltaTime;
        newPosition.y += this.input.y * this.movementSpeed * deltaTime;

        this.node.position = newPosition;
    }

    public startMovement(endPos: cc.Vec3): void {
        this.input = new cc.Vec2(1, 0);
        this.targetPosition = endPos;

        this.node.getComponent(cc.Animation).play("run");
    }
}

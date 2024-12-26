import { randInRange } from "./helpers";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Platform extends cc.Component {

    @property
    randomizeWidth: boolean = true;

    @property({ visible(this: Platform) { return this.randomizeWidth; } })
    minWidth: number = 10;

    @property({ visible(this: Platform) { return this.randomizeWidth; } })
    maxWidth: number = 150;

    onLoad () {
        this.node.zIndex = 0;
    }

    getUpperLeftCornerPosition(): cc.Vec3 {
        const { position, width } = this.node;
        
        position.x += width / 2;

        return position;
    }

    protected onEnable(): void {
        if (this.randomizeWidth) {
            const newWidth = randInRange(this.minWidth, this.maxWidth);
            this.node.width = newWidth;
            this.applyColliderChanges();
        }
    }

    // update (dt) {}

    public enableCollision(enable: boolean): void {
        this.node.getComponent(cc.RigidBody).active = enable;
    }

    private applyColliderChanges(): void {
        const collider = this.node.getComponent(cc.PhysicsBoxCollider);

        const { position: nodePos, width: nodeWidth, height: nodeHeight } = this.node;
        const { offset } = collider;

        collider.size = new cc.Size(nodeWidth, nodeHeight);
        collider.offset = new cc.Vec2(nodeWidth / 2, -nodeHeight / 2);
        collider.apply();
    }
}

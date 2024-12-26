import { BridgeEvent } from "./eventTypes.js";
import { lerp, clamp } from "./helpers.js";

const {ccclass, property} = cc._decorator;

enum BridgeMode {
    None = 0,
    Build,
    Fall,
}

@ccclass
export default class Bridge extends cc.Component {
    @property
    maxLenght: number = 60;

    @property
    buildingSpeed: number = 10;
    
    @property({ displayName: "FallingTime (in seconds)" })
    fallingTime: number = 10;

    private _mode: BridgeMode = BridgeMode.None;

    private currFallingTime: number = 0;

    protected start(): void {
        this.node.zIndex = 1;
    }

    protected onEnable(): void {
        this.node.angle = 90;
        this.node.width = 0;
        this.currFallingTime = 0;
    }
    
    protected update(dt: number): void {
        switch(this._mode) {
            case BridgeMode.Build:
                this.buildingUpdate(dt);
                break;
            case BridgeMode.Fall:
                this.fallignUpdate(dt);
                break;
            case BridgeMode.None:
            default:
                break;
        }
    }

    startBuilding() {
        this.setMode(BridgeMode.Build);
    }

    stopBuilding() {
        if (this._mode === BridgeMode.Build) {
            this.node.emit(BridgeEvent.BuildingComplete, this.node.width);
            this.setMode(BridgeMode.Fall);
        }
    }

    protected setMode(currMode: BridgeMode) {
        this._mode = currMode;

        switch (currMode) {
            case BridgeMode.Build:
                this.node.emit(BridgeEvent.BuildingStarted);
                break;
            case BridgeMode.Fall:
                this.node.emit(BridgeEvent.FallingStarted);
                break;
        }
    }

    protected buildingUpdate(deltaTime: number) {
        this.node.width += this.buildingSpeed * deltaTime;
        this.applyColliderChanges();

        if (this.node.width >= this.maxLenght) {
            this.node.width = this.maxLenght;
            this.applyColliderChanges();
            this.node.emit(BridgeEvent.BuildingComplete, this.node.width);
            this.setMode(BridgeMode.Fall);
        }
    }

    protected fallignUpdate(DeltaTime: number) {

        this.currFallingTime += DeltaTime;

        const alpha = this.currFallingTime / this.fallingTime;

        const rotationUnclamped = lerp(90, 0, alpha);

        const rotationClamped = clamp(rotationUnclamped, 0, 90);

        this.node.angle = rotationClamped;
        
        if (rotationClamped === 0) {
            this.node.getComponent(cc.AudioSource).play();
            this.node.emit(BridgeEvent.FallingComplete);
            this.setMode(BridgeMode.None);

            this.currFallingTime = 0;
        }
    }

    private applyColliderChanges(): void {
        const collider = this.node.getComponent(cc.PhysicsBoxCollider);

        const { position: nodePos, width: nodeWidth, height: nodeHeight } = this.node;

        collider.size = new cc.Size(nodeWidth, nodeHeight);
        collider.offset = new cc.Vec2(nodeWidth / 2, 0);
        collider.apply();
    }
}

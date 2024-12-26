import Platform from "./platform"; 
import Bridge from "./bridge";
import Character from "./character";
import { lerp, randInRange } from "./helpers";
import { BridgeEvent, CharacterEvent } from "./eventTypes";
import UIBestScore from "./uiBestScore";
import UILayer, { UILayers } from "./uiLayer";
import UIScore from "./uiScore";

const {ccclass, property} = cc._decorator;

enum GameState {
    Menu = 0,
    Idle,
    BridgeBuilding,
    BridgeFalling,
    CharacterMoving,
    Transition,
    End,
}

@ccclass("DifficultySetting")
class DifficultySetting {
    @property({ tooltip: "Min/Max platform width settings will be applied when player reached score", serializable: true })
    score: number = 0;

    @property({ serializable: true })
    minPlatformWidth: number = 0;

    @property({ serializable: true })
    maxPlatformWidth: number = 0; 
    
    @property({ serializable: true })
    minDistanceBetweenPlatforms: number = 10;
}

@ccclass
export default class GameManager extends cc.Component {
    @property
    debugDrawPhysicsBody = false;

    @property({ tooltip: 'offset from screen edges on X axis'})
    safeZoneOffset: number = 50;
    
    @property({ tooltip: "Time before next platforms will appear" })
    transitionTime: number = 1;

    @property(cc.Node)
    killingVolume: cc.Node = null;

    @property(cc.Node)
    uiLayer: cc.Node = null;

    @property({ type: [DifficultySetting] }) 
    difficultySettings: DifficultySetting[] = [];

    // prefabs 
    @property(cc.Prefab)
    characterPrefab: cc.Prefab = null;

    @property(cc.Prefab)
    platformPrefab: cc.Prefab = null;

    @property(cc.Prefab)
    bridgePrefab: cc.Prefab = null;

    @property(cc.Prefab)
    bonusPrefab: cc.Prefab = null;
    //

    private _state: GameState;

    private _platformLevelY: number = 0;

    private _bestScore = 0;
    private _score = 0;

    private _currDistanceBetweenPlatforms = 0;

    private _currTransitionTime: number = 0;
    private _transitionDistance: number = 0;
    private _charTransitionOrigin = new cc.Vec3();
    private _platTransitionOrigin = new cc.Vec3();
    
    private _canvas: cc.Node = null;
    private _character: cc.Node = null;
    private _currPlatform: cc.Node = null;
    private _nextPlatform: cc.Node = null;
    private _bridge: cc.Node = null;
    private _bonus: cc.Node = null;

    private _bridgeNodePool = new cc.NodePool();
    private _platformNodePool = new cc.NodePool();
    private _bonusNodePool = new cc.NodePool();
    
    protected onLoad(): void {
        cc.director.getPhysicsManager().enabled = true;
        if (this.debugDrawPhysicsBody) {
            cc.director.getPhysicsManager().debugDrawFlags = cc.PhysicsManager.DrawBits.e_shapeBit;
        }

        this._canvas = cc.director.getScene().getChildByName('Canvas');

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStarted, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnded, this);

        this.killingVolume.getComponent(cc.RigidBody)!.onBeginContact = this.onDeath.bind(this);

        this._platformLevelY = (0 - this._canvas.height / 2) + 200;
    }

    protected start(): void {
        this.titleScreen();
    }

    private titleScreen(): void {
        this.resetGame();
        this.setState(GameState.Menu);
        this.uiLayer.getComponent(UILayer).activateLayer(UILayers.MainMenu);
    }

    private restartGame(): void {
        this.resetGame();

        this.startGame();
    }

    private startGame(): void {
        this.uiLayer.getComponent(UILayer).activateLayer(UILayers.HUD);
        this.setState(GameState.Idle);
    }

    private resetGame(): void {
        this._nextPlatform?.destroy();
        this._currPlatform?.destroy();
        this._bridge?.destroy();
        this._character?.destroy();
        this._bonus?.destroy();

        this._score = 0;
        this.uiLayer.getComponentsInChildren(UIScore).forEach((c) => c.setScore(this._score));

        this._platformNodePool.clear();
        this._bridgeNodePool.clear();
        this._bonusNodePool.clear();
        
        this.createStartPlatformNode();
        this.createCharacterNode();
        
        cc.director.resume();
    }

    protected update (deltaTime: number): void {
        if (this._state === GameState.Transition) {
            this.transitionUpdate(deltaTime);
        }
    }

    private onDeath(): void {
        cc.director.pause();
        this.uiLayer.getComponent(UILayer).activateLayer(UILayers.ModalMenu);
    }

    private onTouchStarted(event: cc.SystemEvent): void {
        if (this._state === GameState.Idle) {
            this._bridge = this.createBridgeNode();

            this._bridge.on(BridgeEvent.BuildingComplete, (bridgeLenght: number) => {
                this.setState(GameState.BridgeFalling);
                this._bridge.off(BridgeEvent.BuildingComplete);
            }, this);

            this._bridge.on(BridgeEvent.FallingComplete, () => {
                this.setState(GameState.CharacterMoving);
                this._bridge.off(BridgeEvent.FallingComplete);
            }, this);

            const bridgeComp = this._bridge.getComponent(Bridge);
            if (bridgeComp) {
                bridgeComp.startBuilding();
                this.setState(GameState.BridgeBuilding);
            }
        }
    }

    private onTouchEnded(event: cc.SystemEvent): void {
        if (this._state === GameState.BridgeBuilding && this._bridge) {
            const bridgeComp = this._bridge.getComponent(Bridge);
            bridgeComp?.stopBuilding();
        }
    }

    private setState(currState: GameState): void {
        this._state = currState;

        switch(this._state) {
            case GameState.Idle:
                this.createPlatformNode();
                if (this._score % 2 === 1) {
                    this.createBonusNode();
                }
                break;
            case GameState.CharacterMoving:
                this.startCharacterMovement();
                break;
            case GameState.Transition:
                this.transitionStarted();
                break;
            default:
                break;
        }
    }

    private createStartPlatformNode() {
        const platform = this.getPlatformNodeInstance();

        const { width: canvasWidth } = this._canvas;
        const { _platformLevelY: YLevel } = this;

        const platPos = new cc.Vec3();
        platPos.x = -(canvasWidth / 2);
        platPos.y = YLevel;
        platform.position = platPos;

        const platformComp = platform.getComponent(Platform);
        platformComp.randomizeWidth = false;

        this._canvas.addChild(platform);
        this._currPlatform = platform;
    }

    private createPlatformNode() {
        const platform = this.getPlatformNodeInstance();

        const [ minWidth, MaxWidth, minDistance ] = this.getCurrPlatformConstraints();

        const platformComp = platform.getComponent(Platform);
        platformComp.randomizeWidth = true;
        platformComp.minWidth = minWidth;
        platformComp.maxWidth = MaxWidth;

        this._canvas.addChild(platform);
        this._nextPlatform = platform;

        const randXMin = this._currPlatform.position.x + this._currPlatform.width + minDistance;
        const randXMax = (this._canvas.width / 2) - this.safeZoneOffset - platform.width;

        const platPos = this._currPlatform.position;
        platPos.x = randInRange(randXMin, randXMax);
        this._nextPlatform.position = platPos;

        this._currDistanceBetweenPlatforms = Math.abs((this._currPlatform.position.x + this._currPlatform.width) - this._nextPlatform.position.x);
    }

    private createBonusNode(): void {
        let bonus = this._bonusNodePool.get();
        if (!bonus) {
            bonus = cc.instantiate(this.bonusPrefab);
        }
        
        const bonusPos = this._nextPlatform.position;
        bonusPos.x = randInRange(this._nextPlatform.position.x, this._nextPlatform.position.x + this._nextPlatform.width - bonus.width);
        bonus.position = bonusPos;

        this._canvas.addChild(bonus);
        this._bonus = bonus;
    }
    
    private createCharacterNode() {
        const character = cc.instantiate(this.characterPrefab);

        const { position: platPosition, width: platWidth } = this._currPlatform;
        const { width: charWidth } = character;

        const charPosition = new cc.Vec3();
        charPosition.x = (platPosition.x + platWidth) - charWidth / 2 - 10;
        charPosition.y = platPosition.y;
        character.position = charPosition;

        this._canvas.addChild(character);
        this._character = character;
    }

    private startCharacterMovement(): void {
        let targetPos = this._character.position;

        if (this.isBridgeLengthValid()) {
            const { width: charWidth } = this._character;
            const { position: platPos, width: platWidth } = this._nextPlatform;
            targetPos.x = platPos.x + platWidth - (charWidth / 2) - 10;
            this._nextPlatform.getComponent(Platform)?.enableCollision(true);
            
            this.addScore(this.isBonusCondition() ? 2 : 1);
        }
        else {
            targetPos.x = Infinity;
            this._nextPlatform.getComponent(Platform)?.enableCollision(false); // disable to prevent colliding with character 
        }

        this._character.on(CharacterEvent.OnTargetPosition, () => {
            this.setState(GameState.Transition);
            this._character.off(CharacterEvent.OnTargetPosition);
        }, this);

        const characterComp = this._character?.getComponent(Character);
        characterComp?.startMovement(targetPos);
    }

    private transitionStarted(): void {
        this._currTransitionTime = 0;

        this._bridgeNodePool.put(this._bridge);
        this._platformNodePool.put(this._currPlatform);

        if (this._bonus?.isValid) {
            this._bonusNodePool.put(this._bonus);
        }
        
        this._currPlatform = this._nextPlatform;
        this._bonus = null;

        const { width: canvasWidth } = this._canvas;
        const { width: charWidth, position: charPos } = this._character;

        this._transitionDistance = charPos.x - (-(canvasWidth / 2) + this.safeZoneOffset);

        this._charTransitionOrigin = this._character.position;
        this._platTransitionOrigin = this._currPlatform.position;
    }

    private transitionUpdate(deltaTime: number): void {
        this._currTransitionTime += deltaTime;

        const alpha = this._currTransitionTime / this.transitionTime;

        const charPos = this._character.position;
        charPos.x = lerp(this._charTransitionOrigin.x, this._charTransitionOrigin.x - this._transitionDistance, alpha);
        this._character.position = charPos;

        const platPos = this._currPlatform.position;
        platPos.x = lerp(this._platTransitionOrigin.x, this._platTransitionOrigin.x - this._transitionDistance, alpha);
        this._currPlatform.position = platPos;

        if (alpha >= 1) {
            this._currTransitionTime = 0;
            this.setState(GameState.Idle);
        }
    }

    private createBridgeNode(): cc.Node {
        let bridge = this._bridgeNodePool.get();
        if (!bridge) {
            bridge = cc.instantiate(this.bridgePrefab);
        }

        const { width: platWidth, position: platPos } = this._currPlatform;
        const { height: bridgeHeight } = bridge;

        const bridgePosition = platPos;
        bridgePosition.x += platWidth;
        bridgePosition.y += -(bridgeHeight / 2);
        bridge.position = bridgePosition;

        this._canvas.addChild(bridge);

        return bridge;
    }

    private isBridgeLengthValid(): boolean {
        return this._bridge.width >= this._currDistanceBetweenPlatforms
            && this._bridge.width < this._currDistanceBetweenPlatforms + this._nextPlatform.width; 
    }

    private getPlatformNodeInstance(): cc.Node {
        let platform = this._platformNodePool.get();
        if (!platform) {
            platform = cc.instantiate(this.platformPrefab);
        }

        return platform;
    }

    private addScore(value: number): void {
        this._score += value;

        this.uiLayer.getComponentsInChildren(UIScore).forEach((c) => c.setScore(this._score));

        if (this._score > this._bestScore) {
            this._bestScore = this._score;
        }

        console.log(`CurrentScore: ${this._score}`);
        console.log(`BestScore: ${this._bestScore}`);
    } 

    private getCurrPlatformConstraints(): [number, number, number] {
        const { difficultySettings: settings, _score: score } = this;

        settings.sort((a, b) => b.score - a.score);

        const setting = settings.find((v)=> score >= v.score);

        console.log(`PlatformRandomWidth: min = ${setting?.minPlatformWidth}, max = ${setting?.maxPlatformWidth}, minDistance = ${setting?.minDistanceBetweenPlatforms}`);

        return [setting?.minPlatformWidth, setting?.maxPlatformWidth, setting?.minDistanceBetweenPlatforms];
    }

    private isBonusCondition(): boolean {
        if (!this._bonus?.isValid) return false;

        const distanceToBonus = Math.abs(this._bridge.position.x - this._bonus.position.x);

        return this._bridge.width >= distanceToBonus
            && this._bridge.width < distanceToBonus + this._bonus.width; 
    }
}

// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;

@ccclass
export default class Background extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;

    @property
    speed: number = 10;

    private queue: cc.Node[] = [];

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start () {
        this.queue = this.node.children;
        if (this.queue.length === 0) {
            this.destroy();
        }
    }

    update (dt) {
        let step = this.speed * dt;

        let scene = cc.director.getScene();
        let canvas = scene.getComponentInChildren(cc.Canvas);

        this.queue.forEach((nd: cc.Node) => {
            let newPos = nd.getPosition();
            newPos.x -= step;

            let diff = newPos.x + canvas.node.width;
            if (diff < 0) {
                newPos.x = canvas.node.width + diff;
            }

            nd.setPosition(newPos);
        });
    }
}

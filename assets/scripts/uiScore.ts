const {ccclass, property} = cc._decorator;

@ccclass
export default class UIScore extends cc.Component {
    protected _score: number = 0

    protected start(): void {
        this.setScore(0);
    }

    public setScore(newScore: number): void {
        this._score = newScore;
        this.node.getComponent(cc.Label).string = this._score.toString();
    }
}

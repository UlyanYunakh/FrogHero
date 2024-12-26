import UIScore from "./uiScore";

const {ccclass, property} = cc._decorator;

@ccclass
export default class UIBestScore extends UIScore {

    public setScore(newScore: number): void {
        if (newScore > this._score) {
            this._score = newScore;
            this.node.getComponent(cc.Label).string = this._score.toString();
        }
    }
}

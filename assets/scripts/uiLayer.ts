const {ccclass, property} = cc._decorator;

export enum UILayers {
    MainMenu = 0,
    HUD,
    ModalMenu,
}

@ccclass
export default class UILayer extends cc.Component {
    protected start(): void {
        this.activateLayer(UILayers.MainMenu);
    }

    public activateLayer(layer: UILayers): void {
        const { children } = this.node;

        children.forEach((c) => c.active = false);

        const activeLayer = children[layer];
        if (activeLayer) {
            activeLayer.active = true;
        }
    }

}

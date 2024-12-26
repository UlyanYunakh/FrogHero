export enum BridgeEvent {
    BuildingStarted = "BuildingStarted",
    BuildingComplete = "BuildingComplete",

    FallingStarted = "FallingStarted",
    FallingComplete = "FallingComplete",
} 

export enum CharacterEvent {
    OnTargetPosition = "OnTargetPosition",

    OnFallingState = "OnFallingState",
}

export enum ColliderTag {
    Bridge = 1,
    Platform,
    Character,
}
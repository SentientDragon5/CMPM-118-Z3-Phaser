class Load extends Phaser.Scene {
    constructor(my) {
        super("loadScene");
        this.my = my;
        console.log(my);
    }

    preload() {
        this.load.setPath("./assets/");

        // Load townsfolk
        this.load.image("purple", "purple_townie.png");
        this.load.image("blue", "blue_townie.png");

        // Load tilemap information
        this.load.image("tilemap_tiles", "tilemap_packed.png");                   // Packed tilemap
        this.load.tilemapTiledJSON("three-farmhouses", "three-farmhouses.tmj");   // Tilemap in JSON
    }

    create() {
        

         // ...and pass to the next Scene
         //this.scene.start("pathfinderScene");
         this.scene.add('Pathfinder', new Pathfinder(this.my), true); // Start the scene and pass myData
    }

    // Never get here since a new scene is started in create()
    update() {
    }
}
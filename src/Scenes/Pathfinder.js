class Pathfinder extends Phaser.Scene {
    constructor(my) {
        super("pathfinderScene");
        this.my = my;
        console.log(my);
    }

    preload() {
    }

    init() {
        this.TILESIZE = 16;
        this.SCALE = 2.0;
        this.TILEWIDTH = 40;
        this.TILEHEIGHT = 25;
    }

    async placeTileConstraint(includes, excludes, layer){
        const { Solver, Int, And, Or, Distinct, Not } = new this.my.Context("main");
        const solver = new Solver();

        const xvar = Int.const('x'); 
        const yvar = Int.const('y'); 

        includes.forEach(inc => {
            if(inc.type == "box"){
                solver.add(And(xvar.ge(inc.center.x-inc.size.x/2), xvar.le(inc.center.x+inc.size.x/2),
                yvar.ge(inc.center.y-inc.size.y/2), yvar.le(inc.center.y+inc.size.y/2)));
            }
            if(inc.type == "tile"){
                const orConstraint = []
                inc.tiles.forEach(t =>{
                    let coords = this.findTilesByType(layer, t)   
                    coords.forEach(c => {
                        orConstraint.push(And(xvar.eq(c.x), yvar.eq(c.y)));
                    });
                });
                solver.add(orConstraint.reduce((a, b) => a.or(b)));
            }
        });
        excludes.forEach(inc => {
            if(inc.type == "box"){
                solver.add(Not(And(xvar.ge(inc.center.x-inc.size.x/2), xvar.le(inc.center.x+inc.size.x/2),
                yvar.ge(inc.center.y-inc.size.y/2), yvar.le(inc.center.y+inc.size.y/2))));
            }
            if(inc.type == "tile"){
                inc.tiles.forEach(t =>{
                    let coords = this.findTilesByType(layer, t)   
                    coords.forEach(c => {
                        solver.add(Not(And(xvar.eq(c.x), yvar.eq(c.y))));
                    });
                });
            }
        });
        //solver.add(And(xvar.le(10), xvar.ge(8), yvar.eq(6)));  // x <= 10, x >=9

        // Run Z3 solver, find solution and sat/unsat
        console.log(await solver.check());

        // Extract value for x
        const model = solver.model();
        const xVal = parseInt(model.eval(xvar).asString());
        const yVal = parseInt(model.eval(yvar).asString());
        const coord = {x:xVal, y:yVal}
        console.log(coord);
        return coord;
    }

    findTilesByType(layer, tileIndex) {
        const coordinates = [];
        layer.forEachTile((tile) => {
          if (tile.index === tileIndex) {
            coordinates.push({ x: tile.x, y: tile.y });
          }
        });
        console.log("found ", coordinates.length, " tiles of type ", tileIndex);
        return coordinates;
      }

    async create() {
        // Create a new tilemap which uses 16x16 tiles, and is 40 tiles wide and 25 tiles tall
        this.map = this.add.tilemap("three-farmhouses", this.TILESIZE, this.TILESIZE, this.TILEHEIGHT, this.TILEWIDTH);

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("kenney-tiny-town", "tilemap_tiles");

        let fenceInclude = {
            type : "box",
            center : {x : 36, y : 4},
            size : {x : 4, y : 4}
        }
        let fenceInclude2 = {
            type : "box",
            center : {x : 25, y : 19},
            size : {x : 3, y : 4}
        }
        let world = {
            type : "box",
            center : {x:19,y:12},
            size : {x:38,y:24}
        }
        let pathTiles = {
            type : "tile",
            tiles : [44, 40, 42, 43]
        }
        let houseTiles = {
            type : "tile",
            tiles : [49,50,52,51,61,62,64,63,73,74,86,74,85,76,53,56,54,45,46,82,47,65,68,67,57,80,89,77,78,89,90,69]
        }


        // Create the layers
        this.groundLayer = this.map.createLayer("Ground-n-Walkways", this.tileset, 0, 0);
        this.treesLayer = this.map.createLayer("Trees-n-Bushes", this.tileset, 0, 0);
        this.housesLayer = this.map.createLayer("Houses-n-Fences", this.tileset, 0, 0);

        console.log(this.findTilesByType(this.housesLayer, 49));
        // Add z3
        let sign = await this.placeTileConstraint([pathTiles], [], this.groundLayer);
        this.housesLayer.putTileAt(sign.x,sign.y, 83)
        let wheelbarrow = await this.placeTileConstraint([world, fenceInclude], [], this.housesLayer);
        this.housesLayer.putTileAt(wheelbarrow.x,wheelbarrow.y, 57)

        let bee = await this.placeTileConstraint([world], [houseTiles], this.housesLayer);
        
        // label tiles
        if(false){
        for (var x = 0; x < this.map.widthInPixels/this.TILESIZE; x+=2) {
            for (var y = 0; y < this.map.heightInPixels/this.TILESIZE; y+=2) {
              let size = this.TILESIZE
              let a = this.add.text(x*size,y*size, ""+x+" "+y, {
                  "fontSize" : 8,
                  "backgroundColor" : "000000"
              })
              
            }
          }
        }
        // Create townsfolk sprite
        // Use setOrigin() to ensure the tile space computations work well
        this.my.sprite.purpleTownie = this.add.sprite(this.tileXtoWorld(5), this.tileYtoWorld(5), "purple").setOrigin(0,0);
        
        // Camera settings
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setZoom(this.SCALE);

        // Create grid of visible tiles for use with path planning
        let tinyTownGrid = this.layersToGrid([this.groundLayer, this.treesLayer, this.housesLayer]);

        let walkables = [1, 2, 3, 30, 40, 41, 42, 43, 44, 95, 13, 14, 15, 25, 26, 27, 37, 38, 39, 70, 84];

        // Initialize EasyStar pathfinder
        this.finder = new EasyStar.js();

        // Pass grid information to EasyStar
        // EasyStar doesn't natively understand what is currently on-screen,
        // so, you need to provide it that information
        this.finder.setGrid(tinyTownGrid);

        // Tell EasyStar which tiles can be walked on
        this.finder.setAcceptableTiles(walkables);

        this.activeCharacter = this.my.sprite.purpleTownie;

        // Handle mouse clicks
        // Handles the clicks on the map to make the character move
        // The this parameter passes the current "this" context to the
        // function this.handleClick()
        this.input.on('pointerup',this.handleClick, this);

        this.cKey = this.input.keyboard.addKey('C');
        this.lowCost = false;

    }

    update() {
        return;
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            if (!this.lowCost) {
                // Make the path low cost with respect to grassy areas
                this.setCost(this.tileset);
                this.lowCost = true;
            } else {
                // Restore everything to same cost
                this.resetCost(this.tileset);
                this.lowCost = false;
            }
        }
    }

    resetCost(tileset) {
        for (let tileID = tileset.firstgid; tileID < tileset.total; tileID++) {
            let props = tileset.getTileProperties(tileID);
            if (props != null) {
                if (props.cost != null) {
                    this.finder.setTileCost(tileID, 1);
                }
            }
        }
    }

    tileXtoWorld(tileX) {
        return tileX * this.TILESIZE;
    }

    tileYtoWorld(tileY) {
        return tileY * this.TILESIZE;
    }

    // layersToGrid
    //
    // Uses the tile layer information in this.map and outputs
    // an array which contains the tile ids of the visible tiles on screen.
    // This array can then be given to Easystar for use in path finding.
    layersToGrid() {
        let grid = [];
        // Initialize grid as two-dimensional array
        // TODO: write initialization code

        // Loop over layers to find tile IDs, store in grid
        // TODO: write this loop

        return grid;
    }


    handleClick(pointer) {
        let x = pointer.x / this.SCALE;
        let y = pointer.y / this.SCALE;
        let toX = Math.floor(x/this.TILESIZE);
        var toY = Math.floor(y/this.TILESIZE);
        var fromX = Math.floor(this.activeCharacter.x/this.TILESIZE);
        var fromY = Math.floor(this.activeCharacter.y/this.TILESIZE);
        console.log('going from ('+fromX+','+fromY+') to ('+toX+','+toY+')');
    
        this.finder.findPath(fromX, fromY, toX, toY, (path) => {
            if (path === null) {
                console.warn("Path was not found.");
            } else {
                console.log(path);
                this.moveCharacter(path, this.activeCharacter);
            }
        });
        this.finder.calculate(); // ask EasyStar to compute the path
        // When the path computing is done, the arrow function given with
        // this.finder.findPath() will be called.
    }
    
    moveCharacter(path, character) {
        // Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline
        var tweens = [];
        for(var i = 0; i < path.length-1; i++){
            var ex = path[i+1].x;
            var ey = path[i+1].y;
            tweens.push({
                x: ex*this.map.tileWidth,
                y: ey*this.map.tileHeight,
                duration: 200
            });
        }
    
        this.tweens.chain({
            targets: character,
            tweens: tweens
        });

    }

    // A function which takes as input a tileset and then iterates through all
    // of the tiles in the tileset to retrieve the cost property, and then 
    // uses the value of the cost property to inform EasyStar, using EasyStar's
    // setTileCost(tileID, tileCost) function.
    setCost(tileset) {
        // TODO: write this function
    }



}

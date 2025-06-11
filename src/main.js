import './style.css'
import Phaser from 'phaser'

//this object holds all of the important properties for the game
const gameState = {}

const Pause = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

//This scene opens up the game
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload()  {
    this.load.image('fly', 'assets/fly.png');
  }

  create () {
    let welcomeMessage = this.add.text(450, 15, "Can You Beat a Fly?", {
      font: "30px Lucida Console", 
      fill: "red"
    });
    welcomeMessage.setOrigin(0.5, 0.5);

    let instructMessage = this.add.text(450, 55, "Your goal is to find an invisible food source on the arena as quickly as you can \n using only status ring around you to indicate the intensity of the scent signal.", {
      font: "15px Lucida Console", 
      fill: "red"
    });
    instructMessage.setOrigin(0.5, 0.5);

    let instructMessage2 = this.add.text(450, 90, "Try to find the source as quickly as you can!", {
      font: "15px Lucida Console", 
      fill: "red"
    });
    instructMessage2.setOrigin(0.5, 0.5);

    let instructMessage3 = this.add.text(450, 250, "Click to start", {
      font: "25px Lucida Console", 
      fill: "red"
    });
    instructMessage3.setOrigin(0.5, 0.5);

    let on = true;
    this.time.addEvent({ callback: () => { 
        if (on) {
          instructMessage3.visible = false;
          on = false;
          console.log("on!")
        } else { 
          instructMessage3.visible = true;
          on = true;
        }}, callbackScope: this, delay: 750, loop: true });

    let fly = this.add.sprite(450, 350, 'fly');
    fly.setScale(0.375).setOrigin(0.5, 0.5);
    fly.angle = -45;

    this.input.on("pointerup", () => {
      this.scene.stop("BootScene");
      this.scene.start("MainScene");
    }, this);

    
  }

}

//This scene is for the game itself
class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }
  
  preload()  {
    this.load.image('fly', 'assets/fly.png');
    this.load.image('tree', 'assets/tree.png');
    this.load.image('stone', 'assets/stone.jpg');
    this.load.image('bg', 'assets/field.jpg');

    let url = 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js';
    this.load.plugin('rexvirtualjoystickplugin', url, true);
  }  
    
  create () {
    //load environment markers
    /*
    this.add.sprite(100, 100, 'tree').setScale(0.07);
    this.add.sprite(700, 200, 'tree').setScale(0.07);
    this.add.sprite(400, 100, 'tree').setScale(0.07);
    this.add.sprite(375, 325, 'tree').setScale(0.07);

    this.add.sprite(600, 75, 'stone').setScale(0.07);
    this.add.sprite(150, 300, 'stone').setScale(0.07);
    this.add.sprite(250, 350, 'stone').setScale(0.07);
    this.add.sprite(500, 375, 'stone').setScale(0.07);
    this.add.sprite(700, 300, 'stone').setScale(0.07);
    */

    //is the game over?
    gameState.end = false;

    gameState.cursors = this.input.keyboard.createCursorKeys();

    this.add.sprite(0, 0, 'bg').setOrigin(0).setScale(1.4);

    //status ring around fly
    gameState.statusRing = this.add.ellipse(17.5, 17.5, 25, 25, 0xFFFFF);
    gameState.statusRing.setOrigin(0.5);


    gameState.fly = this.physics.add.sprite(17.5, 17.5, 'fly');
    gameState.fly.setScale(0.0375);
    gameState.fly.setCollideWorldBounds(true);
    gameState.fly.setOrigin(0.5);

    gameState.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, { x: 840,
      y: 400,
      radius: 100,
      base: this.add.circle(840, 400, 50, 0x888888),
      thumb: this.add.circle(840, 400, 25, 0xcccccc) });
    

    gameState.distanceTraveled = 0;

    gameState.source = new Phaser.Math.Vector2(Phaser.Math.Between(50, 749),  Phaser.Math.Between(50, 449));
    gameState.slope = Phaser.Math.Between(0, 360);
    gameState.source = new Phaser.Math.Vector2(400, 200);
    gameState.slope = 225;

    gameState.noiseArray = [];
    for (let i = 0; i < 5; i++) {
      let r = Math.random();
      if (r < 0.5) {
        gameState.noiseArray.push(-1);
      } else {
        gameState.noiseArray.push(1);
      }
    }

    this.updateNoise = this.time.addEvent({ callback: this.updateArray, callbackScope: this, delay: 100, loop: true });

    //graphics object keeps track of the fly's trajectory
    gameState.graphics = this.add.graphics();
    gameState.graphics.beginPath();
    gameState.graphics.moveTo(gameState.fly.x, gameState.fly.y);
    gameState.graphics.lineStyle(0.5, 0xFF0000);
  }
  
  updateArray() {
    gameState.noiseArray = gameState.noiseArray.slice(1, 5);
    let r = Math.random();
    if (r < 0.5) {
      gameState.noiseArray.push(-1);
    } else {
      gameState.noiseArray.push(1);
    }
  }
  
  async update (time) {
    //gameState.timeMessage.setText("Time elapsed:" + Math.round(time));
    //gameState.distanceTraveledMessage.setText("Distance traveled:" + gameState.distanceTraveled);
    //gameState.distanceToSourceMessage.setText("Distance to source: " 
    //  + Math.round(Phaser.Math.Distance.Between(gameState.fly.x, gameState.fly.y, gameState.source.x, gameState.source.y)));
    
    //keep track of the distance from source
    let distanceToSource = Phaser.Math.Distance.Between(gameState.fly.x, gameState.fly.y, gameState.source.x, gameState.source.y);
    let x_diff = gameState.fly.x - gameState.source.x;
    let y_diff = gameState.source.y - gameState.fly.y;
    let point = rotate(x_diff, y_diff, gameState.slope);
    
    //update noise
    gameState.noise = avg(gameState.noiseArray) * 100;

    //calculate plume intensity with noise
    let plumeIntensity = Math.log(Gaussian(point.x, point.y, 0.25));
    plumeIntensity = plumeIntensity + gameState.noise;

    //input handling
    moveFly();

    //update color of status ring
    setStatusRing(plumeIntensity);
    if(gameState.statusRing.x != gameState.fly.x) gameState.fly.x = gameState.statusRing.x;
    if(gameState.statusRing.y != gameState.fly.y) gameState.fly.y = gameState.statusRing.y;

    //update trajectory
    gameState.graphics.lineTo(gameState.fly.x, gameState.fly.y);

    //the game ends here
    if (distanceToSource < 25 && !gameState.end) {
      gameState.end = true;

      gameState.fly.destroy();
      gameState.statusRing.destroy();
      gameState.graphics.strokePath();

      let timeMessage = this.add.text(750, 20, "Time elapsed:" + Math.round(((time / 1000) * 1000)) / 1000, {
        font: "15px Arial", 
        fill: "black"
      });
  
      let distanceMessage = this.add.text(750, 50, "Distance traveled:" + gameState.distanceTraveled, {
        font: "15px Arial", 
        fill: "black"
      });

      this.add.text(750, 80, "Click to view heatmap", {
        font: "15px Arial", 
        fill: "black"
      });

      setTimeout(() => {
        this.input.on("pointerup", () => {
          this.scene.stop("MainScene");
          this.scene.start("HeatmapScene", { x: gameState.source.x, y: gameState.source.y, slope: gameState.slope });
      }, this)}, 5000);

    }
  } 
}

//this scene is for the heatmap
class HeatmapScene extends Phaser.Scene {
  init(data) {
    this.x = data.x;
    this.y = data.y;
    this.slope = data.slope;
  }
  
  constructor() {
    super({ key: "HeatmapScene" });
  }

  create() {
    console.log(this.x);
    gameState.source = new Phaser.Math.Vector2(this.x, this.y);
    gameState.slope = this.slope;
    generateHeatmap(this, gameState);

    this.input.on("click", () => {
      this.scene.stop("HeatmapScene");
      this.scene.start("BootScene");
    }, this);
  }
}

//to update fill color of status ring
function setStatusRing(plumeIntensity) {
  if (plumeIntensity < -300) {
    gameState.statusRing.setFillStyle(0xFFFFFF);
  } else if (plumeIntensity < -280) {
    gameState.statusRing.setFillStyle(0xFFEEEE);
  }  else if (plumeIntensity < -260) {
    gameState.statusRing.setFillStyle(0xFFDDDD);
  } else if (plumeIntensity < -240) {
    gameState.statusRing.setFillStyle(0xFFCCCC);
  } else if (plumeIntensity < -220) {
    gameState.statusRing.setFillStyle(0xFFBBBB);
  } else if (plumeIntensity < -200) {
    gameState.statusRing.setFillStyle(0xFFAAAA);
  } else if (plumeIntensity < -180) {
    gameState.statusRing.setFillStyle(0xFF9999);
  } else if (plumeIntensity < -160) {
    gameState.statusRing.setFillStyle(0xFF8888);
  } else if (plumeIntensity < -140) {
    gameState.statusRing.setFillStyle(0xFF7777);
  } else if (plumeIntensity < -120) {
    gameState.statusRing.setFillStyle(0xFF6666);
  } else if (plumeIntensity < -100) {
    gameState.statusRing.setFillStyle(0xFF5555);
  } else if (plumeIntensity < -80) {
    gameState.statusRing.setFillStyle(0xFF4444);
  } else if (plumeIntensity < -60) {
    gameState.statusRing.setFillStyle(0xFF3333);
  } else if (plumeIntensity < -40) {
    gameState.statusRing.setFillStyle(0xFF2222);
  } else if (plumeIntensity < -20) {
    gameState.statusRing.setFillStyle(0xFF1111);
  } else {
    gameState.statusRing.setFillStyle(0xFF0000);
  }
}

//to determine tile color of heatmap (could be merged with the function above)
function setTileColor(plumeIntensity) {
  if (plumeIntensity < -300) {
    return 0xFFFFFF;
  } else if (plumeIntensity < -280) {
    return 0xFFEEEE;
  }  else if (plumeIntensity < -260) {
    return 0xFFDDDD;
  } else if (plumeIntensity < -240) {
    return 0xFFCCCC;
  } else if (plumeIntensity < -220) {
    return 0xFFBBBB;
  } else if (plumeIntensity < -200) {
    return 0xFFAAAA;
  } else if (plumeIntensity < -180) {
    return 0xFF9999;
  } else if (plumeIntensity < -160) {
    return 0xFF8888;
  } else if (plumeIntensity < -140) {
    return 0xFF7777;
  } else if (plumeIntensity < -120) {
    return 0xFF6666;
  } else if (plumeIntensity < -100) {
    return 0xFF5555;
  } else if (plumeIntensity < -80) {
    return 0xFF4444;
  } else if (plumeIntensity < -60) {
    return 0xFF3333;
  } else if (plumeIntensity < -40) {
    return 0xFF2222;
  } else if (plumeIntensity < -20) {
    return 0xFF1111;
  } else {
    return 0xFF0000;
  }
}

//calculates plume intensity before noise
function Gaussian (x, y, diffusivity) {
  if (x < 0) return 0;
  var m = Math.sqrt(Math.PI * diffusivity * x);
  var e = Math.exp(-Math.pow(y, 2) / (diffusivity * x));
  return e / m;
} 

//used to calculate noise
function avg(array) {
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += array[i]; 
  }
  return sum / 5.0;
}

function updateArray(array) {
  array = array.slice(1, 5);
  let r = Math.random();
  if (r < 0.5) {
    array.push(-1);
  } else {
    array.push(1);
  }
  return array;
} 

//this function is deprecated
function GaussianNoise(plumeIntensity) {
  return plumeIntensity + 150 * (Math.random() - 0.5);
}

function rotate(x, y, theta) {
  theta = Math.PI * (theta / 180); 
  let x_rot = x * Math.cos(theta) - y * Math.sin(theta);
  let y_rot = x * Math.sin(theta) + y * Math.cos(theta);
  return new Phaser.Math.Vector2(x_rot, y_rot);
}

function moveFly() {
  let force = gameState.joystick.force / 100.;
  if (force > 1.5) force = 1.5;
  let angle = -1 * gameState.joystick.angle * Math.PI / 180.;

  let dx = force * Math.cos(angle);
  let dy = -1 * force * Math.sin(angle);

  console.log(dx);

  gameState.statusRing.x += dx;
  gameState.fly.x += dx;
  gameState.statusRing.y += dy;
  gameState.fly.y += dy;

  gameState.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

  let cursorKeys = gameState.joystick.createCursorKeys();
  var leftKeyDown = cursorKeys.left.isDown;
  var rightKeyDown = cursorKeys.right.isDown;
  var upKeyDown = cursorKeys.up.isDown;
  var downKeyDown = cursorKeys.down.isDown;

  if (upKeyDown && rightKeyDown) {
    gameState.fly.angle = 45;
  } else if (upKeyDown && leftKeyDown) {
    gameState.fly.angle = -45;
  } else if (downKeyDown && rightKeyDown) {
    gameState.fly.angle = 135;
  } else if (downKeyDown && leftKeyDown) {
    gameState.fly.angle = -135;
  } else if (rightKeyDown) {
    gameState.fly.angle = 90;
  } else if (upKeyDown) {
    gameState.fly.angle = 0;
  } else if (leftKeyDown) {
    gameState.fly.angle = -90;
  } else if (downKeyDown) {
    gameState.fly.angle = 180;
  }
}

function generateHeatmap(scene, gameState) {
  for (let y = 0; y < 500; y+=2.5) {
    for (let x = 0; x < 800; x+=2.5) {
      let distanceToSource = Phaser.Math.Distance.Between(x, y, gameState.source.x, gameState.source.y);
      let x_diff = x - gameState.source.x;
      let y_diff = gameState.source.y - y;
      let point = rotate(x_diff, y_diff, gameState.slope);
      let plumeIntensity = Math.log(Gaussian(point.x, point.y, 0.25));
      console.log(plumeIntensity);

      let tile = scene.add.rectangle(x, y, 2.5, 2.5, setTileColor(plumeIntensity));
    }
  }
}

const config = {
  type: Phaser.WEBGL,
  width: 900,
  height: 500, 
  scene: [ BootScene, MainScene, HeatmapScene ]
  ,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0 },
      enableBody: true,
      debug: true
    }, 
  }, 
  fps: {
    forceTimeOut: true, 
    target: 30
  },
  backgroundColor: '#ffffff',
  canvas: gameCanvas
}

const game = new Phaser.Game(config);
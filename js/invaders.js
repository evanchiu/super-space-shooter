
// Test URL: http://localhost:8000/invaders_enemies.html?dot_xs=1,2,3&dot_ys=1,2,6
// Use this or there won't be enemies

var w = window;
var d = document;
var e = d.documentElement;
var g = d.getElementsByTagName('body')[0];
var screenwidth = w.innerWidth || e.clientWidth || g.clientWidth;
var screenheight = w.innerHeight || e.clientHeight || g.clientHeight;

var game = new Phaser.Game(screenwidth, screenheight, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {

    game.load.image('bullet', 'assets/bullet.png');
    game.load.image('enemyBullet', 'assets/enemy-bullet.png');
    //game.load.spritesheet('invader', 'assets/invader32x32x4.png', 32, 32);
    game.load.image('invader', 'img/bluedot.png', 32, 32);
    game.load.image('ship', 'assets/player.png');
    game.load.spritesheet('kaboom', 'assets/explode.png', 128, 128);
    game.load.image('starfield', 'assets/starfield.png');
	
    highscore = localStorage.getItem("highscore");
    if (highscore == null) {
	    highscore = 0;
	    localStorage.setItem("highscore", highscore); 
	}
}

var player;
var aliens;
var bullets;
var bulletTime = 0;
var cursors;
var fireButton;
var explosions;
var starfield;
var score = 0;
var scoreString = '';
var scoreText;
var highscore = 0;
var highscoreString = '';
var highscoreText;
var lives;
var enemyBullet;
var firingTimer = 0;
var stateText;
var livingEnemies = [];
var tapTargetX;
var tapTargetY;

var speedAdjustment = 1;

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);

    //  The scrolling starfield background
    starfield = game.add.tileSprite(0, 0, 800, 600, 'starfield');

    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    // The enemy's bullets
    enemyBullets = game.add.group();
    enemyBullets.enableBody = true;
    enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    enemyBullets.createMultiple(30, 'enemyBullet');
    enemyBullets.setAll('anchor.x', 0.5);
    enemyBullets.setAll('anchor.y', 1);
    enemyBullets.setAll('outOfBoundsKill', true);
    enemyBullets.setAll('checkWorldBounds', true);

    //  The hero!
    player = game.add.sprite(400, 500, 'ship');
    player.anchor.setTo(0.5, 0.5);
    game.physics.enable(player, Phaser.Physics.ARCADE);

    //  The baddies!
    aliens = game.add.group();
    aliens.enableBody = true;
    aliens.physicsBodyType = Phaser.Physics.ARCADE;
    createAliens();

	// Highscore
	highscoreString = 'Highscore : ';
    highscoreText = game.add.text(10, 10, highscoreString + highscore, { font: '16px Arial', fill: '#fff' });

    //  The score	
    scoreString = 'Score : ';
    scoreText = game.add.text(10, 44, scoreString + score, { font: '16px Arial', fill: '#fff' });

    //  Lives
    lives = game.add.group();
    game.add.text(game.world.width - 100, 10, 'Lives : ', { font: '16px Arial', fill: '#fff' });

    //  Text
    stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '24px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visible = false;

    for (var i = 0; i < 3; i++) 
    {
        var ship = lives.create(game.world.width - 100 + (30 * i), 60, 'ship');
        ship.anchor.setTo(0.5, 0.5);
        ship.angle = 90;
        ship.alpha = 0.4;
    }

    //  An explosion pool
    explosions = game.add.group();
    explosions.createMultiple(30, 'kaboom');
    explosions.forEach(setupInvader, this);

    //  And some controls to play the game with
    cursors = game.input.keyboard.createCursorKeys();
    fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    
}

function createAliens() {
    var coordinates = readCoordinatesFromUrl();

    // Use default space invaders pattern if we can't pull from URL
    if (!coordinates || coordinates.length <= 0) {
        for (var y = 0; y < 4; y++) {
            for (var x = 0; x < 10; x++) {
                coordinates.push([x, y]);
            }
        }
    }

    coordinates.map(function(coordinate) {
        var x = coordinate[0];
        var y = coordinate[1];

        var alien = aliens.create(x * 48, y * 50, 'invader');
        alien.anchor.setTo(0.5, 0.5);
        alien.animations.add('fly', [ 0, 1, 2, 3 ], 20, true);
        alien.play('fly');
        alien.body.moves = false;
    });

    aliens.x = 100;
    aliens.y = 50;

    //  All this does is basically start the invaders moving. Notice we're moving the Group they belong to, rather than the invaders directly.
    var tween = game.add.tween(aliens).to( { x: 200 }, 500, Phaser.Easing.Linear.None, true, 0, 1, true).loop();

    //  When the tween loops it calls descendAliens
    tween.onLoop.add(descendAliens, this);
}

// Loads dots from query params.
// Example:
// http://url?dot_xs=1,2,3&dot_ys=4,5,6
// represents (1, 4), (2, 5), and (3, 6)
function readCoordinatesFromUrl() {
    // http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
    var querystring = (function(a) {
        if (a === "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i) {
            var p=a[i].split('=', 2);
            if (p.length == 1)
                b[p[0]] = "";
            else
                b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'));

    if (!(querystring['dot_xs'] && querystring['dot_ys'])) {
        console.log("No dots present in URL parameters. Specify them using dot_xs and dot_ys");
        return [];
    }

    xs = querystring['dot_xs'].split(",");
    ys = querystring['dot_ys'].split(",");    
    if (!(xs.length === ys.length)) {
        console.log("Invalid dots: number of x coords doesn't match number of y coords.");
        return [];
    }

    var allCoords = [];
    for (var i = 0; i < xs.length;i++) {
        allCoords.push([ xs[i], ys[i] ]);
    }

    var urlCoordsString = allCoords.map(function (coordinate) {
        return "(" + coordinate + ")";
    });
    console.log("All coords from URL: " + urlCoordsString);

    return allCoords;
}

function setupInvader(invader) {
    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');
}

function descendAliens() {
    aliens.y += 20;
}

function update() {

    //  Scroll the background
    starfield.tilePosition.y += 2;

    if (player.alive) {
        // If pointer is down, register tap target and fire bullet
        if (game.input.activePointer.isDown) {
            tapTargetX = game.input.x;
            tapTargetY = game.input.y;
            fireBullet();
        }

        // If the player has reached the tap target, stop, otherwise move there
        if (Phaser.Rectangle.contains(player.body, tapTargetX, tapTargetY)) {
            player.body.velocity.setTo(0, 0);
        } else {
            game.physics.arcade.moveToXY(player, tapTargetX, tapTargetY, 400);
        }

        if (game.time.now > firingTimer) {
            enemyFires();
        }

        //  Run collision
        game.physics.arcade.overlap(bullets, aliens, collisionHandler, null, this);
        game.physics.arcade.overlap(enemyBullets, player, enemyHitsPlayer, null, this);
    }

}

function render() {

    // for (var i = 0; i < aliens.length; i++)
    // {
    //     game.debug.body(aliens.children[i]);
    // }

}

function increaseScore (value) {
    score += value;
	scoreText.text = scoreString + score;
	if (score > highscore) {
	    highscore = score;
		highscoreText.text = highscoreString + highscore;
	}
}

function resetScore () {
    score = 0;
	scoreText.text = scoreString + score;
	localStorage.setItem("highscore", highscore );
}

function collisionHandler (bullet, alien) {

    //  When a bullet hits an alien we kill them both
    bullet.kill();
    alien.kill();

    //  Increase the score
    increaseScore(20);

    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(alien.body.x, alien.body.y);
    explosion.play('kaboom', 30, false, true);

}

function enemyHitsPlayer(player,bullet) {
    
    bullet.kill();

    live = lives.getFirstAlive();

    if (live) {
        live.kill();
    }

    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(player.body.x, player.body.y);
    explosion.play('kaboom', 30, false, true);

    // When the player dies
    if (lives.countLiving() < 1) {
        player.kill();
        enemyBullets.callAll('kill');

        stateText.text=" GAME OVER \n Click to restart";
        stateText.visible = true;

        //the "click to restart" handler
        game.input.onTap.addOnce(restart,this);
    }

}

function enemyFires () {

    //  Grab the first bullet we can from the pool
    enemyBullet = enemyBullets.getFirstExists(false);

    livingEnemies.length=0;

    aliens.forEachAlive(function(alien){
        // put every living enemy in an array
        livingEnemies.push(alien);
    });


    if (enemyBullet && livingEnemies.length > 0) {
        
        var random = game.rnd.integerInRange(0,livingEnemies.length-1);

        // randomly select one of them
        var shooter = livingEnemies[random];
        // And fire the bullet from this enemy
        enemyBullet.reset(shooter.body.x, shooter.body.y);

        game.physics.arcade.moveToObject(enemyBullet,player,120);
        firingTimer = game.time.now + 2000;
    }

}

function fireBullet() {

    //  To avoid them being allowed to fire too fast we set a time limit
    if (game.time.now > bulletTime) {
        //  Grab the first bullet we can from the pool
        bullet = bullets.getFirstExists(false);

        if (bullet) {
            //  And fire it
            bullet.reset(player.x, player.y + 8);
            bullet.body.velocity.y = -400;
            bulletTime = game.time.now + 200;
        }
    }

}

function restart() {

    //  A new level starts
    
    //resets the life count
    lives.callAll('revive');
    //  And brings the aliens back from the dead :)
    aliens.removeAll();
    createAliens();

    //revives the player
    player.revive();
    //hides the text
    stateText.visible = false;
	
	resetScore();

}

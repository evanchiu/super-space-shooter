
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

    game.load.image('shoe', 'img/shoe.png');
    game.load.spritesheet('bullet', 'img/arrow-double-16px.png', 8, 35);
    game.load.image('enemyBullet', 'assets/enemy-bullet.png');
    //game.load.spritesheet('invader', 'assets/invader32x32x4.png', 32, 32);
    game.load.image('invader', 'img/bluedot.png', 32, 32);
    game.load.image('ship', 'img/arrowhead-32px.png');
    game.load.spritesheet('kaboom', 'assets/explode.png', 128, 128);
    game.load.image('starfield', 'img/spaceblobs.png');

    game.load.image('fire1', 'assets/fire1.png');
    game.load.image('fire2', 'assets/fire2.png');
    game.load.image('fire3', 'assets/fire3.png');
	
    highscore = localStorage.getItem("highscore");
    if (highscore == null) {
	    highscore = 0;
	    localStorage.setItem("highscore", highscore); 
	}
}

var player;
var exhaust;
var alienGroups;
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
var tapTarget;

var alienCreateTimer;
var alienGroupCreateTimer;
var speedAdjustment = 1;
var alienStartX = 0;
var alienStartY = 0;

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);

    //  The scrolling starfield background
    starfield = game.add.tileSprite(0, 0, screenwidth, screenheight, 'starfield');

    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);
    bullets.forEach(function(bullet) {
      bullet.animations.add('bullet');
      // The bullets look "interesting" when animated
      //bullet.play('bullet', 6, true);
    }, this);

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
    player = game.add.sprite(screenwidth/2, screenheight-50, 'ship');
    player.anchor.setTo(0.5, 0.5);
    game.physics.enable(player, Phaser.Physics.ARCADE);
    exhaust = game.add.emitter(player.x, player.y+15, 500);
    exhaust.makeParticles(['fire1', 'fire2', 'fire3']);
    exhaust.gravity = 100;
    exhaust.setAlpha(1, 0, 2000);
    exhaust.setScale(0.4, 0, 0.4, 0, 2000);
    exhaust.start(false, 2000, 20);
    exhaust.setXSpeed(-100, 100);
    exhaust.setYSpeed(100, 200);

    //  The baddies!
    aliens = game.add.group();
    createInitialAliens();
    alienCreateTimer = game.time.now;

    // Some really large baddies...
    alienGroups = game.add.group();
    alienGroups.enableBody = true;
    alienGroups.physicsBodyType = Phaser.Physics.ARCADE;

	// Highscore
	highscoreString = 'Highscore : ';
    highscoreText = game.add.text(10, 10, highscoreString + highscore, { font: '16px Arial', fill: '#fff' });

    //  The score	
    scoreString = 'Score : ';
    scoreText = game.add.text(10, 44, scoreString + score, { font: '16px Arial', fill: '#fff' });

    //  Lives
    lives = game.add.group();
    game.add.text(game.world.width - 100, 10, 'Lives : ', { font: '16px Arial', fill: '#fff' });

    // Game state text (game over, etc.)
    stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '24px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visible = false;

    for (var i = 0; i < 3; i++) {
        var ship = lives.create(game.world.width - 100 + (30 * i), 60, 'ship');
        ship.anchor.setTo(0.5, 0.5);
        ship.angle = 90;
        ship.alpha = 0.4;
    }

    //  An explosion pool
    explosions = game.add.group();
    explosions.createMultiple(1000, 'kaboom');
    explosions.forEach(setupInvader, this);

    //  And some controls to play the game with
    cursors = game.input.keyboard.createCursorKeys();
    fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    
}

function createInitialAliens() {
    var coordinates = readCoordinatesFromUrl();

    // Use default space invaders pattern if we can't pull from URL
    if (!coordinates || coordinates.length <= 0) {
        var numCols = 8;
        var numRows = 6;
        for (var y = 0; y < numRows; y++) {
            for (var x = 0; x < numCols; x++) {
                coordinates.push([(x / numCols) * screenwidth, (y / numRows) * screenheight]);
            }
        }
    }

    var coordsStr = coordinates.map(function (coordinate) {
        return "(" + coordinate + ")";
    });
    console.log("Initial coords: " + coordsStr);

    coordinates.map(function(coordinate) {
        createRandomVelAlien(coordinate[0], coordinate[1]);
    });

    aliens.x = alienStartX;
    aliens.y = alienStartY;

    alienGroupCreateTimer = game.time.now + 5000;
}

function createRandomVelAlien(x, y) {
    var wrappedAlien = createAlien(x, y, (Math.random() * 140) - 70, 150 + (Math.random() * 140) - 70);
    console.log(x, y);
    aliens.add(wrappedAlien);
}

function createAlienGroup(x, y, xVel, yVel, spriteName) {
    var groupSprite = alienGroups.create(x, y, spriteName);
    groupSprite.anchor.setTo(0.5, 0.5);
    groupSprite.body.velocity.setTo(xVel, yVel);
    groupSprite.body.moves = true;
    groupSprite.checkWorldBounds = true;
    groupSprite.outOfBoundsKill = true;
    groupSprite.alpha = .5;
    groupSprite.events.onKilled.add(function() {
        groupSprite.children.forEach(function(wrappedAlien) {
            wrappedAlien.children.forEach(function(rawAlien) {
                rawAlien.kill()
            });
        });
    }, this);
    var gOffsetX = 0;
    var gOffsetY = 50;
    groupSprite.body.setSize(400, 120, gOffsetX, gOffsetY);

    var gW = groupSprite.body.width;
    var gH = groupSprite.body.height;
    var numSubAliens = 15;
    for (var i = 0; i < numSubAliens; i++) {
        var wrappedAlien = createAlien(Math.random() * gW - gW / 2 + gOffsetX, Math.random() * gH - gH / 2 + gOffsetY, 0, 0);
        wrappedAlien.children.forEach(function(rawAlien) {
            rawAlien.outOfBoundsKill = false;
        });
        groupSprite.addChild(wrappedAlien);
    }
}

function createAlien(x, y, xVel, yVel) {
    var wrappedAlien = game.add.group();
    wrappedAlien.enableBody = true;
    wrappedAlien.physicsBodyType = Phaser.Physics.ARCADE;

    var alien = wrappedAlien.create(x, y, 'invader');
    alien.anchor.setTo(0.5, 0.5);
    alien.animations.add('fly', [ 0, 1, 2, 3 ], 20, true);
    alien.play('fly');
    alien.body.velocity.setTo(xVel, yVel);
    alien.body.moves = true;
    alien.checkWorldBounds = true;
    alien.outOfBoundsKill = true;
    alien.blinkTimer = game.time.now;

    return wrappedAlien;
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
        allCoords.push([ parseInt(xs[i]), parseInt(ys[i]) ]);
    }

    return allCoords;
}

function setupInvader(invader) {
    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');
}

function update() {

    //  Scroll the background
    starfield.tilePosition.y += 2;

    if (player.alive) {
        // If pointer is down, register tap target and fire bullet
        if (game.input.activePointer.isDown) {
            tapTarget = game.input.activePointer.position;
            fireBullet();
        }

        // If the player has reached the tap target, stop, otherwise move there
        if (tapTarget == null || Phaser.Rectangle.contains(player.body, tapTarget.x, tapTarget.y)) {
            player.body.velocity.setTo(0, 0);
            tapTarget = null;
        } else {
            game.physics.arcade.moveToXY(player, tapTarget.x, tapTarget.y, 400);
        }

        // Exhaust comes out the bottom of the ship
        exhaust.emitX = player.x;
        exhaust.emitY = player.y+25;

        if (game.time.now > firingTimer) {
            // enemyFires();
        }

        // Run collision against random aliens
        aliens.children.forEach(function(wrappedAlien) {
            wrappedAlien.children.forEach(function(rawAlien) {
                game.physics.arcade.overlap(bullets, rawAlien, handleBulletHitsAlien, null, this);
                game.physics.arcade.overlap(player, rawAlien, handlePlayerHitByBullet, null, this);
            });
        });

        // Run collision against alien groups
        alienGroups.children.forEach(function(alienGroup) {
            alienGroup.children.forEach(function(wrappedAlien) {
                wrappedAlien.children.forEach(function(rawAlien) {
                    game.physics.arcade.overlap(bullets, rawAlien, handleBulletHitsAlien, null, this);
                    game.physics.arcade.overlap(player, rawAlien, handlePlayerHitByBullet, null, this);
                });
            });
            // Find if there are any alive children; if not, kill the group
            var hasLivingChildren = false;
            alienGroup.children.forEach(function(wrappedAlien) {
                wrappedAlien.children.forEach(function(rawAlien) {
                    if (rawAlien.alive) {
                        hasLivingChildren = true;
                    }
                });
            });
            if (!hasLivingChildren) {
                handleAlienGroupDead(alienGroup);
            }
        });


        game.physics.arcade.overlap(enemyBullets, player, handlePlayerHitByBullet, null, this);
    }

    // Spawn aliens randomly at the top of the screen
    if (game.time.now > alienCreateTimer) {
        createRandomVelAlien(Math.random() * screenwidth, 0);
        alienCreateTimer = game.time.now + 300;
    }

    if (game.time.now > alienGroupCreateTimer) {
        var margin = 200;
        createAlienGroup(margin + Math.random() * (screenwidth - 2 * margin), -100, 0, 50, 'shoe');
        alienGroupCreateTimer = game.time.now + 15000 + Math.random() * 2000;
    }

    // Teleport around random aliens
    aliens.children.forEach(function(wrappedAlien) {
        // Blink and teleport around aliens on random intervals
        wrappedAlien.children.forEach(function(rawAlien) {
            teleBlink(rawAlien, wrappedAlien, 20, 20);
        });
    });

    alienGroups.children.forEach(function(alienGroup) {
        alienGroup.children.forEach(function(wrappedAlien) {
            wrappedAlien.children.forEach(function(rawAlien) {
                var gW = alienGroup.width;
                var gH = alienGroup.height;
                teleBlink(rawAlien, wrappedAlien, 20, 20);
            });
        });
    });
}

function teleBlink(rawAlien, wrappedAlien, xRadius, yRadius) {
    if (game.time.now > rawAlien.blinkTimer && rawAlien.alpha > 0.0) {
        rawAlien.alpha = 0.0;
        wrappedAlien.x = xRadius - Math.random() * xRadius * 2;
        wrappedAlien.y = yRadius - Math.random() * yRadius * 2;
    } else if (game.time.now > rawAlien.blinkTimer + 200 * Math.random()) {
        rawAlien.alpha = 1.0;
        rawAlien.blinkTimer = game.time.now + Math.random() * 200;
    }
}

function render() {

    // for (var i = 0; i < aliens.length; i++)
    // {
    //     game.debug.body(aliens.children[i]);
    // }

    // Display number of aliens (alive or dead)
    /*
    game.debug.text("Number of aliens: " + aliens.children.length, 100, 100);
    aliens.children.forEach(function(wrappedAlien) {
        wrappedAlien.children.forEach(function(rawAlien) {
            console.log("Alien x,y", rawAlien.x, rawAlien.y);
        });
    });
    */

    // Display alien group bounding boxes
    /*
    alienGroups.forEach(function(alienGroup) {
        game.debug.body(alienGroup);
    });
    */

}

function increaseScore(value) {
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

function handleBulletHitsAlien(bullet, alien) {
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

function handleAlienGroupDead(alienGroup) {
    if (!alienGroup.alive) {
        return;
    }
    alienGroup.kill();

    // Increase the score
    increaseScore(400);

    var numExplosionsRows = 3;
    var numExplosionsCols = 6;
    var gW = alienGroup.body.width;
    var gH = alienGroup.body.height;

    // And create lots of explosions
    for (var i = 0; i < numExplosionsRows; i++) {
        for (var j = 0; j < numExplosionsCols; j++) {
            var xOffset = (j / numExplosionsCols) * gW + (alienGroup.x - gW / 2);
            var yOffset = (i / numExplosionsRows) * gH + (alienGroup.y - gH / 2);
            // console.log("xOffset: " + xOffset);
            // console.log("yOffset: " + yOffset);

            var explosion = explosions.getFirstExists(false);
            explosion.reset(xOffset, yOffset + 40);
            explosion.play('kaboom', 30, false, true);
        }
    }

    alienGroups.remove(alienGroup);
}

function handlePlayerHitByBullet(player, bullet) {
    
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
        exhaust.kill();
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

    livingEnemies.length = 0;

    aliens.forEachAlive(function(wrappedAlien){
        // put every living enemy in an array
        wrappedAlien.children.forEach(function(child) {
            livingEnemies.push(child);
        });
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

    //revives the player
    player.revive();
    player.position = new Phaser.Point(screenwidth/2, screenheight-50);
    tapTarget = null;
    exhaust.start(false, 2000, 20);

    //  And brings the aliens back from the dead :)
    aliens.removeAll();
    alienGroups.removeAll();
    createInitialAliens();

    //hides the text
    stateText.visible = false;
	
	resetScore();

}

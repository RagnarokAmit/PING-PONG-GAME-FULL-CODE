// ============================================================
// AI PING PONG
// MediaPipe Hands + p5.js
// ============================================================


// ============================================================
// GAME VARIABLES
// ============================================================

var canvas;

var video;
var hands;

var game_status = "waiting";


// ------------------------------------------------------------
// Canvas
// ------------------------------------------------------------

var CANVAS_WIDTH = 700;
var CANVAS_HEIGHT = 600;


// ------------------------------------------------------------
// Player paddle
// ------------------------------------------------------------

var paddle1Width = 20;
var paddle1Height = 110;

var paddle1X = 10;
var paddle1Y = 245;


// ------------------------------------------------------------
// Computer paddle
// ------------------------------------------------------------

var paddle2Width = 20;
var paddle2Height = 90;

var paddle2X = CANVAS_WIDTH - 30;
var paddle2Y = 255;


// ------------------------------------------------------------
// Scores
// ------------------------------------------------------------

var playerscore = 0;
var pcscore = 0;

var WINNING_SCORE = 4;


// ------------------------------------------------------------
// Ball
// ------------------------------------------------------------

var ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,

    r: 20,

    dx: 3.5,
    dy: 3
};


// ============================================================
// MEDIAPIPE HAND VARIABLES
// ============================================================

var rightWristX = CANVAS_WIDTH / 2;
var rightWristY = CANVAS_HEIGHT / 2;

var wristDetected = false;


// Smoothed wrist position

var smoothWristY = CANVAS_HEIGHT / 2;

var SMOOTHING = 0.35;


// Last known wrist position

var lastWristY = CANVAS_HEIGHT / 2;


// ============================================================
// COMPUTER AI VARIABLES
// ============================================================

// The computer deliberately does NOT follow the ball perfectly.

var computerTargetY = CANVAS_HEIGHT / 2;

var computerSpeed = 4.2;

var aiReactionTimer = 0;

var AI_REACTION_DELAY = 8;


// Random prediction error

var aiError = 0;


// ============================================================
// SOUND
// ============================================================

var ball_touch_paddel;
var missed;


// ============================================================
// MEDIAPIPE INITIALIZATION
// ============================================================

function setup() {

    canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

    canvas.parent("canvas");


    // --------------------------------------------------------
    // Camera
    // --------------------------------------------------------

    video = createCapture(VIDEO);

    video.size(CANVAS_WIDTH, CANVAS_HEIGHT);

    video.hide();


    // --------------------------------------------------------
    // MediaPipe Hands
    // --------------------------------------------------------

    hands = new Hands({
        locateFile: function(file) {

            return "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + file;

        }
    });


    hands.setOptions({

        maxNumHands: 2,

        modelComplexity: 1,

        minDetectionConfidence: 0.55,

        minTrackingConfidence: 0.55

    });


    hands.onResults(onHandsResults);


    // --------------------------------------------------------
    // Start MediaPipe processing
    // --------------------------------------------------------

    startHandTracking();


    // --------------------------------------------------------
    // Load sounds
    // --------------------------------------------------------

    soundFormats("wav");

    ball_touch_paddel = loadSound(
        "ball_touch_paddel.wav"
    );

    missed = loadSound(
        "missed.wav"
    );


    // Initial ball

    resetBall();


    console.log("AI Ping Pong initialized.");

}


// ============================================================
// MEDIAPIPE CAMERA LOOP
// ============================================================

async function startHandTracking() {

    const camera = new Camera(video.elt, {

        onFrame: async function() {

            await hands.send({
                image: video.elt
            });

        },

        width: CANVAS_WIDTH,

        height: CANVAS_HEIGHT

    });


    camera.start();

}


// ============================================================
// MEDIAPIPE RESULTS
// ============================================================

function onHandsResults(results) {

    wristDetected = false;


    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {

        return;

    }


    var selectedHand = null;


    // --------------------------------------------------------
    // Find the physical RIGHT hand
    //
    // MediaPipe handedness assumes a mirrored/selfie image.
    // Because our p5 canvas displays the webcam normally,
    // the label is reversed here.
    //
    // Therefore:
    //
    // MediaPipe "Left" = user's physical RIGHT hand
    // --------------------------------------------------------

    if (results.multiHandedness) {

        for (
            var i = 0;
            i < results.multiHandedness.length;
            i++
        ) {

            var label =
                results.multiHandedness[i].label;


            if (label === "Left") {

                selectedHand =
                    results.multiHandLandmarks[i];

                break;

            }

        }

    }


    // --------------------------------------------------------
    // Fallback
    //
    // If handedness isn't available, use the first detected
    // hand rather than completely losing control.
    // --------------------------------------------------------

    if (!selectedHand) {

        selectedHand =
            results.multiHandLandmarks[0];

    }


    if (!selectedHand) {

        return;

    }


    // --------------------------------------------------------
    // WRIST LANDMARK
    //
    // MediaPipe landmark 0 = wrist
    // --------------------------------------------------------

    var wrist =
        selectedHand[0];


    if (!wrist) {

        return;

    }


    // --------------------------------------------------------
    // Convert normalized coordinates to canvas coordinates
    // --------------------------------------------------------

    var detectedX =
        wrist.x * CANVAS_WIDTH;

    var detectedY =
        wrist.y * CANVAS_HEIGHT;


    rightWristX = detectedX;

    rightWristY = detectedY;


    wristDetected = true;


    // --------------------------------------------------------
    // Smooth only Y.
    //
    // This prevents the paddle from shaking while still
    // allowing it to follow fast wrist movement.
    // --------------------------------------------------------

    smoothWristY =
        smoothWristY +
        (detectedY - smoothWristY) * SMOOTHING;


    lastWristY = smoothWristY;

}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    if (game_status === "gameover") {

        restart();

    }


    game_status = "start";


    document.getElementById("status").innerHTML =
        "Game Is Running";


    resetBall();

    loop();

}


// ============================================================
// DRAW
// ============================================================

function draw() {

    // --------------------------------------------------------
    // CAMERA BACKGROUND
    // --------------------------------------------------------

    background(0);


    if (video) {

        image(
            video,
            0,
            0,
            CANVAS_WIDTH,
            CANVAS_HEIGHT
        );

    }


    // --------------------------------------------------------
    // DARK TRANSPARENT OVERLAY
    // --------------------------------------------------------

    fill(0, 0, 0, 35);

    noStroke();

    rect(
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
    );


    // --------------------------------------------------------
    // CENTER LINE
    // --------------------------------------------------------

    midline();


    // --------------------------------------------------------
    // WRIST INDICATOR
    // --------------------------------------------------------

    drawWrist();


    // --------------------------------------------------------
    // PLAYER PADDLE
    // --------------------------------------------------------

    updatePlayerPaddle();

    drawPlayerPaddle();


    // --------------------------------------------------------
    // COMPUTER PADDLE
    // --------------------------------------------------------

    updateComputerPaddle();

    drawComputerPaddle();


    // --------------------------------------------------------
    // SCORE
    // --------------------------------------------------------

    drawScore();


    // --------------------------------------------------------
    // INFORMATION
    // --------------------------------------------------------

    models();


    // --------------------------------------------------------
    // GAME MOVEMENT
    // --------------------------------------------------------

    if (game_status === "start") {

        moveBall();

    }
    else {

        // Show ball in center while waiting

        drawBall();

    }


    // --------------------------------------------------------
    // WAITING MESSAGE
    // --------------------------------------------------------

    if (game_status === "waiting") {

        drawWaitingMessage();

    }


    // --------------------------------------------------------
    // GAME OVER
    // --------------------------------------------------------

    if (game_status === "gameover") {

        drawGameOver();

    }

}


// ============================================================
// WRIST DRAWING
// ============================================================

function drawWrist() {

    if (!wristDetected) {

        return;

    }


    // --------------------------------------------------------
    // Red wrist marker
    // --------------------------------------------------------

    fill(255, 0, 0);

    stroke(255);

    strokeWeight(2);

    circle(
        rightWristX,
        rightWristY,
        26
    );


    // --------------------------------------------------------
    // Small label
    // --------------------------------------------------------

    noStroke();

    fill(255);

    textSize(14);

    textAlign(CENTER);

    text(
        "RIGHT WRIST",
        rightWristX,
        rightWristY - 20
    );

}


// ============================================================
// PLAYER PADDLE UPDATE
// ============================================================

function updatePlayerPaddle() {

    if (wristDetected) {

        // ----------------------------------------------------
        // Map wrist position to the ENTIRE legal paddle range.
        //
        // This is important:
        //
        // The wrist can go all the way to the top of the
        // camera and all the way to the bottom.
        // ----------------------------------------------------

        var targetY =
            map(
                smoothWristY,
                0,
                CANVAS_HEIGHT,
                0,
                CANVAS_HEIGHT - paddle1Height
            );


        // Absolute positioning rather than adding movement
        // prevents the upper part of the canvas from becoming
        // unreachable.

        paddle1Y = targetY;

    }


    // --------------------------------------------------------
    // HARD CLAMP
    // --------------------------------------------------------

    paddle1Y =
        constrain(
            paddle1Y,
            0,
            CANVAS_HEIGHT - paddle1Height
        );

}


// ============================================================
// PLAYER PADDLE
// ============================================================

function drawPlayerPaddle() {

    fill(255, 0, 0);

    stroke(255, 0, 0);

    rect(
        paddle1X,
        paddle1Y,
        paddle1Width,
        paddle1Height,
        10
    );

}


// ============================================================
// COMPUTER AI
// ============================================================

function updateComputerPaddle() {

    aiReactionTimer--;


    // --------------------------------------------------------
    // Recalculate target periodically rather than every frame.
    // --------------------------------------------------------

    if (aiReactionTimer <= 0) {

        aiReactionTimer =
            AI_REACTION_DELAY;


        // ----------------------------------------------------
        // Only really react when ball is moving toward computer
        // ----------------------------------------------------

        if (ball.dx > 0) {

            computerTargetY =
                ball.y -
                paddle2Height / 2;


            // ------------------------------------------------
            // Add prediction error.
            //
            // This prevents perfect AI behavior.
            // ------------------------------------------------

            aiError =
                random(-45, 45);


            computerTargetY += aiError;

        }
        else {

            // When ball is coming toward player,
            // computer slowly returns toward center.

            computerTargetY =
                CANVAS_HEIGHT / 2 -
                paddle2Height / 2;

        }

    }


    // --------------------------------------------------------
    // Move computer toward target.
    // --------------------------------------------------------

    if (paddle2Y < computerTargetY) {

        paddle2Y += computerSpeed;

    }
    else if (paddle2Y > computerTargetY) {

        paddle2Y -= computerSpeed;

    }


    // --------------------------------------------------------
    // Keep computer paddle inside canvas.
    // --------------------------------------------------------

    paddle2Y =
        constrain(
            paddle2Y,
            0,
            CANVAS_HEIGHT - paddle2Height
        );

}


// ============================================================
// COMPUTER PADDLE DRAW
// ============================================================

function drawComputerPaddle() {

    fill(255, 165, 0);

    stroke(255, 165, 0);

    rect(
        paddle2X,
        paddle2Y,
        paddle2Width,
        paddle2Height,
        10
    );

}


// ============================================================
// BALL MOVEMENT
// ============================================================

function moveBall() {

    drawBall();


    // --------------------------------------------------------
    // Move
    // --------------------------------------------------------

    ball.x += ball.dx;

    ball.y += ball.dy;


    // ========================================================
    // TOP / BOTTOM WALL
    // ========================================================

    if (
        ball.y - ball.r <= 0
    ) {

        ball.y = ball.r;

        ball.dy =
            abs(ball.dy);

    }


    if (
        ball.y + ball.r >= CANVAS_HEIGHT
    ) {

        ball.y =
            CANVAS_HEIGHT - ball.r;

        ball.dy =
            -abs(ball.dy);

    }


    // ========================================================
    // PLAYER PADDLE COLLISION
    // ========================================================

    if (

        ball.dx < 0 &&

        ball.x - ball.r <=
        paddle1X + paddle1Width &&

        ball.x + ball.r >=
        paddle1X &&

        ball.y >= paddle1Y &&

        ball.y <=
        paddle1Y + paddle1Height

    ) {

        // Put ball outside paddle

        ball.x =
            paddle1X +
            paddle1Width +
            ball.r;


        // Reverse X

        ball.dx =
            abs(ball.dx);


        // Change Y based on where the ball hit paddle

        var hitPosition =
            (
                ball.y -
                (
                    paddle1Y +
                    paddle1Height / 2
                )
            ) /
            (
                paddle1Height / 2
            );


        ball.dy =
            hitPosition * 5;


        increaseBallSpeed();


        playPaddleSound();

    }


    // ========================================================
    // COMPUTER PADDLE COLLISION
    // ========================================================

    if (

        ball.dx > 0 &&

        ball.x + ball.r >=
        paddle2X &&

        ball.x - ball.r <=
        paddle2X + paddle2Width &&

        ball.y >= paddle2Y &&

        ball.y <=
        paddle2Y + paddle2Height

    ) {

        // Put ball outside computer paddle

        ball.x =
            paddle2X -
            ball.r;


        // Reverse X

        ball.dx =
            -abs(ball.dx);


        // Change Y based on collision point

        var computerHitPosition =
            (
                ball.y -
                (
                    paddle2Y +
                    paddle2Height / 2
                )
            ) /
            (
                paddle2Height / 2
            );


        ball.dy =
            computerHitPosition * 5;


        increaseBallSpeed();


        // ----------------------------------------------------
        // IMPORTANT:
        // Sound now plays for COMPUTER paddle too.
        // ----------------------------------------------------

        playPaddleSound();

    }


    // ========================================================
    // PLAYER MISSES
    // ========================================================

    if (
        ball.x + ball.r < 0
    ) {

        pcscore++;


        playMissedSound();


        checkWinner();


        if (game_status === "start") {

            resetBall();

        }

    }


    // ========================================================
    // COMPUTER MISSES
    // ========================================================

    if (
        ball.x - ball.r > CANVAS_WIDTH
    ) {

        playerscore++;


        playMissedSound();


        checkWinner();


        if (game_status === "start") {

            resetBall();

        }

    }

}


// ============================================================
// BALL DRAW
// ============================================================

function drawBall() {

    fill(255, 50, 50);

    stroke(255);

    strokeWeight(1);

    circle(
        ball.x,
        ball.y,
        ball.r * 2
    );

}


// ============================================================
// INCREASE BALL SPEED
// ============================================================

function increaseBallSpeed() {

    var maxSpeed = 9;


    if (abs(ball.dx) < maxSpeed) {

        if (ball.dx > 0) {

            ball.dx += 0.25;

        }
        else {

            ball.dx -= 0.25;

        }

    }

}


// ============================================================
// RESET BALL
// ============================================================

function resetBall() {

    ball.x =
        CANVAS_WIDTH / 2;

    ball.y =
        CANVAS_HEIGHT / 2;


    // Random starting vertical direction

    ball.dy =
        random([-3, 3]);


    // Start toward a random side

    ball.dx =
        random([-3.5, 3.5]);


    // Make sure it isn't almost horizontal

    if (abs(ball.dy) < 2) {

        ball.dy = 3;

    }


    // Reset AI timing

    aiReactionTimer = 0;

}


// ============================================================
// CHECK WINNER
// ============================================================

function checkWinner() {

    if (playerscore >= WINNING_SCORE) {

        game_status = "gameover";

        document.getElementById("status").innerHTML =
            "You Win!";

        noLoop();

    }


    if (pcscore >= WINNING_SCORE) {

        game_status = "gameover";

        document.getElementById("status").innerHTML =
            "Computer Wins!";

        noLoop();

    }

}


// ============================================================
// RESTART
// ============================================================

function restart() {

    playerscore = 0;

    pcscore = 0;


    paddle1Y =
        CANVAS_HEIGHT / 2 -
        paddle1Height / 2;


    paddle2Y =
        CANVAS_HEIGHT / 2 -
        paddle2Height / 2;


    smoothWristY =
        CANVAS_HEIGHT / 2;


    resetBall();


    game_status = "waiting";


    document.getElementById("status").innerHTML =
        "Game Is Ready";


    loop();

}


// ============================================================
// CENTER LINE
// ============================================================

function midline() {

    fill(255);

    noStroke();


    for (
        var y = 0;
        y < CANVAS_HEIGHT;
        y += 20
    ) {

        rect(
            CANVAS_WIDTH / 2 - 5,
            y,
            10,
            10
        );

    }

}


// ============================================================
// SCORE
// ============================================================

function drawScore() {

    textAlign(CENTER);

    textSize(24);


    // Player

    fill(255);

    stroke(0);

    strokeWeight(2);

    text(
        "Player: " + playerscore,
        100,
        60
    );


    // Computer

    text(
        "Computer: " + pcscore,
        580,
        60
    );

}


// ============================================================
// INFORMATION
// ============================================================

function models() {

    textAlign(CENTER);

    textSize(16);

    fill(255);

    stroke(0);

    strokeWeight(2);


    text(
        "Speed: " +
        abs(ball.dx).toFixed(1),
        80,
        20
    );


    text(
        "Width: " +
        CANVAS_WIDTH,
        190,
        20
    );


    text(
        "Height: " +
        CANVAS_HEIGHT,
        320,
        20
    );


    if (wristDetected) {

        text(
            "RIGHT WRIST DETECTED",
            540,
            20
        );

    }
    else {

        text(
            "SEARCHING FOR RIGHT WRIST...",
            540,
            20
        );

    }

}


// ============================================================
// WAITING MESSAGE
// ============================================================

function drawWaitingMessage() {

    fill(0, 0, 0, 150);

    noStroke();

    rect(
        180,
        240,
        340,
        100,
        15
    );


    fill(255);

    textAlign(CENTER);

    textSize(24);

    text(
        "AI Ping Pong",
        CANVAS_WIDTH / 2,
        275
    );


    textSize(18);

    text(
        "Press Play Game to start",
        CANVAS_WIDTH / 2,
        310
    );

}


// ============================================================
// GAME OVER SCREEN
// ============================================================

function drawGameOver() {

    fill(0, 0, 0, 190);

    noStroke();

    rect(
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
    );


    fill(255);

    textAlign(CENTER);


    textSize(35);

    text(
        playerscore > pcscore
            ? "YOU WIN!"
            : "COMPUTER WINS!",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 30
    );


    textSize(20);

    text(
        "Press Restart to play again",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 20
    );

}


// ============================================================
// SOUND FUNCTIONS
// ============================================================

function playPaddleSound() {

    try {

        if (
            ball_touch_paddel &&
            ball_touch_paddel.isLoaded()
        ) {

            ball_touch_paddel.play();

        }

    }
    catch (error) {

        console.log(
            "Paddle sound could not be played:",
            error
        );

    }

}


function playMissedSound() {

    try {

        if (
            missed &&
            missed.isLoaded()
        ) {

            missed.play();

        }

    }
    catch (error) {

        console.log(
            "Miss sound could not be played:",
            error
        );

    }

}


// ============================================================
// MOUSE / KEYBOARD SAFETY
// ============================================================

function keyPressed() {

    // Press SPACE to start

    if (
        key === " " &&
        game_status !== "start"
    ) {

        startGame();

    }


    // Press R to restart

    if (
        key === "r" ||
        key === "R"
    ) {

        restart();

    }

}

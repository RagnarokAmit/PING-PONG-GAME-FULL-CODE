# 🏓 AI Ping Pong

A browser-based Ping Pong game controlled using real-time hand tracking.

Instead of using a keyboard or mouse, the player's paddle is controlled by the
position of their physical right wrist detected through the webcam.

## 🎮 Features

- 🖐️ Real-time hand tracking using MediaPipe Hands
- 📷 Webcam-based paddle control
- 🤖 Computer-controlled opponent
- 🎯 Wrist-based vertical paddle movement
- 🔊 Paddle-hit and miss sound effects
- 📈 Ball speed increases during gameplay
- 🏆 Score tracking and win conditions
- 🔄 Game restart functionality
- 🎨 Canvas-based game rendering

## 🛠️ Technologies Used

- HTML
- CSS
- JavaScript
- p5.js
- MediaPipe Hands
- Web Camera API

## 🧠 How It Works

The webcam captures the player's hand and MediaPipe Hands detects the hand
landmarks in real time.

The wrist landmark is used to determine the player's vertical position.
That position is mapped to the paddle's movement within the game canvas.

The computer opponent uses a simple reaction-based AI with deliberate
prediction error, making it possible for the player to beat the computer.

## 🕹️ Controls

### Player
Move your physical right hand up and down in front of the webcam.

### Computer
The opponent paddle is controlled automatically by the game's AI.

## 🚀 Running the Game

1. Clone or download this repository.
2. Open the project in a local development environment.
3. Start the game through a local server if required by the browser.
4. Allow webcam access when prompted.
5. Position your hand in front of the camera.
6. Start playing!

## 📁 Project Structure

```text
AI-Ping-Pong/
│
├── index.html
├── main.js
├── style.css
├── background.jpg
├── ball_touch_paddel.wav
└── missed.wav

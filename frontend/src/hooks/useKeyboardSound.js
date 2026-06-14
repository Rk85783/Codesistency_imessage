let keyStrokeSounds = null;

function getSounds() {
  if (!keyStrokeSounds) {
    try {
      keyStrokeSounds = [
        new Audio("/sounds/keystroke1.mp3"),
        new Audio("/sounds/keystroke2.mp3"),
        new Audio("/sounds/keystroke3.mp3"),
        new Audio("/sounds/keystroke4.mp3"),
      ];
    } catch {
      keyStrokeSounds = [];
    }
  }
  return keyStrokeSounds;
}

function useKeyboardSound() {
  const playRandomKeyStrokeSound = () => {
    const sounds = getSounds();
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

    randomSound.currentTime = 0;
    randomSound.play().catch((error) => console.log("Audio play failed:", error));
  };

  return { playRandomKeyStrokeSound };
}

export default useKeyboardSound;

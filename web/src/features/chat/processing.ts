const PHRASES = ["Processing...", "Sailing...", "Swimming...", "Floating..."];
const ROTATE_MS = 30_000;

const nextPhrase = (current: string) => {
  const pool = PHRASES.filter((phrase) => phrase !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? PHRASES[0];
};

export const createProcessingStatus = (setStatus: (message: string) => void) => {
  let timer: number | null = null;
  let current = "";

  const stop = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    current = "";
    setStatus("");
  };

  const start = () => {
    if (timer !== null) {
      if (current === "") {
        current = nextPhrase(current);
      }
      setStatus(current);
      return;
    }
    current = nextPhrase(current);
    setStatus(current);
    timer = window.setInterval(() => {
      current = nextPhrase(current);
      setStatus(current);
    }, ROTATE_MS);
  };

  return {
    start,
    stop,
  };
};

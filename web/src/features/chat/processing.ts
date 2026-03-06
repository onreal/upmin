const PHRASES = ["Processing...", "Sailing...", "Swimming...", "Floating..."];
const ROTATE_MS = 30_000;

const nextPhrase = (current: string) => {
  const pool = PHRASES.filter((phrase) => phrase !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? PHRASES[0];
};

export const createProcessingStatus = (setStatus: (message: string) => void) => {
  let timer: number | null = null;
  let current = "";
  let detail = "";

  const render = () => {
    if (current === "") {
      setStatus("");
      return;
    }

    setStatus(detail ? `${current} ${detail}` : current);
  };

  const stop = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    current = "";
    detail = "";
    setStatus("");
  };

  const start = (nextDetail = "") => {
    detail = nextDetail;
    if (timer !== null) {
      if (current === "") {
        current = nextPhrase(current);
      }
      render();
      return;
    }
    current = nextPhrase(current);
    render();
    timer = window.setInterval(() => {
      current = nextPhrase(current);
      render();
    }, ROTATE_MS);
  };

  const update = (nextDetail = "") => {
    detail = nextDetail;
    if (timer !== null) {
      render();
    }
  };

  return {
    start,
    stop,
    update,
  };
};

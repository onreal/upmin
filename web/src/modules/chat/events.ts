import type { ChatDom } from "./layout";

type ChatEventBindings = {
  dom: ChatDom;
  onCreate: () => void;
  onRemove: () => void;
  onSelect: (conversationId: string) => void;
  onClearSelection: () => void;
  onReachedBottom: () => void;
  onJump: () => void;
  onSend: (content: string) => void;
};

export const bindChatDomEvents = (bindings: ChatEventBindings) => {
  const handleCreate = () => bindings.onCreate();
  const handleRemove = () => bindings.onRemove();
  const handleSelect = () => {
    const conversationId = bindings.dom.select.value.trim();
    if (conversationId) {
      bindings.onSelect(conversationId);
      return;
    }
    bindings.onClearSelection();
  };
  const handleScroll = () => bindings.onReachedBottom();
  const handleJump = () => bindings.onJump();
  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const content = bindings.dom.input.value.trim();
    if (!content) {
      return;
    }
    bindings.dom.input.value = "";
    bindings.onSend(content);
  };
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      bindings.dom.form.requestSubmit();
    }
  };

  bindings.dom.create?.addEventListener("click", handleCreate);
  bindings.dom.remove?.addEventListener("click", handleRemove);
  bindings.dom.select.addEventListener("change", handleSelect);
  bindings.dom.scroll.addEventListener("scroll", handleScroll);
  bindings.dom.jump.addEventListener("click", handleJump);
  bindings.dom.form.addEventListener("submit", handleSubmit);
  bindings.dom.input.addEventListener("keydown", handleKeydown);

  return () => {
    bindings.dom.create?.removeEventListener("click", handleCreate);
    bindings.dom.remove?.removeEventListener("click", handleRemove);
    bindings.dom.select.removeEventListener("change", handleSelect);
    bindings.dom.scroll.removeEventListener("scroll", handleScroll);
    bindings.dom.jump.removeEventListener("click", handleJump);
    bindings.dom.form.removeEventListener("submit", handleSubmit);
    bindings.dom.input.removeEventListener("keydown", handleKeydown);
  };
};

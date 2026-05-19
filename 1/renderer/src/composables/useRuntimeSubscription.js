import { onBeforeUnmount } from "vue";
import { subscribeRuntimeSettings } from "@/services/api.js";

export function useRuntimeSubscription(onMessage, onError = () => {}) {
  let stopSubscription = null;

  function stop() {
    stopSubscription?.();
    stopSubscription = null;
  }

  function start() {
    stop();
    stopSubscription = subscribeRuntimeSettings(onMessage, onError);
  }

  onBeforeUnmount(() => {
    stop();
  });

  return {
    start,
    stop
  };
}

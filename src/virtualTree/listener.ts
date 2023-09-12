export type ListenerCallback<T> = (value: T) => void;

export class Listener {
  public listeners: Record<string, ListenerCallback<any>[]> = {};

  protected onListen<T>(key: string, callback: ListenerCallback<T>) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }

    this.listeners[key].push(callback);
    return () => {
      const index = this.listeners[key].findIndex((item) => item === callback);
      if (index !== -1) {
        this.listeners[key].splice(index, 1);
      }
    };
  }

  protected dispatch<T>(key: string, value: T) {
    const listeners = this.listeners[key] || [];
    listeners.forEach((listener) => {
      listener(value);
    });
  }

  protected removeAllListeners() {
    this.listeners = {};
  }
}

export type Listener<T> = (event: T) => void;

export class TinyEmitter<T = any> {
  private listeners = new Set<Listener<T>>();

  on = (listener: Listener<T>) => {
    this.listeners.add(listener);
    return () => this.off(listener);
  };

  off = (listener: Listener<T>) => {
    this.listeners.delete(listener);
  };

  emit = (event: T) => {
    this.listeners.forEach((listener) => listener(event));
  };
}

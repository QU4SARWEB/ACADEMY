type Listener = () => void

class Store {
  private state: Record<string, unknown> = {}
  private listeners: Map<string, Set<Listener>> = new Map()

  get<T>(key: string): T | undefined {
    return this.state[key] as T | undefined
  }

  set<T>(key: string, value: T | null): void {
    this.state[key] = value
    this.notify(key)
  }

  subscribe(key: string, listener: Listener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)
    return () => {
      this.listeners.get(key)?.delete(listener)
    }
  }

  private notify(key: string): void {
    this.listeners.get(key)?.forEach((fn) => fn())
  }
}

export const store = new Store()

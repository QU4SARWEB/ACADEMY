type RouteHandler = () => Promise<void>

interface Route {
  pattern: RegExp
  paramNames: string[]
  handler: RouteHandler
}

export class Router {
  private routes: Route[] = []
  private currentPath = ''
  private fallback: RouteHandler | null = null
  private beforeNavigate: ((path: string) => Promise<boolean>) | null = null

  on(pattern: string, handler: RouteHandler): void {
    const paramNames: string[] = []
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    this.routes.push({
      pattern: new RegExp(`^${regexStr}$`),
      paramNames,
      handler,
    })
  }

  fallbackRoute(handler: RouteHandler): void {
    this.fallback = handler
  }

  setBeforeNavigate(fn: (path: string) => Promise<boolean>): void {
    this.beforeNavigate = fn
  }

  getParams(): Record<string, string> {
    const hash = location.hash.slice(1) || '/'
    for (const route of this.routes) {
      const match = hash.match(route.pattern)
      if (match) {
        const params: Record<string, string> = {}
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1])
        })
        return params
      }
    }
    return {}
  }

  async navigate(path: string, replace = false): Promise<void> {
    if (path === this.currentPath) return

    if (this.beforeNavigate) {
      const allowed = await this.beforeNavigate(path)
      if (!allowed) return
    }

    if (replace) {
      location.replace(`#${path}`)
    } else {
      location.hash = path
    }
    this.currentPath = path
    await this.resolve()
  }

  async resolve(): Promise<void> {
    const hash = location.hash.slice(1) || '/'

    for (const route of this.routes) {
      const match = hash.match(route.pattern)
      if (match) {
        try {
          await route.handler()
        } catch (err) {
          console.error('Route error:', err)
          const app = document.getElementById('app')
          if (app) {
            app.innerHTML = `<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center">
              <p class="text-red-400 text-sm">Error al cargar la página</p>
              <button onclick="location.reload()" class="mt-4 text-xs text-zinc-500 hover:text-white underline">Reintentar</button>
            </div>`
          }
        }
        return
      }
    }

    if (this.fallback) {
      await this.fallback()
    }
  }

  start(): void {
    this.currentPath = location.hash.slice(1) || '/'
    this.resolve()
    window.addEventListener('hashchange', () => this.resolve())
  }
}

export const router = new Router()

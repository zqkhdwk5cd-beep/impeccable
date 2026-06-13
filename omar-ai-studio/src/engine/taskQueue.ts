import type { Task } from '@/types/task'

export class TaskQueue {
  private queue: Task[] = []
  private running = false
  private paused = false

  enqueue(tasks: Task[]): void {
    this.queue = [...this.queue, ...tasks].sort((a, b) => a.order - b.order)
  }

  dequeue(): Task | undefined {
    return this.queue.shift()
  }

  peek(): Task | undefined {
    return this.queue[0]
  }

  get size(): number {
    return this.queue.length
  }

  get isRunning(): boolean {
    return this.running
  }

  setRunning(running: boolean): void {
    this.running = running
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
  }

  get isPaused(): boolean {
    return this.paused
  }

  clear(): void {
    this.queue = []
    this.running = false
    this.paused = false
  }

  waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.paused) {
          resolve()
        } else {
          setTimeout(check, 200)
        }
      }
      check()
    })
  }
}

export const taskQueue = new TaskQueue()

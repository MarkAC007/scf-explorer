import { parseWorkbook } from './parseWorkbook'

export type WorkerRequest = { type: 'parse'; buffer: ArrayBuffer; fileName: string }
export type WorkerResponse =
  | { type: 'progress'; stage: string; pct: number }
  | { type: 'done'; model: ReturnType<typeof parseWorkbook> }
  | { type: 'error'; message: string }

const post = (msg: WorkerResponse): void => self.postMessage(msg)

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type !== 'parse') return
  try {
    post({ type: 'progress', stage: 'Reading workbook', pct: 10 })
    const model = parseWorkbook(e.data.buffer, e.data.fileName)
    post({ type: 'progress', stage: 'Finalizing', pct: 95 })
    post({ type: 'done', model })
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

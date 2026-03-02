import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "@/shared/types/messages";

type MessageHandler = (msg: WorkerToMainMessage) => void;

export class WorkerBridge {
  private worker: Worker | null = null;
  private handlers = new Set<MessageHandler>();

  async init(): Promise<void> {
    if (this.worker) return;

    this.worker = new Worker(
      new URL(
        "@/features/focus-scoring/lib/analysis.worker.ts",
        import.meta.url,
      ),
      { type: "module" },
    );

    this.worker.addEventListener("message", (e: MessageEvent) => {
      const msg = e.data as WorkerToMainMessage;
      this.handlers.forEach((h) => h(msg));
    });

    return new Promise<void>((resolve) => {
      const onReady = (msg: WorkerToMainMessage) => {
        if (msg.type === "WORKER_READY") {
          this.off(onReady);
          resolve();
        }
      };
      this.on(onReady);
    });
  }

  send(msg: MainToWorkerMessage): void {
    this.worker?.postMessage(msg);
  }

  on(handler: MessageHandler): void {
    this.handlers.add(handler);
  }

  off(handler: MessageHandler): void {
    this.handlers.delete(handler);
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.handlers.clear();
  }
}

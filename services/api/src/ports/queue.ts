export interface QueueMessage<T = unknown> {
  id: string;
  body: T;
  receiveCount: number;
  sentAt: string;
}

export interface QueuePort {
  enqueue<T>(
    queueName: string,
    body: T,
    options?: { delaySeconds?: number },
  ): Promise<{ messageId: string }>;
  receive<T>(
    queueName: string,
    options?: { maxMessages?: number; waitTimeSeconds?: number },
  ): Promise<QueueMessage<T>[]>;
  acknowledge(queueName: string, messageId: string): Promise<void>;
  deadLetter(queueName: string, messageId: string): Promise<void>;
}

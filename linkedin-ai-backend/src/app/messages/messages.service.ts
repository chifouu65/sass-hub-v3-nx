import { Injectable } from '@nestjs/common';

export interface DraftRequest {
  recipient: string;
  goal: string;
  tone?: string;
}

export interface DraftResponse {
  message: string;
}

@Injectable()
export class MessagesService {
  async draft(req: DraftRequest): Promise<DraftResponse> {
    // TODO: call LLM provider with guardrails
    return {
      message: `Bonjour ${req.recipient}, voici un message pour ${req.goal}.`,
    };
  }
}

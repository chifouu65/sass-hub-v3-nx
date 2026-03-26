import { Body, Controller, Post } from '@nestjs/common';
import { MessagesService, DraftRequest } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post('draft')
  draft(@Body() body: DraftRequest) {
    return this.messages.draft(body);
  }
}

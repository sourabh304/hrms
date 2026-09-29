import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketComment } from './entities/ticket-comment.entity.js';
import { Ticket } from './entities/ticket.entity.js';
import { HelpdeskController } from './helpdesk.controller.js';
import { HelpdeskService } from './helpdesk.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketComment])],
  controllers: [HelpdeskController],
  providers: [HelpdeskService],
})
export class HelpdeskModule {}

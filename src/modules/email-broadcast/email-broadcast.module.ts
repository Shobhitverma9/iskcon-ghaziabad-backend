import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailBroadcastController } from './email-broadcast.controller';
import { EmailBroadcastService } from './email-broadcast.service';
import { EmailTemplate, EmailTemplateSchema } from '../notification/schemas/email-template.schema';
import { EmailBroadcast, EmailBroadcastSchema } from '../notification/schemas/email-broadcast.schema';
import { NotificationModule } from '../notification/notification.module';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: EmailBroadcast.name, schema: EmailBroadcastSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationModule,
  ],
  controllers: [EmailBroadcastController],
  providers: [EmailBroadcastService],
  exports: [EmailBroadcastService],
})
export class EmailBroadcastModule {}

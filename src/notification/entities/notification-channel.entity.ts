import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProviderType {
  DISCORD  = 'discord',
  TELEGRAM = 'telegram',
  SLACK    = 'slack',
}

@Entity('notification_channels')
export class NotificationChannel {

  // PrimaryColumn vì MariaDB tự sinh UUID ở DB (DEFAULT UUID())
  // Không dùng @PrimaryGeneratedColumn — TypeORM sẽ không ghi đè
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'enum', enum: ProviderType })
  provider: ProviderType;

  // TypeORM tự parse JSON → object JS khi đọc ra
  // Discord: { webhook_url: "..." }
  // Telegram: { bot_token: "...", chat_id: "..." }
  @Column({ type: 'json' })
  config: Record<string, string>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
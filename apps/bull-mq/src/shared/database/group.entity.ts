import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'webhook_url' })
  url: string;

  @Column({ type: 'int', nullable: true })
  maxRetries: number | null;
}
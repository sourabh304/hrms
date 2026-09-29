import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';

export abstract class AppBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** Postgres returns DECIMAL as string; normalise to number on both drivers. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) => (value == null ? value : Number(value)),
};

export const moneyColumn = {
  type: 'decimal' as const,
  precision: 14,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
};

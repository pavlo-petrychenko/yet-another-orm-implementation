import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";

@Entity({ name: "model_accounts" })
export class Account extends BaseModel {
  @PrimaryKey({ type: "bigint", generated: "identity" })
  public id!: string;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  public balance!: string;

  @Column({ type: "string", nullable: true })
  public notes!: string | null;
}

import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { CascUser } from "@/model/__integration__/fixtures/cascade/CascUser.entity";
import { CascOrderItem } from "@/model/__integration__/fixtures/cascade/CascOrderItem.entity";

@Entity({ name: "casc_orders" })
export class CascOrder extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  public total!: string;

  @ManyToOne(() => CascUser, { joinColumn: { name: "user_id" }, inverseSide: "orders" })
  public user!: Relation<CascUser>;

  @OneToMany(() => CascOrderItem, { inverseSide: "order", cascade: true })
  public items!: Relation<CascOrderItem[]>;
}

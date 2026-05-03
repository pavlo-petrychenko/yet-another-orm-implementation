import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { OneToOne } from "@/decorators/relations/OneToOne.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { CascOrder } from "@/model/__integration__/fixtures/cascade/CascOrder.entity";
import { CascProfile } from "@/model/__integration__/fixtures/cascade/CascProfile.entity";

@Entity({ name: "casc_users" })
export class CascUser extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public name!: string;

  @Column({ type: "string" })
  public email!: string;

  @OneToMany(() => CascOrder, { inverseSide: "user", cascade: true })
  public orders!: Relation<CascOrder[]>;

  @OneToOne(() => CascProfile, { inverseSide: "user", cascade: true })
  public profile!: Relation<CascProfile> | undefined;
}

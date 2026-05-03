import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { OneToOne } from "@/decorators/relations/OneToOne.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { User } from "@/model/__integration__/fixtures/User.entity";

@Entity({ name: "model_profiles" })
export class Profile extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "string", nullable: true })
  public bio!: string | null;

  @OneToOne(() => User, { joinColumn: { name: "user_id" }, inverseSide: "profile" })
  public user!: Relation<User>;
}

import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { OneToOne } from "@/decorators/relations/OneToOne.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { Profile } from "@/model/__integration__/fixtures/Profile.entity";

@Entity({ name: "model_users" })
export class User extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public email!: string;

  @Column({ type: "string", name: "display_name" })
  public displayName!: string;

  @Column({ type: "boolean", name: "is_active" })
  public isActive!: boolean;

  @Column({ type: "integer", name: "signup_count" })
  public signupCount!: number;

  @Column({ type: "timestamptz", name: "last_login_at", nullable: true })
  public lastLoginAt!: Date | null;

  @Column({ type: "timestamptz", name: "created_at" })
  public createdAt!: Date;

  @OneToMany(() => Order, { inverseSide: "user" })
  public orders!: Relation<Order[]>;

  @OneToOne(() => Profile, { inverseSide: "user" })
  public profile!: Relation<Profile> | undefined;
}

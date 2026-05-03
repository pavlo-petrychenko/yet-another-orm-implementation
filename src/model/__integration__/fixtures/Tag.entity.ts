import { BaseModel } from "@/model/BaseModel";
import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Relation } from "@/model/types/Relation";

import { Post } from "@/model/__integration__/fixtures/Post.entity";

@Entity({ name: "model_tags" })
export class Tag extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "identity" })
  public id!: number;

  @Column({ type: "string" })
  public name!: string;

  @ManyToMany(() => Post, { inverseSide: "tags" })
  public posts!: Relation<Post[]>;
}

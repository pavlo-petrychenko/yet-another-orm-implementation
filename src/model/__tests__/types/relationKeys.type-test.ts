import { expectTypeOf } from "expect-type";
import type { Order } from "@/model/__integration__/fixtures/Order.entity";
import type { Post } from "@/model/__integration__/fixtures/Post.entity";
import type { Profile } from "@/model/__integration__/fixtures/Profile.entity";
import type { Tag } from "@/model/__integration__/fixtures/Tag.entity";
import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { RelationKeys } from "@/model/types/RelationKeys";

expectTypeOf<RelationKeys<User>>().toEqualTypeOf<"orders" | "profile">();
expectTypeOf<RelationKeys<Order>>().toEqualTypeOf<"user">();
expectTypeOf<RelationKeys<Profile>>().toEqualTypeOf<"user">();
expectTypeOf<RelationKeys<Post>>().toEqualTypeOf<"tags">();
expectTypeOf<RelationKeys<Tag>>().toEqualTypeOf<"posts">();

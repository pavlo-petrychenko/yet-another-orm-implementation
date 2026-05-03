import { expectTypeOf } from "expect-type";
import type { Order } from "@/model/__integration__/fixtures/Order.entity";
import type { Profile } from "@/model/__integration__/fixtures/Profile.entity";
import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { Strict } from "@/model/types/Strict";

// u3: narrow only → all columns, no relations
type U3 = Strict<User, { narrow: true }>;
declare const u3: U3;
expectTypeOf<U3["id"]>().toEqualTypeOf<number>();
expectTypeOf<U3["email"]>().toEqualTypeOf<string>();
expectTypeOf<U3["createdAt"]>().toEqualTypeOf<Date>();
// @ts-expect-error 'orders' relation stripped when narrow + no include
void u3.orders;
// @ts-expect-error 'profile' relation stripped when narrow + no include
void u3.profile;

// u4: narrow + include orders → all columns + orders relation
type U4 = Strict<User, { narrow: true; include: { orders: true } }>;
declare const u4: U4;
expectTypeOf<U4["id"]>().toEqualTypeOf<number>();
expectTypeOf<U4["orders"]>().toEqualTypeOf<Order[]>();
// @ts-expect-error 'profile' not in include
void u4.profile;

// u5: narrow + select { id, email } → just those two columns
type U5 = Strict<User, { narrow: true; select: { id: true; email: true } }>;
declare const u5: U5;
expectTypeOf<U5["id"]>().toEqualTypeOf<number>();
expectTypeOf<U5["email"]>().toEqualTypeOf<string>();
// @ts-expect-error 'displayName' was not selected
void u5.displayName;
// @ts-expect-error 'orders' relation not included
void u5.orders;

// u6: narrow + select { id } + include orders
type U6 = Strict<User, { narrow: true; select: { id: true }; include: { orders: true } }>;
declare const u6: U6;
expectTypeOf<U6["id"]>().toEqualTypeOf<number>();
expectTypeOf<U6["orders"]>().toEqualTypeOf<Order[]>();
// @ts-expect-error 'email' not selected
void u6.email;

// narrow + include profile (singular relation, may be undefined)
type U7 = Strict<User, { narrow: true; include: { profile: true } }>;
expectTypeOf<U7["profile"]>().toEqualTypeOf<Profile | undefined>();

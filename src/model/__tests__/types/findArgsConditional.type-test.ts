import { expectTypeOf } from "expect-type";
import type { Order } from "@/model/__integration__/fixtures/Order.entity";
import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { Repository } from "@/model/Repository";
import type { Strict } from "@/model/types/Strict";

declare const repo: Repository<User>;

// findOne, no narrow → User | null
{
  const r = repo.findOne({ where: { id: 1 } });
  expectTypeOf(r).toEqualTypeOf<Promise<User | null>>();
}

// findOne, no args → User | null
{
  const r = repo.findOne();
  expectTypeOf(r).toEqualTypeOf<Promise<User | null>>();
}

// findOne, narrow + select → Pick narrowed, no relations
{
  const r = repo.findOne({ where: { id: 1 }, select: { id: true, email: true }, narrow: true });
  type Expected = Strict<User, { where: { id: number }; select: { id: true; email: true }; narrow: true }> | null;
  expectTypeOf(r).toEqualTypeOf<Promise<Expected>>();
}

// findOneOrFail, narrow + include → no `| null`
{
  const r = repo.findOneOrFail({ where: { id: 1 }, include: { orders: true }, narrow: true });
  type Expected = Strict<User, { where: { id: number }; include: { orders: true }; narrow: true }>;
  expectTypeOf(r).toEqualTypeOf<Promise<Expected>>();
}

// find, narrow → Array of narrowed
{
  const r = repo.find({ narrow: true, select: { id: true } });
  type Expected = Array<Strict<User, { narrow: true; select: { id: true } }>>;
  expectTypeOf(r).toEqualTypeOf<Promise<Expected>>();
}

// find, no narrow → Array of plain User
{
  const r = repo.find();
  expectTypeOf(r).toEqualTypeOf<Promise<User[]>>();
}

declare const orderRepo: Repository<Order>;

// Cross-entity: Order.find with narrow + include user
{
  const r = orderRepo.find({ narrow: true, include: { user: true } });
  type Expected = Array<Strict<Order, { narrow: true; include: { user: true } }>>;
  expectTypeOf(r).toEqualTypeOf<Promise<Expected>>();
}

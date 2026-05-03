import type { User } from "@/model/__integration__/fixtures/User.entity";
import type { SelectMap } from "@/model/types/SelectMap";

const ok1: SelectMap<User> = { id: true };
const ok2: SelectMap<User> = { id: true, email: true, displayName: true };
const ok3: SelectMap<User> = {};

const ok4: SelectMap<User> = {
  // @ts-expect-error 'orders' is a relation key, not a column
  orders: true,
};

const ok5: SelectMap<User> = {
  // @ts-expect-error 'save' is a method, not a column
  save: true,
};

const ok6: SelectMap<User> = {
  // @ts-expect-error only literal `true` is allowed
  id: false,
};

void ok1; void ok2; void ok3; void ok4; void ok5; void ok6;

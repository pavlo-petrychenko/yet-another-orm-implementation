import type { EntityTarget } from "@/metadata/types";
import { repositoryRegistry, type RepositoryCtor } from "@/model/repositoryRegistry";

export const EntityRepository = <T extends object>(entity: EntityTarget<T>) => {
  return <R extends RepositoryCtor<T>>(value: R, _context: ClassDecoratorContext<R>): void => {
    repositoryRegistry.register(entity, value);
  };
};

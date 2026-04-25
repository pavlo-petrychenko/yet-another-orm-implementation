import { defaultMetadataStorage } from "@/metadata/storage";
import type {
  ColumnOptions,
  EntityTarget,
  RelationOptions,
} from "@/metadata/types";

const COLUMN_KEY = Symbol("yaoi.columns");
const RELATION_KEY = Symbol("yaoi.relations");

interface PendingBag {
  [COLUMN_KEY]?: Map<string, ColumnOptions>;
  [RELATION_KEY]?: Map<string, RelationOptions>;
}

const ensureBag = (metadata: object): PendingBag => metadata as PendingBag;

const getOrCreateColumns = (bag: PendingBag): Map<string, ColumnOptions> => {
  let columns = bag[COLUMN_KEY];
  if (!columns) {
    columns = new Map();
    bag[COLUMN_KEY] = columns;
  }
  return columns;
};

const getOrCreateRelations = (bag: PendingBag): Map<string, RelationOptions> => {
  let relations = bag[RELATION_KEY];
  if (!relations) {
    relations = new Map();
    bag[RELATION_KEY] = relations;
  }
  return relations;
};

export const stashColumn = (
  metadata: object,
  propertyName: string,
  options: ColumnOptions,
): void => {
  getOrCreateColumns(ensureBag(metadata)).set(propertyName, options);
};

export const stashRelation = (
  metadata: object,
  propertyName: string,
  options: RelationOptions,
): void => {
  getOrCreateRelations(ensureBag(metadata)).set(propertyName, options);
};

export const flushPendingMetadata = (target: EntityTarget, metadata: object): void => {
  const bag = ensureBag(metadata);
  const columns = bag[COLUMN_KEY];
  if (columns) {
    for (const [propertyName, options] of columns) {
      defaultMetadataStorage.registerColumn(target, propertyName, options);
    }
  }
  const relations = bag[RELATION_KEY];
  if (relations) {
    for (const [propertyName, options] of relations) {
      defaultMetadataStorage.registerRelation(target, propertyName, options);
    }
  }
};

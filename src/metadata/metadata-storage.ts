import {EntityMetadata, EntityConstructor} from "@/metadata/types/Entity.metadata.types";
import {RelationMetadata} from "@/metadata/types/Relation.metadata.types";
import {ColumnOptions} from "@/metadata/types/Column.metadata.types";

/**
 * Singleton class that collects and stores metadata about entities,
 * columns, primary keys, and relations.
 */
export class MetadataStorageImpl {
    private static instance: MetadataStorageImpl;
    private entityStore = new Map<EntityConstructor, EntityMetadata>();

    private constructor() {}

    static getInstance(): MetadataStorageImpl {
        if (!MetadataStorageImpl.instance) {
            MetadataStorageImpl.instance = new MetadataStorageImpl();
        }
        return MetadataStorageImpl.instance;
    }

    /**
     * Registers a new entity with a given table name.
     * If the entity already exists, updates its table name.
     */
    addEntity(target: EntityConstructor, tableName: string): void {
        if (!target || typeof target !== "function") {
            throw new Error("Target must be a valid function");
        }
        if (!tableName || typeof tableName !== "string") {
            throw new Error("Table name must be a non-empty string");
        }

        const existing = this.entityStore.get(target);
        if (!existing) {
            this.entityStore.set(target, {
                tableName,
                columns: [],
                primaryKeys: [],
                relations: [],
            });
        } else {
            existing.tableName = tableName;
        }
    }

    /**
     * Adds a column to the entity's metadata.
     * Automatically registers the entity if it hasn't been added.
     */
    addColumn(target: object, propertyKey: string, options: ColumnOptions = {}): void {
        if (!target || typeof target.constructor !== "function") {
            throw new Error("Invalid target provided");
        }
        if (!propertyKey || typeof propertyKey !== "string") {
            throw new Error("Property key must be a non-empty string");
        }

        const ctor = target.constructor as EntityConstructor;
        if (!this.entityStore.has(ctor)) {
            this.addEntity(ctor, ctor.name.toLowerCase());
        }

        const entity = this.entityStore.get(ctor)!;
        entity.columns.push({propertyKey, ...options});
    }

    /**
     * Marks a column as a primary key and registers it as a column.
     */
    addPrimaryKey(target: object, propertyKey: string, options: ColumnOptions = {}): void {
        this.addColumn(target, propertyKey, options);

        const ctor = target.constructor as EntityConstructor;
        const entity = this.entityStore.get(ctor)!;
        entity.primaryKeys.push(propertyKey);
    }

    /**
     * Returns the metadata for the given entity constructor,
     * or undefined if not registered.
     */
    getMetadata(target: EntityConstructor): EntityMetadata | undefined {
        return this.entityStore.get(target);
    }

    /**
     * Adds relation metadata to the target entity.
     * Throws if the entity was not registered with @Entity.
     */
    addRelation(target: object, propertyKey: string, relation: RelationMetadata): void {
        if (!target || typeof target.constructor !== "function") {
            throw new Error("Invalid target provided");
        }
        if (!propertyKey || typeof propertyKey !== "string") {
            throw new Error("Property key must be a non-empty string");
        }
        if (!relation || typeof relation !== "object") {
            throw new Error("Relation must be an object");
        }

        const entity = this.entityStore.get(target.constructor as EntityConstructor);
        if (!entity) {
            throw new Error(
                `Class ${target.constructor.name} is not marked with @Entity`
            );
        }

        entity.relations.push(relation);
    }

    /**
     * Clears all stored metadata. For testing purposes.
     */
    clear(): void {
        this.entityStore.clear();
    }
}

export const MetadataStorage = MetadataStorageImpl.getInstance();

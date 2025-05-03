// metadata-storage.ts


import {EntityMetadata} from "@/metadata/types/Entity.metadata.types";
import {RelationMetadata} from "@/metadata/types/Relation.metadata.types";
/**
 * Internal store for entity metadata.
 * Maps class constructors to their metadata definitions.
 */
const entityStore = new Map<Function, EntityMetadata>();
/**
 * MetadataStorage is a singleton-like utility object
 * that collects and stores metadata about entities, columns,
 * primary keys, and relations.
 */
export const MetadataStorage = {
    /**
     * Registers a new entity with a given table name.
     * If the entity already exists, updates its table name.
     *
     * @param target - The entity's constructor function.
     * @param tableName - The database table name for this entity.
     */
    addEntity(target: Function, tableName: string) {
        const existing = entityStore.get(target);
        if (!existing) {
            entityStore.set(target, {
                tableName,
                columns: [],
                primaryKeys: []
            });
        } else {
            existing.tableName = tableName; // in case it was auto-created early
        }
    },
    /**
     * Adds a column to the entity's metadata.
     * Automatically registers the entity if it hasn't been added.
     *
     * @param target - The prototype of the class the column belongs to.
     * @param propertyKey - The property name of the column.
     * @param options - Optional column settings like name and type.
     */
    addColumn(target: Object, propertyKey: string, options: any = {}) {
        const ctor = target.constructor;
        if (!entityStore.has(ctor)) {
            this.addEntity(ctor, ctor.name.toLowerCase()); // fallback auto-register
        }

        const entity = entityStore.get(ctor)!;
        entity.columns.push({ propertyKey, ...options });
    },
    /**
     * Marks a column as a primary key and adds it to the entity's metadata.
     * Also ensures the column is registered.
     *
     * @param target - The prototype of the class the key belongs to.
     * @param propertyKey - The property name acting as primary key.
     * @param options - Optional column options.
     */
    addPrimaryKey(target: Object, propertyKey: string, options: any = {}) {
        const ctor = target.constructor;
        if (!entityStore.has(ctor)) {
            this.addEntity(ctor, ctor.name.toLowerCase());
        }

        const entity = entityStore.get(ctor)!;
        entity.primaryKeys.push(propertyKey);
        this.addColumn(target, propertyKey, options);
    },
    /**
     * Marks a column as a primary key and adds it to the entity's metadata.
     * Also ensures the column is registered.
     *
     * @param target - The prototype of the class the key belongs to.
     * @param propertyKey - The property name acting as primary key.
     * @param options - Optional column options.
     */
    getMetadata(target: Function): EntityMetadata | undefined {
        return entityStore.get(target);
    },
    /**
     * Adds relation metadata to the target entity.
     * Throws an error if the entity was not registered beforehand.
     *
     * @param target - The prototype of the class.
     * @param propertyKey - The property name that defines the relation.
     * @param relation - Metadata describing the relation.
     */
    addRelation(target: Object, propertyKey: string, relation: RelationMetadata) {
        const entity = entityStore.get(target.constructor);
        if (!entity) throw new Error(`Class ${target.constructor.name} is not marked with @Entity`);

        if (!("relations" in entity)) {
            (entity as any).relations = [];
        }

        (entity as any).relations.push(relation);

    }
};


// import {Entity} from "@/decorators/entity/Entity.decorator";
// import {PrimaryKey} from "@/decorators/column/PrimaryKey.decorator";
// import {Column} from "@/decorators/column/Column.decorator";

// @Entity("users")
// class User {
//     @PrimaryKey({ type: "uuid" })
//     id: string;
//
//     @Column({ name: "user_name", type: "varchar" })
//     name: string;
//
//     @Column({ type: "int" })
//     age: number;
// }
//
// const userMetadata = MetadataStorage.getMetadata(User);
// console.log(JSON.stringify(userMetadata, null, 2));

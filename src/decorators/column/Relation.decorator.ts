import {MetadataStorage} from "@/metadata/metadata-storage";
import {RelationMetadata, RelationOptions, RelationType} from "@/metadata/types/Relation.metadata.types";

/**
 * Factory function to create decorators for entity relationships.
 *
 * @param type - The type of the relation ("OneToOne", "OneToMany", etc.)
 * @returns A property decorator that stores relation metadata.
 */
function createRelationDecorator(type: RelationType) {
    return (
        targetEntity: () => Function,
        inverseSide?: string,
        options?: RelationOptions
    ): PropertyDecorator => {
        return (target, propertyKey) => {
            const relation: RelationMetadata = {
                type,
                targetEntity,
                propertyKey: propertyKey.toString(),
                inverseSide,
                options
            };

            MetadataStorage.addRelation(target, propertyKey.toString(), relation);
        };
    };
}

export const OneToOne = createRelationDecorator("OneToOne");
export const OneToMany = createRelationDecorator("OneToMany");
export const ManyToOne = createRelationDecorator("ManyToOne");
export const ManyToMany = createRelationDecorator("ManyToMany");
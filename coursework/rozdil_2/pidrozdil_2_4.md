# 2.4 Реєстр метаданих і шар декораторів

<!-- Що описати:
  - DefaultMetadataStorage як глобальний реєстр (mapping Entity class → EntityMetadata)
  - Структури: EntityMetadata, ColumnMetadata, RelationMetadata
  - Декоратори @Entity / @Column / @PrimaryKey / @ManyToOne / @OneToMany / @OneToOne / @ManyToMany
  - Lazy thunks для відношень () => TargetClass (обхід циклічних імпортів)
  - Prototype-chain inheritance (колонки базового класу видимі в нащадках)
  - Атомарне flushing метаданих у @Entity (декоратори полів складають pending state)
-->

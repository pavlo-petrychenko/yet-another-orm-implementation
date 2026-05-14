# 3.5 BaseModel (Active Record)

<!-- Що описати:
  - Що дає extends BaseModel (статичні find/findOne, instance save/delete/reload)
  - Як працює "магія" статичних методів (через BaseModelStatic + this-параметризацію)
  - Зв'язок з глобальним DataSource (setDataSource)
  - Інтеграція з ambient-транзакцією
  - Приклад: оголошення сутності User extends BaseModel і використання User.find({...})

  УВАГА: BaseModel/BaseModelStatic не чіпати без явного дозволу — це збережено в feedback memory.
-->

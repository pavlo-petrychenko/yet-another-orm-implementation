# 2.6 Стратегія типобезпеки

<!-- Що описати:
  - Принцип: відсутність any у публічному API, narrow generics на кожній стадії
  - FindArgs<T>, FindOneArgs<T>, Where<T>, WhereOperators<T>
  - Рекурсивні IncludeConfig<T> для типобезпечних eager-joins довільної глибини
  - Strict<T> для попередження зайвих полів у where/select
  - Як return type вузько виводиться від include (joined-shape)
  - Trade-off: ускладнення внутрішніх типів заради чистого DX
-->

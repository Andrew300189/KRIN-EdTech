CREATE TABLE "philology_facts" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "characterEmotion" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "philology_facts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "philology_fact_views" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "factId" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "localDate" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "philology_fact_views_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "philology_fact_views_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "philology_fact_views_factId_fkey"
    FOREIGN KEY ("factId") REFERENCES "philology_facts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "philology_facts_isActive_category_idx" ON "philology_facts"("isActive", "category");
CREATE INDEX "philology_fact_views_userId_context_createdAt_idx" ON "philology_fact_views"("userId", "context", "createdAt");
CREATE INDEX "philology_fact_views_userId_localDate_context_idx" ON "philology_fact_views"("userId", "localDate", "context");

-- Editorial starter set. Fixed ids make this migration safely repeatable in
-- restored environments and let future content tools update individual facts.
INSERT INTO "philology_facts" ("id", "text", "category", "characterEmotion", "updatedAt") VALUES
  ('lily-vauxhall', 'А ты знала, что слово «вокзал» произошло от английского Vauxhall — названия парка развлечений под Лондоном? Путешественники так впечатлились, что стали называть так крупные станции.', 'PHILOLOGY', 'SURPRISED', CURRENT_TIMESTAMP),
  ('lily-guugu-yimithirr', 'В языке гугу-имитирр нет привычных «право» и «лево»: там говорят только сторонами света. Можно услышать: «у тебя на северном плече муха».', 'LANGUAGES', 'SURPRISED', CURRENT_TIMESTAMP),
  ('lily-alphabet', 'Буква W когда-то считалась просто двойной U. Её английское имя до сих пор это помнит: double u.', 'PHILOLOGY', 'THOUGHTFUL', CURRENT_TIMESTAMP),
  ('lily-emoji', 'Слово emoji не связано с английским emotion: оно пришло из японского, где e — «картинка», а moji — «знак».', 'LANGUAGES', 'SURPRISED', CURRENT_TIMESTAMP),
  ('lily-shakespeare', 'Шекспир не только писал пьесы: ему часто приписывают сотни новых английских слов и выражений, которые закрепились в языке.', 'LITERATURE', 'JOYFUL', CURRENT_TIMESTAMP),
  ('lily-translation', 'У хорошего перевода есть две верности: словам оригинала и тому впечатлению, которое эти слова создают у читателя.', 'LANGUAGES', 'THOUGHTFUL', CURRENT_TIMESTAMP),
  ('lily-palindrome', 'Палиндром читается одинаково в обе стороны. В английском известен пример: «Never odd or even».', 'PHILOLOGY', 'JOYFUL', CURRENT_TIMESTAMP),
  ('lily-borges', 'Хорхе Луис Борхес представлял библиотеку как бесконечный мир: у каждой книги есть соседняя, которая меняет смысл предыдущей.', 'LITERATURE', 'THOUGHTFUL', CURRENT_TIMESTAMP),
  ('lily-idiom', 'Идиомы редко переводятся слово в слово: английское «break the ice» — не про лёд, а про первый шаг в неловком разговоре.', 'LANGUAGES', 'JOYFUL', CURRENT_TIMESTAMP),
  ('lily-manuscript', 'У многих классиков рукописи выглядели как карты: стрелки, вычёркивания и поля часто рассказывают о замысле не меньше готовой страницы.', 'LITERATURE', 'THOUGHTFUL', CURRENT_TIMESTAMP),
  ('lily-etymology', 'Этимология — это не поиск «единственного истинного значения», а история того, как слово путешествовало между людьми и эпохами.', 'PHILOLOGY', 'THOUGHTFUL', CURRENT_TIMESTAMP),
  ('lily-bilingual', 'Двуязычные люди нередко выбирают язык эмоций по ситуации: язык детства может звучать теплее, а язык учёбы — точнее.', 'LANGUAGES', 'JOYFUL', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

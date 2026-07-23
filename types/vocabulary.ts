export interface VocabularyWord {
  id: string;
  word: string;
  translation: string;
  example?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

import { vocabularyApi } from './vocabulary.api';

export async function fetchVocabulary() {
  return vocabularyApi.list();
}

export async function fetchReviewCount() {
  return vocabularyApi.review();
}

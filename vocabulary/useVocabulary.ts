import { useEffect, useState } from 'react';
import { fetchVocabulary, fetchReviewCount } from './vocabulary.service';

export default function useVocabulary() {
  const [words, setWords] = useState<any[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [vocabResponse, reviewResponse] = await Promise.all([fetchVocabulary(), fetchReviewCount()]);
      setWords(vocabResponse.words ?? []);
      setReviewCount(reviewResponse.reviewCount ?? 0);
      setLoading(false);
    }

    loadData();
  }, []);

  return { words, reviewCount, loading };
}

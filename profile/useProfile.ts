import { useEffect, useState } from 'react';
import { fetchProfile } from './profile.service';

export default function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const response = await fetchProfile();
      setProfile(response.profile ?? null);
      setLoading(false);
    }

    loadProfile();
  }, []);

  return { profile, loading };
}

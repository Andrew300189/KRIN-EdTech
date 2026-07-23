import { profileApi } from './profile.api';

export async function fetchProfile() {
  return profileApi.getProfile();
}

export async function updateUserProfile(payload: unknown) {
  return profileApi.updateProfile(payload);
}

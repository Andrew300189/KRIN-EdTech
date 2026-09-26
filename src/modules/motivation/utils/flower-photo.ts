import photos from "./flower-photos.json";

export type FlowerPhoto = {
  src: string;
  artist: string;
  license: string;
  licenseUrl: string;
  source: string;
  note?: { en: string; ru: string; uk: string };
};

const photoById = photos as Record<string, FlowerPhoto>;

export function flowerPhotoById(id: string | null | undefined): FlowerPhoto | null {
  return id ? photoById[id] ?? null : null;
}

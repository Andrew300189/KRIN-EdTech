"use client";

/* Profile photos may be HTTPS URLs or database-backed data URLs. */
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type UserProfile = {
  firstName: string;
  lastName: string | null;
  email: string;
  avatar: string | null;
  interfaceLanguage: string;
  timeZone: string;
  country: string | null;
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
  { value: "ru", label: "Русский" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const COMMON_TIME_ZONES = [
  "UTC",
  "Europe/Kyiv",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
];

function initials(profile: UserProfile | null) {
  if (!profile) return "?";
  return `${profile.firstName[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load profile.");
        }
        setProfile(payload.profile);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const avatarLabel = useMemo(
    () => (profile ? `Profile photo for ${profile.firstName}` : "Profile photo"),
    [profile],
  );

  const updateProfile = <Key extends keyof UserProfile>(
    key: Key,
    value: UserProfile[Key],
  ) => {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
    setSuccess("");
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/) || file.size > 2 * 1024 * 1024) {
      setError("Choose a PNG, JPEG, WEBP or GIF image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateProfile("avatar", reader.result);
        setError("");
      }
    };
    reader.onerror = () => setError("The selected image could not be read.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName ?? "",
          interfaceLanguage: profile.interfaceLanguage,
          timeZone: profile.timeZone,
          country: profile.country ?? "",
          avatar: profile.avatar,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save profile changes.");
      }
      setProfile(payload.profile);
      setSuccess("Profile saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading profile…</p>;
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error || "Unable to load profile."}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Profile settings</h2>
        <p className="mt-2 text-slate-600">
          Manage your personal details and application preferences.
        </p>
      </div>

      <form
        className="space-y-6 rounded-xl bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <section className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
          {profile.avatar ? (
            <img
              alt={avatarLabel}
              className="h-24 w-24 rounded-full border border-slate-200 object-cover"
              src={profile.avatar}
            />
          ) : (
            <div
              aria-label={avatarLabel}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary"
            >
              {initials(profile)}
            </div>
          )}

          <div className="space-y-2">
            <p className="font-medium text-slate-900">Profile photo</p>
            <div className="flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                Choose photo
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={handlePhotoChange}
                  type="file"
                />
              </label>
              {profile.avatar ? (
                <button
                  className="rounded-full px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  onClick={() => updateProfile("avatar", null)}
                  type="button"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
            <p className="text-sm text-slate-500">PNG, JPEG, WEBP or GIF, up to 2 MB.</p>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="font-medium text-slate-900" htmlFor="firstName">
              First name
            </label>
            <input
              className="form-control w-full"
              id="firstName"
              maxLength={80}
              onChange={(event) => updateProfile("firstName", event.target.value)}
              required
              value={profile.firstName}
            />
          </div>

          <div className="space-y-2">
            <label className="font-medium text-slate-900" htmlFor="lastName">
              Last name
            </label>
            <input
              className="form-control w-full"
              id="lastName"
              maxLength={80}
              onChange={(event) => updateProfile("lastName", event.target.value || null)}
              value={profile.lastName ?? ""}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="font-medium text-slate-900" htmlFor="email">
              Email
            </label>
            <input
              aria-describedby="email-help"
              className="form-control w-full cursor-not-allowed bg-slate-100 text-slate-500"
              disabled
              id="email"
              type="email"
              value={profile.email}
            />
            <p className="text-sm text-slate-500" id="email-help">
              Your email is provided by the sign-in method and cannot be changed here.
            </p>
          </div>
        </section>

        <section className="grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="font-medium text-slate-900" htmlFor="interfaceLanguage">
              Interface language
            </label>
            <select
              className="form-control w-full"
              id="interfaceLanguage"
              onChange={(event) => updateProfile("interfaceLanguage", event.target.value)}
              value={profile.interfaceLanguage}
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-slate-900" htmlFor="timeZone">
              Time zone
            </label>
            <input
              className="form-control w-full"
              id="timeZone"
              list="time-zone-options"
              onChange={(event) => updateProfile("timeZone", event.target.value)}
              required
              value={profile.timeZone}
            />
            <datalist id="time-zone-options">
              {COMMON_TIME_ZONES.map((timeZone) => (
                <option key={timeZone} value={timeZone} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="font-medium text-slate-900" htmlFor="country">
              Country
            </label>
            <input
              autoComplete="country-name"
              className="form-control w-full"
              id="country"
              maxLength={100}
              onChange={(event) => updateProfile("country", event.target.value || null)}
              placeholder="For example, Ukraine"
              value={profile.country ?? ""}
            />
          </div>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">
            {success}
          </p>
        ) : null}

        <button
          className="btn btn-primary rounded-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

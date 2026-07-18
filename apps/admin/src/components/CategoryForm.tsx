"use client";

import { useState, type FormEvent } from "react";

import type { CategoryInput, CategoryOut } from "@/types/api";

import styles from "./ui.module.css";

interface CategoryFormProps {
  initialCategory?: CategoryOut | undefined;
  onCancel: () => void;
  onSubmit: (payload: CategoryInput) => Promise<void>;
}

interface FormState {
  slug: string;
  name: string;
  description: string;
}

function toFormState(category: CategoryOut | undefined): FormState {
  if (!category) return { slug: "", name: "", description: "" };
  return { slug: category.slug, name: category.name, description: category.description };
}

export function CategoryForm({ initialCategory, onCancel, onSubmit }: CategoryFormProps) {
  const [form, setForm] = useState<FormState>(toFormState(initialCategory));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.formGrid}>
        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <label className={styles.formLabel} htmlFor="category-name">
            Name
          </label>
          <input
            id="category-name"
            className={styles.input}
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Glasses"
          />
        </div>

        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <label className={styles.formLabel} htmlFor="category-slug">
            Slug
          </label>
          <input
            id="category-slug"
            className={styles.input}
            required
            value={form.slug}
            onChange={(event) => update("slug", event.target.value)}
            placeholder="glasses"
          />
          <span className={styles.helperText}>Lowercase, unique identifier used by the API and app.</span>
        </div>

        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <label className={styles.formLabel} htmlFor="category-description">
            Description
          </label>
          <textarea
            id="category-description"
            className={styles.textarea}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Eyewear and sunglasses you can try on live."
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={isSubmitting}>
          {isSubmitting ? <span className={styles.spinner} /> : null}
          {initialCategory ? "Save changes" : "Create category"}
        </button>
      </div>
    </form>
  );
}

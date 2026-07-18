"use client";

import { useState, type FormEvent } from "react";

import { TRYON_MODEL_KEYS } from "@/types/api";
import type { CategoryOut, ProductInput, ProductOut } from "@/types/api";

import styles from "./ui.module.css";

interface ProductFormProps {
  categories: CategoryOut[];
  initialProduct?: ProductOut | undefined;
  onCancel: () => void;
  onSubmit: (payload: ProductInput) => Promise<void>;
}

interface FormState {
  category_id: string;
  name: string;
  brand: string;
  color: string;
  description: string;
  price: string;
  currency: string;
  tryon_model_key: string;
  preview_url: string;
  is_active: boolean;
}

function toFormState(product: ProductOut | undefined, defaultCategoryId: string): FormState {
  if (!product) {
    return {
      category_id: defaultCategoryId,
      name: "",
      brand: "",
      color: "",
      description: "",
      price: "",
      currency: "USD",
      tryon_model_key: TRYON_MODEL_KEYS[0],
      preview_url: "",
      is_active: true,
    };
  }
  return {
    category_id: String(product.category_id),
    name: product.name,
    brand: product.brand,
    color: product.color,
    description: product.description,
    price: (product.price_cents / 100).toFixed(2),
    currency: product.currency,
    tryon_model_key: product.tryon_model_key,
    preview_url: product.preview_url,
    is_active: product.is_active,
  };
}

export function ProductForm({ categories, initialProduct, onCancel, onSubmit }: ProductFormProps) {
  const defaultCategoryId = categories[0] ? String(categories[0].id) : "";
  const [form, setForm] = useState<FormState>(toFormState(initialProduct, defaultCategoryId));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const priceValue = Number.parseFloat(form.price);
    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setError("Please enter a valid, non-negative price.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        category_id: Number.parseInt(form.category_id, 10),
        name: form.name.trim(),
        brand: form.brand.trim(),
        color: form.color.trim(),
        description: form.description.trim(),
        price_cents: Math.round(priceValue * 100),
        currency: form.currency.trim().toUpperCase() || "USD",
        tryon_model_key: form.tryon_model_key,
        preview_url: form.preview_url.trim(),
        is_active: form.is_active,
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
          <label className={styles.formLabel} htmlFor="product-name">
            Name
          </label>
          <input
            id="product-name"
            className={styles.input}
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Aviator Classic"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="product-category">
            Category
          </label>
          <select
            id="product-category"
            className={styles.select}
            required
            value={form.category_id}
            onChange={(event) => update("category_id", event.target.value)}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="product-tryon">
            Try-on model
          </label>
          <select
            id="product-tryon"
            className={styles.select}
            required
            value={form.tryon_model_key}
            onChange={(event) => update("tryon_model_key", event.target.value)}
          >
            {TRYON_MODEL_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="product-brand">
            Brand
          </label>
          <input
            id="product-brand"
            className={styles.input}
            value={form.brand}
            onChange={(event) => update("brand", event.target.value)}
            placeholder="VisionCart"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="product-color">
            Color
          </label>
          <input
            id="product-color"
            className={styles.input}
            value={form.color}
            onChange={(event) => update("color", event.target.value)}
            placeholder="Gold"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="product-price">
            Price
          </label>
          <input
            id="product-price"
            className={styles.input}
            required
            inputMode="decimal"
            value={form.price}
            onChange={(event) => update("price", event.target.value)}
            placeholder="129.00"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="product-currency">
            Currency
          </label>
          <input
            id="product-currency"
            className={styles.input}
            required
            maxLength={3}
            value={form.currency}
            onChange={(event) => update("currency", event.target.value)}
            placeholder="USD"
          />
        </div>

        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <label className={styles.formLabel} htmlFor="product-preview">
            Preview image URL
          </label>
          <input
            id="product-preview"
            className={styles.input}
            value={form.preview_url}
            onChange={(event) => update("preview_url", event.target.value)}
            placeholder="https://cdn.visioncart.dev/previews/…"
          />
        </div>

        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <label className={styles.formLabel} htmlFor="product-description">
            Description
          </label>
          <textarea
            id="product-description"
            className={styles.textarea}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Timeless aviator frames with a lightweight metal build."
          />
        </div>

        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => update("is_active", event.target.checked)}
            />
            Active (visible in the storefront catalog)
          </label>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={isSubmitting}>
          {isSubmitting ? <span className={styles.spinner} /> : null}
          {initialProduct ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

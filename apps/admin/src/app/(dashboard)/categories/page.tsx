"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "@/lib/apiClient";
import { CategoryInput, CategoryOut } from "@/types/api";
import { CategoryForm } from "@/components/CategoryForm";
import { Modal } from "@/components/Modal";

import styles from "@/components/ui.module.css";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryOut | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCategories(await fetchCategories());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingCategory(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (category: CategoryOut) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (payload: CategoryInput) => {
    if (editingCategory) {
      const updated = await updateCategory(editingCategory.id, payload);
      setCategories((prev) => prev.map((category) => (category.id === updated.id ? updated : category)));
    } else {
      const created = await createCategory(payload);
      setCategories((prev) => [...prev, created]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (category: CategoryOut) => {
    if (!window.confirm(`Delete category "${category.name}"? Products must be moved first.`)) return;
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Failed to delete category.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Categories</h1>
          <p className={styles.pageSubtitle}>Organize products into try-on categories.</p>
        </div>
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={openCreateModal}>
          + New category
        </button>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.loadingState}>Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>No categories yet. Create your first category to get started.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{category.description || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSm}`}
                          onClick={() => openEditModal(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonDanger} ${styles.buttonSm}`}
                          disabled={deletingId === category.id}
                          onClick={() => handleDelete(category)}
                        >
                          {deletingId === category.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <Modal title={editingCategory ? "Edit category" : "New category"} onClose={closeModal}>
          <CategoryForm initialCategory={editingCategory} onCancel={closeModal} onSubmit={handleSubmit} />
        </Modal>
      ) : null}
    </div>
  );
}

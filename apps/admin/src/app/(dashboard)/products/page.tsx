"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  updateProduct,
} from "@/lib/apiClient";
import { CategoryOut, ProductInput, ProductOut } from "@/types/api";
import { Modal } from "@/components/Modal";
import { ProductForm } from "@/components/ProductForm";

import styles from "@/components/ui.module.css";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductOut | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const category of categories) map.set(category.id, category.name);
    return map;
  }, [categories]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productList, categoryList] = await Promise.all([fetchProducts(), fetchCategories()]);
      setProducts(productList);
      setCategories(categoryList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductOut) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (payload: ProductInput) => {
    if (editingProduct) {
      const updated = await updateProduct(editingProduct.id, payload);
      setProducts((prev) => prev.map((product) => (product.id === updated.id ? updated : product)));
    } else {
      const created = await createProduct(payload);
      setProducts((prev) => [created, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (product: ProductOut) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Failed to delete product.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Products</h1>
          <p className={styles.pageSubtitle}>Manage the catalog customers see in the VisionCart app.</p>
        </div>
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={openCreateModal}>
          + New product
        </button>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.loadingState}>Loading products…</div>
        ) : products.length === 0 ? (
          <div className={styles.emptyState}>No products yet. Create your first product to get started.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Color</th>
                  <th>Price</th>
                  <th>Try-on model</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{categoryNameById.get(product.category_id) ?? "—"}</td>
                    <td>{product.brand || "—"}</td>
                    <td>{product.color || "—"}</td>
                    <td>{formatPrice(product.price_cents, product.currency)}</td>
                    <td>{product.tryon_model_key}</td>
                    <td>
                      <span className={`${styles.badge} ${product.is_active ? styles.badgeSuccess : styles.badgeMuted}`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSm}`}
                          onClick={() => openEditModal(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonDanger} ${styles.buttonSm}`}
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product)}
                        >
                          {deletingId === product.id ? "Deleting…" : "Delete"}
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
        <Modal title={editingProduct ? "Edit product" : "New product"} onClose={closeModal}>
          <ProductForm
            categories={categories}
            initialProduct={editingProduct}
            onCancel={closeModal}
            onSubmit={handleSubmit}
          />
        </Modal>
      ) : null}
    </div>
  );
}

"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

import { ApiError, fetchOrders, updateOrderStatus } from "@/lib/apiClient";
import { ORDER_STATUSES, OrderOut, OrderStatus } from "@/types/api";
import { StatusBadge } from "@/components/StatusBadge";

import styles from "@/components/ui.module.css";
import orderStyles from "./orders.module.css";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOrders(await fetchOrders());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpanded = (orderId: number) => {
    setExpandedId((prev) => (prev === orderId ? null : orderId));
  };

  const handleStatusChange = async (order: OrderOut, status: OrderStatus) => {
    if (status === order.status) return;
    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Failed to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Orders</h1>
          <p className={styles.pageSubtitle}>Review incoming orders and update fulfillment status.</p>
        </div>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.loadingState}>Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className={styles.emptyState}>No orders yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th />
                  <th>Order</th>
                  <th>Placed</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Update status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isExpanded = expandedId === order.id;
                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={orderStyles.orderRow}
                        onClick={() => toggleExpanded(order.id)}
                      >
                        <td>
                          <span
                            className={`${orderStyles.expandIcon} ${isExpanded ? orderStyles.expandIconOpen : ""}`}
                          >
                            ▸
                          </span>
                        </td>
                        <td>#{order.id}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>{order.ship_full_name}</td>
                        <td>{order.items.length}</td>
                        <td>{formatMoney(order.total_cents, order.currency)}</td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <select
                            className={orderStyles.statusSelect}
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={(event) => handleStatusChange(order, event.target.value as OrderStatus)}
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className={orderStyles.detailsRow}>
                          <td colSpan={8}>
                            <div className={orderStyles.detailsInner}>
                              <div className={orderStyles.detailsSection}>
                                <h3>Items</h3>
                                {order.items.map((item) => (
                                  <div key={item.id} className={orderStyles.itemRow}>
                                    <span className={orderStyles.itemName}>
                                      {item.product_name} × {item.quantity}
                                    </span>
                                    <span className={orderStyles.itemMeta}>
                                      {formatMoney(item.unit_price_cents * item.quantity, order.currency)}
                                    </span>
                                  </div>
                                ))}
                                <div className={orderStyles.totalsRow}>
                                  <span>Subtotal</span>
                                  <span>{formatMoney(order.subtotal_cents, order.currency)}</span>
                                </div>
                                <div className={orderStyles.totalsRow}>
                                  <span>Shipping</span>
                                  <span>{formatMoney(order.shipping_cents, order.currency)}</span>
                                </div>
                                <div className={`${orderStyles.totalsRow} ${orderStyles.totalsRowStrong}`}>
                                  <span>Total</span>
                                  <span>{formatMoney(order.total_cents, order.currency)}</span>
                                </div>
                              </div>
                              <div className={orderStyles.detailsSection}>
                                <h3>Shipping address</h3>
                                <p className={orderStyles.addressLine}>{order.ship_full_name}</p>
                                <p className={orderStyles.addressLine}>{order.ship_line1}</p>
                                {order.ship_line2 ? (
                                  <p className={orderStyles.addressLine}>{order.ship_line2}</p>
                                ) : null}
                                <p className={orderStyles.addressLine}>
                                  {order.ship_city}
                                  {order.ship_state ? `, ${order.ship_state}` : ""} {order.ship_postal_code}
                                </p>
                                <p className={orderStyles.addressLine}>{order.ship_country}</p>
                                <p className={orderStyles.addressLine}>{order.ship_phone}</p>
                                {order.notes ? (
                                  <>
                                    <h3 style={{ marginTop: 14 }}>Notes</h3>
                                    <p className={orderStyles.addressLine}>{order.notes}</p>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

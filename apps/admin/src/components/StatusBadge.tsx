import type { OrderStatus } from "@/types/api";

import styles from "./ui.module.css";

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: styles.badgeWarning ?? "",
  confirmed: styles.badgePrimary ?? "",
  shipped: styles.badgePrimary ?? "",
  delivered: styles.badgeSuccess ?? "",
  cancelled: styles.badgeDanger ?? "",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`${styles.badge ?? ""} ${STATUS_CLASS[status]}`}>{status}</span>;
}

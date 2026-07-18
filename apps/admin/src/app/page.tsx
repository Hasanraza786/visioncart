"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import styles from "@/components/ui.module.css";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? "/products" : "/login");
  }, [isLoading, isAuthenticated, router]);

  return <div className={styles.loadingState}>Loading…</div>;
}

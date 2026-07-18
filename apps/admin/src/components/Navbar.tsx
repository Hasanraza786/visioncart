"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import styles from "./Navbar.module.css";

const LINKS = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/orders", label: "Orders" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>VC</span>
            VisionCart Admin
          </div>
          <nav className={styles.nav}>
            {LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className={styles.right}>
          {user ? <span className={styles.userEmail}>{user.email}</span> : null}
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

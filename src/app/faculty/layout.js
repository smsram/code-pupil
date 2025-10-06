"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";
import Modal from "../components/Modal";
import Notification from "../components/Notification";
import LoadingOverlay from "../components/LoadingOverlay";
import "./style.css";

const FacultyLayout = ({ children }) => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Set default sidebar state based on screen width
  useEffect(() => {
    if (window.innerWidth > 768) {
      setSidebarCollapsed(false); // expanded by default on large screens
      setMobileMenuOpen(false);
    } else {
      setSidebarCollapsed(true); // collapsed on small screens
      setMobileMenuOpen(false);
    }
    setLoading(false);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarCollapsed(false); // keep sidebar visible
        setMobileMenuOpen(false); // hide mobile overlay
      } else {
        setSidebarCollapsed(true); // collapse sidebar on small screens
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth > 768) {
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      setMobileMenuOpen(!mobileMenuOpen);
    }
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const showNotification = (message, type = "info") => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications((prev) => [...prev, notification]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  return (
    <div className="app-container">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggle={toggleSidebar}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <main className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Header
          onToggleSidebar={toggleSidebar}
          onToggleMobileMenu={toggleMobileMenu}
          onShowNotification={showNotification}
        />

        <div className="content-container">
          <div className="content-wrapper">{children}</div>
        </div>
      </main>

      <LoadingOverlay active={loading} />

      <div id="notification-container">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
          />
        ))}
      </div>
    </div>
  );
};

export default FacultyLayout;

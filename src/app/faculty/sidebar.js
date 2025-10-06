"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const Sidebar = ({ collapsed, mobileOpen, onToggle, onMobileClose }) => {
  const pathname = usePathname(); // current path
  const [notificationCount] = useState(5);

  const navigationItems = [
    {
      title: "Dashboard",
      items: [
        {
          name: "Overview",
          path: "/faculty/",
          icon: (
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-11.25m15.75 0l.5 1.5m-.5-1.5l1 3m-6.5-3l1 3"
              />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Tests",
      items: [
        {
          name: "All Tests",
          path: "/faculty/tests",
          badge: 12,
          icon: (
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          ),
        },
        {
          name: "Create Test",
          path: "/faculty/create",
          icon: (
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Communication",
      items: [
        {
          name: "Messages",
          path: "/faculty/messages",
          badge: 3,
          icon: (
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          name: "Settings",
          path: "/faculty/settings",
          icon: (
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  const isActivePath = (path) => {
    // Default to /faculty/ if pathname is not available or is just /faculty
    if (!pathname || pathname === '/faculty') {
      return path === "/faculty/";
    }

    // Exact matches for single pages
    const exactPaths = ["/faculty/", "/faculty/settings", "/faculty/messages"];
    if (exactPaths.includes(path)) {
      return pathname === path;
    }

    // Parent sections like /faculty/tests highlight for subpaths
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : "expanded"} ${
        mobileOpen ? "mobile-open" : ""
      }`}
    >
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">CP</div>
          <div className="logo-text">Code Pupil</div>
        </div>
        <button className="sidebar-toggle" onClick={onToggle}>
          <svg className="icon" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25"
            />
          </svg>
        </button>
      </div>

      <nav className="nav-menu">
        {navigationItems.map((section, index) => (
          <div key={index} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item, itemIndex) => (
              <div key={itemIndex} className="nav-item">
                <Link
                  href={item.path}
                  className={`nav-link ${
                    isActivePath(item.path) ? "active" : ""
                  }`}
                  onClick={onMobileClose}
                >
                  {item.icon}
                  <span className="nav-text">{item.name}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              </div>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

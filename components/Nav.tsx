"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Calendar, LogOut } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();

  const tabs = [
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/calendar", label: "Calendar", icon: Calendar },
  ];

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-1">
        <span className="font-semibold text-gray-900 mr-4">TaskFlow</span>
        {tabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith(href)
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>
      <a
        href="/auth/logout"
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </a>
    </nav>
  );
}

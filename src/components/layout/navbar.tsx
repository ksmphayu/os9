'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileSpreadsheet,
  Clock,
  Settings,
  Shield,
  ChevronRight,
  Stamp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/filings/submit',
    label: 'ยื่นอากรแสตมป์',
    icon: FileSpreadsheet,
    description: 'นำส่งข้อมูลอากรแสตมป์',
  },
  {
    href: '/filings',
    label: 'ตรวจสอบสถานะ',
    icon: Clock,
    description: 'ติดตามผลการนำส่ง',
  },
  {
    href: '/settings',
    label: 'ตั้งค่าระบบ',
    icon: Settings,
    description: 'จัดการการตั้งค่า',
  },
  {
    href: '/certificate',
    label: 'จัดการใบรับรอง',
    icon: Shield,
    description: 'Digital Certificate',
  },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm print-exclude">
      <div className="max-w-[1800px] mx-auto px-4 lg:px-12 h-full flex items-center justify-between">
        {/* Brand */}
        <Link href="/filings/submit" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl thi-gradient flex items-center justify-center shadow-premium transition-transform group-hover:scale-105">
            <Stamp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[#003B95] text-sm leading-tight tracking-tight uppercase">
              ไทยประกันสุขภาพ
            </h1>
            <p className="text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase">
              E-STAMP FILING
            </p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/60 rounded-2xl p-1.5 border border-slate-200/50">
          {navItems.map((item) => {
            const isActive =
              item.href === '/filings'
                ? pathname === '/filings' || (pathname.startsWith('/filings/') && pathname !== '/filings/submit')
                : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-sm',
                    isActive
                      ? 'bg-white text-[#003B95] font-bold shadow-sm'
                      : 'text-slate-500 hover:text-[#003B95] hover:bg-white/60 font-medium'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-4 h-4',
                      isActive ? 'text-[#00AEEF]' : 'text-slate-400'
                    )}
                  />
                  <span className="tracking-tight text-[13px]">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Right info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)] animate-pulse" />
          <span className="hidden lg:block font-medium">ระบบพร้อมใช้งาน</span>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="shrink-0">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-500 bg-slate-100'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-primary transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-bold text-slate-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

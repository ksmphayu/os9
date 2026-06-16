'use client';

import { useState } from 'react';
import {
  Clock,
  Search,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import Link from 'next/link';

interface FilingRecord {
  apiRefNo: string;
  filingStatus?: string;
  paymentStatus?: string;
  checkedAt?: string;
  policyCount?: number;
}

function StatusBadge({ status, type }: { status?: string; type: 'filing' | 'payment' }) {
  if (!status) return <Badge variant="secondary">ไม่ทราบ</Badge>;

  const config: Record<string, { variant: 'success' | 'destructive' | 'processing' | 'secondary' | 'warning'; label: string }> = {
    SUCCESS: { variant: 'success', label: 'สำเร็จ' },
    COMPLETED: { variant: 'success', label: 'เสร็จสิ้น' },
    PAID: { variant: 'success', label: 'ชำระแล้ว' },
    PENDING: { variant: 'processing', label: 'รอดำเนินการ' },
    PROCESSING: { variant: 'processing', label: 'กำลังดำเนินการ' },
    FAILED: { variant: 'destructive', label: 'ล้มเหลว' },
    UNPAID: { variant: 'warning', label: 'ยังไม่ชำระ' },
  };

  const cfg = config[status.toUpperCase()] ?? { variant: 'secondary' as const, label: status };
  return (
    <Badge variant={cfg.variant}>
      {type === 'filing' ? <FileText className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
      {cfg.label}
    </Badge>
  );
}

export default function FilingsPage() {
  const { success, error: toastError } = useToast();
  const [records, setRecords] = useState<FilingRecord[]>([]);
  const [searchRef, setSearchRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchRef.trim()) return;
    setLoading(true);
    try {
      const [filing, payment] = await Promise.allSettled([
        api.checkFilingStatus(searchRef.trim()),
        api.checkPaymentStatus(searchRef.trim()),
      ]);

      const record: FilingRecord = {
        apiRefNo: searchRef.trim(),
        filingStatus: filing.status === 'fulfilled' ? filing.value.formStatus : 'ERROR',
        paymentStatus: payment.status === 'fulfilled' ? payment.value.paymentStatus : 'UNKNOWN',
        checkedAt: new Date().toISOString(),
      };

      setRecords((prev) => {
        const exists = prev.some((r) => r.apiRefNo === record.apiRefNo);
        if (exists) return prev.map((r) => (r.apiRefNo === record.apiRefNo ? record : r));
        return [record, ...prev];
      });
      success('ตรวจสอบสำเร็จ', `สถานะ: ${record.filingStatus}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toastError('ตรวจสอบล้มเหลว', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (apiRefNo: string) => {
    setChecking(apiRefNo);
    try {
      const [filing, payment] = await Promise.allSettled([
        api.checkFilingStatus(apiRefNo),
        api.checkPaymentStatus(apiRefNo),
      ]);

      setRecords((prev) =>
        prev.map((r) => {
          if (r.apiRefNo !== apiRefNo) return r;
          return {
            ...r,
            filingStatus: filing.status === 'fulfilled' ? filing.value.formStatus : r.filingStatus,
            paymentStatus: payment.status === 'fulfilled' ? payment.value.paymentStatus : r.paymentStatus,
            checkedAt: new Date().toISOString(),
          };
        })
      );
      success('อัปเดตสถานะสำเร็จ');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toastError('อัปเดตล้มเหลว', msg);
    } finally {
      setChecking(null);
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto px-4 lg:px-12 py-8">
      {/* Header */}
      <div className="page-header">
        <div className="page-icon">
          <Clock className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ตรวจสอบสถานะ</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            ติดตามสถานะการนำส่งและการชำระอากรแสตมป์
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="section-card mb-6">
        <h3 className="font-black text-slate-700 text-sm mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          ค้นหาด้วยรหัสอ้างอิง (API Ref No.)
        </h3>
        <div className="flex gap-3">
          <Input
            placeholder="กรอก API Ref No. เพื่อตรวจสอบสถานะ..."
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !searchRef.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            ตรวจสอบ
          </Button>
        </div>
      </div>

      {/* Records */}
      {records.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-slate-100 flex items-center justify-center">
            <Clock className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="font-black text-slate-400 text-lg">ยังไม่มีรายการ</h3>
          <p className="text-slate-400 text-sm mt-2">
            ค้นหาด้วย API Ref No. เพื่อตรวจสอบสถานะการนำส่ง
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.apiRefNo}
              className="glass-card rounded-2xl border border-slate-200 p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3 flex-1 min-w-0">
                  {/* Ref No */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">API Ref No.</span>
                    <span className="font-mono font-black text-primary text-sm">{record.apiRefNo}</span>
                  </div>

                  {/* Statuses */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">สถานะนำส่ง:</span>
                      <StatusBadge status={record.filingStatus} type="filing" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">สถานะชำระ:</span>
                      <StatusBadge status={record.paymentStatus} type="payment" />
                    </div>
                  </div>

                  {record.checkedAt && (
                    <p className="text-[10px] text-slate-400 font-medium">
                      ตรวจสอบล่าสุด: {new Date(record.checkedAt).toLocaleString('th-TH')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefresh(record.apiRefNo)}
                    disabled={checking === record.apiRefNo}
                  >
                    {checking === record.apiRefNo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    รีเฟรช
                  </Button>
                  <Link href={`/filings/${record.apiRefNo}`}>
                    <Button size="sm">
                      ดูรายละเอียด
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="mt-8 section-card bg-blue-50/50 border-blue-100">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-blue-700 text-sm mb-2">ขั้นตอนการชำระอากรแสตมป์</h4>
            <ol className="text-xs text-blue-600 space-y-1 font-medium list-decimal list-inside">
              <li>นำส่งข้อมูลผ่านหน้า "ยื่นอากรแสตมป์"</li>
              <li>ดาวน์โหลด Pay-In Slip และนำไปชำระเงินที่ธนาคาร</li>
              <li>รอธนาคารแจ้งผลการชำระเงินมายังกรมสรรพากร</li>
              <li>ตรวจสอบสถานะการชำระ (สถานะจะเปลี่ยนเป็น PAID)</li>
              <li>ดาวน์โหลดใบเสร็จรับเงินและแบบ อ.ส.9/อ.ส.4</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

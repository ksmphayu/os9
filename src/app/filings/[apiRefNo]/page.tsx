'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Receipt,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileDown,
  Stamp,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { cn, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/navbar';

interface FilingDetail {
  apiRefNo: string;
  filingStatus: string;
  paymentStatus: string;
  payInSlipPath?: string;
}

interface PolicyAction {
  policyNumber: string;
  formFilePath?: string;
  receiptFilePath?: string;
  formLoading?: boolean;
  receiptLoading?: boolean;
  formStatus?: string;
  receiptStatus?: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'success' | 'destructive' | 'processing' | 'secondary' | 'warning'; label: string; icon: React.ReactNode }> = {
    SUCCESS: { variant: 'success', label: 'สำเร็จ', icon: <CheckCircle2 className="w-3 h-3" /> },
    COMPLETED: { variant: 'success', label: 'เสร็จสิ้น', icon: <CheckCircle2 className="w-3 h-3" /> },
    PAID: { variant: 'success', label: 'ชำระแล้ว', icon: <CheckCircle2 className="w-3 h-3" /> },
    PENDING: { variant: 'processing', label: 'รอดำเนินการ', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    PROCESSING: { variant: 'processing', label: 'กำลังดำเนินการ', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    FAILED: { variant: 'destructive', label: 'ล้มเหลว', icon: <AlertCircle className="w-3 h-3" /> },
    UNPAID: { variant: 'warning', label: 'ยังไม่ชำระ', icon: <AlertCircle className="w-3 h-3" /> },
    UNKNOWN: { variant: 'secondary', label: 'ไม่ทราบ', icon: null },
    ERROR: { variant: 'destructive', label: 'ข้อผิดพลาด', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const cfg = config[status?.toUpperCase()] ?? { variant: 'secondary' as const, label: status, icon: null };
  return (
    <Badge variant={cfg.variant} className="gap-1.5">
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function PolicyActionRow({
  item,
  onDownloadForm,
  onDownloadReceipt,
}: {
  item: PolicyAction;
  onDownloadForm: (policyNumber: string) => void;
  onDownloadReceipt: (policyNumber: string) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-5 py-4">
        <span className="font-mono font-black text-primary text-sm">{item.policyNumber}</span>
      </td>
      <td className="px-5 py-4">
        {item.formStatus ? (
          <div className="flex items-center gap-2">
            {item.formFilePath ? (
              <a
                href={api.downloadFile(item.formFilePath)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
              >
                <FileDown className="w-3.5 h-3.5" />
                ดาวน์โหลดแบบ อ.ส.
              </a>
            ) : (
              <span className="text-xs text-slate-400">{item.formStatus}</span>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownloadForm(item.policyNumber)}
            disabled={item.formLoading}
          >
            {item.formLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            ขอแบบฟอร์ม
          </Button>
        )}
      </td>
      <td className="px-5 py-4">
        {item.receiptStatus ? (
          <div className="flex items-center gap-2">
            {item.receiptFilePath ? (
              <a
                href={api.downloadFile(item.receiptFilePath)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors border border-green-100"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลดใบเสร็จ
              </a>
            ) : (
              <span className="text-xs text-slate-400">{item.receiptStatus}</span>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownloadReceipt(item.policyNumber)}
            disabled={item.receiptLoading}
          >
            {item.receiptLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Receipt className="w-3.5 h-3.5" />
            )}
            ขอใบเสร็จ
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function FilingDetailPage() {
  const params = useParams();
  const apiRefNo = params.apiRefNo as string;
  const { success, error: toastError } = useToast();

  const [detail, setDetail] = useState<FilingDetail>({
    apiRefNo,
    filingStatus: 'LOADING',
    paymentStatus: 'LOADING',
  });
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<PolicyAction[]>([]);
  const [newPolicyNumber, setNewPolicyNumber] = useState('');
  const [slipDownloading, setSlipDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [filing, payment] = await Promise.allSettled([
        api.checkFilingStatus(apiRefNo),
        api.checkPaymentStatus(apiRefNo),
      ]);
      setDetail({
        apiRefNo,
        filingStatus: filing.status === 'fulfilled' ? filing.value.formStatus : 'ERROR',
        paymentStatus: payment.status === 'fulfilled' ? payment.value.paymentStatus : 'UNKNOWN',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [apiRefNo]);

  const handleDownloadForm = async (policyNumber: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.policyNumber === policyNumber ? { ...p, formLoading: true } : p))
    );
    try {
      const res = await api.triggerFormDownload(policyNumber);
      setPolicies((prev) =>
        prev.map((p) =>
          p.policyNumber === policyNumber
            ? { ...p, formLoading: false, formFilePath: res.formFilePath, formStatus: 'ready' }
            : p
        )
      );
      success('เตรียมแบบฟอร์มสำเร็จ', 'คลิกลิงก์เพื่อดาวน์โหลด');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      setPolicies((prev) =>
        prev.map((p) =>
          p.policyNumber === policyNumber
            ? { ...p, formLoading: false, formStatus: 'error' }
            : p
        )
      );
      toastError('ดาวน์โหลดล้มเหลว', msg);
    }
  };

  const handleDownloadReceipt = async (policyNumber: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.policyNumber === policyNumber ? { ...p, receiptLoading: true } : p))
    );
    try {
      const res = await api.triggerReceiptDownload(policyNumber);
      setPolicies((prev) =>
        prev.map((p) =>
          p.policyNumber === policyNumber
            ? { ...p, receiptLoading: false, receiptFilePath: res.receiptFilePath, receiptStatus: 'ready' }
            : p
        )
      );
      success('เตรียมใบเสร็จสำเร็จ', 'คลิกลิงก์เพื่อดาวน์โหลด');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      setPolicies((prev) =>
        prev.map((p) =>
          p.policyNumber === policyNumber
            ? { ...p, receiptLoading: false, receiptStatus: 'error' }
            : p
        )
      );
      toastError('ดาวน์โหลดล้มเหลว', msg);
    }
  };

  const handleDownloadSlip = async () => {
    setSlipDownloading(true);
    try {
      const res = await api.triggerPayInSlipDownload(apiRefNo);
      const url = api.downloadFile(res.payInSlipPath);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payin-slip-${apiRefNo}.pdf`;
      a.click();
      success('ดาวน์โหลด Pay-In Slip สำเร็จ');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toastError('ดาวน์โหลดล้มเหลว', msg);
    } finally {
      setSlipDownloading(false);
    }
  };

  const addPolicy = () => {
    const pn = newPolicyNumber.trim();
    if (!pn || policies.some((p) => p.policyNumber === pn)) return;
    setPolicies((prev) => [...prev, { policyNumber: pn }]);
    setNewPolicyNumber('');
  };

  const copyRef = () => {
    navigator.clipboard.writeText(apiRefNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[1800px] mx-auto px-4 lg:px-12 py-8">
      <Breadcrumb
        items={[
          { label: 'ตรวจสอบสถานะ', href: '/filings' },
          { label: apiRefNo },
        ]}
      />

      {/* Header */}
      <div className="page-header">
        <div className="page-icon">
          <Stamp className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 truncate">รายละเอียดการนำส่ง</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-primary text-sm">{apiRefNo}</span>
            <button onClick={copyRef} className="text-slate-400 hover:text-primary transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          รีเฟรช
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="section-card">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">สถานะนำส่ง</span>
          </div>
          {loading ? (
            <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <StatusBadge status={detail.filingStatus} />
          )}
        </div>

        <div className="section-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">สถานะการชำระ</span>
          </div>
          {loading ? (
            <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <StatusBadge status={detail.paymentStatus} />
          )}
        </div>

        <div className="section-card sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Pay-In Slip</span>
          </div>
          <Button size="sm" onClick={handleDownloadSlip} disabled={slipDownloading} className="w-full">
            {slipDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            ดาวน์โหลด Pay-In Slip
          </Button>
        </div>
      </div>

      {/* Receipt & Form download section */}
      <div className="section-card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            ดาวน์โหลดใบเสร็จและแบบ อ.ส.
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            กรอกเลขกรมธรรม์เพื่อดาวน์โหลดเอกสาร
          </p>
        </div>

        {/* Add policy */}
        <div className="flex gap-2 mb-4">
          <input
            value={newPolicyNumber}
            onChange={(e) => setNewPolicyNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPolicy()}
            placeholder="กรอกเลขกรมธรรม์..."
            className="flex-1 h-10 px-3 rounded-xl border-2 border-slate-200 text-sm font-medium focus:border-primary outline-none transition-colors"
          />
          <Button onClick={addPolicy} disabled={!newPolicyNumber.trim()}>
            เพิ่ม
          </Button>
        </div>

        {policies.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">กรอกเลขกรมธรรม์เพื่อดาวน์โหลดเอกสาร</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="data-table">
              <thead>
                <tr>
                  <th>เลขกรมธรรม์</th>
                  <th>แบบ อ.ส. (อ.ส.9 / อ.ส.4)</th>
                  <th>ใบเสร็จรับเงิน</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((item) => (
                  <PolicyActionRow
                    key={item.policyNumber}
                    item={item}
                    onDownloadForm={handleDownloadForm}
                    onDownloadReceipt={handleDownloadReceipt}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help info */}
      <div className="mt-6 section-card bg-amber-50/50 border-amber-100">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-amber-700 text-sm mb-1">หมายเหตุ</h4>
            <ul className="text-xs text-amber-600 space-y-1 font-medium list-disc list-inside">
              <li>ใบเสร็จรับเงินจะพร้อมให้ดาวน์โหลดหลังจากชำระเงินครบถ้วนแล้ว</li>
              <li>แบบ อ.ส.9 (ตราสารอิเล็กทรอนิกส์) หรือ อ.ส.4 (ตราสารกระดาษ)</li>
              <li>ไฟล์ PDF จะมีลายมือชื่ออิเล็กทรอนิกส์จากกรมสรรพากร</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

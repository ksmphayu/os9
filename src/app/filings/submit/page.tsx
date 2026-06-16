'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  EyeOff,
  QrCode,
  Receipt,
  Copy,
  Check,
  FileDown,
  Stamp,
  ChevronRight,
  ChevronLeft,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import { api, PolicyFilingRequest, BulkFilingResponse } from '@/lib/api';

type Step = 'upload' | 'review' | 'result';

interface RowData extends PolicyFilingRequest {
  _rowIndex: number;
  _valid: boolean;
  _errors: string[];
  _dutyAmount: number;
  insuredAddress?: string;
  insuredAddressNo?: string;
  insuredRoad?: string;
  insuredSubdistrict?: string;
  insuredDistrict?: string;
  insuredProvince?: string;
  insuredZipcode?: string;
}

const EXCEL_COLUMNS: { key: keyof PolicyFilingRequest; label: string; required: boolean; example: string }[] = [
  { key: 'policyNumber', label: 'เลขกรมธรรม์', required: true, example: 'POL-001' },
  { key: 'contractNo', label: 'เลขสัญญา', required: true, example: 'CON-001' },
  { key: 'policyType', label: 'ประเภท (LIFE/NON_LIFE)', required: true, example: 'LIFE' },
  { key: 'sumInsured', label: 'ทุนประกัน (บาท)', required: false, example: '500000' },
  { key: 'premiumAmount', label: 'เบี้ยประกัน (บาท)', required: false, example: '12500.50' },
  { key: 'insuredTaxId', label: 'เลขประจำตัวผู้เอาประกัน', required: true, example: '1234567890123' },
  { key: 'insuredTitle', label: 'คำนำหน้า', required: false, example: 'นาย' },
  { key: 'insuredName', label: 'ชื่อ', required: false, example: 'สมชาย' },
  { key: 'insuredSurname', label: 'นามสกุล', required: false, example: 'ใจดี' },
  { key: 'nationality', label: 'สัญชาติ', required: false, example: 'TH' },
  { key: 'contractDate', label: 'วันที่สัญญา (YYYY-MM-DD)', required: true, example: '2024-01-15' },
  { key: 'effectiveDate', label: 'วันที่เริ่มต้น (YYYY-MM-DD)', required: true, example: '2024-01-15' },
  { key: 'expireDate', label: 'วันที่สิ้นสุด (YYYY-MM-DD)', required: true, example: '2025-01-14' },
];

// Header aliases: maps Thai/English header names → PolicyFilingRequest field
const HEADER_MAP: Record<string, keyof RowData | '_fullName' | '_dutyAmount'> = {
  // policyNumber
  'เลขที่กรมธรรม์': 'policyNumber',
  'เลขกรมธรรม์': 'policyNumber',
  'เลขที่กรมธรรม์/เอกสาร': 'policyNumber',
  'หมายเลขกรมธรรม์': 'policyNumber',
  'policy number': 'policyNumber',
  'policynumber': 'policyNumber',
  'policy no': 'policyNumber',
  'policyno': 'policyNumber',
  // contractNo
  'เลขที่สัญญา': 'contractNo',
  'เลขสัญญา': 'contractNo',
  'เลขที่กรมธรรม์หลัก': 'contractNo',
  'contract no': 'contractNo',
  'contractno': 'contractNo',
  'contract number': 'contractNo',
  // policyType
  'ประเภท': 'policyType',
  'ประเภทกรมธรรม์': 'policyType',
  'ประเภทการประกัน': 'policyType',
  'policy type': 'policyType',
  'policytype': 'policyType',
  // sumInsured
  'จำนวนเงินเอาประกันภัย': 'sumInsured',
  'จำนวนเงินเอาประกัน': 'sumInsured',
  'ทุนประกัน': 'sumInsured',
  'ทุนประกันภัย': 'sumInsured',
  'sum insured': 'sumInsured',
  'suminsured': 'sumInsured',
  // premiumAmount
  'เบี้ยประกันภัย': 'premiumAmount',
  'เบี้ยประกัน': 'premiumAmount',
  'เบี้ย': 'premiumAmount',
  'premium': 'premiumAmount',
  'premiumamount': 'premiumAmount',
  'premium amount': 'premiumAmount',
  // insuredTaxId
  'เลขประจำตัวประชาชน': 'insuredTaxId',
  'เลขประจำตัวผู้เอาประกัน': 'insuredTaxId',
  'เลขประจำตัวผู้เอาประกันภัย': 'insuredTaxId',
  'เลขบัตรประชาชน': 'insuredTaxId',
  'เลขที่บัตรประชาชน': 'insuredTaxId',
  'tax id': 'insuredTaxId',
  'insuredtaxid': 'insuredTaxId',
  'citizen id': 'insuredTaxId',
  'id card': 'insuredTaxId',
  // insuredTitle
  'คำนำหน้า': 'insuredTitle',
  'คำนำหน้าชื่อ': 'insuredTitle',
  'title': 'insuredTitle',
  'insuredtitle': 'insuredTitle',
  // insuredName
  'ชื่อ': 'insuredName',
  'ชื่อผู้เอาประกัน': 'insuredName',
  'name': 'insuredName',
  'first name': 'insuredName',
  'firstname': 'insuredName',
  // insuredSurname
  'นามสกุล': 'insuredSurname',
  'นามสกุลผู้เอาประกัน': 'insuredSurname',
  'นามสกุลผู้เอาประกันภัย': 'insuredSurname',
  'surname': 'insuredSurname',
  'last name': 'insuredSurname',
  'lastname': 'insuredSurname',
  // combined full name
  'ชื่อ - นามสกุล ผู้เอาประกันภัย': '_fullName',
  'ชื่อ-นามสกุล ผู้เอาประกันภัย': '_fullName',
  'ชื่อ-นามสกุล': '_fullName',
  'ชื่อ - นามสกุล': '_fullName',
  'ชื่อและนามสกุล': '_fullName',
  'ชื่อผู้เอาประกันภัย': '_fullName',
  'fullname': '_fullName',
  'full name': '_fullName',
  // dutyAmount (used to infer policyType when not explicitly provided)
  'อากร': '_dutyAmount',
  'อากรแสตมป์': '_dutyAmount',
  'stamp duty': '_dutyAmount',
  'duty': '_dutyAmount',
  // nationality
  'สัญชาติ': 'nationality',
  'nationality': 'nationality',
  // dates
  'วันที่ทำสัญญา': 'contractDate',
  'วันทำสัญญา': 'contractDate',
  'วันที่ออกกรมธรรม์': 'contractDate',
  'contract date': 'contractDate',
  'contractdate': 'contractDate',
  'วันที่เริ่มต้น': 'effectiveDate',
  'วันเริ่มต้น': 'effectiveDate',
  'วันที่คุ้มครอง': 'effectiveDate',
  'วันที่เริ่มคุ้มครอง': 'effectiveDate',
  'effective date': 'effectiveDate',
  'effectivedate': 'effectiveDate',
  'start date': 'effectiveDate',
  'วันที่สิ้นสุด': 'expireDate',
  'วันสิ้นสุด': 'expireDate',
  'วันที่ครบกำหนด': 'expireDate',
  'วันสิ้นสุดคุ้มครอง': 'expireDate',
  'expire date': 'expireDate',
  'expiredate': 'expireDate',
  'expiry date': 'expireDate',
  'end date': 'expireDate',
  // address fields
  'ที่อยู่': 'insuredAddress',
  'address': 'insuredAddress',
  'จังหวัด': 'insuredProvince',
  'province': 'insuredProvince',
  'รหัสไปรษณีย์': 'insuredZipcode',
  'postcode': 'insuredZipcode',
  'zipcode': 'insuredZipcode',
};

/** Convert DD/MM/YYYY (BE or CE) string to YYYY-MM-DD CE */
function parseThaiBEDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    // Excel serial
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const s = String(value).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    let year = parseInt(m[3]);
    const month = parseInt(m[2]);
    const day = parseInt(m[1]);
    // Buddhist Era (>2400) → CE
    if (year > 2400) year -= 543;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

const TITLE_PATTERNS = /^(นางสาว|น\.ส\.|นส\.|นาง|นาย|เด็กชาย|ด\.ช\.|เด็กหญิง|ด\.ญ\.|Mr\.|Mrs\.|Miss|Ms\.|Dr\.|Prof\.|Capt\.|Lt\.|นพ\.|พญ\.|ภญ\.|ทพ\.|ทพญ\.)\s*/i;

/** Split "Mr. John Smith" → { title, name, surname } */
const TITLE_NORMALIZE: Record<string, string> = {
  'น.ส.': 'นางสาว', 'นส.': 'นางสาว',
  'ด.ช.': 'เด็กชาย', 'ด.ญ.': 'เด็กหญิง',
};

function parseFullName(raw: string): { insuredTitle: string; insuredName: string; insuredSurname: string } {
  const s = raw.trim();
  let title = '';
  let rest = s;
  const tm = s.match(TITLE_PATTERNS);
  if (tm) {
    const matched = tm[0].trim();
    title = TITLE_NORMALIZE[matched] ?? matched.replace(/\.$/, '');
    rest = s.slice(tm[0].length).trim();
  }
  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { insuredTitle: title, insuredName: '', insuredSurname: '' };
  if (parts.length === 1) return { insuredTitle: title, insuredName: parts[0], insuredSurname: '' };
  const surname = parts[parts.length - 1];
  const name = parts.slice(0, -1).join(' ');
  return { insuredTitle: title, insuredName: name, insuredSurname: surname };
}

function parseThaiAddress(addressStr: string): {
  addressNo: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  zipcode: string;
} {
  if (!addressStr) {
    return { addressNo: '', road: '', subdistrict: '', district: '', province: '', zipcode: '' };
  }

  let remaining = addressStr.trim();

  // 1. Extract Zipcode (5 digits)
  let zipcode = '';
  const zipMatch = remaining.match(/\b\d{5}\b/);
  if (zipMatch) {
    zipcode = zipMatch[0];
    remaining = remaining.replace(zipcode, '').trim();
  }

  // 2. Extract Province
  let province = '';
  const provMatch = remaining.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/);
  if (provMatch) {
    province = provMatch[1];
    remaining = remaining.replace(provMatch[0], '').trim();
  }

  // 3. Extract District
  let district = '';
  const distMatch = remaining.match(/(?:อำเภอ|เขต|อ\.)\s*([^\s]+)/);
  if (distMatch) {
    district = distMatch[1];
    remaining = remaining.replace(distMatch[0], '').trim();
  }

  // 4. Extract Subdistrict
  let subdistrict = '';
  const subMatch = remaining.match(/(?:ตำบล|แขวง|ต\.)\s*([^\s]+)/);
  if (subMatch) {
    subdistrict = subMatch[1];
    remaining = remaining.replace(subMatch[0], '').trim();
  }

  // 5. Extract Road if present
  let road = '';
  const roadMatch = remaining.match(/(?:ถนน|ถ\.)\s*([^\s]+)/);
  if (roadMatch) {
    road = roadMatch[1];
    remaining = remaining.replace(roadMatch[0], '').trim();
  }

  // Clean remaining text for house number/Moo
  const addressNo = remaining.replace(/\s+/g, ' ').trim();

  return {
    addressNo,
    road,
    subdistrict,
    district,
    province,
    zipcode,
  };
}

function validateRow(row: PolicyFilingRequest): string[] {
  const errors: string[] = [];
  if (!row.policyNumber?.trim()) errors.push('เลขกรมธรรม์ห้ามว่าง');
  if (!row.contractNo?.trim()) errors.push('เลขสัญญาห้ามว่าง');
  if (!['LIFE', 'NON_LIFE'].includes(row.policyType)) errors.push('ประเภทต้องเป็น LIFE หรือ NON_LIFE');
  if (!row.insuredTaxId?.trim()) errors.push('เลขประจำตัวห้ามว่าง');
  if (!row.contractDate) errors.push('วันที่สัญญาห้ามว่าง');
  if (!row.effectiveDate) errors.push('วันที่เริ่มต้นห้ามว่าง');
  if (!row.expireDate) errors.push('วันที่สิ้นสุดห้ามว่าง');
  return errors;
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { id: 'upload', label: 'อัปโหลด' },
    { id: 'review', label: 'ตรวจสอบ' },
    { id: 'result', label: 'ผลลัพธ์' },
  ] as const;
  const idx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all',
                  done && 'bg-green-600 text-white',
                  active && 'thi-gradient text-white shadow-premium',
                  !done && !active && 'bg-slate-200 text-slate-400'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-sm font-bold hidden sm:block',
                  active ? 'text-primary' : done ? 'text-green-600' : 'text-slate-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className={cn('w-4 h-4 mx-1', done ? 'text-green-400' : 'text-slate-300')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PayInSlipCard({
  result,
  onDownloadSlip,
}: {
  result: BulkFilingResponse;
  onDownloadSlip: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.apiRefNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    await onDownloadSlip();
    setDownloading(false);
  };

  return (
    <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden">
      {/* Header gradient */}
      <div className="thi-gradient px-8 py-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="w-6 h-6 opacity-80" />
          <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">ชุดชำระเงิน (Pay-In Slip)</span>
        </div>
        <h2 className="text-2xl font-black">นำส่งข้อมูลสำเร็จ</h2>
        <p className="text-sm opacity-75 mt-1">กรมสรรพากรได้รับข้อมูลแล้ว กรุณาดาวน์โหลดชุดชำระเงิน</p>
      </div>

      <div className="p-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="text-2xl font-black text-green-700">{result.totalSubmitted}</div>
            <div className="text-xs font-bold text-green-600 mt-1">นำส่งสำเร็จ</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="text-2xl font-black text-amber-700">{result.totalSkipped}</div>
            <div className="text-xs font-bold text-amber-600 mt-1">ข้ามซ้ำ</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-2xl font-black text-slate-700">
              {result.totalSubmitted + result.totalSkipped}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-1">รายการทั้งหมด</div>
          </div>
        </div>

        {/* apiRefNo */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            รหัสอ้างอิงการนำส่ง (API Ref No.)
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-black text-primary flex-1 break-all">
              {result.apiRefNo}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border-2 border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* QR placeholder */}
        <div className="flex items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-200 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500">QR Payment (Thai QR)</p>
            <p className="text-xs text-slate-400 mt-1">จะแสดงหลังดาวน์โหลดชุดชำระเงิน</p>
          </div>
        </div>

        {/* Skipped list */}
        {result.skippedPolicyNumbers?.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-black text-amber-700">รายการที่ข้าม (พบซ้ำในระบบ)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.skippedPolicyNumbers.map((p) => (
                <span key={p} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 btn-premium"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {downloading ? 'กำลังเตรียมไฟล์...' : 'ดาวน์โหลด Pay-In Slip'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.open(`/filings/${result.apiRefNo}`, '_blank')}
            className="sm:w-auto"
          >
            <Eye className="w-4 h-4" />
            ดูรายละเอียด
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SubmitPage() {
  const { success, error: toastError, info } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<RowData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkFilingResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [resubmitUnpaid, setResubmitUnpaid] = useState(false);
  const [appending, setAppending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const appendFileRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'os9'>('grid');
  const [previewRow, setPreviewRow] = useState<RowData | null>(null);
  const [senderInfo, setSenderInfo] = useState({
    senderId: 'TPS010755500011201',
    rdUsername: 'บริษัท ไทยประกันสุขภาพ จำกัด (มหาชน)',
  });

  const [isExportingBatch, setIsExportingBatch] = useState(false);

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  const handleDownloadSingle = useCallback(async (r: RowData) => {
    try {
      const element = document.querySelector('[role="dialog"] .os9-paper-to-print') || document.querySelector('.os9-paper-to-print');
      if (element) {
        const html2pdf = (await import('html2pdf.js' as any)).default;
        const opt = {
          margin: 5,
          filename: `OS9-${r.policyNumber || 'preview'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 1.8,
            useCORS: true,
            scrollY: 0,
            scrollX: 0,
            width: 820,
            windowWidth: 820
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleDownloadBatch = useCallback(async () => {
    setIsExportingBatch(true);
    // Increased timeout to ensure all components in the batch are fully rendered
    setTimeout(async () => {
      try {
        const element = document.getElementById('print-batch-container');
        if (element) {
          const html2pdf = (await import('html2pdf.js' as any)).default;
          const opt = {
            margin: 0, // Reduced margin to prevent extra blank space
            filename: `OS9-Batch-${Date.now().toString().slice(-6)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2, // Increased scale for better clarity
              useCORS: true,
              logging: false,
              letterRendering: true,
              allowTaint: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], after: '.html2pdf-page-break' }
          };
          await html2pdf().set(opt).from(element).save();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsExportingBatch(false);
      }
    }, 1500); // Increased from 600ms to 1500ms
  }, [validRows, senderInfo]);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSenderInfo({
            senderId: data.rdApiBaseUrl ? (data.senderId || 'TPS010755500011201') : 'TPS010755500011201',
            rdUsername: data.rdUsername || 'บริษัท ไทยประกันสุขภาพ จำกัด (มหาชน)',
          });
        }
      })
      .catch(() => { });
  }, []);

  const parseExcel = useCallback(async (f: File, append = false) => {
    append ? setAppending(true) : setParsing(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, codepage: 65001 });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Read all rows as arrays so we can detect headers by name
      const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      if (allRows.length < 2) {
        toastError('ไฟล์ว่างเปล่า', 'ไม่พบข้อมูลในไฟล์');
        return;
      }

      // Auto-detect header row: scan first 5 rows, pick the one with most HEADER_MAP hits
      const buildColMap = (row: unknown[]) => {
        const map: Record<number, keyof RowData | '_fullName' | '_dutyAmount'> = {};
        row.forEach((h, idx) => {
          const raw = String(h ?? '').trim();
          const mapped = HEADER_MAP[raw] ?? HEADER_MAP[raw.toLowerCase()];
          if (mapped) map[idx] = mapped;
        });
        return map;
      };
      let headerRowIndex = 0;
      let colMap: Record<number, keyof RowData | '_fullName' | '_dutyAmount'> = {};
      for (let i = 0; i < Math.min(5, allRows.length); i++) {
        const candidate = buildColMap(allRows[i] as unknown[]);
        if (Object.keys(candidate).length > Object.keys(colMap).length) {
          colMap = candidate;
          headerRowIndex = i;
        }
      }

      const toStr = (v: unknown) => (v === undefined || v === null || v === '') ? '' : String(v).trim();
      const toNum = (v: unknown) => {
        if (v === undefined || v === null || v === '') return undefined;
        const n = Number(String(v).replace(/,/g, ''));
        return isNaN(n) ? undefined : n;
      };
      const DATE_FIELDS = new Set<string>(['contractDate', 'effectiveDate', 'expireDate']);

      const dataRows = allRows.slice(headerRowIndex + 1);

      // Trim trailing empty rows and summary rows (rows with totals but no policy number)
      const policyNumCols = Object.entries(colMap)
        .filter(([, f]) => f === 'policyNumber')
        .map(([i]) => Number(i));
      const isSummaryOrEmpty = (row: unknown[]) => {
        const hasContent = (row as unknown[]).some((c) => c !== '' && c !== null && c !== undefined);
        if (!hasContent) return true; // blank row
        // Non-empty but policyNumber cell is blank → totals row
        return policyNumCols.length > 0 && policyNumCols.every((i) => !String(row[i] ?? '').trim());
      };
      let trimmedRows = [...dataRows];
      while (trimmedRows.length > 0 && isSummaryOrEmpty(trimmedRows[trimmedRows.length - 1] as unknown[])) {
        trimmedRows = trimmedRows.slice(0, -1);
      }

      const mapped: RowData[] = trimmedRows
        .filter((row) => (row as unknown[]).some((c) => c !== '' && c !== null && c !== undefined))
        .map((row, i) => {
          const cells = row as unknown[];
          const partial: Partial<RowData> & { _fullName?: string; _dutyAmount?: number } = {};

          Object.entries(colMap).forEach(([idxStr, field]) => {
            const val = cells[Number(idxStr)];
            if (field === '_fullName') {
              partial._fullName = toStr(val);
            } else if (field === '_dutyAmount') {
              partial._dutyAmount = toNum(val) ?? 0;
            } else if (DATE_FIELDS.has(field)) {
              (partial as Record<string, unknown>)[field] = parseThaiBEDate(val);
            } else if (field === 'sumInsured' || field === 'premiumAmount') {
              (partial as Record<string, unknown>)[field] = toNum(val);
            } else {
              (partial as Record<string, unknown>)[field] = toStr(val);
            }
          });

          // Split combined full-name column into title / name / surname
          if (partial._fullName) {
            const parsed = parseFullName(partial._fullName);
            if (!partial.insuredTitle) partial.insuredTitle = parsed.insuredTitle;
            if (!partial.insuredName) partial.insuredName = parsed.insuredName;
            if (!partial.insuredSurname) partial.insuredSurname = parsed.insuredSurname;
          }

          if (!partial.policyType) {
            // Infer from อากร + จำนวนเงินเอาประกันภัย: อากร=20 และ sumInsured>38000 → LIFE
            const duty = partial._dutyAmount ?? 0;
            const sum = partial.sumInsured ?? 0;
            partial.policyType = (duty === 20 && sum > 38000) ? 'LIFE' : 'NON_LIFE';
          } else {
            partial.policyType = (partial.policyType as string).toUpperCase();
          }

          const policyNumber = partial.policyNumber ?? '';
          const built: PolicyFilingRequest = {
            policyNumber,
            contractNo: policyNumber,
            policyType: partial.policyType,
            sumInsured: partial.sumInsured,
            premiumAmount: partial.premiumAmount,
            insuredTaxId: partial.insuredTaxId ?? '',
            insuredTitle: partial.insuredTitle ?? '',
            insuredName: partial.insuredName ?? '',
            insuredSurname: partial.insuredSurname ?? '',
            nationality: partial.nationality ?? '',
            contractDate: partial.contractDate ?? '',
            effectiveDate: partial.effectiveDate ?? '',
            expireDate: partial.expireDate ?? '',
          };

          // Parse address components
          const rawAddress = partial.insuredAddress || '';
          const parsedAddress = parseThaiAddress(rawAddress);
          const insuredAddressNo = parsedAddress.addressNo || '';
          const insuredRoad = parsedAddress.road || '';
          const insuredSubdistrict = parsedAddress.subdistrict || '';
          const insuredDistrict = parsedAddress.district || '';
          const insuredProvince = partial.insuredProvince || parsedAddress.province || '';
          const insuredZipcode = partial.insuredZipcode || parsedAddress.zipcode || '';

          const errors = validateRow(built);
          return {
            ...built,
            _rowIndex: i + 1,
            _valid: errors.length === 0,
            _errors: errors,
            _dutyAmount: partial._dutyAmount ?? 0,
            insuredAddress: rawAddress || undefined,
            insuredAddressNo: insuredAddressNo || undefined,
            insuredRoad: insuredRoad || undefined,
            insuredSubdistrict: insuredSubdistrict || undefined,
            insuredDistrict: insuredDistrict || undefined,
            insuredProvince: insuredProvince || undefined,
            insuredZipcode: insuredZipcode || undefined,
          };
        });

      console.log('[insurer-portal] parsed rows (%d total, %d valid):', mapped.length, mapped.filter(r => r._valid).length, mapped.map(({ _rowIndex, _valid, _errors, _dutyAmount, ...policy }) => ({ ...policy, _dutyAmount })));
      if (append) {
        setRows((prev) => [...prev, ...mapped.map((r, i) => ({ ...r, _rowIndex: prev.length + i + 1 }))]);
        success(`เพิ่มข้อมูลจาก "${f.name}" จำนวน ${mapped.length} แถว`);
      } else {
        setRows(mapped);
        success(`อ่านไฟล์สำเร็จ — พบ ${mapped.length} แถว`, `ข้อมูลถูกต้อง ${mapped.filter((r) => r._valid).length} แถว`);
        setStep('review');
      }
    } catch (e) {
      console.error(e);
      toastError('ไม่สามารถอ่านไฟล์ได้', 'กรุณาตรวจสอบรูปแบบไฟล์ Excel');
    } finally {
      append ? setAppending(false) : setParsing(false);
    }
  }, [success, toastError]);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toastError('ไฟล์ไม่ถูกต้อง', 'รองรับเฉพาะ .xlsx, .xls, .csv');
      return;
    }
    setFile(f);
    parseExcel(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const updateRow = (index: number, field: keyof PolicyFilingRequest, value: string | number | undefined) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._rowIndex !== index) return r;
        const updated = { ...r, [field]: value };
        const errors = validateRow(updated);
        return { ...updated, _valid: errors.length === 0, _errors: errors };
      })
    );
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((r) => r._rowIndex !== index));
  };

  // const validRows = rows.filter((r) => r._valid);
  // const invalidRows = rows.filter((r) => !r._valid);

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload = validRows.map(({
        _rowIndex: _r,
        _valid: _v,
        _errors: _e,
        _dutyAmount: _d,
        insuredAddress,
        insuredAddressNo,
        insuredRoad,
        insuredSubdistrict,
        insuredDistrict,
        insuredProvince,
        insuredZipcode,
        ...rest
      }) => rest);
      const res = await api.submitBulk(payload, resubmitUnpaid);
      setResult(res);
      setStep('result');
      success('นำส่งข้อมูลสำเร็จ!', `ส่งครบ ${res.totalSubmitted} รายการ`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toastError('นำส่งข้อมูลล้มเหลว', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSlip = async () => {
    if (!result?.apiRefNo) return;
    try {
      const res = await api.triggerPayInSlipDownload(result.apiRefNo);
      const url = api.downloadFile(res.payInSlipPath);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payin-slip-${result.apiRefNo}.pdf`;
      a.click();
      success('ดาวน์โหลด Pay-In Slip สำเร็จ');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toastError('ดาวน์โหลดล้มเหลว', msg);
    }
  };

  const downloadTemplate = () => {
    const header = EXCEL_COLUMNS.map((c) => c.label);
    const example = EXCEL_COLUMNS.map((c) => c.example);
    const csv = [header, example].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-estamp.csv';
    a.click();
    info('ดาวน์โหลดเทมเพลต');
  };

  return (
    <>
      <div className="max-w-[1800px] mx-auto px-4 lg:px-12 py-8 pb-20 main-workspace-layout print:p-0 print:py-0 print:max-w-none print:shadow-none print:border-none">
        {/* Page Header */}
        <div className="page-header print-exclude">
          <div className="page-icon">
            <Stamp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ยื่นอากรแสตมป์</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">นำส่งข้อมูลขอเสียอากรแสตมป์เป็นตัวเงิน ผ่าน API กรมสรรพากร</p>
          </div>
        </div>

        <div className="print-exclude">
          <StepIndicator current={step} />
        </div>

        {/* ===== STEP 1: UPLOAD ===== */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Drop zone */}
            <div
              className={cn(
                'relative border-2 border-dashed rounded-3xl transition-all duration-200 cursor-pointer',
                dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-slate-300 bg-white hover:border-primary/50 hover:bg-slate-50'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />

              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                {parsing ? (
                  <>
                    <div className="w-16 h-16 mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <h3 className="text-lg font-black text-primary">กำลังอ่านไฟล์...</h3>
                    <p className="text-sm text-slate-500 mt-1">กรุณารอสักครู่</p>
                  </>
                ) : file ? (
                  <>
                    <div className="w-16 h-16 mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-black text-green-700">{file.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mb-5 rounded-2xl thi-gradient flex items-center justify-center shadow-premium">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">ลากไฟล์มาที่นี่</h3>
                    <p className="text-slate-500 text-sm mt-2 mb-4 font-medium">
                      หรือคลิกเพื่อเลือกไฟล์ Excel / CSV
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {['.xlsx', '.xls', '.csv'].map((ext) => (
                        <span key={ext} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-500">
                          {ext}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Template download */}
            <div className="section-card flex items-center justify-between">
              <div>
                <h4 className="font-black text-slate-800 text-sm">เทมเพลตข้อมูล</h4>
                <p className="text-xs text-slate-500 mt-0.5">ดาวน์โหลด CSV ตัวอย่างพร้อม header ที่ถูกต้อง</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileDown className="w-4 h-4" />
                ดาวน์โหลดเทมเพลต
              </Button>
            </div>

            {/* Column guide */}
            <div className="section-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-slate-800 text-sm">คอลัมน์ที่รองรับ</h4>
                <span className="text-[10px] font-black px-2 py-0.5 bg-green-100 text-green-700 rounded-full uppercase tracking-wide">
                  ตรวจ Header อัตโนมัติ
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3 font-medium">
                ระบบจะจับคู่ชื่อคอลัมน์อัตโนมัติ ไม่ต้องเรียงลำดับ รองรับทั้งชื่อไทยและอังกฤษ
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXCEL_COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-start gap-2 text-xs">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black shrink-0 text-[10px] ${col.required ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                      {col.required ? '*' : '○'}
                    </span>
                    <div>
                      <span className="font-bold text-slate-700">{col.label}</span>
                      <span className="text-slate-400 ml-1">เช่น: {col.example}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-3 font-medium">
                * จำเป็นต้องมี · ชื่อ-นามสกุลรองรับทั้งแบบรวมคอลัมน์เดียวและแยกคอลัมน์ · วันที่รองรับทั้ง พ.ศ. และ ค.ศ.
              </p>
            </div>
          </div>
        )}

        {/* ===== STEP 2: REVIEW ===== */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="section-card flex flex-wrap items-center justify-between gap-4 print-exclude">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-2xl font-black text-slate-900">{rows.length}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">แถวทั้งหมด</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-green-700">{validRows.length}</div>
                  <div className="text-xs font-bold text-green-500 uppercase tracking-widest">พร้อมส่ง</div>
                </div>
                {invalidRows.length > 0 && (
                  <div>
                    <div className="text-2xl font-black text-red-600">{invalidRows.length}</div>
                    <div className="text-xs font-bold text-red-400 uppercase tracking-widest">มีข้อผิดพลาด</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={appendFileRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parseExcel(f, true);
                    e.target.value = '';
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => appendFileRef.current?.click()} disabled={appending}>
                  {appending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  อัปโหลดเพิ่ม
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setStep('upload'); setRows([]); setFile(null); }}>
                  <ArrowLeft className="w-4 h-4" />
                  เลือกไฟล์ใหม่
                </Button>
                <Button
                  size="sm"
                  disabled={validRows.length === 0}
                  onClick={() => setConfirmOpen(true)}
                >
                  ส่งข้อมูล {validRows.length} รายการ
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 mb-4 bg-white p-1 rounded-xl shadow-sm max-w-md print-exclude">
              <button
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                  viewMode === 'grid' ? "bg-slate-100 text-primary" : "text-slate-500 hover:text-slate-700"
                )}
                onClick={() => setViewMode('grid')}
              >
                แก้ไขข้อมูลตาราง (Grid Editor)
              </button>
              <button
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                  viewMode === 'os9' ? "bg-slate-100 text-primary" : "text-slate-500 hover:text-slate-700"
                )}
                onClick={() => setViewMode('os9')}
              >
                ตัวอย่างแบบ อ.ส.9 (OS9 Preview)
              </button>
            </div>

            {viewMode === 'grid' ? (
              /* Table */
              <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[65vh]">
                  <table className="data-table min-w-[1400px]">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>เลขกรมธรรม์</th>
                        <th>ประเภท</th>
                        <th className="text-right">ทุนประกัน</th>
                        <th className="text-right">เบี้ยประกัน</th>
                        <th className="text-right">อากร</th>
                        <th>เลขประชาชน</th>
                        <th>คำนำหน้า</th>
                        <th>ชื่อ</th>
                        <th>นามสกุล</th>
                        <th>วันที่สัญญา</th>
                        <th>เริ่มต้น</th>
                        <th>สิ้นสุด</th>
                        <th className="w-20">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const errs = new Set(row._errors);
                        const fe = (msg: string) => errs.has(msg) ? msg : '';
                        return (
                          <tr key={row._rowIndex} className={row._valid ? '' : 'bg-red-50/30'}>
                            <td className="text-xs text-slate-400 font-mono">{row._rowIndex}</td>
                            <EditCell
                              value={row.policyNumber}
                              onChange={(v) => updateRow(row._rowIndex, 'policyNumber', v)}
                              error={fe('เลขกรมธรรม์ห้ามว่าง')}
                              className="font-mono font-black text-primary"
                            />
                            <td>
                              <select
                                value={row.policyType}
                                onChange={(e) => updateRow(row._rowIndex, 'policyType', e.target.value)}
                                className={cn(
                                  'text-xs font-bold px-2 py-1 rounded-lg border-2 outline-none focus:border-primary transition-colors',
                                  !['LIFE', 'NON_LIFE'].includes(row.policyType)
                                    ? 'bg-red-50 border-red-300 text-red-700'
                                    : row.policyType === 'LIFE'
                                      ? 'bg-blue-50 border-blue-100 text-blue-700'
                                      : 'bg-purple-50 border-purple-100 text-purple-700'
                                )}
                              >
                                <option value="LIFE">LIFE</option>
                                <option value="NON_LIFE">NON_LIFE</option>
                              </select>
                            </td>
                            <td className="text-right font-mono text-xs">
                              {row.sumInsured !== undefined ? formatNumber(row.sumInsured) : '-'}
                            </td>
                            <td className="text-right font-mono text-xs">
                              {row.premiumAmount !== undefined ? formatNumber(row.premiumAmount) : '-'}
                            </td>
                            <td className="text-right font-mono text-xs font-bold text-slate-700">
                              {row._dutyAmount ? formatNumber(row._dutyAmount) : '-'}
                            </td>
                            <EditCell
                              value={row.insuredTaxId}
                              onChange={(v) => updateRow(row._rowIndex, 'insuredTaxId', v)}
                              error={fe('เลขประจำตัวห้ามว่าง')}
                              className="font-mono"
                            />
                            <EditCell
                              value={row.insuredTitle ?? ''}
                              onChange={(v) => updateRow(row._rowIndex, 'insuredTitle', v)}
                            />
                            <EditCell
                              value={row.insuredName ?? ''}
                              onChange={(v) => updateRow(row._rowIndex, 'insuredName', v)}
                            />
                            <EditCell
                              value={row.insuredSurname ?? ''}
                              onChange={(v) => updateRow(row._rowIndex, 'insuredSurname', v)}
                            />
                            <td className={cn('text-xs font-medium', fe('วันที่สัญญาห้ามว่าง') ? 'bg-red-50 text-red-600' : 'text-slate-600')}
                              title={fe('วันที่สัญญาห้ามว่าง') || undefined}>
                              {formatDate(row.contractDate) || <span className="text-red-400">ไม่มีข้อมูล</span>}
                            </td>
                            <td className={cn('text-xs font-medium', fe('วันที่เริ่มต้นห้ามว่าง') ? 'bg-red-50 text-red-600' : 'text-blue-600')}
                              title={fe('วันที่เริ่มต้นห้ามว่าง') || undefined}>
                              {formatDate(row.effectiveDate) || <span className="text-red-400">ไม่มีข้อมูล</span>}
                            </td>
                            <td className={cn('text-xs font-medium', fe('วันที่สิ้นสุดห้ามว่าง') ? 'bg-red-50 text-red-600' : 'text-amber-600')}
                              title={fe('วันที่สิ้นสุดห้ามว่าง') || undefined}>
                              {formatDate(row.expireDate) || <span className="text-red-400">ไม่มีข้อมูล</span>}
                            </td>
                            <td className="w-20">
                              <div className="flex items-center gap-1 justify-center">
                                <button
                                  onClick={() => setPreviewRow(row)}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="ดูตัวอย่างแบบ อ.ส.9 รายบุคคล"
                                  data-testid={`preview-row-${row._rowIndex}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeRow(row._rowIndex)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <OS9Preview
                rows={rows}
                validRows={validRows}
                senderInfo={senderInfo}
                onDownloadSingle={handleDownloadSingle}
                onDownloadBatch={handleDownloadBatch}
              />
            )}

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-lg z-40 px-4 lg:px-12 py-3 print-exclude">
              <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
                {/* Summary stats */}
                <div className="flex items-center gap-5 min-w-0 overflow-hidden">
                  <div className="shrink-0">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">พร้อมส่ง</div>
                    <div className="text-base font-black text-primary leading-tight">
                      {validRows.length}
                      <span className="text-slate-300 font-medium text-xs"> / {rows.length}</span>
                    </div>
                  </div>
                  {invalidRows.length > 0 && (
                    <div className="shrink-0">
                      <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">ข้อผิดพลาด</div>
                      <div className="text-base font-black text-red-600 leading-tight">{invalidRows.length}</div>
                    </div>
                  )}
                  <div className="h-8 w-px bg-slate-200 shrink-0 hidden sm:block" />
                  <div className="shrink-0 hidden sm:block">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ทุนประกันรวม</div>
                    <div className="text-base font-black text-slate-800 leading-tight">
                      {formatNumber(validRows.reduce((s, r) => s + (r.sumInsured ?? 0), 0))}
                      <span className="text-slate-400 font-medium text-[10px] ml-0.5">บาท</span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200 shrink-0 hidden sm:block" />
                  <div className="shrink-0 hidden sm:block">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เบี้ยรวม</div>
                    <div className="text-base font-black text-slate-800 leading-tight">
                      {formatNumber(validRows.reduce((s, r) => s + (r.premiumAmount ?? 0), 0))}
                      <span className="text-slate-400 font-medium text-[10px] ml-0.5">บาท</span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200 shrink-0 hidden sm:block" />
                  <div className="shrink-0 hidden sm:block">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">อากรรวม</div>
                    <div className="text-base font-black text-slate-800 leading-tight">
                      {formatNumber(validRows.reduce((s, r) => s + (r._dutyAmount ?? 0), 0))}
                      <span className="text-slate-400 font-medium text-[10px] ml-0.5">บาท</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  disabled={validRows.length === 0 || submitting}
                  onClick={() => setConfirmOpen(true)}
                  className="shrink-0 min-w-[180px]"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  ยืนยันและส่งข้อมูล
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: RESULT ===== */}
        {step === 'result' && result && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-black text-slate-900">นำส่งสำเร็จ</h2>
                <p className="text-sm text-slate-500">ข้อมูลถูกส่งไปยังกรมสรรพากรเรียบร้อย</p>
              </div>
            </div>

            <PayInSlipCard result={result} onDownloadSlip={handleDownloadSlip} />

            <Button
              variant="outline"
              onClick={() => { setStep('upload'); setFile(null); setRows([]); setResult(null); }}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              เริ่มส่งข้อมูลชุดใหม่
            </Button>
          </div>
        )}

        {/* ===== CONFIRM DIALOG ===== */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent onClose={() => setConfirmOpen(false)}>
            <DialogHeader>
              <div className="w-16 h-16 mx-auto mb-2 rounded-2xl thi-gradient flex items-center justify-center shadow-premium">
                <Stamp className="w-8 h-8 text-white" />
              </div>
              <DialogTitle>ยืนยันการนำส่งข้อมูล</DialogTitle>
              <DialogDescription>
                ระบบจะส่งข้อมูลอากรแสตมป์จำนวน{' '}
                <span className="font-black text-primary">{validRows.length} รายการ</span>{' '}
                ไปยังกรมสรรพากร คุณแน่ใจหรือไม่?
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="text-center p-4 bg-primary/5 rounded-2xl">
                <div className="text-2xl font-black text-primary">{validRows.length}</div>
                <div className="text-xs text-primary/70 font-bold mt-1">รายการที่จะส่ง</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-2xl">
                <div className="text-2xl font-black text-amber-600">{invalidRows.length}</div>
                <div className="text-xs text-amber-500 font-bold mt-1">รายการที่จะข้าม</div>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resubmitUnpaid}
                onChange={(e) => setResubmitUnpaid(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-amber-600 shrink-0"
              />
              <div>
                <span className="text-sm font-bold text-amber-700">ส่งซ้ำกรณียังไม่ชำระเงิน</span>
                <p className="text-xs text-amber-600 mt-0.5">รายการที่เคยส่งแล้วแต่สถานะยังไม่ชำระจะถูกส่งใหม่</p>
              </div>
            </label>

            <DialogFooter>
              <Button size="lg" onClick={handleSubmit} disabled={submitting} className="w-full btn-premium">
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> กำลังส่งข้อมูล...</>
                ) : (
                  <>ยืนยันและส่ง <ArrowRight className="w-5 h-5" /></>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setConfirmOpen(false)} className="w-full">
                ยกเลิก
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== INDIVIDUAL PREVIEW DIALOG ===== */}
        <Dialog open={!!previewRow} onOpenChange={(open) => !open && setPreviewRow(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-[#faf9f6] p-4 sm:p-6" onClose={() => setPreviewRow(null)}>
            <DialogHeader className="print:hidden">
              <DialogTitle className="font-sans font-black text-slate-800 text-lg">ตัวอย่างแบบ อ.ส.9 รายบุคคล</DialogTitle>
              <DialogDescription className="font-sans font-medium text-slate-500">
                ตรวจสอบรายละเอียดโครงสร้างแบบอากรแสตมป์ของกรมธรรม์ {previewRow?.policyNumber} ก่อนการส่งข้อมูลจริง
              </DialogDescription>
            </DialogHeader>
            {previewRow && (
              <div className="py-4 select-none">
                <OS9Preview
                  rows={[previewRow]}
                  validRows={[previewRow]}
                  senderInfo={senderInfo}
                />
              </div>
            )}
            <DialogFooter className="print:hidden">
              <Button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด PDF
              </Button>
              <Button onClick={() => setPreviewRow(null)} className="font-sans" variant="outline">ปิดหน้าต่าง</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Print/Download Batch Container */}
      {isExportingBatch && (
        <div className="html2pdf-offscreen" id="print-batch-container">
          {validRows.map((r) => (
            <div key={r._rowIndex} className="html2pdf-page-break" style={{ pageBreakAfter: 'always', margin: 0, padding: 0 }}>
              <OS9Preview rows={[r]} validRows={[r]} senderInfo={senderInfo} />
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          background-color: white !important;
        }
        
        /* Hide print:hidden utility elements */
        .print\\:hidden, .print-exclude {
          display: none !important;
        }
        
        /* Hide main workspace when printing the batch */
        body.print-batch-mode .main-workspace-layout {
          display: none !important;
        }
        
        /* Hide main workspace when printing from a dialog */
        body:has([role="dialog"]) .main-workspace-layout {
          display: none !important;
        }
        
        /* Show batch container when in batch mode */
        body.print-batch-mode .print-batch-container {
          display: block !important;
        }
        
        /* Style dialog content to take over full screen in print */
        [role="dialog"] {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          background: white !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        
        /* Hide dialog close buttons in print */
        [role="dialog"] button.absolute {
          display: none !important;
        }
        
        html, body {
          overflow: visible !important;
          height: auto !important;
        }
      }
      
      .html2pdf-offscreen {
        position: absolute !important;
        left: -9999px !important;
        top: 0 !important;
        z-index: 1000 !important;
        display: block !important;
        width: 820px !important;
        background-color: white !important;
        overflow: visible !important;
      }
    ` }} />
    </>
  );
}

function EditCell({
  value,
  onChange,
  error,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(value);

  if (editing) {
    return (
      <td className="p-1">
        <input
          autoFocus
          value={tmp}
          onChange={(e) => setTmp(e.target.value)}
          onBlur={() => { onChange(tmp); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onChange(tmp); setEditing(false); }
            if (e.key === 'Escape') { setTmp(value); setEditing(false); }
          }}
          className={cn(
            'w-full px-2 py-1 text-xs border-2 rounded-lg outline-none font-mono bg-white',
            error ? 'border-red-400' : 'border-primary'
          )}
        />
      </td>
    );
  }

  return (
    <td
      title={error || undefined}
      className={cn(
        'cursor-pointer rounded transition-colors',
        error ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-primary/5',
        className
      )}
      onClick={() => { setTmp(value); setEditing(true); }}
    >
      {error && !value ? (
        <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />
          ไม่มีข้อมูล
        </span>
      ) : (
        <span className="text-xs">{value || <span className="text-slate-300 italic">-</span>}</span>
      )}
    </td>
  );
}

function TaxIdBoxes({ value }: { value: string }) {
  const clean = value.replace(/\D/g, '').padEnd(13, ' ').slice(0, 13);
  const groups = [
    clean.slice(0, 1),
    clean.slice(1, 5),
    clean.slice(5, 10),
    clean.slice(10, 12),
    clean.slice(12, 13),
  ];
  return (
    <div className="flex items-center gap-1 shrink-0">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="flex gap-0.5">
          {group.split('').map((digit, dIdx) => (
            <span
              key={dIdx}
              className="w-5 h-6 border border-slate-400 bg-white flex items-center justify-center font-mono font-bold text-xs text-blue-900 shadow-sm rounded-sm"
            >
              {digit}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PostcodeBoxes({ value }: { value: string }) {
  const clean = value.replace(/\D/g, '').padEnd(5, ' ').slice(0, 5);
  return (
    <div className="flex gap-0.5 shrink-0">
      {clean.split('').map((digit, idx) => (
        <span
          key={idx}
          className="w-5 h-6 border border-slate-400 bg-white flex items-center justify-center font-mono font-bold text-xs text-blue-900 shadow-sm rounded-sm"
        >
          {digit}
        </span>
      ))}
    </div>
  );
}

function formatDateBE(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0]);
    const m = parts[1];
    const d = parts[2];
    const yearBE = y < 2400 ? y + 543 : y;
    return `${d}/${m}/${yearBE}`;
  }
  return dateStr;
}

function OS9Preview({
  rows,
  validRows,
  senderInfo,
  onDownloadSingle,
  onDownloadBatch,
}: {
  rows: any[];
  validRows: any[];
  senderInfo: { senderId: string; rdUsername: string };
  onDownloadSingle?: (r: any) => void;
  onDownloadBatch?: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  if (validRows.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 font-sans font-medium bg-white border border-slate-200 rounded-2xl shadow-sm">
        ไม่มีข้อมูลรายการที่ถูกต้องสำหรับแสดงตัวอย่างแบบ อ.ส.9
      </div>
    );
  }

  // Ensure index is within range if rows change
  const activeIndex = selectedIndex >= validRows.length ? 0 : selectedIndex;
  const row = validRows[activeIndex];

  const addressNo = row.insuredAddressNo || "-";
  const road = row.insuredRoad || "-";
  const subdistrict = row.insuredSubdistrict || "-";
  const district = row.insuredDistrict || "-";
  const province = row.insuredProvince || "-";
  const zipcode = row.insuredZipcode || "";

  return (
    <div className="font-sans">
      {/* Dropdown Selector for Batch Mode */}
      {validRows.length > 1 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm print-exclude">
          <div className="flex items-center gap-2 text-xs font-black text-blue-800">
            <FileSpreadsheet className="w-4 h-4" />
            <span>พรีวิวแบบรายบุคคล ({validRows.length} รายการ):</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex === 0}
              onClick={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
              className="h-8 px-2 flex items-center gap-1 font-sans font-bold text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ก่อนหน้า</span>
            </Button>
            <select
              value={activeIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
              className="text-xs font-bold px-3 py-1 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white text-slate-700 min-w-[250px] cursor-pointer h-8"
            >
              {validRows.map((r, idx) => (
                <option key={r._rowIndex} value={idx}>
                  รายการที่ {r._rowIndex} - กรมธรรม์ {r.policyNumber} ({r.insuredTitle}{r.insuredName} {r.insuredSurname})
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex === validRows.length - 1}
              onClick={() => setSelectedIndex((prev) => Math.min(validRows.length - 1, prev + 1))}
              className="h-8 px-2 flex items-center gap-1 font-sans font-bold text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            {onDownloadBatch && onDownloadSingle && (
              <div className="flex gap-1.5 ml-2 border-l border-slate-200 pl-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownloadSingle(row)}
                  className="h-8 px-3 flex items-center gap-1.5 font-sans font-bold text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 border-none shadow-sm cursor-pointer"
                  title="ดาวน์โหลด PDF เฉพาะรายการนี้"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด PDF รายการนี้</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadBatch}
                  className="h-8 px-3 flex items-center gap-1.5 font-sans font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm cursor-pointer"
                  title="ดาวน์โหลดทุกรายการเป็น PDF ชุดเดียวกัน"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด PDF ทั้งหมด ({validRows.length} รายการ)</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main OS9 simulated paper container */}
      <div className="bg-[#faf9f6] text-slate-800 p-3 sm:p-4 max-w-[794px] mx-auto rounded-3xl shadow-xl border-4 border-double border-[#8b7d6b] select-none overflow-x-auto relative print:p-0 print:border-0 print:shadow-none print:bg-white print:max-w-none">
        {/* Watermark (Screen view only) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden print:hidden">
          <div className="text-blue-700/[0.04] border-[12px] border-double border-blue-700/[0.04] rounded-3xl px-12 py-6 text-4xl sm:text-5xl font-black uppercase tracking-[0.2em] -rotate-30 select-none text-center">
            ใช้สำหรับตรวจสอบความถูกต้อง
          </div>
        </div>

        {/* Watermark (Print/PDF view only) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden print:flex hidden">
          <div className="text-red-600/[0.08] print:text-red-600/[0.12] border-[16px] border-double border-red-600/[0.08] print:border-red-600/[0.12] rounded-3xl px-16 py-8 text-5xl font-black uppercase tracking-[0.25em] -rotate-30 select-none text-center leading-normal">
            ตัวอย่างเท่านั้น<br />SAMPLE ONLY
          </div>
        </div>

        <div className="min-w-[700px] p-4 sm:p-5 bg-white border border-[#c5b59f] rounded-2xl relative shadow-inner z-10 os9-paper-to-print">
          {/* Top Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {/* Revenue Seal SVG */}
              <div className="w-12 h-12 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="48" fill="#fef3c7" stroke="#1d4ed8" strokeWidth="2" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="2,2" />
                  <path d="M50 15 C55 25, 65 30, 65 45 C65 60, 50 80, 50 85 C50 80, 35 60, 35 45 C35 30, 45 25, 50 15 Z" fill="#1d4ed8" opacity="0.15" />
                  <path d="M50 22 L52 32 L48 32 Z M50 32 C54 32, 58 35, 58 42 C58 48, 54 55, 50 55 C46 55, 42 48, 42 42 C42 35, 46 32, 50 32 Z" fill="#b91c1c" />
                  <path d="M50 55 L50 78 L44 82 L50 80 L56 82 L50 78 Z" fill="#b91c1c" />
                  <circle cx="50" cy="42" r="3" fill="#fef3c7" />
                  <path d="M25 50 A25 25 0 0 1 75 50" fill="none" stroke="#1d4ed8" strokeWidth="1" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-xs font-black text-blue-900 font-sans tracking-tight">แบบขอเสียอากรแสตมป์เป็นตัวเงิน</h2>
                <h2 className="text-xs font-black text-blue-900 font-sans tracking-tight mt-0.5">สำหรับตราสารอิเล็กทรอนิกส์</h2>
              </div>
            </div>

            <div className="text-center flex-1">
              <h1 className="text-3xl font-black text-blue-800 font-sans tracking-wide">อ.ส.๙</h1>
            </div>

            {/* Checkboxes box */}
            <div className="border-2 border-blue-900 p-1.5 text-[9px] rounded-lg bg-blue-50/20 w-48 font-sans shrink-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="w-3.5 h-3.5 border border-slate-400 flex items-center justify-center font-bold text-[9px] text-blue-800 bg-white shrink-0">✓</span>
                <span>(1) ยื่นปกติ</span>
                <span className="w-3.5 h-3.5 border border-slate-400 flex items-center justify-center font-bold text-[9px] text-blue-800 bg-white shrink-0 ml-2"></span>
                <span>(2) ยื่นเพิ่มเติมครั้งที่ ......</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex items-center gap-1.5 leading-none">
                <span className="w-3.5 h-3.5 border border-slate-400 flex items-center justify-center font-bold text-[9px] text-blue-800 bg-white shrink-0">✓</span>
                <span>(1) ยื่นภายในกำหนดเวลา</span>
                <span className="w-3.5 h-3.5 border border-slate-400 flex items-center justify-center font-bold text-[9px] text-blue-800 bg-white shrink-0 ml-2"></span>
                <span>(2) ยื่นเกินกำหนดเวลา</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 font-sans text-xs">
            {/* Section 1: Payer Info */}
            <div className="border border-blue-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between border-b border-blue-100 pb-1.5 mb-2">
                <h3 className="font-black text-blue-900 uppercase">ชื่อผู้เสียอากร</h3>
                <span className="text-[10px] text-slate-400 font-bold">ข้อมูลผู้ขอเสียอากรแสตมป์</span>
              </div>

              <div className="flex flex-wrap gap-y-2 items-center">
                <div className="flex items-center gap-1 w-full md:w-2/3">
                  <span className="text-slate-500 shrink-0">ชื่อผู้เสียอากร</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans truncate">{senderInfo.rdUsername}</span>
                </div>
                <div className="flex items-center gap-1 w-full md:w-1/3">
                  <span className="text-slate-500 shrink-0">ในฐานะ</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans">ผู้มอบอำนาจ</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-y-2 items-center mt-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 shrink-0">เลขประจำตัวผู้เสียภาษีอากร</span>
                  <TaxIdBoxes value={senderInfo.senderId} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 shrink-0">สาขาที่</span>
                  <span className="border-b border-dotted border-slate-400 w-36 px-2 text-blue-950 font-bold font-sans text-center">00000 (สำนักงานใหญ่)</span>
                </div>
              </div>

              {/* Insurer Address Block */}
              <div className="flex flex-wrap gap-y-2 mt-2">
                <div className="flex items-center gap-1 w-full md:w-1/2">
                  <span className="text-slate-500 shrink-0">ที่อยู่:อาคาร</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">วี. วรรณ ทาวเวอร์</span>
                  <span className="text-slate-500 shrink-0">ห้องเลขที่</span>
                  <span className="border-b border-dotted border-slate-400 w-16 px-1 text-blue-950 font-bold font-sans text-center">701-704</span>
                  <span className="text-slate-500 shrink-0">ชั้นที่</span>
                  <span className="border-b border-dotted border-slate-400 w-10 px-1 text-blue-950 font-bold font-sans text-center">7</span>
                </div>
                <div className="flex items-center gap-1 w-full md:w-1/2">
                  <span className="text-slate-500 shrink-0">หมู่บ้าน</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">-</span>
                  <span className="text-slate-500 shrink-0">เลขที่</span>
                  <span className="border-b border-dotted border-slate-400 w-20 px-1 text-blue-950 font-bold font-sans text-center">123</span>
                  <span className="text-slate-500 shrink-0">หมู่ที่</span>
                  <span className="border-b border-dotted border-slate-400 w-10 px-1 text-blue-950 font-bold font-sans text-center">-</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-y-2 mt-2">
                <div className="flex items-center gap-1 w-full md:w-2/3">
                  <span className="text-slate-500 shrink-0">ตรอก/ซอย</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">-</span>
                  <span className="text-slate-500 shrink-0">แยก</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">-</span>
                  <span className="text-slate-500 shrink-0">ถนน</span>
                  <span className="border-b border-dotted border-slate-400 flex-1.5 px-1 text-blue-950 font-bold font-sans">พระราม 9</span>
                  <span className="text-slate-500 shrink-0">ตำบล/แขวง</span>
                  <span className="border-b border-dotted border-slate-400 flex-1.5 px-1 text-blue-950 font-bold font-sans">ห้วยขวาง</span>
                </div>
                <div className="flex items-center gap-1 w-full md:w-1/3">
                  <span className="text-slate-500 shrink-0">อำเภอ/เขต</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">ห้วยขวาง</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-y-2 mt-2 items-center justify-between">
                <div className="flex items-center gap-1 w-full md:w-1/2">
                  <span className="text-slate-500 shrink-0">จังหวัด</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">กรุงเทพมหานคร</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 shrink-0">รหัสไปรษณีย์</span>
                  <PostcodeBoxes value="10310" />
                </div>
              </div>
            </div>

            {/* Section 2: Contract Partner Info */}
            <div className="border border-blue-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between border-b border-blue-100 pb-1.5 mb-2">
                <h3 className="font-black text-blue-900 uppercase">ชื่อคู่สัญญา</h3>
                <span className="text-[10px] text-slate-400 font-bold">คู่สัญญาอีกฝ่ายหนึ่ง</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 shrink-0">ชื่อคู่สัญญา</span>
                <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans truncate">{row.insuredTitle}{row.insuredName} {row.insuredSurname}</span>
              </div>

              <div className="flex flex-wrap gap-y-2 items-center mt-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 shrink-0">เลขประจำตัวผู้เสียภาษีอากร</span>
                  <TaxIdBoxes value={row.insuredTaxId} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 shrink-0">สาขาที่</span>
                  <span className="border-b border-dotted border-slate-400 w-20 px-2 text-blue-950 font-bold font-sans text-center">-</span>
                </div>
              </div>

              {/* Insured Address block */}
              <div className="flex flex-wrap gap-y-2 mt-2">
                <div className="flex items-center gap-1 w-full md:w-1/2">
                  <span className="text-slate-500 shrink-0">ที่อยู่:อาคาร</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">-</span>
                  <span className="text-slate-500 shrink-0">เลขที่</span>
                  <span className="border-b border-dotted border-slate-400 w-24 px-1 text-blue-950 font-bold font-sans text-center">{addressNo}</span>
                  <span className="text-slate-500 shrink-0">หมู่ที่</span>
                  <span className="border-b border-dotted border-slate-400 w-12 px-1 text-blue-950 font-bold font-sans text-center">-</span>
                </div>
                <div className="flex items-center gap-1 w-full md:w-1/2">
                  <span className="text-slate-500 shrink-0">ตรอก/ซอย</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">-</span>
                  <span className="text-slate-500 shrink-0">ถนน</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">{road}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-y-2 mt-2">
                <div className="flex items-center gap-1 w-full md:w-2/3">
                  <span className="text-slate-500 shrink-0">ตำบล/แขวง</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">{subdistrict}</span>
                  <span className="text-slate-500 shrink-0">อำเภอ/เขต</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">{district}</span>
                </div>
                <div className="flex items-center gap-1 w-full md:w-1/3">
                  <span className="text-slate-500 shrink-0">จังหวัด</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-1 text-blue-950 font-bold font-sans">{province}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-y-2 mt-2 items-center justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 shrink-0">รหัสไปรษณีย์</span>
                  <PostcodeBoxes value={zipcode} />
                </div>
              </div>
            </div>

            {/* Section 3: Contract/Instrument Details */}
            <div className="border border-blue-200 rounded-xl p-4 bg-slate-50/50">
              <div className="border-b border-blue-100 pb-1.5 mb-2">
                <h3 className="font-black text-blue-900 uppercase">รายละเอียดเกี่ยวกับสัญญา/ตราสาร</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 shrink-0">สัญญา/ตราสารเลขที่</span>
                    <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans">{row.policyNumber}</span>
                    <span className="text-slate-500 shrink-0">ลงวันที่</span>
                    <span className="border-b border-dotted border-slate-400 w-24 px-2 text-blue-950 font-bold font-sans text-center">{formatDateBE(row.contractDate)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 shrink-0">วัน เดือน ปี ที่เริ่มต้นสัญญา/ตราสาร</span>
                    <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans text-center">{formatDateBE(row.effectiveDate)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 shrink-0">วัน เดือน ปี ที่สิ้นสุดสัญญา/ตราสาร</span>
                    <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans text-center">{formatDateBE(row.expireDate)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 shrink-0">หมายเลขอ้างอิงตราสารอิเล็กทรอนิกส์</span>
                    <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans">{row.policyNumber}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="shrink-0">หมายเลขอ้างอิงตราสารอิเล็กทรอนิกส์เดิม (กรณีปรับปรุง):</span>
                    <span className="border-b border-dotted border-slate-300 flex-1 px-2">-</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="shrink-0">วันที่ได้รับตราสารอิเล็กทรอนิกส์:</span>
                    <span className="border-b border-dotted border-slate-300 flex-1 px-2">-</span>
                  </div>
                </div>

                {/* RD QR Barcode Space */}
                <div className="border border-slate-300 rounded-lg h-36 flex items-center justify-center text-center p-3 text-[10px] text-slate-400 bg-white shadow-inner font-sans shrink-0">
                  <div>
                    <span className="font-bold text-slate-500 block mb-1">ส่วนของเจ้าหน้าที่สรรพากร</span>
                    พื้นที่สำหรับพิมพ์ QR Code / Barcode<br />เมื่อนำส่งและชำระเงินเสร็จสิ้น
                  </div>
                </div>
              </div>

              <div className="h-px bg-blue-100 my-3" />

              <div className="flex flex-wrap gap-y-2 justify-between items-center">
                <div className="flex items-center gap-1 w-full md:w-2/3">
                  <span className="text-slate-500 shrink-0">ตราสารตามบัญชีอัตราอากรแสตมป์</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2 text-blue-950 font-bold font-sans">
                    {row.policyType === 'LIFE' ? 'ตราสาร 18 (ก) กรมธรรม์ประกันชีวิต' : 'ตราสาร 18 (ข) กรมธรรม์ประกันภัยอื่น'}
                  </span>
                </div>
                <div className="flex items-center gap-1 w-full md:w-1/3 justify-end">
                  <span className="text-slate-500 shrink-0">มูลค่าในตราสาร (บาท)</span>
                  <span className="border-b border-dotted border-slate-400 w-32 px-2 text-blue-950 font-bold font-sans text-right">{row.sumInsured ? formatNumber(row.sumInsured) : '-'}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Duty Calculations Table */}
            <div className="mt-4 border border-blue-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-blue-800 font-bold text-slate-800 font-sans">
                    <th className="p-2.5 w-2/3 border-r border-blue-800">รายการค่าอากรแสตมป์ที่ขอชำระ</th>
                    <th className="p-2.5 text-right w-1/3">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-blue-800 bg-white">
                    <td className="p-2.5 border-r border-blue-800 flex justify-between items-center">
                      <span className="font-medium text-slate-800">1. จำนวนเงินค่าอากรแสตมป์</span>
                      <span className="text-slate-200 select-none hidden sm:inline">. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .</span>
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-blue-950 bg-blue-50/20">
                      <span className="border border-slate-300 bg-white px-3 py-1 rounded shadow-sm inline-block min-w-[120px] text-sm">{formatNumber(row._dutyAmount)}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-blue-800 bg-white">
                    <td className="p-2.5 border-r border-blue-800 flex justify-between items-center">
                      <span className="font-medium text-slate-800">2. เงินเพิ่มอากร</span>
                      <span className="text-slate-200 select-none hidden sm:inline">. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .</span>
                    </td>
                    <td className="p-2 text-right font-mono text-slate-400 bg-blue-50/20">
                      <span className="border border-slate-300 bg-slate-50 px-3 py-1 rounded inline-block min-w-[120px] text-sm text-center">-</span>
                    </td>
                  </tr>
                  <tr className="font-bold bg-slate-100">
                    <td className="p-2.5 border-r border-blue-800 flex justify-between items-center">
                      <span className="font-bold text-slate-900">3. รวมจำนวนเงินค่าอากรแสตมป์ และเงินเพิ่มอากร (1. + 2.)</span>
                      <span className="text-slate-300 select-none hidden sm:inline">. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .</span>
                    </td>
                    <td className="p-2 text-right font-mono text-blue-950">
                      <span className="border-2 border-blue-800 bg-white px-3 py-1 rounded shadow-sm inline-block min-w-[120px] text-sm text-blue-900">{formatNumber(row._dutyAmount)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Declaration and Signature */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch gap-4 mt-6 pt-4 border-t border-slate-200 text-xs font-medium font-sans">
              <div className="text-slate-400 space-y-1 self-end">
                <div>* แบบจำลองเอกสาร อ.ส.9 สำหรับพรีวิวรายบุคคล (ใช้สีน้ำเงินตามต้นฉบับจริง)</div>
                <div>* สำหรับอ้างอิงและสอบทานข้อมูลภายใน Thai Health Insurance PLC</div>
              </div>

              <div className="text-center sm:text-right space-y-3 sm:pr-4">
                <div className="italic text-slate-600 font-bold">ข้าพเจ้าขอรับรองว่า รายการที่แจ้งไว้ข้างต้นนี้ เป็นรายการที่ถูกต้องและเป็นจริงทุกประการ</div>
                <div className="space-y-1 pt-2">
                  <div className="text-slate-800">ลงชื่อ ................................................................ ผู้เสียอากรแสตมป์</div>
                  <div className="text-blue-950 font-bold">({senderInfo.rdUsername})</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">ยื่นออนไลน์เมื่อวันที่ {new Date().toLocaleDateString('th-TH')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Key,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

interface CertInfo {
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  serialNumber?: string;
  isValid?: boolean;
  thumbprint?: string;
}

export default function CertificatePage() {
  const { success, error: toastError } = useToast();
  const [certInfo, setCertInfo] = useState<CertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetch('/api/certificates/info')
      .then((r) => r.json())
      .then((data) => setCertInfo(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!certFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('certificate', certFile);
      if (keyFile) form.append('privateKey', keyFile);
      if (password) form.append('password', password);

      const res = await fetch('/api/certificates/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setCertInfo(data);
      success('อัปโหลดใบรับรองสำเร็จ');
      setCertFile(null);
      setKeyFile(null);
      setPassword('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toastError('อัปโหลดล้มเหลว', msg);
    } finally {
      setUploading(false);
    }
  };

  const refreshCert = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/certificates/info').then((r) => r.json());
      setCertInfo(data);
      success('รีเฟรชข้อมูลสำเร็จ');
    } catch {
      toastError('รีเฟรชล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const isExpiring = () => {
    if (!certInfo?.validTo) return false;
    const expiry = new Date(certInfo.validTo);
    const diff = expiry.getTime() - Date.now();
    return diff < 30 * 24 * 60 * 60 * 1000; // 30 days
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="page-header">
        <div className="page-icon">
          <Shield className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900">จัดการใบรับรอง</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Digital Certificate สำหรับลงลายมือชื่ออิเล็กทรอนิกส์
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshCert} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          รีเฟรช
        </Button>
      </div>

      {/* Current cert */}
      <div className="section-card mb-6">
        <h3 className="font-black text-slate-800 flex items-center gap-2 mb-5">
          <Shield className="w-5 h-5 text-primary" />
          ใบรับรองปัจจุบัน
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : certInfo ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">
                  Subject
                </p>
                <p className="font-bold text-slate-800 text-sm">{certInfo.subject || '-'}</p>
              </div>
              {certInfo.isValid !== undefined && (
                <Badge variant={certInfo.isValid ? 'success' : 'destructive'}>
                  {certInfo.isValid ? (
                    <><CheckCircle2 className="w-3 h-3" /> ใช้งานได้</>
                  ) : (
                    <><AlertCircle className="w-3 h-3" /> หมดอายุ</>
                  )}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">ผู้ออกใบรับรอง</p>
                <p className="text-sm font-medium text-slate-700">{certInfo.issuer || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Serial Number</p>
                <p className="text-sm font-mono text-slate-700 truncate">{certInfo.serialNumber || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เริ่มต้น</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(certInfo.validFrom)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สิ้นสุด</p>
                  <p className={`text-sm font-bold ${isExpiring() ? 'text-amber-600' : 'text-slate-700'}`}>
                    {formatDate(certInfo.validTo)}
                  </p>
                </div>
              </div>
            </div>

            {isExpiring() && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-700">
                  ใบรับรองใกล้หมดอายุ กรุณาต่ออายุหรืออัปโหลดใหม่
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">ยังไม่มีใบรับรองในระบบ</p>
          </div>
        )}
      </div>

      {/* Upload new cert */}
      <div className="section-card">
        <h3 className="font-black text-slate-800 flex items-center gap-2 mb-5">
          <Upload className="w-5 h-5 text-primary" />
          อัปโหลดใบรับรองใหม่
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              ไฟล์ใบรับรอง (.p12 / .pfx / .pem) <span className="text-red-500">*</span>
            </label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-slate-50 transition-colors"
              onClick={() => document.getElementById('cert-file')?.click()}
            >
              <input
                id="cert-file"
                type="file"
                className="hidden"
                accept=".p12,.pfx,.pem,.crt,.cer"
                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
              />
              {certFile ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-700 text-sm">{certFile.name}</span>
                </div>
              ) : (
                <div>
                  <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">คลิกหรือลากไฟล์ใบรับรองมาที่นี่</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              Private Key (.key / .pem) (ถ้ามีไฟล์แยก)
            </label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-slate-50 transition-colors"
              onClick={() => document.getElementById('key-file')?.click()}
            >
              <input
                id="key-file"
                type="file"
                className="hidden"
                accept=".key,.pem"
                onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
              />
              {keyFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary text-sm">{keyFile.name}</span>
                </div>
              ) : (
                <p className="text-sm text-slate-400 font-medium">ไฟล์ Private Key (optional)</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              รหัสผ่านใบรับรอง
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน (ถ้ามี)"
              className="flex h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors"
            />
          </div>

          <Button
            size="lg"
            onClick={handleUpload}
            disabled={!certFile || uploading}
            className="w-full btn-premium"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดใบรับรอง'}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 section-card bg-blue-50/50 border-blue-100">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-blue-700 text-sm mb-1">ข้อมูลเกี่ยวกับ Digital Certificate</h4>
            <ul className="text-xs text-blue-600 space-y-1 font-medium list-disc list-inside">
              <li>ใบรับรองดิจิทัลใช้สำหรับลงลายมือชื่ออิเล็กทรอนิกส์ตามมาตรฐาน JWS</li>
              <li>ต้องได้รับการรับรองจากหน่วยงานที่กรมสรรพากรยอมรับ</li>
              <li>ควรต่ออายุก่อนหมดอายุอย่างน้อย 30 วัน</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

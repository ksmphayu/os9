'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Loader2,
  Globe,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

interface AppSettings {
  rdApiBaseUrl: string;
  rdUsername: string;
  rdPassword: string;
  senderId: string;
  senderRole: string;
}

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = useState<AppSettings>({
    rdApiBaseUrl: '',
    rdUsername: '',
    rdPassword: '',
    senderId: '',
    senderRole: '1',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data) setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      success('บันทึกการตั้งค่าสำเร็จ');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      toastError('บันทึกล้มเหลว', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test-connection', { method: 'POST' });
      setTestResult(res.ok ? 'ok' : 'fail');
      if (res.ok) success('เชื่อมต่อกรมสรรพากรสำเร็จ');
      else toastError('เชื่อมต่อล้มเหลว', 'กรุณาตรวจสอบข้อมูลการเข้าสู่ระบบ');
    } catch {
      setTestResult('fail');
      toastError('เชื่อมต่อล้มเหลว', 'ไม่สามารถเชื่อมต่อได้');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="page-header">
        <div className="page-icon">
          <Settings className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">ตั้งค่าระบบ</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">การตั้งค่าการเชื่อมต่อ API กรมสรรพากร</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* API Connection */}
        <div className="section-card">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-black text-slate-800">การเชื่อมต่อ API</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                RD API Base URL
              </label>
              <Input
                value={settings.rdApiBaseUrl}
                onChange={(e) => setSettings((p) => ({ ...p, rdApiBaseUrl: e.target.value }))}
                placeholder="https://<hostname>/rd-stamp-os9-service"
              />
              <p className="text-xs text-slate-400 mt-1 font-medium">URL หลักของ Web Service กรมสรรพากร</p>
            </div>
          </div>
        </div>

        {/* Auth */}
        <div className="section-card">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="font-black text-slate-800">ข้อมูลผู้ใช้งาน (Authentication)</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                รหัสผู้ใช้งาน (Username)
              </label>
              <Input
                value={settings.rdUsername}
                onChange={(e) => setSettings((p) => ({ ...p, rdUsername: e.target.value }))}
                placeholder="USER0001"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <Input
                type="password"
                value={settings.rdPassword}
                onChange={(e) => setSettings((p) => ({ ...p, rdPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {/* Sender */}
        <div className="section-card">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="font-black text-slate-800">ข้อมูลผู้นำส่ง (Sender)</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                รหัสผู้นำส่ง (Sender ID)
              </label>
              <Input
                value={settings.senderId}
                onChange={(e) => setSettings((p) => ({ ...p, senderId: e.target.value }))}
                placeholder="TSD00001"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                สิทธิ์ผู้นำส่ง (Sender Role)
              </label>
              <select
                value={settings.senderRole}
                onChange={(e) => setSettings((p) => ({ ...p, senderRole: e.target.value }))}
                className="flex h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors"
              >
                <option value="1">1 = ผู้มีหน้าที่เสียอากร (Direct)</option>
                <option value="2">2 = ผู้ให้บริการตัวแทน (Agent)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test connection */}
        {testResult && (
          <div
            className={cn(
              'flex items-center gap-3 p-4 rounded-2xl border',
              testResult === 'ok'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            )}
          >
            {testResult === 'ok' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span
              className={cn(
                'text-sm font-bold',
                testResult === 'ok' ? 'text-green-700' : 'text-red-700'
              )}
            >
              {testResult === 'ok'
                ? 'เชื่อมต่อกรมสรรพากรสำเร็จ'
                : 'เชื่อมต่อล้มเหลว กรุณาตรวจสอบข้อมูล'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="flex-1"
          >
            {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            ทดสอบการเชื่อมต่อ
          </Button>
          <Button
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-premium"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

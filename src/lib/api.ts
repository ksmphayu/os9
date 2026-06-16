export interface PolicyFilingRequest {
  policyNumber: string;
  contractNo: string;
  policyType: string;
  sumInsured?: number;
  premiumAmount?: number;
  insuredTaxId: string;
  insuredTitle?: string;
  insuredName?: string;
  insuredSurname?: string;
  nationality?: string;
  contractDate: string;
  effectiveDate: string;
  expireDate: string;
}

export interface BulkFilingResponse {
  apiRefNo: string;
  formStatus: string;
  totalSubmitted: number;
  totalSkipped: number;
  skippedPolicyNumbers: string[];
  responseCode: string;
  responseMsg: string;
}

export interface FilingStatus {
  formStatus: string;
}

export interface PaymentStatus {
  paymentStatus: string;
}

const BASE = '/api/policy/duty-stamp';

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  submitBulk(policies: PolicyFilingRequest[], resubmitUnpaid = false): Promise<BulkFilingResponse> {
    return request(`${BASE}/submit-bulk`, {
      method: 'POST',
      body: JSON.stringify({ policies, resubmitUnpaid }),
    });
  },

  checkFilingStatus(apiRefNo: string): Promise<FilingStatus> {
    return request(`${BASE}/filing/${apiRefNo}/status`);
  },

  checkPaymentStatus(apiRefNo: string): Promise<PaymentStatus> {
    return request(`${BASE}/filing/${apiRefNo}/payment-status`);
  },

  checkPolicyStatus(policyNumber: string): Promise<{ status: string }> {
    return request(`${BASE}/policy/${policyNumber}/status`);
  },

  triggerPayInSlipDownload(apiRefNo: string): Promise<{ payInSlipPath: string }> {
    return request(`${BASE}/filing/${apiRefNo}/payin/download`, {
      method: 'POST',
    });
  },

  triggerReceiptDownload(policyNumber: string): Promise<{ receiptFilePath: string }> {
    return request(`${BASE}/policy/${policyNumber}/receipt/download`, {
      method: 'POST',
    });
  },

  triggerFormDownload(policyNumber: string): Promise<{ formFilePath: string }> {
    return request(`${BASE}/policy/${policyNumber}/form/download`, {
      method: 'POST',
    });
  },

  downloadFile(path: string): string {
    return `${BASE}/file/download?path=${encodeURIComponent(path)}`;
  },
};

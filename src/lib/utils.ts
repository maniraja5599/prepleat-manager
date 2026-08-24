import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanPhoneForDialing(phone: string | undefined | null): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const cleaned = trimmed.replace(/\D/g, "");
  
  if (trimmed.startsWith("+")) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith("0091")) {
    return `+${cleaned.slice(2)}`;
  }
  
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  return cleaned;
}

export function cleanPhoneForWhatsApp(phone: string | undefined | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.startsWith("0091")) return cleaned.slice(2);
  return cleaned;
}

export function sanitizeIndianPhone(raw: string | undefined | null): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function isValidIndianMobile(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const digits = sanitizeIndianPhone(phone);
  return /^[6-9]\d{9}$/.test(digits);
}


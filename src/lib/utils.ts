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
  
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  if (cleaned.startsWith("0091")) {
    return cleaned.slice(2);
  }
  
  return cleaned;
}


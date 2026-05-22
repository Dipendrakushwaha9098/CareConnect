import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime12Hour(timeStr?: string): string {
  if (!timeStr) return "";
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) return timeStr;
  
  const [hoursStr, minutesStr] = timeStr.split(":");
  if (!hoursStr || !minutesStr) return timeStr;
  
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  const minutesFormatted = minutes < 10 ? '0' + minutes : minutes;
  const hoursFormatted = hours < 10 ? '0' + hours : hours;
  
  return `${hoursFormatted}:${minutesFormatted} ${ampm}`;
}

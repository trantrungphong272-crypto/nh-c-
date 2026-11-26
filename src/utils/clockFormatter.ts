export interface FormattedVietnameseClock {
  hoursStr: string;
  minutesStr: string;
  secondsStr: string;
  periodStr: string | null; // 'SA' | 'CH' when 12h format, null when 24h
  timeFormatted: string; // e.g. '09:48'
  weekdayStr: string; // e.g. 'Thứ Năm'
  dateLineStr: string; // e.g. 'Thứ Năm, 26 tháng 11'
  fullDateLineStr: string; // e.g. 'Thứ Năm, 26 tháng 11, 2026'
}

const VIETNAMESE_WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

export function formatVietnameseClock(date: Date, use24Hour: boolean): FormattedVietnameseClock {
  const rawHours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  let displayHours = rawHours;
  let periodStr: string | null = null;

  if (!use24Hour) {
    periodStr = rawHours >= 12 ? 'CH' : 'SA';
    displayHours = rawHours % 12;
    if (displayHours === 0) {
      displayHours = 12;
    }
  }

  const hoursStr = String(displayHours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');

  const weekdayStr = VIETNAMESE_WEEKDAYS[date.getDay()] ?? 'Thứ Hai';
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return {
    hoursStr,
    minutesStr,
    secondsStr,
    periodStr,
    timeFormatted: `${hoursStr}:${minutesStr}`,
    weekdayStr,
    dateLineStr: `${weekdayStr}, ${day} tháng ${month}`,
    fullDateLineStr: `${weekdayStr}, ${day} tháng ${month}, ${year}`,
  };
}

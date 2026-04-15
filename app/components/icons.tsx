import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function strokeIcon(paths: ReactNode, props: IconProps) {
  const { className, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-5 w-5 shrink-0'}
      aria-hidden
      {...rest}
    >
      {paths}
    </svg>
  );
}

export function IconLightBulb(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </>,
    props,
  );
}

export function IconClipboardList(props: IconProps) {
  return strokeIcon(
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </>,
    props,
  );
}

/** Assistant IA — puces / étincelles */
export function IconSparkles(props: IconProps) {
  return strokeIcon(
    <>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4M19 17v4M3 5h4M17 19h4" />
    </>,
    props,
  );
}

export function IconBell(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>,
    props,
  );
}

export function IconMicrophone(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M12 19v3M8 22h8" />
      <rect width="6" height="12" x="9" y="2" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
    </>,
    props,
  );
}

export function IconTrash(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </>,
    props,
  );
}

export function IconX(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>,
    props,
  );
}

export function IconSearch(props: IconProps) {
  return strokeIcon(
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>,
    props,
  );
}

export function IconPin(props: IconProps) {
  return strokeIcon(
    <>
      <line x1="12" x2="12" y1="17" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.79-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76a2 2 0 0 1-1.11 1.79l-1.79.9A2 2 0 0 0 5 15.24Z" />
    </>,
    props,
  );
}

export function IconPencil(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>,
    props,
  );
}

export function IconCalendar(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>,
    props,
  );
}

export function IconAlertTriangle(props: IconProps) {
  return strokeIcon(
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>,
    props,
  );
}

export function IconArrowRight(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>,
    props,
  );
}

export function IconArrowLeft(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>,
    props,
  );
}

export function IconBars3(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>,
    props,
  );
}

export function IconBolt(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </>,
    props,
  );
}

export function IconCheckCircle(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </>,
    props,
  );
}

export function IconEnvelope(props: IconProps) {
  return strokeIcon(
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>,
    props,
  );
}

export function IconChevronDown(props: IconProps) {
  return strokeIcon(
    <>
      <path d="m6 9 6 6 6-6" />
    </>,
    props,
  );
}

export function IconChevronUp(props: IconProps) {
  return strokeIcon(
    <>
      <path d="m18 15-6-6-6 6" />
    </>,
    props,
  );
}

export function IconChevronRight(props: IconProps) {
  return strokeIcon(
    <>
      <path d="m9 18 6-6-6-6" />
    </>,
    props,
  );
}

export function IconClock(props: IconProps) {
  return strokeIcon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>,
    props,
  );
}

export function IconPlus(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>,
    props,
  );
}

export function IconSettings(props: IconProps) {
  return strokeIcon(
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    props,
  );
}

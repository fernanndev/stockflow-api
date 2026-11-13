export type IconName =
    | "home"
    | "receipt"
    | "users"
    | "chart"
    | "box"
    | "tag"
    | "swap"
    | "package"
    | "plus"
    | "dots"
    | "chevron"
    | "logout"
    | "palette"

// simple line icons (24x24), drawn with the current text color
const PATHS: Record<IconName, string> = {
    home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
    receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6",
    users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20v-1a5.5 5.5 0 0 1 5.5-5.5h2A5.5 5.5 0 0 1 15.5 19v1M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14a5 5 0 0 1 3 4.6V20",
    chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
    tag: "M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01",
    swap: "M7 4v16M7 4L3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4",
    package: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10",
    plus: "M12 5v14M5 12h14",
    dots: "M5 12h.01M12 12h.01M19 12h.01",
    chevron: "M6 9l6 6 6-6",
    logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4",
    palette: "M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.7 1.6-1.4 0-1-.8-1.3-.8-2.2 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8.8-9-8.8zM7.5 12h.01M9.5 8h.01M14.5 8h.01",
}

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name]} />
        </svg>
    )
}

import { useEffect, useState } from "react";

export function useNotice(duration = 4000) {
    const [notice, setNotice] = useState<string | null>(null)

    useEffect(() => {
        if (!notice) return

        const timer = setTimeout(() => setNotice(null), duration)
        return () => clearTimeout(timer)
    }, [notice, duration])

    return { notice, showNotice: setNotice }
}
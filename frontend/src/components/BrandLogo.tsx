import { StockFlowLogo } from "./StockFlowLogo";

type Size = "xs" | "sm" | "md" | "lg"

export function BrandLogo({ size = "md" }: { size?: Size }) {
    return <StockFlowLogo size={size} />
}
import type { MovementReason } from "../types";

export const REASON_LABELS: Record<MovementReason, string> = {
    sale: "Venda",
    gift: "Brinde",
    expired: "Vencido",
    loss: "Perda ou quebra",
    other: "Outro",
    sale_canceled: "Venda cancelada",
}
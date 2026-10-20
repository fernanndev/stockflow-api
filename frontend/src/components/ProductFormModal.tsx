import { useEffect, useMemo, useState, type FormEvent } from "react"
import { 
    createProduct,
    deleteProductImage,
    updateProduct,
    uploadProductImage,
} from "../api/products"
import { getImageUrl } from "../utils/image"
import type { Category, Product } from "../types"
import { Modal } from "./Modal"

interface ProductFormModalProps {
    open: boolean
    product: Product | null
    categories: Category[]
    defaultCategoryId: number
    onClose: () => void
    onSaved: (message: string) => void
}

interface FormState {
    name: string
    description: string
    price: string
    stock_quantity: string
    minimum_stock: string
    size: string
    expiration_date: string | null
    category_id: number
}

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

function buildInitialState(product: Product | null, defaultCategoryId: number) : FormState {
    if (product) {
        return {
            name: product.name,
            description: product.description ?? "",
            price: String(product.price),
            stock_quantity: "",
            minimum_stock: String(product.minimum_stock),
            size: product.size ?? "",
            expiration_date: product.expiration_date,
            category_id: product.category.id,            
        }
    }

    return {
        name: "",
        description: "",
        price: "",
        stock_quantity: "",
        minimum_stock: "",
        size: "",
        expiration_date: null,
        category_id: defaultCategoryId,
    }
}

export function ProductFormModal({
    open,
    product,
    categories,
    defaultCategoryId,
    onClose,
    onSaved,
}: ProductFormModalProps) {
    const [form, setForm] = useState<FormState>(() =>
    buildInitialState(product, defaultCategoryId),
    )
    const [error, setError] = useState<string | null>(null)

    const [imageFile, setImageFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)

    const previewUrl = useMemo(
        () => (imageFile ? URL.createObjectURL(imageFile): null),
        [imageFile],
    )

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    const showImage = previewUrl ?? (removeImage ? null : getImageUrl(product?.image_url ?? null))

    useEffect(() => {
        if (open) {
            setForm(buildInitialState(product, defaultCategoryId))
            setError(null)
            setImageFile(null)
            setRemoveImage(false)
        }
    }, [open, product, defaultCategoryId])

    function handleFileChange(file: File | null) {
        setError(null)
        
        if (!file) {
            setImageFile(null)
            return
        }

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError("Use uma imagem JPEG, PNG ou WebP.")
            return
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setError("A imagem deve ter no máximo 5 MB.")
            return
        }

        setImageFile(file)
        setRemoveImage(false)
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        let saved: Product

        try {
            if (product) {
                saved = await updateProduct(product.id, {
                    name: form.name,
                    description: form.description || null,
                    price: Number(form.price),
                    minimum_stock: Number(form.minimum_stock),
                    size: form.size || null,
                    expiration_date: form.expiration_date,
                    category_id: form.category_id,
                })
            } else {
                saved = await createProduct({
                    name: form.name,
                    description: form.description || null,
                    price: Number(form.price),
                    stock_quantity: Number(form.stock_quantity),
                    minimum_stock: Number(form.minimum_stock),
                    size: form.size || null,
                    expiration_date: form.expiration_date,
                    category_id: form.category_id,
                })
            }
        } catch {
            setError(
                product
                    ? "Não foi possível atualizar o produto."
                    : "Não foi possível criar o produto.",
            )
            return
        }

        let message = product ? "Produto atualizado." : "Produto criado."

        try {
            if (imageFile) {
                await uploadProductImage(saved.id, imageFile)
            } else if (removeImage && product?.image_url) {
                await deleteProductImage(saved.id)
            }
        } catch {
            message += " Mas não foi possível enviar a foto."
        }

        onSaved(message)
    }

    return (
        <Modal
            open={open}
            title={product ? "Editar produto" : "Novo produto"}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Nome</label>
                    <input 
                        type="next"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Categoria</label>
                    <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                        required
                        className={inputClass}
                    >
                        <option value={0} disabled>
                            Selecione
                        </option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-span-2">
                    <label className={labelClass}>Descrição</label>
                    <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Preço</label>
                    <input 
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        required
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Tamanho (ex: M, 500g)</label>
                    <input
                        type="text"
                        value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className={inputClass}
                    />
                </div>

                {!product && (
                    <div>
                        <label className={labelClass}>Estoque inicial</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={form.stock_quantity}
                            onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                )}

                <div>
                    <label className={labelClass}>Estoque mínimo</label>
                    <input
                        type="number"
                        placeholder="0"
                        value={form.minimum_stock}
                        onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Validade</label>
                    <input
                        type="date"
                        value={form.expiration_date ?? ""}
                        onChange={(e) =>
                            setForm({ ...form, expiration_date: e.target.value || null })
                        }
                        className={inputClass}
                    />
                </div>

                <div className="col-span-2">
                    <label className={labelClass}>Foto (opicional)</label>
                    <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-sx text-slate-400">
                            {showImage ? (
                                <img
                                    src={showImage}
                                    alt="Pré-visualização"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                "Sem foto"
                            )}
                        </div>
                        <div className="space-y-2">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                                className="block text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                            />
                            {product?.image_url && !removeImage && !imageFile && (
                                <button
                                    type="button"
                                    onClick={() => setRemoveImage(true)}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    Remover foto atual
                                </button>
                            )}
                            {removeImage && (
                                <p className="text-xs text-slate-500">
                                    A foto será removida ao salvar.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

                <div className="col-span-2 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                    >
                        {product ? "Salvar alterações" : "Adicionar produto"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
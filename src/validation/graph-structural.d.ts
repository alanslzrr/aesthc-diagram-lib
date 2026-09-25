declare const validate: {
  (value: unknown): boolean
  errors?: Array<{
    instancePath: string
    keyword: string
    message?: string
    params: Record<string, unknown>
  }> | null
}
export default validate

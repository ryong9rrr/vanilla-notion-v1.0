export type IDocument = {
  id: number
  title: string
  documents: IDocument[]
  content?: string
  createdAt?: string
  updatedAt?: string
}

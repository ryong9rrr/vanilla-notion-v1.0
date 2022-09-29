export interface State {
  id?: number
  title?: string
  content?: string
}

export interface Props {
  parentId: string
  onEditing?: (id: number, { title, content }: { title: string; content: string }) => void
}
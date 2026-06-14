export interface ImageProject {
  id: string
  name: string
  description: string
  coverImageUrl: string | null
  imageEntryIds: string[]   // refs to GeneratedImageEntry IDs
  createdAt: number
  updatedAt: number
  tags: string[]
}

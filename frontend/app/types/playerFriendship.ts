export type PlayerFriendshipStatus = 'pending' | 'accepted' | 'rejected'

export interface PlayerFriendshipGuild {
  documentId: string
  name: string
  exp: number
  user?: {
    username: string
  }
}

export interface PlayerFriendship {
  documentId: string
  status: PlayerFriendshipStatus
  requester: PlayerFriendshipGuild
  receiver: PlayerFriendshipGuild
  createdAt?: string
}

export interface PlayerSearchResult {
  username: string
  guildName: string
  guildDocumentId: string
  guildLevel: number
}

export interface PlayerFriendshipsResponse {
  data: PlayerFriendship[]
  myGuildDocumentId: string
}

export interface PlayerSearchResponse {
  data: PlayerSearchResult | null
  message?: string
}

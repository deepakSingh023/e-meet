// Shape returned by GET /api/profile/get-metadata?roomId=...
// Matches com.example.Signalling_server.dto.MetaDataResponse exactly:
//   record MetaDataResponse(String userId, String username, String avatar)
export interface MetaDataResponse {
  userId: string | null;
  username: string;
  avatar: string;
}

// What the UI actually needs to render the remote peer's video overlay
export interface RemotePeer {
  userId: string | null;
  username: string;
  avatarUrl: string | null;
}
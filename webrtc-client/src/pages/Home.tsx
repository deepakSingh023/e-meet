import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { socket } from "../service/websockets";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarUrl, updateRoomMetadata, uploadAvatar } from "../api/profileApi";

export function Home(): React.JSX.Element {

const [roomId, setRoomId] = useState("");
const navigate = useNavigate();
const { user, isAuthenticated, logout, setAvatar } = useAuth();
const fileInputRef = useRef<HTMLInputElement>(null);
const [avatarUploading, setAvatarUploading] = useState(false);
const [avatarError, setAvatarError] = useState<string | null>(null);

// Fire-and-forget: this endpoint returns void, there's nothing to wait on,
// and the update is best-effort anyway (auth optional, failure non-fatal).
// No need to block navigate() on it.
function tagRoomAndNavigate(targetRoomId: string) {
updateRoomMetadata(targetRoomId).catch((err) => {
console.warn("Could not tag room metadata:", err);
    });
navigate(`/room/${targetRoomId}`);
}

useEffect(() => {

// BUG HISTORY: 
// The shared global 'socket' object is reused across both Home and Room pages.
// Originally, when navigating to the Room page, the Room component would 
// overwrite 'socket.onmessage' with WebRTC logic. When returning to the 
// Home page later, the socket listener was STILL pointing to the dead Room page logic.
// This caused subsequent "Create/Join" clicks to freeze because the Home page 
// was no longer listening for 'ROOM_CREATED' or 'JOIN_SUCCESS'.
//
// THE SYSTEMS FIX:
// We added an explicit cleanup return function. The moment a user leaves the 
// Home page, we detach the listener ('socket.onmessage = null'). This leaves a 
// completely blank slate for the Room component to claim, and ensures the 
// Home component can re-bind its listeners fresh whenever a user routes back here.
console.log("Home page WebSocket listener active.");
socket.onmessage = (event) => {
const data = JSON.parse(event.data);
console.log("Home Socket Message:", data.type);
switch(data.type) {
case "ROOM_CREATED":
case "JOIN_SUCCESS":
// Tag the room with this user's identity before handing off to the Room page
tagRoomAndNavigate(data.roomId);
break;
case "JOIN_FAILED":
alert("Room not found");
break;
default:
// Safely ignore incoming room data payloads while sitting on home page
break;
          }
      };
return () => {
console.log("Leaving Home page. Detaching Home socket listener.");
      };
  }, [navigate]); // Keeps lifecycle hooks contained safely


const createRoom = () =>{

if(socket.readyState !== WebSocket.OPEN){
return;
    }

socket.send(
JSON.stringify({
type: "CREATE_ROOM",
roomId: null,
payload: null,
      })
    );
  }

const joinRoom = (roomId: string) => {

if(!roomId.trim()){
return;
    }

if(socket.readyState !== WebSocket.OPEN){
return;
    }

socket.send(
JSON.stringify({
type: "JOIN_ROOM",
roomId,
payload: null,
        })
    );
};

async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
const file = e.target.files?.[0];
if (!file) return;
setAvatarError(null);
setAvatarUploading(true);
try {
const url = await uploadAvatar(file);
setAvatar(url);
} catch (err) {
console.error(err);
setAvatarError("Couldn't upload that photo. Try again.");
    } finally {
setAvatarUploading(false);
if (fileInputRef.current) fileInputRef.current.value = "";
    }
}

const avatarSrc = resolveAvatarUrl(user?.avatar);

return (
<div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">

<div className="w-full max-w-md flex flex-col gap-6">

{/* Profile card */}
<div className="bg-white rounded-xl shadow-lg p-6">
{isAuthenticated && user ? (
<div className="flex items-center gap-4">
<button
type="button"
onClick={() => fileInputRef.current?.click()}
className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-slate-200 border border-gray-300 group"
title="Change profile photo"
>
{avatarSrc ? (
<img src={avatarSrc} alt={user.username} className="w-full h-full object-cover" />
                ) : (
<div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-semibold">
{user.username.charAt(0).toUpperCase()}
</div>
                )}
<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
<span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-medium transition">
{avatarUploading ? "…" : "Change"}
</span>
</div>
</button>
<input
ref={fileInputRef}
type="file"
accept="image/*"
className="hidden"
onChange={handleAvatarChange}
/>

<div className="min-w-0 flex-1">
<p className="font-semibold text-gray-900 truncate">{user.username}</p>
<p className="text-sm text-gray-500 truncate">{user.email}</p>
</div>

<button
type="button"
onClick={logout}
className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
>
              Log out
</button>
</div>
        ) : (
<div className="flex items-center justify-between gap-4">
<div>
<p className="font-semibold text-gray-900">You're browsing as a guest</p>
<p className="text-sm text-gray-500">Log in to save your profile and photo</p>
</div>
<Link
to="/login"
className="shrink-0 text-sm font-medium border border-black rounded-lg px-4 py-2 hover:bg-black hover:text-white transition"
>
            Log in
</Link>
</div>
        )}
{avatarError && <p className="text-xs text-red-600 mt-2">{avatarError}</p>}
</div>

{/* Room controls */}
<div className="bg-white rounded-xl shadow-lg p-8">

<h1 className="text-3xl font-bold text-center mb-2">
          WebRTC Network Analysis
</h1>

<p className="text-center text-gray-500 mb-8">
          Create a room or join an existing session
</p>

<div className="flex flex-col gap-4">

<button
className="w-full bg-black text-white py-3 rounded-lg hover:opacity-90 transition"
onClick={createRoom}
>
            Create Room
</button>

<div className="flex items-center gap-3">
<div className="h-px bg-gray-300 flex-1" />
<span className="text-gray-500 text-sm">
              OR
</span>
<div className="h-px bg-gray-300 flex-1" />
</div>

<input
type="text"
placeholder="Enter Room ID"
className="border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
value={roomId}
onChange={(e) => setRoomId(e.target.value)}
/>

<button
className="w-full border border-black py-3 rounded-lg hover:bg-black hover:text-white transition"
onClick={() => joinRoom(roomId)}
>
            Join Room
</button>

</div>

</div>

</div>

</div>
  );
}
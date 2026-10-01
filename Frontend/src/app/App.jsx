import "./App.css"
import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from "react"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

function App() {
  const editorRef = useRef(null)
  const bindingRef = useRef(null)
  
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })
  const [users, setUsers] = useState([])

  // 1. Single Yjs Document across renders
  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

  const handleMount = (editor) => {
    editorRef.current = editor
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const inputName = e.target.username.value.trim()
    if (inputName) {
      setUsername(inputName)
      window.history.pushState({}, "", "?username=" + inputName)
    }
  }

  useEffect(() => {
    if (!username) return

    // Apne Backend Port ke saath connect karein (e.g., http://localhost:3000 ya 4000)
    const provider = new SocketIOProvider("http://localhost:3000", "monaco", ydoc, {
      autoConnect: true,
    })

    // Set awareness local state
    provider.awareness.setLocalStateField("user", { username })

    // Monaco Binding attach after provider & editor are ready
    if (editorRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness // Pass awareness for multi-cursor
      )
    }

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values())
      const activeUsernames = states
        .filter((u) => u.user && u.user.username)
        .map((u) => u.user.username)
      
      // Duplicate removal
      setUsers(Array.from(new Set(activeUsernames)))
    }

    provider.awareness.on("change", updateUsers)

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy() // Clean up binding on unmount
      }
      provider.awareness.off("change", updateUsers)
      provider.disconnect()
    }
  }, [username, ydoc, yText])

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4 w-80">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
            name="username"
            required
          />
          <button className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold">
            Join Room
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      {/* Sidebar */}
      <aside className="h-full w-1/4 bg-[#fbf7e7] rounded-xl p-6 flex flex-col gap-6">
        <h1 className="text-gray-950 font-bold text-4xl tracking-tight">Users</h1>
        <div className="flex flex-col gap-3">
          {users.map((user, idx) => (
            <div 
              key={idx} 
              className="bg-[#243242] text-gray-100 px-4 py-3 rounded-lg text-lg font-medium shadow-sm"
            >
              {user}
            </div>
          ))}
        </div>
      </aside>

      {/* Editor */}
      <section className="w-3/4 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// start coding here"
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 16,
          }}
        />
      </section>
    </main>
  )
}

export default App
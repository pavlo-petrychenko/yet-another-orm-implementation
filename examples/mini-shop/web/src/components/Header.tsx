import { DEMO_USERS } from "../users";

interface HeaderProps {
  currentUserId: number;
  onChangeUser: (userId: number) => void;
}

export function Header({ currentUserId, onChangeUser }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-mono text-sm font-bold text-white">
            y
          </span>
          <div>
            <h1 className="font-bold leading-tight text-slate-900">
              yaoi mini-shop
            </h1>
            <p className="text-xs text-slate-400">ORM demo storefront</p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="hidden sm:inline">Signed in as</span>
          <select
            value={currentUserId}
            onChange={(e) => onChangeUser(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} (#{u.id})
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

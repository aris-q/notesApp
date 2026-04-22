export default function AccessDenied() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Private App</h1>
        <p className="text-gray-500 mb-6">
          This is a private application. Access is restricted to one account.
        </p>
        <a
          href="/auth/logout"
          className="inline-block px-5 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors"
        >
          Sign out and try a different account
        </a>
      </div>
    </div>
  );
}

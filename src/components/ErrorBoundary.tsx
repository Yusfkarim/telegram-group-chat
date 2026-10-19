import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Last-resort guard: a render crash must never leave the user on a black screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }

  reset = () => {
    try {
      localStorage.removeItem("tg-group-chat");
      localStorage.removeItem("tg-profile");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const arabic = document.documentElement.lang === "ar";
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-tg-bg p-6">
        <div className="w-full max-w-sm rounded-3xl bg-tg-panel p-7 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-2xl">⚠️</div>
          <h1 className="text-lg font-bold">{arabic ? "حدث خطأ غير متوقع" : "Something went wrong"}</h1>
          <p className="mt-2 text-sm text-tg-muted">
            {arabic
              ? "بياناتك المحفوظة على هذا الجهاز قد تكون قديمة أو ناقصة. يمكنك إعادة تعيين البيانات والبدء من جديد."
              : "Your locally saved data may be outdated or incomplete. You can reset it and start fresh."}
          </p>
          <button
            onClick={this.reset}
            className="mt-5 w-full rounded-2xl bg-tg-accent py-3 font-semibold text-white active:scale-[0.98]"
          >
            {arabic ? "إعادة تعيين البيانات" : "Reset app data"}
          </button>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold"
          >
            {arabic ? "محاولة مرة أخرى" : "Try again"}
          </button>
        </div>
      </div>
    );
  }
}
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { err: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[miniapp]", err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            minHeight: "var(--app-h, 100dvh)",
            padding: 20,
            background: "#111",
            color: "#e98d2b",
            fontFamily: "system-ui, sans-serif",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <p style={{ color: "#fff", fontWeight: 600, marginBottom: 8 }}>Ошибка загрузки приложения</p>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
            Откройте консоль отладки в Telegram (для разработчиков) или проверьте, что URL в BotFather ведёт на корень
            собранного сайта и скрипты не отдают 404.
          </p>
          <pre
            style={{
              fontSize: 11,
              overflow: "auto",
              color: "#faa",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {this.state.err.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
